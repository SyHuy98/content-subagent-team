// Kho tư liệu: ảnh, clip, nhạc, logo do Sếp tải lên cho cả team dùng.
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { WS, ASSET_FILES, ASSET_INDEX, ensureDirs, listAssets, writeJson } from './store.mjs';

export const MAX_UPLOAD = 500 * 1024 * 1024;

const TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
  video: ['.mp4', '.mov', '.webm', '.m4v', '.mkv'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.ogg'],
};

export function assetType(name) {
  const ext = path.extname(name).toLowerCase();
  return Object.keys(TYPES).find((t) => TYPES[t].includes(ext)) || 'other';
}

export function safeFileName(name) {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path.basename(name, path.extname(name))
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  return base + ext;
}

/** Đường dẫn tương đối so với workspace/ (dùng cho Remotion staticFile và URL /files/). */
export function wsRel(abs) {
  return path.relative(WS, abs).split(path.sep).join('/');
}

export async function saveUpload(stream, originalName, meta = {}) {
  ensureDirs();
  const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const file = path.join(ASSET_FILES, `${id}-${safeFileName(originalName)}`);
  let size = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (size > MAX_UPLOAD) cb(new Error('File quá lớn (tối đa 500MB)'));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(stream, limiter, fs.createWriteStream(file));
  } catch (err) {
    fs.rmSync(file, { force: true });
    throw err;
  }
  const asset = {
    id,
    name: String(originalName).slice(0, 200),
    file: wsRel(file),
    type: assetType(originalName),
    size,
    desc: String(meta.desc || '').slice(0, 500),
    tags: parseTags(meta.tags),
    createdAt: new Date().toISOString(),
  };
  writeJson(ASSET_INDEX, [...listAssets(), asset]);
  return asset;
}

export function parseTags(tags) {
  const arr = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(arr.map((t) => String(t).trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
}

export function updateAsset(id, patch) {
  const list = listAssets();
  const a = list.find((x) => x.id === id);
  if (!a) return null;
  if (patch.desc !== undefined) a.desc = String(patch.desc).slice(0, 500);
  if (patch.tags !== undefined) a.tags = parseTags(patch.tags);
  for (const k of ['width', 'height', 'duration']) {
    if (patch[k] !== undefined && Number.isFinite(Number(patch[k]))) a[k] = Math.round(Number(patch[k]) * 100) / 100;
  }
  writeJson(ASSET_INDEX, list);
  return a;
}

export function removeAsset(id) {
  const list = listAssets();
  const a = list.find((x) => x.id === id);
  if (!a) return false;
  fs.rmSync(path.join(WS, a.file), { force: true });
  writeJson(ASSET_INDEX, list.filter((x) => x.id !== id));
  return true;
}
