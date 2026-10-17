// Pixel art vẽ hoàn toàn bằng code (không cần file ảnh).
// Nhân vật 16x20 px, mỗi tư thế được vẽ sẵn vào canvas nhỏ và cache lại.

export const LOOKS = {
  manager:      { skin: '#f2c9a0', hair: '#3b2a20', style: 'short', shirt: '#d97757', shade: '#b55a3c', pants: '#3d3a4b', shoes: '#222', acc: 'headset' },
  'chuyen-gia': { skin: '#f5d0b0', hair: '#1f1a1a', style: 'long',  shirt: '#f7f9fc', shade: '#cdd6e2', pants: '#5a6b8c', shoes: '#333', acc: 'coat' },
  'chien-luoc': { skin: '#e8b98f', hair: '#2a2422', style: 'short', shirt: '#3e5c94', shade: '#2d4473', pants: '#2b2b35', shoes: '#1a1a1a', acc: 'glasses' },
  copywriter:   { skin: '#f7d4b8', hair: '#7a4a2a', style: 'bun',   shirt: '#e98aa6', shade: '#c96886', pants: '#efe2d2', shoes: '#8a5a44', acc: null },
  designer:     { skin: '#dcae86', hair: '#2b2b2b', style: 'short', shirt: '#6fae8a', shade: '#4f8a6a', pants: '#3a3550', shoes: '#202020', acc: 'beret' },
  editor:       { skin: '#e9bf96', hair: '#1e1a18', style: 'short', shirt: '#e0b04a', shade: '#bf9233', pants: '#2c2f3a', shoes: '#151515', acc: 'cap' },
  'phan-tich':  { skin: '#f1cba9', hair: '#4a2f22', style: 'long',  shirt: '#3fa7a0', shade: '#2f817b', pants: '#ece3d6', shoes: '#6b4a3a', acc: 'glasses' },
  boss:         { skin: '#f3cfb0', hair: '#2b1d18', style: 'long',  shirt: '#33313f', shade: '#23222c', pants: '#33313f', shoes: '#111', acc: 'necklace' },
};

const EYE = '#2b2424';
const MOUTH = '#c0705a';
const BLUSH = '#f2a7a0';

