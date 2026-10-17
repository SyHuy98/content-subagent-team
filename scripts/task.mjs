#!/usr/bin/env node
// Tra cứu task cho Trưởng nhóm.
//   node scripts/task.mjs next        -> in id của task đang chờ lâu nhất (hoặc trống)
//   node scripts/task.mjs show <id>   -> in nội dung brief của task
//   node scripts/task.mjs list        -> liệt kê task và trạng thái
import { listTasks, readTask } from './lib/store.mjs';

const [cmd, id] = process.argv.slice(2);

if (cmd === 'next') {
  const next = listTasks().find((t) => t.status === 'queued');
  if (next) console.log(next.id);
} else if (cmd === 'show') {
  const task = id && readTask(id);
  if (!task) { console.error(`Không tìm thấy task "${id}"`); process.exit(1); }
  console.log(JSON.stringify(task, null, 2));
} else if (cmd === 'list') {
  for (const t of listTasks()) console.log(`${t.id}\t${t.status}\t${t.title}`);
} else {
  console.error('Dùng: node scripts/task.mjs next | show <id> | list');
  process.exit(1);
}
