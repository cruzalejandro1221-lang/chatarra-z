'use strict';
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const fmt = n => Math.floor(n).toLocaleString('es');

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// amt > 0 aclara, amt < 0 oscurece. Devuelve hex para poder encadenar.
function shade(h, amt) {
  const [r, g, b] = hexToRgb(h);
  const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function rgba(h, a) {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const ICONS = {
  nut: '<svg viewBox="0 0 24 24"><path fill="#ffc229" stroke="#7a4a06" stroke-width="1.5" d="M12 1.8l8.8 5.1v10.2L12 22.2 3.2 17.1V6.9z"/><circle cx="12" cy="12" r="4" fill="#3a2203"/><path d="M6 8.5l6-3.4 6 3.4" stroke="#fff3c4" stroke-width="1.3" fill="none" opacity=".7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path fill="#ffc229" stroke="#7a4a06" stroke-width="1.2" d="M10.3 1.5h3.4l.5 2.7 1.8.8 2.3-1.6 2.4 2.4-1.6 2.3.8 1.8 2.6.5v3.4l-2.6.5-.8 1.8 1.6 2.3-2.4 2.4-2.3-1.6-1.8.8-.5 2.7h-3.4l-.5-2.7-1.8-.8-2.3 1.6-2.4-2.4 1.6-2.3-.8-1.8-2.6-.5v-3.4l2.6-.5.8-1.8-1.6-2.3 2.4-2.4 2.3 1.6 1.8-.8z"/><circle cx="12" cy="12" r="3.6" fill="#3a2203"/></svg>',
  wall: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h18v16H3z" opacity=".25"/><path fill="none" stroke="currentColor" stroke-width="2" d="M3 4h18v16H3zM3 9.3h18M3 14.6h18M9 4v5.3M15 9.3v5.3M9 14.6V20"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="rgba(0,0,0,.35)" stroke-width="1" d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7.1L12 17.8l-6.3 3.4L7 14.1 1.8 9.2l7.1-.9z"/></svg>',
  skull: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.9 2 3 5.7 3 10.4c0 2.8 1.4 5 3.5 6.3V20c0 .9.7 1.6 1.6 1.6h1.2v-2h1.4v2h2.6v-2h1.4v2h1.2c.9 0 1.6-.7 1.6-1.6v-3.3c2.1-1.3 3.5-3.5 3.5-6.3C21 5.7 17.1 2 12 2z"/><circle cx="8.4" cy="11" r="2.3" fill="#2a1a05"/><circle cx="15.6" cy="11" r="2.3" fill="#2a1a05"/><path d="M12 13.5l-1.2 2.4h2.4z" fill="#2a1a05"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 10V7.5a6 6 0 0112 0V10h1.2c.7 0 1.3.6 1.3 1.3v9.4c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3v-9.4c0-.7.6-1.3 1.3-1.3zm3 0h6V7.5a3 3 0 00-6 0z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path fill="#d6382a" stroke="#2a0a05" stroke-width="1.3" d="M5 3v19M5 4h13l-3 4 3 4H5"/></svg>',
  flagdone: '<svg viewBox="0 0 24 24"><path fill="#79d96a" stroke="#0f2a0c" stroke-width="1.3" d="M5 3v19M5 4h13l-3 4 3 4H5"/></svg>',
  bossflag: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#d6382a" stroke="#2a0a05" stroke-width="1.5"/><path fill="#fff" d="M12 5.5c-3.3 0-5.8 2.4-5.8 5.4 0 1.8.9 3.2 2.3 4.1v2.1c0 .6.4 1 1 1h5c.6 0 1-.4 1-1V15c1.4-.9 2.3-2.3 2.3-4.1 0-3-2.5-5.4-5.8-5.4z"/><circle cx="9.7" cy="11" r="1.5" fill="#d6382a"/><circle cx="14.3" cy="11" r="1.5" fill="#d6382a"/></svg>',
};
function ico(name, cls) { return `<span class="ico ${cls || ''}">${ICONS[name]}</span>`; }
