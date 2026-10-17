// Văn phòng pixel: bản đồ, nội thất, nhân vật, tìm đường và hoạt cảnh.
import { sprite } from './sprites.js';

export const T = 16, COLS = 24, ROWS = 15, W = COLS * T, H = ROWS * T;
export const ORDER = ['manager', 'chuyen-gia', 'chien-luoc', 'copywriter', 'designer'];

const DESKS = {
  manager:      { x: 9,  y: 4,  w: 3, seat: [10, 3] },
  boss:         { x: 19, y: 3,  w: 3, seat: [20, 2] },
  'chuyen-gia': { x: 2,  y: 8,  w: 3, seat: [3, 7] },
  'chien-luoc': { x: 7,  y: 8,  w: 3, seat: [8, 7] },
  copywriter:   { x: 2,  y: 12, w: 3, seat: [3, 11] },
  designer:     { x: 7,  y: 12, w: 3, seat: [8, 11] },
};

const IDLE_SPOTS = [
  { at: [21, 10], face: 'up', say: '☕' }, { at: [22, 11], face: 'right', say: '💧' }, { at: [19, 12], face: 'down', say: '😌' },
  { at: [13, 7], face: 'down', say: '🗒️' }, { at: [13, 10], face: 'up', say: '💭' }, { at: [1, 3], face: 'up', say: '📚' },
  { at: [13, 3], face: 'up', say: '🖨️' }, { at: [6, 2], face: 'up', say: '🌤️' }, { at: [3, 2], face: 'up', say: '🌿' },
  { at: [16, 12], face: 'left', say: '🌱' }, { at: [6, 5], face: 'down' }, { at: [14, 5], face: 'down' }, { at: [20, 11], face: 'up', say: '🍪' },
];

// Nội thất chặn đường đi: [x, y, w, h]
const BLOCKS = [
  [0, 2, 2, 1], [5, 2, 1, 1], [15, 2, 1, 1], [13, 2, 1, 1], [16, 2, 1, 3], [17, 2, 2, 1], [23, 2, 1, 1], [23, 7, 1, 1],
  [12, 8, 3, 2], [11, 8, 1, 2], [15, 8, 1, 2], [19, 9, 4, 1], [23, 11, 1, 1], [18, 13, 3, 1], [0, 14, 1, 1], [23, 14, 1, 1],
];

const walk = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, () => y >= 2));
for (const [x, y, w, h] of BLOCKS) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) walk[y + j][x + i] = false;
for (const d of Object.values(DESKS)) for (let i = 0; i < d.w; i++) walk[d.y][d.x + i] = false;

function visitSlots(target) {
  const d = DESKS[target];
  const [sx] = d.seat;
  return [[sx, d.y + 1], [sx - 1, d.y + 1], [sx + 1, d.y + 1]];
}

