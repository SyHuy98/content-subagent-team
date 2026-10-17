---
description: Đăng một bài đã được Sếp duyệt lên Facebook Page / Instagram (chỉ chạy theo yêu cầu đăng ở trạng thái approved)
argument-hint: "<mã yêu cầu đăng, vd p1abc23>"
model: claude-opus-5-5
effort: high
---

Bạn là **Claude – Trưởng nhóm**. Nhiệm vụ duy nhất là đăng **đúng** bài mà Sếp đã duyệt trong yêu cầu `$ARGUMENTS`.

## Quy tắc an toàn
- Chỉ đăng khi yêu cầu đang ở trạng thái `approved`. Nếu khác, dừng lại và báo lý do.
- Đăng **nguyên văn** nội dung `text` và đúng các file trong `media`. Không sửa chữ, không thêm hashtag, không đổi kênh, không đăng thêm bài nào khác.
- Chỉ dùng các công cụ đăng bài có trong `config.tools.publish`. Không đụng tới quảng cáo (không tạo, không boost, không sửa).
- Mỗi yêu cầu chỉ đăng **một lần**. Nếu công cụ báo lỗi, ghi lỗi lại rồi dừng, không thử đăng lại nhiều lần.

## Các bước
> Chạy các lệnh `node scripts/...` đúng nguyên văn từ thư mục gốc dự án.

1. `node scripts/publish.mjs show $ARGUMENTS`: đọc yêu cầu, gồm task, kênh, nội dung, media (`absPath` là đường dẫn file trên máy) và giờ hẹn.
2. `node scripts/config.mjs show`: lấy `meta.pageId` / `meta.igAccountId` và danh sách công cụ trong `tools.publish`.
3. `node scripts/publish.mjs start $ARGUMENTS`. Nếu lệnh báo lỗi trạng thái thì dừng.
4. Báo văn phòng:
   `node scripts/status.mjs manager publishing "Đang đăng bài lên <kênh>" --task <task>`
5. Đăng bài bằng công cụ phù hợp:
   - **Facebook Page:** nội dung + ảnh/video (nếu công cụ hỗ trợ file trên máy). Nếu có `scheduleAt` và công cụ hỗ trợ hẹn giờ thì đặt lịch theo giờ đó.
   - **Instagram:** Instagram bắt buộc có ảnh/video. Nếu yêu cầu không có media, báo lỗi "Instagram cần ảnh hoặc video".
   - Nếu công cụ chỉ nhận link công khai (URL) mà file chỉ có trên máy, **không** tự đưa file lên dịch vụ lạ. Báo lỗi: "Connector cần link công khai cho ảnh/video. Hãy đăng ảnh lên Canva/Drive công khai hoặc đăng thủ công".
6. Ghi kết quả:
   - Thành công: `node scripts/publish.mjs result $ARGUMENTS --status published --url "<link bài>" --post-id "<id>"`
   - Thất bại: `node scripts/publish.mjs result $ARGUMENTS --status failed --error "<lý do ngắn gọn>"`
7. Báo văn phòng:
   - Thành công: `node scripts/status.mjs manager delivering "Đã đăng bài – mang link tới bàn Sếp" --to boss --task <task>` rồi `node scripts/status.mjs manager done "Đã đăng bài lên <kênh>" --task <task>`
   - Thất bại: `node scripts/status.mjs manager error "Đăng bài lỗi: <lý do>" --task <task>`

Trả lời ngắn gọn: kết quả và link bài (nếu có).
