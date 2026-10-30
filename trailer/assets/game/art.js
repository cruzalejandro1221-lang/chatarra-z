'use strict';
// Arte 100% procedural: escenarios, búnker, defensas y zombis dibujados con canvas.
const THEMES = [
  { sky: ['#1b1230', '#47224a', '#9c3f4c', '#e9804a', '#ffc070'], sun: { x: 930, y: 440, r: 78, col: '#ffd9a0', glow: [255, 170, 90] }, far: '#5e2e4c', far2: '#4a2442', mid: '#2c1828', ground: ['#6d4a32', '#4b3122', '#2a1b13'], top: '#8f6545', haze: [255, 140, 90], cloud: [255, 190, 160], metal: '#615a52' },
  { sky: ['#02040a', '#08112a', '#152446', '#2a3b62'], moon: { x: 1010, y: 130, r: 40 }, stars: true, far: '#1a2448', far2: '#121a36', mid: '#0a0f20', ground: ['#34373e', '#22242a', '#131418'], top: '#50545e', haze: [90, 120, 180], cloud: [70, 80, 110], metal: '#565a62' },
  { sky: ['#06110c', '#103020', '#2a5636', '#668f44', '#a2bb5c'], sun: { x: 310, y: 400, r: 58, col: '#eaf4b0', glow: [200, 240, 120] }, far: '#24452f', far2: '#1a3424', mid: '#0e2017', ground: ['#4c4829', '#35321c', '#1c1a0e'], top: '#625d35', haze: [150, 210, 110], cloud: [150, 190, 140], metal: '#5a5c4c' },
  { sky: ['#0d0305', '#260a0c', '#571510', '#ad3a16', '#ff8a2a'], far: '#40150f', far2: '#2e0f0c', mid: '#1b0a0a', ground: ['#3b2f2c', '#261e1c', '#140f0f'], top: '#54433e', haze: [255, 110, 50], cloud: [120, 50, 40], metal: '#5e5450' },
];
const OUT = '#17110d';
let FLASH = false;
const C = c => FLASH ? '#ffffff' : c;

// ---------------------------------------------------------------- fondos
function ridge(g, R, col, base, amp, step, jag) {
  g.fillStyle = col; g.beginPath(); g.moveTo(0, GROUND_Y);
  const p1 = R() * 10, p2 = R() * 10, p3 = R() * 10;
  for (let x = 0; x <= W + step; x += step) {
    const n = Math.sin(x * 0.004 + p1) * 0.5 + Math.sin(x * 0.011 + p2) * 0.3 + Math.sin(x * 0.029 + p3) * 0.2;
    g.lineTo(x, base - (n + 1) * amp * 0.5 - R() * jag);
  }
  g.lineTo(W, GROUND_Y); g.closePath(); g.fill();
}
function junkPiles(g, R, col) {
  g.fillStyle = col;
  for (let x = -60; x < W + 60;) {
    const w = 150 + R() * 200, h = 40 + R() * 70;
    g.beginPath(); g.moveTo(x, GROUND_Y); g.quadraticCurveTo(x + w * 0.5, GROUND_Y - h * 2, x + w, GROUND_Y); g.fill();
    const n = 2 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const jx = x + w * (0.25 + R() * 0.5), jy = GROUND_Y - h * 0.85 + R() * h * 0.4, k = R();
      g.save(); g.translate(jx, jy); g.rotate((R() - 0.5) * 0.9);
      if (k < 0.4) {
        roundRect(g, -34, -12, 68, 18, 6); g.fill(); roundRect(g, -16, -25, 34, 15, 5); g.fill();
        g.beginPath(); g.arc(-20, 7, 8, 0, 7); g.arc(20, 7, 8, 0, 7); g.fill();
      } else if (k < 0.7) {
        g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill();
      } else {
        g.fillRect(-40, -4, 80, 8); g.fillRect(-4, -30, 8, 30);
      }
      g.restore();
    }
    x += w * 0.7;
  }
}
function crane(g, x, col) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
  const top = GROUND_Y - 270;
  g.beginPath(); g.moveTo(x, GROUND_Y); g.lineTo(x, top); g.moveTo(x + 18, GROUND_Y); g.lineTo(x + 18, top); g.stroke();
  g.lineWidth = 1.5; g.beginPath();
  for (let y = GROUND_Y; y > top; y -= 22) { g.moveTo(x, y); g.lineTo(x + 18, y - 22); g.moveTo(x + 18, y); g.lineTo(x, y - 22); }
  g.stroke();
  g.fillRect(x - 150, top - 8, 260, 9); g.fillRect(x - 6, top - 30, 30, 24);
  g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 130, top); g.lineTo(x - 130, top + 120); g.moveTo(x + 9, top - 30); g.lineTo(x - 150, top - 4); g.moveTo(x + 9, top - 30); g.lineTo(x + 110, top - 4); g.stroke();
  g.save(); g.translate(x - 130, top + 132); g.rotate(0.15);
  roundRect(g, -30, -10, 60, 16, 5); g.fill(); roundRect(g, -14, -21, 30, 13, 4); g.fill();
  g.beginPath(); g.arc(-18, 7, 7, 0, 7); g.arc(18, 7, 7, 0, 7); g.fill(); g.restore();
}
function buildings(g, R, col, minH, maxH, lit, base) {
  for (let x = -10; x < W;) {
    const w = 50 + R() * 90, h = minH + R() * (maxH - minH), top = base - h;
    g.fillStyle = col; g.fillRect(x, top, w, GROUND_Y - top);
    if (R() < 0.35) g.fillRect(x + w * 0.3, top - 24, 3, 24);
    if (R() < 0.3) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + w * 0.4, top - 10 - R() * 20); g.lineTo(x + w * 0.7, top + 6); g.lineTo(x + w, top - 6); g.lineTo(x + w, top + 2); g.fill(); }
    if (lit > 0) {
      for (let wy = top + 10; wy < GROUND_Y - 34; wy += 15) for (let wx = x + 6; wx < x + w - 8; wx += 12) {
        const r = R();
        if (r < lit) { g.fillStyle = `rgba(255,${190 + R() * 40 | 0},110,${0.3 + R() * 0.45})`; g.fillRect(wx, wy, 5, 8); }
        else if (r < 0.55) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(wx, wy, 5, 8); }
      }
    }
    x += w + R() * 6;
  }
}
function deadTree(g, R, x, y, len, ang, depth, w) {
  if (depth === 0 || len < 5) return;
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
  const n = depth > 3 ? 2 : 2 + (R() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) deadTree(g, R, x2, y2, len * (0.6 + R() * 0.22), ang + (R() - 0.5) * 1.3, depth - 1, w * 0.62);
}
function factories(g, R, col) {
  g.fillStyle = col;
  for (let x = -20; x < W;) {
    const w = 90 + R() * 120, h = 50 + R() * 70, top = GROUND_Y - 10 - h;
    g.fillRect(x, top, w, h + 10);
    g.beginPath(); for (let k = 0; k < w; k += 24) { g.moveTo(x + k, top); g.lineTo(x + k + 24, top - 14); g.lineTo(x + k + 24, top); } g.fill();
    if (R() < 0.7) { const sx = x + w * (0.2 + R() * 0.6), sh = 120 + R() * 140; g.fillRect(sx, top - sh, 18, sh); g.fillRect(sx - 3, top - sh, 24, 8); }
    for (let wy = top + 12; wy < GROUND_Y - 20; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) {
      if (R() < 0.3) { g.fillStyle = `rgba(255,${120 + R() * 60 | 0},40,${0.35 + R() * 0.4})`; g.fillRect(wx, wy, 8, 6); g.fillStyle = col; }
    }
    x += w + 10 + R() * 40;
  }
}

