# 🌿 Văn phòng Content Spa – Team sub agent Claude Code

Một **team AI làm content cho spa và thẩm mỹ viện**, chạy bằng các sub agent của Claude Code. Team viết bài, thiết kế, **dựng video thật bằng Remotion**, **đọc số liệu Meta Ads**, tạo ảnh và **đăng bài sau khi bạn duyệt**.

Đi kèm là một **văn phòng pixel 2D**: bạn giao việc trên web, nhìn các thành viên đi lại, ngồi gõ phím, trao đổi với nhau, rồi Trưởng nhóm Claude mang báo cáo tổng tới bàn của bạn.

![team](https://img.shields.io/badge/team-6%20agent%20%2B%20Tr%C6%B0%E1%BB%9Fng%20nh%C3%B3m-d97757)

## 👥 Thành viên

| | Thành viên | Vai trò | Kết quả |
|---|---|---|---|
| 🧑‍💼 | **Claude** | Trưởng nhóm (Claude chính) | Phân công, theo dõi, tổng hợp `final.md`, đăng bài khi được duyệt |
| 📈 | **An** (`phan-tich`) | Phân tích Ads Meta – **chỉ đọc** | Quảng cáo tốt/kém, góc tiếp cận hiệu quả, khuyến nghị |
| 🩺 | **Dr. Linh** (`chuyen-gia`) | Chuyên gia Da liễu & Thẩm mỹ | Kiến thức liệu trình, FAQ, **duyệt tuân thủ quảng cáo** (cả chữ trong video) |
| 📊 | **Minh** (`chien-luoc`) | Chiến lược Content & SEO | Persona, góc tiếp cận, lịch đăng, hashtag, KPI |
| ✍️ | **Vy** (`copywriter`) | Copywriter | Bài Facebook/IG/Zalo, quảng cáo A/B, **kịch bản video** |
| 🎨 | **Khoa** (`designer`) | Designer | Brief hình ảnh, **storyboard**, prompt AI, **tạo ảnh thật** (Canva/Higgsfield) |
| 🎬 | **Tâm** (`editor`) | Video Editor (Remotion) | **File video `.mp4`** (motion từ ảnh + chữ, hoặc ghép clip thật có phụ đề, logo, nhạc) |

**Quy trình:**
1. Sếp giao việc, Claude nhận việc.
2. **Vòng 1:** An, Linh và Minh làm song song.
3. **Vòng 2:** Vy và Khoa làm song song.
4. **Vòng 2b:** Tâm dựng video.
5. **Vòng 3:** Linh duyệt, Vy và Tâm sửa nếu cần.
6. Claude tổng hợp và báo cáo Sếp.
7. *(Tuỳ chọn)* Sếp bấm **Duyệt & đăng**, Claude đăng bài.

### 🧠 Model của team
- **Claude (Trưởng nhóm):** `claude-opus-5-5`, mức suy luận `high`. Cấu hình trong `.claude/commands/team.md`, trong `dang-bai.md`, và trong server khi tự chạy.
- **6 thành viên:** `claude-sonnet-5-5`, mức suy luận `high`. Cấu hình bằng dòng `model:` / `effort:` trong từng file `.claude/agents/*.md`.

## 🚀 Cài đặt và chạy

Bạn cần **Node.js 18.17+** và **[Claude Code](https://claude.com/claude-code)** đã đăng nhập.

```bash
git clone -b claude/youthful-gates-mtrzz0 https://github.com/SyHuy98/content-subagent-team.git
cd content-subagent-team

# Bước 1 (1 lần): mở Claude Code trong thư mục, chọn "Yes, I trust this folder", rồi chạy:
claude
> /setup-team     # tìm skill Remotion (E:\remotion), cài thư viện video, dò connector Ads/Canva/Higgsfield/đăng bài
> /exit

# Bước 2: mở văn phòng
npm start         # rồi mở http://localhost:3000
```

Văn phòng không cần `npm install`. Chỉ phần dựng video cần cài thư viện, bằng lệnh `npm run setup-video`; `/setup-team` sẽ chạy lệnh này giúp bạn.

### Xem thử ngay (không tốn lượt Claude)
```bash
npm run demo          # khoảng 2 phút, hoặc: npm run demo -- --fast
```

## 🖥️ Cách dùng

1. **🏷️ Hồ sơ:** điền tên spa, dịch vụ, giọng văn, màu thương hiệu và giấy phép.
2. **📁 Tư liệu:** kéo-thả ảnh, clip quay ở spa, logo, nhạc nền. Gắn thẻ `logo` hoặc `nhạc` để team tự dùng cho mọi video.
3. **📝 Giao việc:** điền brief (hoặc bấm mẫu), rồi tuỳ chọn:
   - tick **🎬 Cần video**: chọn thời lượng, khung hình, kiểu video
   - chọn **📎 tư liệu đính kèm**
   - tick **📊 Dùng số liệu Ads**
4. Team bắt đầu theo một trong hai cách:
   - **Tự chạy** (công tắc góc phải trên): server tự gọi `claude -p "/team <id>"`.
   - **Thủ công:** gõ `/team <id>` trong Claude Code.
5. **📄 Báo cáo:** xem báo cáo tổng và từng file của các thành viên, **xem video ngay trên web**, xem ảnh đã tạo, Copy hoặc tải về.
6. **📤 Đăng bài** (trong tab Báo cáo):
   - Bấm **Chuẩn bị đăng**, chọn bài, kênh (Facebook Page / Instagram), ảnh/video và giờ đăng.
   - Xem lại rồi bấm **✅ Duyệt & đăng**. Chỉ lúc đó Claude mới chạy `/dang-bai` để đăng đúng bài đó.
   - Team **không bao giờ tự đăng** trong lúc làm việc.
7. **⚙️ Cài đặt:** xem trạng thái ✓/✗ của Remotion, Ads, tạo ảnh, đăng bài.

## 🎬 Video (Remotion)
- Skill Remotion của bạn (ví dụ `E:\remotion`) được Tâm đọc để áp dụng kinh nghiệm dựng. Khung dựng sẵn nằm trong `video/`; xem định dạng props ở `video/README.md`.
- Tự xuất lại video sau khi sửa chữ trong `workspace/outputs/<id>/video/props.json`:
  ```bash
  node scripts/render-video.mjs <id>
  ```
- Xem trước và chỉnh tay bằng Remotion Studio: `npm run video:studio`.
- Lần xuất đầu tiên, Remotion tự tải trình duyệt headless (khoảng 100MB).

## 🔌 Connector (Meta Ads, Canva, Higgsfield, đăng bài)
Team dùng connector có sẵn trong Claude Code của bạn. Lệnh `/setup-team` dò các connector này và chia thành 3 nhóm quyền:
- **Đọc Ads:** chỉ các công cụ `get_*`/insights. An **không thể** sửa hay bật/tắt quảng cáo.
- **Tạo ảnh:** Canva/Higgsfield, dành cho Khoa.
- **Đăng bài:** **chỉ** được cấp cho lệnh `/dang-bai`, sau khi bạn bấm duyệt.

Cấu hình lưu ở `workspace/config.json` (riêng từng máy, không đưa lên git).

## 📁 Cấu trúc

```
.claude/
  agents/            6 sub agent (phan-tich, chuyen-gia, chien-luoc, copywriter, designer, editor)
  commands/          /team (Trưởng nhóm) · /setup-team (cài đặt) · /dang-bai (đăng bài đã duyệt)
  settings.json      quyền + hook SubagentStart/Stop (tự báo trạng thái)
office/
  server.mjs         server local (SSE, API, tư liệu, chạy Claude Code)
  public/            giao diện + văn phòng pixel (vẽ bằng canvas, không cần ảnh)
video/               project Remotion: SpaMotion, ClipEdit (+ composition riêng)
scripts/
  status.mjs         agent báo trạng thái → văn phòng
  task.mjs           tra cứu task
  assets.mjs         xem kho tư liệu
  config.mjs         xem/sửa cấu hình
  render-video.mjs   xuất video + báo tiến độ
  fetch-file.mjs     tải ảnh do connector tạo về
  publish.mjs        ghi kết quả đăng bài
  hook.mjs, demo.mjs
workspace/
  brand.md           hồ sơ thương hiệu
  assets/            kho tư liệu
  inbox/             task được giao
  outputs/<id>/      kết quả: 0…6-*.md, final.md, images/, video.mp4
  publish/           yêu cầu đăng bài
  state/, logs/      log sự kiện và log chạy tự động
```

## ⚙️ Tuỳ chọn

| Biến môi trường | Ý nghĩa |
|---|---|
| `PORT=3000` | Cổng web |
| `AUTO_RUN=0/1` | Tắt/bật tự chạy team khi giao việc (mặc định bật nếu tìm thấy `claude`) |
| `CLAUDE_MODEL=…` | Model của Trưởng nhóm khi tự chạy (mặc định `claude-opus-5-5`) |
| `CLAUDE_EFFORT=…` | Mức suy luận của Trưởng nhóm khi tự chạy (mặc định `high`) |
| `CLAUDE_BIN=…` | Đường dẫn tới lệnh `claude` |
| `REMOTION_BROWSER_EXECUTABLE=…` | Dùng trình duyệt có sẵn thay vì để Remotion tự tải |

## ❓ Gặp sự cố
- **Nhân vật không di chuyển khi chạy `/team`:** kiểm tra Claude Code có được phép chạy `node scripts/status.mjs` không, và bạn đã "trust" thư mục (bước 1) chưa.
- **Tâm báo "Chưa cài thư viện Remotion":** chạy `npm run setup-video`.
- **Video lỗi khi xuất:** xem `workspace/outputs/<id>/video/render.log`.
- **An không làm việc / Khoa không tạo ảnh:** xem tab ⚙️ Cài đặt, rồi chạy lại `/setup-team` sau khi bật connector trong claude.ai.
- **Đăng bài lỗi:** lý do hiện ngay trong tab Báo cáo. Log nằm ở `workspace/logs/publish-<mã>.log`.
- **Task báo lỗi khi tự chạy:** xem `workspace/logs/<id>.log`.

> ⚠️ Content do AI tạo ra chỉ mang tính tham khảo. Hãy kiểm tra lại thông tin chuyên môn, giá và giấy phép của spa trước khi đăng.
