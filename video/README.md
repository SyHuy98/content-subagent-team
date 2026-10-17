# Khung dựng video Remotion – Team Content Spa

Thư mục này là project Remotion mà **Tâm (Video Editor)** dùng để xuất video `.mp4`. Mọi thời lượng tính bằng **giây**. Mọi đường dẫn file tính từ thư mục `workspace/` (ví dụ `assets/files/a1b2-logo.png`, `outputs/<task>/images/anh-1.png`). Xem danh sách tư liệu bằng `node scripts/assets.mjs list --task <id>`.

Xuất video: ghi props vào `workspace/outputs/<task>/video/props.json` rồi chạy `node scripts/render-video.mjs <task>`. Kết quả là `workspace/outputs/<task>/video.mp4` và `video-cover.png`.

## Khung `SpaMotion` – motion từ ảnh + chữ
```json
{
  "composition": "SpaMotion",
  "ratio": "9:16",
  "brand": { "name": "Lumière Spa", "primary": "#7A9E7E", "accent": "#C9A96E", "background": "#F5EDE3", "text": "#3B2F2A", "logo": "assets/files/...-logo.png" },
  "music": { "src": "assets/files/...-nhac.mp3", "volume": 0.5 },
  "disclaimer": "Kết quả tùy cơ địa mỗi người",
  "scenes": [
    { "type": "title",   "duration": 2.5, "heading": "Hook 2 giây đầu", "sub": "Dòng phụ", "image": "assets/files/...jpg" },
    { "type": "image",   "duration": 3,   "image": "assets/files/...jpg", "caption": "Chữ trên ảnh", "zoom": "in" },
    { "type": "bullets", "duration": 3.5, "heading": "Bạn sẽ được", "items": ["Ý 1", "Ý 2", "Ý 3"], "image": "(tuỳ chọn)" },
    { "type": "steps",   "duration": 4,   "heading": "Quy trình 3 bước", "steps": ["Bước 1", "Bước 2", "Bước 3"] },
    { "type": "offer",   "duration": 3,   "badge": "ƯU ĐÃI", "heading": "Giảm 30%", "oldPrice": "500.000đ", "price": "350.000đ", "note": "Đến 31/10" },
    { "type": "quote",   "duration": 3,   "text": "Cảm nhận của khách", "author": "Chị H." },
    { "type": "cta",     "duration": 2.5, "heading": "Đặt lịch ngay", "sub": "Inbox để giữ chỗ", "contact": "Hotline 09xx" }
  ]
}
```

## Khung `ClipEdit` – ghép clip quay thật
```json
{
  "composition": "ClipEdit",
  "ratio": "9:16",
  "brand": { "logo": "assets/files/...-logo.png" },
  "music": { "src": "assets/files/...mp3", "volume": 0.4 },
  "disclaimer": "Kết quả tùy cơ địa mỗi người",
  "intro": { "heading": "Hook", "sub": "Dòng phụ", "duration": 2 },
  "clips": [
    { "src": "assets/files/...mp4", "start": 1.5, "end": 5, "caption": "Phụ đề đoạn này" },
    { "src": "assets/files/...mp4", "caption": "Không có end = lấy đến hết clip" }
  ],
  "outro": { "heading": "Hẹn bạn ở Spa", "sub": "", "contact": "Inbox để đặt lịch", "duration": 2.5 }
}
```
- Clip luôn được phủ kín khung (cắt viền nếu khác tỉ lệ). Có nhạc nền thì tiếng gốc của clip tự tắt, trừ khi đặt `"muted": false`.
- `ratio`: `9:16` (TikTok/Reels), `4:5` (feed), `1:1`, `16:9` (YouTube).

## Gợi ý dựng cho ngành spa
- 2 giây đầu phải có hook (chữ to, câu hỏi hoặc nỗi đau). Mỗi cảnh chữ dài 2,5–4 giây, khoảng 1 giây cho mỗi 3–4 từ.
- Chữ trên màn hình ngắn (≤ 8 từ/dòng), nội dung khớp với kịch bản của Vy, và đã được Dr. Linh duyệt.
- Luôn có `disclaimer` khi nói về hiệu quả. Không dùng hình ảnh trước/sau gây hiểu nhầm.
- Video TikTok/Reels nên dài 15–30 giây.

## Composition riêng
Nếu 2 khung trên không đủ, viết component mới ở `src/custom/<task>.tsx` và `export const composition = { id: 'Custom-<task>', component, defaultProps, width, height, fps, durationInFrames }`. File được tự động nhận diện, **không** cần sửa `src/custom/index.tsx`. Sau đó đặt `"composition": "Custom-<task>"` trong props.

Nếu một file custom cũ bị lỗi làm mọi lần xuất video đều hỏng, hãy xoá file đó trong `src/custom/`.

## Xem trước / chỉnh tay
```bash
cd video
npm run studio     # mở Remotion Studio trên trình duyệt
```
