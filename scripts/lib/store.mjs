// Shared storage helpers. All state is derived from an append-only event log
// (workspace/state/events.jsonl) so that many agents can report in parallel
// without locking: each report is a single small appended line.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const WS = path.join(ROOT, 'workspace');
export const INBOX = path.join(WS, 'inbox');
export const OUTPUTS = path.join(WS, 'outputs');
export const STATE_DIR = path.join(WS, 'state');
export const LOGS = path.join(WS, 'logs');
export const EVENTS_FILE = path.join(STATE_DIR, 'events.jsonl');
export const BRAND_FILE = path.join(WS, 'brand.md');

export const AGENTS = {
  manager:      { name: 'Claude',  role: 'Trưởng nhóm' },
  'chuyen-gia': { name: 'Dr. Linh', role: 'Chuyên gia Da liễu & Thẩm mỹ' },
  'chien-luoc': { name: 'Minh',    role: 'Chiến lược Content & SEO' },
  copywriter:   { name: 'Vy',      role: 'Copywriter' },
  designer:     { name: 'Khoa',    role: 'Designer' },
};

export const AGENT_STATES = ['idle', 'receiving', 'working', 'consulting', 'reviewing', 'delivering', 'done', 'error'];
export const TASK_STATUSES = ['queued', 'in_progress', 'done', 'error'];

export function ensureDirs() {
  for (const d of [INBOX, OUTPUTS, STATE_DIR, LOGS]) fs.mkdirSync(d, { recursive: true });
}

export function appendEvent(ev) {
  ensureDirs();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...ev });
  fs.appendFileSync(EVENTS_FILE, line + '\n');
  return line;
}

export function readEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  return parseLines(fs.readFileSync(EVENTS_FILE, 'utf8'));
}

export function parseLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip partial line */ }
  }
  return out;
}

export function readTask(id) {
  const file = path.join(INBOX, `${safeId(id)}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function listTasks(events = readEvents()) {
  ensureDirs();
  const status = {};
  const updated = {};
  for (const ev of events) {
    if (ev.task && ev.taskStatus) status[ev.task] = ev.taskStatus;
    if (ev.task) updated[ev.task] = ev.ts;
  }
  return fs.readdirSync(INBOX)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try { return JSON.parse(fs.readFileSync(path.join(INBOX, f), 'utf8')); } catch { return null; }
    })
    .filter(Boolean)
    .map((t) => ({
      ...t,
      status: status[t.id] || 'queued',
      updatedAt: updated[t.id] || t.createdAt,
      hasFinal: fs.existsSync(path.join(OUTPUTS, t.id, 'final.md')),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function agentStates(events = readEvents()) {
  const agents = {};
  for (const id of Object.keys(AGENTS)) agents[id] = { id, ...AGENTS[id], state: 'idle', msg: '', task: null, ts: null };
  for (const ev of events) {
    if (!agents[ev.agent]) continue;
    Object.assign(agents[ev.agent], { state: ev.state, msg: ev.msg || '', task: ev.task || null, to: ev.to || null, ts: ev.ts });
  }
  return agents;
}

export function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '');
}

export function newTaskId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `t${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 5)}`;
}
