'use strict';
// Giorgio Games: pestañas, perfil (cuenta Giorgio o invitado), hoja de cuenta y juegos a pantalla completa.
const $ = s => document.querySelector(s);
const TABS = ['juegos', 'clasicos', 'trend', 'perfil'];
const SAVE_KEY = 'chatarraZ_v2';                 // mismo guardado que game/js/save.js
const PROFILE_KEY = 'gg_profile';
// Copia de RANKS y OPEN_LEVELS de game/js/data.js (mantener en sincronía).
const RANKS = [[0, 'Novato'], [12, 'Superviviente'], [30, 'Cazador'], [55, 'Veterano'], [85, 'Guardián'], [120, 'Leyenda del muro']];
const OPEN_LEVELS = 10;
const CLASSICS = [['ajedrez', 'Ajedrez', '#1d2a5b'], ['poker', 'Póker', '#22a35a'], ['batalla', 'Batalla Naval', '#2f6fe4'], ['ludo', 'Ludo', '#e5383b']];
const GAME_NAME = Object.fromEntries(CLASSICS.map(c => [c[0], c[1]]));
const LEVEL_NAME = ['fácil', 'medio', 'difícil'];
const A = window.GGAccount;

function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- pestañas
let current = 'juegos';
function goTo(tab, push) {
  if (!TABS.includes(tab)) tab = 'juegos';
  current = tab;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.tab !== tab; });
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.goto === tab));
  if (tab === 'perfil') renderProfile();
  if (tab === 'trend') renderTop();
  if (tab !== 'trend') $('#trailerVid').pause();
  window.scrollTo(0, 0);
  if (push !== false && location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]'); if (g) { e.preventDefault(); goTo(g.dataset.goto); return; }
  const p = e.target.closest('[data-play]'); if (p) openGame();
  const c = e.target.closest('[data-classic]'); if (c) CG.open(c.dataset.classic);
});
$('#topAcct').addEventListener('click', () => goTo('perfil'));

// ---------------------------------------------------------------- identidad
function localName() { return String((readJSON(PROFILE_KEY) || {}).name || '').trim(); }
function displayName() { return (A && A.profile && A.profile.username) || localName() || 'Jugador'; }
function paintAvatar(el, big) {
  const av = A && A.profile && A.profile.avatar;
  el.classList.toggle('emoji', !!av);
  el.textContent = av || displayName()[0].toUpperCase();
  if (big) el.setAttribute('aria-label', A && A.profile ? 'Cambiar avatar' : 'Tu inicial');
}
function renderIdentity() {
  paintAvatar($('#topAvatar'));
  const n = displayName();
  $('#helloName').textContent = n === 'Jugador' ? '¡Hola!' : '¡Hola, ' + n + '!';
}

