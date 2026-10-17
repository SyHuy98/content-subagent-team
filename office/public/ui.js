import { Office, ORDER, STATE_ICON } from './office.js';
import { portrait, LOOKS } from './sprites.js';

const TEAM = {
  manager:      { name: 'Claude',   role: 'Trưởng nhóm' },
  'chuyen-gia': { name: 'Dr. Linh', role: 'Chuyên gia Da liễu & Thẩm mỹ' },
  'chien-luoc': { name: 'Minh',     role: 'Chiến lược Content & SEO' },
  copywriter:   { name: 'Vy',       role: 'Copywriter' },
  designer:     { name: 'Khoa',     role: 'Designer' },
  boss:         { name: 'Sếp (Bạn)', role: '' },
};
const STATE_LABEL = {
  idle: 'Rảnh', receiving: 'Nhận việc', working: 'Đang làm', consulting: 'Trao đổi', reviewing: 'Đang duyệt',
  delivering: 'Nộp bài', done: 'Hoàn thành', error: 'Gặp lỗi', assign: 'Giao việc',
};
const TASK_LABEL = { queued: 'Đang chờ', in_progress: 'Đang làm', done: 'Hoàn thành', error: 'Lỗi' };
const FILE_LABEL = {
  'final.md': '⭐ Báo cáo tổng', '1-chuyen-gia.md': '🩺 Dr. Linh', '2-chien-luoc.md': '📊 Minh',
  '3-copywriter.md': '✍️ Vy', '4-designer.md': '🎨 Khoa', '5-duyet.md': '✅ Duyệt',
};
const PRESETS = [
  { label: '🎉 Khai trương', title: 'Chiến dịch khai trương spa', type: 'Chiến dịch trọn gói', service: 'Toàn bộ dịch vụ', quantity: '5 bài + 3 quảng cáo', brief: 'Khai trương chi nhánh mới, ưu đãi 50% liệu trình đầu tiên trong 7 ngày, tặng quà cho 100 khách đầu tiên.' },
  { label: '💐 Ưu đãi 20/11', title: 'Ưu đãi tri ân 20/11', type: 'Bài đăng mạng xã hội', service: 'Combo chăm sóc da', quantity: '3 bài', brief: 'Combo chăm sóc da tri ân thầy cô, mua 1 tặng 1 cho người thân. Giọng ấm áp, tinh tế.' },
  { label: '🧴 Trị mụn', title: 'Series kiến thức trị mụn', type: 'Lịch content tháng', service: 'Trị mụn chuẩn y khoa', quantity: '8 bài/tháng', brief: 'Xây dựng niềm tin bằng kiến thức. Khách hàng là sinh viên, nhân viên văn phòng 20–30 tuổi bị mụn nội tiết.' },
  { label: '✨ Triệt lông', title: 'Quảng cáo triệt lông mùa hè', type: 'Quảng cáo Meta (Facebook/Instagram)', service: 'Triệt lông diode laser', quantity: '4 phiên bản A/B', brief: 'Mùa hè, khách nữ 20–35 tuổi. Nhấn mạnh công nghệ, cảm giác dễ chịu, quy trình an toàn. Ưu đãi gói 6 buổi.' },
];

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = (ts) => ts ? new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

const store = { agents: {}, tasks: [], events: [], runner: {} };
const office = new Office($('#canvas'), $('#overlay'), Object.fromEntries(Object.entries(TEAM).map(([k, v]) => [k, v.name])));
let selected = null;

// ---------- Team cards ----------
const teamEl = $('#team');
for (const id of ORDER) {
  const el = document.createElement('div');
  el.className = 'member';
  el.dataset.id = id;
  const pic = portrait(id, 3);
  el.append(pic);
  el.insertAdjacentHTML('beforeend', `<div class="info"><b>${TEAM[id].name}</b><span class="role">${TEAM[id].role}</span><span class="state">Rảnh</span><div class="msg"></div></div>`);
  el.addEventListener('click', () => select(id));
  teamEl.append(el);
}
office.onAgentClick = (id) => id !== 'boss' && select(id);
function select(id) {
  selected = selected === id ? null : id;
  office.setHighlight(selected);
  for (const el of teamEl.children) el.classList.toggle('active', el.dataset.id === selected);
  renderLog();
}

