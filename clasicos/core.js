'use strict';
// Clásicos · base común: lobby (bot o amigo), conexión online por enlace, sesión de partida y registro de resultados.
// Cada juego (ajedrez.js, poker.js, batalla.js, ludo.js) se registra con CG.register(id, { start(ctx) }).
// La conexión es directa entre los dos navegadores (WebRTC con PeerJS); solo se usa el servidor gratuito de PeerJS
// para que se encuentren. Los mensajes llevan número de secuencia y se reenvían si la conexión se corta unos segundos.
const CG = (() => {
  const PROTO = 1;
  const INFO = {
    ajedrez: { name: 'Ajedrez', file: 'clasicos/ajedrez.js', deps: ['clasicos/chess-engine.js'] },
    poker: { name: 'Póker', file: 'clasicos/poker.js', deps: ['clasicos/poker-engine.js'] },
    batalla: { name: 'Batalla Naval', file: 'clasicos/batalla.js', deps: ['clasicos/batalla-engine.js'] },
    ludo: { name: 'Ludo', file: 'clasicos/ludo.js', deps: ['clasicos/ludo-engine.js'] },
  };
  const LEVELS = [['Fácil', 'Para aprender y relajarte'], ['Medio', 'Un reto justo'], ['Difícil', 'Juega en serio']];
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const GAMES = {};
  const S = { id: null, net: null, ctx: null, open: false, dom: null, level: 1 };

  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const myName = () => (String((rd('gg_profile', {}) || {}).name || 'Jugador').trim().slice(0, 18) || 'Jugador');
  const rnd = n => Math.floor(Math.random() * n);

  const loaded = {};
  function loadScript(src) {
    return loaded[src] || (loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = () => { delete loaded[src]; rej(new Error('No se pudo cargar el juego. Revisa tu conexión.')); };
      document.head.append(s);
    }));
  }

  async function loadGame(id) {
    for (const d of INFO[id].deps || []) await loadScript(d);
    await loadScript(INFO[id].file);
    if (!GAMES[id]) throw new Error('El juego no se pudo iniciar.');
  }

  // ------------------------------------------------------------------ conexión online
  class Net {
    constructor(game, role, name, h) {
      Object.assign(this, { game, role, name, h, seq: 0, lastIn: 0, out: [], conn: null, peer: null, joined: false, rivalName: 'Rival',
        lastRx: 0, closed: false, hostId: null, status: 'wait', lostAt: 0, tryAt: 0, code: null, tok: null });
      const a = new Uint8Array(8);
      (window.crypto || { getRandomValues: x => x.fill(rnd(255)) }).getRandomValues(a);
      this.mytok = Array.from(a, x => x.toString(16).padStart(2, '0')).join('');
      this.timer = setInterval(() => this._tick(), 3000);
    }
    async host() {
      await loadScript('clasicos/vendor/peerjs.min.js');
      for (let i = 0; i < 6 && !this.code && !this.closed; i++) {
        const code = Array.from({ length: 5 }, () => CODE_CHARS[rnd(CODE_CHARS.length)]).join('');
        try { await this._open('gg-' + this.game + '-' + code); this.code = code; } catch (e) { if (e.type !== 'unavailable-id') throw e; }
      }
      if (!this.code) throw new Error('No pudimos crear la sala. Intenta de nuevo.');
      return this.code;
    }
    _open(id) {
      return new Promise((res, rej) => {
        const p = new Peer(id, { debug: 0 });
        let done = false;
        p.on('open', () => { done = true; this.peer = p; res(); });
        p.on('connection', c => this._attach(c));
        p.on('disconnected', () => { if (!this.closed && !p.destroyed) try { p.reconnect(); } catch (e) { /* nada */ } });
        p.on('error', e => { if (!done) { try { p.destroy(); } catch (x) { /* nada */ } rej(e); } });
      });
    }
    async join(code) {
      await loadScript('clasicos/vendor/peerjs.min.js');
      this.hostId = 'gg-' + this.game + '-' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
      await new Promise((res, rej) => {
        const p = new Peer({ debug: 0 });
        let done = false;
        p.on('open', () => { done = true; this.peer = p; res(); });
        p.on('disconnected', () => { if (!this.closed && !p.destroyed) try { p.reconnect(); } catch (e) { /* nada */ } });
        p.on('error', e => {
          if (!done) rej(e);
          else if (e.type === 'peer-unavailable' && !this.joined) this.h.onerror('No encontramos esa partida. Revisa el código o pídele a tu amigo que siga en la pantalla de espera.');
        });
      });
      this._connect();
      this.joinTimer = setTimeout(() => { if (!this.joined && !this.closed) this.h.onerror('No logramos conectar. Revisa el código y que tu amigo siga en la pantalla de espera.'); }, 20000);
    }
    _connect() {
      if (this.closed || !this.peer || this.peer.destroyed) return;
      this._attach(this.peer.connect(this.hostId, { reliable: true }));
    }
    _attach(conn) {
      const host = this.role === 'host';
      if (!host) { const old = this.conn; this.conn = conn; if (old && old !== conn) try { old.close(); } catch (e) { /* nada */ } }
      conn.on('open', () => { if (!host && this.conn === conn) { this.lastRx = Date.now(); this._hello(); } });
      conn.on('data', f => {
        if (!f || typeof f !== 'object') return;
        if (host && this.conn !== conn) {
          if (f.k !== 'hello') return;
          if (this.tok && f.tok !== this.tok) { try { conn.send({ k: 'full' }); } catch (e) { /* nada */ } setTimeout(() => { try { conn.close(); } catch (e) { /* nada */ } }, 400); return; }
          const old = this.conn; this.conn = conn; if (old) try { old.close(); } catch (e) { /* nada */ }
        }
        if (this.conn === conn) this._rx(f);
      });
      conn.on('close', () => { if (this.conn === conn) { this.conn = null; this._lost(); } });
      conn.on('error', () => { /* el cierre se maneja en 'close' o en el ping */ });
    }
    _hello() { this._tx({ k: 'hello', v: PROTO, name: this.name, tok: this.mytok, a: this.lastIn }); }
    _tx(f) { if (this.conn && this.conn.open) try { this.conn.send(f); } catch (e) { /* se reenvía al reconectar */ } }
    send(m) { const s = ++this.seq; this.out.push({ s, m }); this._tx({ k: 'd', s, m }); }
    sendRematch() { this._tx({ k: 'rm' }); }
    _ackTo(a) { if (typeof a === 'number') this.out = this.out.filter(o => o.s > a); }
    _rx(f) {
      this.lastRx = Date.now();
      switch (f.k) {
        case 'hello': {
          if (f.v !== PROTO) { this.h.onerror('Tu amigo tiene otra versión de la app. Recarga la página.'); return; }
          if (this.role === 'host') { this.tok = f.tok; this._hello(); }
          this.rivalName = String(f.name || 'Rival').slice(0, 18);
          this._ackTo(f.a);
          for (const o of this.out) this._tx({ k: 'd', s: o.s, m: o.m });
          const first = !this.joined;
          this.joined = true; clearTimeout(this.joinTimer);
          if (this.status !== 'ok') { this.status = 'ok'; this.h.onstatus('ok'); }
          if (first) this.h.onjoin(); else this.h.onresume();
          break;
        }
        case 'd':
          if (typeof f.s === 'number' && f.s === this.lastIn + 1) {
            this.lastIn = f.s;
            try { this.h.ondata(f.m); } catch (e) { console.error(e); }
          }
          break;
        case 'ping': this._ackTo(f.a); break;
        case 'rm': this.h.onrematch(); break;
        case 'bye': this.h.onbye(); break;
        case 'full': this.h.onerror('Esa partida ya tiene a otro jugador.'); break;
      }
    }
    _lost() {
      if (this.joined && this.status !== 'lost') { this.status = 'lost'; this.lostAt = Date.now(); this.tryAt = 0; this.h.onstatus('lost'); }
    }
    _tick() {
      if (this.closed) return;
      if (this.conn && this.conn.open) {
        this._tx({ k: 'ping', a: this.lastIn });
        if (Date.now() - this.lastRx > 15000) { const c = this.conn; this.conn = null; try { c.close(); } catch (e) { /* nada */ } this._lost(); }
        return;
      }
      if (!this.joined) return;
      if (!this.lostAt) this._lost();
      if (Date.now() - this.lostAt > 45000) { this.h.ongone(); this.close(true); return; }
      if (this.role === 'guest' && Date.now() - this.tryAt > 6000) {
        this.tryAt = Date.now();
        if (this.peer && this.peer.disconnected && !this.peer.destroyed) try { this.peer.reconnect(); } catch (e) { /* nada */ }
        this._connect();
      }
    }
    close(silent) {
      if (this.closed) return;
      if (!silent) this._tx({ k: 'bye' });
      this.closed = true; clearInterval(this.timer); clearTimeout(this.joinTimer);
      const p = this.peer;
      setTimeout(() => { try { p && p.destroy(); } catch (e) { /* nada */ } }, 400);
    }
  }

  // ------------------------------------------------------------------ interfaz base
  function ensureDom() {
    if (S.dom) return;
    const el = document.createElement('div');
    el.id = 'cg'; el.hidden = true;
    el.innerHTML = '<header class="cg-top"><button class="cg-back" id="cgBack" aria-label="Volver"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h2 id="cgTitle"></h2><span class="cg-chip" id="cgChip" hidden></span></header><div id="cgBody"></div><div id="cgToast" hidden></div><div id="cgModal" hidden></div>';
    document.body.append(el);
    S.dom = el;
    $('#cgBack').onclick = () => requestExit();
  }
  function modal({ title, text, html, buttons }) {
    const m = $('#cgModal');
    m.hidden = false;
    m.innerHTML = '<div class="cg-dialog" role="dialog" aria-modal="true">' + (title ? '<h3>' + esc(title) + '</h3>' : '') + (text ? '<p>' + esc(text) + '</p>' : '') + (html || '') + '<div class="cg-btnrow"></div></div>';
    const row = m.querySelector('.cg-btnrow');
    (buttons || []).forEach(b => {
      const x = document.createElement('button');
      x.className = 'cg-btn ' + (b.cls || 'primary'); x.textContent = b.label;
      x.onclick = () => { if (!b.keep) closeModal(); if (b.fn) b.fn(); };
      row.append(x);
    });
    return m.firstChild;
  }
  function closeModal() { const m = $('#cgModal'); if (m) { m.hidden = true; m.innerHTML = ''; } }
  let toastT = 0;
  function toast(msg) {
    const t = $('#cgToast'); if (!t) return;
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function setChip(st) {
    const c = $('#cgChip'), ctx = S.ctx;
    if (!ctx || !S.open) { c.hidden = true; return; }
    c.hidden = false;
    if (ctx.mode === 'bot') { c.textContent = 'Bot · ' + LEVELS[ctx.level][0]; c.className = 'cg-chip'; }
    else if (st === 'lost') { c.textContent = '● Reconectando…'; c.className = 'cg-chip warn'; }
    else { c.textContent = '● En línea'; c.className = 'cg-chip ok'; }
  }
  const body = () => $('#cgBody');

  function record(id, mode, result) {
    const all = rd('gg_records', {});
    const g = all[id] || (all[id] = {});
    const r = g[mode] || (g[mode] = { w: 0, l: 0, d: 0 });
    r[result === 'win' ? 'w' : result === 'loss' ? 'l' : 'd']++;
    wr('gg_records', all);
  }

  // ------------------------------------------------------------------ pantallas
  function showLobby(id) {
    endSession();
    const lv = S.level;
    body().innerHTML = '<div class="cg-lobby"><div class="cg-gameicon" id="cgIcon"></div><p class="cg-blurb">' + esc(GAME_BLURB[id]) + '</p>' +
      '<section class="cg-card"><h3>Contra el bot</h3><div class="cg-seg" id="cgSeg">' +
      LEVELS.map((l, i) => '<button data-l="' + i + '" class="' + (i === lv ? 'on' : '') + '"><b>' + l[0] + '</b><span>' + l[1] + '</span></button>').join('') +
      '</div><button class="cg-btn primary" id="cgBot">Jugar contra el bot</button></section>' +
      '<section class="cg-card"><h3>Con un amigo · online</h3><p class="cg-hint">Crea una partida y mándale el enlace. Se une desde su celular, sin instalar nada.</p>' +
      '<button class="cg-btn primary" id="cgHost">Crear partida y compartir enlace</button>' +
      '<div class="cg-or"><span>o entra con un código</span></div>' +
      '<div class="cg-join"><input id="cgCode" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CÓDIGO" aria-label="Código de la partida"><button class="cg-btn ghost" id="cgJoin">Unirme</button></div></section></div>';
    const paintIcon = () => { const ic = document.getElementById('cgIcon'); if (ic && S.id === id && ICONS[id]) ic.innerHTML = ICONS[id]; };
    paintIcon(); loadGame(id).then(paintIcon).catch(() => { /* el error se muestra al jugar */ });
    $('#cgSeg').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      S.level = +b.dataset.l; wr('gg_level', S.level);
      document.querySelectorAll('#cgSeg button').forEach(x => x.classList.toggle('on', x === b));
    };
    $('#cgBot').onclick = () => startBot(id, S.level);
    $('#cgHost').onclick = () => hostOnline(id);
    const codeIn = $('#cgCode');
    codeIn.oninput = () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    const go = () => { if (codeIn.value.length === 5) joinOnline(id, codeIn.value); else { toast('El código tiene 5 letras o números.'); codeIn.focus(); } };
    $('#cgJoin').onclick = go;
    codeIn.onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  function showSpinner(text, onCancel) {
    body().innerHTML = '<div class="cg-center"><div class="cg-spin" aria-hidden="true"></div><p>' + esc(text) + '</p><button class="cg-btn ghost" id="cgCancel">Cancelar</button></div>';
    $('#cgCancel').onclick = onCancel;
  }
  function showError(id, msg) {
    endSession();
    body().innerHTML = '<div class="cg-center"><div class="cg-bad" aria-hidden="true">!</div><p>' + esc(msg) + '</p><button class="cg-btn primary" id="cgBack2">Volver</button></div>';
    $('#cgBack2').onclick = () => showLobby(id);
  }
  function friendly(e) {
    if (e && e.type && /network|server-error|socket-error|socket-closed|browser-incompatible/.test(e.type)) return 'No pudimos conectar con el servicio online. Revisa tu conexión a internet e inténtalo otra vez.';
    return (e && e.message) || 'Algo salió mal. Inténtalo otra vez.';
  }
  function linkFor(id, code) {
    return location.origin + location.pathname.replace(/index\.html$/, '') + '?juego=' + id + '&sala=' + code + '#clasicos';
  }
  function showWaiting(id, code) {
    const url = linkFor(id, code);
    body().innerHTML = '<div class="cg-center wait"><h3>Pásale este enlace a tu amigo</h3><div class="cg-code" aria-label="Código de la partida">' + code.split('').map(c => '<b>' + c + '</b>').join('') + '</div>' +
      '<input class="cg-link" id="cgLink" readonly value="' + esc(url) + '" aria-label="Enlace de la partida">' +
      '<div class="cg-btnrow"><button class="cg-btn primary" id="cgShare">Compartir enlace</button><button class="cg-btn ghost" id="cgCopy">Copiar</button></div>' +
      '<div class="cg-wait"><div class="cg-spin sm" aria-hidden="true"></div><span>Esperando a tu amigo…</span></div><button class="cg-btn ghost" id="cgCancel">Cancelar</button></div>';
    const text = 'Te reto a ' + INFO[id].name + ' en Giorgio Games. Entra aquí para jugar contra mí:';
    $('#cgShare').onclick = async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Giorgio Games · ' + INFO[id].name, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      copy(url);
    };
    $('#cgCopy').onclick = () => copy(url);
    $('#cgCancel').onclick = () => showLobby(id);
    async function copy(u) {
      try { await navigator.clipboard.writeText(u); toast('Enlace copiado'); }
      catch (e) { const i = $('#cgLink'); i.select(); i.setSelectionRange(0, 999); toast('Copia el enlace seleccionado'); }
    }
  }

  // ------------------------------------------------------------------ sesión
  function makeCtx(id, mode, role, level) {
    const ctx = {
      id, mode, role, level, round: 0, online: mode === 'online', isHost: role !== 'guest',
      name: myName(), rivalName: mode === 'bot' ? 'Bot ' + LEVELS[level][0].toLowerCase() : 'Rival',
      root: body(), onmsg: null, onresume: null, started: false, finished: false, dead: false, timers: [], cleanups: [],
      send: m => { if (S.net) S.net.send(m); },
      toast,
      modal, closeModal, esc,
      later(fn, ms) {
        const r = ctx.round;
        const t = setTimeout(() => { if (!ctx.dead && ctx.round === r) fn(); }, ms);
        ctx.timers.push(t); return t;
      },
      onCleanup(fn) { ctx.cleanups.push(fn); },
      finish({ result, title, sub, delay }) {
        if (ctx.finished || ctx.dead) return;
        ctx.finished = true;
        record(id, ctx.mode, result);
        ctx.later(() => showResult(ctx, result, title, sub), delay === undefined ? 900 : delay);
      },
    };
    return ctx;
  }
  function cleanupCtx(ctx) {
    if (!ctx) return;
    ctx.timers.forEach(clearTimeout); ctx.timers = [];
    ctx.cleanups.forEach(f => { try { f(); } catch (e) { /* nada */ } }); ctx.cleanups = [];
    ctx.onmsg = null; ctx.onresume = null;
  }
  function endSession() {
    if (S.ctx) { S.ctx.dead = true; cleanupCtx(S.ctx); }
    if (S.net) { S.net.close(); S.net = null; }
    S.ctx = null; S.queue = null; S.myRm = S.rivalRm = false;
    closeModal(); setChip();
  }
  function netHandlers(id) {
    return {
      onjoin: () => { if (S.ctx && !S.ctx.started) launch(); },
      onresume: () => { setChip('ok'); toast('Conexión recuperada'); if (S.ctx && S.ctx.onresume) S.ctx.onresume(); },
      onstatus: st => setChip(st),
      ondata: m => { if (S.ctx && S.ctx.onmsg) S.ctx.onmsg(m); else (S.queue || (S.queue = [])).push(m); },
      onrematch: () => {
        S.rivalRm = true;
        if (S.myRm) rematchStart();
        else if (S.ctx && S.ctx.finished) toast(S.ctx.rivalName + ' quiere la revancha');
      },
      onbye: () => {
        const c = S.ctx; if (!c || c.dead) return;
        const wasOver = c.finished;
        c.finished = true; closeModal();
        if (!wasOver) record(id, 'online', 'win');
        modal({ title: wasOver ? 'Tu amigo se fue' : '¡Ganas!', text: wasOver ? 'Salió de la partida.' : c.rivalName + ' abandonó la partida.', buttons: [{ label: 'Salir', cls: 'primary', fn: () => showLobby(id) }] });
      },
      ongone: () => { const c = S.ctx; if (!c || c.dead) return; c.finished = true; modal({ title: 'Se perdió la conexión', text: 'No logramos reconectar con tu amigo.', buttons: [{ label: 'Salir', cls: 'primary', fn: () => showLobby(id) }] }); },
      onerror: msg => showError(id, msg),
    };
  }
  async function startBot(id, level) {
    try { await loadGame(id); } catch (e) { showError(id, friendly(e)); return; }
    endSession();
    S.ctx = makeCtx(id, 'bot', 'solo', level);
    launch();
  }
  async function hostOnline(id) {
    endSession();
    showSpinner('Creando tu partida…', () => showLobby(id));
    try {
      await loadGame(id);
      S.ctx = makeCtx(id, 'online', 'host', 0);
      S.net = new Net(id, 'host', myName(), netHandlers(id));
      const net = S.net;
      const code = await net.host();
      if (S.net !== net) return;
      showWaiting(id, code);
    } catch (e) { showError(id, friendly(e)); }
  }
  async function joinOnline(id, code) {
    endSession();
    showSpinner('Conectando con la partida ' + code + '…', () => showLobby(id));
    try {
      await loadGame(id);
      S.ctx = makeCtx(id, 'online', 'guest', 0);
      S.net = new Net(id, 'guest', myName(), netHandlers(id));
      await S.net.join(code);
    } catch (e) { showError(id, e && e.type === 'peer-unavailable' ? 'No encontramos esa partida. Revisa el código.' : friendly(e)); }
  }
  function launch() {
    const ctx = S.ctx, id = S.id;
    if (S.net) ctx.rivalName = S.net.rivalName;
    ctx.started = true; ctx.finished = false;
    body().innerHTML = ''; closeModal(); setChip(S.net ? S.net.status : 'ok');
    GAMES[id].start(ctx);
    flushQueue();
  }
  function flushQueue() {
    const q = S.queue; S.queue = null;
    if (q && S.ctx && S.ctx.onmsg) q.forEach(m => S.ctx.onmsg(m));
  }
  function showResult(ctx, result, title, sub) {
    if (ctx.dead || S.ctx !== ctx) return;
    const rematchTxt = ctx.online ? 'Pedir revancha' : 'Revancha';
    const m = modal({
      title: title || (result === 'win' ? '¡Ganaste!' : result === 'loss' ? 'Perdiste' : 'Empate'), text: sub || '',
      buttons: [{ label: rematchTxt, cls: 'primary', keep: ctx.online, fn: () => requestRematch() }, { label: 'Salir', cls: 'ghost', fn: () => showLobby(ctx.id) }],
    });
    m.classList.add(result);
  }
  function requestRematch() {
    const ctx = S.ctx; if (!ctx) return;
    if (!ctx.online) { rematchStart(); return; }
    S.myRm = true; S.net.sendRematch();
    if (S.rivalRm) { rematchStart(); return; }
    const d = $('#cgModal .cg-dialog');
    if (d) { d.querySelector('.cg-btnrow').innerHTML = '<div class="cg-wait"><div class="cg-spin sm"></div><span>Esperando a ' + esc(ctx.rivalName) + '…</span></div><button class="cg-btn ghost" id="cgLeave">Salir</button>'; $('#cgLeave').onclick = () => showLobby(ctx.id); }
  }
  function rematchStart() {
    const ctx = S.ctx; if (!ctx || ctx.dead) return;
    S.myRm = S.rivalRm = false;
    cleanupCtx(ctx);
    ctx.round++; ctx.finished = false;
    body().innerHTML = ''; closeModal();
    GAMES[ctx.id].start(ctx);
    flushQueue();
  }
  function requestExit() {
    const c = S.ctx;
    if (c && c.started && !c.finished) {
      modal({ title: '¿Salir de la partida?', text: c.online ? 'Tu amigo se quedará esperando.' : 'Perderás el avance de esta partida.', buttons: [{ label: 'Seguir jugando', cls: 'ghost' }, { label: 'Salir', cls: 'danger', fn: closeOverlay }] });
    } else if (c || S.net) showLobby(S.id);
    else closeOverlay();
  }

  // ------------------------------------------------------------------ apertura / cierre
  function openOverlay(id) {
    ensureDom();
    S.id = id; S.level = rd('gg_level', 1);
    if (!(S.level >= 0 && S.level <= 2)) S.level = 1;
    $('#cgTitle').textContent = INFO[id].name;
    S.dom.hidden = false;
    document.documentElement.classList.add('cg-open');
    if (!S.open) { S.open = true; try { history.pushState({ cg: 1 }, '', location.href); } catch (e) { /* nada */ } }
  }
  function closeOverlay(fromHistory) {
    if (!S.open) return;
    S.open = false;
    endSession();
    S.dom.hidden = true; body().innerHTML = '';
    document.documentElement.classList.remove('cg-open');
    if (fromHistory !== true && history.state && history.state.cg) history.back();
    if (window.CGhooks && window.CGhooks.onclose) window.CGhooks.onclose();
  }
  addEventListener('popstate', () => {
    if (!S.open) return;
    const c = S.ctx;
    if (c && c.started && !c.finished) {
      try { history.pushState({ cg: 1 }, '', location.href); } catch (e) { /* nada */ }
      requestExit();
    } else closeOverlay(true);
  });

  async function open(id) {
    if (!INFO[id]) return;
    openOverlay(id);
    showLobby(id);
  }
  async function join(id, code) {
    if (!INFO[id] || !/^[A-Za-z0-9]{5}$/.test(code || '')) return;
    openOverlay(id);
    joinOnline(id, code.toUpperCase());
  }
  function register(id, def) { GAMES[id] = def; }

  const GAME_BLURB = {
    ajedrez: 'El juego de estrategia de siempre. Mueve, amenaza y da jaque mate.',
    poker: 'Texas Hold’em uno contra uno. Fichas, faroles y sangre fría.',
    batalla: 'Esconde tu flota y hunde la del rival antes de que hunda la tuya.',
    ludo: 'Saca un 6, recorre el tablero y lleva tus cuatro fichas a casa.',
  };
  const ICONS = {};

  return { _S: S, register, open, join, load: loadScript, INFO, LEVELS, ICONS, esc, rd, wr, rnd, record, toast, modal, closeModal, linkFor };
})();
