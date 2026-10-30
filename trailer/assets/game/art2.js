'use strict';
// Mundo 1: personas, objetos lanzables, materiales y defensas de madera.
function limbS(ctx, x1, y1, x2, y2, w, col) {
  ctx.strokeStyle = C(OUT); ctx.lineWidth = w + 3; line(ctx, x1, y1, x2, y2);
  ctx.strokeStyle = C(col); ctx.lineWidth = w; line(ctx, x1, y1, x2, y2);
}
function drawThrowable(ctx, kind, x, y, a, s) {
  s = s || 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a || 0); ctx.scale(s, s);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
  if (kind === 'rock' || kind === 'pebble') {
    const r = kind === 'rock' ? 6.5 : 4;
    ctx.fillStyle = kind === 'rock' ? '#8d8478' : '#a39a8c'; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const aa = i / 7 * 6.283, rr = r * (0.8 + ((i * 37) % 5) / 12); ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(ctx, -r * 0.3, -r * 0.3, r * 0.3); ctx.fill();
  } else if (kind === 'stick') {
    roundRect(ctx, -16, -3, 32, 6, 3); ctx.fillStyle = '#8a6038'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 1; line(ctx, -10, -1, 4, -1); line(ctx, 8, -6, 12, -2);
  } else if (kind === 'arrow' || kind === 'firearrow') {
    ctx.fillStyle = '#d8c7a0'; ctx.fillRect(-16, -1.3, 26, 2.6);
    ctx.fillStyle = '#e8eef2'; ctx.beginPath(); ctx.moveTo(10, -3.5); ctx.lineTo(17, 0); ctx.lineTo(10, 3.5); ctx.fill();
    ctx.fillStyle = '#c8392b'; ctx.fillRect(-16, -3, 6, 2); ctx.fillRect(-16, 1, 6, 2);
    if (kind === 'firearrow') {
      ctx.fillStyle = '#e6dcc4'; ctx.fillRect(7, -3, 4, 6);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,150,50,0.85)'; circle(ctx, 11, 0, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,140,0.9)'; circle(ctx, 11, 0, 2.5); ctx.fill();
    }
  } else if (kind === 'molotov') {
    roundRect(ctx, -5, -4, 11, 15, 3); ctx.fillStyle = '#5f7a3a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,190,80,0.6)'; ctx.fillRect(-4, 3, 9, 7);
    ctx.fillStyle = '#4a5f2c'; ctx.fillRect(-2, -9, 5, 6); ctx.strokeRect(-2, -9, 5, 6);
    ctx.fillStyle = '#e6dcc4'; ctx.beginPath(); ctx.moveTo(-1, -9); ctx.lineTo(2, -15); ctx.lineTo(4, -9); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,150,50,0.85)'; circle(ctx, 2, -16, 4); ctx.fill();
  }
  ctx.restore();
}
function drawMat(ctx, mat, x, y, a, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); if (s) ctx.scale(s, s);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
  if (mat === 'madera') {
    roundRect(ctx, -8, -3, 16, 6, 1.5); ctx.fillStyle = '#b07a42'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7a5028'; ctx.lineWidth = 1; line(ctx, -5, -1, 5, -1);
  } else if (mat === 'tela') {
    ctx.fillStyle = '#e6dcc4'; ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12);
    ctx.fillStyle = '#c8392b'; ctx.fillRect(-6, -2, 12, 2.5);
  } else {
    ctx.fillStyle = '#9aa3ab'; ctx.beginPath();
    for (let j = 0; j < 6; j++) ctx.lineTo(Math.cos(j * 1.047) * 6.5, Math.sin(j * 1.047) * 6.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3f44'; circle(ctx, 0, 0, 2.5); ctx.fill();
  }
  ctx.restore();
}

