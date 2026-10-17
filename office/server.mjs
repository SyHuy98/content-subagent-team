#!/usr/bin/env node
// Văn phòng pixel – server local, không cần thư viện ngoài.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import {
  ROOT, WS, INBOX, OUTPUTS, LOGS, EVENTS_FILE, BRAND_FILE, ASSETS, PUBLISH,
  ensureDirs, appendEvent, readEvents, parseLines, listTasks, agentStates, readTask, safeId, newTaskId, listAssets, writeJson,
} from '../scripts/lib/store.mjs';
import { loadConfig, saveConfig, capabilities, teamAllowedTools, extraDirs } from '../scripts/lib/config.mjs';
import { saveUpload, updateAsset, removeAsset, wsRel } from '../scripts/lib/assets.mjs';
import { CHANNELS, readRequest, saveRequest, listRequests, newRequestId } from '../scripts/lib/publish.mjs';

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(ROOT, 'office', 'public');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const IS_WIN = process.platform === 'win32';
const claudeAvailable = spawnSync(CLAUDE_BIN, ['--version'], { shell: IS_WIN, encoding: 'utf8' }).status === 0;
let autoRun = process.env.AUTO_RUN ? process.env.AUTO_RUN !== '0' : claudeAvailable;

ensureDirs();

// ---------- Runner: chạy Claude Code lần lượt từng việc ----------
// kind "team":    claude -p "/team <taskId>"
// kind "publish": claude -p "/dang-bai <reqId>"  (chỉ sau khi Sếp bấm Duyệt & đăng)
const queue = [];
let current = null;

const sameJob = (a, b) => a.kind === b.kind && a.id === b.id;

function enqueue(job) {
  if ((current && sameJob(current, job)) || queue.some((j) => sameJob(j, job))) return;
  queue.push(job);
  broadcastRunner();
  pump();
}

function scriptRules(...names) {
  // Cho phép cả dạng tương đối và tuyệt đối của các script trong scripts/.
  return names.flatMap((n) => [`Bash(node scripts/${n}:*)`, `Bash(node ${path.join(ROOT, 'scripts', n)}:*)`]);
}

function claudeArgs(job) {
  // Truyền quyền trực tiếp: ở chế độ headless, Claude Code bỏ qua permissions trong
  // .claude/settings.json nếu thư mục chưa từng được "trust" trong phiên tương tác.
  const cfg = loadConfig();
  const prompt = job.kind === 'team' ? `/team ${job.id}` : `/dang-bai ${job.id}`;
  const args = ['-p', prompt, '--permission-mode', 'acceptEdits'];
  args.push('--model', process.env.CLAUDE_MODEL || 'claude-opus-5-5', '--effort', process.env.CLAUDE_EFFORT || 'high');
  for (const d of extraDirs(cfg)) args.push('--add-dir', d);
  const tools = job.kind === 'team'
    ? [
      ...scriptRules('status.mjs', 'task.mjs', 'assets.mjs', 'config.mjs show', 'render-video.mjs', 'fetch-file.mjs'),
      'Bash(mkdir -p workspace/outputs/:*)', 'Read', 'Glob', 'Grep',
      ...teamAllowedTools(cfg),
    ]
    : [...scriptRules('status.mjs', 'publish.mjs'), 'Read', ...cfg.tools.publish];
  args.push('--allowedTools', ...tools);
  return args;
}

function pump() {
  if (current || !queue.length || !claudeAvailable) return;
  const job = queue.shift();
  const logFile = path.join(LOGS, `${job.kind === 'team' ? '' : 'publish-'}${job.id}.log`);
  const log = fs.openSync(logFile, 'a');
  console.log(`▶ ${job.kind === 'team' ? 'Chạy team cho task' : 'Đăng bài theo yêu cầu'} ${job.id} (log: ${path.relative(ROOT, logFile)})`);
  const child = spawn(CLAUDE_BIN, claudeArgs(job), { cwd: ROOT, stdio: ['ignore', log, log], shell: IS_WIN, env: process.env });
  current = { ...job, pid: child.pid, startedAt: new Date().toISOString() };
  broadcastRunner();
  let finished = false;
  const finish = (code) => {
    if (finished) return;
    finished = true;
    fs.closeSync(log);
    if (job.kind === 'team') finishTeam(job.id, code);
    else finishPublish(job.id, code);
    console.log(`■ ${job.kind} ${job.id} kết thúc với mã ${code}`);
    current = null;
    broadcastRunner();
    pump();
  };
  child.on('exit', finish);
  child.on('error', (err) => { fs.appendFileSync(logFile, String(err)); finish(-1); });
}

