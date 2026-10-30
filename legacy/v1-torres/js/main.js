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
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- render
function slotAt(x, y) {
  if (!G) return null;
  for (const s of G.slots) {
    if (s.kind === 'ground') { if (Math.abs(x - s.x) < 34 && y > s.y - 85 && y < s.y + 22) return s; }
    else if (Math.abs(x - s.x) < 29 && y > s.y - 75 && y < s.y + 8) return s;
  }
  return null;
}
function drawRange(c, t, key, tier) {
  const s = t.s || defStats(key, tier || 1);
  c.save();
  c.fillStyle = 'rgba(255,220,120,0.10)'; c.strokeStyle = 'rgba(255,220,120,0.55)'; c.lineWidth = 2; c.setLineDash([8, 6]);
  if (key === 'tesla') { c.beginPath(); c.arc(t.x, t.y - 84, s.range, 0, 7); c.fill(); c.stroke(); }
  else if (key === 'ballesta' || key === 'catapulta' || key === 'lanzallamas' || key === 'riel' || key === 'sierra') {
    const x0 = t.x + (key === 'catapulta' ? s.minRange : 0), x1 = Math.min(W, t.x + (key === 'sierra' ? 900 : s.range) + (key === 'lanzallamas' && t.roof ? 40 : 0));
    c.fillRect(x0, GROUND_Y - 34, x1 - x0, 60); c.strokeRect(x0, GROUND_Y - 34, x1 - x0, 60);
  } else if (key === 'mina') { c.beginPath(); c.ellipse(t.x, GROUND_Y, s.radius, s.radius * 0.35, 0, 0, 7); c.fill(); c.stroke(); }
  c.restore();
}
function drawNut(c, x, y, a, s, gold) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = gold ? '#fff0a0' : '#ffc229'; c.strokeStyle = '#7a4a06'; c.lineWidth = 1.5;
  c.beginPath(); for (let j = 0; j < 6; j++) c.lineTo(Math.cos(j * 1.047) * s, Math.sin(j * 1.047) * s); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#3a2203'; c.beginPath(); c.arc(0, 0, s * 0.42, 0, 7); c.fill();
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
  if (G.skyFlash > 0) { c.fillStyle = `rgba(210,225,255,${G.skyFlash * 0.4})`; c.fillRect(0, 0, W, GROUND_Y); }
  for (const d of G.decals) { c.globalAlpha = Math.min(1, d.life / 4) * 0.75; c.fillStyle = d.col; c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.3, 0, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  for (const p of G.patches) { const gr = c.createRadialGradient(p.x, GROUND_Y, 4, p.x, GROUND_Y, p.w * 1.2); gr.addColorStop(0, `rgba(255,120,30,${0.35 * Math.min(1, p.t)})`); gr.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = gr; c.fillRect(p.x - p.w * 1.3, GROUND_Y - 40, p.w * 2.6, 80); }

  if (G.slots.some(s => s.extra === 1)) drawScaffold(c);
  drawBunker(c, G, T);
  const hov = G.mode !== 'demo' ? slotAt(INPUT.mx, INPUT.my) : null;
  for (const s of G.slots) if (!s.tower) drawSlot(c, s, T, G.sel ? (slotAllowed(G.sel, s) ? 1 : 2) : 0);
  if (G.selTower) drawRange(c, G.selTower, G.selTower.key);
  for (const t of G.towers) if (t.roof) drawTower(c, t, T);

  const list = [];
  for (const t of G.towers) if (!t.roof) list.push([t.y, 0, t]);
  for (const z of G.zombies) if (!z.fly) list.push([z.y + (z.onGround ? 0 : z.gy - z.y), 1, z]);
  for (const g of G.gibs) list.push([g.gy, 2, g]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of list) { if (k === 0) drawTower(c, o, T); else if (k === 1) drawZombie(c, o, T); else drawGib(c, o); }
  for (const z of G.zombies) if (z.fly) drawZombie(c, z, T);

  // proyectiles
  for (const p of G.proj) {
    c.save(); c.translate(p.x, p.y);
    if (p.kind === 'arrow') {
      c.rotate(Math.atan2(p.vy, p.vx));
      c.fillStyle = '#d8c7a0'; c.fillRect(-16, -1.3, 26, 2.6);
      c.fillStyle = '#e8eef2'; c.beginPath(); c.moveTo(10, -3.5); c.lineTo(17, 0); c.lineTo(10, 3.5); c.fill();
      c.fillStyle = '#c8392b'; c.fillRect(-16, -3, 6, 2); c.fillRect(-16, 1, 6, 2);
    } else if (p.kind === 'rock') {
      c.rotate(p.a); c.fillStyle = '#8d8478'; c.strokeStyle = OUT; c.lineWidth = 1.5;
      c.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, r = 9 * (0.8 + ((i * 37) % 5) / 12); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      if (p.fire) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,140,40,0.6)'; c.beginPath(); c.arc(0, 0, 12, 0, 7); c.fill(); }
    } else if (p.kind === 'shell' || p.kind === 'bomblet') {
      const r = p.kind === 'shell' ? 6.5 : 4.5;
      c.fillStyle = '#25211d'; c.strokeStyle = '#000'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(-2, -2, r * 0.35, 0, 7); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,160,60,0.5)'; c.beginPath(); c.arc(-p.vx * 0.012, -p.vy * 0.012, r * 0.8, 0, 7); c.fill();
    } else if (p.kind === 'saw') {
      c.rotate(p.a); c.fillStyle = '#c9d1d8'; c.strokeStyle = OUT; c.lineWidth = 1.2;
      c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, r = i % 2 ? 10 : 14; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#4a4e54'; c.beginPath(); c.arc(0, 0, 3.5, 0, 7); c.fill();
    }
    c.restore();
  }
  for (const p of G.eproj) {
    const r = p.big ? 10 : 6;
    c.fillStyle = '#7fd52a'; c.strokeStyle = '#2e4a10'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(230,255,170,0.7)'; c.beginPath(); c.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.35, 0, 7); c.fill();
  }
  for (const d of G.drops) drawNut(c, d.x, d.y, d.a, d.gold ? 9 : 7, d.gold);

  // partículas
  for (const p of G.parts) { if (p.add) continue; c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.283); c.fill(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
  for (const p of G.parts) { if (!p.add) continue; c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.283); c.fill(); }
  c.globalAlpha = 1;
  for (const b of G.bolts) {
    const a = b.life / b.max;
    [[7, `rgba(100,120,255,${0.35 * a})`], [3.5, `rgba(170,190,255,${0.8 * a})`], [1.5, `rgba(255,255,255,${a})`]].forEach(([lw, col]) => {
      c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.beginPath(); b.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    });
  }
  for (const b of G.beams) {
    const a = b.life / b.max;
    [[22 * a, `rgba(40,220,200,${0.3 * a})`], [9 * a, `rgba(120,255,235,${0.7 * a})`], [3, `rgba(255,255,255,${a})`]].forEach(([lw, col]) => {
      c.strokeStyle = col; c.lineWidth = Math.max(0.5, lw); c.lineCap = 'round'; c.beginPath(); c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); c.stroke();
    });
  }
  c.globalCompositeOperation = 'source-over';
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

  // barra de jefe
  if (G.boss && !G.boss.dead) {
    const z = G.boss, bw = 460, bx = (W - bw) / 2, by = 64;
    c.fillStyle = 'rgba(14,10,8,0.85)'; roundRect(c, bx - 4, by - 4, bw + 8, 22, 8); c.fill();
    c.fillStyle = '#4a1410'; c.fillRect(bx, by, bw, 14);
    c.fillStyle = '#e8453c'; c.fillRect(bx, by, bw * Math.max(0, z.hp / z.maxHp), 14);
    if (z.maxArmor) { c.fillStyle = '#ffd24d'; c.fillRect(bx, by, bw * Math.max(0, z.armor / z.maxArmor), 4); }
    c.font = '13px Bungee, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(z.d.name.toUpperCase(), W / 2, by + 7.5);
  }

  // cursor / construcción / cañón
  if (INPUT.mx < 0 || G.paused || G.state === 'won' || G.state === 'lost') return;
  if (G.sel) {
    if (hov && !hov.tower && slotAllowed(G.sel, hov)) {
      const ghost = { key: G.sel, x: hov.x, y: hov.y, roof: hov.kind === 'roof', tier: 1, ang: -0.1, recoil: 0, armT: 9, cd: 0, genT: 3, s: defStats(G.sel, 1), hp: 1, flash: 0, charge: 1, anim: 0 };
      drawRange(c, ghost, G.sel);
      c.save(); c.globalAlpha = 0.6; c.translate(hov.x, hov.y); drawTowerBody(c, ghost, T); c.restore();
    }
    return;
  }
  if (hov && hov.tower) {
    c.strokeStyle = 'rgba(255,220,120,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(hov.x, hov.y + 4, 32, 9, 0, 0, 7); c.stroke();
    return;
  }
  if (INPUT.my < GROUND_Y + 40 && INPUT.mx > 225) {
    const cs = cannonStats(), ready = G.cannon.cd <= 0;
    const tx = INPUT.mx, ty = Math.min(INPUT.my, GROUND_Y + 10);
    const sx = 46 + Math.cos(G.cannon.ang) * 50, sy = BUNKER_TOP - 42 + Math.sin(G.cannon.ang) * 50;
    const Tf = 0.45 + dist(sx, sy, tx, ty) / 1500, v = aim(sx, sy, tx, ty, Tf, GRAV);
    c.fillStyle = ready ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)';
    for (let i = 1; i < 18; i++) { const tt = Tf * i / 18; c.beginPath(); c.arc(sx + v.vx * tt, sy + v.vy * tt + 0.5 * GRAV * tt * tt, 2.2, 0, 7); c.fill(); }
    c.strokeStyle = ready ? 'rgba(255,240,200,0.9)' : 'rgba(255,120,90,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(tx, ty, cs.r, cs.r * (ty > GROUND_Y - 30 ? 0.35 : 1), 0, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(tx - 10, ty); c.lineTo(tx + 10, ty); c.moveTo(tx, ty - 10); c.lineTo(tx, ty + 10); c.stroke();
    if (!ready) { c.strokeStyle = '#ffc229'; c.lineWidth = 4; c.beginPath(); c.arc(tx, ty - 26, 9, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - G.cannon.cd / G.cannon.max)); c.stroke(); }
  }
}