function P(g) {
  return (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
}

function drawFront(g, L, o) {
  const p = P(g);
  if (L.style === 'long') p(3, 3, 10, 9, L.hair);
  // thân
  p(5, 10, 6, 1, L.shirt); p(4, 11, 8, 5, L.shirt); p(4, 15, 8, 1, L.shade);
  if (L.acc === 'coat') { p(7, 10, 2, 4, '#8cbbe0'); p(6, 11, 1, 2, '#777'); p(9, 11, 1, 2, '#777'); p(7, 13, 2, 1, '#888'); }
  if (L.acc === 'necklace') p(6, 10, 4, 1, '#e8c26a');
  // tay
  if (o.carry) {
    p(4, 12, 8, 5, '#fffdf6'); p(5, 13, 6, 1, '#b9b2a6'); p(5, 15, 4, 1, '#b9b2a6');
    p(3, 14, 1, 2, L.skin); p(12, 14, 1, 2, L.skin);
  } else if (o.typing !== undefined) {
    p(3, 11, 1, 3, L.shirt); p(12, 11, 1, 3, L.shirt);
    p(4, 14 - (o.typing ? 1 : 0), 2, 1, L.skin); p(10, 14 - (o.typing ? 0 : 1), 2, 1, L.skin);
  } else {
    const a = o.walk ? (o.frame ? 1 : -1) : 0;
    p(3, 11, 1, 4, L.shirt); p(12, 11, 1, 4, L.shirt);
    p(3, 15 + (a > 0 ? -1 : 0), 1, 1, L.skin); p(12, 15 + (a < 0 ? -1 : 0), 1, 1, L.skin);
  }
  // chân
  if (!o.sit) {
    p(5, 16, 6, 1, L.pants);
    const l = o.walk && o.frame === 0 ? 1 : 0, r = o.walk && o.frame === 1 ? 1 : 0;
    p(5, 16, 2, 3 - l, L.pants); p(9, 16, 2, 3 - r, L.pants);
    p(5, 19 - l, 2, 1, L.shoes); p(9, 19 - r, 2, 1, L.shoes);
  }
  // đầu
  p(5, 1, 6, 1, L.hair); p(4, 2, 8, 2, L.hair);
  p(4, 4, 8, 5, L.skin); p(5, 9, 6, 1, L.skin);
  p(4, 4, 8, 1, L.hair); p(4, 5, 1, 2, L.hair); p(11, 5, 1, 2, L.hair); p(5, 5, 2, 1, L.hair);
  if (L.style === 'long') { p(3, 4, 1, 7, L.hair); p(12, 4, 1, 7, L.hair); }
  if (L.style === 'bun') { p(6, -1, 4, 2, L.hair); p(7, -2, 2, 1, L.hair); }
  if (o.blink) { p(6, 6, 1, 1, '#d9a983'); p(9, 6, 1, 1, '#d9a983'); }
  else { p(6, 6, 1, 1, EYE); p(9, 6, 1, 1, EYE); }
  p(5, 7, 1, 1, BLUSH); p(10, 7, 1, 1, BLUSH);
  p(7, 8, 2, 1, MOUTH);
  if (L.acc === 'glasses') { p(5, 6, 6, 1, '#1d1d1d'); p(6, 6, 1, 1, '#9fd0ff'); p(9, 6, 1, 1, '#9fd0ff'); }
  if (L.acc === 'beret') { p(4, 1, 8, 2, '#7b4fa0'); p(3, 2, 1, 1, '#7b4fa0'); p(9, 0, 2, 1, '#7b4fa0'); }
  if (L.acc === 'headset') { p(4, 1, 8, 1, '#2d2d2d'); p(3, 4, 1, 3, '#2d2d2d'); p(12, 4, 1, 3, '#2d2d2d'); p(11, 8, 2, 1, '#2d2d2d'); }
  if (L.acc === 'cap') { p(5, 0, 6, 1, '#c94f4f'); p(4, 1, 8, 3, '#c94f4f'); p(7, 1, 2, 1, '#e8e8e8'); }
}

function drawBack(g, L, o) {
  const p = P(g);
  p(5, 10, 6, 1, L.shirt); p(4, 11, 8, 5, L.shirt); p(4, 15, 8, 1, L.shade);
  const a = o.walk ? (o.frame ? 1 : -1) : 0;
  p(3, 11, 1, 4, L.shirt); p(12, 11, 1, 4, L.shirt);
  p(3, 15 + (a > 0 ? -1 : 0), 1, 1, L.skin); p(12, 15 + (a < 0 ? -1 : 0), 1, 1, L.skin);
  if (o.carry) { p(3, 13, 1, 2, L.skin); p(12, 13, 1, 2, L.skin); }
  p(5, 16, 6, 1, L.pants);
  const l = o.walk && o.frame === 0 ? 1 : 0, r = o.walk && o.frame === 1 ? 1 : 0;
  p(5, 16, 2, 3 - l, L.pants); p(9, 16, 2, 3 - r, L.pants);
  p(5, 19 - l, 2, 1, L.shoes); p(9, 19 - r, 2, 1, L.shoes);
  p(5, 1, 6, 1, L.hair); p(4, 2, 8, 7, L.hair); p(5, 9, 6, 1, L.skin);
  if (L.style === 'long') p(3, 4, 10, 8, L.hair);
  if (L.style === 'bun') { p(6, -1, 4, 2, L.hair); p(7, -2, 2, 1, L.hair); }
  if (L.acc === 'beret') { p(4, 1, 8, 2, '#7b4fa0'); p(9, 0, 2, 1, '#7b4fa0'); }
  if (L.acc === 'headset') { p(4, 1, 8, 1, '#2d2d2d'); p(3, 4, 1, 3, '#2d2d2d'); p(12, 4, 1, 3, '#2d2d2d'); }
  if (L.acc === 'cap') { p(5, 0, 6, 1, '#c94f4f'); p(4, 1, 8, 3, '#c94f4f'); p(5, 4, 6, 1, '#a33c3c'); }
}

function drawSide(g, L, o) {
  const p = P(g);
  if (L.style === 'long') p(3, 4, 3, 8, L.hair);
  p(5, 10, 6, 6, L.shirt); p(5, 15, 6, 1, L.shade);
  if (L.acc === 'coat') p(9, 10, 2, 3, '#8cbbe0');
  // chân
  if (o.walk) {
    const f = o.frame;
    p(f ? 8 : 5, 16, 2, 3, L.pants); p(f ? 5 : 8, 16, 2, 2, L.pants);
    p(f ? 8 : 5, 19, 3, 1, L.shoes); p(f ? 4 : 8, 18, 3, 1, L.shoes);
  } else {
    p(6, 16, 4, 3, L.pants); p(6, 19, 5, 1, L.shoes);
  }
  // tay
  if (o.carry) { p(9, 11, 2, 3, L.shade); p(10, 11, 4, 5, '#fffdf6'); p(11, 12, 2, 1, '#b9b2a6'); p(11, 14, 2, 1, '#b9b2a6'); }
  else {
    const sx = o.walk ? (o.frame ? 8 : 6) : 7;
    p(sx, 11, 2, 4, L.shade); p(sx, 15, 2, 1, L.skin);
  }
  // đầu
  p(5, 1, 6, 1, L.hair); p(4, 2, 8, 3, L.hair);
  p(6, 5, 6, 4, L.skin); p(7, 9, 4, 1, L.skin); p(12, 7, 1, 1, L.skin);
  p(4, 5, 3, 4, L.hair);
  p(10, 6, 1, 1, o.blink ? '#d9a983' : EYE); p(10, 8, 1, 1, MOUTH); p(9, 7, 1, 1, BLUSH);
  if (L.style === 'bun') { p(3, 0, 3, 2, L.hair); }
  if (L.acc === 'glasses') { p(8, 6, 4, 1, '#1d1d1d'); p(10, 6, 1, 1, '#9fd0ff'); }
  if (L.acc === 'beret') { p(4, 1, 8, 2, '#7b4fa0'); p(11, 2, 1, 1, '#7b4fa0'); }
  if (L.acc === 'headset') { p(5, 1, 6, 1, '#2d2d2d'); p(6, 5, 2, 3, '#2d2d2d'); p(8, 8, 3, 1, '#2d2d2d'); }
  if (L.acc === 'cap') { p(5, 0, 6, 1, '#c94f4f'); p(4, 1, 8, 3, '#c94f4f'); p(2, 3, 3, 1, '#a33c3c'); }
}

const cache = new Map();

/**
 * Lấy sprite đã vẽ sẵn.
 * dir: 'down' | 'up' | 'left' | 'right'
 * o: { walk, frame, sit, typing, carry, blink }
 */
export function sprite(id, dir, o = {}) {
  const key = `${id}|${dir}|${o.walk ? 1 : 0}${o.frame || 0}${o.sit ? 1 : 0}${o.typing === undefined ? 'x' : o.typing ? 1 : 0}${o.carry ? 1 : 0}${o.blink ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 16; c.height = 22;
  const g = c.getContext('2d');
  g.translate(0, 2); // chừa chỗ cho búi tóc
  const L = LOOKS[id];
  if (dir === 'up') drawBack(g, L, o);
  else if (dir === 'down') drawFront(g, L, o);
  else {
    if (dir === 'left') { g.translate(16, 0); g.scale(-1, 1); }
    drawSide(g, L, o);
  }
  cache.set(key, c);
  return c;
}

/** Vẽ chân dung nhỏ (dùng cho thẻ thành viên). */
export function portrait(id, scale = 3) {
  const c = document.createElement('canvas');
  c.width = 16 * scale; c.height = 14 * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite(id, 'down'), 0, 0, 16, 14, 0, 0, 16 * scale, 14 * scale);
  return c;
}
