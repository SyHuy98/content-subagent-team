# 🌿 Văn phòng Content Spa – Team 4 sub agent Claude Code

Một **team AI làm content cho spa và thẩm mỹ viện**, chạy bằng các sub agent của Claude Code. Đi kèm là một **văn phòng pixel 2D**: bạn giao việc trên web, nhìn các thành viên đi lại, ngồi gõ phím, trao đổi với nhau, rồi Trưởng nhóm Claude mang báo cáo tổng tới bàn của bạn.

![team](https://img.shields.io/badge/team-4%20agent%20%2B%20Tr%C6%B0%E1%BB%9Fng%20nh%C3%B3m-d97757)

## 👥 Thành viên

| | Thành viên | Vai trò | Kết quả |
|---|---|---|---|
| 🧑‍💼 | **Claude** | Trưởng nhóm (Claude chính) | Phân công, theo dõi, tổng hợp `final.md` |
| 🩺 | **Dr. Linh** (`chuyen-gia`) | Chuyên gia Da liễu & Thẩm mỹ | Kiến thức liệu trình, FAQ, **duyệt tuân thủ quảng cáo** |
| 📊 | **Minh** (`chien-luoc`) | Chiến lược Content & SEO | Persona, góc tiếp cận, lịch đăng, hashtag, KPI |
| ✍️ | **Vy** (`copywriter`) | Copywriter | Bài Facebook/IG/Zalo, quảng cáo Meta A/B |
| 🎨 | **Khoa** (`designer`) | Designer | Brief hình ảnh, bảng màu, carousel, prompt AI |

**Quy trình:** Sếp giao việc → Claude nhận việc → **Vòng 1** (Linh và Minh làm song song) → **Vòng 2** (Vy và Khoa làm song song) → **Vòng 3** (Linh duyệt, Vy sửa nếu cần) → Claude tổng hợp và báo cáo Sếp.

## 🚀 Cài đặt và chạy

Bạn cần **Node.js 18.17+** và **[Claude Code](https://claude.com/claude-code)** đã đăng nhập.

```bash
git clone <repo này>
cd content-subagent-team

# Bước 1 (chỉ làm 1 lần): mở Claude Code trong thư mục để "trust" dự án
claude          # chọn "Yes, I trust this folder", rồi thoát bằng /exit

# Bước 2: mở văn phòng
npm start       # rồi mở http://localhost:3000
```

Không cần `npm install`, vì dự án không dùng thư viện ngoài.

### Xem thử ngay (không tốn lượt Claude)
Mở thêm một cửa sổ terminal và chạy:
```bash
npm run demo          # khoảng 2 phút, hoặc: npm run demo -- --fast
```

## 🖥️ Cách dùng

1. Vào tab **🏷️ Hồ sơ Spa** để điền tên spa, dịch vụ, giọng văn, màu thương hiệu và giấy phép. Cả team đọc hồ sơ này trước mỗi việc.
2. Vào tab **📝 Giao việc** để điền brief (hoặc bấm mẫu có sẵn), rồi bấm **Giao việc cho team**.
3. Team bắt đầu làm việc theo một trong hai cách:
   - **Tự chạy** (công tắc ở góc phải trên): server tự gọi `claude -p "/team <id>"` chạy nền.
   - **Thủ công:** mở Claude Code trong thư mục dự án và gõ `/team <id>`, hoặc chỉ `/team` để lấy việc đang chờ lâu nhất. Văn phòng vẫn cập nhật trực tiếp.
4. Theo dõi văn phòng: bấm vào một nhân vật để lọc nhật ký theo người đó.
5. Khi Claude mang báo cáo tới bàn bạn, mở tab **📄 Báo cáo** để xem `⭐ Báo cáo tổng` và từng file của các thành viên. Bạn có thể Copy hoặc tải file `.md`.

## 📁 Cấu trúc

```
.claude/
  agents/          4 sub agent (chuyen-gia, chien-luoc, copywriter, designer)
  commands/team.md lệnh /team – kịch bản của Trưởng nhóm
  settings.json    quyền + hook SubagentStart/Stop (tự báo trạng thái)
office/
  server.mjs       server local (SSE, API, chạy Claude Code)
  public/          giao diện + văn phòng pixel (vẽ bằng canvas, không cần ảnh)
scripts/
  status.mjs       agent báo trạng thái → văn phòng
  task.mjs         tra cứu task (next/show/list)
  hook.mjs         hook Claude Code
  demo.mjs         phát lại lượt làm việc mẫu
workspace/
  brand.md         hồ sơ thương hiệu
  inbox/           task được giao
  outputs/<id>/    kết quả từng thành viên + final.md
  state/           log sự kiện (events.jsonl)
  logs/            log khi chạy tự động
```

## ⚙️ Tuỳ chọn

| Biến môi trường | Ý nghĩa |
|---|---|
| `PORT=3000` | Cổng web |
| `AUTO_RUN=0/1` | Tắt/bật tự chạy team khi giao việc (mặc định bật nếu tìm thấy `claude`) |
| `CLAUDE_MODEL=…` | Chọn model cho lượt chạy tự động |
| `CLAUDE_BIN=…` | Đường dẫn tới lệnh `claude` |

## ❓ Gặp sự cố
- **Nhân vật không di chuyển khi chạy `/team`:** hãy kiểm tra Claude Code có được phép chạy `node scripts/status.mjs` không. Nếu bạn chưa "trust" thư mục (bước 1), Claude Code sẽ hỏi quyền mỗi lần.
- **Task báo lỗi khi tự chạy:** xem `workspace/logs/<id>.log`.
- **Muốn đổi tính cách hay kỹ năng thành viên:** sửa các file trong `.claude/agents/`.

> ⚠️ Content do AI tạo ra chỉ mang tính tham khảo. Hãy kiểm tra lại thông tin chuyên môn, giá và giấy phép của spa trước khi đăng.