// ---------------------------------------------------------------- perfil
const fmtWL = r => '<span class="w">' + (r.w || 0) + ' G</span><span class="l">' + (r.l || 0) + ' P</span><span class="d">' + (r.d || 0) + ' E</span>';
const sum = (a, b) => ({ w: (a.w || 0) + (b.w || 0), l: (a.l || 0) + (b.l || 0), d: (a.d || 0) + (b.d || 0) });
async function classicRecords() {
  // con cuenta: totales del servidor; sin cuenta: lo guardado en este celular
  if (A && A.user) {
    const rows = await A.stats(), out = {};
    rows.forEach(r => { (out[r.game] || (out[r.game] = {}))[r.mode] = { w: r.w, l: r.l, d: r.d }; });
    return out;
  }
  return readJSON('gg_records') || {};
}
let profSeq = 0;
async function renderProfile() {
  const seq = ++profSeq, logged = !!(A && A.user && A.profile);
  $('#guestCard').hidden = logged; $('#meCard').hidden = !logged;
  $('#acctOff').hidden = !!(A && A.enabled);
  $('#openSignup').hidden = $('#openLogin').hidden = !(A && A.enabled);
  $('#logoutBtn').hidden = $('#deleteBtn').hidden = !logged;
  $('#footNote').textContent = logged ? 'Tu historial se guarda en tu cuenta Giorgio.' : 'Sin cuenta, tu progreso se guarda solo en este dispositivo.';
  const ni = $('#nameInput'); ni.value = displayName() === 'Jugador' && !localName() ? '' : displayName(); ni.disabled = logged; ni.placeholder = 'Jugador';
  if (logged) {
    const p = A.profile, L = A.level(p.xp);
    $('#meName').textContent = p.username;
    $('#meSince').textContent = 'Jugador desde ' + new Date(p.created_at).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    paintAvatar($('#bigAvatar'), true);
    $('#meLevel').textContent = 'Nivel ' + L.lv;
    $('#meXp').textContent = p.xp + ' / ' + L.to + ' XP';
    $('#xpBar').style.width = Math.round((p.xp - L.from) / (L.to - L.from) * 100) + '%';
  }
  const rec = await classicRecords();
  if (seq !== profSeq) return;
  let tot = { w: 0, l: 0, d: 0 };
  $('#recs').innerHTML = CLASSICS.map(([id, name, col]) => {
    const g = rec[id] || {}, all = sum(g.bot || {}, g.online || {});
    tot = sum(tot, all);
    const n = all.w + all.l + all.d;
    return '<div class="rec"><b><i style="background:' + col + '"></i>' + name + '</b>' + (n ? '<div class="wl">' + fmtWL(all) + '</div><small>' + ((g.online && (g.online.w + g.online.l + g.online.d)) || 0) + ' online · ' + ((g.bot && (g.bot.w + g.bot.l + g.bot.d)) || 0) + ' vs bot</small>' : '<small>Sin partidas aún</small>') + '</div>';
  }).join('');
  const played = tot.w + tot.l + tot.d;
  $('#kpis').innerHTML = [[played, 'Partidas'], [tot.w, 'Victorias'], [(played ? Math.round(tot.w / played * 100) : 0) + '%', 'Ganadas']].map(([v, l]) => '<div class="kpi"><b>' + v + '</b><span>' + l + '</span></div>').join('');
  renderChatarra();
  if (logged) {
    const h = await A.history(8);
    if (seq !== profSeq) return;
    $('#histWrap').hidden = !h.length;
    $('#hist').innerHTML = h.map(m => '<li><span class="res ' + m.result + '">' + ({ win: 'G', loss: 'P', draw: 'E' }[m.result]) + '</span><span class="what"><b>' + esc(GAME_NAME[m.game] || m.game) + '</b><span>' + (m.mode === 'online' ? 'Online' : 'Bot ' + (LEVEL_NAME[m.level] || '')) + (m.xp ? ' · +' + m.xp + ' XP' : '') + '</span></span><time>' + ago(m.created_at) + '</time></li>').join('');
  } else $('#histWrap').hidden = true;
  $('#soundToggle').checked = readJSON('gg_sound') !== false;
}
function ago(t) {
  const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
  if (s < 60) return 'ahora'; if (s < 3600) return Math.floor(s / 60) + ' min';
  if (s < 86400) return Math.floor(s / 3600) + ' h'; if (s < 7 * 86400) return Math.floor(s / 86400) + ' d';
  return new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
function renderChatarra() {
  const s = readJSON(SAVE_KEY);
  const ups = s && s.up ? Object.values(s.up).reduce((a, b) => a + b, 0) : 0;
  const stars = s && s.stars ? Object.values(s.stars).reduce((a, b) => a + b, 0) : 0;
  const pw = ups * 3 + stars;
  let idx = 0; RANKS.forEach((r, i) => { if (pw >= r[0]) idx = i; });
  const next = RANKS[idx + 1];
  $('#rankName').textContent = RANKS[idx][1];
  $('#powerTxt').textContent = 'Poder ' + pw;
  $('#powerBar').style.width = (next ? (pw - RANKS[idx][0]) / (next[0] - RANKS[idx][0]) * 100 : 100) + '%';
  $('#nextRank').textContent = next ? `Faltan ${next[0] - pw} de poder para ${next[1]}` : 'Rango máximo alcanzado';
  const played = s && s.stats && (s.stats.kills > 0 || s.maxLevel > 1);
  $('#stats').hidden = !played;
  if (played) {
    const st = s.stats, done = Math.min(OPEN_LEVELS, Object.keys(s.stars || {}).length);
    $('#stats').innerHTML = [[done + '/' + OPEN_LEVELS, 'Niveles'], [stars + '/' + OPEN_LEVELS * 3, 'Estrellas'], [st.bossKills, 'Jefes vencidos'], [st.bestWave, 'Récord infinito']]
      .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }
  if (!s || (!s.stats.kills && s.maxLevel <= 1)) $('#heroProg').textContent = 'Nuevo';
  else $('#heroProg').textContent = `Nivel ${Math.min(s.maxLevel, OPEN_LEVELS)} · ${stars}★`;
}
$('#nameInput').addEventListener('input', e => {
  writeJSON(PROFILE_KEY, Object.assign(readJSON(PROFILE_KEY) || {}, { name: e.target.value.slice(0, 16) }));
  renderIdentity();
});
$('#soundToggle').addEventListener('change', e => {
  writeJSON('gg_sound', e.target.checked);
  const s = readJSON(SAVE_KEY);                    // también el sonido y la música de Chatarra Z
  if (s) { s.sound = s.music = e.target.checked; writeJSON(SAVE_KEY, s); }
});

// ---------------------------------------------------------------- top jugadores
async function renderTop() {
  if (!A || !A.enabled) return;
  const rows = await A.leaderboard(10);
  $('#topCard').hidden = !rows.length;
  $('#topList').innerHTML = rows.map(r => '<li><span class="avatar emoji">' + esc(r.avatar) + '</span><span class="nm">' + esc(r.username) + '</span><em>' + r.wins + ' G · Nv ' + A.level(r.xp).lv + '</em></li>').join('');
}

// ---------------------------------------------------------------- hoja de cuenta
const sheet = $('#sheet'), form = $('#authForm');
let mode = 'signup', busy = false;
const TITLES = { signup: 'Crear cuenta', login: 'Entrar', reset: 'Recuperar contraseña', newpw: 'Nueva contraseña' };
const SUBMIT = { signup: 'Crear cuenta', login: 'Entrar', reset: 'Enviar enlace', newpw: 'Guardar contraseña' };
function openSheet(m) {
  sheet.hidden = false; setMode(m); document.documentElement.style.overflow = 'hidden';
  setTimeout(() => { const f = form.querySelector('.fld:not([hidden]) input'); if (f && matchMedia('(pointer:fine)').matches) f.focus(); }, 60);
}
function closeSheet() { sheet.hidden = true; document.documentElement.style.overflow = ''; $('#fPass').value = ''; }
function setMode(m) {
  mode = m;
  $('#sheetTitle').textContent = TITLES[m];
  $('#sheetTabs').hidden = !(m === 'signup' || m === 'login');
  $('#sheetTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  form.hidden = m === 'avatar' || m === 'delete';
  form.querySelectorAll('[data-for]').forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(m); });
  $('#fPass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
  $('#pwLabel').textContent = m === 'newpw' ? 'Nueva contraseña' : 'Contraseña';
  $('#fSubmit').textContent = SUBMIT[m] || '';
  $('#fErr').hidden = $('#fOk').hidden = true;
  const extra = $('#sheetExtra'); if (extra) extra.remove();
  if (m === 'avatar') avatarPicker();
  if (m === 'delete') deletePanel();
  check();
}
function err(t) { const e = $('#fErr'); e.textContent = t; e.hidden = !t; $('#fOk').hidden = true; }
function ok(t) { const e = $('#fOk'); e.textContent = t; e.hidden = !t; $('#fErr').hidden = true; }
function check() {
  const u = $('#fUser').value.trim().toLowerCase(), pw = $('#fPass').value, em = $('#fEmail').value.trim();
  if (mode === 'signup') {
    const uh = $('#userHint');
    uh.className = !u ? '' : A.USER_RE.test(u) ? 'ok' : 'bad';
    uh.textContent = !u || A.USER_RE.test(u) ? '3 a 16: letras minúsculas, números o _' : 'Solo letras minúsculas, números o _ (3 a 16)';
  }
  if (mode === 'signup' || mode === 'newpw') {
    const st = A.strength(pw, u, em), bar = $('#pwBar'), h = $('#pwHint');
    bar.style.width = (pw ? 15 + st.score * 21 : 0) + '%';
    bar.style.background = !st.ok ? 'var(--red)' : st.score >= 3 ? 'var(--green)' : 'var(--orange)';
    h.className = !pw ? '' : st.ok ? 'ok' : 'bad';
    h.textContent = !pw ? 'Mínimo 10 caracteres, con letras y números.' : st.ok ? (st.score >= 3 ? 'Contraseña fuerte' : 'Aceptable: añade mayúsculas o símbolos para más seguridad') : 'Falta: ' + st.probs.join(', ');
  }
}
form.addEventListener('input', check);
$('#fUser').addEventListener('input', e => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); });
$('#eye').addEventListener('click', () => { const p = $('#fPass'), on = p.type === 'password'; p.type = on ? 'text' : 'password'; $('#eye').classList.toggle('on', on); $('#eye').setAttribute('aria-label', on ? 'Ocultar contraseña' : 'Mostrar contraseña'); });
$('#sheetTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
$('#forgot').addEventListener('click', () => setMode('reset'));
$('#sheetX').addEventListener('click', closeSheet);
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
$('#openSignup').addEventListener('click', () => openSheet('signup'));
$('#openLogin').addEventListener('click', () => openSheet('login'));
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  const username = $('#fUser').value.trim(), email = $('#fEmail').value.trim(), password = $('#fPass').value;
  if (mode !== 'newpw' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err('Escribe un correo válido.'); return; }
  if (mode === 'signup' && !$('#fTerms').checked) { err('Marca la casilla para continuar.'); return; }
  if ((mode === 'login') && !password) { err('Escribe tu contraseña.'); return; }
  busy = true; const btn = $('#fSubmit'), label = btn.textContent; btn.disabled = true; btn.textContent = 'Un momento…';
  try {
    if (mode === 'signup') {
      const r = await A.signUp({ username, email, password });
      if (r.needsConfirm) { ok('¡Listo! Te enviamos un correo a ' + email + '. Abre el enlace para activar tu cuenta y luego entra.'); setTimeout(() => { if (!sheet.hidden) { setMode('login'); ok('Cuando confirmes tu correo, entra aquí.'); } }, 200); }
      else closeSheet();
    } else if (mode === 'login') { await A.signIn({ email, password }); closeSheet(); goTo('perfil'); }
    else if (mode === 'reset') { await A.resetPassword(email); ok('Si ese correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.'); }
    else if (mode === 'newpw') { await A.updatePassword(password); ok('Contraseña actualizada.'); setTimeout(closeSheet, 1200); }
  } catch (x) { err(x.message || 'No se pudo completar.'); }
  finally { busy = false; btn.disabled = false; btn.textContent = label; $('#fPass').value = mode === 'newpw' || mode === 'login' ? '' : $('#fPass').value; check(); }
});
function avatarPicker() {
  const d = document.createElement('div'); d.id = 'sheetExtra';
  d.innerHTML = '<p class="muted small" style="text-align:center;margin:0 0 10px">Elige cómo te ven los demás.</p><div class="avpick">' + A.AVATARS.map(a => '<button type="button" class="' + (A.profile && A.profile.avatar === a ? 'on' : '') + '" data-a="' + a + '" aria-label="Avatar ' + a + '">' + a + '</button>').join('') + '</div>';
  form.after(d);
  d.querySelector('.avpick').onclick = async e => { const b = e.target.closest('button'); if (!b) return; try { await A.setAvatar(b.dataset.a); closeSheet(); } catch (x) { err(x.message); } };
}
function deletePanel() {
  const d = document.createElement('div'); d.id = 'sheetExtra';
  d.innerHTML = '<p style="margin:0 0 12px;line-height:1.45;text-align:center">Se borrarán tu cuenta, tu correo, tu nivel y todo tu historial. <b>No se puede deshacer.</b></p><button class="btn ghost wide" type="button" id="delNo">Cancelar</button><button class="btn wide" style="background:var(--red);color:#fff;box-shadow:0 5px 0 var(--red-d)" type="button" id="delYes">Sí, eliminar mi cuenta</button><p class="ferr" id="delErr" hidden></p>';
  form.after(d);
  $('#delNo').onclick = closeSheet;
  $('#delYes').onclick = async () => { try { await A.deleteAccount(); closeSheet(); goTo('perfil'); } catch (x) { const e = $('#delErr'); e.textContent = x.message; e.hidden = false; } };
}
$('#bigAvatar').addEventListener('click', () => { if (A && A.profile) { openSheet('avatar'); $('#sheetTitle').textContent = 'Tu avatar'; } });
$('#logoutBtn').addEventListener('click', async () => { await A.signOut(); goTo('perfil'); });
$('#deleteBtn').addEventListener('click', () => { openSheet('delete'); $('#sheetTitle').textContent = '¿Eliminar tu cuenta?'; });
if (A) A.on(st => {
  renderIdentity();
  if (current === 'perfil') renderProfile();
  if (st.recovery) openSheet('newpw');
});