function bfs(from, to) {
  const key = (x, y) => y * COLS + x;
  const prev = new Map([[key(...from), null]]);
  const q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to[0] && y === to[1]) {
      const path = [];
      let k = key(x, y);
      while (k !== null) { path.unshift([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
      return path.slice(1);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !walk[ny][nx] || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const STATE_ICON = { idle: '', receiving: '📥', working: '⌨️', consulting: '💬', reviewing: '🔍', delivering: '📄', done: '✅', error: '⚠️', assign: '📝' };

// ---------------- Nhân vật ----------------
class Agent {
  constructor(id, office) {
    this.id = id;
    this.office = office;
    const spot = pick(IDLE_SPOTS).at;
    this.x = spot[0]; this.y = spot[1];
    this.dir = 'down';
    this.path = [];
    this.queue = [];
    this.action = { state: 'idle' };
    this.phase = 'wander-wait';
    this.timer = rnd(0.5, 3);
    this.anim = 0; this.frame = 0; this.blinkT = rnd(2, 5); this.blink = false;
    this.seated = false; this.carry = false; this.typing = false;
    this.say = ''; this.sayUntil = 0; this.icon = '';
    this.highlight = false;
  }

  get seat() { return DESKS[this.id].seat; }

  /** Đặt ngay vị trí theo trạng thái hiện tại (khi mới mở trang). */
  place(ev) {
    this.action = { ...ev };
    if (['working', 'reviewing', 'done', 'error', 'receiving', 'consulting', 'delivering'].includes(ev.state)) {
      [this.x, this.y] = this.seat;
      this.sit(ev.state);
      this.phase = 'stay'; this.timer = 0;
    }
    this.icon = STATE_ICON[ev.state] || '';
  }

  push(ev) {
    this.queue.push(ev);
    if (this.queue.length > 4) this.queue.splice(0, this.queue.length - 4);
    const idle = this.phase.startsWith('wander') || this.phase === 'relax' || (this.phase === 'go' && (this.then === 'wander' || this.then === 'relax'));
    if (idle) this.next();
  }

  next() {
    const ev = this.queue.shift();
    if (!ev) return false;
    this.start(ev);
    return true;
  }

  start(ev) {
    this.action = ev;
    this.icon = STATE_ICON[ev.state] || '';
    if (ev.msg) this.speak(ev.msg, 9);
    this.carry = false;
    switch (ev.state) {
      case 'receiving': this.goVisit(ev.to || (this.id === 'manager' ? 'boss' : 'manager'), 2.5); break;
      case 'consulting': this.goVisit(ev.to || 'manager', 3); break;
      case 'delivering': this.carry = true; this.goVisit(ev.to || (this.id === 'manager' ? 'boss' : 'manager'), 2.5); break;
      case 'idle': this.phase = 'wander-wait'; this.timer = rnd(0.5, 2); this.stand(); break;
      default: this.goTo(this.seat, 'sit');
    }
  }

  speak(text, secs) { this.say = text; this.sayUntil = performance.now() + secs * 1000; }

  stand() { if (this.seated) { this.seated = false; this.typing = false; } }

  sit(state) { this.seated = true; this.dir = 'down'; this.typing = state === 'working' || state === 'reviewing'; }

  goVisit(target, dwell) {
    if (!DESKS[target]) target = 'manager';
    const slots = visitSlots(target);
    const slot = slots[ORDER.indexOf(this.id) % slots.length];
    this.goTo(slot, 'dwell', dwell, 'up');
  }

  goTo(tile, then, dwell = 0, face = 'down') {
    this.stand();
    const from = [Math.round(this.x), Math.round(this.y)];
    const path = bfs(from, tile);
    if (!path) { [this.x, this.y] = tile; this.path = []; }
    else this.path = path;
    this.then = then; this.dwell = dwell; this.face = face;
    this.phase = 'go';
  }

  arrive() {
    if (this.then === 'sit') {
      this.sit(this.action.state);
      this.phase = 'stay';
      this.timer = 0;
    } else if (this.then === 'dwell') {
      this.dir = this.face; this.phase = 'dwell'; this.timer = this.dwell;
    } else if (this.then === 'wander') {
      this.dir = this.face; this.phase = 'wander-wait'; this.timer = rnd(3, 8);
      if (this.wanderSay && Math.random() < 0.6) this.speak(this.wanderSay, 2.5);
    } else if (this.then === 'relax') {
      this.sit('idle'); this.phase = 'relax'; this.timer = rnd(6, 12);
    }
  }

  update(dt) {
    // chớp mắt
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : rnd(2, 5); }
    this.anim += dt;

    if (this.phase === 'go') {
      if (!this.path.length) { this.arrive(); return; }
      const [tx, ty] = this.path[0];
      const dx = tx - this.x, dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      const step = 3.4 * dt;
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) this.dir = dy > 0 ? 'down' : 'up';
      if (dist <= step) { this.x = tx; this.y = ty; this.path.shift(); }
      else { this.x += (dx / dist) * step; this.y += (dy / dist) * step; }
      this.frame = Math.floor(this.anim / 0.14) % 2;
      return;
    }

    this.timer -= dt;
    if (this.phase === 'dwell') {
      if (this.timer <= 0) {
        if (!this.next()) { this.carry = false; this.goTo(this.seat, 'sit'); }
      }
    } else if (this.phase === 'stay') {
      if (this.typing) this.frame = Math.floor(this.anim / 0.18) % 2;
      if (this.queue.length && this.timer <= -1.2) this.next();
      else if (this.action.state === 'done' && this.timer <= -25) this.start({ state: 'idle' });
    } else if (this.phase === 'relax') {
      if (this.timer <= 0) { this.phase = 'wander-wait'; this.timer = 0; }
    } else if (this.phase === 'wander-wait') {
      if (this.timer <= 0) {
        if (Math.random() < 0.3) { this.goTo(this.seat, 'relax'); }
        else {
          const spot = pick(IDLE_SPOTS);
          this.wanderSay = spot.say;
          this.goTo(spot.at, 'wander', 0, spot.face);
        }
      }
    }
  }

  draw(g) {
    const walking = this.phase === 'go';
    const px = Math.round(this.x * T), py = Math.round(this.y * T);
    if (!this.seated) {
      g.fillStyle = 'rgba(60,40,30,.22)';
      g.beginPath(); g.ellipse(px + 8, py + 15, 5, 2, 0, 0, Math.PI * 2); g.fill();
    }
    const img = sprite(this.id, this.seated ? 'down' : this.dir, {
      walk: walking, frame: this.frame, sit: this.seated, carry: this.carry && !this.seated,
      typing: this.seated && this.typing ? this.frame : undefined, blink: this.blink,
    });
    const oy = this.seated ? 2 : 0;
    g.drawImage(img, px, py + T - 22 + oy);
  }

  get sortY() { return this.y * T + T - 0.5; }
  get headPos() { return { x: this.x * T + 8, y: this.y * T + T - 22 + (this.seated ? 2 : 0) }; }
}

// ---------------- Vẽ nội thất ----------------
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function drawBackground(g) {
  // sàn gỗ
  for (let y = 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const X = x * T, Y = y * T;
    R(g, X, Y, T, T, (x + y) % 2 ? '#dcb88e' : '#d8b389');
    R(g, X, Y + 7, T, 1, '#c9a37a'); R(g, X, Y + 15, T, 1, '#c49d74');
    R(g, X + ((y % 2) ? 5 : 11), Y, 1, 7, '#c9a37a'); R(g, X + ((y % 2) ? 12 : 3), Y + 8, 1, 7, '#c9a37a');
  }
  // thảm phòng sếp
  R(g, 17 * T, 2 * T, 7 * T, 6 * T, '#c9a3a6');
  for (let y = 2 * T; y < 8 * T; y += 4) for (let x = 17 * T + ((y / 4) % 2) * 2; x < 24 * T; x += 4) R(g, x, y, 1, 1, '#b98f93');
  R(g, 17 * T, 8 * T - 2, 7 * T, 2, '#a97b80');
  // thảm phòng họp
  R(g, 11 * T - 4, 7 * T - 2, 5 * T + 8, 4 * T + 4, '#e8d3b5'); R(g, 11 * T - 2, 7 * T, 5 * T + 4, 4 * T, '#f0e0c6');
  // thảm lounge
  R(g, 17 * T, 10 * T, 7 * T, 5 * T, '#9fbd99'); R(g, 17 * T + 3, 10 * T + 3, 7 * T - 6, 5 * T - 6, '#b1cdaa');
  for (let x = 17 * T + 6; x < 24 * T - 6; x += 6) R(g, x, 10 * T + 5, 2, 1, '#9fbd99');
  // thảm khu làm việc
  R(g, 1 * T - 4, 6 * T + 8, 10 * T + 8, 8 * T, 'rgba(255,255,255,.08)');

  // tường
  R(g, 0, 0, W, 2 * T, '#f1e6d8'); R(g, 0, 0, W, 3, '#dccab3');
  for (let x = 0; x < W; x += 8) R(g, x, 6, 1, 20, 'rgba(0,0,0,.025)');
  R(g, 0, 2 * T - 4, W, 4, '#a8896c'); R(g, 0, 2 * T - 4, W, 1, '#c3a587');
  // cửa sổ
  for (const wx of [2, 5, 19]) window_(g, wx * T + 2, 4, wx === 19 ? 3 * T - 4 : 2 * T - 4, 20);
  // bảng trắng
  R(g, 8 * T, 3, 5 * T, 21, '#9b9b9b'); R(g, 8 * T + 2, 5, 5 * T - 4, 17, '#fbfbfb');
  R(g, 8 * T + 6, 9, 22, 1, '#d97757'); R(g, 8 * T + 6, 12, 30, 1, '#6f9fd8'); R(g, 8 * T + 6, 15, 18, 1, '#6fae8a');
  R(g, 8 * T + 44, 8, 1, 10, '#ccc');
  for (let i = 0; i < 5; i++) R(g, 8 * T + 50 + i * 5, 18 - i * 2, 3, 2 + i * 2, ['#e98aa6', '#6fae8a', '#6f9fd8', '#d97757', '#c9a96e'][i]);
  R(g, 8 * T + 4, 22, 5 * T - 8, 2, '#8a8a8a');
  // logo spa
  R(g, 17 * T + 3, 6, 26, 16, '#fff8ef'); R(g, 17 * T + 3, 6, 26, 1, '#c9a96e'); R(g, 17 * T + 3, 21, 26, 1, '#c9a96e');
  leaf(g, 17 * T + 10, 9); leaf(g, 17 * T + 16, 8);
  // bằng khen
  R(g, 22 * T + 4, 6, 20, 15, '#c9a96e'); R(g, 22 * T + 6, 8, 16, 11, '#fffaf0'); R(g, 22 * T + 9, 11, 10, 1, '#bbb'); R(g, 22 * T + 9, 14, 8, 1, '#bbb');
  R(g, 22 * T + 12, 16, 4, 3, '#d97757');
  // poster
  R(g, 0 * T + 4, 6, 18, 18, '#e98aa6'); R(g, 0 * T + 6, 8, 14, 10, '#fff1f4'); leaf(g, 0 * T + 9, 10);
  // vách kính phòng sếp
  R(g, 16 * T + 5, 2 * T - 8, 6, 3 * T + 8, '#cfe6ee'); R(g, 16 * T + 5, 2 * T - 8, 1, 3 * T + 8, '#9bb8c2'); R(g, 16 * T + 10, 2 * T - 8, 1, 3 * T + 8, '#9bb8c2');
  R(g, 16 * T + 7, 2 * T, 2, 6, 'rgba(255,255,255,.7)');
}

function window_(g, x, y, w, h) {
  R(g, x - 2, y - 2, w + 4, h + 4, '#a8896c');
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#8fcfee'); grad.addColorStop(1, '#d4f0fb');
  g.fillStyle = grad; g.fillRect(x, y, w, h);
  R(g, x + 3, y + 5, 7, 2, '#fff'); R(g, x + 5, y + 4, 4, 1, '#fff');
  R(g, x + w / 2 - 1, y, 2, h, '#a8896c'); R(g, x, y + h / 2 - 1, w, 2, '#a8896c');
  R(g, x - 3, y + h + 1, w + 6, 2, '#efe1cf');
}

function leaf(g, x, y) {
  R(g, x + 1, y, 3, 1, '#6fae8a'); R(g, x, y + 1, 5, 3, '#6fae8a'); R(g, x + 1, y + 4, 3, 1, '#6fae8a'); R(g, x + 2, y + 1, 1, 5, '#4f8a6a');
}

function plant(g, tx, ty, big) {
  const x = tx * T, y = ty * T;
  R(g, x + 4, y + 9, 8, 7, '#b07d55'); R(g, x + 3, y + 8, 10, 2, '#c99468'); R(g, x + 4, y + 15, 8, 1, '#8a5c3b');
  const leaves = big ? [[2, -6], [8, -8], [5, -12], [0, 0], [10, -2], [5, -3]] : [[3, 0], [8, -2], [5, -6]];
  for (const [lx, ly] of leaves) { R(g, x + lx, y + ly + 2, 6, 5, '#5f9e74'); R(g, x + lx + 1, y + ly + 3, 3, 2, '#7cbd8f'); }
}

function desk(g, d, owner, typing) {
  const x = d.x * T, y = d.y * T, w = d.w * T;
  R(g, x, y - 5, w, 11, '#b07d55'); R(g, x, y - 5, w, 1, '#cf9c70'); R(g, x, y + 5, w, 1, '#94653f');
  R(g, x + 1, y + 6, w - 2, 8, '#8a5c3b'); R(g, x + w - 16, y + 8, 12, 4, '#7a4f31'); R(g, x + w - 11, y + 9, 2, 1, '#c9a96e');
  R(g, x + 1, y + 14, 3, 2, '#5c3b24'); R(g, x + w - 4, y + 14, 3, 2, '#5c3b24');
  const sx = d.seat[0] * T;
  if (owner !== 'boss') {
    // laptop (nhìn từ phía sau)
    R(g, sx + 3, y - 4, 10, 6, '#8d929b'); R(g, sx + 3, y - 4, 10, 1, '#a9aeb6'); R(g, sx + 7, y - 2, 2, 2, '#e6e8ec');
    if (typing) { R(g, sx + 2, y - 5, 12, 1, 'rgba(170,215,255,.9)'); }
  }
  const lx = x + 2, rx = x + w - 14;
  switch (owner) {
    case 'chuyen-gia':
      R(g, lx, y - 7, 3, 6, '#f2f2f2'); R(g, lx, y - 8, 3, 1, '#6fae8a');
      R(g, lx + 4, y - 6, 3, 5, '#f7c6d0'); R(g, lx + 4, y - 7, 3, 1, '#c9a96e');
      R(g, lx + 8, y - 5, 2, 4, '#cfe6ee'); R(g, rx + 2, y - 3, 10, 6, '#fffdf6'); R(g, rx + 3, y - 1, 7, 1, '#cc6b6b');
      break;
    case 'chien-luoc':
      R(g, lx, y - 3, 11, 7, '#fffdf6'); R(g, lx + 2, y + 1, 2, 2, '#6f9fd8'); R(g, lx + 5, y - 1, 2, 4, '#d97757'); R(g, lx + 8, y - 2, 2, 5, '#6fae8a');
      R(g, rx + 4, y - 4, 4, 4, '#ffe27a'); R(g, rx + 9, y - 2, 4, 4, '#ffb3c6');
      break;
    case 'copywriter':
      R(g, lx, y - 3, 9, 7, '#f39bb5'); R(g, lx + 1, y - 2, 7, 5, '#ffe3ec'); R(g, lx + 2, y, 4, 1, '#c96886');
      R(g, rx + 5, y - 6, 5, 6, '#fff'); R(g, rx + 10, y - 4, 2, 3, '#fff'); R(g, rx + 6, y - 5, 3, 1, '#7a4a2a');
      break;
    case 'designer':
      R(g, lx, y - 3, 12, 8, '#2d2d38'); R(g, lx + 1, y - 2, 10, 6, '#4a4a5c'); R(g, lx + 4, y - 1, 4, 1, '#6fae8a');
      for (let i = 0; i < 4; i++) R(g, rx + 3 + i * 2, y - 6, 1, 6, ['#e98aa6', '#6fae8a', '#6f9fd8', '#ffd166'][i]);
      break;
    case 'manager':
      R(g, lx, y - 2, 10, 6, '#fffdf6'); R(g, lx + 1, y - 3, 10, 6, '#fffdf6'); R(g, lx + 2, y - 1, 6, 1, '#bbb');
      R(g, rx, y + 1, 12, 4, '#d97757'); R(g, rx + 2, y + 2, 8, 1, '#fff2ea');
      break;
    case 'boss': {
      R(g, lx + 2, y - 4, 5, 7, '#cfe6ee'); R(g, lx + 3, y - 10, 1, 6, '#5f9e74'); R(g, lx + 5, y - 9, 1, 5, '#5f9e74');
      R(g, lx + 1, y - 12, 4, 3, '#f39bb5'); R(g, lx + 5, y - 11, 3, 3, '#ffd166');
      R(g, sx + 2, y - 2, 12, 5, '#3a3a46'); R(g, sx + 3, y - 1, 10, 3, '#55556a');
      break;
    }
  }
}

function reportStack(g, n) {
  const d = DESKS.boss;
  const x = (d.x + d.w) * T - 14, y = d.y * T + 2;
  for (let i = 0; i < Math.min(n, 8); i++) {
    R(g, x + (i % 2), y - i * 2, 11, 2, i % 2 ? '#fffdf6' : '#f1ece2');
    R(g, x + (i % 2), y - i * 2 + 1, 11, 1, '#d9d2c4');
  }
  if (n) { R(g, x + 3, y - Math.min(n, 8) * 2 - 1, 5, 1, '#d97757'); }
}

function chair(g, tile) {
  const x = tile[0] * T, y = tile[1] * T;
  R(g, x + 3, y + 1, 10, 11, '#6b5348'); R(g, x + 4, y, 8, 1, '#6b5348'); R(g, x + 4, y + 2, 8, 1, '#7d6356');
}

function meetingTable(g) {
  const x = 12 * T, y = 8 * T;
  R(g, x - 1, y - 3, 3 * T + 2, 2 * T, '#f6efe4'); R(g, x - 1, y - 3, 3 * T + 2, 1, '#fff');
  R(g, x - 1, y + 2 * T - 3, 3 * T + 2, 4, '#c9b79c');
  R(g, x + 8, y + 3, 10, 7, '#fffdf6'); R(g, x + 22, y + 9, 8, 6, '#ffe27a'); R(g, x + 34, y + 2, 5, 5, '#fff'); R(g, x + 35, y + 3, 3, 1, '#7a4a2a');
  for (const [cx, cy] of [[11, 8], [11, 9], [15, 8], [15, 9]]) {
    R(g, cx * T + 4, cy * T + 3, 8, 10, '#8fb3a4'); R(g, cx * T + 4, cy * T + 12, 8, 2, '#6f9384');
  }
}

function counter(g, t) {
  const x = 19 * T, y = 9 * T;
  R(g, x, y - 6, 4 * T, 8, '#e9e1d6'); R(g, x, y - 6, 4 * T, 1, '#fff');
  R(g, x, y + 2, 4 * T, 13, '#7aa38a'); for (let i = 1; i < 4; i++) R(g, x + i * T, y + 3, 1, 11, '#5f8a70');
  // máy pha cà phê
  R(g, 21 * T + 2, y - 18, 12, 13, '#3a3a46'); R(g, 21 * T + 4, y - 15, 8, 4, '#6a6a7c'); R(g, 21 * T + 6, y - 9, 4, 3, '#fff');
  R(g, 21 * T + 10, y - 16, 2, 2, Math.sin(t * 3) > 0 ? '#ff6b6b' : '#7a2b2b');
  for (let i = 0; i < 3; i++) {
    const s = (t * 0.8 + i / 3) % 1;
    R(g, 21 * T + 7 + Math.round(Math.sin((t + i) * 4)), y - 10 - s * 10, 1, 1, `rgba(255,255,255,${0.8 - s * 0.8})`);
  }
  // cốc + bánh
  R(g, 19 * T + 4, y - 9, 4, 4, '#fff'); R(g, 19 * T + 10, y - 9, 4, 4, '#f39bb5');
  R(g, 20 * T + 3, y - 7, 9, 2, '#c99468'); R(g, 20 * T + 4, y - 9, 2, 2, '#8a5c3b'); R(g, 20 * T + 8, y - 9, 2, 2, '#8a5c3b');
}

function cooler(g) {
  const x = 23 * T, y = 11 * T;
  R(g, x + 3, y - 2, 10, 17, '#e8eef2'); R(g, x + 4, y - 12, 8, 10, '#9fd4ef'); R(g, x + 5, y - 11, 2, 6, '#d5effa');
  R(g, x + 6, y + 4, 4, 2, '#5aa0d8');
}

function sofa(g) {
  const x = 18 * T, y = 13 * T;
  R(g, x, y + 2, 3 * T, 14, '#d98fa3'); R(g, x, y - 2, 3 * T, 6, '#e8a7b8');
  R(g, x - 2, y, 4, 15, '#c27a8e'); R(g, x + 3 * T - 2, y, 4, 15, '#c27a8e');
  R(g, x + T - 1, y + 4, 1, 9, '#c27a8e'); R(g, x + 2 * T - 1, y + 4, 1, 9, '#c27a8e');
}

function bookshelf(g, tx, ty, w) {
  const x = tx * T, y = ty * T, cols = ['#d97757', '#6f9fd8', '#6fae8a', '#e98aa6', '#c9a96e', '#7b4fa0'];
  R(g, x, y - 14, w * T, 30, '#8a5c3b'); R(g, x + 2, y - 12, w * T - 4, 26, '#6b4529');
  for (let row = 0; row < 3; row++) {
    for (let i = 0, bx = x + 3; bx < x + w * T - 4; i++) {
      const bw = 2 + ((i * 7 + row * 3) % 3);
      R(g, bx, y - 11 + row * 9 + ((i + row) % 2), bw, 7 - ((i + row) % 2), cols[(i + row * 2) % cols.length]);
      bx += bw + 1;
    }
    R(g, x + 2, y - 4 + row * 9, w * T - 4, 1, '#8a5c3b');
  }
}

function printer(g) {
  const x = 13 * T, y = 2 * T;
  R(g, x + 1, y + 2, 14, 13, '#a07a5a'); R(g, x + 2, y - 4, 12, 8, '#e8e8ec'); R(g, x + 2, y - 4, 12, 1, '#fff');
  R(g, x + 4, y - 7, 8, 3, '#fffdf6'); R(g, x + 11, y - 2, 2, 1, '#6fae8a');
}

function clock(g) {
  const cx = 15 * T + 8, cy = 13;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#a8896c'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 7.5, 0, Math.PI * 2); g.stroke();
  const d = new Date();
  const hand = (a, len, c) => { g.strokeStyle = c; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); g.stroke(); };
  hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, 3.5, '#333');
  hand(d.getMinutes() / 60 * Math.PI * 2, 5.5, '#333');
  hand(d.getSeconds() / 60 * Math.PI * 2, 6, '#d97757');
}

