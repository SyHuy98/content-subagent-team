// Yêu cầu đăng bài: chỉ được đăng sau khi Sếp bấm "Duyệt & đăng" trên web.
import fs from 'node:fs';
import path from 'node:path';
import { PUBLISH, readJson, writeJson, safeId } from './store.mjs';

export const CHANNELS = ['facebook', 'instagram'];
export const PUBLISH_STATUSES = ['pending', 'approved', 'publishing', 'published', 'failed', 'cancelled'];

const file = (id) => path.join(PUBLISH, `${safeId(id)}.json`);

export function readRequest(id) {
  return readJson(file(id), null);
}

export function saveRequest(req) {
  req.updatedAt = new Date().toISOString();
  writeJson(file(req.id), req);
  return req;
}

export function listRequests(task) {
  if (!fs.existsSync(PUBLISH)) return [];
  return fs.readdirSync(PUBLISH)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(PUBLISH, f), null))
    .filter((r) => r && (!task || r.task === task))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function newRequestId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
