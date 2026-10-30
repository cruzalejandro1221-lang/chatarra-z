'use strict';
const stage = document.getElementById('stage');
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const uiRoot = document.getElementById('ui');
let SCALE = 1, DPR = 1, VIGNETTE = null;

function resize() {
  SCALE = Math.min(innerWidth / W, innerHeight / H);
  DPR = Math.min(2, window.devicePixelRatio || 1);
  stage.style.width = W * SCALE + 'px'; stage.style.height = H * SCALE + 'px';
  cv.width = Math.round(W * SCALE * DPR); cv.height = Math.round(H * SCALE * DPR);
  cv.style.width = W * SCALE + 'px'; cv.style.height = H * SCALE + 'px';
  uiRoot.style.transform = `scale(${SCALE})`;
  // En celulares la interfaz se agranda para que se pueda leer y tocar.
  document.body.classList.toggle('phone', SCALE < 0.75);
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- render
function slotAt(x, y) {
  if (!G) return null;
  for (const s of G.slots) {
    if (s.kind === 'ground') { if (Math.abs(x - s.x) < 40 && y > s.y - 90 && y < s.y + 26) return s; }
    else if (Math.abs(x - s.x) < 30 && y > s.y - 75 && y < s.y + 10) return s;
  }
  return null;
}
// Trayectoria del tiro actual; muestra solo la fracción que permite la mejora de Puntería.
function drawAim(c, T) {
  const a = G.aim, pull = { x: a.sx - a.cx, y: a.sy - a.cy };
  const v = aimFromPull(pull.x, pull.y), st = weaponStats(G.player.weapon);
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.setLineDash([4, 4]);
  c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(a.cx, a.cy); c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(a.sx, a.sy, 6, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(a.cx, a.cy, 10, 0, 7); c.stroke();
  if (v.power > 0.05) {
    const pts = [];
    for (let t = 0; t < 3; t += 0.03) {
      const x = HAND.x + v.vx * t, y = HAND.y + v.vy * t + 0.5 * st.g * t * t;
      if (y > GROUND_Y + 14 || x > W) break;
      pts.push([x, y]);
    }
    const n = Math.max(2, Math.ceil(pts.length * aimPct(up('punteria')) / 100));
    const ok = canThrow();
    for (let i = 1; i < n && i < pts.length; i += 1) {
      const f = 1 - i / n;
      c.fillStyle = ok ? `rgba(255,236,170,${0.25 + 0.65 * f})` : `rgba(255,120,90,${0.2 + 0.4 * f})`;
      c.beginPath(); c.arc(pts[i][0], pts[i][1], 2.8 * (0.5 + 0.5 * f), 0, 7); c.fill();
    }
    // medidor de potencia junto al personaje
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(70, BUNKER_TOP - 98, 8, 46);
    c.fillStyle = v.power > 0.95 ? '#ff7a52' : '#ffc229'; c.fillRect(71, BUNKER_TOP - 53 - 44 * v.power, 6, 44 * v.power);
  }
  c.restore();
}

function renderGame(c) {
  const T = G.t;
  c.setTransform(SCALE * DPR, 0, 0, SCALE * DPR, 0, 0);
  c.fillStyle = THEMES[G.world].ground[2]; c.fillRect(0, 0, W, H);
  c.save();
  const sh = Math.min(G.shake, 16);
  if (sh > 0.4) c.translate(rand(-sh, sh) * 0.6, rand(-sh, sh) * 0.6);
  c.drawImage(G.bg, 0, 0, W, H);
  drawClouds(c, G.world, T);
  for (const d of G.decals) { c.globalAlpha = Math.min(1, d.life / 4) * 0.75; c.fillStyle = d.col; c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.3, 0, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  for (const p of G.patches) { const gr = c.createRadialGradient(p.x, GROUND_Y, 4, p.x, GROUND_Y, p.w * 1.2); gr.addColorStop(0, `rgba(255,120,30,${0.35 * Math.min(1, p.t)})`); gr.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = gr; c.fillRect(p.x - p.w * 1.3, GROUND_Y - 40, p.w * 2.6, 80); }

  drawBunker(c, G, T);
  if (G.mode === 'demo' || STRUCT_ORDER.some(k => G.ammo[STRUCTS[k].ammo] !== undefined))
    for (const s of G.slots) if (!s.tower) drawSlot(c, s, T, G.sel ? (slotAllowed(G.sel, s) ? 1 : 2) : 0);
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
  for (const r of G.rings) {
    const f = 1 - r.life / r.maxLife;
    c.strokeStyle = `rgba(${r.col},${(1 - f) * 0.7})`; c.lineWidth = 3 * (1 - f) + 1;
    c.beginPath(); c.ellipse(r.x, r.y, lerp(r.r, r.max, f), lerp(r.r, r.max, f) * 0.6, 0, 0, 7); c.stroke();
  }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const t of G.texts) {
    c.globalAlpha = Math.min(1, t.life * 2); c.font = `800 ${t.size}px Rubik, sans-serif`;
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.strokeText(t.s, t.x, t.y); c.fillStyle = t.col; c.fillText(t.s, t.x, t.y);
  }
  c.globalAlpha = 1;
  drawWeather(c, G.world, T);
  c.restore();

  c.drawImage(VIGNETTE, 0, 0);
  if (G.mode === 'demo') return;

  if (G.boss && !G.boss.dead) {
    const z = G.boss, bw = 460, bx = (W - bw) / 2, by = 64;
    c.fillStyle = 'rgba(14,10,8,0.85)'; roundRect(c, bx - 4, by - 4, bw + 8, 22, 8); c.fill();
    c.fillStyle = '#4a1410'; c.fillRect(bx, by, bw, 14);
    c.fillStyle = '#e8453c'; c.fillRect(bx, by, bw * Math.max(0, z.hp / z.maxHp), 14);
    c.font = '13px Bungee, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(z.d.name.toUpperCase(), W / 2, by + 7.5);
  }
  if (G.aim) drawAim(c, T);
  else if (!G.sel && G.player.cd > 0) {
    const f = 1 - G.player.cd / weaponStats(G.player.weapon).cd;
    c.strokeStyle = '#ffc229'; c.lineWidth = 3; c.beginPath(); c.arc(110, BUNKER_TOP - 92, 7, -Math.PI / 2, -Math.PI / 2 + 6.283 * f); c.stroke();
  }
  if (G.sel && INPUT.mx >= 0) {
    const hov = slotAt(INPUT.mx, INPUT.my);
    if (hov && !hov.tower && slotAllowed(G.sel, hov)) {
      const ghost = { key: G.sel, x: hov.x, y: hov.y, roof: hov.kind === 'roof', hp: 1, s: { maxHp: 1 }, cd: 0, anim: 0, throwA: 0, ang: 0, flash: 0 };
      c.save(); c.globalAlpha = 0.6; c.translate(hov.x, hov.y); drawTowerBody(c, ghost, T); c.restore();
    }
  }
}

// ---------------------------------------------------------------- entrada
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; }
function playing() { return SCREEN === 'game' && G && !G.paused && G.state !== 'won' && G.state !== 'lost'; }
cv.addEventListener('pointermove', e => {
  const p = toLogical(e); INPUT.mx = p.x; INPUT.my = p.y;
  if (G && G.aim) { G.aim.cx = p.x; G.aim.cy = p.y; }
});
cv.addEventListener('pointerleave', () => { INPUT.mx = -1; INPUT.my = -1; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (!playing()) return;
  const p = toLogical(e); INPUT.mx = p.x; INPUT.my = p.y;
  if (e.button === 2) { G.sel = null; G.aim = null; UI.refreshCards(); return; }
  if (G.sel) {
    const s = slotAt(p.x, p.y);
    if (s && !s.tower && slotAllowed(G.sel, s) && G.ammo[STRUCTS[G.sel].ammo] > 0) { placeStruct(G.sel, s); G.sel = null; }
    else if (!s) G.sel = null;
    else SFX.deny();
    UI.refreshCards();
    return;
  }
  G.aim = { sx: p.x, sy: p.y, cx: p.x, cy: p.y };
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
});
function releaseAim(e) {
  if (!G || !G.aim) return;
  const a = G.aim; G.aim = null;
  if (!playing()) return;
  if (e) { const p = toLogical(e); a.cx = p.x; a.cy = p.y; }
  const v = aimFromPull(a.sx - a.cx, a.sy - a.cy);
  if (v.power < 0.08) return;
  if (!canThrow()) { SFX.deny(); return; }
  throwWeapon(v.vx, v.vy);
  UI.refreshCards();
}
cv.addEventListener('pointerup', releaseAim);
cv.addEventListener('pointercancel', () => { if (G) G.aim = null; });
addEventListener('pointerdown', () => { SFX.init(); SFX.resume(); }, true);
addEventListener('keydown', e => {
  if (SCREEN !== 'game' || !G) return;
  const pauseOpen = !!document.querySelector('#modal .panel.pause');
  if (UI.modalOpen && !pauseOpen) return;
  if (e.code === 'Space') { e.preventDefault(); pauseOpen ? UI.resume() : UI.pause(); }
  else if (e.code === 'Escape') { if (G.sel || G.aim) { G.sel = null; G.aim = null; UI.refreshCards(); } else pauseOpen ? UI.resume() : UI.pause(); }
  else if (pauseOpen) return;
  else if (e.key === 'f' || e.key === 'F') UI.toggleSpeed();
  else if (/^[1-9]$/.test(e.key)) UI.selectWeaponByIndex(+e.key - 1);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && SCREEN === 'game' && G && !G.paused) UI.pause(); });

// ---------------------------------------------------------------- bucle
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (G) {
    if (!G.paused) { const steps = G.mode === 'demo' ? 1 : G.speed; for (let i = 0; i < steps; i++) updateGame(dt); }
    renderGame(ctx);
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0a0806'; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  UI.hudTick(dt);
  requestAnimationFrame(frame);
}

loadSave();
resize();
VIGNETTE = makeVignette();
const boot = () => { UI.menu(); requestAnimationFrame(t => { lastT = t; frame(t); }); };
if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]).then(boot); else boot();
