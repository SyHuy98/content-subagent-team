#!/usr/bin/env node
// Tải ảnh/video do connector tạo ra (Higgsfield, Canva…) về thư mục kết quả của task.
//   node scripts/fetch-file.mjs <https-url> <taskId> [tên-file]
// Chỉ nhận link https, chỉ ghi vào workspace/outputs/<taskId>/images/, tối đa 200MB.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { OUTPUTS, safeId } from './lib/store.mjs';
import { safeFileName } from './lib/assets.mjs';

const [url, task, name] = process.argv.slice(2);
const fail = (m) => { console.error(`fetch-file: ${m}`); process.exit(1); };
if (!url || !task) fail('Dùng: node scripts/fetch-file.mjs <https-url> <taskId> [tên-file]');
let u;
try { u = new URL(url); } catch { fail('Link không hợp lệ'); }
if (u.protocol !== 'https:') fail('Chỉ nhận link https');

const res = await fetch(u, { redirect: 'follow' }).catch((e) => fail(`Không tải được: ${e.cause?.code || e.message}`));
if (!res.ok || !res.body) fail(`Tải lỗi: HTTP ${res.status}`);
const type = res.headers.get('content-type') || '';
if (!/^(image|video)\//.test(type)) fail(`Không phải ảnh/video (content-type: ${type || 'không rõ'})`);
const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm' }[type.split(';')[0]] || '';

const dir = path.join(OUTPUTS, safeId(task), 'images');
fs.mkdirSync(dir, { recursive: true });
let file = safeFileName(name || path.basename(u.pathname) || 'file');
if (!path.extname(file) && ext) file += ext;
const dest = path.join(dir, file);

let size = 0;
const limit = 200 * 1024 * 1024;
await pipeline(Readable.fromWeb(res.body), async function* (src) {
  for await (const chunk of src) {
    size += chunk.length;
    if (size > limit) throw new Error('File quá lớn (>200MB)');
    yield chunk;
  }
}, fs.createWriteStream(dest)).catch((e) => { fs.rmSync(dest, { force: true }); fail(e.message); });

console.log(`✓ Đã lưu workspace/outputs/${safeId(task)}/images/${file} (${(size / 1e6).toFixed(2)} MB)`);