// Persona de pie mirando a la derecha. o.armA = ángulo del brazo que lanza; o.bow = {a, pull, loaded, kind}.
function drawPerson(ctx, x, fy, o, T) {
  const br = Math.sin(T * 2 + (o.seed || 0)) * 0.8;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  limbS(ctx, x - 3, fy - 22, x - 8, fy - 2, 6, shade(o.pants, -0.25));
  limbS(ctx, x + 3, fy - 22, x + 8, fy - 2, 6, o.pants);
  ctx.fillStyle = C('#2a211a'); roundRect(ctx, x - 12, fy - 4, 9, 5, 2); ctx.fill(); roundRect(ctx, x + 5, fy - 4, 10, 5, 2); ctx.fill();
  const sx = x + 2, sy = fy - 43 + br;
  if (!o.bow) limbS(ctx, sx - 4, sy + 2, sx - 4 + Math.cos(o.otherA) * 18, sy + 2 + Math.sin(o.otherA) * 18, 5, shade(o.jacket, -0.3));
  if (o.pack) { roundRect(ctx, x - 18, fy - 46 + br, 10, 19, 3); ctx.fillStyle = C('#5a4a32'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke(); }
  roundRect(ctx, x - 9, fy - 48 + br, 18, 28, 5); ctx.fillStyle = C(o.jacket); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = C(shade(o.jacket, -0.25)); ctx.fillRect(x + 2, fy - 46 + br, 5, 24);
  ctx.fillStyle = C(o.scarf || '#c8392b'); roundRect(ctx, x - 7, fy - 50 + br, 15, 5, 2); ctx.fill();
  const hx = x + 1, hy = fy - 57 + br;
  ctx.fillStyle = C(o.skin || '#dcae84'); circle(ctx, hx, hy, 8); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = C(o.hat); ctx.beginPath(); ctx.arc(hx, hy - 1, 8.3, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C('#1a120c'); circle(ctx, hx + 4.5, hy + 0.5, 1.3); ctx.fill();
  if (o.bow) {
    const a = o.bow.a, bx = sx + Math.cos(a) * 20, by = sy + Math.sin(a) * 20;
    const px = -Math.sin(a), py = Math.cos(a), pullD = 4 + o.bow.pull * 13;
    const strX = bx - Math.cos(a) * pullD, strY = by - Math.sin(a) * pullD;
    const tipAx = bx + px * 15 - Math.cos(a) * 3, tipAy = by + py * 15 - Math.sin(a) * 3;
    const tipBx = bx - px * 15 - Math.cos(a) * 3, tipBy = by - py * 15 - Math.sin(a) * 3;
    limbS(ctx, sx, sy, bx, by, 5, o.jacket);
    limbS(ctx, sx - 3, sy + 2, strX, strY, 5, shade(o.jacket, -0.3));
    ctx.strokeStyle = C('#7a5230'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tipAx, tipAy); ctx.quadraticCurveTo(bx + Math.cos(a) * 8, by + Math.sin(a) * 8, tipBx, tipBy); ctx.stroke();
    ctx.strokeStyle = C('#efe8d6'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tipAx, tipAy); ctx.lineTo(strX, strY); ctx.lineTo(tipBx, tipBy); ctx.stroke();
    if (o.bow.loaded) drawThrowable(ctx, o.bow.kind, strX + Math.cos(a) * 14, strY + Math.sin(a) * 14, a, 0.9);
  } else {
    const ex = sx + Math.cos(o.armA) * 11, ey = sy + Math.sin(o.armA) * 11;
    const a2 = o.armA + (o.armA < -1 ? 0.5 : -0.25), hx2 = ex + Math.cos(a2) * 10, hy2 = ey + Math.sin(a2) * 10;
    ctx.strokeStyle = C(OUT); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx2, hy2); ctx.stroke();
    ctx.strokeStyle = C(o.jacket); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx2, hy2); ctx.stroke();
    ctx.fillStyle = C(o.skin || '#dcae84'); circle(ctx, hx2, hy2, 3); ctx.fill();
    if (o.item) drawThrowable(ctx, o.item, hx2, hy2 - 2, o.armA, 0.9);
  }
  ctx.restore();
}
function drawSurvivor(ctx, G, T) {
  const pl = G.player, w = WEAPONS[pl.weapon], fy = BUNKER_TOP - 8;
  const bow = w.kind === 'arrow' || w.kind === 'firearrow';
  const aiming = !!G.aim, ready = G.mode === 'demo' || canThrow();
  const pull = aiming ? aimFromPull(G.aim.sx - G.aim.cx, G.aim.sy - G.aim.cy).power : 0;
  const o = { jacket: '#6b6a3a', pants: '#36405a', hat: '#b8442e', pack: true, seed: 0 };
  if (bow) o.bow = { a: aiming ? pl.ang : -0.2, pull, loaded: ready && pl.anim < 0.3, kind: w.kind };
  else {
    o.armA = aiming ? -2.45 - pull * 0.2 : pl.anim > 0 ? lerp(1.15, pl.ang, pl.anim) : 1.15 + Math.sin(T * 2) * 0.05;
    o.otherA = aiming ? pl.ang : 1.45;
    o.item = ready && pl.anim < 0.3 ? w.kind : null;
  }
  drawPerson(ctx, 110, fy, o, T);
}

