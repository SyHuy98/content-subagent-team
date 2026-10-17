#!/usr/bin/env node
// Văn phòng pixel – server local, không cần thư viện ngoài.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import {
  ROOT, INBOX, OUTPUTS, LOGS, EVENTS_FILE, BRAND_FILE,
  ensureDirs, appendEvent, readEvents, parseLines, listTasks, agentStates, readTask, safeId, newTaskId,
} from '../scripts/lib/store.mjs';

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(ROOT, 'office', 'public');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const IS_WIN = process.platform === 'win32';
const claudeAvailable = spawnSync(CLAUDE_BIN, ['--version'], { shell: IS_WIN, encoding: 'utf8' }).status === 0;
let autoRun = process.env.AUTO_RUN ? process.env.AUTO_RUN !== '0' : claudeAvailable;

ensureDirs();

// ---------- Runner: chạy `claude -p "/team <id>"` lần lượt từng task ----------
const queue = [];
let current = null;

function enqueue(id) {
  if (current?.id === id || queue.includes(id)) return;
  queue.push(id);
  pump();
}

function pump() {
  if (current || !queue.length) return;
  if (!claudeAvailable) return;
  const id = queue.shift();
  const logFile = path.join(LOGS, `${id}.log`);
  const log = fs.openSync(logFile, 'a');
  // Truyền quyền trực tiếp: ở chế độ headless, Claude Code bỏ qua permissions trong
  // .claude/settings.json nếu thư mục chưa từng được "trust" trong phiên tương tác.
  const args = ['-p', `/team ${id}`, '--permission-mode', 'acceptEdits'];
  args.push('--model', process.env.CLAUDE_MODEL || 'claude-opus-5-5', '--effort', process.env.CLAUDE_EFFORT || 'high');
  const abs = (f) => path.join(ROOT, 'scripts', f);
  args.push('--allowedTools',
    'Bash(node scripts/status.mjs:*)', 'Bash(node scripts/task.mjs:*)',
    `Bash(node ${abs('status.mjs')}:*)`, `Bash(node ${abs('task.mjs')}:*)`,
    'Bash(mkdir -p workspace/outputs/:*)', 'Read', 'Glob', 'Grep');
  console.log(`▶ Chạy team cho task ${id} (log: ${path.relative(ROOT, logFile)})`);
  const child = spawn(CLAUDE_BIN, args, { cwd: ROOT, stdio: ['ignore', log, log], shell: IS_WIN, env: process.env });
  current = { id, pid: child.pid, startedAt: new Date().toISOString() };
  broadcastRunner();
  const finish = (code) => {
    fs.closeSync(log);
    const finalExists = fs.existsSync(path.join(OUTPUTS, id, 'final.md'));
    const status = listTasks().find((t) => t.id === id)?.status;
    if (code === 0 && finalExists && status !== 'done') {
      appendEvent({ agent: 'manager', state: 'done', msg: 'Đã hoàn thành task', task: id, taskStatus: 'done' });
    } else if (code !== 0 || !finalExists) {
      if (status !== 'done') {
        appendEvent({ agent: 'manager', state: 'error', msg: `Team dừng giữa chừng (mã ${code}). Xem workspace/logs/${id}.log`, task: id, taskStatus: 'error' });
      }
    }
    console.log(`■ Task ${id} kết thúc với mã ${code}`);
    current = null;
    broadcastRunner();
    pump();
  };
  child.on('exit', finish);
  child.on('error', (err) => { fs.appendFileSync(logFile, String(err)); finish(-1); });
}

function runnerInfo() {
  return { claudeAvailable, autoRun, current, queue: [...queue] };
}