// ---------------------------------------------------------------- entrada
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; }
cv.addEventListener('pointermove', e => { const p = toLogical(e); INPUT.mx = p.x; INPUT.my = p.y; });
cv.addEventListener('pointerleave', () => { INPUT.mx = -1; INPUT.my = -1; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (SCREEN !== 'game' || !G || G.paused || G.state === 'won' || G.state === 'lost') return;
  const p = toLogical(e); INPUT.mx = p.x; INPUT.my = p.y;
  if (e.button === 2) { G.sel = null; UI.closeTP(); UI.refreshCards(); return; }
  const s = slotAt(p.x, p.y);
  if (G.sel) {
    if (s && !s.tower && slotAllowed(G.sel, s)) {
      if (G.scrap >= DEFENSES[G.sel].cost) placeTower(G.sel, s); else SFX.deny();
      G.sel = null;
    } else if (!s) G.sel = null;
    else SFX.deny();
    UI.refreshCards();
    return;
  }
  if (s && s.tower) { UI.openTP(s.tower); return; }
  UI.closeTP();
  if (p.y < GROUND_Y + 40 && p.x > 225) fireCannon(p.x, p.y);
});
addEventListener('pointerdown', () => { SFX.init(); SFX.resume(); }, true);
addEventListener('keydown', e => {
  if (SCREEN !== 'game' || !G) return;
  const pauseOpen = !!document.querySelector('#modal .panel.pause');
  if (UI.modalOpen && !pauseOpen) return;
  if (e.code === 'Space') { e.preventDefault(); pauseOpen ? UI.resume() : UI.pause(); }
  else if (e.code === 'Escape') { if (G.sel) { G.sel = null; UI.refreshCards(); } else if (G.selTower) UI.closeTP(); else pauseOpen ? UI.resume() : UI.pause(); }
  else if (pauseOpen) return;
  else if (e.key === 'f' || e.key === 'F') UI.toggleSpeed();
  else if (/^[1-9]$/.test(e.key)) UI.selectCardByIndex(+e.key - 1);
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
