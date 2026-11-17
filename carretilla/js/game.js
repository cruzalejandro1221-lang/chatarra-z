'use strict';
// La Carretilla de Giorgio: juego de cocina por niveles. Llegan clientes, piden con una nube de imágenes y cocinas en vivo.
// Crudo o quemado: se queja y no paga. En su punto: paga, y si fuiste rápido deja propina.
(() => {
  const A = window.CART_ART, $ = s => document.querySelector(s), stage = $('#stage');
  // ---------------------------------------------------------------- carta y niveles
  const DISH = {
    papas: { name: 'Papas fritas', need: ['papas'], price: 4 },
    hotdog: { name: 'Hot dog', need: ['pan_hd', 'salchicha'], price: 5, sauces: true },
    salchipapa: { name: 'Salchipapa', need: ['papas', 'salchicha'], price: 7, sauces: true },
    broster: { name: 'Broster', need: ['pollo', 'papas'], opt: ['arroz', 'ensalada'], price: 10, sauces: true },
    hamburguesa: { name: 'Hamburguesa', need: ['pan_hb', 'carne', 'lechuga'], price: 9, sauces: true },
  };
  const DRINK_PRICE = 2, COOK_T = { papas: 7, pollo: 9, salchicha: 6, carne: 8 }, STATION = { papas: 'fry', pollo: 'fry', salchicha: 'grill', carne: 'grill' };
  const LEVELS = [
    { menu: ['papas'], n: 5, pat: 60, gap: [6, 9], fry: 2 },
    { menu: ['papas'], drinks: true, n: 6, pat: 52, gap: [6, 9], fry: 2 },
    { menu: ['papas', 'hotdog'], drinks: true, sauces: true, n: 7, pat: 52, gap: [6, 8.5], fry: 2 },
    { menu: ['papas', 'hotdog', 'salchipapa'], drinks: true, sauces: true, n: 8, pat: 50, gap: [6, 8], fry: 2 },
    { menu: ['papas', 'hotdog', 'salchipapa', 'broster'], drinks: true, sauces: true, n: 8, pat: 52, gap: [6, 8.5], fry: 3 },
    { menu: ['papas', 'hotdog', 'salchipapa', 'broster', 'hamburguesa'], drinks: true, sauces: true, n: 9, pat: 52, gap: [6, 8], fry: 3 },
    { menu: 'all', drinks: true, sauces: true, n: 9, pat: 50, gap: [5.5, 8], fry: 3, two: 0.3 },
    { menu: 'all', drinks: true, sauces: true, n: 10, pat: 48, gap: [5.5, 7.5], fry: 3, two: 0.45 },
    { menu: 'all', drinks: true, sauces: true, n: 10, pat: 46, gap: [5, 7.5], fry: 3, two: 0.55 },
    { menu: 'all', drinks: true, sauces: true, n: 11, pat: 44, gap: [5, 7], fry: 3, two: 0.6 },
    { menu: 'all', drinks: true, sauces: true, n: 12, pat: 42, gap: [4.5, 7], fry: 3, two: 0.7 },
    { menu: 'all', drinks: true, sauces: true, n: 13, pat: 40, gap: [4.5, 6.5], fry: 3, two: 0.8 },
  ];
  const NEW = { 1: ['papas'], 2: ['drinks'], 3: ['hotdog', 'sauces'], 4: ['salchipapa'], 5: ['broster'], 6: ['hamburguesa'], 7: ['two'] };
  const menuOf = L => (L.menu === 'all' ? Object.keys(DISH) : L.menu);
  const SAVE = 'gg_carretilla';
  const prog = () => { try { return Object.assign({ open: 1, stars: {}, best: {} }, JSON.parse(localStorage.getItem(SAVE))); } catch (e) { return { open: 1, stars: {}, best: {} }; } };
  const keep = P => { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (e) { /* lleno */ } };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------------------------------------------------------------- sonido
  let ac = null, sizzle = null;
  function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
  function tone(f, d, type, v, at) { const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (at || 0); o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02); }
  function sizzleOn(level) {
    const a = audio(); if (!a) return;
    if (!sizzle) { const n = a.sampleRate * 2, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.35); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; s.loop = true; f.type = 'bandpass'; f.frequency.value = 4200; f.Q.value = 0.7; g.gain.value = 0; s.connect(f).connect(g).connect(a.destination); s.start(); sizzle = g; }
    sizzle.gain.setTargetAtTime(Math.min(0.09, level * 0.03), a.currentTime, 0.2);
  }
  const SFX = { ding: () => { tone(1320, 0.12, 'sine', 0.07); tone(1760, 0.2, 'sine', 0.06, 0.08); }, cash: () => { tone(880, 0.06, 'square', 0.05); tone(1320, 0.08, 'square', 0.05, 0.06); tone(1760, 0.18, 'triangle', 0.06, 0.12); },
    pop: () => tone(620, 0.06, 'triangle', 0.06), bad: () => { tone(220, 0.18, 'sawtooth', 0.06); tone(160, 0.25, 'sawtooth', 0.05, 0.12); }, plop: () => tone(300, 0.08, 'sine', 0.08), squirt: () => tone(500, 0.12, 'sawtooth', 0.025), bell: () => { tone(988, 0.3, 'sine', 0.06); tone(1480, 0.4, 'sine', 0.04, 0.05); } };
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };

  // ---------------------------------------------------------------- estado de la partida
  let G = null, raf = 0, last = 0, P = prog();

  function fit() { const s = Math.min(innerWidth / 390, innerHeight / 800); stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')'; }
  addEventListener('resize', fit); fit();

  // ---------------------------------------------------------------- menú de niveles
  function menu() {
    cancelAnimationFrame(raf); G = null; if (sizzle) sizzle.gain.value = 0;
    P = prog();
    const total = Object.values(P.stars).reduce((a, b) => a + b, 0);
    stage.innerHTML = '<div class="bg">' + A.street() + '</div><div class="umb">' + A.umbrella() + '</div><div class="menu"><button class="x" id="out" aria-label="Volver">‹</button><div class="logo"><img src="../media/giorgio/feliz.webp" alt=""><h1>LA CARRETILLA<br><span>DE GIORGIO</span></h1><p>★ ' + total + ' / ' + LEVELS.length * 3 + '</p></div>' +
      '<div class="lv">' + LEVELS.map((L, i) => { const n = i + 1, lock = n > P.open, st = P.stars[n] || 0; return '<button data-n="' + n + '"' + (lock ? ' disabled' : '') + '><b>' + (lock ? '🔒' : n) + '</b><span>' + '★'.repeat(st) + '<u>' + '★'.repeat(3 - st) + '</u></span>' + (NEW[n] && !lock ? '<em>' + newIcon(NEW[n][0]) + '</em>' : '') + '</button>'; }).join('') + '</div>' +
      '<button class="recipes-btn" id="rec">📖 Recetas</button></div>';
    stage.querySelectorAll('.lv button').forEach(b => { b.onclick = () => { audio(); start(+b.dataset.n); }; });
    $('#rec').onclick = () => recipes(P.open);
    $('#out').onclick = () => window.parent.postMessage({ gg: 'exit' }, location.origin);
  }
  function newIcon(k) { return k === 'drinks' ? '🥤' : k === 'sauces' ? '🥫' : k === 'two' ? '✌️' : ({ papas: '🍟', hotdog: '🌭', salchipapa: '🍽️', broster: '🍗', hamburguesa: '🍔' })[k] || ''; }

  // ---------------------------------------------------------------- arma la carretilla según lo desbloqueado
  function start(n) {
    const L = LEVELS[n - 1], menuL = menuOf(L);
    const uses = k => menuL.some(d => DISH[d].need.includes(k) || (DISH[d].opt || []).includes(k));
    G = { n, L, menu: menuL, t: 0, coins: 0, served: 0, lost: 0, spawned: 0, next: 1.2, paused: false, over: false,
      fry: Array(L.fry).fill(null), grill: Array(uses('salchicha') || uses('carne') ? 3 : 0).fill(null), plates: [null, null, null].map(() => ({ items: {}, sauces: [] })),
      sel: null, lastPlate: 0, cust: [null, null, null], tut: n === 1 && !P.best[1] ? 0 : -1, uses };
    const goalBase = G.L.n * (menuL.reduce((a, d) => a + DISH[d].price, 0) / menuL.length * (1 + (L.two || 0)) + (L.drinks ? 1 : 0));
    G.goal = Math.round(goalBase * 0.6); G.max = Math.round(goalBase * 1.15);
    const bins = ['papas', 'pollo', 'salchicha', 'carne', 'pan_hd', 'pan_hb'].filter(uses), sides = ['lechuga', 'arroz', 'ensalada'].filter(uses);
    stage.innerHTML = '<div class="bg">' + A.street() + '</div><div class="umb">' + A.umbrella() + '</div>' +
      '<div class="hud"><button class="x" id="pause" aria-label="Pausa">⏸</button><span class="pill coin">S/ <b id="coins">0</b><small>/ ' + G.goal + '</small></span><span class="pill">Nivel ' + n + '</span><span class="pill">👥 <b id="left">' + L.n + '</b></span></div>' +
      '<div class="sign"><img src="../media/giorgio/cara.webp" alt=""><span>Carretilla de Giorgio</span></div>' +
      '<div id="custs"></div><div class="counter"></div>' +
      '<div class="steel">' +
      '<div class="plates">' + G.plates.map((_, i) => '<button class="plate" data-plate="' + i + '"></button>').join('') + '</div>' +
      '<div class="stations">' +
      '<div class="fryer"><b class="tag">Freidora</b><div class="oil">' + G.fry.map((_, i) => '<button class="slot fry" data-slot="fry:' + i + '"><i class="basket"></i></button>').join('') + '<i class="bubbles"></i></div></div>' +
      (G.grill.length ? '<div class="grill"><b class="tag">Plancha</b><div class="iron">' + G.grill.map((_, i) => '<button class="slot gr" data-slot="grill:' + i + '"></button>').join('') + '</div></div>' : '<div class="grill off"><b class="tag">Plancha</b><p>🔒 Pronto</p></div>') +
      '</div>' +
      '<div class="bins">' + bins.map(k => '<button class="bin" data-bin="' + k + '">' + A.svg(A.ITEM[k](k in A.COOK ? A.COOK[k][0] : null, 0)) + '<small>' + LABEL[k] + '</small></button>').join('') + '</div>' +
      '<div class="low">' + sides.map(k => '<button class="bin side" data-bin="' + k + '">' + A.svg(A.ITEM[k]()) + '<small>' + LABEL[k] + '</small></button>').join('') +
      (L.sauces ? '<div class="sauces">' + Object.keys(A.SAUCE).map(k => '<button class="sauce" data-sauce="' + k + '">' + A.svg(A.squeeze(k)) + '<small>' + A.SAUCE[k].name + '</small></button>').join('') + '</div>' : '') +
      (L.drinks ? '<div class="cooler">' + ['inca', 'coca'].map(k => '<button class="drink" data-drink="' + k + '">' + A.svg(A.bottle(k)) + '</button>').join('') + '</div>' : '') +
      '<button class="trash" id="trash" aria-label="Basura">🗑️</button><button class="book" id="book" aria-label="Recetas">📖</button></div>' +
      '</div><div id="fx"></div><div id="hand" hidden>👆</div><div id="tip" hidden></div><div id="modal" hidden></div>';
    wire(); drawPlates(); drawSlots();
    const intro = NEW[n];
    if (intro) showNew(n, intro, () => go()); else go();
  }
  const LABEL = { papas: 'Papas', pollo: 'Pollo', salchicha: 'Salchicha', carne: 'Carne', pan_hd: 'Pan hot dog', pan_hb: 'Pan hamburguesa', lechuga: 'Lechuga', arroz: 'Arroz', ensalada: 'Ensalada' };
  function go() { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }

  // ---------------------------------------------------------------- toques
  function wire() {
    stage.querySelectorAll('[data-bin]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); tapBin(b.dataset.bin, b); }));
    stage.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); const [st, i] = b.dataset.slot.split(':'); tapSlot(st, +i, b); }));
    stage.querySelectorAll('[data-plate]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); tapPlate(+b.dataset.plate); }));
    stage.querySelectorAll('[data-sauce]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); tapSauce(b.dataset.sauce, b); }));
    stage.querySelectorAll('[data-drink]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); G.sel = G.sel && G.sel.drink === b.dataset.drink ? null : { drink: b.dataset.drink }; SFX.pop(); drawSel(); }));
    $('#trash').addEventListener('pointerdown', e => { e.preventDefault(); tapTrash(); });
    $('#book').onclick = () => { G.paused = true; recipes(G.n, () => { G.paused = false; go(); }); };
    $('#pause').onclick = () => pauseMenu();
  }
  function shake(el) { if (!el) return; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); buzz(15); }
  function tapBin(k, el) {
    if (!G || G.over || G.paused) return;
    audio();
    if (STATION[k]) {
      const arr = G[STATION[k]], i = arr.findIndex(x => !x);
      if (i < 0) { tip(STATION[k] === 'fry' ? 'La freidora está llena' : 'La plancha está llena'); shake(el); return; }
      arr[i] = { k, t: 0 }; SFX.plop(); drawSlots(); fly(el, stage.querySelector('[data-slot="' + STATION[k] + ':' + i + '"]'), A.ITEM[k](A.COOK[k][0], 0));
      if (G.tut === 0) G.tut = 1;
      return;
    }
    if (addToPlate(k, { q: 'ok' }, el) && G.tut >= 0) { /* nada */ }
  }
  const stateOf = (k, t) => { const p = t / COOK_T[k]; return { p, q: p < 1 ? 'raw' : p < 1.9 ? 'ok' : 'burnt', c: A.cookColor(k, p) }; };
  function tapSlot(st, i, el) {
    if (!G || G.over || G.paused) return;
    const it = G[st][i]; if (!it) return;
    const s = stateOf(it.k, it.t);
    if (addToPlate(it.k, { q: s.q, c: s.c }, el)) { G[st][i] = null; drawSlots(); if (G.tut === 2) G.tut = 3; }
  }
  const fitsDish = keys => G.menu.some(d => keys.every(k => DISH[d].need.includes(k) || (DISH[d].opt || []).includes(k)));
  function addToPlate(k, info, fromEl) {
    const ps = G.plates, has = (p, x) => !!ps[p].items[x], empty = p => !Object.keys(ps[p].items).length;
    let target = -1;
    if (G.sel && G.sel.plate !== undefined && !has(G.sel.plate, k)) target = G.sel.plate;
    if (target < 0) target = ps.findIndex((p, i) => !empty(i) && !has(i, k) && fitsDish(Object.keys(p.items).concat(k)));
    if (target < 0) target = ps.findIndex((p, i) => empty(i));
    if (target < 0) { tip('No hay plato libre: sirve o bota uno'); shake(fromEl); return false; }
    ps[target].items[k] = info; G.lastPlate = target; SFX.pop();
    fly(fromEl, stage.querySelector('[data-plate="' + target + '"]'), k in A.COOK ? A.ITEM[k](info.c) : A.ITEM[k]());
    drawPlates(); return true;
  }
  function tapPlate(i) {
    if (!G || G.over || G.paused) return;
    const empty = !Object.keys(G.plates[i].items).length;
    if (empty) { tip('Primero pon comida en el plato'); return; }
    G.sel = G.sel && G.sel.plate === i ? null : { plate: i }; G.lastPlate = i; SFX.pop(); drawSel();
    if (G.tut === 3 && G.sel) G.tut = 4;
  }
  function tapSauce(k, el) {
    if (!G || G.over || G.paused) return;
    const i = G.sel && G.sel.plate !== undefined ? G.sel.plate : G.lastPlate, p = G.plates[i];
    if (!p || !Object.keys(p.items).length) { tip('Toca un plato con comida y luego la crema'); shake(el); return; }
    const at = p.sauces.indexOf(k); if (at >= 0) p.sauces.splice(at, 1); else p.sauces.push(k);
    SFX.squirt(); el.classList.remove('squeeze'); void el.offsetWidth; el.classList.add('squeeze'); drawPlates();
  }
  function tapTrash() {
    if (!G || G.over || G.paused) return;
    if (G.sel && G.sel.plate !== undefined) { G.plates[G.sel.plate] = { items: {}, sauces: [] }; G.sel = null; tone(140, 0.2, 'sawtooth', 0.05); drawPlates(); drawSel(); return; }
    // si no hay plato elegido, bota lo quemado de las estaciones
    let n = 0; ['fry', 'grill'].forEach(st => G[st].forEach((x, i) => { if (x && stateOf(x.k, x.t).q === 'burnt') { G[st][i] = null; n++; } }));
    if (n) { tone(140, 0.2, 'sawtooth', 0.05); drawSlots(); } else tip('Toca un plato y luego la basura para botarlo');
  }

  // ---------------------------------------------------------------- clientes
  function makeOrder() {
    const L = G.L, items = [], count = Math.random() < (L.two || 0) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const d = pick(G.menu), D = DISH[d], sauces = [], extras = [];
      if (L.sauces && D.sauces) { const ks = Object.keys(A.SAUCE).sort(() => Math.random() - 0.5), m = Math.floor(rnd(0, 3)); for (let j = 0; j < m; j++) sauces.push(ks[j]); }
      (D.opt || []).forEach(o => { if (Math.random() < 0.5) extras.push(o); });
      items.push({ dish: d, sauces, extras, done: false });
    }
    if (L.drinks && (Math.random() < 0.55 || !items.length)) items.push({ drink: pick(['inca', 'coca']), done: false });
    return items;
  }
  function spawn(slot) {
    const seed = Math.floor(Math.random() * 99999), pat = G.L.pat * (G.tut >= 0 && G.spawned === 0 ? 3 : 1);
    const c = { slot, seed, order: makeOrder(), pat, left: pat, mood: 'calm', st: 'in', t: 0, pay: 0, el: null };
    G.cust[slot] = c; G.spawned++;
    const el = document.createElement('div'); el.className = 'cust in'; el.style.left = (14 + slot * 124) + 'px'; el.dataset.c = slot;
    el.innerHTML = '<div class="bubble"></div><div class="body">' + A.person(seed, 'calm') + '</div><i class="pat"><u></u></i><em class="say"></em>';
    el.addEventListener('pointerdown', e => { e.preventDefault(); serve(slot); });
    $('#custs').append(el); c.el = el; drawOrder(c);
    setTimeout(() => el.classList.remove('in'), 30);
    tone(660, 0.08, 'triangle', 0.04); setTimeout(SFX.bell, 700);
    $('#left').textContent = G.L.n - G.spawned;
  }
  function drawOrder(c) {
    c.el.querySelector('.bubble').innerHTML = c.order.map(o => '<span class="oi' + (o.done ? ' done' : '') + '">' + (o.drink ? A.svg(A.bottle(o.drink), '0 0 68 60', 'drink-i') : A.plate(Object.fromEntries(DISH[o.dish].need.concat(o.extras).map(k => [k, { q: 'ok' }])), o.sauces)) + (o.sauces && o.sauces.length ? '<i class="sd">' + o.sauces.map(s => '<b style="background:' + A.SAUCE[s].c + '"></b>').join('') + '</i>' : '') + '</span>').join('');
  }
  function face(c, mood) { if (c.mood === mood) return; c.mood = mood; c.el.querySelector('.body').innerHTML = A.person(c.seed, mood); }
  function say(c, text, ok) { const s = c.el.querySelector('.say'); s.textContent = text; s.className = 'say on' + (ok ? ' ok' : ''); clearTimeout(s._t); s._t = setTimeout(() => { s.className = 'say'; }, 1500); }
  function sameSet(a, b) { return a.length === b.length && a.every(x => b.includes(x)); }
  function serve(slot) {
    const c = G && G.cust[slot]; if (!c || c.st !== 'wait' || G.paused) return;
    audio();
    if (!G.sel) { tip('Toca un plato listo o una gaseosa, y luego al cliente'); return; }
    if (G.sel.drink) {
      const o = c.order.find(x => !x.done && x.drink === G.sel.drink);
      if (!o) { say(c, c.order.some(x => !x.done && x.drink) ? '¡La otra gaseosa!' : 'No pedí gaseosa'); SFX.bad(); return; }
      o.done = true; c.pay += DRINK_PRICE; G.sel = null; drawSel(); drawOrder(c); SFX.ding(); say(c, '¡Gracias!', true); checkDone(c); return;
    }
    const p = G.plates[G.sel.plate], keys = Object.keys(p.items);
    const dish = G.menu.find(d => DISH[d].need.every(k => keys.includes(k)) && keys.every(k => DISH[d].need.includes(k) || (DISH[d].opt || []).includes(k)));
    if (!dish) { say(c, 'Eso no está completo…'); SFX.bad(); face(c, 'wait'); setTimeout(() => face(c, c.left / c.pat < 0.35 ? 'wait' : 'calm'), 900); return; }
    const o = c.order.find(x => !x.done && x.dish === dish);
    if (!o) { say(c, '¡Yo no pedí eso!'); SFX.bad(); face(c, 'wait'); setTimeout(() => face(c, c.left / c.pat < 0.35 ? 'wait' : 'calm'), 900); return; }
    const raw = keys.some(k => p.items[k].q === 'raw'), burnt = keys.some(k => p.items[k].q === 'burnt');
    G.plates[G.sel.plate] = { items: {}, sauces: [] }; G.sel = null; drawSel(); drawPlates();
    if (raw || burnt) {                                                  // se queja, no paga, y sigue esperando su pedido
      say(c, raw ? '¡Está crudo! 🤢' : '¡Está quemado! 😖'); SFX.bad(); buzz(60); face(c, 'angry'); c.left = Math.max(1, c.left - c.pat * 0.18);
      setTimeout(() => { if (G && G.cust[slot] === c) face(c, c.left / c.pat < 0.35 ? 'wait' : 'calm'); }, 1400);
      return;
    }
    const exact = sameSet(o.sauces, p.sauces) && sameSet(o.extras, keys.filter(k => (DISH[dish].opt || []).includes(k)));
    o.done = true; c.pay += DISH[dish].price * (exact ? 1 : 0.7); drawOrder(c);
    SFX.ding(); say(c, exact ? '¡Delicioso! 😋' : 'Mmm… no es como lo pedí', exact);
    if (G.tut === 4) G.tut = 5;
    checkDone(c);
  }
  function checkDone(c) {
    if (c.order.some(o => !o.done)) return;
    const tipS = c.left / c.pat > 0.6 ? 2 : c.left / c.pat > 0.3 ? 1 : 0, total = Math.round(c.pay + tipS);
    c.st = 'out'; face(c, 'happy'); G.coins += total; G.served++; SFX.cash(); buzz(20);
    coinFly(c, total, tipS); $('#coins').textContent = G.coins;
    setTimeout(() => leave(c), 900);
  }
  function leave(c) { c.st = 'gone'; c.el.classList.add('out'); setTimeout(() => { c.el.remove(); if (G && G.cust[c.slot] === c) G.cust[c.slot] = null; }, 650); }

  // ---------------------------------------------------------------- dibujo de estaciones y platos
  function drawSlots() {
    ['fry', 'grill'].forEach(st => G[st].forEach((it, i) => {
      const el = stage.querySelector('[data-slot="' + st + ':' + i + '"]'); if (!el) return;
      if (!it) { el.innerHTML = st === 'fry' ? '<i class="basket"></i>' : ''; el.classList.remove('busy'); return; }
      el.classList.add('busy'); el.dataset.k = it.k;
      el.innerHTML = (st === 'fry' ? '<i class="basket"></i>' : '') + '<div class="food">' + A.svg(A.ITEM[it.k]('var(--f)', 1)) + '</div><svg class="ring" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="rb"/><circle cx="22" cy="22" r="18" class="rf" pathLength="100"/></svg><b class="st"></b><i class="smoke"></i>';
    }));
  }
  function tickSlots(dt) {
    let active = 0;
    ['fry', 'grill'].forEach(st => G[st].forEach((it, i) => {
      if (!it) return; it.t += dt; active++;
      const el = stage.querySelector('[data-slot="' + st + ':' + i + '"]'); if (!el) return;
      const s = stateOf(it.k, it.t), food = el.querySelector('.food'), ring = el.querySelector('.rf'), lab = el.querySelector('.st');
      food.style.setProperty('--f', s.c);
      if (it.k === 'salchicha') food.querySelectorAll('path').forEach(p => { p.style.opacity = s.p >= 1 ? 0.55 : 0; });
      const q = s.p < 1 ? 'cook' : s.p < 1.45 ? 'ready' : s.p < 1.9 ? 'warn' : 'burnt';
      if (el.dataset.q !== q) { el.dataset.q = q; lab.textContent = q === 'ready' ? '¡Listo!' : q === 'warn' ? '¡Sácalo!' : q === 'burnt' ? 'Quemado' : ''; if (q === 'ready') { SFX.ding(); if (G.tut === 1) G.tut = 2; } if (q === 'warn') tone(440, 0.1, 'square', 0.03); }
      ring.style.strokeDashoffset = q === 'cook' ? 100 - s.p * 100 : q === 'ready' ? 0 : q === 'warn' ? (s.p - 1.45) / 0.45 * 100 : 0;
    }));
    const oil = stage.querySelector('.fryer'); if (oil) oil.classList.toggle('on', G.fry.some(Boolean));
    sizzleOn(active);
  }
  function drawPlates() {
    G.plates.forEach((p, i) => { const el = stage.querySelector('[data-plate="' + i + '"]'); if (!el) return; const empty = !Object.keys(p.items).length; el.innerHTML = A.plate(p.items, p.sauces, empty) + (empty ? '' : '<small>' + plateName(p) + '</small>'); });
    drawSel();
  }
  function plateName(p) {
    const keys = Object.keys(p.items), d = G.menu.find(x => DISH[x].need.every(k => keys.includes(k)) && keys.every(k => DISH[x].need.includes(k) || (DISH[x].opt || []).includes(k)));
    const bad = keys.some(k => p.items[k].q === 'raw') ? ' · crudo' : keys.some(k => p.items[k].q === 'burnt') ? ' · quemado' : '';
    return (d ? DISH[d].name : 'Armando…') + bad;
  }
  function drawSel() {
    stage.querySelectorAll('[data-plate]').forEach(b => b.classList.toggle('sel', !!G.sel && G.sel.plate === +b.dataset.plate));
    stage.querySelectorAll('[data-drink]').forEach(b => b.classList.toggle('sel', !!G.sel && G.sel.drink === b.dataset.drink));
    stage.classList.toggle('serving', !!G.sel);
  }

  // ---------------------------------------------------------------- efectos
  function center(el) { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / 390; return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k }; }
  function fly(from, to, inner) {
    if (!from || !to) return; const a = center(from), b = center(to), el = document.createElement('div');
    el.className = 'flyer'; el.innerHTML = A.svg(inner); el.style.left = a.x + 'px'; el.style.top = a.y + 'px'; $('#fx').append(el);
    requestAnimationFrame(() => { el.style.transform = 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(.8)'; el.style.opacity = '0.2'; });
    setTimeout(() => el.remove(), 380);
  }
  function coinFly(c, total, tipS) {
    const a = center(c.el), b = center($('#coins')), el = document.createElement('div');
    el.className = 'coinfly'; el.textContent = '+S/ ' + total + (tipS ? ' 💰' : ''); el.style.left = a.x + 'px'; el.style.top = (a.y - 40) + 'px'; $('#fx').append(el);
    setTimeout(() => { el.style.transform = 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y + 40) + 'px) scale(.6)'; el.style.opacity = '0'; }, 500);
    setTimeout(() => el.remove(), 1400);
  }
  function tip(t) { const el = $('#tip'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 1700); }

  // ---------------------------------------------------------------- tutorial del nivel 1 (una mano que señala)
  const TUT = [
    ['[data-bin="papas"]', 'Toca las papas para freírlas'],
    ['[data-slot="fry:0"]', 'Espera a que se pongan doradas ✓'],
    ['.slot.busy[data-q="ready"], .slot.busy', '¡Listas! Tócalas para pasarlas al plato'],
    ['[data-plate]:not(:has(svg ellipse + ellipse + ellipse ~ g))', 'Toca el plato…'],
    ['.cust:not(.out)', '…y luego toca al cliente para servir'],
  ];
  function tutorial() {
    const h = $('#hand'); if (!h) return;
    if (G.tut < 0 || G.tut >= TUT.length) { h.hidden = true; return; }
    let target = null;
    if (G.tut === 3) target = stage.querySelector('.plate:not(:empty) svg') && [...stage.querySelectorAll('[data-plate]')].find((b, i) => Object.keys(G.plates[i].items).length);
    else target = stage.querySelector(TUT[G.tut][0]);
    if (!target) { h.hidden = true; return; }
    const c = center(target); h.hidden = false; h.style.left = c.x + 'px'; h.style.top = c.y + 'px';
    const t = $('#tip'); if (t && t.dataset.step !== String(G.tut)) { t.dataset.step = G.tut; t.textContent = TUT[G.tut][1]; t.hidden = false; clearTimeout(t._t); }
  }

  // ---------------------------------------------------------------- bucle
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    update(dt);
  }
  function update(dt) {
    if (!G || G.paused || G.over) return;
    G.t += dt;
    tickSlots(dt);
    // llegada de clientes
    G.next -= dt;
    const free = G.cust.findIndex(c => !c);
    if (G.spawned < G.L.n && G.next <= 0 && free >= 0 && (G.tut < 0 || G.tut >= 5 || G.spawned === 0)) { const order = [1, 0, 2].filter(i => !G.cust[i]); spawn(order[0]); G.next = rnd(G.L.gap[0], G.L.gap[1]); }
    G.cust.forEach(c => {
      if (!c) return;
      c.t += dt;
      if (c.st === 'in' && c.t > 1.1) c.st = 'wait';
      if (c.st !== 'wait') return;
      const tutorialHold = G.tut >= 0 && G.tut < 5;
      if (!tutorialHold) c.left -= dt;
      const k = c.left / c.pat, bar = c.el.querySelector('.pat u');
      bar.style.width = Math.max(0, k * 100) + '%'; bar.style.background = k > 0.5 ? '#22c55e' : k > 0.25 ? '#ffc629' : '#e5383b';
      if (c.mood !== 'angry') face(c, k < 0.3 ? 'wait' : 'calm');
      if (c.left <= 0) { c.st = 'out'; face(c, 'angry'); say(c, '¡Me voy! 😤'); SFX.bad(); G.lost++; setTimeout(() => leave(c), 900); }
    });
    tutorial();
    if (G.spawned >= G.L.n && G.cust.every(c => !c)) finish();
  }
  function finish() {
    G.over = true; if (sizzle) sizzle.gain.value = 0;
    const st = G.coins >= G.max * 0.95 ? 3 : G.coins >= G.max * 0.78 ? 2 : G.coins >= G.goal ? 1 : 0, win = st > 0;
    if (win) { P.stars[G.n] = Math.max(P.stars[G.n] || 0, st); P.best[G.n] = Math.max(P.best[G.n] || 0, G.coins); P.open = Math.max(P.open, Math.min(LEVELS.length, G.n + 1)); keep(P); }
    if (win) { tone(660, 0.15); tone(880, 0.2, 'triangle', 0.06, 0.15); tone(1320, 0.3, 'triangle', 0.06, 0.32); } else SFX.bad();
    modal('<div class="res"><img src="../media/giorgio/' + (win ? 'feliz' : 'triste') + '.webp" alt=""><h2>' + (win ? '¡Buen turno!' : 'Te faltó vender') + '</h2><div class="stars">' + [1, 2, 3].map(i => '<i class="' + (i <= st ? 'on' : '') + '">★</i>').join('') + '</div>' +
      '<p>Ganaste <b>S/ ' + G.coins + '</b> · meta S/ ' + G.goal + '</p><p class="mut">Atendidos ' + G.served + ' · se fueron ' + G.lost + '</p>' +
      (win && G.n < LEVELS.length ? '<button class="btn gold" id="nx">Siguiente nivel</button>' : '') + '<button class="btn ' + (win ? '' : 'gold') + '" id="rt">Repetir</button><button class="btn" id="mn">Niveles</button></div>', m => {
      const nx = m.querySelector('#nx'); if (nx) nx.onclick = () => start(G.n + 1);
      m.querySelector('#rt').onclick = () => start(G.n); m.querySelector('#mn').onclick = () => menu();
    });
  }
  function modal(html, bind) { const m = $('#modal'); m.innerHTML = '<div class="card">' + html + '</div>'; m.hidden = false; if (bind) bind(m); }
  function closeModal() { const m = $('#modal'); if (m) m.hidden = true; }
  function pauseMenu() {
    if (!G || G.over) return; G.paused = true; if (sizzle) sizzle.gain.value = 0;
    modal('<h2>Pausa</h2><button class="btn gold" id="ct">Seguir</button><button class="btn" id="rt">Reiniciar nivel</button><button class="btn" id="mn">Niveles</button>', m => {
      m.querySelector('#ct').onclick = () => { closeModal(); G.paused = false; go(); };
      m.querySelector('#rt').onclick = () => start(G.n); m.querySelector('#mn').onclick = () => menu();
    });
  }
  // recetas con imágenes: lo que lleva cada plato
  function recipe(d) { const D = DISH[d]; return '<div class="rc"><div class="rc-img">' + A.plate(Object.fromEntries(D.need.map(k => [k, { q: 'ok' }])), D.sauces ? ['mayo', 'ketchup'] : []) + '</div><div><b>' + D.name + ' · S/ ' + D.price + '</b><p>' + D.need.map(k => LABEL[k]).join(' + ') + (D.opt ? ' (+ ' + D.opt.map(k => LABEL[k].toLowerCase()).join(' y/o ') + ' si lo pide)' : '') + (D.sauces ? '. Cremas como lo pida.' : '') + '</p></div></div>'; }
  function recipes(upto, after) {
    const ds = Object.keys(DISH).filter(d => LEVELS.slice(0, upto).some(L => menuOf(L).includes(d)));
    modal('<h2>📖 Recetas</h2>' + ds.map(recipe).join('') + '<p class="mut">Papas y pollo van a la freidora; salchicha y carne a la plancha. Sácalos cuando el aro esté verde.</p><button class="btn gold" id="ok">Listo</button>', m => { m.querySelector('#ok').onclick = () => { closeModal(); if (after) after(); }; });
  }
  function showNew(n, list, after) {
    const parts = list.map(k => k === 'drinks' ? '<div class="rc"><div class="rc-img drinks">' + A.svg(A.bottle('inca')) + A.svg(A.bottle('coca')) + '</div><div><b>Gaseosas · S/ 2</b><p>Toca la botella y luego al cliente.</p></div></div>'
      : k === 'sauces' ? '<div class="rc"><div class="rc-img drinks">' + Object.keys(A.SAUCE).map(s => A.svg(A.squeeze(s))).join('') + '</div><div><b>Cremas</b><p>Toca el plato y luego la crema. Mira la nube del cliente: los puntos de color son las cremas que quiere.</p></div></div>'
      : k === 'two' ? '<div class="rc"><div><b>✌️ Pedidos dobles</b><p>Ahora algunos clientes piden dos platos. Te pagan cuando les entregas todo.</p></div></div>' : recipe(k)).join('');
    modal('<h2>' + (n === 1 ? '¡Abre tu carretilla!' : '¡Nuevo en la carta!') + '</h2>' + (n === 1 ? '<p class="mut">Fríe, sirve y cobra. Crudo o quemado: el cliente se queja y no paga.</p>' : '') + parts + '<button class="btn gold" id="ok">¡A cocinar!</button>', m => { m.querySelector('#ok').onclick = () => { closeModal(); audio(); after(); }; });
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.over && !G.paused) pauseMenu(); });
  menu();
  window.CartDebug = { get G() { return G; }, start, update, tickSlots, serve, tapBin, tapSlot, tapPlate, tapSauce, DISH, LEVELS };
})();
