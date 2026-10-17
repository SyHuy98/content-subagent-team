#!/usr/bin/env node
// Xuất video bằng Remotion và báo tiến độ lên văn phòng (Tâm – Video Editor).
//   node scripts/render-video.mjs <taskId>                    -> dùng workspace/outputs/<id>/video/props.json
//   node scripts/render-video.mjs <taskId> --props <file> --out <tên.mp4> --composition <Id>
//   node scripts/render-video.mjs --list                      -> liệt kê các composition
// Composition lấy từ props.composition (SpaMotion | ClipEdit | Custom-...), mặc định SpaMotion.
// Mọi đường dẫn file trong props tính từ workspace/ (vd "assets/files/abc.mp4").
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { WS, OUTPUTS, VIDEO_DIR, appendEvent, safeId } from './lib/store.mjs';
import { loadConfig } from './lib/config.mjs';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const IS_WIN = process.platform === 'win32';
const fail = (m) => { console.error(`render-video: ${m}`); process.exit(1); };

// Dùng project trong repo; nếu chưa cài mà có project Remotion riêng (vd E:\remotion) thì dùng project đó.
const cfg = loadConfig();
const projectDir = flag('project') || (fs.existsSync(path.join(VIDEO_DIR, 'node_modules', '@remotion', 'cli')) ? VIDEO_DIR : cfg.remotionProject || VIDEO_DIR);
if (!fs.existsSync(path.join(projectDir, 'node_modules', '@remotion', 'cli'))) {
  fail(`Chưa cài thư viện Remotion trong ${projectDir}. Chạy: npm run setup-video`);
}
const entry = ['src/index.ts', 'src/index.tsx', 'src/index.js'].find((e) => fs.existsSync(path.join(projectDir, e))) || 'src/index.ts';

const browserArgs = process.env.REMOTION_BROWSER_EXECUTABLE ? [`--browser-executable=${process.env.REMOTION_BROWSER_EXECUTABLE}`] : [];

function quote(a) {
  // shell:true trên Windows cần tự đặt ngoặc kép cho đối số có khoảng trắng.
  return IS_WIN && /[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a;
}

function remotion(cmdArgs, onLine) {
  return new Promise((resolve) => {
    const child = spawn(IS_WIN ? 'npx.cmd' : 'npx', ['remotion', ...cmdArgs].map(quote), { cwd: projectDir, shell: IS_WIN, env: { ...process.env, FORCE_COLOR: '0' } });
    let tail = '';
    const handle = (buf) => {
      const text = buf.toString();
      tail = (tail + text).slice(-6000);
      for (const line of text.split(/[\r\n]+/)) if (line.trim()) onLine?.(line);
    };
    child.stdout.on('data', handle);
    child.stderr.on('data', handle);
    child.on('close', (code) => resolve({ code, tail }));
    child.on('error', (err) => resolve({ code: -1, tail: String(err) }));
  });
}

if (args[0] === '--list') {
  const { code, tail } = await remotion(['compositions', entry, ...browserArgs]);
  console.log(tail.split('\n').filter((l) => !/memory|cgroup|docker|lower amount/i.test(l)).join('\n'));
  process.exit(code);
}

const taskId = safeId(args[0] || '');
if (!taskId) fail('Thiếu task id. Dùng: node scripts/render-video.mjs <taskId>');
const videoDir = path.join(OUTPUTS, taskId, 'video');
const propsFile = path.resolve(flag('props') || path.join(videoDir, 'props.json'));
if (!fs.existsSync(propsFile)) fail(`Không thấy file props: ${propsFile}`);
let props;
try { props = JSON.parse(fs.readFileSync(propsFile, 'utf8')); } catch (e) { fail(`props.json không hợp lệ: ${e.message}`); }
const composition = flag('composition') || props.composition || 'SpaMotion';
const outName = (flag('out') || 'video.mp4').replace(/[^\w.-]/g, '-');
const outFile = path.join(OUTPUTS, taskId, outName);

// Gom các file được nhắc tới trong props vào một thư mục public tạm (Remotion staticFile).
const publicDir = path.join(videoDir, 'public');
fs.rmSync(publicDir, { recursive: true, force: true });
const missing = [];
(function collect(v) {
  if (typeof v === 'string') {
    if (/^(assets|outputs)\//.test(v)) {
      const src = path.normalize(path.join(WS, v));
      if (!src.startsWith(WS + path.sep) || !fs.existsSync(src)) { missing.push(v); return; }
      const dst = path.join(publicDir, v);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
    }
  } else if (v && typeof v === 'object') Object.values(v).forEach(collect);
})(props);
if (missing.length) fail(`Không tìm thấy file: ${missing.join(', ')} (đường dẫn phải tính từ workspace/, xem node scripts/assets.mjs list)`);
fs.mkdirSync(publicDir, { recursive: true });

const report = (state, msg, extra = {}) => appendEvent({ agent: 'editor', state, msg, task: taskId, ...extra });
const logFile = path.join(videoDir, 'render.log');
fs.mkdirSync(videoDir, { recursive: true });

console.log(`🎬 Xuất ${composition} → ${path.relative(process.cwd(), outFile)}`);
report('rendering', `Bắt đầu xuất video (${composition})`, { progress: 0 });
let lastPct = 0;
const started = Date.now();
const res = await remotion(
  ['render', entry, composition, outFile, `--props=${propsFile}`, `--public-dir=${publicDir}`, '--overwrite', ...browserArgs],
  (line) => {
    fs.appendFileSync(logFile, line + '\n');
    const m = /(?:Rendered|Rendering frames|Encoded|Encoding)[^\d]*(\d+)\s*\/\s*(\d+)/i.exec(line);
    if (!m) return;
    const pct = Math.min(99, Math.floor((Number(m[1]) / Number(m[2])) * (/encod/i.test(line) ? 10 : 90) + (/encod/i.test(line) ? 90 : 0)));
    if (pct >= lastPct + 10) {
      lastPct = pct - (pct % 10);
      report('rendering', `Đang xuất video ${lastPct}%`, { progress: lastPct });
      console.log(`  … ${lastPct}%`);
    }
  },
);

if (res.code !== 0 || !fs.existsSync(outFile)) {
  report('working', 'Xuất video lỗi, đang sửa props');
  console.error(res.tail.split('\n').filter((l) => !/memory|cgroup|docker|lower amount/i.test(l)).slice(-40).join('\n'));
  fail(`Xuất video thất bại (mã ${res.code}). Log đầy đủ: ${logFile}`);
}

// Ảnh bìa từ khoảng giây thứ 1.5.
const coverFile = path.join(OUTPUTS, taskId, outName.replace(/\.mp4$/i, '') + '-cover.png');
await remotion(['still', entry, composition, coverFile, `--props=${propsFile}`, `--public-dir=${publicDir}`, '--frame=45', '--overwrite', ...browserArgs]);

const mb = (fs.statSync(outFile).size / 1e6).toFixed(1);
const secs = Math.round((Date.now() - started) / 1000);
report('rendering', `Xuất xong video (${mb} MB)`, { progress: 100 });
console.log(`✅ Xong: ${path.relative(process.cwd(), outFile)} (${mb} MB, ${secs}s)${fs.existsSync(coverFile) ? `\n   Ảnh bìa: ${path.relative(process.cwd(), coverFile)}` : ''}`);
