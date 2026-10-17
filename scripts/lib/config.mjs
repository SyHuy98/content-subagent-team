// Cấu hình riêng của từng máy (workspace/config.json – không đưa lên git):
// đường dẫn Remotion và tên các công cụ MCP (connector) mà team được phép dùng.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WS, VIDEO_DIR, readJson, writeJson } from './store.mjs';

export const CONFIG_FILE = path.join(WS, 'config.json');
export const LOCAL_SETTINGS = path.join(ROOT, '.claude', 'settings.local.json');

// metaAdsRead: chỉ công cụ ĐỌC số liệu quảng cáo.
// imageGen: công cụ tạo/xuất ảnh (Canva, Higgsfield…).
// publish: công cụ đăng bài – chỉ được cấp cho lệnh /dang-bai sau khi Sếp duyệt.
export const TOOL_GROUPS = ['metaAdsRead', 'imageGen', 'publish'];

export const DEFAULT_CONFIG = {
  remotionDir: process.platform === 'win32' ? 'E:\\remotion' : '',
  remotionSkill: '',
  remotionProject: '',
  tools: { metaAdsRead: [], imageGen: [], publish: [] },
  meta: { adAccountId: '', pageId: '', igAccountId: '' },
};

export function loadConfig() {
  const c = readJson(CONFIG_FILE, {});
  return {
    ...DEFAULT_CONFIG,
    ...c,
    tools: { ...DEFAULT_CONFIG.tools, ...(c.tools || {}) },
    meta: { ...DEFAULT_CONFIG.meta, ...(c.meta || {}) },
  };
}

export function saveConfig(c) {
  writeJson(CONFIG_FILE, c);
}

export function videoDepsInstalled() {
  return fs.existsSync(path.join(VIDEO_DIR, 'node_modules', '@remotion', 'cli'));
}

/** Tóm tắt khả năng hiện có – dùng cho web, /team và các agent. */
export function capabilities(c = loadConfig()) {
  const exists = (p) => !!p && fs.existsSync(p);
  return {
    remotion: {
      dir: c.remotionDir,
      dirFound: exists(c.remotionDir),
      skill: exists(c.remotionSkill) ? c.remotionSkill : '',
      project: exists(c.remotionProject) ? c.remotionProject : '',
      videoDeps: videoDepsInstalled(),
    },
    video: videoDepsInstalled() || exists(c.remotionProject),
    ads: c.tools.metaAdsRead.length > 0,
    imageGen: c.tools.imageGen.length > 0,
    publish: c.tools.publish.length > 0,
    meta: c.meta,
  };
}

/** Quyền dùng cho lượt chạy team (không bao giờ gồm công cụ đăng bài). */
export function teamAllowedTools(c = loadConfig()) {
  return [...c.tools.metaAdsRead, ...c.tools.imageGen];
}

/** Thư mục ngoài dự án mà agent cần đọc (skill/project Remotion). */
export function extraDirs(c = loadConfig()) {
  const dirs = new Set();
  for (const p of [c.remotionDir, c.remotionSkill && path.dirname(c.remotionSkill), c.remotionProject]) {
    if (p && fs.existsSync(p) && !path.resolve(p).startsWith(ROOT)) dirs.add(path.resolve(p));
  }
  return [...dirs];
}
