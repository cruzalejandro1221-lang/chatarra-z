'use strict';
// Reproductor determinista de Chatarra Z para el tráiler.
// Cada plano (shot) es una partida real del juego, simulada a 60 pasos/s con azar sembrado:
// el cuadro del segundo t siempre sale igual, aunque se pida fuera de orden.
const SIM_FPS = 60, GS = 1.5; // escala juego (1280x720) → vídeo (1920x1080)
const TR = { shots: [], cur: null, renderRng: null };
const realRandom = Math.random;

// Stubs de audio e interfaz del juego.
window.SFX = new Proxy({}, { get: () => () => {} });
window.UI = new Proxy({
  banner(t, s, cls) { if (TR.cur) TR.cur.banner = { t, s, cls, at: G.t }; },
  matPos(m) { return ({ madera: [96, 96], tela: [170, 96], chatarra: [244, 96] })[m] || [100, 96]; },
  toast() {}, pulseMat() {}, refreshCards() {}, hudFlags() {}, result() {}, closeModal() {},
}, { get: (t, p) => (p in t ? t[p] : () => {}) });

let VIGNETTE = null;
function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

// ---------------------------------------------------------------- simulación
function shotAt(t) { for (const s of TR.shots) if (t >= s.t0 && t < s.t1) return s; return null; }
function prepareShot(s) {
  s.rng = mulberry32(s.seed || 7);
  Math.random = s.rng;
  SAVE = defaultSave();
  SAVE.maxLevel = s.maxLevel || 1;
  SAVE.up = Object.assign({}, s.up || {});
  SAVE.stash = Object.assign({}, s.stash || {});
  SAVE.loadout = s.loadout || ['piedra'];
  TR.cur = s; s.banner = null;
  G = newGame('level', s.level || 1);
  G.state = 'film'; G.wallMax = G.wallHp = s.wall || G.wallMax;
  if (s.weapon) G.player.weapon = s.weapon;
  s.G = G; s.save = SAVE; s.steps = 0; s.evi = 0; s.dragDone = {};
  (s.drags || []).forEach(d => { d.pull = null; });
  s.events = (s.events || []).slice().sort((a, b) => a[0] - b[0]);
  if (s.setup) s.setup(G);
  Math.random = realRandom;
}
function dragPull(s, d) {
  // Vector de arrastre que produce un tiro (casi) perfecto al objetivo actual.
  const z = d.pickZ ? d.pickZ(G) : G.zombies.filter(targetable).sort((a, b) => a.x - b.x)[0];
  if (!z) return null;
  G.player.weapon = d.weapon || G.player.weapon;
  const st = weaponStats(G.player.weapon);
  const v = autoAim(HAND.x, HAND.y, z, st.vmax * (d.power || 0.92), st.g, 0, d.head ? 1 : 0);
  if (!v) return null;
  const k = st.vmax / MAX_PULL;
  return { v, px: v.vx / k, py: v.vy / k };
}
function stepShot(s) {
  const ls = s.steps / SIM_FPS;
  while (s.evi < s.events.length && s.events[s.evi][0] <= ls) { s.events[s.evi][1](G, s); s.evi++; }
  // arrastres guionizados (con la mano en pantalla)
  G.aim = null;
  for (let i = 0; i < (s.drags || []).length; i++) {
    const d = s.drags[i];
    if (ls < d.t || s.dragDone[i]) continue;
    if (!d.pull) { d.pull = dragPull(s, d); }
    if (!d.pull) { s.dragDone[i] = 1; continue; }
    const f = Math.min(1, (ls - d.t) / d.dur), e = 1 - Math.pow(1 - f, 3);
    G.aim = { sx: d.from[0], sy: d.from[1], cx: d.from[0] - d.pull.px * e, cy: d.from[1] - d.pull.py * e };
    if (f >= 1 && ls >= d.t + d.dur + (d.hold || 0)) {
      const p = dragPull(s, d) || d.pull;
      G.player.cd = 0; throwWeapon(p.v.vx, p.v.vy);
      s.dragDone[i] = 1; G.aim = null;
    }
    break;
  }
  // bot: lanza solo, con el tiempo de un gesto humano
  const b = s.bot;
  if (b && ls >= (b.from || 0) && ls <= (b.to || 1e9) && !G.aim && G.player.cd <= 0 && G.t >= (G._next || 0)) {
    const zs = G.zombies.filter(z => targetable(z) && z.x < (b.maxX || 1100) && z.x > (b.minX || 0)).sort((a, c) => a.x - c.x);
    for (const z of zs) {
      const k = b.pick ? b.pick(z, G) : (b.weapon || 'piedra');
      const w = WEAPONS[k];
      if (w.ammo && !(G.ammo[w.ammo] > 0)) continue;
      G.player.weapon = k;
      const st = weaponStats(k);
      const v = autoAim(HAND.x, HAND.y, z, st.vmax * 0.95, st.g, b.err || 0.04, b.head || 0.3);
      if (v) { throwWeapon(v.vx, v.vy); G._next = G.t + (b.gest || 0.9) * (0.8 + Math.random() * 0.4); break; }
    }
  }
  updateGame(1 / SIM_FPS);
  s.steps++;
}
function advanceTo(s, local) {
  const target = Math.floor(local * SIM_FPS);
  if (!s.G || target < s.steps) prepareShot(s);
  G = s.G; SAVE = s.save; TR.cur = s;
  Math.random = s.rng;
  while (s.steps < target) stepShot(s);
  Math.random = realRandom;
}

