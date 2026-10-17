import { Office, ORDER, STATE_ICON } from './office.js';
import { portrait, LOOKS } from './sprites.js';
import { $, $$, esc, fmtTime, fmtDate, api, copy, toast } from './util.js';
import { markdown } from './markdown.js';
import { initAssets, setAssets, pickedAssets, clearPicked } from './assets-ui.js';
import { initSettings, renderSettings, loadSettings } from './settings-ui.js';
import { initPublish, renderPublish, renderMedia } from './publish-ui.js';

const TEAM = {
  manager:      { name: 'Claude',   role: 'Trưởng nhóm' },
  'chuyen-gia': { name: 'Dr. Linh', role: 'Chuyên gia Da liễu & Thẩm mỹ' },
  'chien-luoc': { name: 'Minh',     role: 'Chiến lược Content & SEO' },
  copywriter:   { name: 'Vy',       role: 'Copywriter' },
  designer:     { name: 'Khoa',     role: 'Designer' },
  editor:       { name: 'Tâm',      role: 'Video Editor (Remotion)' },
  'phan-tich':  { name: 'An',       role: 'Phân tích Ads (Meta)' },
  boss:         { name: 'Sếp (Bạn)', role: '' },
};
const STATE_LABEL = {
  idle: 'Rảnh', receiving: 'Nhận việc', working: 'Đang làm', consulting: 'Trao đổi', reviewing: 'Đang duyệt',
  rendering: 'Xuất video', publishing: 'Đăng bài', delivering: 'Nộp bài', done: 'Hoàn thành', error: 'Gặp lỗi', assign: 'Giao việc',
};
const TASK_LABEL = { queued: 'Đang chờ', in_progress: 'Đang làm', done: 'Hoàn thành', error: 'Lỗi' };
const FILE_LABEL = {
  'final.md': '⭐ Báo cáo tổng', '0-phan-tich.md': '📈 An', '1-chuyen-gia.md': '🩺 Dr. Linh', '2-chien-luoc.md': '📊 Minh',
  '3-copywriter.md': '✍️ Vy', '4-designer.md': '🎨 Khoa', '5-duyet.md': '✅ Duyệt', '6-editor.md': '🎬 Tâm',
};
const PRESETS = [
  { label: '🎉 Khai trương', title: 'Chiến dịch khai trương spa', type: 'Chiến dịch trọn gói', service: 'Toàn bộ dịch vụ', quantity: '5 bài + 3 quảng cáo + 1 video', brief: 'Khai trương chi nhánh mới, ưu đãi 50% liệu trình đầu tiên trong 7 ngày, tặng quà cho 100 khách đầu tiên.', video: true },
  { label: '💐 Ưu đãi 20/11', title: 'Ưu đãi tri ân 20/11', type: 'Bài đăng mạng xã hội', service: 'Combo chăm sóc da', quantity: '3 bài', brief: 'Combo chăm sóc da tri ân thầy cô, mua 1 tặng 1 cho người thân. Giọng ấm áp, tinh tế.' },
  { label: '🧴 Trị mụn', title: 'Series kiến thức trị mụn', type: 'Lịch content tháng', service: 'Trị mụn chuẩn y khoa', quantity: '8 bài/tháng', brief: 'Xây dựng niềm tin bằng kiến thức. Khách hàng là sinh viên, nhân viên văn phòng 20–30 tuổi bị mụn nội tiết.' },
  { label: '🎬 Video TikTok', title: 'Video TikTok giới thiệu massage đá nóng', type: 'Video ngắn TikTok/Reels', service: 'Massage body đá nóng', quantity: '1 video 20 giây + caption', brief: 'Video dọc 9:16 cho TikTok và Reels: hook 2 giây đầu, quy trình 3 bước, ưu đãi và CTA đặt lịch. Dùng clip quay thật nếu có.', video: true },
  { label: '✨ Triệt lông', title: 'Quảng cáo triệt lông mùa hè', type: 'Quảng cáo Meta (Facebook/Instagram)', service: 'Triệt lông diode laser', quantity: '4 phiên bản A/B', brief: 'Mùa hè, khách nữ 20–35 tuổi. Nhấn mạnh công nghệ, cảm giác dễ chịu, quy trình an toàn. Ưu đãi gói 6 buổi.' },
];

const store = { agents: {}, tasks: [], events: [], runner: {}, capabilities: {}, assets: [], publish: [] };
const office = new Office($('#canvas'), $('#overlay'), Object.fromEntries(Object.entries(TEAM).map(([k, v]) => [k, v.name])));
let selected = null;

