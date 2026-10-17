// Tab Tư liệu + ô chọn tư liệu đính kèm trong form giao việc.
import { $, esc, fmtSize, fileUrl, api, toast } from './util.js';

const TYPE_LABEL = { image: '🖼️ Ảnh', video: '🎬 Clip', audio: '🎵 Nhạc', other: '📄 File' };
let assets = [];
const picked = new Set();

export function setAssets(list) {
  assets = list || [];
  for (const id of [...picked]) if (!assets.some((a) => a.id === id)) picked.delete(id);
  renderGrid();
  renderPicker();
}

export function pickedAssets() { return [...picked]; }
export function clearPicked() { picked.clear(); renderPicker(); }

function thumb(a, cls = '') {
  const url = fileUrl(a.file);
  if (a.type === 'image') return `<img class="${cls}" src="${url}" alt="" loading="lazy" data-meta="${a.width ? '' : a.id}">`;
  if (a.type === 'video') return `<video class="${cls}" src="${url}#t=0.5" muted preload="metadata" playsinline data-meta="${a.duration ? '' : a.id}"></video>`;
  return `<div class="${cls} thumb-icon">${a.type === 'audio' ? '🎵' : '📄'}</div>`;
}

function renderGrid() {
  const grid = $('#assetGrid');
  if (!grid) return;
  grid.innerHTML = assets.length ? [...assets].reverse().map((a) => `
    <div class="asset" data-id="${a.id}">
      <div class="asset-media">${thumb(a)}</div>
      <div class="asset-body">
        <div class="asset-name" title="${esc(a.name)}">${esc(a.name)}</div>
        <div class="muted">${TYPE_LABEL[a.type] || a.type} · ${fmtSize(a.size)}${a.duration ? ` · ${a.duration}s` : ''}${a.width ? ` · ${a.width}×${a.height}` : ''}</div>
        <input class="asset-desc" placeholder="Mô tả (vd: clip phòng massage đá nóng)" value="${esc(a.desc)}">
        <input class="asset-tags" placeholder="Thẻ, cách nhau dấu phẩy (logo, nhạc…)" value="${esc(a.tags.join(', '))}">
        <button class="btn small asset-del" title="Xoá">🗑️</button>
      </div>
    </div>`).join('') : '<p class="empty">Chưa có tư liệu. Kéo-thả ảnh, clip quay ở spa, logo hoặc nhạc nền vào ô phía trên.</p>';
  watchMeta(grid);
}

/** Đọc kích thước/thời lượng ngay trên trình duyệt rồi lưu lại cho agent dùng. */
function watchMeta(root) {
  for (const el of root.querySelectorAll('[data-meta]:not([data-meta=""])')) {
    const id = el.dataset.meta;
    el.dataset.meta = '';
    const save = (meta) => api(`/api/assets/${id}`, { method: 'PATCH', body: meta }).catch(() => {});
    if (el.tagName === 'IMG') el.addEventListener('load', () => save({ width: el.naturalWidth, height: el.naturalHeight }), { once: true });
    else el.addEventListener('loadedmetadata', () => save({ width: el.videoWidth, height: el.videoHeight, duration: el.duration }), { once: true });
  }
}

function renderPicker() {
  const box = $('#assetPicker');
  if (!box) return;
  const usable = [...assets].reverse().filter((a) => a.type !== 'other');
  box.innerHTML = usable.length
    ? usable.map((a) => `<button type="button" class="pick ${picked.has(a.id) ? 'on' : ''}" data-id="${a.id}" title="${esc(a.desc || a.name)}">${thumb(a, 'pick-thumb')}<span>${esc(a.desc || a.name)}</span></button>`).join('')
    : '<span class="muted">Chưa có tư liệu – tải lên ở tab 📁 Tư liệu.</span>';
  $('#pickCount').textContent = picked.size ? `${picked.size} đã chọn` : '';
}

async function upload(files) {
  const list = $('#uploads');
  for (const file of files) {
    const row = document.createElement('div');
    row.className = 'upload-row';
    row.innerHTML = `<span>${esc(file.name)}</span><progress max="100" value="0"></progress>`;
    list.prepend(row);
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `/api/assets?name=${encodeURIComponent(file.name)}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) row.querySelector('progress').value = (e.loaded / e.total) * 100; };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(JSON.parse(xhr.responseText || '{}').error || `Lỗi ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Mất kết nối'));
        xhr.send(file);
      });
      row.remove();
    } catch (err) {
      row.innerHTML = `<span>⚠️ ${esc(file.name)}: ${esc(err.message)}</span>`;
    }
  }
}

export function initAssets() {
  const drop = $('#dropZone');
  const input = $('#fileInput');
  input.addEventListener('change', () => { upload([...input.files]); input.value = ''; });
  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
  for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); });
  drop.addEventListener('drop', (e) => upload([...e.dataTransfer.files]));

  const grid = $('#assetGrid');
  grid.addEventListener('change', (e) => {
    const card = e.target.closest('.asset');
    if (!card) return;
    const body = e.target.classList.contains('asset-desc') ? { desc: e.target.value } : e.target.classList.contains('asset-tags') ? { tags: e.target.value } : null;
    if (body) api(`/api/assets/${card.dataset.id}`, { method: 'PATCH', body }).then(() => toast('Đã lưu'), (err) => toast(err.message));
  });
  grid.addEventListener('click', async (e) => {
    const del = e.target.closest('.asset-del');
    if (!del) return;
    const card = del.closest('.asset');
    if (confirm('Xoá tư liệu này?')) await api(`/api/assets/${card.dataset.id}`, { method: 'DELETE' }).catch((err) => toast(err.message));
  });

  $('#assetPicker').addEventListener('click', (e) => {
    const b = e.target.closest('.pick');
    if (!b) return;
    if (picked.has(b.dataset.id)) picked.delete(b.dataset.id); else picked.add(b.dataset.id);
    renderPicker();
  });
}