function renderTeam() {
  for (const el of teamEl.children) {
    const a = store.agents[el.dataset.id] || {};
    const st = $('.state', el);
    st.className = `state ${a.state || 'idle'}`;
    st.textContent = `${STATE_ICON[a.state] || ''} ${STATE_LABEL[a.state] || 'Rảnh'}`.trim();
    $('.msg', el).textContent = a.msg || '';
  }
}

// ---------- Log ----------
function renderLog(newCount = 0) {
  const list = (selected ? store.events.filter((e) => e.agent === selected || e.to === selected) : store.events).slice(-120).reverse();
  $('#log').innerHTML = list.map((e, i) => {
    const who = TEAM[e.agent]?.name || e.agent;
    const to = e.to ? ` → ${esc(TEAM[e.to]?.name || e.to)}` : '';
    const color = e.agent === 'boss' ? '#8a6d2f' : LOOKS[e.agent]?.shirt || '#999';
    return `<li class="${i < newCount ? 'new' : ''}"><time>${fmtTime(e.ts)}</time><span class="c" style="background:${color}"></span><span><b>${esc(who)}</b>${to} · ${esc(STATE_LABEL[e.state] || e.state)}${e.msg ? ': ' + esc(e.msg) : ''}</span></li>`;
  }).join('') || '<li class="empty">Chưa có hoạt động nào.</li>';
  $('#logCount').textContent = selected ? `Lọc: ${TEAM[selected].name} (bấm lại để bỏ lọc)` : `${store.events.length} sự kiện`;
}

// ---------- Runner ----------
function renderRunner() {
  const r = store.runner || {};
  const el = $('#runner');
  el.classList.remove('ok', 'busy', 'off');
  const auto = $('#autoRun');
  auto.checked = !!r.autoRun;
  auto.disabled = !r.claudeAvailable;
  if (!r.claudeAvailable) { el.classList.add('off'); $('#runnerText').textContent = 'Chưa thấy Claude Code CLI · chạy /team thủ công'; }
  else if (r.current) { el.classList.add('busy'); $('#runnerText').textContent = `Team đang làm việc${r.queue?.length ? ` · ${r.queue.length} việc chờ` : ''}`; }
  else { el.classList.add('ok'); $('#runnerText').textContent = 'Claude Code sẵn sàng'; }
}
$('#autoRun').addEventListener('change', async (e) => {
  const r = await api('/api/runner', { method: 'POST', body: { autoRun: e.target.checked } });
  store.runner = r; renderRunner();
});

// ---------- Tasks ----------
function renderTasks() {
  const tasks = [...store.tasks].reverse();
  const active = tasks.filter((t) => t.status === 'queued' || t.status === 'in_progress').length;
  $('#taskBadge').textContent = active || '';
  const r = store.runner || {};
  $('#tasks').innerHTML = tasks.map((t) => {
    const running = r.current?.id === t.id;
    const canRun = r.claudeAvailable && !running && t.status !== 'in_progress' && !(r.queue || []).includes(t.id);
    return `<li class="task">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:start">
        <h3>${esc(t.title)}</h3><span class="pill ${t.status}">${TASK_LABEL[t.status] || t.status}</span>
      </div>
      <div class="meta">${esc(t.type || '')}${t.service ? ' · ' + esc(t.service) : ''}${t.channels?.length ? ' · ' + esc(t.channels.join(', ')) : ''}</div>
      <div class="meta">Giao lúc ${fmtDate(t.createdAt)} · cập nhật ${fmtDate(t.updatedAt)}</div>
      <div class="actions">
        ${t.hasFinal || t.status !== 'queued' ? `<button class="btn small" data-act="view" data-id="${t.id}">📄 Xem báo cáo</button>` : ''}
        ${canRun ? `<button class="btn small" data-act="run" data-id="${t.id}">▶️ ${t.status === 'queued' ? 'Chạy team' : 'Chạy lại'}</button>` : ''}
        <button class="btn small" data-act="copy" data-id="${t.id}" title="Dán vào Claude Code">⌨️ /team ${t.id.slice(-3)}</button>
        ${!running ? `<button class="btn small" data-act="del" data-id="${t.id}">🗑️</button>` : ''}
      </div>
    </li>`;
  }).join('') || '<li class="empty">Chưa có công việc. Hãy giao việc ở tab “Giao việc”.</li>';
  renderReportSelect();
}
$('#tasks').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  if (b.dataset.act === 'view') { openReport(id); }
  if (b.dataset.act === 'run') { try { await api(`/api/tasks/${id}/run`, { method: 'POST' }); toast('Đã gọi team vào làm việc!'); } catch (err) { toast(err.message); } }
  if (b.dataset.act === 'copy') { await copy(`/team ${id}`); toast(`Đã copy “/team ${id}”. Dán vào Claude Code để chạy.`); }
  if (b.dataset.act === 'del' && confirm('Xoá công việc này khỏi danh sách? (File báo cáo vẫn được giữ)')) {
    await api(`/api/tasks/${id}`, { method: 'DELETE' }); refresh();
  }
});