// ---------------------------------------------------------------- juego a pantalla completa
const play = $('#play'), frame = $('#frame');
function openGame() {
  play.hidden = false;
  frame.src = 'game/index.html';
  $('#trailerVid').pause();
  history.pushState({ play: 1 }, '', location.hash || '#juegos');
  const fs = play.requestFullscreen || play.webkitRequestFullscreen;
  if (fs) Promise.resolve(fs.call(play)).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
  setTimeout(() => { try { frame.focus(); } catch (e) { /* nada */ } }, 300);
}
function closeGame(fromHistory) {
  if (play.hidden) return;
  play.hidden = true;
  frame.src = 'about:blank';
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* nada */ }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (!fromHistory && history.state && history.state.play) history.back();
  renderChatarra();
  goTo(location.hash.slice(1) || 'juegos', false);
}
$('#closePlay').addEventListener('click', () => closeGame(false));
addEventListener('popstate', () => closeGame(true));

// ---------------------------------------------------------------- compartir e instalar
$('#shareBtn').addEventListener('click', async () => {
  const url = location.href.split('#')[0].split('?')[0];
  const data = { title: 'Giorgio Games', text: 'Juega con Giorgio: ajedrez, póker, batalla naval y ludo gratis', url };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); $('#shareBtn').textContent = 'Enlace copiado'; }
  catch (e) { prompt('Copia este enlace:', url); }
});
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
$('#installBtn').addEventListener('click', async () => {
  const help = $('#installHelp');
  if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  help.hidden = false;
  help.textContent = matchMedia('(display-mode: standalone)').matches ? 'Ya la tienes instalada.'
    : ios ? 'En iPhone: toca Compartir (el cuadro con la flecha) y luego "Añadir a pantalla de inicio".'
    : 'Abre el menú del navegador (⋮) y elige "Instalar app" o "Añadir a pantalla de inicio".';
});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------------------------------------------------------------- arranque
window.CGhooks = { onclose: () => { if (current === 'perfil') renderProfile(); } };
renderIdentity(); renderChatarra();
goTo((location.hash.slice(1) || 'juegos').split('&')[0], false);
// Enlace de invitación: ?juego=ajedrez&sala=K7QM2
(() => {
  const q = new URLSearchParams(location.search), juego = q.get('juego'), sala = q.get('sala');
  if (!juego || !sala) return;
  goTo('clasicos', false);
  history.replaceState(null, '', location.pathname + '#clasicos');
  CG.join(juego, sala);
})();
