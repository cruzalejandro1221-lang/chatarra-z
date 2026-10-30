'use strict';
// Giorgio Games: pestañas, bienvenida (cuenta o invitado), perfil de juego con amigos y juegos a pantalla completa.
const $ = s => document.querySelector(s);
const TABS = ['juegos', 'clasicos', 'trend', 'perfil'];
const SAVE_KEY = 'chatarraZ_v2';                 // mismo guardado que game/js/save.js
// Copia de RANKS y OPEN_LEVELS de game/js/data.js (mantener en sincronía).
const RANKS = [[0, 'Novato'], [12, 'Superviviente'], [30, 'Cazador'], [55, 'Veterano'], [85, 'Guardián'], [120, 'Leyenda del muro']];
const OPEN_LEVELS = 10;
const GAMES = [['ajedrez', 'Ajedrez', '#1d2a5b'], ['poker', 'Póker', '#22a35a'], ['batalla', 'Batalla Naval', '#2f6fe4'], ['ludo', 'Ludo', '#e5383b']];
const GAME_NAME = Object.assign(Object.fromEntries(GAMES.map(c => [c[0], c[1]])), { chatarra: 'Chatarra Z' });
const LEVEL_NAME = ['fácil', 'medio', 'difícil'];
const A = window.GGAccount;

function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const logged = () => !!(A && A.user && A.profile);
const hours = s => { s = s || 0; if (s < 60) return '0 min'; if (s < 3600) return Math.round(s / 60) + ' min'; const h = s / 3600; return (h < 10 ? h.toFixed(1).replace('.', ',') : Math.round(h)) + ' h'; };

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
  const au = e.target.closest('[data-auth]'); if (au) { openSheet(au.dataset.auth); return; }
  const pf = e.target.closest('[data-profile]'); if (pf) { showProfile(pf.dataset.profile); return; }
  const p = e.target.closest('[data-play]'); if (p) openGame();
  const c = e.target.closest('[data-classic]'); if (c) CG.open(c.dataset.classic);
});
$('#topAcct').addEventListener('click', () => goTo('perfil'));

// ---------------------------------------------------------------- identidad
function displayName() { return logged() ? A.profile.username : 'Invitado'; }
function paintAvatar(el) {
  const av = logged() && A.profile.avatar;
  el.classList.toggle('emoji', !!av);
  el.textContent = av || '?';
}
function renderIdentity() {
  paintAvatar($('#topAvatar'));
  $('#helloName').textContent = logged() ? '¡Hola, ' + A.profile.username + '!' : '¡Hola!';
  // nombre que ven los rivales en partidas online
  writeJSON('gg_profile', { name: logged() ? A.profile.username : 'Invitado' });
}

