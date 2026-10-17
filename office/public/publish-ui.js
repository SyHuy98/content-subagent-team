// Ảnh/video kết quả và quy trình đăng bài (Chuẩn bị → Sếp duyệt → Claude đăng).
import { $, esc, fileUrl, fmtDate, fmtSize, api, toast, copy } from './util.js';

const STATUS = {
  pending: '⏳ Chờ Sếp duyệt', approved: '✅ Đã duyệt – đang xếp lượt', publishing: '📤 Đang đăng…',
  published: '🎉 Đã đăng', failed: '⚠️ Lỗi', cancelled: '🚫 Đã huỷ',
};
const CHANNEL = { facebook: 'Facebook Page', instagram: 'Instagram' };

let ctx = { task: null, files: [], media: [], requests: [], caps: {}, assets: [] };

export function renderMedia(media) {
  const box = $('#mediaBox');
  if (!media.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  const videos = media.filter((m) => m.type === 'video');
  const images = media.filter((m) => m.type === 'image');
  box.innerHTML = `
    ${videos.map((v) => `<figure class="media-video"><video src="${fileUrl(v.src)}" controls preload="metadata" playsinline></video>
      <figcaption>🎬 ${esc(v.name)} · ${fmtSize(v.size)} <a class="btn small" href="${fileUrl(v.src)}" download>⬇️ Tải video</a></figcaption></figure>`).join('')}
    ${images.length ? `<div class="media-grid">${images.map((i) => `<a href="${fileUrl(i.src)}" target="_blank" rel="noopener" title="${esc(i.name)}"><img src="${fileUrl(i.src)}" alt="${esc(i.name)}" loading="lazy"></a>`).join('')}</div>` : ''}`;
}

/** Tách các bài đăng từ file của Vy (các khối ### ...) và mục "Content sẵn sàng đăng" của báo cáo tổng. */
function posts(files) {
  const out = [];
  const final = files.find((f) => f.name === 'final.md')?.content || '';
  const sec = /^##\s*\d*\.?\s*Content sẵn sàng đăng[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m.exec(final);
  if (sec) out.push({ title: '⭐ Bản cuối trong báo cáo tổng', text: sec[1].trim() });
  const copyFile = files.find((f) => f.name === '3-copywriter.md')?.content || '';
  for (const block of copyFile.split(/^### /m).slice(1)) {
    const [title, ...rest] = block.split('\n');
    const text = rest.join('\n').replace(/\n-{3,}\s*[\s\S]*$/, '').trim();
    if (text) out.push({ title: `✍️ ${title.trim()}`, text });
  }
  return out;
}

export function renderPublish(next) {
  Object.assign(ctx, next);
  const box = $('#publishBox');
  if (!ctx.task) { box.hidden = true; return; }
  box.hidden = false;
  const reqs = ctx.requests.filter((r) => r.task === ctx.task.id && r.status !== 'cancelled');
  $('#publishList').innerHTML = reqs.map((r) => `
    <li class="pub ${r.status}">
      <div class="pub-head"><b>${CHANNEL[r.channel]}</b><span class="pill ${r.status === 'published' ? 'done' : r.status === 'failed' ? 'error' : r.status === 'pending' ? 'queued' : 'in_progress'}">${STATUS[r.status]}</span></div>
      <div class="pub-text">${esc(r.text.slice(0, 220))}${r.text.length > 220 ? '…' : ''}</div>
      <div class="muted">${r.media.length ? `📎 ${r.media.length} tệp · ` : ''}${r.scheduleAt ? `⏰ Hẹn ${fmtDate(r.scheduleAt)} · ` : ''}tạo ${fmtDate(r.createdAt)}</div>
      ${r.result?.url ? `<a href="${esc(r.result.url)}" target="_blank" rel="noopener">🔗 Xem bài đã đăng</a>` : ''}
      ${r.result?.error ? `<div class="pub-error">${esc(r.result.error)}</div>` : ''}
      <div class="actions">
        ${['pending', 'failed'].includes(r.status) ? `<button class="btn small primary" data-pub="approve" data-id="${r.id}">✅ Duyệt & đăng</button><button class="btn small" data-pub="cancel" data-id="${r.id}">Huỷ</button>` : ''}
      </div>
    </li>`).join('') || '<li class="muted">Chưa có yêu cầu đăng nào cho việc này.</li>';
  $('#publishHint').textContent = ctx.caps.publish ? '' : 'Chưa có kết nối đăng bài – bạn vẫn tạo yêu cầu được, nhưng cần chạy /setup-team trước khi duyệt.';
}

function openForm() {
  const form = $('#publishForm');
  const list = posts(ctx.files);
  const media = [
    ...ctx.media.map((m) => ({ src: m.src, label: `${m.type === 'video' ? '🎬' : '🖼️'} ${m.name}` })),
    ...ctx.assets.filter((a) => ['image', 'video'].includes(a.type) && (ctx.task.attachments || []).includes(a.id))
      .map((a) => ({ src: a.file, label: `📁 ${a.desc || a.name}` })),
  ];
  form.hidden = false;
  form.innerHTML = `
    <label>Chọn bài
      <select id="pubPost">${list.map((p, i) => `<option value="${i}">${esc(p.title)}</option>`).join('')}<option value="">✏️ Tự viết</option></select>
    </label>
    <label>Nội dung sẽ đăng (sửa được)
      <textarea id="pubText" rows="8">${esc(list[0]?.text || '')}</textarea>
    </label>
    <fieldset><legend>Kênh</legend><div class="chips">
      <label><input type="radio" name="pubChannel" value="facebook" checked><span>Facebook Page</span></label>
      <label><input type="radio" name="pubChannel" value="instagram"><span>Instagram</span></label>
    </div></fieldset>
    <fieldset><legend>Ảnh / video kèm theo</legend><div class="chips">
      ${media.map((m) => `<label><input type="checkbox" value="${esc(m.src)}"><span>${esc(m.label)}</span></label>`).join('') || '<span class="muted">Không có ảnh/video nào.</span>'}
    </div></fieldset>
    <label>Hẹn giờ đăng (bỏ trống = đăng ngay khi duyệt)
      <input type="datetime-local" id="pubAt">
    </label>
    <div class="actions"><button class="btn primary" type="button" id="pubCreate">Tạo yêu cầu đăng</button><button class="btn" type="button" id="pubClose">Đóng</button></div>`;
  $('#pubPost').addEventListener('change', (e) => { const p = list[e.target.value]; $('#pubText').value = p ? p.text : ''; });
  $('#pubClose').addEventListener('click', () => { form.hidden = true; });
  $('#pubCreate').addEventListener('click', async () => {
    try {
      await api('/api/publish', {
        method: 'POST',
        body: {
          task: ctx.task.id,
          text: $('#pubText').value,
          channel: form.querySelector('input[name=pubChannel]:checked').value,
          media: [...form.querySelectorAll('.chips input[type=checkbox]:checked')].map((i) => i.value),
          scheduleAt: $('#pubAt').value ? new Date($('#pubAt').value).toISOString() : null,
        },
      });
      form.hidden = true;
      toast('Đã tạo yêu cầu – xem lại rồi bấm “Duyệt & đăng”.');
    } catch (err) { toast(err.message); }
  });
}

export function initPublish() {
  $('#publishOpen').addEventListener('click', openForm);
  $('#publishList').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-pub]');
    if (!b) return;
    try {
      if (b.dataset.pub === 'approve') {
        if (!confirm('Duyệt và đăng bài này lên mạng xã hội?')) return;
        const r = await api(`/api/publish/${b.dataset.id}/approve`, { method: 'POST' });
        if (r.manual) { await copy(r.manual); toast(`Đã duyệt. Dán “${r.manual}” vào Claude Code để đăng (đã copy).`); }
        else toast('Đã duyệt – Claude sẽ đăng bài ngay.');
      } else if (b.dataset.pub === 'cancel') {
        await api(`/api/publish/${b.dataset.id}`, { method: 'DELETE' });
      }
    } catch (err) { toast(err.message); }
  });
}
