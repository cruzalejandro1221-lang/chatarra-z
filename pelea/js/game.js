'use strict';
// Giorgio Brawl: dibujo en canvas, controles táctiles y de teclado, y menús. Las reglas están en core.js.
(() => {
  const B = window.BRAWL, { CHARS, IDS, STAGES } = B, $ = s => document.querySelector(s);
  const cv = $('#c'), g = cv.getContext('2d'), catImg = new Image(); catImg.src = '../media/giorgio/cara.webp';
  let M = null, me = 'giorgio', rival = 'tomas', stage = 0, skill = 1, cam = { x: 640, y: 420, z: 1 }, shake = 0, parts = [], pops = [], over = false, raf = 0;
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
    M = B.match([me, rival], stage); over = false; parts = []; pops = []; shake = 0;
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
      if (e.e === 'hit') { for (let i = 0; i < (e.big ? 16 : 7); i++) spark(e.x, e.y, e.big ? '#ffc629' : '#ffffff'); shake = Math.max(shake, e.big ? 12 : 4); pops.push({ x: e.x, y: e.y - 30, t: 40, s: e.d + '%' }); beep(e.big ? 160 : 260, 0.1, 'square'); buzz(e.big ? 30 : 10); }
      else if (e.e === 'ko') { for (let i = 0; i < 34; i++) spark(e.x, e.y, CHARS[M.f[e.who].id].accent); shake = 20; beep(90, 0.4, 'sawtooth'); buzz(60); }
      else if (e.e === 'jump' || e.e === 'up') { for (let i = 0; i < 4; i++) spark(e.x, e.y, '#ffffff'); beep(500, 0.06); }
      else if (e.e === 'dodge') beep(700, 0.05, 'sine');
    }
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
    const minx = Math.min(...xs, 300), maxx = Math.max(...xs, 980), miny = Math.min(...ys, 260), maxy = Math.max(...ys, 600);
    const portrait = H > W, viewH = portrait ? H * 0.62 : H;
    const z = Math.max(0.3, Math.min(W / (maxx - minx + 300), viewH / (maxy - miny + 280), 1.5 * W / 1280));
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
    parts = parts.filter(p => { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 16; p.t--; g.globalAlpha = p.t / 24; g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); g.globalAlpha = 1; return p.t > 0; });
    g.font = "26px 'Lilita One', sans-serif"; g.textAlign = 'center';
    pops = pops.filter(p => { p.y -= 1; p.t--; g.globalAlpha = Math.min(1, p.t / 15); g.lineWidth = 5; g.strokeStyle = '#1d2a5b'; g.strokeText(p.s, p.x, p.y); g.fillStyle = '#fff'; g.fillText(p.s, p.x, p.y); g.globalAlpha = 1; return p.t > 0; });
    hud();
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function fighter(p, i) {
    const c = p.c, f = p.face, run = p.ground && Math.abs(p.vx) > 40, t = M.t;
    g.save(); g.translate(p.x, p.y);
    if (p.inv > 0 && t % 8 < 4) g.globalAlpha = 0.55;
    g.fillStyle = 'rgba(0,0,0,.18)'; if (p.ground) { g.beginPath(); g.ellipse(0, 2, 30, 7, 0, 0, 7); g.fill(); }
    if (p.stun > 0) g.rotate(f * -0.3); if (p.dodge > 0) g.rotate(f * (p.dodge / 18) * 6.28);
    g.scale(f, 1); g.lineWidth = 4; g.strokeStyle = '#1d2a5b';
    const leg = run ? Math.sin(t * 0.5) * 12 : 0;
    g.fillStyle = '#3b4466'; for (const s of [-1, 1]) { rr(-13 + (s + 1) * 8 + s * leg * 0.5, -24, 10, 24, 5); g.fill(); g.stroke(); }
    g.fillStyle = c.color; rr(-20, -56, 40, 38, 14); g.fill(); g.stroke();
    head(p, c);
    // arma y estela
    const atk = p.atk; let ang = -0.5, active = false;
    if (atk) { const [s, a, e] = atk.f, k = p.af < s ? p.af / s : p.af < s + a ? 1 : 1 - (p.af - s - a) / e; ang = -1.8 + k * 2.4; active = p.af >= s && p.af < s + a; }
    g.save(); g.translate(14, -40); g.rotate(ang); weapon(p.id, c); g.restore();
    if (active && atk.r) { g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(atk.r[0] * 0.55, -38, atk.r[0] * 0.55, atk.r[1] * 0.5, 0, -1.3, 1.3); g.fill(); g.globalAlpha = 1; }
    g.restore();
    g.font = "16px 'Nunito', sans-serif"; g.textAlign = 'center'; g.fillStyle = i ? '#e5383b' : '#2f6fe4'; g.fillText(i ? 'BOT' : 'TÚ', p.x, p.y - 100);
    if (p.flash > 0) { g.globalAlpha = p.flash / 8 * 0.7; g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y - 40, 46, 0, 7); g.fill(); g.globalAlpha = 1; }
  }
  function head(p, c) {
    if (p.id === 'giorgio' && catImg.complete && catImg.naturalWidth) { g.drawImage(catImg, -34, -104, 68, 60); return; }
    g.fillStyle = p.id === 'tomas' ? '#c58d5f' : '#f2c79a'; g.beginPath(); g.arc(0, -70, 20, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#1d2a5b'; g.beginPath(); g.arc(9, -72, 3, 0, 7); g.fill();
    if (p.id === 'rosa') { g.fillStyle = '#3a2412'; g.beginPath(); g.moveTo(-22, -62); g.quadraticCurveTo(-24, -94, 2, -92); g.quadraticCurveTo(18, -92, 20, -80); g.lineTo(-8, -80); g.lineTo(-14, -52); g.closePath(); g.fill(); g.stroke(); }
    if (p.id === 'tomas') { g.fillStyle = '#5a3510'; g.beginPath(); g.arc(4, -60, 16, 0.2, 2.9); g.fill(); g.stroke(); g.fillStyle = '#e5383b'; rr(-20, -92, 40, 11, 5); g.fill(); g.stroke(); }
    if (p.id === 'chispa') { g.fillStyle = '#1d2a5b'; g.beginPath(); g.moveTo(-20, -74); g.lineTo(-12, -100); g.lineTo(-2, -88); g.lineTo(8, -102); g.lineTo(20, -76); g.closePath(); g.fill(); g.fillStyle = c.accent; rr(-22, -76, 44, 7, 3); g.fill(); }
  }
  function weapon(id, c) {
    g.lineWidth = 3;
    if (id === 'rosa') { g.fillStyle = '#9b6a35'; rr(-6, -4, 92, 7, 3); g.fill(); g.stroke(); g.fillStyle = c.accent; g.beginPath(); g.moveTo(86, -8); g.lineTo(110, 0); g.lineTo(86, 8); g.closePath(); g.fill(); g.stroke(); }
    else if (id === 'tomas') { g.fillStyle = '#8a5a2b'; rr(-4, -4, 62, 8, 3); g.fill(); g.stroke(); g.fillStyle = c.accent; g.beginPath(); g.moveTo(44, -24); g.quadraticCurveTo(76, -14, 62, 18); g.lineTo(44, 6); g.closePath(); g.fill(); g.stroke(); }
    else if (id === 'chispa') { g.fillStyle = c.accent; g.beginPath(); g.moveTo(0, -5); g.lineTo(38, 0); g.lineTo(0, 5); g.closePath(); g.fill(); g.stroke(); }
    else { g.fillStyle = c.accent; for (const k of [-6, 0, 6]) { g.beginPath(); g.moveTo(4, k - 3); g.lineTo(28, k); g.lineTo(4, k + 3); g.closePath(); g.fill(); } }
  }
  function hud() {
    M.f.forEach((p, i) => { const el = $('#p' + i); el.querySelector('b').textContent = Math.round(p.dmg) + '%'; el.querySelector('b').style.color = p.dmg > 100 ? '#e5383b' : p.dmg > 50 ? '#ff7a1a' : '#1d2a5b'; el.querySelector('small').textContent = p.c.name + ' ' + '●'.repeat(Math.max(0, p.stocks)); });
  }

  // ------------------------------------------------------------ controles
  const stick = $('#stick'), knob = $('#knob'); let sId = null, sx = 0, sy = 0;
  stick.addEventListener('pointerdown', e => { sId = e.pointerId; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; stick.setPointerCapture(sId); move(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sId) move(e); });
  const rel = e => { if (e.pointerId !== sId) return; sId = null; pad.mx = 0; pad.up = pad.down = false; knob.style.transform = ''; };
  stick.addEventListener('pointerup', rel); stick.addEventListener('pointercancel', rel);
  function move(e) {
    const dx = e.clientX - sx, dy = e.clientY - sy, L = Math.min(1, Math.hypot(dx, dy) / 44), a = Math.atan2(dy, dx);
    knob.style.transform = 'translate(' + Math.cos(a) * L * 30 + 'px,' + Math.sin(a) * L * 30 + 'px)';
    pad.mx = Math.abs(dx) > 12 ? Math.max(-1, Math.min(1, dx / 40)) : 0; pad.up = dy < -24; pad.down = dy > 26;
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
