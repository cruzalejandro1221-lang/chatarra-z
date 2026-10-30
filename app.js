'use strict';
// Giorgio Games: pestañas, perfil leído del guardado de Chatarra Z y juego a pantalla completa.
const $ = s => document.querySelector(s);
const TABS = ['juegos', 'clasicos', 'trend', 'perfil'];
const SAVE_KEY = 'chatarraZ_v2';                 // mismo guardado que game/js/save.js
const PROFILE_KEY = 'gg_profile';
// Copia de RANKS y OPEN_LEVELS de game/js/data.js (mantener en sincronía).
const RANKS = [[0, 'Novato'], [12, 'Superviviente'], [30, 'Cazador'], [55, 'Veterano'], [85, 'Guardián'], [120, 'Leyenda del muro']];
const OPEN_LEVELS = 10;

function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

// ---------------------------------------------------------------- pestañas
function goTo(tab, push) {
  if (!TABS.includes(tab)) tab = 'juegos';
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.tab !== tab; });
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.goto === tab));
  if (tab === 'perfil') renderProfile();
  const hv = $('#heroVid'); if (hv) { tab === 'juegos' ? hv.play().catch(() => {}) : hv.pause(); }
  if (tab !== 'trend') $('#trailerVid').pause();
  window.scrollTo(0, 0);
  if (push !== false && location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]'); if (g) { goTo(g.dataset.goto); return; }
  const p = e.target.closest('[data-play]'); if (p) openGame();
});
$('#topAvatar').addEventListener('click', () => goTo('perfil'));

// ---------------------------------------------------------------- perfil
function profile() { return Object.assign({ name: 'Jugador' }, readJSON(PROFILE_KEY) || {}); }
function renderAvatar() {
  const n = profile().name.trim() || 'J';
  $('#topAvatar').textContent = $('#bigAvatar').textContent = n[0].toUpperCase();
}
function renderProfile() {
  const p = profile(), s = readJSON(SAVE_KEY);
  $('#nameInput').value = p.name;
  const ups = s && s.up ? Object.values(s.up).reduce((a, b) => a + b, 0) : 0;
  const stars = s && s.stars ? Object.values(s.stars).reduce((a, b) => a + b, 0) : 0;
  const pw = ups * 3 + stars;
  let idx = 0; RANKS.forEach((r, i) => { if (pw >= r[0]) idx = i; });
  const next = RANKS[idx + 1];
  $('#rankName').textContent = RANKS[idx][1];
  $('#powerTxt').textContent = 'Poder ' + pw;
  $('#powerBar').style.width = (next ? (pw - RANKS[idx][0]) / (next[0] - RANKS[idx][0]) * 100 : 100) + '%';
  $('#nextRank').textContent = next ? `Faltan ${next[0] - pw} de poder para ${next[1]}` : 'Rango máximo alcanzado';
  const played = s && (s.stats.kills > 0 || s.maxLevel > 1);
  $('#emptyStats').hidden = !!played;
  $('#stats').hidden = !played;
  if (played) {
    const st = s.stats, done = Math.min(OPEN_LEVELS, Object.keys(s.stars || {}).length);
    const items = [
      [done + '/' + OPEN_LEVELS, 'Niveles superados'], [stars + '/' + OPEN_LEVELS * 3, 'Estrellas'],
      [st.kills.toLocaleString('es'), 'Zombis eliminados'], [(st.thrown ? Math.round(st.headshots / st.thrown * 100) : 0) + '%', 'Tiros a la cabeza'],
      [st.bossKills, 'Jefes derrotados'], [st.bestWave, 'Récord infinito'],
    ];
    $('#stats').innerHTML = items.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }
  $('#soundToggle').checked = s ? s.sound !== false : true;
  $('#musicToggle').checked = s ? s.music !== false : true;
}
function renderHero() {
  const s = readJSON(SAVE_KEY);
  if (!s || (!s.stats.kills && s.maxLevel <= 1)) { $('#heroProg').textContent = 'Nuevo'; return; }
  const stars = Object.values(s.stars || {}).reduce((a, b) => a + b, 0);
  $('#heroProg').textContent = `Nivel ${Math.min(s.maxLevel, OPEN_LEVELS)} · ${stars}★`;
}
$('#nameInput').addEventListener('input', e => { writeJSON(PROFILE_KEY, Object.assign(profile(), { name: e.target.value.slice(0, 18) })); renderAvatar(); });
$('#bigAvatar').addEventListener('click', () => $('#nameInput').focus());
function setSaveFlag(key, val) {
  const s = readJSON(SAVE_KEY);
  if (s) { s[key] = val; writeJSON(SAVE_KEY, s); }
  else writeJSON('gg_pending_' + key, val);
}
$('#soundToggle').addEventListener('change', e => setSaveFlag('sound', e.target.checked));
$('#musicToggle').addEventListener('change', e => setSaveFlag('music', e.target.checked));

// ---------------------------------------------------------------- juego a pantalla completa
const play = $('#play'), frame = $('#frame');
function openGame() {
  play.hidden = false;
  frame.src = 'game/index.html';
  $('#heroVid').pause(); $('#trailerVid').pause();
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
  renderHero(); renderProfile();
  goTo(location.hash.slice(1) || 'juegos', false);
}
$('#closePlay').addEventListener('click', () => closeGame(false));
addEventListener('popstate', () => closeGame(true));

// ---------------------------------------------------------------- compartir e instalar
$('#shareBtn').addEventListener('click', async () => {
  const url = location.href.split('#')[0];
  const data = { title: 'Giorgio Games', text: 'Juega Chatarra Z gratis en el navegador', url };
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
renderAvatar(); renderHero();
goTo(location.hash.slice(1) || 'juegos', false);
