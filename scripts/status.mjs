#!/usr/bin/env node
// Báo trạng thái lên văn phòng pixel.
// Cách dùng:
//   node scripts/status.mjs <agent> <state> "<lời nhắn>" [--task <id>] [--to <agent>] [--task-status <status>] [--progress <0-100>]
// agent: manager | chuyen-gia | chien-luoc | copywriter | designer | editor | phan-tich
// state: idle | receiving | working | consulting | reviewing | rendering | publishing | delivering | done | error
import { AGENTS, AGENT_STATES, TASK_STATUSES, appendEvent } from './lib/store.mjs';

const args = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) flags[args[i].slice(2)] = args[++i];
  else pos.push(args[i]);
}
const [agent, state, ...rest] = pos;

function fail(msg) {
  console.error(`status.mjs: ${msg}`);
  console.error('Dùng: node scripts/status.mjs <agent> <state> "<lời nhắn>" [--task <id>] [--to <agent>] [--task-status <status>]');
  process.exit(1);
}

if (!AGENTS[agent]) fail(`agent không hợp lệ "${agent}". Chọn: ${Object.keys(AGENTS).join(', ')}`);
if (!AGENT_STATES.includes(state)) fail(`state không hợp lệ "${state}". Chọn: ${AGENT_STATES.join(', ')}`);
if (flags.to && !AGENTS[flags.to] && flags.to !== 'boss') fail(`--to không hợp lệ "${flags.to}"`);
if (flags['task-status'] && !TASK_STATUSES.includes(flags['task-status'])) fail(`--task-status không hợp lệ. Chọn: ${TASK_STATUSES.join(', ')}`);

const ev = { agent, state, msg: rest.join(' ').slice(0, 280) };
if (flags.task) ev.task = flags.task;
if (flags.to) ev.to = flags.to;
if (flags['task-status']) ev.taskStatus = flags['task-status'];
if (flags.progress !== undefined) ev.progress = Math.max(0, Math.min(100, Number(flags.progress) || 0));
appendEvent(ev);
console.log(`✓ ${AGENTS[agent].name}: ${state}${ev.msg ? ' – ' + ev.msg : ''}`);
