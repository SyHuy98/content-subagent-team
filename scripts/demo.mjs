#!/usr/bin/env node
// Phát lại một lượt làm việc mẫu để xem hoạt cảnh văn phòng mà không tốn lượt Claude.
//   npm run demo            (khoảng 2 phút)
//   npm run demo -- --fast  (nhanh gấp đôi)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INBOX, OUTPUTS, appendEvent, ensureDirs } from './lib/store.mjs';

const speed = process.argv.includes('--fast') ? 0.5 : 1;
const CONTENT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'demo-content');
ensureDirs();

const id = `demo-${Date.now().toString(36)}`;
const task = {
  id,
  title: 'Ưu đãi tri ân 20/11 – Combo chăm sóc da (DEMO)',
  type: 'Chiến dịch trọn gói',
  service: 'Combo chăm sóc da',
  channels: ['Facebook', 'Instagram', 'Zalo OA'],
  quantity: '3 bài + 2 quảng cáo',
  deadline: '',
  brief: 'Bản demo: combo chăm sóc da mua 1 tặng 1 dịp 20/11.',
  createdAt: new Date().toISOString(),
  demo: true,
};
const outDir = path.join(OUTPUTS, id);

const write = (name) => () => {
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(path.join(CONTENT, name), path.join(outDir, name));
};

const S = (t, agent, state, msg, extra = {}) => ({ t, ev: { agent, state, msg, task: id, demo: true, ...extra } });
const F = (t, fn) => ({ t, fn });

const script = [
  F(0, () => fs.writeFileSync(path.join(INBOX, `${id}.json`), JSON.stringify(task, null, 2))),
  S(0, 'boss', 'assign', `Giao việc: ${task.title}`, { taskStatus: 'queued' }),
  S(2, 'manager', 'receiving', 'Nhận việc từ Sếp: Ưu đãi tri ân 20/11', { to: 'boss', taskStatus: 'in_progress' }),
  S(7, 'manager', 'working', 'Lên kế hoạch phân công'),
  S(10, 'manager', 'consulting', 'Giao việc cho Dr. Linh: nền tảng chuyên môn', { to: 'chuyen-gia' }),
  S(14, 'manager', 'consulting', 'Giao việc cho Minh: chiến lược & lịch đăng', { to: 'chien-luoc' }),
  S(15, 'chuyen-gia', 'working', 'Nghiên cứu combo chăm sóc da & chống chỉ định'),
  S(17, 'chien-luoc', 'working', 'Phân tích khách hàng mục tiêu 20/11'),
  S(19, 'manager', 'working', 'Theo dõi tiến độ vòng nền tảng'),
  S(25, 'chien-luoc', 'consulting', 'Hỏi Dr. Linh về nỗi lo của khách da nhạy cảm', { to: 'chuyen-gia' }),
  S(31, 'chien-luoc', 'working', 'Lên lịch đăng & bộ hashtag'),
  F(34, write('1-chuyen-gia.md')),
  S(34, 'chuyen-gia', 'delivering', 'Gửi kết quả cho Trưởng nhóm'),
  S(38, 'chuyen-gia', 'done', 'Đã nộp nền tảng chuyên môn'),
  F(39, write('2-chien-luoc.md')),
  S(39, 'chien-luoc', 'delivering', 'Gửi chiến lược cho Trưởng nhóm'),
  S(43, 'chien-luoc', 'done', 'Đã nộp chiến lược'),
  S(44, 'manager', 'consulting', 'Giao việc cho Vy: viết bài & quảng cáo', { to: 'copywriter' }),
  S(48, 'manager', 'consulting', 'Giao việc cho Khoa: brief hình ảnh', { to: 'designer' }),
  S(49, 'copywriter', 'working', 'Đang viết 3 bài theo 3 góc tiếp cận'),
  S(51, 'designer', 'working', 'Đang lên moodboard & bố cục'),
  S(53, 'manager', 'working', 'Theo dõi tiến độ vòng sáng tạo'),
  S(58, 'designer', 'consulting', 'Xin headline chốt từ Vy', { to: 'copywriter' }),
  S(63, 'designer', 'working', 'Viết prompt AI & carousel 6 slide'),
  F(68, write('3-copywriter.md')),
  S(68, 'copywriter', 'delivering', 'Gửi bài viết cho Trưởng nhóm'),
  S(72, 'copywriter', 'done', 'Đã nộp bài'),
  F(73, write('4-designer.md')),
  S(73, 'designer', 'delivering', 'Gửi brief thiết kế cho Trưởng nhóm'),
  S(77, 'designer', 'done', 'Đã nộp brief'),
  S(78, 'manager', 'consulting', 'Nhờ Dr. Linh duyệt bài của Vy', { to: 'chuyen-gia' }),
  S(81, 'chuyen-gia', 'reviewing', 'Đang duyệt bài của Vy'),
  F(89, write('5-duyet.md')),
  S(89, 'chuyen-gia', 'consulting', 'Vy ơi, sửa câu “bật tông” nhé (🔴)', { to: 'copywriter' }),
  S(93, 'copywriter', 'working', 'Sửa bài theo góp ý của Dr. Linh'),
  S(94, 'chuyen-gia', 'delivering', 'Gửi kết quả duyệt cho Trưởng nhóm'),
  S(98, 'chuyen-gia', 'done', 'Đã duyệt'),
  S(100, 'copywriter', 'delivering', 'Gửi bản đã sửa'),
  S(104, 'copywriter', 'done', 'Đã sửa xong'),
  S(105, 'manager', 'working', 'Tổng hợp báo cáo cuối'),
  F(112, write('final.md')),
  S(112, 'manager', 'delivering', 'Mang báo cáo tổng tới bàn Sếp', { to: 'boss' }),
  S(117, 'manager', 'done', 'Đã hoàn thành: Ưu đãi tri ân 20/11', { taskStatus: 'done' }),
];

console.log(`🎬 Demo task ${id}. Mở http://localhost:3000 để xem (cần chạy npm start trước).`);
const start = Date.now();
for (const step of script) {
  const wait = step.t * 1000 * speed - (Date.now() - start);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  if (step.fn) step.fn();
  else {
    appendEvent(step.ev);
    console.log(`  ${String(step.t).padStart(3)}s  ${step.ev.agent.padEnd(10)} ${step.ev.state.padEnd(10)} ${step.ev.msg}`);
  }
}
console.log('✅ Demo xong. Xem báo cáo ở tab “Báo cáo”.');