// ---------- Reports ----------
let report = { id: null, files: [], current: null };
function renderReportSelect() {
  const sel = $('#reportTask');
  const tasks = [...store.tasks].reverse().filter((t) => t.status !== 'queued' || t.hasFinal);
  const cur = report.id || sel.value;
  sel.innerHTML = tasks.length
    ? tasks.map((t) => `<option value="${t.id}">${t.hasFinal ? '⭐ ' : ''}${esc(t.title)} – ${TASK_LABEL[t.status]}</option>`).join('')
    : '<option value="">Chưa có báo cáo</option>';
  if (cur && tasks.some((t) => t.id === cur)) sel.value = cur;
}
$('#reportTask').addEventListener('change', (e) => e.target.value && openReport(e.target.value, false));

async function openReport(id, switchTab = true) {
  if (switchTab) showTab('reports');
  const data = await api(`/api/outputs/${id}`);
  const prev = report.id === id ? report.current : null;
  report = { id, files: data.files, current: null };
  $('#reportTask').value = id;
  const fileTabs = $('#fileTabs');
  fileTabs.innerHTML = data.files.map((f) => `<button class="file-tab" data-name="${f.name}">${FILE_LABEL[f.name] || f.name}</button>`).join('');
  if (!data.files.length) {
    $('#report').innerHTML = '<p class="muted">Team đang làm việc, chưa có file nào. Báo cáo sẽ tự hiện khi xong.</p>';
    $('#reportActions').hidden = true;
    return;
  }
  showFile(data.files.find((f) => f.name === prev)?.name || data.files[0].name);
}
function showFile(name) {
  const f = report.files.find((x) => x.name === name);
  if (!f) return;
  report.current = name;
  for (const b of $('#fileTabs').children) b.classList.toggle('active', b.dataset.name === name);
  $('#report').innerHTML = markdown(f.content);
  $('#reportActions').hidden = false;
}
$('#fileTabs').addEventListener('click', (e) => { const b = e.target.closest('.file-tab'); if (b) showFile(b.dataset.name); });
$('#copyReport').addEventListener('click', async () => {
  const f = report.files.find((x) => x.name === report.current);
  if (f) { await copy(f.content); toast('Đã copy nội dung!'); }
});
$('#downloadReport').addEventListener('click', () => {
  const f = report.files.find((x) => x.name === report.current);
  if (!f) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([f.content], { type: 'text/markdown' }));
  a.download = `${report.id}-${f.name}`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Assign ----------
const form = $('#taskForm');
$('#presets').innerHTML = PRESETS.map((p, i) => `<button type="button" class="preset" data-i="${i}">${p.label}</button>`).join('');
$('#presets').addEventListener('click', (e) => {
  const b = e.target.closest('.preset');
  if (!b) return;
  const p = PRESETS[b.dataset.i];
  for (const k of ['title', 'type', 'service', 'quantity', 'brief']) form.elements[k].value = p[k];
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  body.channels = [...$('#channels').querySelectorAll('input:checked')].map((i) => i.value);
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const { task, runner } = await api('/api/tasks', { method: 'POST', body });
    form.reset();
    const n = $('#assignNotice');
    n.hidden = false;
    n.innerHTML = runner.claudeAvailable && runner.autoRun
      ? `✅ Đã giao <b>${esc(task.title)}</b>. Claude đang tới nhận việc. Theo dõi ở văn phòng nhé!`
      : `✅ Đã lưu <b>${esc(task.title)}</b>.<br>Để team bắt đầu, mở <b>Claude Code</b> trong thư mục dự án rồi gõ:<br><code>/team ${task.id}</code> <button class="btn small" id="copyCmd">Copy</button>`;
    $('#copyCmd')?.addEventListener('click', () => copy(`/team ${task.id}`).then(() => toast('Đã copy lệnh!')));
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});

// ---------- Brand ----------
async function loadBrand() { $('#brand').value = (await api('/api/brand')).content; }
$('#saveBrand').addEventListener('click', async () => {
  await api('/api/brand', { method: 'PUT', body: { content: $('#brand').value } });
  $('#brandSaved').textContent = `Đã lưu lúc ${fmtTime(new Date().toISOString())}`;
});

// ---------- Tabs ----------
function showTab(name) {
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.tab === name);
  for (const b of document.querySelectorAll('.tab-body')) b.classList.toggle('active', b.id === `tab-${name}`);
  if (name === 'brand') loadBrand();
}
for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => showTab(t.dataset.tab));