function finishTeam(id, code) {
  const finalExists = fs.existsSync(path.join(OUTPUTS, id, 'final.md'));
  const status = listTasks().find((t) => t.id === id)?.status;
  if (status === 'done') return;
  if (code === 0 && finalExists) {
    appendEvent({ agent: 'manager', state: 'done', msg: 'Đã hoàn thành task', task: id, taskStatus: 'done' });
  } else {
    appendEvent({ agent: 'manager', state: 'error', msg: `Team dừng giữa chừng (mã ${code}). Xem workspace/logs/${id}.log`, task: id, taskStatus: 'error' });
  }
}

function finishPublish(id, code) {
  const r = readRequest(id);
  if (r && ['approved', 'publishing'].includes(r.status)) {
    r.status = 'failed';
    r.result = { ...(r.result || {}), error: `Lệnh đăng bài dừng (mã ${code}) mà chưa báo kết quả. Xem workspace/logs/publish-${id}.log` };
    saveRequest(r);
  }
  broadcast('publish', listRequests());
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
  return {
    agents: agentStates(events),
    tasks: listTasks(events),
    events: events.slice(-150),
    runner: runnerInfo(),
    capabilities: capabilities(),
    assets: listAssets(),
    publish: listRequests(),
  };
}

// Theo dõi events.jsonl và các thư mục bằng polling (ổn định trên mọi hệ điều hành).
let offset = fs.existsSync(EVENTS_FILE) ? fs.statSync(EVENTS_FILE).size : 0;
const sigs = {};
function dirSig(dir) {
  try {
    return fs.readdirSync(dir, { recursive: true }).map((f) => {
      try { return f + ':' + fs.statSync(path.join(dir, f)).mtimeMs; } catch { return f; }
    }).join('|');
  } catch { return ''; }
}
function changed(key, dir) {
  const s = dirSig(dir);
  if (s === sigs[key]) return false;
  sigs[key] = s;
  return true;
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
        if (ev.agent === 'boss' && ev.taskStatus === 'queued' && !ev.demo && autoRun) enqueue({ kind: 'team', id: ev.task });
      }
    }
  }
  if (changed('inbox', INBOX) | changed('outputs', OUTPUTS)) tasksChanged = true;
  if (tasksChanged) broadcast('tasks', listTasks());
  if (changed('assets', ASSETS)) broadcast('assets', listAssets());
  if (changed('publish', PUBLISH)) broadcast('publish', listRequests());
}, 600);

setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20000);

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

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
async function readJsonBody(req) { return JSON.parse((await readBody(req)) || '{}'); }

function clip(s, n) { return String(s ?? '').trim().slice(0, n); }

/** Phục vụ file có hỗ trợ Range (để tua video). */
function serveFile(req, res, file, cache = 'no-cache') {
  const stat = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    start = Math.max(0, start); end = Math.min(end, stat.size - 1);
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': cache });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': cache });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const MEDIA_EXT = /\.(png|jpe?g|webp|gif|mp4|mov|webm|m4v)$/i;
function outputMedia(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true })
    .map((f) => String(f))
    .filter((f) => MEDIA_EXT.test(f) && !f.split(/[\\/]/).includes('public'))
    .map((f) => {
      const abs = path.join(dir, f);
      return { name: f.split(path.sep).join('/'), src: wsRel(abs), type: /\.(mp4|mov|webm|m4v)$/i.test(f) ? 'video' : 'image', size: fs.statSync(abs).size };
    });
}

function cleanTaskInput(b) {
  const knownAssets = new Set(listAssets().map((a) => a.id));
  const v = b.video || {};
  return {
    title: clip(b.title, 140),
    type: clip(b.type, 60),
    service: clip(b.service, 120),
    channels: Array.isArray(b.channels) ? b.channels.map((c) => clip(c, 30)).slice(0, 10) : [],
    quantity: clip(b.quantity, 60),
    deadline: clip(b.deadline, 40),
    brief: clip(b.brief, 4000),
    attachments: Array.isArray(b.attachments) ? b.attachments.filter((id) => knownAssets.has(id)).slice(0, 50) : [],
    video: v.enabled
      ? { enabled: true, duration: Math.min(90, Math.max(5, Number(v.duration) || 20)), ratio: ['9:16', '1:1', '16:9', '4:5'].includes(v.ratio) ? v.ratio : '9:16', style: ['auto', 'motion', 'clips'].includes(v.style) ? v.style : 'auto' }
      : { enabled: false },
    useAds: b.useAds !== false,
  };
}