// ---------------------------------------------------------------- perfil
let profSeq = 0;
async function renderProfile() {
  const seq = ++profSeq, me = logged();
  $('#guestCard').hidden = me; $('#meWrap').hidden = !me;
  $('#acctOff').hidden = !!(A && A.enabled);
  $('#guestCard [data-auth]').hidden = !(A && A.enabled);
  ['#logoutBtn', '#deleteBtn', '#renameBtn'].forEach(s => { $(s).hidden = !me; });
  $('#footNote').textContent = me ? 'Tu historial se guarda en tu cuenta Giorgio.' : 'Como invitado puedes jugar todo, incluso con amigos por enlace, pero no se guardan tus resultados.';
  $('#soundToggle').checked = readJSON('gg_sound') !== false;
  renderChatarra();
  if (!me) return;
  const p = A.profile, L = A.level(p.xp);
  $('#meName').textContent = p.username;
  $('#meSince').textContent = 'Jugador desde ' + new Date(p.created_at).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  paintAvatar($('#bigAvatar'));
  $('#meLevel').textContent = 'Nivel ' + L.lv;
  $('#meXp').textContent = p.xp + ' / ' + L.to + ' XP';
  $('#xpBar').style.width = Math.round((p.xp - L.from) / (L.to - L.from) * 100) + '%';
  const [st, pt, fr, h] = await Promise.all([A.stats(), A.playtime(), A.friends(), A.history(8)].map(x => Promise.resolve(x).catch(() => [])));
  if (seq !== profSeq) return;
  const by = {}; st.forEach(r => { const g = by[r.game] || (by[r.game] = { w: 0, l: 0, d: 0 }); g.w += r.w; g.l += r.l; g.d += r.d; });
  const secs = {}; pt.forEach(r => { secs[r.game] = r.seconds; });
  const tot = Object.values(by).reduce((a, g) => ({ w: a.w + g.w, n: a.n + g.w + g.l + g.d }), { w: 0, n: 0 });
  const totSecs = Object.values(secs).reduce((a, b) => a + b, 0);
  const friends = fr.filter(f => f.status === 'amigo');
  $('#kpis').innerHTML = [[tot.n, 'Partidas'], [tot.w, 'Victorias'], [friends.length, 'Amigos'], [hours(totSecs), 'Jugado']].map(([v, l]) => '<div class="kpi"><b>' + v + '</b><span>' + l + '</span></div>').join('');
  $('#recs').innerHTML = GAMES.map(([id, name, col]) => gameCard(id, name, col, by[id], secs[id])).join('');
  renderFriends(fr);
  $('#histWrap').hidden = !h.length;
  $('#hist').innerHTML = h.map(m => '<li><span class="res ' + m.result + '">' + ({ win: 'G', loss: 'P', draw: 'E' }[m.result]) + '</span><span class="what"><b>' + esc(GAME_NAME[m.game] || m.game) + '</b><span>' + (m.mode === 'online' ? 'Online' : 'Bot ' + (LEVEL_NAME[m.level] || '')) + (m.xp ? ' · +' + m.xp + ' XP' : '') + '</span></span><time>' + ago(m.created_at) + '</time></li>').join('');
}
function gameCard(id, name, col, g, s) {
  g = g || { w: 0, l: 0, d: 0 };
  const n = g.w + g.l + g.d;
  return '<div class="rec"><b><i style="background:' + col + '"></i>' + name + '</b>' +
    (n ? '<div class="wl"><span class="w">' + g.w + ' G</span><span class="l">' + g.l + ' P</span><span class="d">' + g.d + ' E</span></div><small>' + Math.round(g.w / n * 100) + '% ganadas · ' + hours(s) + '</small>' : '<small>Sin partidas · ' + hours(s) + '</small>') + '</div>';
}
function renderFriends(list) {
  const fr = list.filter(f => f.status === 'amigo'), inc = list.filter(f => f.status === 'recibida'), out = list.filter(f => f.status === 'enviada');
  $('#friendCount').textContent = fr.length ? fr.length : '';
  const row = (f, actions, sub) => '<li><button class="fr" data-profile="' + esc(f.username) + '"><span class="avatar emoji">' + esc(f.avatar) + (f.online ? '<i class="dot"></i>' : '') + '</span><span class="what"><b>' + esc(f.username) + '</b><span>' + sub + '</span></span></button>' + actions + '</li>';
  let h = inc.map(f => row(f, '<span class="fr-act"><button class="mini-btn ok" data-acc="' + esc(f.username) + '" aria-label="Aceptar">✓</button><button class="mini-btn no" data-rej="' + esc(f.username) + '" aria-label="Rechazar">✕</button></span>', 'Quiere ser tu amigo')).join('');
  h += fr.map(f => row(f, '', f.online ? (f.playing ? '<em class="live">Jugando ' + esc(GAME_NAME[f.playing] || f.playing) + '</em>' : '<em class="live">En línea</em>') : 'Nivel ' + A.level(f.xp).lv)).join('');
  h += out.map(f => row(f, '<span class="fr-act"><button class="mini-btn no" data-rej-out="' + esc(f.username) + '" aria-label="Cancelar solicitud">✕</button></span>', 'Solicitud enviada')).join('');
  $('#friends').innerHTML = h || '<li class="empty-f">Agrega a tus amigos por su usuario para ver cuándo están en línea.</li>';
}
$('#friends').addEventListener('click', async e => {
  const b = e.target.closest('[data-acc],[data-rej],[data-rej-out]'); if (!b) return;
  e.stopPropagation();
  try {
    if (b.dataset.acc) await A.friendRespond(b.dataset.acc, true);
    else if (b.dataset.rej) await A.friendRespond(b.dataset.rej, false);
    else await A.friendRemove(b.dataset.rejOut);
    renderProfile();
  } catch (x) { friendMsg(x.message, true); }
});
function friendMsg(t, bad) { const m = $('#friendMsg'); m.textContent = t; m.className = bad ? 'ferr' : 'fok'; m.hidden = !t; }
$('#addFriend').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#friendName').value.trim();
  if (!name) return;
  try {
    const r = await A.friendRequest(name);
    friendMsg({ enviada: 'Solicitud enviada a ' + name + '.', aceptada: '¡Ahora tú y ' + name + ' son amigos!', ya_amigos: 'Ya son amigos.', pendiente: 'Ya le enviaste una solicitud.' }[r] || 'Listo.', false);
    $('#friendName').value = ''; renderProfile();
  } catch (x) { friendMsg(x.message, true); }
});
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
  $('#topList').innerHTML = rows.map(r => '<li' + (logged() ? ' data-profile="' + esc(r.username) + '" class="tap"' : '') + '><span class="avatar emoji">' + esc(r.avatar) + '</span><span class="nm">' + esc(r.username) + '</span><em>' + r.wins + ' G · Nv ' + A.level(r.xp).lv + '</em></li>').join('');
}