function makeBG(wi) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), th = THEMES[wi], R = mulberry32(4242 + wi * 101);
  const sk = g.createLinearGradient(0, 0, 0, GROUND_Y);
  th.sky.forEach((col, i) => sk.addColorStop(i / (th.sky.length - 1), col));
  g.fillStyle = sk; g.fillRect(0, 0, W, GROUND_Y + 20);
  if (th.stars) for (let i = 0; i < 170; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.6})`; const s = R() < 0.1 ? 2 : 1; g.fillRect(R() * W, R() * GROUND_Y * 0.65, s, s); }
  if (th.sun) {
    const s = th.sun, [r, gg, b] = s.glow;
    const gr = g.createRadialGradient(s.x, s.y, s.r * 0.4, s.x, s.y, s.r * 5);
    gr.addColorStop(0, `rgba(${r},${gg},${b},0.55)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, W, GROUND_Y);
    g.fillStyle = s.col; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill();
  }
  if (th.moon) {
    const m = th.moon;
    const gr = g.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, m.r * 5);
    gr.addColorStop(0, 'rgba(180,200,255,0.25)'); gr.addColorStop(1, 'rgba(180,200,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, GROUND_Y);
    g.fillStyle = '#dfe6f5'; g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,135,170,0.35)';
    [[-12, -8, 9], [10, 6, 7], [-4, 16, 5], [14, -14, 4]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(m.x + dx, m.y + dy, rr, 0, 7); g.fill(); });
  }
  if (wi === 0) {
    ridge(g, R, th.far, 440, 120, 30, 6); ridge(g, R, th.far2, 480, 70, 20, 4);
    crane(g, 1110, th.mid); junkPiles(g, R, th.mid);
  } else if (wi === 1) {
    buildings(g, R, th.far, 140, 300, 0.12, GROUND_Y - 20);
    buildings(g, R, th.far2, 70, 190, 0.05, GROUND_Y - 6);
    g.fillStyle = th.mid;
    for (let x = 60; x < W; x += 230) { g.fillRect(x, GROUND_Y - 120, 4, 110); g.fillRect(x - 2, GROUND_Y - 124, 22, 5); }
    for (let x = 60; x < W; x += 230) {
      if (R() < 0.5) continue;
      const lg = g.createRadialGradient(x + 16, GROUND_Y - 118, 2, x + 16, GROUND_Y - 100, 70);
      lg.addColorStop(0, 'rgba(255,220,150,0.35)'); lg.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = lg; g.fillRect(x - 60, GROUND_Y - 130, 150, 130); g.fillStyle = th.mid;
    }
  } else if (wi === 2) {
    g.fillStyle = th.far;
    for (let x = -20; x < W + 40; x += 26 + R() * 30) { g.beginPath(); g.arc(x, 470 - R() * 40, 30 + R() * 40, 0, 7); g.fill(); }
    g.fillRect(0, 470, W, GROUND_Y - 470);
    g.strokeStyle = th.mid; g.lineCap = 'round';
    for (let x = 40; x < W; x += 140 + R() * 120) deadTree(g, R, x, GROUND_Y, 70 + R() * 50, -Math.PI / 2 + (R() - 0.5) * 0.2, 6, 10);
    g.strokeStyle = rgba(th.mid, 0.6); g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const x = R() * W, y = 360 + R() * 120; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 4, y + 20 + R() * 40); g.stroke(); }
  } else {
    ridge(g, R, th.far, 430, 110, 24, 8);
    const vx = 330, vy = 330;
    g.fillStyle = th.far2; g.beginPath(); g.moveTo(vx - 260, GROUND_Y); g.lineTo(vx - 40, vy); g.lineTo(vx + 40, vy); g.lineTo(vx + 260, GROUND_Y); g.fill();
    const cg = g.createRadialGradient(vx, vy, 4, vx, vy, 120); cg.addColorStop(0, 'rgba(255,170,60,0.9)'); cg.addColorStop(0.3, 'rgba(255,90,30,0.4)'); cg.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = cg; g.fillRect(vx - 140, vy - 140, 280, 280);
    g.strokeStyle = 'rgba(255,120,40,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(vx - 10, vy + 4); g.quadraticCurveTo(vx - 30, vy + 70, vx - 60, vy + 140); g.stroke();
    factories(g, R, th.mid);
  }
  const [hr, hg, hb] = th.haze;
  const hz = g.createLinearGradient(0, GROUND_Y - 160, 0, GROUND_Y);
  hz.addColorStop(0, `rgba(${hr},${hg},${hb},0)`); hz.addColorStop(1, `rgba(${hr},${hg},${hb},0.22)`);
  g.fillStyle = hz; g.fillRect(0, GROUND_Y - 160, W, 160);

  // suelo
  const top = GROUND_Y - 24;
  const gr = g.createLinearGradient(0, top, 0, H);
  gr.addColorStop(0, th.ground[0]); gr.addColorStop(0.3, th.ground[1]); gr.addColorStop(1, th.ground[2]);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, top);
  const pts = [];
  for (let x = 0; x <= W; x += 16) { const y = top + Math.sin(x * 0.02) * 2 + R() * 2; pts.push([x, y]); g.lineTo(x, y); }
  g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.strokeStyle = th.top; g.lineWidth = 3; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  const lb = g.createLinearGradient(0, GROUND_Y - 24, 0, GROUND_Y + 30);
  lb.addColorStop(0, 'rgba(0,0,0,0)'); lb.addColorStop(0.5, 'rgba(0,0,0,0.18)'); lb.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lb; g.fillRect(0, GROUND_Y - 24, W, 54);
  for (let i = 0; i < 1000; i++) {
    const x = R() * W, y = top + 6 + Math.pow(R(), 0.7) * (H - top), s = 1 + R() * 2.5;
    g.fillStyle = R() < 0.55 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.06)'; g.fillRect(x, y, s, s * 0.7);
  }
  for (let i = 0; i < 80; i++) {
    const x = R() * W, y = top + 10 + R() * (H - top - 10), r = 2 + R() * 5;
    g.fillStyle = shade(th.ground[0], (R() - 0.6) * 0.5); g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
  }
  if (wi === 0) {
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 7; g.setLineDash([22, 10]);
    g.beginPath(); g.moveTo(0, GROUND_Y + 48); g.lineTo(W, GROUND_Y + 52); g.moveTo(0, GROUND_Y + 66); g.lineTo(W, GROUND_Y + 70); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 25; i++) { const x = R() * W, y = GROUND_Y + 30 + R() * 120; g.fillStyle = '#7a7268'; g.save(); g.translate(x, y); g.rotate(R() * 3); g.fillRect(-6, -1.5, 12, 3); g.restore(); }
  } else if (wi === 1) {
    g.fillStyle = 'rgba(230,200,90,0.35)';
    for (let x = 0; x < W; x += 70) g.fillRect(x, GROUND_Y + 62, 36, 5);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) { let x = R() * W, y = GROUND_Y + 20 + R() * 120; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 10 + R() * 14; y += (R() - 0.5) * 12; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 8; i++) { const x = R() * W, y = GROUND_Y + 40 + R() * 100; g.fillStyle = 'rgba(140,170,220,0.12)'; g.beginPath(); g.ellipse(x, y, 30 + R() * 30, 5, 0, 0, 7); g.fill(); }
  } else if (wi === 2) {
    for (let i = 0; i < 12; i++) {
      const x = R() * W, y = GROUND_Y + 30 + R() * 110, rx = 25 + R() * 35;
      g.fillStyle = 'rgba(40,70,20,0.8)'; g.beginPath(); g.ellipse(x, y, rx, rx * 0.2, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(170,255,90,0.18)'; g.beginPath(); g.ellipse(x - 4, y - 1, rx * 0.7, rx * 0.1, 0, 0, 7); g.fill();
    }
    g.strokeStyle = '#2f4a1f'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 5 + R() * 9) { const y = top + 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 6, y - 6 - R() * 10); g.stroke(); }
  } else {
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 96) { g.beginPath(); g.moveTo(x, GROUND_Y + 30); g.lineTo(x - 30, H); g.stroke(); }
    for (let i = 0; i < 10; i++) {
      let x = R() * W, y = GROUND_Y + 30 + R() * 110;
      const path = [[x, y]]; for (let k = 0; k < 6; k++) { x += 12 + R() * 18; y += (R() - 0.5) * 16; path.push([x, y]); }
      [[8, 'rgba(255,80,20,0.15)'], [4, 'rgba(255,120,30,0.5)'], [1.5, 'rgba(255,220,120,0.9)']].forEach(([lw, col]) => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); path.forEach(([px, py], j) => j ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
      });
    }
  }
  return c;
}

