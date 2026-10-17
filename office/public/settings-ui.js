// Tab Cài đặt: trạng thái Remotion và các connector.
import { $, esc, api, toast, copy } from './util.js';

let config = null;

export function renderSettings(caps) {
  const box = $('#capList');
  if (!box || !caps) return;
  const r = caps.remotion || {};
  const rows = [
    ['🎬 Skill Remotion', !!(r.skill || r.project), r.skill || r.project || (r.dirFound ? `Đã thấy ${r.dir} nhưng chưa nhận diện skill – chạy /setup-team` : `Chưa thấy thư mục ${r.dir || '(chưa đặt)'}`)],
    ['📦 Thư viện dựng video', !!r.videoDeps, r.videoDeps ? 'Đã cài trong video/' : 'Chạy: npm run setup-video'],
    ['📊 Phân tích Ads (An)', caps.ads, caps.ads ? `Tài khoản: ${caps.meta?.adAccountId || 'chưa chọn'}` : 'Chưa có connector Meta Ads'],
    ['🖼️ Tạo ảnh (Khoa)', caps.imageGen, caps.imageGen ? 'Canva/Higgsfield sẵn sàng' : 'Chưa có connector Canva/Higgsfield'],
    ['📤 Đăng bài', caps.publish, caps.publish ? `Page: ${caps.meta?.pageId || '?'} · IG: ${caps.meta?.igAccountId || '?'}` : 'Chưa có connector đăng Facebook/Instagram'],
  ];
  box.innerHTML = rows.map(([name, ok, note]) => `<li class="cap ${ok ? 'ok' : ''}"><span class="cap-mark">${ok ? '✓' : '✗'}</span><b>${name}</b><span class="muted">${esc(note)}</span></li>`).join('');
}

export async function loadSettings() {
  const data = await api('/api/config');
  config = data.config;
  $('#cfgRemotion').value = config.remotionDir || '';
  $('#cfgAdAccount').value = config.meta.adAccountId || '';
  $('#cfgPage').value = config.meta.pageId || '';
  $('#cfgIg').value = config.meta.igAccountId || '';
  renderSettings(data.capabilities);
  return data.capabilities;
}

export function initSettings(onCaps) {
  $('#saveConfig').addEventListener('click', async () => {
    try {
      const data = await api('/api/config', {
        method: 'PUT',
        body: { remotionDir: $('#cfgRemotion').value, meta: { adAccountId: $('#cfgAdAccount').value, pageId: $('#cfgPage').value, igAccountId: $('#cfgIg').value } },
      });
      renderSettings(data.capabilities);
      onCaps?.(data.capabilities);
      toast('Đã lưu cài đặt');
    } catch (err) { toast(err.message); }
  });
  $('#copySetup').addEventListener('click', () => copy('/setup-team').then(() => toast('Đã copy “/setup-team”')));
}