// ---------------------------------------------------------------- hoja (bienvenida, cuenta, perfiles)
const sheet = $('#sheet'), body = $('#sheetBody');
let mode = null, mail = '', busy = false, sheetLocked = false;
const G_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const F_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v1.9H8v3.2h2.6V20H14v-8.3h2.7l.4-3.2z"/></svg>';
function oauthButtons() {
  if (!A || !A.providers.length) return '';
  return A.providers.map(p => p === 'google' ? '<button type="button" class="btn social g" data-oauth="google">' + G_ICON + 'Continuar con Google</button>'
    : p === 'facebook' ? '<button type="button" class="btn social f" data-oauth="facebook">' + F_ICON + 'Continuar con Facebook</button>' : '').join('') + '<div class="or"><span>o con tu correo</span></div>';
}
const pwField = (label, auto) => '<label class="fld"><span>' + label + '</span><span class="pw"><input id="fPass" type="password" autocomplete="' + auto + '" maxlength="72"><button type="button" class="eye" id="eye" aria-label="Mostrar contraseña"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></span>' +
  (auto === 'new-password' ? '<span class="meter"><i id="pwBar"></i></span><small id="pwHint">Mínimo 10 caracteres, con letras y números.</small>' : '') + '</label>';
const emailField = () => '<label class="fld"><span>Correo</span><input id="fEmail" type="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="tu@correo.com" value="' + esc(mail) + '"></label>';
const msgs = '<p class="ferr" id="fErr" role="alert" hidden></p><p class="fok" id="fOk" role="status" hidden></p>';
const cat = (img, w) => '<img class="sheet-cat" src="media/giorgio/' + img + '.webp" alt="" width="' + (w || 94) + '">';