function makeVignette() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 0.95);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}

function drawClouds(ctx, wi, t) {
  const [r, gg, b] = THEMES[wi].cloud;
  for (let i = 0; i < 7; i++) {
    const sp = 5 + i * 2.2, x = ((i * 233 + t * sp) % (W + 420)) - 210, y = 50 + ((i * 97) % 230), s = 0.6 + ((i * 37) % 10) / 10;
    ctx.fillStyle = `rgba(${r},${gg},${b},${0.06 + 0.03 * (i % 3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 120 * s, 22 * s, 0, 0, 7); ctx.ellipse(x + 60 * s, y - 12 * s, 80 * s, 20 * s, 0, 0, 7); ctx.ellipse(x - 50 * s, y + 4, 70 * s, 16 * s, 0, 0, 7);
    ctx.fill();
  }
}

function drawWeather(ctx, wi, t) {
  if (wi === 1) {
    ctx.strokeStyle = 'rgba(170,200,255,0.32)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 150; i++) {
      const sp = 900 + (i * 53 % 300), x = ((i * 97.3 + t * 140) % (W + 100)) - 50, y = ((i * 431.7 + t * sp) % (H + 60)) - 30;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,215,255,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const ph = (t * 2.3 + i * 0.37) % 1, x = (i * 173.3) % W, y = GROUND_Y + 10 + (i * 37 % 90);
      ctx.beginPath(); ctx.ellipse(x, y, 2 + ph * 9, 1 + ph * 2, 0, Math.PI, 0); ctx.globalAlpha = 1 - ph; ctx.stroke(); ctx.globalAlpha = 1;
    }
  } else if (wi === 0) {
    ctx.fillStyle = 'rgba(255,220,170,0.35)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 211 + t * (12 + i % 7 * 3)) % (W + 40)) - 20, y = 200 + ((i * 89) % 380) + Math.sin(t * 0.8 + i) * 12;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (wi === 2) {
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 + t * (10 + i * 4)) % (W + 600)) - 300;
      const gr = ctx.createRadialGradient(x, GROUND_Y + 10, 10, x, GROUND_Y + 10, 260);
      gr.addColorStop(0, 'rgba(170,230,120,0.13)'); gr.addColorStop(1, 'rgba(170,230,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 260, GROUND_Y - 120, 520, 220);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 45; i++) {
      const y = H - ((i * 137 + t * (14 + i % 5 * 5)) % (H + 40)), x = (i * 251) % W + Math.sin(t * 1.3 + i) * 18;
      ctx.fillStyle = `rgba(180,255,90,${0.25 + 0.2 * Math.sin(t * 3 + i)})`; ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const y = H - ((i * 113 + t * (40 + i % 6 * 18)) % (H + 40)), x = (i * 199) % W + Math.sin(t * 2 + i * 1.7) * 22;
      ctx.fillStyle = `rgba(255,${120 + (i * 13 % 100)},40,${0.5 + 0.3 * Math.sin(t * 6 + i)})`; ctx.fillRect(x, y, 2.5, 2.5);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------------------------------------------------------------- búnker
function plate(ctx, x, y, w, h, v) {
  const cols = ['#615a52', '#57504a', '#6a6158'];
  ctx.fillStyle = cols[v]; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 1, y + 1, w - 2, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
  ctx.fillStyle = '#8f877d';
  [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 6], [x + w - 5, y + h - 6]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); });
}
function hazard(ctx, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#f2b51f'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#1d1712';
  for (let k = -h; k < w + h; k += 14) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 7, y + h); ctx.lineTo(x + k + 7 + h, y); ctx.lineTo(x + k + h, y); ctx.fill(); }
  ctx.restore();
}
const BUNKER_TOP = 332;
function drawBunker(ctx, G, t) {
  const top = BUNKER_TOP, bot = GROUND_Y + 22, hpF = Math.max(0, G.wallHp / G.wallMax);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(110, GROUND_Y + 22, 140, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a342e'; ctx.fillRect(-4, top, 210, bot - top);
  let y = top + 4, r = 0;
  while (y < bot) {
    const off = (r % 2) * 26, rh = Math.min(44, bot - y);
    for (let x = -26 + off; x < 200; x += 52) { const x0 = Math.max(-4, x), x1 = Math.min(x + 52, 190); if (x1 > x0) plate(ctx, x0, y, x1 - x0, rh, Math.abs((r * 7 + x) % 3)); }
    y += 44; r++;
  }
  ctx.fillStyle = '#2b2622'; ctx.fillRect(188, top - 4, 18, bot - top + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(188, top - 4, 3, bot - top);
  hazard(ctx, 188, bot - 70, 18, 60);
  roundRect(ctx, 116, bot - 104, 44, 88, 5); ctx.fillStyle = '#47403a'; ctx.fill(); ctx.strokeStyle = '#23201c'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = '#8a8076'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(138, bot - 60, 10, 0, 7); ctx.moveTo(128, bot - 60); ctx.lineTo(148, bot - 60); ctx.moveTo(138, bot - 70); ctx.lineTo(138, bot - 50); ctx.stroke();
  ctx.fillStyle = '#1c1916'; ctx.fillRect(30, top + 60, 60, 10); ctx.fillStyle = 'rgba(255,200,90,0.5)'; ctx.fillRect(34, top + 62, 52, 5);
  // grietas
  ctx.strokeStyle = '#191512'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  G.cracks.forEach(cr => {
    if (hpF < cr.th) { ctx.beginPath(); cr.pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); }
  });
  if (hpF < 0.3) { ctx.fillStyle = '#16120f'; [[60, top + 110, 14], [150, top + 40, 10], [40, bot - 50, 12]].forEach(([hx, hy, hr]) => { ctx.beginPath(); ctx.ellipse(hx, hy, hr, hr * 0.8, 0.4, 0, 7); ctx.fill(); }); }
  if (G.wallFlash > 0) { ctx.fillStyle = `rgba(255,70,50,${Math.min(0.5, G.wallFlash * 3)})`; ctx.fillRect(-4, top, 210, bot - top); }
  // pasarela + baranda
  ctx.fillStyle = '#4a433c'; ctx.fillRect(-4, top - 8, 214, 10); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-4, top - 8, 214, 2);
  ctx.strokeStyle = '#2e2925'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let x = 2; x <= 206; x += 34) { ctx.moveTo(x, top - 8); ctx.lineTo(x, top - 30); } ctx.moveTo(0, top - 30); ctx.lineTo(208, top - 30); ctx.moveTo(0, top - 19); ctx.lineTo(208, top - 19); ctx.stroke();
  // sacos terreros
  const bag = (bx, by) => { ctx.fillStyle = '#a48c62'; ctx.strokeStyle = '#4e3f27'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx, by, 14, 8, 0, 0, 7); ctx.fill(); ctx.stroke(); };
  [[214, GROUND_Y + 14], [240, GROUND_Y + 14], [227, GROUND_Y + 2], [214, GROUND_Y - 10]].forEach(([bx, by]) => bag(bx, by));
  // bandera
  ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, top - 8); ctx.lineTo(10, top - 120); ctx.stroke();
  ctx.fillStyle = '#c8392b'; ctx.beginPath(); ctx.moveTo(11, top - 118);
  for (let i = 0; i <= 6; i++) ctx.lineTo(11 + i * 9, top - 118 + Math.sin(t * 4 + i * 0.8) * 3 * (i / 6));
  for (let i = 6; i >= 0; i--) ctx.lineTo(11 + i * 9, top - 88 + Math.sin(t * 4 + i * 0.8) * 3 * (i / 6));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc229'; ctx.beginPath(); ctx.arc(37, top - 103 + Math.sin(t * 4 + 2.4) * 1.5, 6, 0, 7); ctx.fill();
}
function drawScaffold(ctx) {
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(226, 446); ctx.lineTo(226, GROUND_Y + 14); ctx.moveTo(278, 446); ctx.lineTo(278, GROUND_Y + 14); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath();
  for (let y = 450; y < GROUND_Y; y += 40) { ctx.moveTo(226, y); ctx.lineTo(278, y + 40); ctx.moveTo(278, y); ctx.lineTo(226, y + 40); }
  ctx.moveTo(206, 470); ctx.lineTo(226, 470); ctx.moveTo(206, 520); ctx.lineTo(226, 520);
  ctx.stroke();
  ctx.fillStyle = '#6b5236'; ctx.fillRect(216, 438, 72, 9); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(216, 438, 72, 2);
}
function drawSlot(ctx, s, t, state) {
  if (s.kind === 'ground') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 32, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4c4741'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, 28, 8, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7a7268'; [[-18, 0], [18, 0], [0, -4], [0, 4]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(s.x + dx, s.y + 6 + dy, 1.8, 0, 7); ctx.fill(); });
  } else {
    ctx.fillStyle = '#4c4741'; ctx.fillRect(s.x - 26, s.y - 10, 52, 5); ctx.fillStyle = '#7a7268'; ctx.fillRect(s.x - 26, s.y - 10, 52, 1.5);
  }
  if (state) {
    const a = 0.55 + 0.35 * Math.sin(t * 7);
    const col = state === 1 ? `rgba(130,255,120,${a})` : 'rgba(255,90,70,0.35)';
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
    ctx.beginPath();
    if (s.kind === 'ground') ctx.ellipse(s.x, s.y + 6, 34, 11, 0, 0, 7); else ctx.rect(s.x - 29, s.y - 64, 58, 62);
    ctx.stroke(); ctx.setLineDash([]);
    if (state === 1) {
      const by = s.y - 78 + Math.sin(t * 6) * 5;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s.x - 10, by); ctx.lineTo(s.x + 10, by); ctx.lineTo(s.x, by + 12); ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- defensas
function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

const TOWER_DRAW = {
  ballesta(ctx, t) {
    ctx.lineCap = 'round'; ctx.strokeStyle = C('#3b2a1c'); ctx.lineWidth = 5;
    line(ctx, 0, -34, -17, 0); line(ctx, 0, -34, 17, 0); line(ctx, 0, -34, 3, 0);
    ctx.fillStyle = C('#5b4330'); ctx.fillRect(-5, -44, 10, 14);
    ctx.save(); ctx.translate(0, -44); ctx.rotate(t.ang);
    roundRect(ctx, -20, -4, 44, 8, 3); ctx.fillStyle = C('#8a5a32'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C('#9aa0a6'); ctx.fillRect(10, -5, 5, 10); ctx.fillRect(-14, -5, 4, 10);
    ctx.strokeStyle = C('#cfd5da'); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(15, -21); ctx.quadraticCurveTo(26, 0, 15, 21); ctx.stroke();
    ctx.strokeStyle = C(OUT); ctx.lineWidth = 1; ctx.stroke();
    const sx = lerp(-7, 14, t.recoil);
    ctx.strokeStyle = C('#efe8d6'); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(15, -21); ctx.lineTo(sx, 0); ctx.lineTo(15, 21); ctx.stroke();
    if (t.recoil < 0.3) {
      ctx.fillStyle = C('#d8c7a0'); ctx.fillRect(sx, -1.5, 28, 3);
      ctx.fillStyle = C('#dfe5ea'); ctx.beginPath(); ctx.moveTo(sx + 28, -4); ctx.lineTo(sx + 36, 0); ctx.lineTo(sx + 28, 4); ctx.fill();
      ctx.fillStyle = C('#c8392b'); ctx.fillRect(sx, -3, 5, 2); ctx.fillRect(sx, 1, 5, 2);
    }
    ctx.restore();
  },
  recolector(ctx, t, T) {
    const p = t.s && t.s.genTime ? 1 - Math.max(0, t.genT) / t.s.genTime : 0.6;
    roundRect(ctx, -22, -32, 44, 32, 4); ctx.fillStyle = C('#2f6f7c'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    if (!FLASH) hazard(ctx, -21, -7, 42, 6);
    ctx.fillStyle = C('#e8e2d0'); circle(ctx, -9, -19, 7); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = C('#c8392b'); ctx.lineWidth = 1.5; const na = -Math.PI * 0.8 + p * Math.PI * 1.6;
    line(ctx, -9, -19, -9 + Math.cos(na) * 5, -19 + Math.sin(na) * 5);
    ctx.fillStyle = p > 0.85 && Math.sin(T * 20) > 0 ? '#7dff7a' : C('#2b4a4f'); circle(ctx, 10, -22, 4); ctx.fill();
    ctx.fillStyle = C('#4d4f52'); ctx.fillRect(-3, -56, 6, 26);
    ctx.save(); ctx.translate(0, -66); ctx.rotate(Math.sin(T * 2 + t.anim) * 0.15); const sc = 1 + Math.max(0, p - 0.8) * 0.5 * Math.sin(T * 30); ctx.scale(sc, sc);
    ctx.lineCap = 'butt'; ctx.strokeStyle = C(OUT); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = C('#d33a2c'); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = C('#cfd5da'); ctx.fillRect(-16.5, -8, 9, 9); ctx.fillRect(7.5, -8, 9, 9);
    if (p > 0.55 && !FLASH) {
      ctx.strokeStyle = `rgba(140,230,255,${(p - 0.55) * 2})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, -9);
      for (let i = 1; i < 6; i++) ctx.lineTo(-12 + i * 4.8, -12 - Math.random() * 8); ctx.stroke();
    }
    ctx.restore();
  },
  barricada(ctx, t) {
    const f = t.hp / t.s.maxHp;
    ctx.fillStyle = C('#26221f'); ctx.beginPath(); ctx.ellipse(-12, -8, 14, 9, 0, 0, 7); ctx.ellipse(14, -8, 14, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = C('#45403b'); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-12, -8, 7, 4, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(14, -8, 7, 4, 0, 0, 7); ctx.stroke();
    roundRect(ctx, -27, -48, 50, 34, 5); ctx.fillStyle = C(f < 0.4 ? '#5d666d' : '#7c8a93'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C('#a8bccb'); roundRect(ctx, -21, -44, 30, 13, 3); ctx.fill();
    ctx.fillStyle = C('#3a3f44'); ctx.fillRect(10, -30, 8, 3);
    ctx.save(); ctx.rotate(-0.25); ctx.fillStyle = C('#8a6038'); ctx.fillRect(-30, -40, 60, 8); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.strokeRect(-30, -40, 60, 8); ctx.restore();
    if (f > 0.33) {
      ctx.fillStyle = C('#9a8f80'); ctx.fillRect(-24, -66, 46, 19); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.strokeRect(-24, -66, 46, 19);
      ctx.strokeStyle = C('#6e655a'); ctx.lineWidth = 1.5; for (let x = -20; x < 22; x += 6) line(ctx, x, -65, x, -48);
    }
    ctx.fillStyle = C('#cdd2d6'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.2;
    [-12, -28, -44].forEach(y => { ctx.beginPath(); ctx.moveTo(22, y - 5); ctx.lineTo(40, y); ctx.lineTo(22, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    if (f < 0.66) { ctx.strokeStyle = C('#1a1512'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -48); ctx.lineTo(-4, -36); ctx.lineTo(-12, -24); ctx.stroke(); }
  },
  catapulta(ctx, t) {
    ctx.fillStyle = C('#7a5230'); ctx.fillRect(-32, -22, 64, 9); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.strokeRect(-32, -22, 64, 9);
    ctx.strokeStyle = C('#5b3d22'); ctx.lineWidth = 6; ctx.lineCap = 'round'; line(ctx, -16, -16, -4, -42); line(ctx, 8, -16, -4, -42);
    const sw = t.armT < 0.12 ? t.armT / 0.12 : Math.max(0, 1 - (t.armT - 0.35) / 1.1);
    const A0 = Math.PI * 0.9, A1 = Math.PI * 1.6, a = lerp(A0, A1, clamp(sw, 0, 1));
    ctx.save(); ctx.translate(-4, -40); ctx.rotate(a);
    roundRect(ctx, -6, -3.5, 58, 7, 3); ctx.fillStyle = C('#9b6b3f'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C('#5b3d22'); ctx.beginPath(); ctx.arc(52, -5, 9, 0, Math.PI); ctx.fill();
    if (sw < 0.05) { ctx.fillStyle = C('#8d8478'); circle(ctx, 52, -9, 8); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = C('#3a3530'); circle(ctx, -4, -40, 4); ctx.fill();
    [-20, 20].forEach(wx => {
      ctx.fillStyle = C('#3b2a1c'); circle(ctx, wx, -9, 10); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = C('#7a5230'); ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const aa = k * Math.PI / 4; line(ctx, wx - Math.cos(aa) * 8, -9 - Math.sin(aa) * 8, wx + Math.cos(aa) * 8, -9 + Math.sin(aa) * 8); }
      ctx.fillStyle = C('#9aa0a6'); circle(ctx, wx, -9, 2.5); ctx.fill();
    });
  },
  lanzallamas(ctx, t, T) {
    roundRect(ctx, -22, -54, 17, 52, 8); ctx.fillStyle = C('#c23a26'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C('#2b2522'); ctx.fillRect(-22, -42, 17, 4); ctx.fillRect(-22, -18, 17, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-19, -50, 3, 40);
    roundRect(ctx, -6, -42, 13, 40, 6); ctx.fillStyle = C('#9c2e1f'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = C('#2b2522'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -54); ctx.quadraticCurveTo(-8, -66, 4, -42); ctx.stroke();
    ctx.save(); ctx.translate(6, -40); ctx.rotate(t.ang);
    roundRect(ctx, -4, -5, 28, 10, 3); ctx.fillStyle = C('#4a4540'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C('#2b2622'); ctx.fillRect(22, -6.5, 8, 13);
    if (!FLASH) {
      const fl = 0.8 + Math.sin(T * 30 + t.anim) * 0.3;
      ctx.fillStyle = 'rgba(255,140,40,0.85)'; circle(ctx, 33, 0, 3.5 * fl); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,140,0.9)'; circle(ctx, 32.5, 0, 1.8 * fl); ctx.fill();
    }
    ctx.restore();
  },
  tesla(ctx, t, T) {
    ctx.strokeStyle = C('#2a2c35'); ctx.lineWidth = 4; ctx.lineCap = 'round'; line(ctx, -6, -12, -16, 0); line(ctx, 6, -12, 16, 0);
    roundRect(ctx, -16, -18, 32, 10, 3); ctx.fillStyle = C('#3a3d4a'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C('#4a3a2e'); ctx.fillRect(-4, -76, 8, 60);
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = C(i % 2 ? '#b8692e' : '#d8873e'); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -24 - i * 9, 14 - i * 1.3, 3.5, 0, 0, 7); ctx.stroke(); }
    const ch = t.charge;
    if (!FLASH) {
      const gr = ctx.createRadialGradient(0, -84, 2, 0, -84, 24 + ch * 10);
      gr.addColorStop(0, `rgba(160,180,255,${0.35 + ch * 0.4})`); gr.addColorStop(1, 'rgba(120,140,255,0)');
      ctx.fillStyle = gr; circle(ctx, 0, -84, 36); ctx.fill();
    }
    ctx.fillStyle = C(ch > 0.95 ? '#eef2ff' : '#9aa8ff'); circle(ctx, 0, -84, 10); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, -3, -87, 3); ctx.fill();
    if (ch > 0.7 && !FLASH && Math.random() < 0.4) {
      ctx.strokeStyle = 'rgba(190,210,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); const a = Math.random() * 6.28; ctx.moveTo(Math.cos(a) * 10, -84 + Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 18 + rand(-4, 4), -84 + Math.sin(a) * 18 + rand(-4, 4)); ctx.lineTo(Math.cos(a) * 24, -84 + Math.sin(a) * 24); ctx.stroke();
    }
  },
  mina(ctx, t, T) {
    ctx.fillStyle = C('#2f3420'); ctx.beginPath(); ctx.ellipse(0, 4, 20, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C('#5d6b3a'); ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = C('#9aa0a6'); ctx.lineWidth = 1.5; line(ctx, -6, -4, -8, -9); line(ctx, 6, -4, 8, -9); line(ctx, 0, -6, 0, -11);
    ctx.fillStyle = Math.sin(T * 8 + t.anim) > 0.3 ? '#ff3b2a' : C('#5a1a12'); circle(ctx, 0, -4, 2.5); ctx.fill();
  },
  sierra(ctx, t, T) {
    roundRect(ctx, -24, -30, 48, 30, 4); ctx.fillStyle = C('#5a5f66'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    if (!FLASH) hazard(ctx, -23, -10, 46, 6);
    ctx.fillStyle = C('#3a3d42'); ctx.fillRect(-4, -46, 8, 18);
    ctx.save(); ctx.translate(4, -48); ctx.rotate(T * (t.cd < 0.4 ? 30 : 6));
    ctx.fillStyle = C('#c9d1d8'); ctx.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 11 : 15; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = C('#4a4e54'); circle(ctx, 0, 0, 4); ctx.fill();
    ctx.restore();
  },
  riel(ctx, t, T) {
    ctx.strokeStyle = C('#2a2c30'); ctx.lineWidth = 5; ctx.lineCap = 'round'; line(ctx, -10, -30, -20, 0); line(ctx, 6, -30, 16, 0);
    roundRect(ctx, -16, -36, 30, 10, 3); ctx.fillStyle = C('#3a3d42'); ctx.fill();
    ctx.save(); ctx.translate(0, -44); ctx.rotate(t.ang);
    roundRect(ctx, -26, -8, 68, 16, 5); ctx.fillStyle = C('#2d3338'); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C('#1d2226'); ctx.fillRect(-4, -11, 46, 4); ctx.fillRect(-4, 7, 46, 4);
    const ch = t.charge;
    for (let i = 0; i < 5; i++) { ctx.fillStyle = FLASH ? '#fff' : (ch * 5 > i ? `rgba(57,224,200,${0.6 + 0.4 * Math.sin(T * 10 + i)})` : '#24413d'); ctx.fillRect(-2 + i * 9, -8, 4, 16); }
    if (ch > 0.95 && !FLASH) { const gr = ctx.createRadialGradient(44, 0, 1, 44, 0, 16); gr.addColorStop(0, 'rgba(160,255,240,0.9)'); gr.addColorStop(1, 'rgba(57,224,200,0)'); ctx.fillStyle = gr; circle(ctx, 44, 0, 16); ctx.fill(); }
    ctx.restore();
  },
};

function drawTowerBody(ctx, t, T) {
  TOWER_DRAW[t.key](ctx, t, T);
  if (t.tier > 1) {
    ctx.fillStyle = '#ffc229'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
    for (let i = 0; i < t.tier - 1; i++) {
      const x = -6 + i * 12 - (t.tier - 2) * 6;
      ctx.beginPath(); ctx.moveTo(x - 5, 10); ctx.lineTo(x, 5); ctx.lineTo(x + 5, 10); ctx.lineTo(x + 5, 13); ctx.lineTo(x, 8); ctx.lineTo(x - 5, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}
function drawTower(ctx, t, T) {
  ctx.save(); ctx.translate(t.x, t.y);
  if (!t.roof) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 30, 7, 0, 0, 7); ctx.fill(); }
  FLASH = t.flash > 0;
  drawTowerBody(ctx, t, T);
  FLASH = false;
  if (t.hp < t.s.maxHp && t.key !== 'mina') {
    const f = Math.max(0, t.hp / t.s.maxHp), by = t.key === 'tesla' ? -104 : -82;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-20, by, 40, 5);
    ctx.fillStyle = f > 0.5 ? '#7de86a' : f > 0.25 ? '#ffc229' : '#ff5a3c'; ctx.fillRect(-19, by + 1, 38 * f, 3);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- zombis
function limb2(ctx, x, y, a1, l1, a2, l2, w, c1, c2) {
  const kx = x - Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
  const ex = kx - Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C(OUT); ctx.lineWidth = w + 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = C(c1); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.strokeStyle = C(c2); ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
  return [ex, ey];
}
function drawHead(ctx, z, r, T) {
  const d = z.d, skin = d.skin, type = z.type;
  ctx.fillStyle = C(skin); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C(shade(skin, -0.22)); ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.45, r * 0.62, r * 0.4, 0, 0, Math.PI); ctx.fill();
  const mo = type === 'escupidor' ? 1.6 : 1;
  ctx.fillStyle = C('#2a0f0f'); ctx.beginPath(); ctx.ellipse(-r * 0.52, r * 0.38, r * 0.32 * mo, r * 0.2 * mo * (1 + 0.4 * Math.sin(T * 5 + z.id)), 0, 0, 7); ctx.fill();
  ctx.fillStyle = C('#e8e0c8'); ctx.fillRect(-r * 0.72, r * 0.22, r * 0.12, r * 0.14); ctx.fillRect(-r * 0.46, r * 0.22, r * 0.12, r * 0.12);
  ctx.fillStyle = C('#1e140f'); circle(ctx, -r * 0.45, -r * 0.15, r * 0.27); ctx.fill(); circle(ctx, r * 0.08, -r * 0.2, r * 0.2); ctx.fill();
  const eye = d.boss ? '#ff3b2a' : type === 'escupidor' ? '#b6ff5a' : '#ffe45a';
  ctx.fillStyle = FLASH ? '#fff' : eye; circle(ctx, -r * 0.47, -r * 0.15, r * 0.12); ctx.fill(); circle(ctx, r * 0.07, -r * 0.2, r * 0.09); ctx.fill();
  ctx.strokeStyle = C('#2b241d'); ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.2 + i * r * 0.25, -r * 0.92); ctx.quadraticCurveTo(r * 0.1 + i * r * 0.3, -r * 1.25, r * 0.5 + i * r * 0.2, -r * 0.9); ctx.stroke(); }
  ctx.fillStyle = C('#6a1e1a'); ctx.beginPath(); ctx.ellipse(r * 0.4, r * 0.1, r * 0.18, r * 0.12, 0.5, 0, 7); ctx.fill();
  // sombreros / extras
  if (type === 'casco' && z.armor > 0) {
    ctx.fillStyle = C('#f2c230'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 1.02, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(-r * 1.35, -r * 0.38, r * 2.3, r * 0.22); ctx.strokeRect(-r * 1.35, -r * 0.38, r * 2.3, r * 0.22);
    ctx.fillStyle = C('#d9a520'); ctx.fillRect(-r * 0.12, -r * 1.3, r * 0.24, r);
  } else if (type === 'excavador') {
    ctx.fillStyle = C('#e8b33a'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 1.0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = FLASH ? '#fff' : '#fff6c0'; circle(ctx, -r * 0.8, -r * 0.65, r * 0.25); ctx.fill();
  } else if (type === 'escudo') {
    ctx.fillStyle = C('#1f2733'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 1.08, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('rgba(140,190,230,0.45)'); ctx.fillRect(-r * 1.1, -r * 0.35, r * 1.1, r * 0.5);
  } else if (type === 'saltador') {
    ctx.fillStyle = C('#e04a3a'); ctx.fillRect(-r, -r * 0.62, r * 1.9, r * 0.28);
  } else if (type === 'corredor') {
    ctx.fillStyle = C('#2b241d'); ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.95); ctx.lineTo(r * 1.4, -r * 0.6); ctx.lineTo(r * 0.6, -r * 0.4); ctx.fill();
  } else if (type === 'jefe3') {
    ctx.fillStyle = C('#e8dcc0'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const x = -r * 0.7 + i * r * 0.35; ctx.beginPath(); ctx.moveTo(x - 3, -r * 0.85); ctx.lineTo(x, -r * 1.5 - (i % 2) * 4); ctx.lineTo(x + 3, -r * 0.85); ctx.fill(); ctx.stroke(); }
  } else if (type === 'jefe4' && z.armor > 0) {
    ctx.fillStyle = C('#6a7078'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5;
    roundRect(ctx, -r * 1.05, -r * 1.05, r * 2.1, r * 1.5, r * 0.4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = FLASH ? '#fff' : '#ff3b2a'; ctx.fillRect(-r * 0.95, -r * 0.3, r * 1.1, r * 0.2);
    ctx.fillStyle = C('#9aa0a6'); circle(ctx, r * 0.6, -r * 0.7, 1.5); ctx.fill(); circle(ctx, r * 0.6, 0, 1.5); ctx.fill();
  }
}

function drawHumanoid(ctx, z, T) {
  const d = z.d, s = d.scale || 1, type = z.type;
  const big = type === 'bruto' || d.boss;
  const runner = type === 'corredor', jumper = type === 'saltador';
  const walking = z.state === 'walk' && z.onGround && z.stun <= 0;
  const ph = z.anim;
  const amp = runner ? 0.75 : jumper ? 0.6 : big ? 0.35 : 0.45;
  const sw = walking ? Math.sin(ph) * amp : 0;
  const bob = walking ? Math.abs(Math.cos(ph)) * (runner ? 3 : 2) : 0;
  const legL = jumper ? 32 : big ? 25 : 27;
  const torsoH = big ? 31 : 27, torsoW = big ? 30 : runner ? 17 : type === 'hinchado' ? 24 : 21;
  const lean = runner ? 0.42 : jumper ? 0.3 : big ? 0.12 : z.state === 'attack' ? 0.3 : 0.18;
  const skinD = shade(d.skin, -0.25), shirtD = shade(d.shirt, -0.32), pantsD = shade(d.pants, -0.35);
  ctx.save(); ctx.translate(z.x, z.y);
  if (z.rot) ctx.rotate(z.rot);
  ctx.scale(s, s);
  const hipY = -legL - bob * 0.4;
  const shX = -Math.sin(lean) * (torsoH - 4), shY = hipY - Math.cos(lean) * (torsoH - 4);
  let aU, aL, bU, bL;
  if (runner || jumper) { aU = -sw * 1.3 + 0.2; aL = aU + 1.4; bU = sw * 1.3 + 0.2; bL = bU + 1.4; }
  else if (z.state === 'attack') { const k = Math.sin(z.atkAnim * Math.PI); aU = 0.9 + k * 1.3; aL = aU + 0.35; bU = 1.1 + (1 - k) * 0.7; bL = bU + 0.2; }
  else { const wob = Math.sin(ph * 0.5 + T * 1.5) * 0.08; aU = 1.42 + wob; aL = 1.52 + wob; bU = 1.25 - wob; bL = 1.4 - wob; }
  if (z.stun > 0) { aU = 0.3; aL = 0.2; bU = -0.2; bL = -0.1; }
  const hw = big ? 7.5 : 6;
  // brazo trasero
  const [bhx, bhy] = limb2(ctx, shX + 3, shY + 2, bU, 12, bL, 12, hw, shirtD, skinD);
  ctx.fillStyle = C(skinD); circle(ctx, bhx, bhy, hw * 0.55); ctx.fill();
  // piernas
  const lw = big ? 9 : 7;
  let [fx, fy] = limb2(ctx, 3, hipY, -sw, legL * 0.52, -sw * 0.5 + 0.05, legL * 0.52, lw, pantsD, pantsD);
  ctx.fillStyle = C('#231c17'); roundRect(ctx, fx - 7, fy - 2, 10, 5, 2); ctx.fill();
  [fx, fy] = limb2(ctx, -2, hipY, sw, legL * 0.52, sw * 0.5 - 0.1, legL * 0.52, lw, d.pants, d.pants);
  ctx.fillStyle = C('#2e251e'); roundRect(ctx, fx - 7, fy - 2, 10, 5, 2); ctx.fill();
  // torso
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(-lean);
  ctx.fillStyle = C(d.pants); ctx.fillRect(-torsoW * 0.45, -6, torsoW * 0.9, 9);
  ctx.beginPath(); ctx.moveTo(-torsoW * 0.44, 0); ctx.lineTo(-torsoW / 2, -torsoH); ctx.quadraticCurveTo(0, -torsoH - 4, torsoW / 2, -torsoH); ctx.lineTo(torsoW * 0.44, 0);
  for (let k = 4; k >= 0; k--) ctx.lineTo(-torsoW * 0.44 + torsoW * 0.88 * k / 4 - torsoW * 0.11, (k % 2) * 4 - 1);
  ctx.closePath(); ctx.fillStyle = C(d.shirt); ctx.fill(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = C(shirtD); ctx.beginPath(); ctx.moveTo(torsoW * 0.15, -torsoH + 1); ctx.lineTo(torsoW / 2 - 1, -torsoH + 1); ctx.lineTo(torsoW * 0.42, -2); ctx.lineTo(torsoW * 0.2, -2); ctx.fill();
  if (type === 'casco') { ctx.fillStyle = C('#e8f0a0'); ctx.fillRect(-torsoW * 0.45, -torsoH * 0.55, torsoW * 0.9, 3); ctx.fillRect(-torsoW * 0.45, -torsoH * 0.3, torsoW * 0.9, 3); }
  if (type === 'bruto' || type === 'jefe1') { ctx.strokeStyle = C(d.pants); ctx.lineWidth = 4; line(ctx, -torsoW * 0.3, -torsoH + 2, -torsoW * 0.25, -4); line(ctx, torsoW * 0.25, -torsoH + 2, torsoW * 0.2, -4); }
  if (type === 'excavador') { ctx.strokeStyle = C('#3a2a1a'); ctx.lineWidth = 2.5; line(ctx, -torsoW * 0.3, -torsoH + 1, -torsoW * 0.3, -3); line(ctx, torsoW * 0.3, -torsoH + 1, torsoW * 0.3, -3); }
  if (type === 'hinchado') {
    const pul = 1 + Math.sin(T * 4 + z.id) * 0.05;
    ctx.fillStyle = C('#a9cf55'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(-5, -13, 16 * pul, 14 * pul, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('#d8f070'); [[-12, -18, 3], [-2, -8, 2.5], [-9, -6, 2], [2, -19, 2]].forEach(([px, py, pr]) => { circle(ctx, px, py, pr); ctx.fill(); });
  }
  if (type === 'jefe2') { ctx.strokeStyle = C('#1c1c22'); ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { line(ctx, -torsoW * 0.4, -torsoH * 0.2 * (i + 1), torsoW * 0.3, -torsoH * 0.2 * (i + 1) - 3); for (let k = 0; k < 5; k++) line(ctx, -torsoW * 0.3 + k * 6, -torsoH * 0.2 * (i + 1) - 3, -torsoW * 0.3 + k * 6 + 1, -torsoH * 0.2 * (i + 1) + 2); } }
  if (type === 'jefe1') { ctx.fillStyle = C('#e8dcc0'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(torsoW * 0.4, -torsoH + 6 + i * 7); ctx.lineTo(torsoW * 0.75, -torsoH + 2 + i * 7); ctx.lineTo(torsoW * 0.45, -torsoH + 10 + i * 7); ctx.fill(); ctx.stroke(); } }
  if (type === 'jefe4' && z.armor > 0) { ctx.fillStyle = C('#6a7078'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.4; roundRect(ctx, -torsoW * 0.5, -torsoH + 2, torsoW, torsoH * 0.6, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = C('#9aa0a6'); for (let i = 0; i < 3; i++) { circle(ctx, -torsoW * 0.3 + i * torsoW * 0.3, -torsoH + 6, 1.5); ctx.fill(); } }
  ctx.fillStyle = C(skinD); ctx.fillRect(-5, -torsoH - 5, 7, 6);
  ctx.save(); ctx.translate(-3, -torsoH - 9 + (type === 'escupidor' && z.spitAnim > 0 ? -2 : 0));
  if (type === 'escupidor' && z.spitAnim > 0) ctx.rotate(0.35 * Math.sin(z.spitAnim * Math.PI));
  drawHead(ctx, z, big ? 9 : 10, T);
  ctx.restore();
  if (type === 'jefe2') {
    ctx.fillStyle = C('#1d1a22');
    [[-torsoW * 0.5, -torsoH - 2], [torsoW * 0.45, -torsoH]].forEach(([bx, by]) => { ctx.beginPath(); ctx.ellipse(bx, by - 4, 6, 4, 0, 0, 7); ctx.fill(); circle(ctx, bx - 5, by - 7, 3); ctx.fill(); });
  }
  ctx.restore();
  // brazo delantero
  const [hx, hy] = limb2(ctx, shX - 2, shY + 2, aU, 12, aL, 12, hw, d.shirt, d.skin);
  ctx.fillStyle = C(d.skin); circle(ctx, hx, hy, hw * 0.6); ctx.fill();
  if (type === 'escudo' && z.shield > 0) {
    const f = z.shield / z.maxShield;
    ctx.save(); ctx.translate(shX - 18, hipY + 6);
    roundRect(ctx, -6, -40, 12, 50, 3);
    ctx.fillStyle = FLASH || z.shieldFlash > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(150,180,210,0.55)'; ctx.fill();
    ctx.strokeStyle = C('#1d2333'); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-4, -36, 2.5, 40);
    if (f < 0.6) { ctx.strokeStyle = 'rgba(20,20,30,0.7)'; ctx.lineWidth = 1; line(ctx, -5, -30, 3, -18); line(ctx, 3, -18, -2, -6); }
    if (f < 0.3) { line(ctx, 5, -36, -3, -24); }
    ctx.restore();
  }
  ctx.restore();
}

function drawBird(ctx, z, T) {
  const flap = Math.sin(T * 16 + z.id);
  ctx.save(); ctx.translate(z.x, z.y); if (z.rot) ctx.rotate(z.rot);
  ctx.fillStyle = C('#15121a');
  ctx.beginPath(); ctx.moveTo(2, -2); ctx.quadraticCurveTo(12, -16 * flap - 6, 22, -12 * flap - 2); ctx.lineTo(10, 2); ctx.fill();
  ctx.fillStyle = C('#24202a'); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(26, -7); ctx.lineTo(27, 4); ctx.lineTo(10, 3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, -0.1, 0, 7); ctx.fill(); ctx.stroke();
  circle(ctx, -13, -4, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C('#c8b37a'); ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-29, -2); ctx.lineTo(-18, 0); ctx.fill();
  ctx.fillStyle = FLASH ? '#fff' : '#ff3b2a'; circle(ctx, -15, -6, 2); ctx.fill();
  ctx.fillStyle = C('#2e2836'); ctx.beginPath(); ctx.moveTo(-2, -3); ctx.quadraticCurveTo(6, -22 * flap - 4, 18, -18 * flap); ctx.lineTo(8, 1); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawZombie(ctx, z, T) {
  FLASH = z.flash > 0;
  if (z.state === 'dig') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(z.x, z.gy + 2, 24, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.ellipse(z.x, z.gy, 22, 9 + Math.sin(T * 10 + z.id) * 1.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e8b33a'; ctx.beginPath(); ctx.arc(z.x - 2, z.gy - 6, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff6c0'; circle(ctx, z.x - 9, z.gy - 9, 2.5); ctx.fill();
    FLASH = false; return;
  }
  if (z.fly) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(z.x, GROUND_Y + 4, 14, 4, 0, 0, 7); ctx.fill();
    drawBird(ctx, z, T);
  } else {
    const s = z.d.scale || 1;
    const hAir = Math.max(0, z.gy - z.y);
    ctx.fillStyle = `rgba(0,0,0,${0.3 * Math.max(0.2, 1 - hAir / 300)})`; ctx.beginPath(); ctx.ellipse(z.x, z.gy + 2, 18 * s, 5 * s, 0, 0, 7); ctx.fill();
    drawHumanoid(ctx, z, T);
  }
  FLASH = false;
  if (z.stun > 0) {
    const hy = z.fly ? z.y - 18 : z.y - z.h - 8;
    ctx.fillStyle = '#bcd0ff';
    for (let i = 0; i < 3; i++) { const a = T * 6 + i * 2.1; circle(ctx, z.x + Math.cos(a) * 12, hy + Math.sin(a) * 4, 2.2); ctx.fill(); }
  }
  if (!z.d.boss && (z.hp < z.maxHp || z.armor < z.maxArmor || z.shield < z.maxShield) && !z.dead) {
    const by = z.fly ? z.y - 22 : z.y - z.h - 10, w = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(z.x - w / 2 - 1, by - 1, w + 2, 5);
    ctx.fillStyle = '#e8453c'; ctx.fillRect(z.x - w / 2, by, w * Math.max(0, z.hp / z.maxHp), 3);
    if (z.maxArmor > 0 && z.armor > 0) { ctx.fillStyle = '#ffd24d'; ctx.fillRect(z.x - w / 2, by - 4, w * z.armor / z.maxArmor, 2.5); }
    if (z.maxShield > 0 && z.shield > 0) { ctx.fillStyle = '#8cc8ff'; ctx.fillRect(z.x - w / 2, by - 4, w * z.shield / z.maxShield, 2.5); }
  }
}

function drawGib(ctx, g) {
  ctx.save(); ctx.globalAlpha = Math.min(1, g.life / 1.2); ctx.translate(g.x, g.y); ctx.rotate(g.a);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.fillStyle = g.col;
  switch (g.shape) {
    case 'c': circle(ctx, 0, 0, g.r); ctx.fill(); ctx.stroke(); break;
    case 'head':
      circle(ctx, 0, 0, g.r); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1e140f'; circle(ctx, -g.r * 0.45, -g.r * 0.15, g.r * 0.25); ctx.fill();
      ctx.fillStyle = '#2a0f0f'; ctx.beginPath(); ctx.ellipse(-g.r * 0.5, g.r * 0.4, g.r * 0.3, g.r * 0.18, 0, 0, 7); ctx.fill(); break;
    case 'helmet': ctx.beginPath(); ctx.arc(0, 0, g.r, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(-g.r * 1.3, -1, g.r * 2.6, 3); break;
    case 'shield': roundRect(ctx, -g.w / 2, -g.h / 2, g.w, g.h, 3); ctx.fill(); ctx.stroke(); break;
    case 'rock':
      ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = g.r * (0.8 + ((i * 37) % 5) / 12); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'saw':
      ctx.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i % 2 ? g.r * 0.75 : g.r; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'feather': ctx.beginPath(); ctx.ellipse(0, 0, g.w, g.h, 0, 0, 7); ctx.fill(); break;
    default: roundRect(ctx, -g.w / 2, -g.h / 2, g.w, g.h, Math.min(g.w, g.h) / 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- iconos
function makeTowerIcon(key, w, h) {
  w = w || 72; h = h || 60;
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const fake = { key, tier: 1, ang: -0.12, recoil: 0, armT: 9, cd: 0, genT: 2, s: { genTime: 9, maxHp: 1 }, hp: 1, flash: 0, charge: 1, anim: 0, roof: true };
  const sc = { tesla: 0.6, recolector: 0.72, barricada: 0.78, mina: 1.3, riel: 0.72 }[key] || 0.82;
  g.translate(w / 2 - (key === 'riel' || key === 'ballesta' ? 5 : 0), h - (key === 'mina' ? 18 : 6)); g.scale(sc, sc);
  TOWER_DRAW[key](g, fake, 0.4);
  return c;
}
function makeZombieIcon(type, w, h) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const d = ZOMBIES[type];
  const z = { type, d, x: 0, y: 0, z: 0, gy: 0, state: 'walk', onGround: true, stun: 0, anim: 1.1, flash: 0, armor: d.armor || 0, maxArmor: d.armor || 0, shield: d.shield || 0, maxShield: d.shield || 0, id: 3, atkAnim: 0, hp: 1, maxHp: 1, fly: d.fly, h: d.h, spitAnim: 0 };
  if (d.fly) { g.translate(w / 2, h / 2); g.scale(w / 70, w / 70); drawBird(g, z, 0.3); return c; }
  const sc = (h * 0.86) / d.h;
  g.translate(w / 2 + 4, h - 4); g.scale(sc * (d.scale || 1) > 0 ? sc : 1, sc);
  drawHumanoid(g, z, 0.3);
  return c;
}
