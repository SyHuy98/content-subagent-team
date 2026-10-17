#!/usr/bin/env node
// Xem và sửa cấu hình team (workspace/config.json).
//   node scripts/config.mjs show                       -> cấu hình + khả năng hiện có
//   node scripts/config.mjs set <khoá> <giá trị>        -> vd: set remotionDir "E:\remotion", set meta.pageId 123
//   node scripts/config.mjs set-tools <nhóm> <tool...>  -> nhóm: metaAdsRead | imageGen | publish (không truyền tool = xoá nhóm)
//   node scripts/config.mjs write-local-settings       -> ghi .claude/settings.local.json cho phiên Claude Code tương tác
import { loadConfig, saveConfig, capabilities, teamAllowedTools, extraDirs, TOOL_GROUPS, LOCAL_SETTINGS } from './lib/config.mjs';
import { readJson, writeJson } from './lib/store.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const c = loadConfig();

function fail(msg) { console.error(`config.mjs: ${msg}`); process.exit(1); }

if (cmd === 'show') {
  console.log(JSON.stringify({ config: c, capabilities: capabilities(c) }, null, 2));
} else if (cmd === 'set') {
  const [key, ...val] = rest;
  const allowed = ['remotionDir', 'remotionSkill', 'remotionProject', 'meta.adAccountId', 'meta.pageId', 'meta.igAccountId'];
  if (!allowed.includes(key)) fail(`khoá không hợp lệ "${key}". Chọn: ${allowed.join(', ')}`);
  const value = val.join(' ');
  if (key.startsWith('meta.')) c.meta[key.slice(5)] = value; else c[key] = value;
  saveConfig(c);
  console.log(`✓ ${key} = ${value}`);
} else if (cmd === 'set-tools') {
  const [group, ...tools] = rest;
  if (!TOOL_GROUPS.includes(group)) fail(`nhóm không hợp lệ "${group}". Chọn: ${TOOL_GROUPS.join(', ')}`);
  const bad = tools.filter((t) => !/^mcp__[\w.-]+(__[\w.-]+)?$/.test(t));
  if (bad.length) fail(`tên công cụ MCP không hợp lệ: ${bad.join(', ')}`);
  c.tools[group] = [...new Set(tools)];
  saveConfig(c);
  console.log(`✓ ${group}: ${c.tools[group].length} công cụ`);
} else if (cmd === 'write-local-settings') {
  const s = readJson(LOCAL_SETTINGS, {});
  s.permissions ||= {};
  const allow = new Set((s.permissions.allow || []).filter((r) => !r.startsWith('mcp__')));
  for (const t of teamAllowedTools(c)) allow.add(t);
  s.permissions.allow = [...allow];
  const dirs = new Set(s.permissions.additionalDirectories || []);
  for (const d of extraDirs(c)) dirs.add(d);
  s.permissions.additionalDirectories = [...dirs];
  writeJson(LOCAL_SETTINGS, s);
  console.log(`✓ Đã ghi ${LOCAL_SETTINGS}`);
  console.log(`  allow: ${s.permissions.allow.length} quy tắc · additionalDirectories: ${s.permissions.additionalDirectories.join(', ') || '(trống)'}`);
  if (c.tools.publish.length) console.log('  (công cụ đăng bài KHÔNG được thêm – chỉ dùng qua /dang-bai sau khi Sếp duyệt)');
} else {
  console.error('Dùng: node scripts/config.mjs show | set <khoá> <giá trị> | set-tools <nhóm> <tool...> | write-local-settings');
  process.exit(1);
}