const server = http.createServer(async (req, res) => {
  let m;
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = decodeURIComponent(url.pathname);
    if (p === '/api/state' && req.method === 'GET') return json(res, 200, snapshot());

    if (p === '/api/events' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      send(res, 'snapshot', snapshot());
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // ----- Công việc -----
    if (p === '/api/tasks' && req.method === 'POST') {
      const input = cleanTaskInput(await readJsonBody(req));
      if (!input.title) return json(res, 400, { error: 'Cần nhập tiêu đề công việc' });
      const task = { id: newTaskId(), ...input, createdAt: new Date().toISOString() };
      writeJson(path.join(INBOX, `${task.id}.json`), task);
      appendEvent({ agent: 'boss', state: 'assign', msg: `Giao việc: ${task.title}`, task: task.id, taskStatus: 'queued' });
      return json(res, 201, { task, runner: runnerInfo() });
    }

    if ((m = p.match(/^\/api\/tasks\/([\w-]+)\/run$/)) && req.method === 'POST') {
      const id = safeId(m[1]);
      if (!readTask(id)) return json(res, 404, { error: 'Không có task' });
      if (!claudeAvailable) return json(res, 409, { error: 'Không tìm thấy Claude Code CLI. Hãy mở Claude Code trong thư mục này và gõ /team ' + id });
      enqueue({ kind: 'team', id });
      return json(res, 202, runnerInfo());
    }

    if ((m = p.match(/^\/api\/tasks\/([\w-]+)$/)) && req.method === 'DELETE') {
      const id = safeId(m[1]);
      if (current?.kind === 'team' && current.id === id) return json(res, 409, { error: 'Task đang chạy' });
      const qi = queue.findIndex((j) => j.kind === 'team' && j.id === id); if (qi >= 0) queue.splice(qi, 1);
      fs.rmSync(path.join(INBOX, `${id}.json`), { force: true });
      return json(res, 200, { ok: true });
    }

    if ((m = p.match(/^\/api\/outputs\/([\w-]+)$/)) && req.method === 'GET') {
      const dir = path.join(OUTPUTS, safeId(m[1]));
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort((a, b) => (a === 'final.md' ? -1 : b === 'final.md' ? 1 : a.localeCompare(b)))
          .map((name) => ({ name, content: fs.readFileSync(path.join(dir, name), 'utf8') }))
        : [];
      return json(res, 200, { task: readTask(m[1]), files, media: outputMedia(dir), publish: listRequests(safeId(m[1])) });
    }

    // ----- Kho tư liệu -----
    if (p === '/api/assets' && req.method === 'GET') return json(res, 200, listAssets());
    if (p === '/api/assets' && req.method === 'PUT') {
      const name = clip(url.searchParams.get('name'), 200);
      if (!name) return json(res, 400, { error: 'Thiếu tên file' });
      const asset = await saveUpload(req, name, { desc: url.searchParams.get('desc'), tags: url.searchParams.get('tags') });
      broadcast('assets', listAssets());
      return json(res, 201, asset);
    }
    if ((m = p.match(/^\/api\/assets\/([\w-]+)$/))) {
      if (req.method === 'PATCH') {
        const a = updateAsset(m[1], await readJsonBody(req));
        if (!a) return json(res, 404, { error: 'Không có tư liệu' });
        broadcast('assets', listAssets());
        return json(res, 200, a);
      }
      if (req.method === 'DELETE') {
        if (!removeAsset(m[1])) return json(res, 404, { error: 'Không có tư liệu' });
        broadcast('assets', listAssets());
        return json(res, 200, { ok: true });
      }
    }

    // ----- File trong workspace (tư liệu + kết quả) -----
    if ((m = p.match(/^\/files\/(.+)$/)) && (req.method === 'GET' || req.method === 'HEAD')) {
      const file = path.normalize(path.join(WS, m[1]));
      const okRoot = [ASSETS, OUTPUTS].some((r) => file.startsWith(r + path.sep));
      if (!okRoot || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
      return serveFile(req, res, file, 'private, max-age=60');
    }

    // ----- Đăng bài -----
    if (p === '/api/publish' && req.method === 'GET') return json(res, 200, listRequests(url.searchParams.get('task') || undefined));
    if (p === '/api/publish' && req.method === 'POST') {
      const b = await readJsonBody(req);
      if (!readTask(b.task)) return json(res, 400, { error: 'Không có task' });
      if (!CHANNELS.includes(b.channel)) return json(res, 400, { error: 'Kênh không hợp lệ' });
      const text = clip(b.text, 5000);
      if (!text) return json(res, 400, { error: 'Cần nội dung bài đăng' });
      const media = (Array.isArray(b.media) ? b.media : []).slice(0, 10).filter((src) => {
        const abs = path.normalize(path.join(WS, String(src)));
        return [ASSETS, OUTPUTS].some((r) => abs.startsWith(r + path.sep)) && fs.existsSync(abs);
      }).map((src) => ({ src, type: /\.(mp4|mov|webm|m4v)$/i.test(src) ? 'video' : 'image' }));
      const scheduleAt = b.scheduleAt && !Number.isNaN(Date.parse(b.scheduleAt)) ? new Date(b.scheduleAt).toISOString() : null;
      const reqObj = saveRequest({ id: newRequestId(), task: b.task, channel: b.channel, text, media, scheduleAt, status: 'pending', createdAt: new Date().toISOString() });
      broadcast('publish', listRequests());
      return json(res, 201, reqObj);
    }
    if ((m = p.match(/^\/api\/publish\/([\w-]+)\/approve$/)) && req.method === 'POST') {
      const r = readRequest(m[1]);
      if (!r) return json(res, 404, { error: 'Không có yêu cầu' });
      if (r.status !== 'pending' && r.status !== 'failed') return json(res, 409, { error: `Yêu cầu đang ở trạng thái ${r.status}` });
      if (!capabilities().publish) return json(res, 409, { error: 'Chưa có kết nối đăng bài. Chạy /setup-team trong Claude Code trước.' });
      r.status = 'approved'; r.approvedAt = new Date().toISOString(); r.result = null;
      saveRequest(r);
      if (claudeAvailable) enqueue({ kind: 'publish', id: r.id });
      broadcast('publish', listRequests());
      return json(res, 202, { request: r, runner: runnerInfo(), manual: !claudeAvailable ? `/dang-bai ${r.id}` : null });
    }
    if ((m = p.match(/^\/api\/publish\/([\w-]+)$/)) && req.method === 'DELETE') {
      const r = readRequest(m[1]);
      if (!r) return json(res, 404, { error: 'Không có yêu cầu' });
      if (!['pending', 'failed'].includes(r.status)) return json(res, 409, { error: `Không huỷ được khi đang ${r.status}` });
      r.status = 'cancelled';
      saveRequest(r);
      broadcast('publish', listRequests());
      return json(res, 200, r);
    }

    // ----- Hồ sơ & cài đặt -----
    if (p === '/api/brand') {
      if (req.method === 'GET') return json(res, 200, { content: fs.existsSync(BRAND_FILE) ? fs.readFileSync(BRAND_FILE, 'utf8') : '' });
      if (req.method === 'PUT') {
        const b = await readJsonBody(req);
        fs.writeFileSync(BRAND_FILE, String(b.content ?? '').slice(0, 50000));
        return json(res, 200, { ok: true });
      }
    }

    if (p === '/api/config') {
      if (req.method === 'GET') return json(res, 200, { config: loadConfig(), capabilities: capabilities() });
      if (req.method === 'PUT') {
        const b = await readJsonBody(req);
        const c = loadConfig();
        if (typeof b.remotionDir === 'string') c.remotionDir = clip(b.remotionDir, 400);
        for (const k of ['adAccountId', 'pageId', 'igAccountId']) if (typeof b.meta?.[k] === 'string') c.meta[k] = clip(b.meta[k], 80);
        saveConfig(c);
        const caps = capabilities(c);
        broadcast('capabilities', caps);
        return json(res, 200, { config: c, capabilities: caps });
      }
    }

    if (p === '/api/runner' && req.method === 'POST') {
      const b = await readJsonBody(req);
      if (typeof b.autoRun === 'boolean') autoRun = b.autoRun && claudeAvailable;
      broadcastRunner();
      return json(res, 200, runnerInfo());
    }

    if (req.method === 'GET') {
      const file = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : p));
      if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('Not found');
      }
      return serveFile(req, res, file);
    }
    res.writeHead(405); res.end();
  } catch (err) {
    if (!res.headersSent) json(res, 500, { error: String(err.message || err) });
    else res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const caps = capabilities();
  console.log(`\n🏢 Văn phòng Content Spa đang mở tại http://localhost:${PORT}`);
  console.log(claudeAvailable
    ? `   Claude Code CLI: có sẵn · Tự chạy team khi giao việc: ${autoRun ? 'BẬT' : 'TẮT'}`
    : '   ⚠ Không tìm thấy Claude Code CLI – giao việc trên web rồi gõ /team trong Claude Code để team làm việc.');
  console.log(`   Video: ${caps.video ? '✓' : '✗'} · Ads: ${caps.ads ? '✓' : '✗'} · Tạo ảnh: ${caps.imageGen ? '✓' : '✗'} · Đăng bài: ${caps.publish ? '✓' : '✗'}  (cấu hình bằng /setup-team)`);
  console.log('   Xem thử hoạt cảnh: npm run demo\n');
});