// ---------- SSE ----------
const clients = new Set();
function send(res, event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
function broadcast(event, data) { for (const c of clients) send(c, event, data); }
function broadcastRunner() { broadcast('runner', runnerInfo()); }

function snapshot() {
  const events = readEvents();
  return { agents: agentStates(events), tasks: listTasks(events), events: events.slice(-150), runner: runnerInfo() };
}

// Theo dõi events.jsonl và inbox bằng polling (ổn định trên mọi hệ điều hành).
let offset = fs.existsSync(EVENTS_FILE) ? fs.statSync(EVENTS_FILE).size : 0;
let inboxSig = '';
let outputsSig = '';
function dirSig(dir) {
  try {
    return fs.readdirSync(dir, { recursive: true }).map((f) => {
      try { return f + ':' + fs.statSync(path.join(dir, f)).mtimeMs; } catch { return f; }
    }).join('|');
  } catch { return ''; }
}
setInterval(() => {
  let size = 0;
  try { size = fs.statSync(EVENTS_FILE).size; } catch { size = 0; }
  let tasksChanged = false;
  if (size < offset) { offset = 0; broadcast('reset', snapshot()); return; }
  if (size > offset) {
    const fd = fs.openSync(EVENTS_FILE, 'r');
    const buf = Buffer.alloc(size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    const text = buf.toString('utf8');
    const lastNl = text.lastIndexOf('\n');
    if (lastNl >= 0) {
      offset += Buffer.byteLength(text.slice(0, lastNl + 1));
      const evs = parseLines(text.slice(0, lastNl + 1));
      for (const ev of evs) broadcast('event', ev);
      if (evs.some((e) => e.task)) tasksChanged = true;
      for (const ev of evs) {
        if (ev.agent === 'boss' && ev.taskStatus === 'queued' && !ev.demo && autoRun) enqueue(ev.task);
      }
    }
  }
  const sig = dirSig(INBOX), osig = dirSig(OUTPUTS);
  if (sig !== inboxSig || osig !== outputsSig) { inboxSig = sig; outputsSig = osig; tasksChanged = true; }
  if (tasksChanged) broadcast('tasks', listTasks());
}, 600);

setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20000);

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function clip(s, n) { return String(s ?? '').trim().slice(0, n); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  try {
    if (p === '/api/state' && req.method === 'GET') return json(res, 200, snapshot());

    if (p === '/api/events' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      send(res, 'snapshot', snapshot());
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (p === '/api/tasks' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req)) || '{}');
      const title = clip(b.title, 140);
      if (!title) return json(res, 400, { error: 'Cần nhập tiêu đề công việc' });
      const task = {
        id: newTaskId(),
        title,
        type: clip(b.type, 60),
        service: clip(b.service, 120),
        channels: Array.isArray(b.channels) ? b.channels.map((c) => clip(c, 30)).slice(0, 10) : [],
        quantity: clip(b.quantity, 60),
        deadline: clip(b.deadline, 40),
        brief: clip(b.brief, 4000),
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(INBOX, `${task.id}.json`), JSON.stringify(task, null, 2));
      appendEvent({ agent: 'boss', state: 'assign', msg: `Giao việc: ${task.title}`, task: task.id, taskStatus: 'queued' });
      return json(res, 201, { task, runner: runnerInfo() });
    }

    let m;
    if ((m = p.match(/^\/api\/tasks\/([\w-]+)\/run$/)) && req.method === 'POST') {
      const id = safeId(m[1]);
      if (!readTask(id)) return json(res, 404, { error: 'Không có task' });
      if (!claudeAvailable) return json(res, 409, { error: 'Không tìm thấy Claude Code CLI. Hãy mở Claude Code trong thư mục này và gõ /team ' + id });
      enqueue(id);
      return json(res, 202, runnerInfo());
    }

    if ((m = p.match(/^\/api\/tasks\/([\w-]+)$/)) && req.method === 'DELETE') {
      const id = safeId(m[1]);
      if (current?.id === id) return json(res, 409, { error: 'Task đang chạy' });
      const qi = queue.indexOf(id); if (qi >= 0) queue.splice(qi, 1);
      fs.rmSync(path.join(INBOX, `${id}.json`), { force: true });
      return json(res, 200, { ok: true });
    }

    if ((m = p.match(/^\/api\/outputs\/([\w-]+)$/)) && req.method === 'GET') {
      const dir = path.join(OUTPUTS, safeId(m[1]));
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort((a, b) => (a === 'final.md' ? -1 : b === 'final.md' ? 1 : a.localeCompare(b)))
          .map((name) => ({ name, content: fs.readFileSync(path.join(dir, name), 'utf8') }))
        : [];
      return json(res, 200, { task: readTask(m[1]), files });
    }

    if (p === '/api/brand') {
      if (req.method === 'GET') return json(res, 200, { content: fs.existsSync(BRAND_FILE) ? fs.readFileSync(BRAND_FILE, 'utf8') : '' });
      if (req.method === 'PUT') {
        const b = JSON.parse((await readBody(req)) || '{}');
        fs.writeFileSync(BRAND_FILE, String(b.content ?? '').slice(0, 50000));
        return json(res, 200, { ok: true });
      }
    }

    if (p === '/api/runner' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req)) || '{}');
      if (typeof b.autoRun === 'boolean') autoRun = b.autoRun && claudeAvailable;
      broadcastRunner();
      return json(res, 200, runnerInfo());
    }

    if (req.method === 'GET') {
      const file = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : p));
      if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(405); res.end();
  } catch (err) {
    json(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🏢 Văn phòng Content Spa đang mở tại http://localhost:${PORT}`);
  console.log(claudeAvailable
    ? `   Claude Code CLI: có sẵn · Tự chạy team khi giao việc: ${autoRun ? 'BẬT' : 'TẮT'}`
    : '   ⚠ Không tìm thấy Claude Code CLI – giao việc trên web rồi gõ /team trong Claude Code để team làm việc.');
  console.log('   Xem thử hoạt cảnh: npm run demo\n');
});