const VIEWS = {
  welcome: () => cat('feliz', 104) + '<h3 id="sheetTitle">¡Bienvenido a Giorgio Games!</h3><p class="lead">Crea tu cuenta para tener perfil, amigos y puntos. Es gratis y toma segundos.</p>' +
    oauthButtons() + '<button type="button" class="btn primary wide0" data-go="signup">Crear cuenta con correo</button><button type="button" class="btn ghost wide0" data-go="login">Ya tengo cuenta</button>' +
    '<button type="button" class="link center" data-go="guest">Jugar como invitado</button><p class="tiny">Como invitado juegas todo, también con amigos por enlace, pero no se guardan tu perfil ni tus puntos.</p><p class="tiny"><a href="privacidad.html" target="_blank">Privacidad</a> · <a href="terminos.html" target="_blank">Condiciones</a></p>',
  signup: () => cat('guino') + '<h3 id="sheetTitle">Crear cuenta</h3>' + oauthButtons() + '<form id="authForm" novalidate>' +
    '<label class="fld"><span>Nombre de usuario</span><input id="fUser" autocomplete="username" maxlength="16" spellcheck="false" autocapitalize="none" placeholder="giorgio_fan"><small id="userHint">3 a 16: letras minúsculas, números o _</small></label>' +
    emailField() + pwField('Contraseña', 'new-password') +
    '<label class="chk"><input type="checkbox" id="fTerms"><span>Tengo 13 años o más y acepto las <a href="terminos.html" target="_blank">condiciones</a> y la <a href="privacidad.html" target="_blank">privacidad</a>.</span></label>' + msgs +
    '<button class="btn primary wide" id="fSubmit" type="submit">Crear cuenta</button></form><button type="button" class="link center" data-go="login">Ya tengo cuenta</button>',
  login: () => cat('guino') + '<h3 id="sheetTitle">Entrar</h3>' + oauthButtons() + '<form id="authForm" novalidate>' + emailField() + pwField('Contraseña', 'current-password') + msgs +
    '<button class="btn primary wide" id="fSubmit" type="submit">Entrar</button></form><button type="button" class="link center" data-go="reset">¿Olvidaste tu contraseña?</button><button type="button" class="link center" data-go="signup">Crear cuenta nueva</button>',
  code: () => cat('sorpresa') + '<h3 id="sheetTitle">Revisa tu correo</h3><p class="lead">Te enviamos un mensaje a <b>' + esc(mail) + '</b>. Toca el botón del correo o escribe aquí el código.</p><form id="authForm" novalidate>' +
    '<label class="fld"><span>Código</span><input id="fCode" class="code-in" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="••••••"></label>' + msgs +
    '<button class="btn primary wide" id="fSubmit" type="submit">Confirmar</button></form><button type="button" class="link center" id="resend">Reenviar correo</button><p class="tiny">¿No llega? Revisa spam o promociones.</p>',
  reset: () => cat('pensando') + '<h3 id="sheetTitle">Recuperar contraseña</h3><p class="lead">Te mandamos un correo para crear una nueva.</p><form id="authForm" novalidate>' + emailField() + msgs +
    '<button class="btn primary wide" id="fSubmit" type="submit">Enviar</button></form><button type="button" class="link center" data-go="login">Volver</button>',
  newpw: () => cat('guino') + '<h3 id="sheetTitle">Nueva contraseña</h3><form id="authForm" novalidate>' + pwField('Nueva contraseña', 'new-password') + msgs + '<button class="btn primary wide" id="fSubmit" type="submit">Guardar</button></form>',
  pickname: () => cat('feliz') + '<h3 id="sheetTitle">Elige tu usuario</h3><p class="lead">Así te verán tus amigos. Puedes cambiarlo luego.</p><form id="authForm" novalidate>' +
    '<label class="fld"><span>Nombre de usuario</span><input id="fUser" maxlength="16" spellcheck="false" autocapitalize="none" value="' + esc(logged() ? A.profile.username : '') + '"><small id="userHint">3 a 16: letras minúsculas, números o _</small></label>' + msgs +
    '<button class="btn primary wide" id="fSubmit" type="submit">Listo</button></form>',
  avatar: () => '<h3 id="sheetTitle" style="margin-top:18px">Tu avatar</h3><div class="avpick">' + A.AVATARS.map(a => '<button type="button" class="' + (A.profile.avatar === a ? 'on' : '') + '" data-a="' + a + '" aria-label="Avatar ' + a + '">' + a + '</button>').join('') + '</div>' + msgs,
  delete: () => cat('triste') + '<h3 id="sheetTitle">¿Eliminar tu cuenta?</h3><p class="lead">Se borrarán tu cuenta, tu correo, tu nivel, tus amigos y tu historial. <b>No se puede deshacer.</b></p>' + msgs +
    '<button class="btn ghost wide" type="button" data-go="close">Cancelar</button><button class="btn wide danger" type="button" id="delYes">Sí, eliminar mi cuenta</button>',
  friend: () => '<div class="pf-load"><div class="cg-spin"></div></div>',
};
function openSheet(m, opts) {
  if (!A || !A.enabled) { if (m === 'welcome') return; }
  sheetLocked = !!(opts && opts.locked);
  sheet.hidden = false; document.documentElement.style.overflow = 'hidden';
  $('#sheetX').hidden = sheetLocked;
  setMode(m);
}
function closeSheet() { if (sheetLocked) return; sheet.hidden = true; document.documentElement.style.overflow = ''; mode = null; }
function setMode(m) {
  mode = m;
  body.innerHTML = VIEWS[m]();
  body.parentElement.scrollTop = 0;
  const f = $('#authForm'); if (f) { f.addEventListener('input', check); f.addEventListener('submit', submit); }
  const u = $('#fUser'); if (u) u.addEventListener('input', () => { u.value = u.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); });
  const eye = $('#eye'); if (eye) eye.onclick = () => { const p = $('#fPass'), on = p.type === 'password'; p.type = on ? 'text' : 'password'; eye.classList.toggle('on', on); };
  const rs = $('#resend'); if (rs) rs.onclick = resendMail;
  const del = $('#delYes'); if (del) del.onclick = async () => { try { await A.deleteAccount(); sheetLocked = false; closeSheet(); goTo('perfil'); } catch (x) { err(x.message); } };
  if (m === 'avatar') body.querySelector('.avpick').onclick = async e => { const b = e.target.closest('button'); if (!b) return; try { await A.setAvatar(b.dataset.a); closeSheet(); } catch (x) { err(x.message); } };
  check();
  const first = body.querySelector('input:not([type=checkbox])');
  if (first && matchMedia('(pointer:fine)').matches) setTimeout(() => first.focus(), 60);
}
body.addEventListener('click', async e => {
  const go = e.target.closest('[data-go]');
  if (go) {
    const g = go.dataset.go;
    if (g === 'guest') { try { sessionStorage.setItem('gg_guest', '1'); } catch (x) { /* nada */ } sheetLocked = false; closeSheet(); return; }
    if (g === 'close') { closeSheet(); return; }
    const em = $('#fEmail'); if (em) mail = em.value.trim();
    setMode(g); return;
  }
  const o = e.target.closest('[data-oauth]');
  if (o) { o.disabled = true; try { await A.signInWith(o.dataset.oauth); } catch (x) { o.disabled = false; err(x.message); } }
});
function err(t) { const e = $('#fErr'); if (!e) return; e.textContent = t; e.hidden = !t; const k = $('#fOk'); if (k) k.hidden = true; }
function ok(t) { const e = $('#fOk'); if (!e) return; e.textContent = t; e.hidden = !t; const k = $('#fErr'); if (k) k.hidden = true; }
function check() {
  const uIn = $('#fUser'), pIn = $('#fPass'), eIn = $('#fEmail');
  if (uIn && $('#userHint')) {
    const u = uIn.value, okU = A.USER_RE.test(u), uh = $('#userHint');
    uh.className = !u ? '' : okU ? '' : 'bad';
    uh.textContent = !u || okU ? '3 a 16: letras minúsculas, números o _' : 'Solo letras minúsculas, números o _ (3 a 16)';
    if (okU) checkName(u);
  }
  if (pIn && $('#pwBar')) {
    const pw = pIn.value, st = A.strength(pw, uIn && uIn.value, eIn && eIn.value), bar = $('#pwBar'), h = $('#pwHint');
    bar.style.width = (pw ? 15 + st.score * 21 : 0) + '%';
    bar.style.background = !st.ok ? 'var(--red)' : st.score >= 3 ? 'var(--green)' : 'var(--orange)';
    h.className = !pw ? '' : st.ok ? 'ok' : 'bad';
    h.textContent = !pw ? 'Mínimo 10 caracteres, con letras y números.' : st.ok ? (st.score >= 3 ? 'Contraseña fuerte' : 'Aceptable: añade mayúsculas o símbolos para más seguridad') : 'Falta: ' + st.probs.join(', ');
  }
  const c = $('#fCode'); if (c) c.value = c.value.replace(/\D/g, '');
}
// ¿Nombre libre? Se consulta al servidor mientras escribes (ni igual, ni parecido a otro, ni reservado).
let nameT = 0, nameSeq = 0;
function checkName(u) {
  clearTimeout(nameT);
  const seq = ++nameSeq;
  nameT = setTimeout(async () => {
    const uh = $('#userHint'); if (!uh) return;
    if (mode === 'pickname' && logged() && A.profile.username === u) { uh.className = 'ok'; uh.textContent = 'Es tu nombre actual'; return; }
    try {
      const free = await A.usernameFree(u);
      if (seq !== nameSeq || !$('#userHint') || $('#fUser').value !== u) return;
      uh.className = free ? 'ok' : 'bad';
      uh.textContent = free ? '✓ Disponible' : 'Ya existe o se parece mucho a otro (o está reservado)';
    } catch (x) { /* sin red: se valida al enviar */ }
  }, 350);
}
async function submit(e) {
  e.preventDefault();
  if (busy) return;
  const v = id => { const x = $(id); return x ? x.value.trim() : ''; };
  const email = v('#fEmail') || mail, password = $('#fPass') ? $('#fPass').value : '';
  if ($('#fEmail') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err('Escribe un correo válido.'); return; }
  if (mode === 'signup' && !$('#fTerms').checked) { err('Marca la casilla para continuar.'); return; }
  if (mode === 'login' && !password) { err('Escribe tu contraseña.'); return; }
  busy = true; const btn = $('#fSubmit'), label = btn.textContent; btn.disabled = true; btn.textContent = 'Un momento…';
  try {
    if (mode === 'signup') {
      mail = email;
      const r = await A.signUp({ username: v('#fUser'), email, password });
      if (r.needsConfirm) { setMode('code'); return; }
      closeSheet();
    } else if (mode === 'login') { await A.signIn({ email, password }); sheetLocked = false; closeSheet(); }
    else if (mode === 'code') { await A.verifyCode(mail, v('#fCode'), 'signup'); sheetLocked = false; closeSheet(); goTo('perfil'); }
    else if (mode === 'reset') { await A.resetPassword(email); ok('Si ese correo tiene cuenta, te llegará un mensaje para crear una contraseña nueva.'); }
    else if (mode === 'newpw') { await A.updatePassword(password); ok('Contraseña actualizada.'); setTimeout(closeSheet, 1000); }
    else if (mode === 'pickname') { await A.setUsername(v('#fUser')); sheetLocked = false; closeSheet(); goTo('perfil'); }
  } catch (x) { err(x.message || 'No se pudo completar.'); }
  finally { busy = false; if (btn.isConnected) { btn.disabled = false; btn.textContent = label; } }
}
let lastResend = 0;
async function resendMail() {
  if (Date.now() - lastResend < 60000) { err('Espera un minuto antes de pedir otro correo.'); return; }
  lastResend = Date.now();
  try { await A.resend(mail); ok('Correo reenviado.'); } catch (x) { err(x.message); }
}
$('#sheetX').addEventListener('click', closeSheet);
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

