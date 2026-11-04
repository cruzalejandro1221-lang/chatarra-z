'use strict';
// Siete Vidas: pantallas, mesa y flujo de la partida. Reglas en core.js, sala online en net.js.
(() => {
  const C = window.SIETE, NET = window.SieteNet, $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const FUR = [['#f3e6d2', '#5a4032'], ['#8d93a3', '#4d5263'], ['#ff9f43', '#c96a12'], ['#3a3a46', '#1c1c24']];
  const cat = (i, sad) => { const [a, b] = FUR[i % 4]; return '<svg viewBox="0 0 64 60" aria-hidden="true"><path d="M10 28 L12 4 L28 16 Q32 15 36 16 L52 4 L54 28 Q58 52 32 54 Q6 52 10 28Z" fill="' + a + '" stroke="#0f0b1a" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 12 L16 22 L23 17Z M49 12 L48 22 L41 17Z" fill="' + b + '"/>' + (sad ? '<path d="M18 30l8 6M26 30l-8 6M38 30l8 6M46 30l-8 6" stroke="#0f0b1a" stroke-width="3" stroke-linecap="round"/>' : '<circle cx="23" cy="32" r="5.500" fill="#ffe27d" stroke="#0f0b1a" stroke-width="2"/><circle cx="41" cy="32" r="5.500" fill="#ffe27d" stroke="#0f0b1a" stroke-width="2"/><ellipse cx="23" cy="32" rx="1.800" ry="4" fill="#0f0b1a"/><ellipse cx="41" cy="32" rx="1.800" ry="4" fill="#0f0b1a"/>') + '<path d="M29 41l3 3 3-3z" fill="#e5788f"/><path d="M6 40l12 1M6 46l12-2M58 40l-12 1M58 46l-12-2" stroke="#0f0b1a" stroke-width="1.400"/></svg>'; };
  let myName = 'Gato', host = null, guest = null, G = null, V = null, seatNames = [], lastSeq = 0, serving = null, chatOpen = false, timer = 0, timeLeft = 0, busyUntil = 0, botT = 0, round = 0;
  try { const A = window.parent !== window && window.parent.GGAccount; if (A && A.profile) myName = A.profile.username; else myName = localStorage.getItem('siete_name') || myName; } catch (e) { /* nada */ }

  // ------------------------------------------------------------ sonido
  let ac = null, drone = null;
  function tone(f, d, type, v, at) { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) { /* sin audio */ } }
  function ambient() { try { tone(1, 0.01); if (drone || !ac) return; drone = ac.createGain(); drone.gain.value = 0.022; for (const f of [55, 82.4, 110.7]) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(drone); o.start(); } drone.connect(ac.destination); } catch (e) { /* nada */ } }
  const sting = bad => { if (bad) { tone(70, 0.7, 'sawtooth', 0.11); tone(233, 0.5, 'square', 0.05, 0.03); } else { tone(523, 0.16, 'triangle'); tone(784, 0.22, 'triangle', 0.06, 0.12); } };
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };

  // ------------------------------------------------------------ pantallas de inicio
  const exit = () => { leave(); window.parent.postMessage({ gg: 'exit' }, location.origin); };
  function leave() { clearInterval(timer); clearTimeout(botT); if (host) host.close(); if (guest) guest.close(); host = guest = null; G = V = null; lastSeq = 0; }
  function home(msg) {
    leave(); if (window.Siete3D) window.Siete3D.hide();
    app.className = 'scr';
    app.innerHTML = '<button class="back" id="out">‹</button><div class="logo"><div class="moon"></div>' + cat(0) + '<h1>SIETE<br><span>VIDAS</span></h1><p>Una cena embrujada. Hasta 4 gatos. Unos platos están malditos… y tus amigos mienten.</p></div>' + (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
      '<label class="lb">Tu nombre<input id="nm" maxlength="14" value="' + esc(myName) + '" autocomplete="off"></label><button class="b gold" id="make">Crear sala</button><div class="row"><input id="code" maxlength="5" placeholder="CÓDIGO" autocomplete="off"><button class="b" id="join">Unirme</button></div><button class="b" id="solo">Practicar contra bots</button><button class="lnk" id="how">¿Cómo se juega?</button>';
    const nm = () => { myName = NET.clean($('#nm').value); try { localStorage.setItem('siete_name', myName); } catch (e) { /* nada */ } ambient(); };
    $('#out').onclick = exit; $('#how').onclick = () => howTo();
    $('#make').onclick = () => { nm(); makeRoom(); };
    $('#solo').onclick = () => { nm(); practice(); };
    $('#join').onclick = () => { nm(); const c = $('#code').value.trim(); if (c.length < 5) { $('#code').focus(); return; } joinRoom(c); };
  }
  function howTo(after) {
    const cards = [['🍽️', 'Hay una fila de platos. Sabes <b>cuántos</b> están malditos, pero no cuáles. Cada ronda hueles uno en secreto.'], ['😋', 'En tu turno, <b>cómelo</b> o <b>sírveselo</b> a otro. Si comes uno bueno, ganas un objeto y sigues jugando.'], ['🤥', 'Al servir puedes mentir. Quien lo recibe lo come o lo <b>devuelve</b>: devuelto y maldito, te quita <b>el doble</b>. Pero si era bueno, el desconfiado pierde 1 vida.'], ['🏆', 'Cada gato tiene 4 vidas. Cada ronda hay más platos malditos. <b>Gana el último gato en pie.</b>']];
    let i = 0;
    const show = () => { const m = $('#modal'); m.hidden = false; m.innerHTML = '<div class="how" id="hw"><div class="big">' + cards[i][0] + '</div><p>' + cards[i][1] + '</p><div class="dots">' + cards.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div><button class="b gold">' + (i < cards.length - 1 ? 'Seguir' : 'Entendido') + '</button></div>'; m.querySelector('button').onclick = () => { if (++i < cards.length) show(); else { m.hidden = true; if (after) after(); } }; };
    show();
  }
  const once = fn => { let seen = false; try { seen = localStorage.getItem('siete_how') === '1'; localStorage.setItem('siete_how', '1'); } catch (e) { /* nada */ } if (seen) fn(); else howTo(fn); };
  function wait(t) { app.className = 'scr'; app.innerHTML = '<div class="logo"><div class="spin"></div><p>' + esc(t) + '</p></div>'; }
  async function makeRoom() {
    wait('Creando la sala…');
    host = new NET.Host(myName, hostEvents);
    try { await host.open(); lobby(); } catch (e) { home(e.message); }
  }
  function practice() { host = new NET.Host(myName, hostEvents); host.addBot(); host.addBot(); host.addBot(); once(startGame); }
  async function joinRoom(code) {
    wait('Entrando a la sala…');
    guest = new NET.Guest(myName, { onmsg: guestMsg, onerror: t => home(t) });
    try { await guest.join(code); } catch (e) { home(e.message); }
  }
  function link(code) { const b = location.href.replace(/siete\/index\.html.*$/, ''); return b + '?juego=siete&sala=' + code; }
  function lobby(seats, code) {
    const isHost = !!host, list = isHost ? host.seats : seats, c = isHost ? host.code : code;
    app.className = 'scr';
    app.innerHTML = '<button class="back" id="out">‹</button><h2>Sala</h2><div class="codebox"><small>Código</small><b>' + esc(c) + '</b></div>' + (isHost ? '<button class="b gold" id="inv">Invitar amigos</button>' : '') +
      '<ul class="seats">' + list.map((s, i) => '<li><span class="cat">' + cat(i) + '</span><b>' + esc(s.name) + '</b><small>' + (i === 0 ? 'Anfitrión' : s.bot ? 'Bot' : 'Listo') + '</small>' + (isHost && i ? '<button data-k="' + i + '">✕</button>' : '') + '</li>').join('') + Array.from({ length: NET.MAX - list.length }, () => '<li class="free">Silla libre</li>').join('') + '</ul>' +
      (isHost ? (list.length < NET.MAX ? '<button class="b" id="bot">Agregar bot</button>' : '') + '<button class="b gold" id="go"' + (list.length < 2 ? ' disabled' : '') + '>Empezar la cena</button>' : '<p class="muted">Esperando a que el anfitrión empiece…</p>');
    $('#out').onclick = () => home();
    if (!isHost) return;
    $('#inv').onclick = async () => { const u = link(c); try { if (navigator.share) { await navigator.share({ title: 'Siete Vidas', text: 'Únete a mi cena embrujada', url: u }); return; } } catch (e) { if (e.name === 'AbortError') return; } try { await navigator.clipboard.writeText(u); toast('Enlace copiado'); } catch (e) { prompt('Copia este enlace:', u); } };
    const b = $('#bot'); if (b) b.onclick = () => host.addBot();
    $('#go').onclick = () => once(startGame);
    app.querySelectorAll('[data-k]').forEach(x => { x.onclick = () => host.kick(+x.dataset.k); });
  }
  const hostEvents = {
    onseats() { if (!host) return; host.lobby(); if (!host.started) lobby(); else broadcast(); },
    onact(i, a) { if (G) tryAct(i, a); },
    onchat(i, k) { sendChat(i, k); },
    onleave(i) { if (G) { toast(host.seats[i].name + ' se desconectó: juega un bot'); step(); } },
  };

  // ------------------------------------------------------------ anfitrión: árbitro de la partida
  function startGame() {
    host.started = true; round = 0; G = C.create(host.seats.map(s => ({ name: s.name })));
    broadcast(); step();
  }
  function broadcast() {
    if (!G) return;
    host.seats.forEach((s, i) => { const v = C.view(G, i); if (s.me) show(v); else if (s.conn) host.send(i, { t: 'view', v }); });
  }
  const actor = () => (G.phase === 'respond' ? G.offer.to : G.turn);
  function tryAct(i, a) {
    if (!G || G.phase === 'over' || Date.now() < busyUntil || i !== actor()) return;
    if (!C.act(G, i, a)) return;
    const reveal = G.last && G.last.type === 'eat';
    busyUntil = Date.now() + (reveal ? 2300 : 500);
    broadcast(); step();
  }
  function step() {
    clearInterval(timer); clearTimeout(botT); if (!G || G.phase === 'over') return;
    const p = actor(), s = host.seats[p], delay = Math.max(0, busyUntil - Date.now());
    if (s.bot || s.away) { botT = setTimeout(() => { if (!G || actor() !== p) return step(); busyUntil = 0; const a = C.bot(G, p); if (!C.act(G, p, a)) C.act(G, p, G.phase === 'respond' ? { t: 'accept' } : { t: 'eat' }); const r = G.last && G.last.type === 'eat'; busyUntil = Date.now() + (r ? 2300 : 500); broadcast(); step(); }, delay + 900 + Math.random() * 900); return; }
    timeLeft = 30;
    timer = setInterval(() => { if (Date.now() < busyUntil) return; if (--timeLeft <= 0) { clearInterval(timer); busyUntil = 0; tryAct(p, G.phase === 'respond' ? { t: 'accept' } : { t: 'eat' }); } }, 1000);
  }
  function sendChat(i, k) { if (!C.CHAT[k]) return; const m = { t: 'chat', p: i, i: k }; host.all(m); bubble(i, k); }

  // ------------------------------------------------------------ invitado
  function guestMsg(m) {
    if (!m) return;
    if (m.t === 'lobby') { if (!V) lobby(m.seats, m.code); }
    else if (m.t === 'view') show(m.v);
    else if (m.t === 'chat') bubble(m.p, m.i);
    else if (m.t === 'full') home(m.why);
    else if (m.t === 'end') home('El anfitrión cerró la sala.');
    else if (m.t === 'lost') toast('Conexión perdida. Reconectando…');
  }
  const send = a => { if (host) tryAct(V.me, a); else guest.send({ t: 'act', a }); };

  // ------------------------------------------------------------ mesa
  function show(v) {
    const isNew = v.last && v.last.seq !== lastSeq, newRound = v.round !== round; V = v; round = v.round; serving = null;
    if (v.phase === 'over') { if (isNew) { lastSeq = v.last.seq; reveal(v, () => finish(v)); } else finish(v); return; }
    table(v);
    if (isNew) { lastSeq = v.last.seq; reveal(v); }
    if (newRound && v.event) setTimeout(() => banner(C.EVENTS[v.event]), isNew ? 2300 : 300);
    else if (newRound && v.round > 1) setTimeout(() => banner({ icon: '🍽️', name: 'Ronda ' + v.round, desc: 'Nueva fila de platos.' }), isNew ? 2300 : 300);
  }
  const seatPos = (i, v) => { const n = v.players.length, r = (i - v.me + n) % n; return n === 2 ? ['me', 'top'][r] : n === 3 ? ['me', 'left', 'right'][r] : ['me', 'left', 'top', 'right'][r]; };
  function table(v) {
    const mine = v.players[v.me], actorNow = v.phase === 'respond' ? v.offer.to : v.turn, myTurn = actorNow === v.me && !mine.out;
    app.className = 'table' + (v.bonus ? ' red' : '') + (window.Siete3D ? ' d3' : '');
    const dishes = Array.from({ length: v.left }, (_, i) => { const s = v.seen.find(x => x.i === i); return '<i class="dish' + (i === 0 ? ' next' : '') + (s ? (s.bad ? ' kbad' : ' kgood') : '') + '" title="Plato ' + (i + 1) + '">' + (s ? (s.bad ? '☠' : '✓') : '') + '</i>'; }).join('');
    const seats = v.players.map((p, i) => '<button class="seat ' + seatPos(i, v) + (i === actorNow ? ' turn' : '') + (p.out ? ' out' : '') + '" data-p="' + i + '"><span class="cat">' + cat(p.cat, p.out) + '</span><b>' + esc(p.name) + '</b><span class="lv">' + '♥'.repeat(p.lives) + '<u>' + '♥'.repeat(Math.max(0, C.LIVES - p.lives)) + '</u>' + (p.shield ? ' 🧻' : '') + '</span>' + (i !== v.me ? '<small>🎒 ' + p.n + '</small>' : '') + '<em class="bub" id="bub' + i + '"></em></button>').join('');
    const info = v.left + ' platos · ' + (v.bad === null ? '¿? malditos' : v.bad + ' maldito' + (v.bad === 1 ? '' : 's'));
    let bar = '';
    if (mine.out) bar = '<p class="say">Quedaste fuera. Mira cómo termina la cena 👻</p>';
    else if (v.phase === 'respond' && v.offer.to === v.me) bar = '<p class="say">' + esc(v.players[v.offer.from].name) + ' te sirve el plato y dice: <b>“' + (v.offer.claim === 'malo' ? 'Está maldito' : 'Está rico') + '”</b></p><div class="acts"><button class="b gold" data-a="accept">Comer</button><button class="b" data-a="return">Devolver</button></div>';
    else if (v.phase === 'respond') bar = '<p class="say">' + esc(v.players[v.offer.from].name) + ' sirvió a ' + esc(v.players[v.offer.to].name) + ': “' + (v.offer.claim === 'malo' ? 'Está maldito' : 'Está rico') + '”…</p>';
    else if (myTurn) bar = '<p class="say">Tu turno</p><div class="acts"><button class="b gold" data-a="eat">Comer</button><button class="b" data-a="serve">Servir a…</button></div>';
    else bar = '<p class="say">Turno de ' + esc(v.players[v.turn].name) + '…</p>';
    const tools = (mine.tools || []).map((k, i) => { const T = C.TOOLS[k]; return '<button class="tool" data-t="' + k + '" aria-label="' + T.name + '"' + (myTurn && v.phase === 'choose' && !T.passive ? '' : ' disabled') + '>' + T.icon + '</button>'; }).join('');
    app.innerHTML = '<div class="top"><button class="back sm" id="out">‹</button><b>Ronda ' + v.round + '</b><span>' + info + '</span><button class="back sm" id="chat">💬</button></div><div class="board"><div class="candle"></div><div class="plate"><div class="dishes">' + dishes + '</div><div class="cloche" id="cloche"></div>' + (v.event ? '<p class="evt">' + C.EVENTS[v.event].icon + ' ' + C.EVENTS[v.event].name + '</p>' : '') + '</div>' + seats + '</div><div class="bot"><div class="tools">' + tools + '</div>' + bar + '</div><div class="chatbox" id="cbox" hidden>' + C.CHAT.map((c, i) => '<button data-c="' + i + '">' + esc(c) + '</button>').join('') + '</div>';
    if (window.Siete3D) window.Siete3D.update(v, i => seatPos(i, v));
    $('#out').onclick = () => confirmOut();
    $('#chat').onclick = () => { $('#cbox').hidden = !$('#cbox').hidden; };
    app.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { const k = +b.dataset.c; $('#cbox').hidden = true; if (host) sendChat(V.me, k); else guest.send({ t: 'chat', i: k }); }; });
    app.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => { const a = b.dataset.a; if (a === 'serve') pickServe(); else send({ t: a }); }; });
    app.querySelectorAll('.tool').forEach(b => { b.onclick = () => toolInfo(b.dataset.t); });
    app.querySelectorAll('.seat').forEach(b => { b.onclick = () => { if (serving === 'pick') { const p = +b.dataset.p; if (p !== V.me && !V.players[p].out) claim(p); } }; });
  }
  function pickServe() { serving = 'pick'; app.querySelector('.bot .say').textContent = 'Toca al gato que recibirá el plato'; app.querySelectorAll('.seat').forEach(s => { const p = +s.dataset.p; if (p !== V.me && !V.players[p].out) s.classList.add('pick'); }); }
  function claim(to) {
    const m = $('#modal'); m.hidden = false;
    m.innerHTML = '<div class="how"><h3>¿Qué le dices a ' + esc(V.players[to].name) + '?</h3><button class="b gold" data-l="rico">“Está rico”</button><button class="b" data-l="malo">“Está maldito”</button><button class="lnk" data-l="">Cancelar</button></div>';
    m.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => { m.hidden = true; if (b.dataset.l) send({ t: 'serve', to, claim: b.dataset.l }); else table(V); }; });
  }
  function toolInfo(k) {
    const T = C.TOOLS[k], m = $('#modal'), rivals = V.players.map((p, i) => i).filter(i => i !== V.me && !V.players[i].out); m.hidden = false;
    m.innerHTML = '<div class="how"><div class="big">' + T.icon + '</div><h3>' + T.name + '</h3><p>' + T.desc + '</p>' + (k === 'robo' ? rivals.map(i => '<button class="b gold" data-to="' + i + '">Robar a ' + esc(V.players[i].name) + '</button>').join('') : '<button class="b gold" data-to="">Usar</button>') + '<button class="lnk" id="no">Cerrar</button></div>';
    m.querySelector('#no').onclick = () => { m.hidden = true; };
    m.querySelectorAll('[data-to]').forEach(b => { b.onclick = () => { m.hidden = true; const a = { t: 'tool', k }; if (b.dataset.to !== '') a.to = +b.dataset.to; send(a); }; });
  }
  function confirmOut() {
    const m = $('#modal'); m.hidden = false;
    m.innerHTML = '<div class="how"><h3>¿Salir de la cena?</h3><p>' + (host ? 'Eres el anfitrión: la sala se cerrará para todos.' : 'Un bot jugará por ti.') + '</p><button class="b gold" id="yes">Salir</button><button class="lnk" id="no">Seguir jugando</button></div>';
    m.querySelector('#no').onclick = () => { m.hidden = true; }; m.querySelector('#yes').onclick = () => { m.hidden = true; home(); };
  }
  function reveal(v, done) {
    const L = v.last, P = i => esc(v.players[i].name);
    const end = () => { if (done) setTimeout(done, 300); };
    if (L.type === 'serve') { tone(330, 0.1); return end(); }
    if (L.type === 'tool') { const T = C.TOOLS[L.k]; toast(P(L.who) + ' usó ' + T.icon + ' ' + T.name + (L.k === 'tirar' ? ': ' + (L.bad ? 'estaba maldito' : 'estaba bueno') : '')); tone(620, 0.1); return end(); }
    if (window.Siete3D) window.Siete3D.reveal(L.bad);
    const cl = window.Siete3D ? null : $('#cloche');
    if (cl) { cl.innerHTML = '<div class="dome"></div><div class="food ' + (L.bad ? 'bad' : 'good') + '">' + (L.bad ? '☠️' : '🐟') + '</div>'; cl.classList.add('show'); }
    tone(180, 0.4, 'sine', 0.05);
    setTimeout(() => {
      if (cl) cl.classList.add('open'); sting(L.bad); if (L.bad || L.distrust) { app.classList.add('hit'); buzz(L.who === v.me ? 90 : 20); setTimeout(() => app.classList.remove('hit'), 500); }
      let t = P(L.who) + (L.bad ? (L.blocked ? ' comió un plato maldito, ¡la servilleta lo salvó!' : ' comió un plato maldito: −' + L.dmg + (L.dmg > 1 ? ' vidas' : ' vida')) : ' comió un plato bueno');
      if (L.returned) t = 'Devuelto. ' + t; if (L.saved) t += '. ¡Séptima vida!'; if (L.out) t += '. Queda fuera.';
      if (L.distrust) t += '. ' + P(L.liar) + ' desconfió y pierde 1 vida' + (L.distrust.blocked ? ' (bloqueado)' : '');
      toast(t, 2000);
    }, 750);
    setTimeout(() => { if (cl) { cl.classList.remove('show', 'open'); cl.innerHTML = ''; } end(); }, 2200);
  }
  function banner(e) { const m = $('#ban'); m.innerHTML = '<div><span>' + e.icon + '</span><b>' + esc(e.name) + '</b><small>' + esc(e.desc) + '</small></div>'; m.hidden = false; tone(110, 0.6, 'triangle', 0.08); clearTimeout(m._t); m._t = setTimeout(() => { m.hidden = true; }, 2300); }
  function bubble(i, k) { const b = $('#bub' + i); if (!b) return; b.textContent = C.CHAT[k]; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 2600); }
  function toast(t, ms) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, ms || 2200); }
  function finish(v) {
    const win = v.players[v.winner], me = v.winner === v.me; clearInterval(timer); if (window.Siete3D) window.Siete3D.hide();
    app.className = 'scr';
    app.innerHTML = '<div class="logo end"><span class="cat big">' + cat(win.cat) + '</span><h1>' + (me ? '¡Ganaste!' : esc(win.name) + '<br>ganó') + '</h1><p>' + (me ? 'Fuiste el último gato en pie.' : 'Fue el último gato en pie.') + ' Duraron ' + v.round + (v.round === 1 ? ' ronda' : ' rondas') + '.</p></div>' + (host ? '<button class="b gold" id="again">Otra cena</button>' : '<p class="muted">El anfitrión puede empezar otra cena.</p>') + '<button class="b" id="home">Salir</button>';
    tone(me ? 660 : 200, 0.5, 'triangle', 0.08);
    if (host) $('#again').onclick = () => { G = null; V = null; lastSeq = 0; host.started = false; host.seats = host.seats.filter(s => !s.away); if (host.seats.length < 2) return home(); startGame(); };
    $('#home').onclick = () => home();
  }

  const q = new URLSearchParams(location.search).get('sala');
  if (q) joinRoom(q); else home();
  window.SieteDebug = { get G() { return G; }, get V() { return V; }, send, get host() { return host; } };
})();
