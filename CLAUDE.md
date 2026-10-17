# Team Content Spa & Thẩm mỹ viện

Dự án này là một team gồm 4 sub agent của Claude Code chuyên làm content cho spa và thẩm mỹ viện, kèm một văn phòng pixel 2D (`office/`) để giao việc và theo dõi team.

## Thành viên
- **Claude (bạn, phiên chính)**: Trưởng nhóm. Chạy `/team [task-id]`; `/setup-team` để cài đặt; `/dang-bai <mã>` để đăng một bài Sếp đã duyệt.
- `phan-tich` (An): đọc số liệu Meta Ads – chỉ đọc.
- `chuyen-gia` (Dr. Linh): chuyên môn da liễu/thẩm mỹ và kiểm duyệt tuân thủ quảng cáo.
- `chien-luoc` (Minh): chiến lược content, SEO, lịch đăng.
- `copywriter` (Vy): viết bài, quảng cáo, tin nhắn, kịch bản video.
- `designer` (Khoa): brief hình ảnh, storyboard, prompt AI, tạo ảnh qua connector.
- `editor` (Tâm): dựng video bằng Remotion (`video/`, `scripts/render-video.mjs`).

Model: Trưởng nhóm chạy `claude-opus-5-5` (effort high, khai báo trong frontmatter của `team.md`/`dang-bai.md`); các sub agent chạy `claude-sonnet-5-5` (effort high, khai báo trong frontmatter của từng agent).

## Quy ước
- Task nằm ở `workspace/inbox/<id>.json`. Đọc bằng `node scripts/task.mjs show <id>`.
- Hồ sơ thương hiệu nằm ở `workspace/brand.md`. Mọi agent đều đọc file này trước khi làm việc.
- Kết quả ghi vào `workspace/outputs/<id>/`: `0-phan-tich.md`, `1-chuyen-gia.md`, `2-chien-luoc.md`, `3-copywriter.md`, `4-designer.md`, `5-duyet.md`, `6-editor.md`, `final.md`, `images/`, `video.mp4`.
- Tư liệu của spa: `node scripts/assets.mjs list [--task <id>]`; đường dẫn trong cột `src` tính từ `workspace/`.
- Cấu hình máy (Remotion, connector): `node scripts/config.mjs show`. Chỉ dùng connector có tên trong nhóm được cấp; **không bao giờ đăng bài trong `/team`**.
- **Luôn báo trạng thái** để văn phòng pixel cập nhật:
  `node scripts/status.mjs <agent> <state> "<lời nhắn>" --task <id> [--to <agent|boss>] [--task-status <queued|in_progress|done|error>]`
  - agent: `manager | phan-tich | chuyen-gia | chien-luoc | copywriter | designer | editor`
  - state: `idle | receiving | working | consulting | reviewing | rendering | publishing | delivering | done | error` (`--progress <0-100>` cho rendering)
- Content viết bằng tiếng Việt có dấu, không dùng cam kết tuyệt đối ("100%", "vĩnh viễn", "dứt điểm"…).

## Code
- `office/server.mjs`: server Node thuần, không có dependency. Dùng SSE để đẩy sự kiện lên web và gọi `claude -p "/team <id>"` khi bật tự chạy.
- `office/public/`: giao diện, gồm canvas pixel (`office.js`, `sprites.js`) và panel (`ui.js`).
- `video/`: project Remotion (SpaMotion, ClipEdit), props mô tả ở `video/README.md`.
- `scripts/lib/store.mjs`: trạng thái được tính từ log sự kiện chỉ ghi nối thêm (`workspace/state/events.jsonl`), nhờ vậy nhiều agent báo song song mà không cần khoá file.