// perfil de otro jugador (amigo o del top)
async function showProfile(username) {
  if (!logged()) { openSheet('welcome'); return; }
  openSheet('friend');
  try {
    const p = await A.getProfile(username);
    if (mode !== 'friend') return;
    if (!p) { body.innerHTML = '<p class="lead" style="margin-top:40px">Ese jugador ya no existe.</p>'; return; }
    const L = A.level(p.xp), games = Object.fromEntries((p.games || []).map(g => [g.game, g]));
    const tot = (p.games || []).reduce((a, g) => ({ w: a.w + g.w, n: a.n + g.w + g.l + g.d, s: a.s + g.seconds }), { w: 0, n: 0, s: p.chatarra_seconds || 0 });
    const status = p.online ? '<span class="online on"><i></i>' + (p.playing ? 'Jugando ' + esc(GAME_NAME[p.playing] || p.playing) : 'En línea') + '</span>' : (p.relation === 'amigo' || p.me ? '<span class="online"><i></i>Desconectado</span>' : '');
    const rel = p.me ? '' : p.relation === 'amigo' ? '<button class="btn ghost wide" data-unfriend="' + esc(p.username) + '">Quitar de amigos</button>'
      : p.relation === 'enviada' ? '<button class="btn ghost wide" disabled>Solicitud enviada</button>'
      : p.relation === 'recibida' ? '<button class="btn primary wide" data-befriend="' + esc(p.username) + '">Aceptar amistad</button>'
      : '<button class="btn blue wide" data-befriend="' + esc(p.username) + '">Agregar amigo</button>';
    body.innerHTML = '<div class="pf-head"><span class="avatar big emoji">' + esc(p.avatar) + '</span><h3 id="sheetTitle">' + esc(p.username) + '</h3>' + status + '<span class="tiny">Nivel ' + L.lv + ' · desde ' + new Date(p.since).toLocaleDateString('es', { month: 'short', year: 'numeric' }) + '</span></div>' +
      '<div class="kpis four">' + [[tot.n, 'Partidas'], [tot.w, 'Victorias'], [p.friends, 'Amigos'], [hours(tot.s), 'Jugado']].map(([v, l]) => '<div class="kpi"><b>' + v + '</b><span>' + l + '</span></div>').join('') + '</div>' +
      '<div class="recs" style="margin-top:12px">' + GAMES.map(([id, name, col]) => gameCard(id, name, col, games[id], games[id] && games[id].seconds)).join('') + '</div>' + msgs + rel;
  } catch (x) { body.innerHTML = '<p class="ferr" style="margin-top:40px">' + esc(x.message) + '</p>'; }
}
body.addEventListener('click', async e => {
  const b = e.target.closest('[data-befriend],[data-unfriend]'); if (!b) return;
  b.disabled = true;
  try {
    if (b.dataset.befriend) await A.friendRequest(b.dataset.befriend); else await A.friendRemove(b.dataset.unfriend);
    showProfile(b.dataset.befriend || b.dataset.unfriend);
    if (current === 'perfil') renderProfile();
  } catch (x) { b.disabled = false; err(x.message); }
});

