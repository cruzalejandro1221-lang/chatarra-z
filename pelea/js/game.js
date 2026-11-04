'use strict';
// Giorgio Brawl: dibujo en canvas, controles táctiles y de teclado, y menús. Las reglas están en core.js.
(() => {
  const B = window.BRAWL, { CHARS, IDS, STAGES } = B, $ = s => document.querySelector(s);
  const cv = $('#c'), g = cv.getContext('2d'), catImg = new Image(); catImg.src = '../media/giorgio/cara.webp';
  let M = null, me = 'giorgio', rival = 'tomas', stage = 0, skill = 1, cam = { x: 640, y: 420, z: 1 }, shake = 0, parts = [], pops = [], fxs = [], over = false, raf = 0;
  const pad = { mx: 0 };

  function resize() { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; }
  addEventListener('resize', resize); resize();

  // ------------------------------------------------------------ menú
  function menu() {
    over = false; M = null; cancelAnimationFrame(raf); $('#ctl').hidden = true; $('#hud').hidden = true; $('#end').hidden = true; $('#menu').hidden = false;
    const card = (id, sel) => { const c = CHARS[id]; return '<button data-c="' + id + '" class="' + (id === sel ? 'on' : '') + '" style="--c:' + c.color + '"><b>' + c.name + '</b><small>' + c.role + ' · ' + c.weapon + '</small></button>'; };
    $('#pick').innerHTML = IDS.map(i => card(i, me)).join('');
    $('#pickR').innerHTML = IDS.map(i => card(i, rival)).join('');
    $('#stages').innerHTML = STAGES.map((s, i) => '<button data-s="' + i + '" class="' + (i === stage ? 'on' : '') + '" style="background:linear-gradient(' + s.sky.join(',') + ')">' + s.name + '</button>').join('');
    $('#skill').innerHTML = ['Fácil', 'Medio', 'Difícil'].map((t, i) => '<button data-k="' + i + '" class="' + (i === skill ? 'on' : '') + '">' + t + '</button>').join('');
  }
  $('#pick').onclick = e => { const b = e.target.closest('button'); if (b) { me = b.dataset.c; menu(); } };
  $('#pickR').onclick = e => { const b = e.target.closest('button'); if (b) { rival = b.dataset.c; menu(); } };
  $('#stages').onclick = e => { const b = e.target.closest('button'); if (b) { stage = +b.dataset.s; menu(); } };
  $('#skill').onclick = e => { const b = e.target.closest('button'); if (b) { skill = +b.dataset.k; menu(); } };
  $('#go').onclick = start;
  $('#exit').onclick = () => window.parent.postMessage({ gg: 'exit' }, location.origin);
  $('#hudBack').onclick = menu; $('#endMenu').onclick = menu; $('#endGo').onclick = start;

  function start() {
    M = B.match([me, rival], stage); over = false; parts = []; pops = []; fxs = []; shake = 0;
    $('#menu').hidden = true; $('#end').hidden = true; $('#hud').hidden = false; $('#ctl').hidden = false;
    let last = performance.now(), acc = 0;
    cancelAnimationFrame(raf);
    const loop = now => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(0.05, (now - last) / 1000); last = now;
      while (acc >= 1 / 60) { acc -= 1 / 60; tick(); }
      draw();
    };
    raf = requestAnimationFrame(loop);
  }
  function tick() {
    if (!M || over) return;
    B.step(M, [Object.assign({}, pad), B.bot(M, 1, skill)]);
    pad.light = pad.heavy = pad.special = pad.jump = pad.dodge = false;
    for (const e of M.events) {
      if (e.e === 'hit') { for (let i = 0; i < (e.big ? 18 : 8); i++) spark(e.x, e.y, e.big ? '#ffc629' : '#ffffff'); shake = Math.max(shake, e.big ? 16 : 6); fxAdd({ k: 'star', x: e.x, y: e.y, t: 11, big: e.big, rot: Math.random() * 3 }); fxAdd({ k: 'ring', x: e.x, y: e.y, t: 14, big: e.big }); if (e.big) fxAdd({ k: 'lines', x: e.x, y: e.y, t: 16, rot: Math.random() }); pops.push({ x: e.x, y: e.y - 40, t: 34, s: e.d + '%' }); beep(e.big ? 160 : 260, 0.1, 'square'); buzz(e.big ? 30 : 10); }
      else if (e.e === 'ko') { for (let i = 0; i < 40; i++) spark(e.x, e.y, CHARS[M.f[e.who].id].accent); fxAdd({ k: 'ring', x: e.x, y: e.y, t: 26, big: true }); fxAdd({ k: 'lines', x: e.x, y: e.y, t: 24, rot: 0 }); shake = 26; beep(90, 0.4, 'sawtooth'); buzz(60); }
      else if (e.e === 'jump' || e.e === 'up') { for (let i = 0; i < 4; i++) spark(e.x, e.y, '#ffffff'); beep(500, 0.06); }
      else if (e.e === 'dodge') beep(700, 0.05, 'sine');
    }
    M.f.forEach(p => {
      const a = p.atk;                                                    // el corte nace justo en el primer cuadro activo del golpe
      if (a && a.r && p.af === a.f[0]) {
        const th = p.id === 'rosa' || p.id === 'sofia';
        fxAdd({ k: th ? 'thrust' : 'slash', x: p.x + p.face * 10, y: p.y - 44, f: p.face, r: a.r[0] + (th ? 10 : 6), c: p.c.accent, t: a.f[1] + 6, claw: p.id === 'giorgio' }); beep(th ? 760 : 420, 0.07, 'sawtooth');
      }
      if (p.stun > 0 && Math.hypot(p.vx, p.vy) > 620 && M.t % 2 === 0) fxAdd({ k: 'smoke', x: p.x, y: p.y - 40, t: 18, c: '#ffffff' });
    });
    if (M.over) { over = true; setTimeout(end, 900); }
  }
  function end() {
    if (!M) return; const win = M.over.winner === 0;
    $('#endT').textContent = win ? '¡Ganaste!' : 'Perdiste';
    $('#endS').textContent = CHARS[M.f[M.over.winner].id].name + ' se queda con la arena';
    $('#end').hidden = false; $('#ctl').hidden = true;
  }
  const spark = (x, y, c) => parts.push({ x, y, vx: (Math.random() - 0.5) * 520, vy: (Math.random() - 0.7) * 520, t: 24, c });

  // ------------------------------------------------------------ dibujo
  function draw() {
    if (!M) return;
    const W = cv.width, H = cv.height, [a, b] = M.f, st = M.st;
    const live = [a, b].filter(p => p.stocks > 0 && p.dead <= 0);
    const xs = live.map(p => p.x), ys = live.map(p => p.y - 40);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys, 430), maxy = Math.max(...ys, 560);
    const portrait = H > W, viewH = portrait ? H * 0.62 : H;
    const z = Math.max(0.3, Math.min(W / (maxx - minx + 300), viewH / (maxy - miny + 300), W / 520));
    cam.z += (z - cam.z) * 0.08; cam.x += ((minx + maxx) / 2 - cam.x) * 0.1; cam.y += ((miny + maxy) / 2 - cam.y) * 0.1;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, st.sky[0]); sky.addColorStop(1, st.sky[1]);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    shake *= 0.86;
    g.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z + (Math.random() - 0.5) * shake, viewH / 2 - cam.y * cam.z + (Math.random() - 0.5) * shake);
    for (const q of st.plats) {
      if (q.solid) {
        g.fillStyle = st.ground; rr(q.x + 14, q.y, q.w - 28, 150, 26); g.fill();
        g.fillStyle = st.top; rr(q.x, q.y - 4, q.w, 26, 13); g.fill();
      } else { g.fillStyle = st.top; rr(q.x, q.y - 3, q.w, 12, 6); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; rr(q.x + 6, q.y + 7, q.w - 12, 5, 3); g.fill(); }
    }
    for (const s of M.shots) { g.fillStyle = s.color; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); g.strokeStyle = '#1d2a5b'; g.lineWidth = 3; g.stroke(); }
    M.f.forEach((p, i) => { if (p.stocks > 0 && p.dead <= 0) fighter(p, i); });
    drawFx();
    parts = parts.filter(p => { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 16; p.t--; g.globalAlpha = p.t / 24; g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); g.globalAlpha = 1; return p.t > 0; });
    g.font = "26px 'Lilita One', sans-serif"; g.textAlign = 'center';
    pops = pops.filter(p => { p.y -= 1; p.t--; g.globalAlpha = Math.min(1, p.t / 15); g.lineWidth = 5; g.strokeStyle = '#1d2a5b'; g.strokeText(p.s, p.x, p.y); g.fillStyle = '#fff'; g.fillText(p.s, p.x, p.y); g.globalAlpha = 1; return p.t > 0; });
    hud();
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  // Dibujo del luchador con poses: reposo, carrera, salto, carga, golpe, recuperación y daño.
  const ease = k => 1 - Math.pow(1 - k, 3);
  function pose(p) {
    const a = p.atk; if (!a) return { k: 0, ph: 'none', on: false };
    const [s, d, e] = a.f;
    if (p.af < s) return { k: p.af / s, ph: 'wind', on: false };
    if (p.af < s + d) return { k: (p.af - s) / d, ph: 'hit', on: true };
    return { k: (p.af - s - d) / e, ph: 'back', on: false };
  }
  function limb(x1, y1, x2, y2, w, col) { g.lineCap = 'round'; g.strokeStyle = '#1d2a5b'; g.lineWidth = w + 6; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  const SKIN = { giorgio: '#5a4032', rosa: '#f2c79a', tomas: '#c58d5f', chispa: '#f2c79a', pepe: '#8fc46a', sofia: '#f2c79a' };
  const LEGS = { giorgio: '#5a4032', rosa: '#3b4466', tomas: '#4a3b2c', chispa: '#1d2a5b', pepe: '#4a3b2c', sofia: '#3b4466' };
  function fighter(p, i) {
    const c = p.c, f = p.face, t = M.t, air = !p.ground, run = p.ground && Math.abs(p.vx) > 40, po = pose(p), thrust = p.id === 'rosa' || p.id === 'sofia';
    if (p.dodge > 0) for (let n = 1; n <= 3; n++) { g.globalAlpha = 0.16; g.fillStyle = c.color; g.beginPath(); g.ellipse(p.x - p.vx * 0.02 * n, p.y - 42, 24, 40, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.save(); g.translate(p.x, p.y);
    if (p.ground) { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 3, 32, 7, 0, 0, 7); g.fill(); }
    if (p.inv > 0 && p.dodge <= 0 && t % 8 < 4) g.globalAlpha = 0.6;
    // estiramiento según la velocidad y empuje del cuerpo al golpear
    const st = air ? Math.min(0.16, Math.abs(p.vy) / 6000) : 0, push = po.ph === 'wind' ? -8 * po.k : po.ph === 'hit' ? 16 : po.ph === 'back' ? 16 * (1 - po.k) : 0;
    let lean = run ? 0.14 : 0; if (po.ph === 'wind') lean = -0.3 * po.k; else if (po.ph === 'hit') lean = 0.34; else if (po.ph === 'back') lean = 0.34 * (1 - po.k);
    if (p.stun > 0) lean = -0.5 + Math.sin(t * 0.9) * 0.15;
    g.scale(f * (1 - st), 1 + st); g.translate(push, 0);
    if (p.dodge > 0) { g.translate(0, -40); g.rotate((p.dodge / 18) * 6.28); g.translate(0, 40); }
    const sw = run ? Math.sin(t * 0.42) : 0, bob = run ? Math.abs(Math.cos(t * 0.42)) * 3 : Math.sin(t * 0.08) * 1.4;
    // piernas
    for (const s of [-1, 1]) {
      const fx = air ? s * 9 - 4 : s * 10 + sw * s * 15, fy = air ? -8 + (s > 0 ? -7 : 0) : -Math.max(0, sw * s) * 8;
      limb(s * 7, -26, fx, fy, 9, LEGS[p.id]);
    }
    g.translate(0, -bob); g.rotate(lean);
    if (p.id === 'giorgio') { g.lineCap = 'round'; g.strokeStyle = '#1d2a5b'; g.lineWidth = 13; const w = Math.sin(t * 0.12) * 8; g.beginPath(); g.moveTo(-16, -34); g.quadraticCurveTo(-42, -40 + w, -36, -66 + w); g.stroke(); g.strokeStyle = '#5a4032'; g.lineWidth = 8; g.stroke(); }
    limb(-12, -50, -22 + sw * 8, -32, 8, SKIN[p.id]);                                            // brazo de atrás
    g.lineWidth = 4; g.strokeStyle = '#1d2a5b'; g.fillStyle = c.color; rr(-20, -60, 40, 40, 15); g.fill(); g.stroke();
    if (p.id === 'giorgio') { g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(-10, -60); g.lineTo(0, -55); g.lineTo(10, -60); g.lineTo(10, -50); g.lineTo(0, -55); g.lineTo(-10, -50); g.closePath(); g.fill(); g.stroke(); }
    else { g.fillStyle = 'rgba(255,255,255,.22)'; rr(-13, -55, 26, 7, 3); g.fill(); }
    head(p, c);
    // brazo delantero y arma: carga atrás y remata adelante
    let ang = -0.55 + Math.sin(t * 0.08) * 0.05, reach = 0;
    if (thrust) { if (po.ph === 'wind') { ang = -0.1; reach = -16 * po.k; } else if (po.ph === 'hit') { ang = 0; reach = 30; } else if (po.ph === 'back') { ang = -0.3 * po.k; reach = 30 * (1 - ease(po.k)); } }
    else { if (po.ph === 'wind') ang = -0.55 - 1.55 * ease(po.k); else if (po.ph === 'hit') ang = -2.1 + 3.1 * ease(po.k); else if (po.ph === 'back') ang = 1 - 1.55 * po.k; }
    const hx = 14 + Math.cos(ang) * 16 + reach, hy = -46 + Math.sin(ang) * 16;
    limb(12, -50, hx, hy, 8, SKIN[p.id]);
    g.save(); g.translate(hx, hy); g.rotate(ang); weapon(p.id, c); g.restore();
    g.restore();
    g.font = "900 15px 'Nunito', sans-serif"; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText(i ? 'BOT' : 'TÚ', p.x, p.y - 112); g.fillStyle = i ? '#e5383b' : '#2f6fe4'; g.fillText(i ? 'BOT' : 'TÚ', p.x, p.y - 112);
    if (p.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = p.flash / 8 * 0.6; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(p.x, p.y - 44, 34, 50, 0, 0, 7); g.fill(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  }
  // Efectos de combate: medialuna de corte, estocada, estrella de impacto, onda y líneas de velocidad.
  function drawFx() {
    fxs = fxs.filter(e => {
      const k = e.t / e.max; e.t--;
      g.save(); g.translate(e.x, e.y);
      if (e.k === 'slash') {
        g.scale(e.f, 1); const R = e.r, a0 = -1.35, a1 = 1.05, thick = R * 0.34 * k;
        g.globalAlpha = Math.min(1, k * 1.5); g.beginPath(); g.arc(0, 0, R, a0, a1); g.quadraticCurveTo(R * 0.55, 0, R * Math.cos(a0) + thick * 0.2, R * Math.sin(a0)); g.closePath();
        const gr = g.createLinearGradient(0, -R, R, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, e.c); g.fillStyle = gr; g.fill();
        g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, R, a0, a1); g.stroke();
        if (e.claw) for (const d of [-14, 14]) { g.beginPath(); g.arc(0, d, R * 0.82, a0 + 0.3, a1 - 0.2); g.stroke(); }
      } else if (e.k === 'thrust') {
        g.scale(e.f, 1); const L = e.r * (1.15 - k * 0.15); g.globalAlpha = k; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(10, -9 * k); g.lineTo(L, 0); g.lineTo(10, 9 * k); g.closePath(); g.fill();
        g.fillStyle = e.c; g.beginPath(); g.moveTo(10, -4 * k); g.lineTo(L * 0.86, 0); g.lineTo(10, 4 * k); g.closePath(); g.fill();
      } else if (e.k === 'star') {
        const R = (e.big ? 74 : 40) * (1.25 - k * 0.5); g.rotate(e.rot); g.globalAlpha = Math.min(1, k * 1.6); g.beginPath();
        for (let n = 0; n < 16; n++) { const a = n / 16 * 6.283, r = n % 2 ? R * 0.42 : R; g[n ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
        g.fillStyle = e.big ? '#ffc629' : '#fff'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#1d2a5b'; g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, R * 0.3, 0, 7); g.fill();
      } else if (e.k === 'ring') {
        g.globalAlpha = k; g.lineWidth = 10 * k + 1; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, (1 - k) * (e.big ? 130 : 70) + 12, 0, 7); g.stroke();
      } else if (e.k === 'lines') {
        g.globalAlpha = k; g.strokeStyle = '#fff'; g.lineWidth = 5;
        for (let n = 0; n < 12; n++) { const a = n / 12 * 6.283 + e.rot, r = 60 + (1 - k) * 110; g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a) * (r + 54 * k), Math.sin(a) * (r + 54 * k)); g.stroke(); }
      } else if (e.k === 'smoke') {
        g.globalAlpha = k * 0.55; g.fillStyle = e.c; g.beginPath(); g.arc(0, 0, 8 + (1 - k) * 18, 0, 7); g.fill();
      }
      g.restore(); g.globalAlpha = 1;
      return e.t > 0;
    });
  }
  const fxAdd = o => { o.max = o.t; fxs.push(o); };
  function head(p, c) {
    if (p.id === 'giorgio' && catImg.complete && catImg.naturalWidth) { g.drawImage(catImg, -34, -104, 68, 60); return; }
    g.fillStyle = p.id === 'tomas' ? '#c58d5f' : '#f2c79a'; g.beginPath(); g.arc(0, -70, 20, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#1d2a5b'; g.beginPath(); g.arc(9, -72, 3, 0, 7); g.fill();
    if (p.id === 'rosa') { g.fillStyle = '#3a2412'; g.beginPath(); g.moveTo(-22, -62); g.quadraticCurveTo(-24, -94, 2, -92); g.quadraticCurveTo(18, -92, 20, -80); g.lineTo(-8, -80); g.lineTo(-14, -52); g.closePath(); g.fill(); g.stroke(); }
    if (p.id === 'tomas') { g.fillStyle = '#5a3510'; g.beginPath(); g.arc(4, -60, 16, 0.2, 2.9); g.fill(); g.stroke(); g.fillStyle = '#e5383b'; rr(-20, -92, 40, 11, 5); g.fill(); g.stroke(); }
    if (p.id === 'pepe') { g.fillStyle = '#8fc46a'; g.beginPath(); g.arc(0, -70, 20, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -73, 5, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e5383b'; g.beginPath(); g.arc(11, -73, 2, 0, 7); g.fill(); g.fillStyle = '#5a6b3a'; rr(-16, -94, 30, 8, 4); g.fill(); }
    if (p.id === 'sofia') { g.fillStyle = '#d9a865'; g.beginPath(); g.moveTo(-21, -56); g.quadraticCurveTo(-24, -94, 2, -92); g.quadraticCurveTo(18, -92, 20, -80); g.lineTo(-6, -80); g.lineTo(-12, -48); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#1d2a5b'; g.beginPath(); g.arc(9, -72, 3, 0, 7); g.fill(); }
    if (p.id === 'chispa') { g.fillStyle = '#1d2a5b'; g.beginPath(); g.moveTo(-20, -74); g.lineTo(-12, -100); g.lineTo(-2, -88); g.lineTo(8, -102); g.lineTo(20, -76); g.closePath(); g.fill(); g.fillStyle = c.accent; rr(-22, -76, 44, 7, 3); g.fill(); }
  }
  function weapon(id, c) {
    g.lineWidth = 3;
    if (id === 'rosa') { g.fillStyle = '#9b6a35'; rr(-6, -4, 92, 7, 3); g.fill(); g.stroke(); g.fillStyle = c.accent; g.beginPath(); g.moveTo(86, -8); g.lineTo(110, 0); g.lineTo(86, 8); g.closePath(); g.fill(); g.stroke(); }
    else if (id === 'tomas') { g.fillStyle = '#8a5a2b'; rr(-4, -4, 62, 8, 3); g.fill(); g.stroke(); g.fillStyle = c.accent; g.beginPath(); g.moveTo(44, -24); g.quadraticCurveTo(76, -14, 62, 18); g.lineTo(44, 6); g.closePath(); g.fill(); g.stroke(); }
    else if (id === 'pepe') { g.fillStyle = '#8a5a2b'; rr(-4, -4, 70, 8, 3); g.fill(); g.stroke(); g.fillStyle = c.accent; g.beginPath(); g.moveTo(62, -15); g.lineTo(92, -9); g.quadraticCurveTo(100, 0, 92, 9); g.lineTo(62, 15); g.closePath(); g.fill(); g.stroke(); }
    else if (id === 'sofia') { g.strokeStyle = c.accent; g.lineWidth = 6; g.beginPath(); g.arc(4, 0, 34, -1.2, 1.2); g.stroke(); g.strokeStyle = '#1d2a5b'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, -32); g.lineTo(16, 32); g.stroke(); }
    else if (id === 'chispa') { g.fillStyle = c.accent; g.beginPath(); g.moveTo(0, -5); g.lineTo(38, 0); g.lineTo(0, 5); g.closePath(); g.fill(); g.stroke(); }
    else { g.fillStyle = c.accent; for (const k of [-6, 0, 6]) { g.beginPath(); g.moveTo(4, k - 3); g.lineTo(28, k); g.lineTo(4, k + 3); g.closePath(); g.fill(); } }
  }
  function hud() {
    M.f.forEach((p, i) => { const el = $('#p' + i); el.querySelector('b').textContent = Math.round(p.dmg) + '%'; el.querySelector('b').style.color = p.dmg > 100 ? '#e5383b' : p.dmg > 50 ? '#ff7a1a' : '#1d2a5b'; el.querySelector('small').textContent = p.c.name + ' ' + '●'.repeat(Math.max(0, p.stocks)); });
  }

  // ------------------------------------------------------------ controles
  // Joystick flotante: nace donde apoyas el pulgar en cualquier parte de la zona izquierda y te sigue si te pasas del borde.
  const zone = $('#zone'), stick = $('#stick'), knob = $('#knob'), RAD = 56; let sId = null, sx = 0, sy = 0;
  const seat = () => { stick.style.left = sx + 'px'; stick.style.top = sy + 'px'; };
  zone.addEventListener('pointerdown', e => { if (sId !== null) return; sId = e.pointerId; sx = e.clientX; sy = e.clientY; seat(); stick.classList.add('on'); try { zone.setPointerCapture(sId); } catch (x) { /* nada */ } move(e); });
  zone.addEventListener('pointermove', e => { if (e.pointerId === sId) move(e); });
  const rel = e => { if (e.pointerId !== sId) return; sId = null; pad.mx = 0; pad.up = pad.down = false; knob.style.transform = ''; stick.classList.remove('on'); };
  zone.addEventListener('pointerup', rel); zone.addEventListener('pointercancel', rel);
  function move(e) {
    let dx = e.clientX - sx, dy = e.clientY - sy, L = Math.hypot(dx, dy);
    if (L > RAD) { sx += dx * (1 - RAD / L); sy += dy * (1 - RAD / L); seat(); dx = e.clientX - sx; dy = e.clientY - sy; L = RAD; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    pad.mx = Math.abs(dx) > 9 ? Math.max(-1, Math.min(1, dx / 34)) : 0; pad.up = dy < -26; pad.down = dy > 30;
  }
  document.querySelectorAll('[data-b]').forEach(b => { b.addEventListener('pointerdown', e => { e.preventDefault(); pad[b.dataset.b] = true; }); });
  const K = { j: 'light', k: 'heavy', l: 'special', ' ': 'jump', Shift: 'dodge' }, keys = {};
  addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (keys[k]) return; keys[k] = true;
    if (K[k]) { pad[K[k]] = true; e.preventDefault(); }
    keyDir();
  });
  addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; keyDir(); });
  function keyDir() { pad.mx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0); pad.up = !!(keys.ArrowUp || keys.w); pad.down = !!(keys.ArrowDown || keys.s); }

  let ac = null;
  const beep = (f, d, type) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime; o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); v.gain.setValueAtTime(0.06, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) { /* sin audio */ } };
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };
  menu();
  window.BrawlDebug = { get M() { return M; }, pad, tick, draw, start };
})();