Object.assign(TOWER_DRAW, {
  tablas(ctx, t) {
    const f = t.hp / t.s.maxHp;
    ctx.fillStyle = C('#5b3d22'); ctx.fillRect(-22, -64, 7, 64); ctx.fillRect(16, -58, 7, 58);
    ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.strokeRect(-22, -64, 7, 64); ctx.strokeRect(16, -58, 7, 58);
    [[-12, -0.08], [-30, 0.1], [-48, -0.05]].forEach(([y, r], i) => {
      if (f < 0.34 && i === 2) return;
      ctx.save(); ctx.translate(0, y); ctx.rotate(r);
      ctx.fillStyle = C(i % 2 ? '#a57a48' : '#8a6038'); ctx.fillRect(-30, -6, 60, 12);
      ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.strokeRect(-30, -6, 60, 12);
      ctx.strokeStyle = C('#6b4a2a'); ctx.lineWidth = 1; line(ctx, -24, -2, 20, -2); line(ctx, -14, 3, 26, 3);
      ctx.fillStyle = C('#cfd5da'); circle(ctx, -18, 0, 1.6); ctx.fill(); circle(ctx, 19, 0, 1.6); ctx.fill();
      ctx.restore();
    });
    if (f < 0.66) { ctx.strokeStyle = C('#2a1a0e'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(0, -28); ctx.lineTo(-4, -20); ctx.stroke(); }
  },
  puas(ctx, t) {
    const f = t.hp / t.s.maxHp;
    ctx.fillStyle = C('#6b4a2a'); ctx.beginPath(); ctx.ellipse(0, 2, 32, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C('#c8ccd0');
    const n = Math.max(3, Math.round(9 * f));
    for (let i = 0; i < n; i++) {
      const x = -26 + i * (52 / (n - 1));
      ctx.beginPath(); ctx.moveTo(x - 3, 2); ctx.lineTo(x, -11 - (i % 2) * 3); ctx.lineTo(x + 3, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  },
  aliado(ctx, t, T) {
    drawPerson(ctx, 0, 0, { jacket: '#3f6b5a', pants: '#3a3326', hat: '#d9a520', scarf: '#2f4a6b', seed: t.anim || 0, armA: t.throwA > 0 ? lerp(1.15, t.ang, t.throwA) : 1.15, otherA: 1.4, item: (t.cd || 0) < 0.5 ? 'rock' : null }, T);
  },
});

function makeItemIcon(key, w, h) {
  w = w || 72; h = h || 60;
  if (STRUCTS[key]) return makeTowerIcon(key, w, h);
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const kind = WEAPONS[key].kind;
  if (key === 'honda') {
    g.save(); g.translate(w / 2, h / 2 + 4); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(0, 18); g.lineTo(0, 2); g.lineTo(-11, -14); g.moveTo(0, 2); g.lineTo(11, -14);
    g.strokeStyle = OUT; g.lineWidth = 8; g.stroke(); g.strokeStyle = '#8a6038'; g.lineWidth = 5; g.stroke();
    g.strokeStyle = '#c8392b'; g.lineWidth = 2; g.beginPath(); g.moveTo(-11, -14); g.quadraticCurveTo(0, 2, 11, -14); g.stroke();
    g.restore();
    drawThrowable(g, 'pebble', w / 2, h / 2 - 2, 0, 1.4);
  } else if (kind === 'arrow' || kind === 'firearrow') {
    g.save(); g.translate(w / 2 - 6, h / 2);
    g.beginPath(); g.arc(-4, 0, 20, -1.2, 1.2); g.strokeStyle = OUT; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#7a5230'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = '#efe8d6'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.cos(-1.2) * 20 - 4, Math.sin(-1.2) * 20); g.lineTo(Math.cos(1.2) * 20 - 4, Math.sin(1.2) * 20); g.stroke();
    g.restore();
    drawThrowable(g, kind, w / 2 + 2, h / 2, -0.5, 1.2);
  } else drawThrowable(g, kind, w / 2, h / 2 + 2, kind === 'stick' ? -0.6 : 0, kind === 'stick' ? 1.3 : 2);
  return c;
}
function makeMatIcon(mat, s) {
  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
  const g = c.getContext('2d'); g.scale(2, 2); drawMat(g, mat, 12, 12, mat === 'madera' ? -0.4 : 0, s || 1.3);
  return c;
}