$('#bigAvatar').addEventListener('click', () => { if (logged()) openSheet('avatar'); });
$('#renameBtn').addEventListener('click', () => openSheet('pickname'));
$('#logoutBtn').addEventListener('click', async () => { await A.signOut(); goTo('perfil'); });
$('#deleteBtn').addEventListener('click', () => openSheet('delete'));

// ---------------------------------------------------------------- presencia: "en línea" y horas por juego
function nowPlaying() { return !$('#play').hidden ? 'chatarra' : (window.CG && CG.playing && CG.playing()) || null; }
let lastBeat = { at: 0, game: undefined };
function beat(force) {
  if (!logged() || document.hidden) return;
  const g = nowPlaying();
  if (!force && g === lastBeat.game && Date.now() - lastBeat.at < 55000) return;
  lastBeat = { at: Date.now(), game: g };
  A.heartbeat(g);
}
setInterval(() => beat(false), 10000);
document.addEventListener('visibilitychange', () => beat(true));

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
  beat(true);
}
function closeGame(fromHistory) {
  if (play.hidden) return;
  play.hidden = true;
  frame.src = 'about:blank';
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* nada */ }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (!fromHistory && history.state && history.state.play) history.back();
  renderChatarra(); beat(true);
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
window.CGhooks = { onclose: () => { beat(true); if (current === 'perfil') renderProfile(); } };
const invite = (() => { const q = new URLSearchParams(location.search); return q.get('juego') && q.get('sala') ? { juego: q.get('juego'), sala: q.get('sala') } : null; })();
renderIdentity(); renderChatarra();
goTo((location.hash.slice(1) || 'juegos').split('&')[0], false);
if (invite) {                                   // enlace de invitación: directo a la partida, sin pedir cuenta
  goTo('clasicos', false);
  history.replaceState(null, '', location.pathname + '#clasicos');
  CG.join(invite.juego, invite.sala);
}
if (A) {
  A.on(st => {
    renderIdentity();
    if (current === 'perfil') renderProfile();
    if (st.recovery) { openSheet('newpw'); return; }
    if (logged()) {
      if (mode === 'welcome' || mode === 'login' || mode === 'signup' || mode === 'code') { sheetLocked = false; closeSheet(); }
      if (A.profile.username_set === false && mode !== 'pickname') openSheet('pickname', { locked: true });
      beat(true);
    }
  });
  A.ready.then(() => {
    let guest = false; try { guest = sessionStorage.getItem('gg_guest') === '1'; } catch (e) { /* nada */ }
    if (A.enabled && !logged() && !guest && !invite && sheet.hidden) openSheet('welcome');
  });
}
