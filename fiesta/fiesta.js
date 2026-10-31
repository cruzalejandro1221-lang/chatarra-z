'use strict';
// Juegos de fiesta (pestaña Trend): un solo celular para jugar con amigos en la vida real.
// El Impostor, Charada (se inclina el celular) y "Es un 10 pero…". Todo es local: no se envía nada a ningún servidor.
(() => {
  const D = window.FIESTA_DATA, esc = CG.esc;
  const rnd = n => { if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } return Math.floor(Math.random() * n); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[rnd(a.length)];
  const fx = n => { try { CG.fx(n); } catch (e) { /* sin audio */ } };
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const SAVE = 'gg_party';
  const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { return {}; } };

  let el = null, bodyEl = null, titleEl = null, modalEl = null, isOpen = false, wake = null;
  let timers = [], cleanups = [], S = null, guard = false, gameId = null;
  const $ = s => bodyEl.querySelector(s);
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  function clear() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; cleanups.forEach(f => { try { f(); } catch (e) { /* nada */ } }); cleanups = []; bodyEl.onclick = bodyEl.oninput = null; }

  // ---------------------------------------------------------------- base: pantalla, diálogo, historial
  function ensure() {
    if (el) return;
    el = document.createElement('div'); el.id = 'pt'; el.hidden = true;
    el.innerHTML = '<header class="pt-top"><button class="pt-back" id="ptBack" aria-label="Volver">‹</button><h2 id="ptTitle"></h2></header><div class="pt-body" id="ptBody"></div><div class="pt-modal" id="ptModal" hidden></div>';
    document.body.append(el);
    bodyEl = el.querySelector('#ptBody'); titleEl = el.querySelector('#ptTitle'); modalEl = el.querySelector('#ptModal');
    el.querySelector('#ptBack').onclick = back;
    addEventListener('popstate', () => {
      if (!isOpen) return;
      if (guard) { try { history.pushState({ pt: 1 }, '', location.href); } catch (e) { /* nada */ } confirmExit(); } else close(true);
    });
    document.addEventListener('visibilitychange', () => { if (isOpen && !document.hidden) lock(); });
  }
  function screen(title, html, bind, opts) {
    opts = opts || {};
    const keep = opts.keep ? bodyEl.scrollTop : 0;
    clear();
    titleEl.textContent = title; bodyEl.innerHTML = html; bodyEl.scrollTop = keep;
    el.classList.toggle('pt-full', !!opts.full);
    guard = !!opts.guard;
    if (bind) bind();
  }
  function ask(title, text, ok, fn) {
    modalEl.hidden = false;
    modalEl.innerHTML = '<div class="pt-dialog" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><button class="pt-btn ghost" data-m="no">Seguir jugando</button><button class="pt-btn danger" data-m="ok">' + esc(ok) + '</button></div>';
    modalEl.onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; modalEl.hidden = true; if (b.dataset.m === 'ok') fn(); };
  }
  const confirmExit = () => ask('¿Salir de la partida?', 'Se perderá lo que llevan de esta ronda.', 'Salir', () => close());
  function back() { if (guard) confirmExit(); else close(); }
  async function lock() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; } }
  function unlock() { try { if (wake) wake.release(); } catch (e) { /* nada */ } wake = null; }

  function open(id) {
    ensure();
    const sv = loadSave();
    S = {
      imp: Object.assign({ players: 5, imps: 1, cat: 'mezcla', hint: true, time: 5, names: [] }, sv.imp),
      hu: Object.assign({ cat: 'mezcla', time: 60, tilt: true }, sv.hu),
      dz: Object.assign({ count: 4, rounds: 1, names: [] }, sv.dz),
    };
    gameId = id; isOpen = true; el.hidden = false; modalEl.hidden = true;
    document.documentElement.classList.add('cg-open');
    try { history.pushState({ pt: 1 }, '', location.href); } catch (e) { /* nada */ }
    lock();
    ({ impostor: impSetup, frente: huSetup, diez: dzSetup })[id]();
  }
  function close(fromHistory) {
    if (!isOpen) return;
    persist(); clear(); unlock(); isOpen = false; el.hidden = true; modalEl.hidden = true;
    document.documentElement.classList.remove('cg-open');
    if (fromHistory !== true && history.state && history.state.pt) history.back();
  }
  function persist() { try { localStorage.setItem(SAVE, JSON.stringify({ imp: S.imp, hu: S.hu, dz: S.dz })); } catch (e) { /* nada */ } }

  // ---------------------------------------------------------------- piezas de formulario
  const chips = (cats, cur) => '<div class="pt-chips">' + cats.map(c => '<button type="button" class="pt-chip ' + (c.id === cur ? 'on' : '') + '" data-cat="' + c.id + '"><span>' + c.emoji + '</span>' + esc(c.name) + '</button>').join('') + '</div>';
  const seg = (key, opts, cur, f) => '<div class="pt-seg" data-seg="' + key + '">' + opts.map(v => '<button type="button" data-v="' + v + '" class="' + (v === cur ? 'on' : '') + '">' + (f ? f(v) : v) + '</button>').join('') + '</div>';
  const stepper = (key, v) => '<div class="pt-step"><button type="button" data-st="' + key + '" data-d="-1" aria-label="Menos">−</button><output>' + v + '</output><button type="button" data-st="' + key + '" data-d="1" aria-label="Más">+</button></div>';
  const sw = (key, on) => '<button type="button" class="pt-switch ' + (on ? 'on' : '') + '" data-sw="' + key + '" role="switch" aria-checked="' + !!on + '" aria-label="Activar o desactivar"></button>';
  const nameOf = (names, i) => (names[i] && names[i].trim()) || 'Jugador ' + (i + 1);
  const nameInputs = (names, n) => Array.from({ length: n }, (_, i) => '<input data-name="' + i + '" maxlength="14" placeholder="Jugador ' + (i + 1) + '" value="' + esc(names[i] || '') + '" aria-label="Nombre del jugador ' + (i + 1) + '" autocomplete="off">').join('');
  function wire(obj, limits, rerender) {
    bodyEl.onclick = e => {
      const t = e.target.closest('[data-cat],[data-seg] button,[data-st],[data-sw]'); if (!t) return;
      fx('click');
      if (t.dataset.cat) obj.cat = t.dataset.cat;
      else if (t.dataset.st) { const k = t.dataset.st, lim = limits[k]; obj[k] = Math.max(lim[0], Math.min(lim[1], obj[k] + +t.dataset.d)); }
      else if (t.dataset.sw) obj[t.dataset.sw] = !obj[t.dataset.sw];
      else obj[t.parentElement.dataset.seg] = +t.dataset.v;
      rerender();
    };
    bodyEl.oninput = e => { const i = e.target.dataset.name; if (i != null) obj.names[+i] = e.target.value.slice(0, 14); };
  }
  const catOf = (list, id) => list.find(c => c.id === id) || list[list.length - 1];
  // Mazo sin repetir: se baraja la lista y se reparte hasta agotarla.
  const deck = (list, last) => { let q = []; return () => { if (!q.length) { q = shuffle(list); if (last && q[q.length - 1] === last()) q.reverse(); } return q.pop(); }; };

  // ================================================================ EL IMPOSTOR
  function impSetup() {
    const s = S.imp, maxImp = s.players >= 8 ? 3 : s.players >= 5 ? 2 : 1;
    if (s.imps > maxImp) s.imps = maxImp;
    screen('El Impostor', '<div class="pt-hero imp"><span class="pt-art">🕵️</span><p>Todos reciben la misma palabra secreta… menos el impostor. Den pistas sin decirla y descubran quién miente.</p></div>' +
      '<section class="pt-card"><div class="pt-row"><div><b>Jugadores</b><small>Se pasan un solo celular</small></div>' + stepper('players', s.players) + '</div>' +
      '<div class="pt-row"><div><b>Impostores</b><small>Máximo ' + maxImp + ' con ' + s.players + ' jugadores</small></div>' + seg('imps', [1, 2, 3].filter(n => n <= maxImp), s.imps) + '</div>' +
      '<div class="pt-row"><div><b>Tiempo de debate</b></div>' + seg('time', [2, 3, 5, 8], s.time, v => v + ' min') + '</div>' +
      '<div class="pt-row"><div><b>El impostor ve la categoría</b><small>Se lo pone más fácil</small></div>' + sw('hint', s.hint) + '</div></section>' +
      '<h4 class="pt-sub">Categoría</h4>' + chips(D.impostor.cats, s.cat) +
      '<details class="pt-names"><summary>Nombres de los jugadores (opcional)</summary><div class="pt-name-grid">' + nameInputs(s.names, s.players) + '</div></details>' +
      '<button class="pt-btn primary pt-go" id="go">Empezar</button>',
      () => { wire(s, { players: [3, 12] }, impSetup); $('#go').onclick = () => { fx('deal'); persist(); impStart(); }; }, { keep: true });
  }
  let lastWords = [];
  function impStart() {
    const s = S.imp, real = s.cat === 'mezcla' ? pick(D.impostor.cats.filter(c => c.id !== 'mezcla')) : catOf(D.impostor.cats, s.cat);
    let word = pick(real.words);
    for (let k = 0; k < 12 && lastWords.includes(word); k++) word = pick(real.words);
    lastWords = lastWords.concat(word).slice(-20);
    const roles = Array(s.players).fill(false);
    shuffle([...Array(s.players).keys()]).slice(0, s.imps).forEach(i => { roles[i] = true; });
    S.round = { real, word, roles, i: 0, first: rnd(s.players) };
    impPass();
  }
  function impPass() {
    const s = S.imp, r = S.round, i = r.i, bad = r.roles[i], last = i === s.players - 1;
    const idle = '<span class="big">👀</span>Mantén presionado<br>para ver tu rol<small>Suéltalo y pasa el celular</small>';
    const shown = bad ? '<span class="bad-t">¡ERES EL IMPOSTOR!</span><small>' + (s.hint ? 'Categoría: ' + esc(r.real.name) + '. ' : '') + 'Disimula y adivina la palabra</small>'
      : '<small>Tu palabra es</small><span class="w">' + esc(r.word) + '</span><small>Categoría: ' + esc(r.real.name) + '</small>';
    screen('El Impostor', '<div class="pt-center"><span class="pt-count">Jugador ' + (i + 1) + ' de ' + s.players + '</span><h3>Pásale el celular a</h3><div class="pt-name-big">' + esc(nameOf(s.names, i)) + '</div>' +
      '<button class="pt-hold" id="hold" aria-label="Mantén presionado para ver tu rol">' + idle + '</button>' +
      '<button class="pt-btn blue" id="next" disabled>' + (last ? '¡Empezar el debate!' : 'Siguiente jugador') + '</button><p class="pt-note">Solo mira tu pantalla. Que nadie más vea tu rol.</p></div>', () => {
        const hold = $('#hold'), next = $('#next');
        const view = on => { hold.classList.toggle('on', on); hold.classList.toggle('bad', on && bad); hold.innerHTML = on ? shown : idle; if (on) next.disabled = false; };
        hold.addEventListener('pointerdown', e => { e.preventDefault(); try { hold.setPointerCapture(e.pointerId); } catch (x) { /* nada */ } view(true); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => hold.addEventListener(ev, () => view(false)));
        hold.addEventListener('contextmenu', e => e.preventDefault());
        hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); view(true); } });
        hold.addEventListener('keyup', () => view(false));
        const hide = () => view(false); document.addEventListener('visibilitychange', hide); cleanups.push(() => document.removeEventListener('visibilitychange', hide));
        next.onclick = () => { fx('click'); r.i++; if (last) impTalk(); else impPass(); };
      }, { guard: true });
  }
  function impTalk() {
    const s = S.imp, r = S.round, total = s.time * 60;
    r.endAt = Date.now() + total * 1000; r.paused = false; r.left = total;
    screen('El Impostor', '<div class="pt-center"><div class="pt-ring" id="ring"><div><small>Debate</small><b id="clock">' + fmt(total) + '</b></div></div>' +
      '<p class="pt-lead">Empieza hablando <b>' + esc(nameOf(s.names, r.first)) + '</b>.<br>Por turnos, cada uno dice <b>una palabra o frase corta</b> sobre la palabra secreta. ¡El impostor debe disimular!</p>' +
      '<div class="pt-two"><button class="pt-btn ghost" id="pause">⏸ Pausar</button><button class="pt-btn blue" id="vote">Ir a votar</button></div></div>', () => {
        const clock = $('#clock'), ring = $('#ring'), pause = $('#pause');
        const draw = () => { clock.textContent = fmt(r.left); ring.style.setProperty('--p', Math.round(r.left / total * 100)); ring.classList.toggle('low', r.left <= 15); };
        every(() => {
          if (r.paused) return;
          r.left = Math.max(0, Math.ceil((r.endAt - Date.now()) / 1000)); draw();
          if (r.left <= 0) { fx('notify'); buzz([250, 120, 250]); impVote(); }
        }, 250);
        pause.onclick = () => { r.paused = !r.paused; if (!r.paused) r.endAt = Date.now() + r.left * 1000; pause.textContent = r.paused ? '▶ Seguir' : '⏸ Pausar'; };
        $('#vote').onclick = () => { fx('click'); impVote(); };
      }, { guard: true });
  }
  function impVote() {
    screen('El Impostor', '<div class="pt-center"><div class="pt-ring"><div><small>Hora de</small><b>votar</b></div></div><p class="pt-lead">A la cuenta de tres, <b>todos señalan a la vez</b> a quien crean que es el impostor.<br>¡Sin cambiar de opinión!</p><button class="pt-btn primary" id="rev">Revelar al impostor</button></div>',
      () => { $('#rev').onclick = () => { fx('deal'); impReveal(); }; }, { guard: true });
  }
  function impReveal() {
    const s = S.imp, r = S.round;
    const who = r.roles.map((b, i) => b ? '<div class="who"><small>El impostor era</small>' + esc(nameOf(s.names, i)) + '</div>' : '').join('');
    screen('El Impostor', '<div class="pt-center"><h3>' + (s.imps > 1 ? 'Los impostores eran…' : '¡Descubierto!') + '</h3><div class="pt-reveal">' + who + '<div class="word"><small>La palabra secreta era</small>' + esc(r.word) + '</div></div>' +
      '<p class="pt-note">Si lo atraparon, el impostor tiene una última oportunidad: <b>adivinar la palabra</b> para ganar igual.</p>' +
      '<button class="pt-btn primary" id="again">Otra ronda</button><div class="pt-two"><button class="pt-btn ghost" id="cfg">Ajustes</button><button class="pt-btn ghost" id="out">Salir</button></div></div>', () => {
        fx('win'); buzz([40, 60, 40]);
        $('#again').onclick = impStart; $('#cfg').onclick = impSetup; $('#out').onclick = () => close();
      });
  }

  // ================================================================ CHARADA
  function huSetup() {
    const h = S.hu, canTilt = 'DeviceOrientationEvent' in window;
    if (!canTilt) h.tilt = false;
    screen('Charada', '<div class="pt-hero hu"><span class="pt-art">🤯</span><p>Un jugador se pone el celular <b>en la frente</b>, con la pantalla hacia los demás. Los demás dan pistas o hacen mímica (¡sin decir la palabra!) hasta que la adivine.</p></div>' +
      '<section class="pt-card"><div class="pt-row"><div><b>Tiempo por turno</b></div>' + seg('time', [30, 60, 90, 120], h.time, v => v + ' s') + '</div>' +
      '<div class="pt-row"><div><b>Inclinar el celular</b><small>' + (canTilt ? 'Abajo = ✓ acierto · Arriba = paso' : 'Tu navegador no lo permite: se juega tocando') + '</small></div>' + (canTilt ? sw('tilt', h.tilt) : '') + '</div></section>' +
      '<h4 class="pt-sub">Categoría</h4>' + chips(D.head.cats, h.cat) +
      '<button class="pt-btn primary pt-go" id="go">¡Jugar!</button><p class="pt-note">Gira el celular en horizontal si quieres. Si la pantalla se ve al revés, toca "Girar" en la cuenta regresiva.</p>',
      () => { wire(h, {}, huSetup); $('#go').onclick = () => { persist(); huBegin(); }; }, { keep: true });
  }
  function huBegin() {                       // el permiso del sensor (iPhone) tiene que pedirse desde el toque del botón
    const h = S.hu, H = S.H = { cat: catOf(D.head.cats, h.cat), flip: false, results: [], samples: [], events: 0, phase: 'count', base: 0, useTilt: false, lastWord: null };
    H.next = deck(H.cat.words, () => H.lastWord);
    const ready = ok => { H.useTilt = !!ok; if (h.tilt && !ok) H.fallback = true; huCount(); };
    if (h.tilt && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(r => ready(r === 'granted')).catch(() => ready(false));
    } else ready(h.tilt);
  }
  function huCount() {
    const H = S.H, h = S.hu; H.phase = 'count'; H.samples = []; H.events = 0; let n = 3;
    const onOri = e => {
      if (e.beta == null || e.gamma == null) return;
      const u = Math.cos(e.beta * Math.PI / 180) * Math.cos(e.gamma * Math.PI / 180);     // componente vertical de la pantalla: +1 mira al techo, −1 mira al suelo
      H.events++;
      if (H.phase === 'count') { H.samples.push(u); if (H.samples.length > 40) H.samples.shift(); return; }
      if (H.phase !== 'play' || H.lock) return;
      const rel = u - H.base;
      if (H.armed) { if (rel < -0.5) huAnswer(true); else if (rel > 0.5) huAnswer(false); }
      else if (Math.abs(rel) < 0.28) H.armed = true;
    };
    const draw = () => screen('Charada', '<div class="hu-stage count' + (H.flip ? ' flip' : '') + '"><div class="hu-ready">Ponte el celular en la frente,<br>pantalla hacia tus amigos</div><div class="hu-count" id="cnt">' + n + '</div><button class="hu-mini" id="flip">↻ Girar pantalla</button></div>', () => {
      $('#flip').onclick = () => { H.flip = !H.flip; $('.hu-stage').classList.toggle('flip', H.flip); };
    }, { full: true, guard: true });
    draw(); fx('click');
    H.onOri = onOri;
    if (H.useTilt) { window.addEventListener('deviceorientation', onOri); cleanups.push(() => window.removeEventListener('deviceorientation', onOri)); }
    // la cuenta regresiva no vuelve a pintar toda la pantalla: solo cambia el número
    const iv = every(() => {
      n--;
      if (n <= 0) { clearInterval(iv); const s = H.samples.slice(-12); H.base = s.length ? Math.max(-0.35, Math.min(0.35, s.reduce((a, b) => a + b, 0) / s.length)) : 0; huPlay(); return; }
      const c = $('#cnt'); if (c) c.textContent = n; fx('click');
    }, 1000);
    void h;
  }
  function huPlay() {
    const H = S.H, h = S.hu; H.phase = 'play'; H.lock = false; H.armed = true; H.score = 0; H.left = h.time; H.results = [];
    if (H.useTilt && !H.events) { H.useTilt = false; H.fallback = true; }
    H.endAt = Date.now() + h.time * 1000;
    screen('Charada', '<div class="hu-stage' + (H.flip ? ' flip' : '') + '" id="stage"><div class="hu-top"><span id="huTime">' + h.time + '</span><span>✓ <b id="huScore">0</b></span></div><div class="hu-word" id="huWord"></div>' +
      '<button class="hu-zone l" data-a="0" aria-label="Pasar"><span>⏭ PASO</span></button><button class="hu-zone r" data-a="1" aria-label="Acertó"><span>✓ ACIERTO</span></button><div class="hu-flash" id="huFlash"></div></div>', () => {
        if (H.onOri && H.useTilt) { window.addEventListener('deviceorientation', H.onOri); cleanups.push(() => window.removeEventListener('deviceorientation', H.onOri)); }
        $('#stage').onclick = e => { const z = e.target.closest('[data-a]'); if (z) huAnswer(z.dataset.a === '1'); };
        huWord();
        every(() => {
          H.left = Math.max(0, Math.ceil((H.endAt - Date.now()) / 1000));
          const t = $('#huTime'); if (t) t.textContent = H.left;
          if (H.left <= 0) huEnd();
        }, 250);
      }, { full: true, guard: true });
    if (H.fallback) later(() => { const m = $('#stage'); if (m) m.insertAdjacentHTML('beforeend', '<div class="hu-mini" id="tip">No detectamos el sensor: toca los lados de la pantalla</div>'); later(() => { const t = $('#tip'); if (t) t.remove(); }, 3500); }, 400);
  }
  function huWord() { const H = S.H, w = H.next(); H.lastWord = w; H.cur = w; const e = $('#huWord'); if (!e) return; e.textContent = w; e.classList.toggle('long', w.length > 16); }
  function huAnswer(ok) {
    const H = S.H; if (H.phase !== 'play' || H.lock) return;
    H.lock = true; H.armed = false; H.results.push({ w: H.cur, ok });
    if (ok) { H.score++; const s = $('#huScore'); if (s) s.textContent = H.score; }
    const st = $('#stage'), fl = $('#huFlash'); if (!st) return;
    st.classList.add(ok ? 'ok' : 'pass'); fl.textContent = ok ? '¡CORRECTO!' : 'PASO';
    fx(ok ? 'notify' : 'deal'); buzz(ok ? [60, 40, 60] : 40);
    later(() => { st.classList.remove('ok', 'pass'); H.lock = false; if (H.phase === 'play') huWord(); }, 800);
  }
  function huEnd() {
    const H = S.H; H.phase = 'end';
    const yes = H.results.filter(r => r.ok).length;
    fx('win'); buzz([200, 80, 200]);
    screen('Charada', '<div class="pt-center"><h3>¡Se acabó el tiempo!</h3><div class="hu-score">' + yes + '</div><p class="pt-lead">' + (yes === 1 ? 'palabra adivinada' : 'palabras adivinadas') + '</p>' +
      '<div class="hu-words">' + H.results.map(r => '<span class="' + (r.ok ? 'y' : 'n') + '">' + esc(r.w) + '</span>').join('') + '</div>' +
      '<button class="pt-btn primary" id="again">Siguiente jugador</button><div class="pt-two"><button class="pt-btn ghost" id="cfg">Ajustes</button><button class="pt-btn ghost" id="out">Salir</button></div></div>', () => {
        $('#again').onclick = () => { S.H.phase = 'count'; huCount(); }; $('#cfg').onclick = huSetup; $('#out').onclick = () => close();
      });
  }

  // ================================================================ ES UN 10 PERO…
  // Un jugador se pone el celular en la frente (horizontal) con un número del 1 al 10. El público dice el "pero…".
  const dzColor = n => ['#e5383b', '#e5383b', '#ee5a2b', '#f2701f', '#f29a1f', '#e6b81f', '#b9c21f', '#7cc226', '#3fb23a', '#22a35a'][n - 1];
  function dzSetup() {
    screen('Es un 10 pero…', '<div class="pt-hero dz"><span class="pt-art"><b style="font-family:var(--display);font-size:30px">10</b></span><p>Un jugador se pone el celular <b>en la frente</b>, en horizontal, con un número del 1 al 10 que solo ve el público.</p></div>' +
      '<section class="pt-card"><div class="pt-row"><div><b>1. El público mira el número</b><small>Es el nivel de esa persona: del 1 al 10</small></div></div>' +
      '<div class="pt-row"><div><b>2. Dicen el "pero…"</b><small>"Es un 8, pero…" y cada uno inventa el defecto que lo baja o lo hace gracioso</small></div></div>' +
      '<div class="pt-row"><div><b>3. Cambio de persona</b><small>Toca "Siguiente persona" y sale otro número para el próximo jugador</small></div></div></section>' +
      '<button class="pt-btn primary pt-go" id="go">Empezar</button><p class="pt-note">Si la pantalla se ve al revés, toca "Girar pantalla".</p>',
      () => { $('#go').onclick = () => { fx('deal'); S.Z = { n: 0, flip: false, count: 0 }; dzNext(true); }; });
  }
  function dzNext(first) {
    const Z = S.Z; let n; do { n = 1 + rnd(10); } while (n === Z.n); Z.n = n; Z.count++;
    if (!first) { fx('deal'); buzz(30); }
    screen('Es un 10 pero…', '<div class="hu-stage" id="stage" style="background:' + dzColor(n) + '"><div class="hu-top"><span>Es un</span><span>pero…</span></div><div class="dz-num">' + n + '</div>' +
      '<div class="dz-bar"><button class="dz-btn" id="out">Salir</button><button class="dz-btn big" id="next">Siguiente persona →</button><button class="dz-btn" id="flip">↻ Girar</button></div></div>', () => {
        const st = $('#stage'); st.classList.toggle('flip', Z.flip);
        $('#next').onclick = () => dzNext(false);
        $('#flip').onclick = () => { Z.flip = !Z.flip; st.classList.toggle('flip', Z.flip); };
        $('#out').onclick = () => ask('¿Salir?', 'Volverás a las instrucciones.', 'Salir', dzSetup);
      }, { full: true, guard: true });
  }

  window.Fiesta = { open, close, _state: () => S };
})();
