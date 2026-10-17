#!/usr/bin/env node
// Hook SubagentStart / SubagentStop của Claude Code: tự động báo trạng thái
// "đang làm" / "xong" lên văn phòng, phòng khi sub agent quên tự báo.
import { AGENTS, appendEvent, readEvents } from './lib/store.mjs';

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input || '{}');
    const agent = data.agent_type;
    if (!AGENTS[agent] || agent === 'manager') return;
    const events = readEvents().reverse();
    const task = events.find((e) => e.agent === 'manager' && e.task)?.task;
    if (data.hook_event_name === 'SubagentStart') {
      appendEvent({ agent, state: 'working', msg: 'Bắt đầu làm việc', task, auto: true });
    } else if (data.hook_event_name === 'SubagentStop') {
      // Đảm bảo luôn có cảnh "mang bài nộp Trưởng nhóm" trước khi xong.
      if (events.find((e) => e.agent === agent)?.state !== 'delivering') {
        appendEvent({ agent, state: 'delivering', msg: 'Mang kết quả nộp Trưởng nhóm', task, to: 'manager', auto: true });
      }
      appendEvent({ agent, state: 'done', msg: 'Đã nộp kết quả cho Trưởng nhóm', task, auto: true });
    }
  } catch {
    // Không bao giờ chặn Claude Code vì lỗi hiển thị.
  }
});