// ---------------------------------------------------------------- cámara
function camAt(s, lt) {
  const keys = s.cam || [[0, 1, 640, 360]];
  let k0 = keys[0], k1 = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (lt >= keys[i][0] && lt <= keys[i + 1][0]) { k0 = keys[i]; k1 = keys[i + 1]; break; }
  if (lt <= keys[0][0]) k1 = k0 = keys[0];
  if (lt >= keys[keys.length - 1][0]) k0 = k1 = keys[keys.length - 1];
  const f = k1[0] === k0[0] ? 0 : ease(clamp((lt - k0[0]) / (k1[0] - k0[0]), 0, 1));
  const z = lerp(k0[1], k1[1], f);
  let fx = lerp(k0[2], k1[2], f), fy = lerp(k0[3], k1[3], f);
  fx = clamp(fx, 640 / z, 1280 - 640 / z); fy = clamp(fy, 360 / z, 720 - 360 / z);
  return { z, fx, fy };
}
function toScreen(cam, x, y) { return [(x - cam.fx) * cam.z * GS + 960, (y - cam.fy) * cam.z * GS + 540]; }

// ---------------------------------------------------------------- dibujo (adaptado de main.js)
function drawAimT(c) {
  const a = G.aim, v = aimFromPull(a.sx - a.cx, a.sy - a.cy), st = weaponStats(G.player.weapon);
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2.5; c.setLineDash([5, 5]);
  c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(a.cx, a.cy); c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(a.sx, a.sy, 6, 0, 7); c.fill();
  if (v.power > 0.05) {
    const pts = [];
    for (let t = 0; t < 3; t += 0.03) { const x = HAND.x + v.vx * t, y = HAND.y + v.vy * t + 0.5 * st.g * t * t; if (y > GROUND_Y + 14 || x > W) break; pts.push([x, y]); }
    const n = Math.max(2, Math.ceil(pts.length * aimPct(up('punteria')) / 100));
    for (let i = 1; i < n && i < pts.length; i++) { const f = 1 - i / n; c.fillStyle = `rgba(255,236,170,${0.3 + 0.65 * f})`; c.beginPath(); c.arc(pts[i][0], pts[i][1], 3.2 * (0.5 + 0.5 * f), 0, 7); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(70, BUNKER_TOP - 98, 8, 46);
    c.fillStyle = v.power > 0.95 ? '#ff7a52' : '#ffc229'; c.fillRect(71, BUNKER_TOP - 53 - 44 * v.power, 6, 44 * v.power);
  }
  c.restore();
}
function renderShot(c, s, cam, frameIdx) {
  Math.random = mulberry32(frameIdx * 9973 + 17);
  const T = G.t;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = THEMES[G.world].ground[2]; c.fillRect(0, 0, 1920, 1080);
  c.setTransform(cam.z * GS, 0, 0, cam.z * GS, 960 - cam.fx * cam.z * GS, 540 - cam.fy * cam.z * GS);
  c.save();
  const sh = Math.min(G.shake, 16);
  if (sh > 0.4) c.translate(rand(-sh, sh) * 0.6, rand(-sh, sh) * 0.6);
  c.drawImage(G.bg, 0, 0, W, H);
  drawClouds(c, G.world, T);
  for (const d of G.decals) { c.globalAlpha = Math.min(1, d.life / 4) * 0.75; c.fillStyle = d.col; c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.3, 0, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  for (const p of G.patches) { const gr = c.createRadialGradient(p.x, GROUND_Y, 4, p.x, GROUND_Y, p.w * 1.2); gr.addColorStop(0, `rgba(255,120,30,${0.35 * Math.min(1, p.t)})`); gr.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = gr; c.fillRect(p.x - p.w * 1.3, GROUND_Y - 40, p.w * 2.6, 80); }
  drawBunker(c, G, T);
  if (s.slots) for (const sl of G.slots) if (!sl.tower) drawSlot(c, sl, T, 0);
  for (const t of G.towers) if (t.roof) drawTower(c, t, T);
  drawSurvivor(c, G, T);
  const list = [];
  for (const t of G.towers) if (!t.roof) list.push([t.y - (t.key === 'puas' ? 20 : 0), 0, t]);
  for (const z of G.zombies) list.push([z.onGround ? z.y : z.gy, 1, z]);
  for (const g of G.gibs) list.push([g.gy, 2, g]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of list) { if (k === 0) drawTower(c, o, T); else if (k === 1) drawZombie(c, o, T); else drawGib(c, o); }
  for (const p of G.proj) drawThrowable(c, p.kind, p.x, p.y, p.a, 1);
  for (const d of G.drops) drawMat(c, d.mat, d.x, d.y, d.a);
  for (const p of G.parts) { if (p.add) continue; c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.283); c.fill(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
  for (const p of G.parts) { if (!p.add) continue; c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.283); c.fill(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  for (const r of G.rings) { const f = 1 - r.life / r.maxLife; c.strokeStyle = `rgba(${r.col},${(1 - f) * 0.7})`; c.lineWidth = 3 * (1 - f) + 1; c.beginPath(); c.ellipse(r.x, r.y, lerp(r.r, r.max, f), lerp(r.r, r.max, f) * 0.6, 0, 0, 7); c.stroke(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const t of G.texts) { c.globalAlpha = Math.min(1, t.life * 2); c.font = `800 ${t.size + 4}px Outfit, sans-serif`; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(t.s, t.x, t.y); c.fillStyle = t.col; c.fillText(t.s, t.x, t.y); }
  c.globalAlpha = 1;
  drawWeather(c, G.world, T);
  if (G.aim) drawAimT(c);
  c.restore();
  c.setTransform(GS, 0, 0, GS, 0, 0);
  c.drawImage(VIGNETTE, 0, 0);
  if (G.boss && !G.boss.dead) {
    const z = G.boss, bw = 520, bx = (W - bw) / 2, by = 40;
    c.fillStyle = 'rgba(14,10,8,0.85)'; roundRect(c, bx - 4, by - 4, bw + 8, 26, 8); c.fill();
    c.fillStyle = '#4a1410'; c.fillRect(bx, by, bw, 18);
    c.fillStyle = '#e8453c'; c.fillRect(bx, by, bw * Math.max(0, z.hp / z.maxHp), 18);
    c.font = '15px "Archivo Black", sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(z.d.name.toUpperCase(), W / 2, by + 9.5);
  }
  Math.random = realRandom;
}

// ---------------------------------------------------------------- superposiciones HTML
const OV = {};
function updateOverlays(s, cam, t) {
  const lt = t - s.t0, ls = lt + (s.pre || 0);
  // mano que arrastra
  let hand = null;
  for (const d of s.drags || []) {
    if (ls >= d.t - 0.45 && ls <= d.t + d.dur + (d.hold || 0) + 0.35) {
      if (G.aim && ls >= d.t) hand = [G.aim.cx, G.aim.cy, 1];
      else if (ls < d.t) hand = [d.from[0] + 40 * (d.t - ls) / 0.45, d.from[1] + 30 * (d.t - ls) / 0.45, 0];
      else hand = d.pull ? [d.from[0] - d.pull.px, d.from[1] - d.pull.py, 0] : null;
      break;
    }
  }
  if (hand) {
    const [x, y] = toScreen(cam, hand[0], hand[1]);
    OV.hand.style.opacity = 1;
    OV.hand.style.transform = `translate(${x - 26}px, ${y - 10}px) scale(${hand[2] ? 0.9 : 1})`;
  } else OV.hand.style.opacity = 0;
  // contador de munición
  if (s.ammo) {
    const n = G.ammo[s.ammo] !== undefined ? G.ammo[s.ammo] : 0;
    OV.ammo.style.opacity = 1; OV.ammoN.textContent = n; OV.ammoL.textContent = s.ammoLabel || AMMO[s.ammo].name;
    OV.ammo.classList.toggle('low', n <= 1);
  } else OV.ammo.style.opacity = 0;
  // materiales
  if (s.mats) {
    OV.mats.style.opacity = 1;
    for (const m of MAT_ORDER) OV['m_' + m].textContent = G.mats[m];
  } else OV.mats.style.opacity = 0;
  // cartel del propio juego (jefe, victoria)
  const b = s.banner;
  if (b && G.t - b.at < 2.6) {
    const age = G.t - b.at, op = age < 0.15 ? age / 0.15 : age > 2.2 ? (2.6 - age) / 0.4 : 1;
    OV.banner.style.opacity = op; OV.bannerT.textContent = b.t; OV.bannerS.textContent = b.s || '';
    OV.banner.className = b.cls || '';
    OV.bannerT.style.transform = `scale(${age < 0.15 ? 1.4 - age / 0.15 * 0.4 : 1})`;
  } else OV.banner.style.opacity = 0;
  // pips de puntería
  if (s.pips) {
    OV.pips.style.opacity = 1;
    const l = up('punteria');
    OV.pipsI.forEach((p, i) => p.classList.toggle('on', i < l));
    OV.pipsT.textContent = `Ves el ${aimPct(l)}% del tiro`;
  } else OV.pips.style.opacity = 0;
}

function initPlayer(canvas) {
  canvas.width = 1920; canvas.height = 1080;
  const c = canvas.getContext('2d');
  VIGNETTE = makeVignette();
  ['hand', 'ammo', 'ammoN', 'ammoL', 'mats', 'banner', 'bannerT', 'bannerS', 'pips', 'pipsT'].forEach(k => { OV[k] = document.getElementById('g-' + k); });
  for (const m of MAT_ORDER) OV['m_' + m] = document.getElementById('g-m-' + m);
  OV.pipsI = [...document.querySelectorAll('#g-pips i')];
  function renderAt(t) {
    const s = shotAt(t);
    if (!s) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1a140e'; c.fillRect(0, 0, 1920, 1080); ['hand', 'ammo', 'mats', 'banner', 'pips'].forEach(k => { OV[k].style.opacity = 0; }); return; }
    const lt = t - s.t0;
    advanceTo(s, lt + (s.pre || 0));
    if (s.onFrame) s.onFrame(G, lt);
    const cam = camAt(s, lt);
    renderShot(c, s, cam, Math.round(t * 30));
    updateOverlays(s, cam, t);
  }
  window.addEventListener('hf-seek', e => renderAt(e.detail.time));
  renderAt(0);
}