// ---------------- Văn phòng ----------------
export class Office {
  constructor(canvas, overlay, names) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    this.g.imageSmoothingEnabled = false;
    this.bg = document.createElement('canvas');
    this.bg.width = W; this.bg.height = H;
    drawBackground(this.bg.getContext('2d'));
    this.overlay = overlay;
    this.agents = {};
    this.tags = {};
    this.reports = 0;
    this.onAgentClick = null;
    for (const id of [...ORDER, 'boss']) {
      const tag = document.createElement('div');
      tag.className = `agent-tag tag-${id}`;
      tag.innerHTML = `<div class="bubble"></div><div class="name">${names[id] || id}</div>`;
      tag.addEventListener('click', () => this.onAgentClick?.(id));
      overlay.appendChild(tag);
      this.tags[id] = tag;
      if (id !== 'boss') this.agents[id] = new Agent(id, this);
    }
    this.boss = { say: '', sayUntil: 0, icon: '', blink: false, blinkT: 3 };
    this.last = performance.now();
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * H;
      for (const a of Object.values(this.agents)) {
        const h = a.headPos;
        if (Math.abs(mx - h.x) < 9 && my > h.y && my < h.y + 22) { this.onAgentClick?.(a.id); return; }
      }
    });
    requestAnimationFrame(this.loop);
  }

  init(agentStates, reports) {
    this.reports = reports;
    for (const [id, st] of Object.entries(agentStates)) this.agents[id]?.place(st);
  }

  handle(ev) {
    if (ev.agent === 'boss') {
      this.boss.say = ev.msg || ''; this.boss.sayUntil = performance.now() + 8000; this.boss.icon = STATE_ICON[ev.state] || '';
      return;
    }
    this.agents[ev.agent]?.push(ev);
    if (ev.agent === 'manager' && ev.state === 'done' && ev.taskStatus === 'done') {
      this.reports++;
      this.boss.say = 'Cảm ơn team! 👏'; this.boss.sayUntil = performance.now() + 6000;
    }
  }

  setHighlight(id) { for (const a of Object.values(this.agents)) a.highlight = a.id === id; }

  loop = (now) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    for (const a of Object.values(this.agents)) a.update(dt);
    this.boss.blinkT -= dt;
    if (this.boss.blinkT < 0) { this.boss.blink = !this.boss.blink; this.boss.blinkT = this.boss.blink ? 0.12 : rnd(2, 5); }
    this.render(now / 1000);
    this.updateTags(now);
    requestAnimationFrame(this.loop);
  };

  render(t) {
    const g = this.g;
    g.drawImage(this.bg, 0, 0);
    clock(g);
    const items = [];
    const add = (sortY, fn) => items.push({ sortY, fn });
    for (const [id, d] of Object.entries(DESKS)) {
      add(d.seat[1] * T + T - 1, () => chair(g, d.seat));
      const typing = id === 'boss' ? false : this.agents[id].seated && this.agents[id].typing;
      add(d.y * T + T, () => { desk(g, d, id, typing); if (id === 'boss') reportStack(g, this.reports); });
    }
    add(2 * T + T, () => bookshelf(g, 0, 2, 2));
    add(2 * T + T, () => bookshelf(g, 17, 2, 2));
    add(2 * T + T, () => printer(g));
    for (const [x, y, big] of [[5, 2, 1], [15, 2, 0], [23, 2, 1], [23, 7, 0], [0, 14, 1], [23, 14, 1]]) add(y * T + T, () => plant(g, x, y, big));
    add(9 * T + T, () => meetingTable(g));
    add(9 * T + T, () => counter(g, t));
    add(11 * T + T, () => cooler(g));
    add(13 * T + T, () => sofa(g));
    const bossSeat = DESKS.boss.seat;
    add(bossSeat[1] * T + T - 0.5, () => {
      const img = sprite('boss', 'down', { sit: true, blink: this.boss.blink });
      g.drawImage(img, bossSeat[0] * T, bossSeat[1] * T + T - 20);
    });
    for (const a of Object.values(this.agents)) add(a.sortY, () => a.draw(g));
    items.sort((a, b) => a.sortY - b.sortY);
    for (const it of items) it.fn();
  }

  updateTags(now) {
    const place = (tag, x, y, say, icon, fresh) => {
      tag.style.left = `${(x / W) * 100}%`;
      tag.style.top = `${(y / H) * 100}%`;
      const b = tag.firstChild;
      const text = fresh ? `${icon ? icon + ' ' : ''}${say}` : icon;
      if (b.textContent !== text) b.textContent = text;
      b.classList.toggle('show', !!text);
      b.classList.toggle('compact', !fresh);
    };
    for (const a of Object.values(this.agents)) {
      const h = a.headPos;
      place(this.tags[a.id], h.x, h.y, a.say, a.icon, now < a.sayUntil);
      this.tags[a.id].classList.toggle('active', a.highlight);
    }
    const bs = DESKS.boss.seat;
    place(this.tags.boss, bs[0] * T + 8, bs[1] * T + T - 18, this.boss.say, this.boss.icon, now < this.boss.sayUntil);
  }
}