// ---------- Team cards ----------
const teamEl = $('#team');
for (const id of ORDER) {
  const el = document.createElement('div');
  el.className = 'member';
  el.dataset.id = id;
  el.append(portrait(id, 3));
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
  const caps = store.capabilities || {};
  for (const el of teamEl.children) {
    const id = el.dataset.id;
    const a = store.agents[id] || {};
    const st = $('.state', el);
    st.className = `state ${a.state || 'idle'}`;
    const pct = a.state === 'rendering' && a.progress != null ? ` ${a.progress}%` : '';
    st.textContent = `${STATE_ICON[a.state] || ''} ${STATE_LABEL[a.state] || 'Rảnh'}${pct}`.trim();
    const off = (id === 'phan-tich' && !caps.ads) || (id === 'editor' && !caps.video);
    el.classList.toggle('offline', !!off && (!a.state || a.state === 'idle'));
    $('.msg', el).textContent = a.msg || (off ? (id === 'editor' ? 'Chưa cài Remotion – xem ⚙️ Cài đặt' : 'Chưa kết nối Meta Ads – xem ⚙️ Cài đặt') : '');
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
  else if (r.current) {
    el.classList.add('busy');
    $('#runnerText').textContent = `${r.current.kind === 'publish' ? 'Đang đăng bài' : 'Team đang làm việc'}${r.queue?.length ? ` · ${r.queue.length} việc chờ` : ''}`;
  } else { el.classList.add('ok'); $('#runnerText').textContent = 'Claude Code sẵn sàng'; }
}
$('#autoRun').addEventListener('change', async (e) => {
  store.runner = await api('/api/runner', { method: 'POST', body: { autoRun: e.target.checked } });
  renderRunner();
});

// ---------- Tasks ----------
function renderTasks() {
  const tasks = [...store.tasks].reverse();
  const active = tasks.filter((t) => t.status === 'queued' || t.status === 'in_progress').length;
  $('#taskBadge').textContent = active || '';
  const r = store.runner || {};
  const isTeam = (j, id) => j?.kind === 'team' && j.id === id;
  $('#tasks').innerHTML = tasks.map((t) => {
    const running = isTeam(r.current, t.id);
    const canRun = r.claudeAvailable && !running && t.status !== 'in_progress' && !(r.queue || []).some((j) => isTeam(j, t.id));
    const extras = [t.video?.enabled ? `🎬 Video ${t.video.duration}s ${t.video.ratio}` : '', t.attachments?.length ? `📎 ${t.attachments.length} tư liệu` : ''].filter(Boolean).join(' · ');
    return `<li class="task">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:start">
        <h3>${esc(t.title)}</h3><span class="pill ${t.status}">${TASK_LABEL[t.status] || t.status}</span>
      </div>
      <div class="meta">${esc(t.type || '')}${t.service ? ' · ' + esc(t.service) : ''}${t.channels?.length ? ' · ' + esc(t.channels.join(', ')) : ''}</div>
      ${extras ? `<div class="meta">${extras}</div>` : ''}
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
  if (b.dataset.act === 'view') openReport(id);
  if (b.dataset.act === 'run') { try { await api(`/api/tasks/${id}/run`, { method: 'POST' }); toast('Đã gọi team vào làm việc!'); } catch (err) { toast(err.message); } }
  if (b.dataset.act === 'copy') { await copy(`/team ${id}`); toast(`Đã copy “/team ${id}”. Dán vào Claude Code để chạy.`); }
  if (b.dataset.act === 'del' && confirm('Xoá công việc này khỏi danh sách? (File báo cáo vẫn được giữ)')) {
    await api(`/api/tasks/${id}`, { method: 'DELETE' }); refresh();
  }
});

// ---------- Reports ----------
let report = { id: null, files: [], media: [], current: null };
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
  report = { id, files: data.files, media: data.media, task: data.task, current: null };
  $('#reportTask').value = id;
  $('#fileTabs').innerHTML = data.files.map((f) => `<button class="file-tab" data-name="${f.name}">${FILE_LABEL[f.name] || f.name}</button>`).join('');
  renderMedia(data.media);
  renderPublish({ task: data.task, files: data.files, media: data.media, requests: store.publish, caps: store.capabilities, assets: store.assets });
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
  form.elements.videoEnabled.checked = !!p.video;
  syncVideoFields();
});
function syncVideoFields() { $('#videoFields').hidden = !form.elements.videoEnabled.checked; }
form.elements.videoEnabled.addEventListener('change', syncVideoFields);

function renderAssignCaps() {
  const caps = store.capabilities || {};
  form.elements.useAds.disabled = !caps.ads;
  $('#adsHint').textContent = caps.ads ? '' : '(chưa kết nối Meta Ads)';
  $('#videoHint').textContent = caps.video ? '' : '⚠️ Chưa cài Remotion – Tâm sẽ chỉ chuẩn bị kịch bản & props, chưa xuất được file video. Xem tab ⚙️ Cài đặt.';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = form.elements;
  const body = {
    title: f.title.value, type: f.type.value, service: f.service.value, quantity: f.quantity.value, deadline: f.deadline.value, brief: f.brief.value,
    channels: $$('#channels input:checked').map((i) => i.value),
    attachments: pickedAssets(),
    video: { enabled: f.videoEnabled.checked, duration: f.videoDuration.value, ratio: f.videoRatio.value, style: f.videoStyle.value },
    useAds: f.useAds.checked,
  };
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const { task, runner } = await api('/api/tasks', { method: 'POST', body });
    form.reset();
    clearPicked();
    syncVideoFields();
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
  for (const t of $$('.tab')) t.classList.toggle('active', t.dataset.tab === name);
  for (const b of $$('.tab-body')) b.classList.toggle('active', b.id === `tab-${name}`);
  if (name === 'brand') loadBrand();
  if (name === 'settings') loadSettings().then(setCaps).catch(() => {});
}
for (const t of $$('.tab')) t.addEventListener('click', () => showTab(t.dataset.tab));

function setCaps(caps) {
  store.capabilities = caps;
  renderSettings(caps);
  renderAssignCaps();
  renderTeam();
}

initAssets();
initSettings(setCaps);
initPublish();

// ---------- Live updates ----------
function applySnapshot(s) {
  Object.assign(store, s);
  office.init(s.agents, s.tasks.filter((t) => t.status === 'done').length);
  setAssets(s.assets);
  setCaps(s.capabilities);
  renderLog(); renderTasks(); renderRunner();
}

function connect() {
  const es = new EventSource('/api/events');
  es.addEventListener('snapshot', (m) => applySnapshot(JSON.parse(m.data)));
  es.addEventListener('reset', (m) => applySnapshot(JSON.parse(m.data)));
  es.addEventListener('event', (m) => {
    const ev = JSON.parse(m.data);
    store.events.push(ev);
    if (store.events.length > 300) store.events.splice(0, store.events.length - 300);
    if (store.agents[ev.agent]) Object.assign(store.agents[ev.agent], { state: ev.state, msg: ev.msg || '', task: ev.task, progress: ev.progress ?? null, ts: ev.ts });
    office.handle(ev);
    renderTeam(); renderLog(1);
    if (ev.agent === 'manager' && ev.taskStatus === 'done') {
      toast('📄 Claude vừa mang báo cáo tổng tới bàn bạn!', 'Xem ngay', () => openReport(ev.task));
    }
    if (report.id && ev.task === report.id && ev.state === 'delivering') setTimeout(() => openReport(report.id, false), 800);
  });
  es.addEventListener('tasks', (m) => { store.tasks = JSON.parse(m.data); renderTasks(); });
  es.addEventListener('runner', (m) => { store.runner = JSON.parse(m.data); renderRunner(); renderTasks(); });
  es.addEventListener('assets', (m) => { store.assets = JSON.parse(m.data); setAssets(store.assets); });
  es.addEventListener('capabilities', (m) => setCaps(JSON.parse(m.data)));
  es.addEventListener('publish', (m) => {
    const prev = new Map(store.publish.map((r) => [r.id, r.status]));
    store.publish = JSON.parse(m.data);
    for (const r of store.publish) {
      if (r.status === 'published' && prev.get(r.id) !== 'published') toast('🎉 Bài đã được đăng!', r.result?.url ? 'Mở bài' : null, () => window.open(r.result.url, '_blank'));
      if (r.status === 'failed' && prev.get(r.id) !== 'failed') toast(`⚠️ Đăng bài lỗi: ${r.result?.error || ''}`);
    }
    if (report.id) renderPublish({ requests: store.publish, caps: store.capabilities, assets: store.assets });
  });
  es.onerror = () => { $('#runnerText').textContent = 'Mất kết nối server… đang thử lại'; $('#runner').className = 'runner off'; };
}

async function refresh() { applySnapshot(await api('/api/state')); }

connect();
