#!/usr/bin/env node
// Dùng trong lệnh /dang-bai.
//   node scripts/publish.mjs show <reqId>
//   node scripts/publish.mjs start <reqId>
//   node scripts/publish.mjs result <reqId> --status published|failed [--url <link>] [--post-id <id>] [--error "<lý do>"]
import path from 'node:path';
import { readRequest, saveRequest } from './lib/publish.mjs';
import { WS } from './lib/store.mjs';

const args = process.argv.slice(2);
const [cmd, id] = args;
const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const fail = (m) => { console.error(`publish.mjs: ${m}`); process.exit(1); };

const req = id && readRequest(id);
if (!req) fail(`Không tìm thấy yêu cầu đăng "${id}"`);

if (cmd === 'show') {
  console.log(JSON.stringify({
    ...req,
    media: req.media.map((m) => ({ ...m, absPath: path.join(WS, m.src) })),
  }, null, 2));
} else if (cmd === 'start') {
  if (req.status !== 'approved') fail(`Yêu cầu đang ở trạng thái "${req.status}", chỉ được đăng khi Sếp đã duyệt (approved).`);
  req.status = 'publishing';
  saveRequest(req);
  console.log('✓ Bắt đầu đăng');
} else if (cmd === 'result') {
  const status = flag('status');
  if (!['published', 'failed'].includes(status)) fail('--status phải là published hoặc failed');
  if (!['approved', 'publishing'].includes(req.status)) fail(`Yêu cầu đang ở trạng thái "${req.status}"`);
  req.status = status;
  req.result = { url: flag('url') || '', postId: flag('post-id') || '', error: flag('error') || '' };
  saveRequest(req);
  console.log(`✓ ${status}${req.result.url ? ' – ' + req.result.url : ''}`);
} else {
  fail('Dùng: show <id> | start <id> | result <id> --status published|failed [--url] [--post-id] [--error]');
}