// ---------- Live updates ----------
function applySnapshot(s) {
  Object.assign(store, { agents: s.agents, tasks: s.tasks, events: s.events, runner: s.runner });
  office.init(s.agents, s.tasks.filter((t) => t.status === 'done').length);
  renderTeam(); renderLog(); renderTasks(); renderRunner();
}

function connect() {
  const es = new EventSource('/api/events');
  es.addEventListener('snapshot', (m) => applySnapshot(JSON.parse(m.data)));
  es.addEventListener('reset', (m) => applySnapshot(JSON.parse(m.data)));
  es.addEventListener('event', (m) => {
    const ev = JSON.parse(m.data);
    store.events.push(ev);
    if (store.events.length > 300) store.events.splice(0, store.events.length - 300);
    if (store.agents[ev.agent]) Object.assign(store.agents[ev.agent], { state: ev.state, msg: ev.msg || '', task: ev.task, ts: ev.ts });
    office.handle(ev);
    renderTeam(); renderLog(1);
    if (ev.agent === 'manager' && ev.taskStatus === 'done') {
      toast('📄 Claude vừa mang báo cáo tổng tới bàn bạn!', 'Xem ngay', () => openReport(ev.task));
    }
    if (report.id && ev.task === report.id && ev.state === 'delivering') setTimeout(() => openReport(report.id, false), 800);
  });
  es.addEventListener('tasks', (m) => { store.tasks = JSON.parse(m.data); renderTasks(); });
  es.addEventListener('runner', (m) => { store.runner = JSON.parse(m.data); renderRunner(); renderTasks(); });
  es.onerror = () => { $('#runnerText').textContent = 'Mất kết nối server… đang thử lại'; $('#runner').className = 'runner off'; };
}

async function refresh() { applySnapshot(await api('/api/state')); }

// ---------- Helpers ----------
async function api(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
}

let toastTimer;
function toast(msg, action, fn) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  t.hidden = false;
  if (action) t.querySelector('button').onclick = () => { fn(); t.hidden = true; };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), action ? 10000 : 3500);
}

// Markdown tối giản: tiêu đề, đậm/nghiêng, danh sách, bảng, trích dẫn, code.
function markdown(src) {
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^(https?:|\.|\/|#)/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { const n = Math.min(m[1].length, 3); out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
    if (/^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const row = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = row(l); i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`); continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d/.test(l);
      const buf = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        buf.push(lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, '').replace(/^\[( |x)\]\s*/i, (m0, c) => c.trim() ? '☑️ ' : '⬜ '));
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${buf.map((b) => `<li>${inline(b)}</li>`).join('')}</${tag}>`); continue;
    }
    if (!l.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*+]|\d+[.)])\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) buf.push(lines[i++]);
    out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}

connect();
