#!/usr/bin/env node
// Xem kho tư liệu của spa.
//   node scripts/assets.mjs list               -> toàn bộ tư liệu
//   node scripts/assets.mjs list --task <id>   -> tư liệu Sếp đính kèm cho task (+ logo/nhạc chung)
//   thêm --json để lấy dạng JSON
// Cột "src" là đường dẫn tính từ thư mục workspace/ – dùng trực tiếp trong props của Remotion.
import { listAssets, readTask } from './lib/store.mjs';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const [cmd] = args;

if (cmd !== 'list') {
  console.error('Dùng: node scripts/assets.mjs list [--task <id>] [--json]');
  process.exit(1);
}

let assets = listAssets();
const taskId = flag('task');
if (taskId) {
  const task = readTask(taskId);
  if (!task) { console.error(`Không tìm thấy task "${taskId}"`); process.exit(1); }
  const attached = new Set(task.attachments || []);
  assets = assets
    .filter((a) => attached.has(a.id) || a.tags.some((t) => /logo|nhac|nhạc|music/i.test(t)))
    .map((a) => ({ ...a, attached: attached.has(a.id) }));
}

const rows = assets.map((a) => ({
  id: a.id,
  type: a.type,
  src: a.file,
  path: `workspace/${a.file}`,
  desc: a.desc,
  tags: a.tags,
  ...(a.width ? { size: `${a.width}x${a.height}` } : {}),
  ...(a.duration ? { duration: a.duration } : {}),
  ...(a.attached !== undefined ? { attached: a.attached } : {}),
}));

if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
else if (!rows.length) console.log('(Kho tư liệu trống)');
else for (const r of rows) {
  console.log(`${r.id}\t${r.type}\t${r.src}${r.size ? '\t' + r.size : ''}${r.duration ? '\t' + r.duration + 's' : ''}${r.attached === false ? '\t(chung)' : ''}\n\t${r.desc || '(chưa mô tả)'}${r.tags.length ? ' #' + r.tags.join(' #') : ''}`);
}
