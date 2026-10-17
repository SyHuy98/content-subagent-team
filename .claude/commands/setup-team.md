---
description: Cài đặt team trên máy này – tìm skill Remotion, dò connector (Meta Ads, Canva, Higgsfield, đăng bài), cài thư viện video
model: claude-opus-5-5
effort: high
---

Bạn đang giúp Sếp cài đặt văn phòng Content Spa trên máy này. Làm lần lượt từng bước, giải thích ngắn gọn bằng tiếng Việt, rồi báo cáo kết quả cuối cùng dạng bảng ✓/✗.

## 1. Xem cấu hình hiện tại
Chạy `node scripts/config.mjs show`.

## 2. Remotion (cho Tâm – Video Editor)
- Thư mục mặc định là `remotionDir` (trên Windows là `E:\remotion`). Nếu Sếp nói một đường dẫn khác thì dùng đường dẫn đó.
- Dùng Glob/Read để xem trong thư mục đó:
  - Tìm `SKILL.md` (có thể nằm sâu hơn, ví dụ `skills/remotion/SKILL.md`). Nếu thấy, đó là **skill** → `node scripts/config.mjs set remotionSkill "<đường dẫn tuyệt đối tới SKILL.md>"`.
  - Nếu có `package.json` chứa `remotion` → đó là **project Remotion có sẵn** → `node scripts/config.mjs set remotionProject "<đường dẫn thư mục>"`.
- Ghi lại thư mục: `node scripts/config.mjs set remotionDir "<thư mục>"`.
- Nếu không tìm thấy gì, báo ✗ và hỏi Sếp đường dẫn đúng.

## 3. Cài thư viện dựng video
Chạy `npm run setup-video` (cài Remotion vào thư mục `video/` của dự án; lần đầu mất vài phút). Nếu lỗi, báo lại nguyên văn lỗi.

## 4. Dò các connector (công cụ MCP) mà phiên này đang có
Xem danh sách công cụ của bạn có tên bắt đầu bằng `mcp__`. Chia vào 3 nhóm, **chỉ dùng tên công cụ thật sự có**:

| Nhóm | Gồm | Ví dụ tên công cụ |
|---|---|---|
| `metaAdsRead` | Chỉ công cụ **ĐỌC** của Meta Ads: insights, danh sách chiến dịch/nhóm/quảng cáo, creative, trang, tài khoản | `get_insights`, `get_campaigns`, `get_ads`, `get_ad_creatives`, `ads_get_*`, `ads_insights_*`, `get_ad_accounts`, `get_account_pages` |
| `imageGen` | Tạo/xuất ảnh: Higgsfield, Canva | `generate_image`, `jobs_wait`, `show_generation_by_ids`, `generate-design`, `get-design-*`, `export-design`, `get-export-formats` |
| `publish` | Đăng bài lên Facebook Page / Instagram, kèm công cụ đọc cần cho việc đăng | `publish_facebook_page_post`, `publish_instagram_media`, `get_account_pages`, `get_instagram_accounts` |

**Tuyệt đối không** đưa vào `metaAdsRead` các công cụ tạo/sửa/xoá/bật/tắt (`create_*`, `update_*`, `delete_*`, `bulk_update_*`, `duplicate_*`, `ads_activate_entity`, `ads_update_entity`…).

Ghi bằng (mỗi nhóm một lệnh, liệt kê đủ tên đầy đủ dạng `mcp__...__...`):
```
node scripts/config.mjs set-tools metaAdsRead <tool1> <tool2> ...
node scripts/config.mjs set-tools imageGen <tool1> ...
node scripts/config.mjs set-tools publish <tool1> ...
```

## 5. Tài khoản Meta
Nếu có công cụ đọc tài khoản/trang, gọi thử để lấy danh sách tài khoản quảng cáo, Facebook Page, Instagram. Nếu có nhiều lựa chọn, hỏi Sếp chọn cái nào. Sau đó ghi:
```
node scripts/config.mjs set meta.adAccountId <id>
node scripts/config.mjs set meta.pageId <id>
node scripts/config.mjs set meta.igAccountId <id>
```

## 6. Ghi quyền cho phiên tương tác
Chạy `node scripts/config.mjs write-local-settings`. Lệnh này cho phép công cụ đọc Ads và tạo ảnh, cho phép đọc thư mục Remotion, và **không** cấp quyền đăng bài (đăng bài chỉ chạy qua `/dang-bai` sau khi Sếp bấm duyệt trên web).

## 7. Báo cáo
Chạy lại `node scripts/config.mjs show` rồi báo bảng:

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Skill Remotion | ✓/✗ | đường dẫn |
| Thư viện video | ✓/✗ | |
| Phân tích Ads (An) | ✓/✗ | số công cụ, tài khoản |
| Tạo ảnh (Khoa) | ✓/✗ | Higgsfield/Canva |
| Đăng bài | ✓/✗ | Page/IG |

Nhắc Sếp: khởi động lại `npm start` để web nhận cấu hình mới, và mở lại Claude Code (`/exit` rồi `claude`) để quyền mới có hiệu lực.
