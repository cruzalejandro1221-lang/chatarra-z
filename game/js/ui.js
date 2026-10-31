'use strict';
let SCREEN = 'menu';
const UI = (() => {
  const $ = id => document.getElementById(id);
  const iconCache = {};
  let mapWorld = 0, shopTab = 'up', toastT = 0, cardEls = {}, modalOpen = false, introQueue = [], tipStage = 0, matEls = {}, matXY = {};
  const bgCache = {};

  function cloneCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; }
  function iIcon(k) { if (!iconCache[k]) iconCache[k] = makeItemIcon(k); return cloneCanvas(iconCache[k]); }
  function zIcon(t, w, h) { const key = t + w + 'x' + h; if (!iconCache[key]) iconCache[key] = makeZombieIcon(t, w, h); return cloneCanvas(iconCache[key]); }
  function mIcon(m) { const key = 'm_' + m; if (!iconCache[key]) iconCache[key] = makeMatIcon(m); return cloneCanvas(iconCache[key]); }
  function matHtml(m, n) { return `<span class="mat" data-m="${m}"><i></i>${n}</span>`; }
  function hydrate(root) {
    root.querySelectorAll('[data-ico]').forEach(e => { e.innerHTML = ICONS[e.dataset.ico]; });
    root.querySelectorAll('.mat[data-m] i').forEach(e => { if (!e.firstChild) e.append(mIcon(e.parentNode.dataset.m)); });
  }
  function costHtml(cost) { return Object.entries(cost).map(([m, n]) => matHtml(m, n)).join(' '); }

  function show(id) {
    ['hud', 's-menu', 's-map', 's-shop', 's-stats'].forEach(s => $(s).classList.toggle('on', s === id));
    SCREEN = id === 'hud' ? 'game' : id.replace('s-', '');
    closeModal();
  }
  function modal(html, cls) {
    const m = $('modal'); m.innerHTML = `<div class="panel ${cls || ''}">${html}</div>`; m.classList.add('on'); modalOpen = true;
    hydrate(m);
    return m.firstChild;
  }
  function closeModal() { $('modal').classList.remove('on'); $('modal').innerHTML = ''; modalOpen = false; }
  function btn(label, cls, fn) { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.innerHTML = label; b.onclick = () => { SFX.click(); fn(); }; return b; }

  // ------------------------------------------------------------ menú
  function menu() {
    show('s-menu'); newGame('demo', 0);
    const r = rankOf(power());
    $('s-menu').innerHTML = `
      <div class="logo"><div class="l1">CHATARRA <em>Z</em></div><div class="hazard strip"></div>
      <div class="l2">Empiezas con piedras sobre una muralla. Cada nivel te da algo mejor: palos, honda, arco, flechas de fuego… si sabes administrarlo.</div></div>
      <div class="menu-btns" id="mb"></div>
      <div class="menu-foot">Tu progreso se guarda automáticamente en este navegador.</div>
      <div class="menu-rank"><b>${r.name}</b><span>Nivel ${Math.min(SAVE.maxLevel, OPEN_LEVELS)} · ${totalStars()} estrellas · ${SAVE.gears} engranajes</span></div>`;
    const mb = $('mb');
    mb.append(btn('▶&nbsp; JUGAR', '', () => map(0)));
    mb.append(btn(ico('gear') + '&nbsp;TALLER', 'dark', () => shop()));
    mb.append(btn(ico('star') + '&nbsp;PROGRESO', 'dark', () => stats()));
    mb.append(btn('⚙&nbsp; OPCIONES', 'dark small', () => options()));
    // Dentro de la app Giorgio Games: volver al portal sin botones tapando el juego
    if (window.parent !== window) mb.append(btn('‹&nbsp; GIORGIO GAMES', 'dark small', () => { try { window.parent.postMessage({ gg: 'exit' }, location.origin); } catch (e) { /* nada */ } }));
  }

  // ------------------------------------------------------------ mapa
  const NODE_POS = [[120, 420], [240, 320], [360, 410], [480, 300], [600, 395], [720, 290], [840, 385], [960, 280], [1070, 370], [1175, 225]];
  function mapBg(wi) {
    if (bgCache[wi]) return bgCache[wi];
    const c = document.createElement('canvas'); c.width = W; c.height = 560;
    const g = c.getContext('2d');
    g.drawImage(makeBG(wi), 0, 0, W, H, 0, -60, W, H);
    g.fillStyle = 'rgba(10,8,6,0.35)'; g.fillRect(0, 0, W, 560);
    const path = () => { g.beginPath(); NODE_POS.forEach(([x, y], i) => { if (!i) g.moveTo(x, y); else { const [px, py] = NODE_POS[i - 1]; g.quadraticCurveTo((px + x) / 2, py, x, y); } }); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 16; path(); g.stroke();
    g.strokeStyle = '#e9d8b0'; g.lineWidth = 4; g.setLineDash([12, 12]); path(); g.stroke(); g.setLineDash([]);
    bgCache[wi] = c; return c;
  }
  function map(wi) {
    if (wi !== undefined) mapWorld = clamp(wi, 0, 3);
    show('s-map'); G = null;
    const w = WORLDS[mapWorld], first = mapWorld * 10 + 1, open = first <= OPEN_LEVELS;
    const wStars = Array.from({ length: 10 }, (_, i) => SAVE.stars[first + i] || 0).reduce((a, b) => a + b, 0);
    $('s-map').innerHTML = `
      <div class="topbar"><h1>Mundo ${mapWorld + 1}: ${w.name}<small>${w.sub}</small></h1>
        <div class="pill st">${ico('star')} ${wStars}/30</div><div class="pill">${ico('gear')} ${SAVE.gears}</div></div>
      <div class="mapview" id="mv"></div>
      <button class="mapnav" id="mprev" style="left:14px">‹</button><button class="mapnav" id="mnext" style="right:14px">›</button>
      <div class="bottombar" id="mbb"></div>`;
    const mv = $('mv');
    mv.append(cloneCanvas(mapBg(mapWorld)));
    for (let i = 0; i < 10; i++) {
      const L = first + i, [x, y] = NODE_POS[i], locked = L > SAVE.maxLevel || L > OPEN_LEVELS, boss = L % 10 === 0, st = SAVE.stars[L] || 0;
      const n = document.createElement('div');
      n.className = 'node' + (locked ? ' locked' : '') + (boss ? ' boss' : '') + (L === SAVE.maxLevel && !locked ? ' cur' : '');
      n.style.left = x + 'px'; n.style.top = y + 'px';
      n.innerHTML = (locked ? ico('lock') : boss ? ico('skull') : L) + (locked ? '' : `<div class="ns">${[1, 2, 3].map(k => ico('star', k <= st ? 'on' : '')).join('')}</div>`);
      if (!locked) n.onclick = () => { SFX.click(); brief(L); };
      mv.append(n);
    }
    if (!open) mv.insertAdjacentHTML('beforeend', `<div class="wlock">${ico('lock')}Próximamente<small>${w.sub}</small></div>`);
    $('mprev').disabled = mapWorld === 0; $('mnext').disabled = mapWorld === 3;
    $('mprev').onclick = () => { SFX.click(); map(mapWorld - 1); };
    $('mnext').onclick = () => { SFX.click(); map(mapWorld + 1); };
    const bb = $('mbb');
    bb.append(btn('‹ Menú', 'dark small', menu));
    bb.append(btn(ico('gear') + ' Taller', 'small', () => shop()));
    bb.append(btn(ico('star') + ' Progreso', 'dark small', stats));
    const eb = btn('∞ Modo infinito', 'red small', () => brief(0));
    if (SAVE.maxLevel <= 10) { eb.disabled = true; eb.innerHTML = ico('lock') + ' Infinito (nivel 10)'; }
    bb.append(eb);
  }

  // ------------------------------------------------------------ equipo antes del nivel
  function brief(L) {
    const lvl = L ? buildLevel(L) : null, boss = lvl && lvl.boss;
    const slots = loadoutSlots();
    SAVE.loadout = SAVE.loadout.filter(weaponUnlocked);
    if (!SAVE.loadout.includes('piedra')) SAVE.loadout.unshift('piedra');
    const p = modal(`
      <span class="tag ${boss ? 'red' : ''}">${!L ? 'MODO INFINITO' : boss ? 'NIVEL DE JEFE' : 'NIVEL ' + L}</span>
      <h2 class="${boss ? 'red' : ''}">${!L ? 'Infinito' : boss ? ZOMBIES[boss].name : 'Nivel ' + L}</h2>
      <p>${!L ? 'Aguanta todas las oleadas que puedas. Récord: ' + SAVE.stats.bestWave : WORLDS[lvl.world].name + ' · ' + lvl.waves.length + ' oleadas'}</p>
      ${L ? '<div class="enemies" id="be"></div>' : ''}
      <div class="eqhead"><b>Armas</b><span>${SAVE.loadout.length}/${slots} casillas · las piedras van siempre</span></div>
      <div class="chips" id="wch"></div>
      <div class="eqhead"><b>Munición y defensas</b><span class="mats-inline">${MAT_ORDER.map(m => matHtml(m, SAVE.mats[m])).join(' ')}</span></div>
      <div class="crafts" id="cr"></div>
      <div class="btns" id="bb"></div>`, 'wide');
    if (L) { const be = p.querySelector('#be'); lvl.enemyTypes.forEach(t => { const c = zIcon(t, 56, 64); c.title = ZOMBIES[t].name; be.append(c); }); }
    const wch = p.querySelector('#wch');
    WEAPON_ORDER.forEach(k => {
      const w = WEAPONS[k], unlocked = weaponUnlocked(k), on = SAVE.loadout.includes(k);
      const el = document.createElement('button');
      el.className = 'chip' + (on ? ' on' : '') + (unlocked ? '' : ' locked') + (k === 'piedra' ? ' fixed' : '');
      el.innerHTML = `<b>${unlocked ? w.name : '???'}</b><span>${!unlocked ? 'Nivel ' + w.unlock : w.ammo ? carry(w.ammo) + ' ' + AMMO[w.ammo].name.toLowerCase() : 'Infinita'}</span>`;
      if (unlocked) el.prepend(iIcon(k)); else el.insertAdjacentHTML('afterbegin', `<div class="lk">${ICONS.lock}</div>`);
      el.title = unlocked ? w.desc : '';
      if (unlocked && k !== 'piedra') el.onclick = () => {
        if (on) SAVE.loadout = SAVE.loadout.filter(x => x !== k);
        else if (SAVE.loadout.length < slots) SAVE.loadout.push(k);
        else { SFX.deny(); toastModal(p, `No caben más armas. Quita una o compra la <b>Mochila</b> en el taller.`); return; }
        SFX.click(); writeSave(); brief(L);
      };
      wch.append(el);
    });
    const keys = AMMO_ORDER.filter(k => ammoUnlocked(k) && (k === 'tablas' || k === 'puas' || SAVE.loadout.some(w => WEAPONS[w].ammo === k)));
    const cr = p.querySelector('#cr');
    if (!keys.length && !ammoUnlocked('aliado')) cr.innerHTML = '<p class="muted">Por ahora solo tienes piedras. Pronto encontrarás más cosas.</p>';
    keys.forEach(k => cr.append(craftRow(k, () => brief(L))));
    if (ammoUnlocked('aliado')) cr.insertAdjacentHTML('beforeend', `<div class="craft"><div class="ci" id="ali"></div><div class="cn"><b>Aliados</b><span>Llevas ${ammoCap('aliado')} por nivel, gratis</span></div></div>`);
    const ali = p.querySelector('#ali'); if (ali) ali.append(iIcon('aliado'));
    hydrate(p);
    const bb = p.querySelector('#bb');
    bb.append(btn('Volver', 'dark small', closeModal));
    bb.append(btn('¡A defender!', '', () => L ? startLevel(L) : startEndless()));
  }
  function craftRow(k, after) {
    const a = AMMO[k], el = document.createElement('div'); el.className = 'craft';
    const have = SAVE.stash[k] || 0, cap = ammoCap(k);
    const iconKey = k === 'flecha' ? 'arco' : k === 'flechaFuego' ? 'fuego' : k;
    el.innerHTML = `<div class="ci"></div><div class="cn"><b>${a.name}</b><span>Reserva <em>${have}</em> · llevas <em>${Math.min(have, cap)}/${cap}</em></span></div>
      <button class="cb">Fabricar +${a.per}<small>${costHtml(a.cost)}</small></button>`;
    el.querySelector('.ci').append(iIcon(iconKey));
    const b = el.querySelector('.cb');
    b.disabled = !canCraft(k);
    b.onclick = () => { if (craft(k)) { SFX.upgrade(); writeSave(); after(); } };
    return el;
  }
  function toastModal(p, html) {
    let t = p.querySelector('.mtoast');
    if (!t) { t = document.createElement('div'); t.className = 'mtoast'; p.append(t); }
    t.innerHTML = html;
  }

  // ------------------------------------------------------------ partida
  function startLevel(L) {
    newGame('level', L);
    show('hud'); buildHud();
    $('h-level').textContent = `Nivel ${L} · ${WORLDS[G.world].name}`;
    tipStage = 0;
    introQueue = G.lvl.enemyTypes.filter(t => !SAVE.seen[t]);
    if (introQueue.length) nextIntro(); else levelTips();
    SFX.music(true); SFX.setIntensity(0);
  }
  function startEndless() {
    newGame('endless');
    show('hud'); buildHud();
    G.stateT = 8; tipStage = 99;
    SFX.music(true); SFX.setIntensity(0);
  }
  function nextIntro() {
    const t = introQueue.shift();
    if (!t) { G.paused = false; levelTips(); return; }
    G.paused = true;
    SAVE.seen[t] = 1; writeSave();
    const d = ZOMBIES[t];
    const p = modal(`<div class="zintro"><div id="zc"></div><div>
      <span class="tag ${d.boss ? 'red' : ''}">${d.boss ? 'JEFE' : 'NUEVO ENEMIGO'}</span>
      <h2 class="${d.boss ? 'red' : ''}" style="margin-top:10px">${d.name}</h2><p>${d.desc}</p>
      <div class="btns" style="justify-content:flex-start" id="zb"></div></div></div>`);
    p.querySelector('#zc').append(zIcon(t, 160, 180));
    p.querySelector('#zb').append(btn('¡Entendido!', 'small', () => { closeModal(); nextIntro(); }));
  }
  const LEVEL_TIPS = {
    2: 'Nueva: <b>Barricada</b>. Tócala abajo y luego toca una ranura del suelo. Frena a los zombis mientras apuntas.',
    3: 'Nuevos: <b>Palos</b>. Cambia de arma tocando su carta o con las teclas <b>1-3</b>. Pegan fuerte y empujan.',
    4: 'Nueva: <b>Honda</b>. Tiros más rápidos y rectos que llegan más lejos.',
    5: 'Nuevas: <b>Púas</b>. Ponlas donde se amontonan los zombis. Ojo: las piedras rebotan en los cascos.',
    6: 'Nuevo: <b>Arco</b>. Cada flecha cuenta: fabrica más en el taller con madera y chatarra.',
    7: 'Nuevo: <b>Aliado</b>. Ponlo sobre la muralla y lanzará piedras por su cuenta.',
    8: 'Nuevas: <b>Flechas de fuego</b>. Solo tienes unas pocas: úsalas contra grupos.',
    9: 'Nuevo: <b>Molotov</b>. Lánzalo delante de la horda y déjala cruzar el fuego.',
    10: 'El Mamut. Guarda tus flechas y molotov para él.',
  };
  function levelTips() {
    if (G.L === 1) { tipStage = 1; toast('<b>Arrastra hacia atrás</b> en cualquier parte del campo y <b>suelta</b> para lanzar una piedra. Cuanto más tiras, más fuerte.', 99); return; }
    if (LEVEL_TIPS[G.L]) toast(LEVEL_TIPS[G.L], 8);
  }
  function tutorialTick() {
    if (G.L !== 1 || G.mode !== 'level') return;
    if (tipStage === 1 && G.thrown > 0) { tipStage = 2; toast('Los puntos muestran el inicio del tiro. <b>A la cabeza hace el doble</b> de daño.', 8); }
    else if (tipStage === 2 && G.kills > 0) { tipStage = 3; toast('Los zombis sueltan <b>materiales</b>. Con ellos fabricarás munición en el taller.', 7); }
    else if (tipStage === 3 && G.waveIdx >= 2) { tipStage = 4; toast('Consejo: mejora la <b>Puntería</b> en el taller para ver más trayectoria.', 6); }
  }

  function buildHud() {
    const cards = $('cards'); cards.innerHTML = ''; cardEls = {};
    G.loadout.forEach((k, i) => {
      const w = WEAPONS[k];
      const c = document.createElement('div'); c.className = 'card'; c.dataset.k = k;
      c.innerHTML = `<span class="key">${i + 1}</span><div class="nm">${w.short || w.name}</div><div class="cost amt"></div><div class="cdv"></div>`;
      c.prepend(iIcon(k));
      c.onclick = e => { e.stopPropagation(); selectWeapon(k); };
      cards.append(c); cardEls[k] = c;
    });
    const structs = STRUCT_ORDER.filter(k => G.ammo[STRUCTS[k].ammo] !== undefined);
    if (structs.length) cards.insertAdjacentHTML('beforeend', '<div class="csep"></div>');
    structs.forEach(k => {
      const s = STRUCTS[k];
      const c = document.createElement('div'); c.className = 'card st'; c.dataset.k = k;
      c.innerHTML = `<div class="nm">${s.name}</div><div class="cost amt"></div>`;
      c.prepend(iIcon(k));
      c.onclick = e => { e.stopPropagation(); selectStruct(k); };
      cards.append(c); cardEls['s_' + k] = c;
    });
    $('h-mats').innerHTML = MAT_ORDER.map(m => `<span class="mat" data-m="${m}"><i></i><b>0</b></span>`).join('');
    hydrate($('hud'));
    matEls = {}; $('h-mats').querySelectorAll('.mat').forEach(e => { matEls[e.dataset.m] = e; });
    requestAnimationFrame(computeMatXY);
    $('b-pause').onclick = () => { SFX.click(); pause(); };
    $('b-speed').onclick = () => { SFX.click(); toggleSpeed(); };
    $('b-speed').textContent = 'x1';
    $('b-call').onclick = () => { SFX.click(); callWaveEarly(); };
    $('h-level').textContent = G.mode === 'endless' ? 'Modo infinito' : '';
    hudFlags(); refreshCards();
    $('toast').classList.remove('on'); toastT = 0;
  }
  function computeMatXY() {
    const sr = stage.getBoundingClientRect();
    for (const m in matEls) { const r = matEls[m].querySelector('i').getBoundingClientRect(); matXY[m] = [(r.left + r.width / 2 - sr.left) / SCALE, (r.top + r.height / 2 - sr.top) / SCALE]; }
  }
  function matPos(m) { return matXY[m] || [60, 90]; }
  function pulseMat(m) { const e = matEls[m]; if (!e) return; e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); }
  function selectWeapon(k) {
    if (!G || G.state === 'won' || G.state === 'lost') return;
    const w = WEAPONS[k];
    if (w.ammo && !(G.ammo[w.ammo] > 0)) { SFX.deny(); toast(`No te queda munición de <b>${w.name}</b>.`, 2); return; }
    G.player.weapon = k; G.sel = null; SFX.click(); refreshCards();
  }
  function selectStruct(k) {
    if (!G || G.state === 'won' || G.state === 'lost') return;
    if (G.sel === k) G.sel = null;
    else if (!(G.ammo[STRUCTS[k].ammo] > 0)) { SFX.deny(); toast(`Ya usaste todas tus <b>${STRUCTS[k].name.toLowerCase()}s</b> en este nivel.`, 2); return; }
    else { G.sel = k; SFX.click(); toast(`Toca una ranura ${STRUCTS[k].where === 'ground' ? 'del suelo' : 'del suelo o de la muralla'} para colocar: <b>${STRUCTS[k].name}</b>.`, 3); }
    refreshCards();
  }
  function selectWeaponByIndex(i) { if (G && G.loadout[i]) selectWeapon(G.loadout[i]); }
  function toggleSpeed() { if (!G) return; G.speed = G.speed === 1 ? 2 : 1; $('b-speed').textContent = 'x' + G.speed; }
  function refreshCards() {
    if (!G) return;
    for (const k of G.loadout) {
      const c = cardEls[k]; if (!c) continue;
      const w = WEAPONS[k], n = w.ammo ? G.ammo[w.ammo] || 0 : null;
      c.classList.toggle('sel', G.player.weapon === k && !G.sel);
      c.classList.toggle('poor', n === 0);
      c.querySelector('.amt').textContent = n === null ? '∞' : n;
      c.querySelector('.cdv').style.height = (G.player.weapon === k && G.player.cd > 0 ? G.player.cd / weaponStats(k).cd * 100 : 0) + '%';
    }
    for (const k of STRUCT_ORDER) {
      const c = cardEls['s_' + k]; if (!c) continue;
      const n = G.ammo[STRUCTS[k].ammo] || 0;
      c.classList.toggle('sel', G.sel === k);
      c.classList.toggle('poor', n === 0);
      c.querySelector('.amt').textContent = n;
    }
  }
  function hudFlags() {
    if (!G || G.mode === 'demo') return;
    const f = $('h-flags'); f.innerHTML = '';
    if (G.mode === 'endless') return;
    let acc = 0;
    G.lvl.waves.forEach((w, i) => {
      acc += w.groups.reduce((a, g) => a + g.n, 0) + (w.boss ? 1 : 0);
      const b = document.createElement('b');
      b.style.left = (acc / G.totalEv * 100) + '%';
      b.innerHTML = w.boss ? ICONS.bossflag : (i < G.wavesCleared || G.state === 'won') ? ICONS.flagdone : ICONS.flag;
      f.append(b);
    });
  }
  let lastMats = '';
  function hudTick(dt) {
    if (!G || SCREEN !== 'game') return;
    const wf = G.wallHp / G.wallMax, wb = $('h-wall');
    wb.style.width = (wf * 100) + '%'; wb.className = wf < 0.3 ? 'low' : wf < 0.6 ? 'mid' : '';
    $('h-wallt').textContent = Math.ceil(G.wallHp);
    const ms = MAT_ORDER.map(m => G.mats[m]).join(',');
    if (ms !== lastMats) { lastMats = ms; for (const m of MAT_ORDER) if (matEls[m]) matEls[m].querySelector('b').textContent = G.mats[m]; }
    $('h-wavefill').style.width = (G.totalEv ? Math.min(1, G.spawned / G.totalEv) * 100 : 0) + '%';
    if (G.mode === 'endless') $('h-level').textContent = `Modo infinito · oleada ${Math.max(1, G.waveIdx + 1)} · récord ${SAVE.stats.bestWave}`;
    const cb = $('b-call');
    if ((G.state === 'prep' || G.state === 'between') && !G.paused) {
      cb.classList.add('on');
      cb.innerHTML = `${G.state === 'prep' ? '¡Que vengan!' : 'Siguiente oleada'}<small>en ${Math.ceil(G.stateT)}s</small>`;
    } else cb.classList.remove('on');
    refreshCards();
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
    tutorialTick();
  }
  function banner(t, s, cls) {
    const b = $('banner'); b.className = cls || ''; b.innerHTML = `<div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}`;
    void b.offsetWidth; b.classList.add('show');
  }
  function toast(html, dur) { const t = $('toast'); t.innerHTML = html; t.classList.add('on'); toastT = dur || 4; }

  // ------------------------------------------------------------ pausa y resultados
  function pause() {
    if (!G || G.state === 'won' || G.state === 'lost' || modalOpen) return;
    G.paused = true; G.aim = null;
    const p = modal(`<h2>Pausa</h2><p>${G.mode === 'endless' ? 'Modo infinito' : 'Nivel ' + G.L + ' · ' + WORLDS[G.world].name}</p>
      <div class="toggle">Efectos de sonido <div class="sw ${SAVE.sound ? 'on' : ''}" id="ts"></div></div>
      <div class="toggle">Música <div class="sw ${SAVE.music ? 'on' : ''}" id="tm"></div></div>
      <p class="muted">Si sales o reinicias, no gastas la munición que usaste en este intento.</p>
      <div class="btns" id="pb"></div>`, 'pause');
    wireToggles(p);
    const pb = p.querySelector('#pb');
    pb.append(btn('Continuar', '', resume));
    pb.append(btn('Reiniciar', 'dark small', () => { G.mode === 'endless' ? startEndless() : startLevel(G.L); }));
    pb.append(btn('Salir', 'dark small', () => { SFX.music(false); map(0); }));
  }
  function resume() { closeModal(); if (G) G.paused = false; }
  function wireToggles(p) {
    const ts = p.querySelector('#ts'), tm = p.querySelector('#tm');
    if (ts) ts.onclick = () => { SAVE.sound = !SAVE.sound; ts.classList.toggle('on', SAVE.sound); SFX.apply(); writeSave(); SFX.click(); };
    if (tm) tm.onclick = () => { SAVE.music = !SAVE.music; tm.classList.toggle('on', SAVE.music); SFX.apply(); writeSave(); };
  }
  function matsLine(o) {
    const parts = MAT_ORDER.filter(m => o[m]).map(m => matHtml(m, '+' + o[m]));
    return parts.length ? parts.join(' ') : '<span class="muted">nada</span>';
  }
  function result(res) {
    SFX.music(false);
    const got = {}; MAT_ORDER.forEach(m => { got[m] = (res.mats[m] || 0) + (res.bonus[m] || 0); });
    const usedTxt = Object.entries(res.used).filter(([k]) => k !== 'aliado').map(([k, n]) => `${AMMO[k].name} ×${n}`).join(' · ');
    let html;
    if (res.mode === 'endless') {
      html = `<span class="tag red">MODO INFINITO</span><h2>${res.best ? '¡NUEVO RÉCORD!' : 'Fin de la partida'}</h2>
        <div class="kv"><div><b>${res.wave}</b><span>Oleadas</span></div><div><b>${res.kills}</b><span>Zombis</span></div><div><b>${SAVE.stats.bestWave}</b><span>Récord</span></div></div>`;
    } else if (res.win) {
      html = `<span class="tag">NIVEL ${res.L} COMPLETADO</span><h2>¡VICTORIA!</h2>
        <div class="stars">${[1, 2, 3].map(k => ico('star', k <= res.stars ? 'on' : '')).join('')}</div>
        <div class="kv"><div><b>${res.kills}</b><span>Zombis</span></div><div><b>${G.thrown ? Math.round(G.hits / G.thrown * 100) : 0}%</b><span>Puntería</span></div><div><b>${G.headshots}</b><span>A la cabeza</span></div></div>`;
    } else {
      html = `<span class="tag red">NIVEL ${res.L}</span><h2 class="red">DERROTA</h2>
        <p>Resististe ${res.wave} de ${G.lvl.waves.length} oleadas. Mejora tu fuerza o puntería en el taller e inténtalo de nuevo.</p>
        <div class="kv"><div><b>${res.kills}</b><span>Zombis</span></div><div><b>${res.wave}</b><span>Oleadas</span></div><div><b>${G.thrown ? Math.round(G.hits / G.thrown * 100) : 0}%</b><span>Puntería</span></div></div>`;
    }
    html += `<div class="loot"><div><span>Engranajes</span><b>+${res.gears} ${ico('gear')}</b></div><div><span>Materiales</span><b>${matsLine(got)}</b></div></div>`;
    if (usedTxt) html += `<p class="muted">Gastaste: ${usedTxt}.</p>`;
    const p = modal(html + '<div id="ul"></div><div class="btns" id="rb"></div>', 'wide');
    const ul = p.querySelector('#ul');
    (res.unlocks || []).forEach(u => {
      const d = document.createElement('div'); d.className = 'unlock';
      const def = u.type === 'w' ? WEAPONS[u.k] : STRUCTS[u.k];
      const ammoK = def.ammo, gift = ammoK && AMMO[ammoK].start ? ` Te regalamos ${AMMO[ammoK].start} para empezar.` : '';
      d.innerHTML = `<div><b>¡Nuevo: ${def.name}!</b><span>${def.desc}${gift}</span></div>`;
      d.prepend(iIcon(u.k)); ul.append(d);
    });
    if (res.endlessUnlocked) ul.insertAdjacentHTML('beforeend', `<div class="unlock"><div><b>¡Modo infinito desbloqueado!</b><span>Y el Mundo 2 llega pronto: la era de la pólvora.</span></div></div>`);
    const rb = p.querySelector('#rb');
    if (res.mode === 'endless') {
      rb.append(btn('Otra vez', '', () => brief(0))); rb.append(btn(ico('gear') + ' Taller', 'dark small', () => shop())); rb.append(btn('Mapa', 'dark small', () => map(0)));
    } else if (res.win) {
      rb.append(btn('Mapa', 'dark small', () => map(0)));
      rb.append(btn(ico('gear') + ' Taller', 'dark small', () => shop()));
      if (res.L < OPEN_LEVELS) rb.append(btn('Siguiente ›', '', () => { map(0); brief(res.L + 1); }));
    } else {
      rb.append(btn('Mapa', 'dark small', () => map(0)));
      rb.append(btn(ico('gear') + ' Taller', 'dark small', () => shop()));
      rb.append(btn('Reintentar', '', () => { map(0); brief(res.L); }));
    }
  }

  // ------------------------------------------------------------ taller
  function shop(tab) {
    if (tab) shopTab = tab;
    show('s-shop'); G = null;
    const r = rankOf(power()), p = power();
    const prog = r.next ? (p - r.min) / (r.next[0] - r.min) : 1;
    $('s-shop').innerHTML = `
      <div class="topbar"><h1>Taller<small>${shopTab === 'up' ? 'Mejoras permanentes: se pagan con engranajes' : 'Convierte materiales en munición y defensas'}</small></h1>
        <div class="pill mats-pill">${MAT_ORDER.map(m => matHtml(m, SAVE.mats[m])).join(' ')}</div><div class="pill">${ico('gear')} ${SAVE.gears}</div></div>
      <div class="tabs"><button class="tab ${shopTab === 'up' ? 'on' : ''}" data-t="up">Mejoras</button><button class="tab ${shopTab === 'craft' ? 'on' : ''}" data-t="craft">Fabricar</button></div>
      <div class="rankbox"><div class="r1"><b>${r.name}</b><span>Poder: ${p}${r.next ? ' / ' + r.next[0] + ' → ' + r.next[1] : ' (máximo)'}</span></div><div class="rb"><i style="width:${prog * 100}%"></i></div></div>
      <div class="grid ${shopTab === 'craft' ? 'one' : ''}" id="sgrid"></div>
      <div class="bottombar" id="sbb"></div>`;
    hydrate($('s-shop'));
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => { SFX.click(); shop(t.dataset.t); });
    const grid = $('sgrid');
    if (shopTab === 'up') UP_ORDER.forEach(k => grid.append(upCard(k)));
    else {
      const ks = AMMO_ORDER.filter(ammoUnlocked);
      if (!ks.length) grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;padding:40px">Aún no tienes nada que fabricar. En el nivel 2 conseguirás la barricada.</p>';
      ks.forEach(k => grid.append(craftRow(k, () => { const sc = grid.scrollTop; shop('craft'); $('sgrid').scrollTop = sc; })));
      hydrate(grid);
    }
    const bb = $('sbb');
    bb.append(btn('‹ Mapa', 'dark small', () => map(0)));
    bb.append(btn(ico('star') + ' Progreso', 'dark small', stats));
    const nl = Math.min(SAVE.maxLevel, OPEN_LEVELS);
    bb.append(btn('▶ Jugar nivel ' + nl, 'small', () => { map(0); brief(nl); }));
  }
  function pips(l, max) { return `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`; }
  function upCard(k) {
    const u = UPGRADES[k], l = up(k), cost = u.cost[l], locked = !upUnlocked(k), maxed = l >= u.max;
    const el = document.createElement('div'); el.className = 'ucard' + (locked ? ' locked' : '');
    el.innerHTML = `<div class="uc"><h3>${u.name}</h3>${pips(l, u.max)}
      <div class="ud">Ahora: ${l ? u.desc(l) : u.desc(0)}${!maxed ? `<br>Siguiente: ${u.desc(l + 1)}` : ''}</div>
      <button class="ub ${maxed ? 'max' : ''}">${maxed ? 'Al máximo' : 'Mejorar ' + ico('gear') + ' ' + cost}</button></div>
      ${locked ? `<div class="lk">${ico('lock')} Nivel ${u.unlock}</div>` : ''}`;
    const c = document.createElement('canvas'); c.width = 168; c.height = 140; drawUpIcon(c.getContext('2d'), k); el.prepend(c);
    const b = el.querySelector('.ub');
    b.disabled = !maxed && (locked || SAVE.gears < cost);
    b.onclick = () => {
      if (maxed || SAVE.gears < cost) return;
      SAVE.gears -= cost; SAVE.up[k] = l + 1;
      if (k === 'mochila') grantUnlocks();
      recordPower(); writeSave(); SFX.upgrade();
      const sc = $('sgrid').scrollTop; shop(); $('sgrid').scrollTop = sc;
      const card = $('sgrid').children[UP_ORDER.indexOf(k)]; if (card) card.classList.add('flash');
    };
    return el;
  }
  function drawUpIcon(g, k) {
    g.scale(2, 2); g.translate(42, 35); g.lineCap = 'round'; g.lineJoin = 'round';
    const Y = '#ffc229';
    if (k === 'fuerza') { g.fillStyle = '#dcae84'; g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.ellipse(-4, 0, 16, 10, -0.4, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(10, -12, 7, 9, 0.3, 0, 7); g.fill(); g.stroke(); drawThrowable(g, 'rock', 16, 10, 0, 1.4); }
    else if (k === 'punteria') { g.strokeStyle = Y; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.moveTo(0, -24); g.lineTo(0, -10); g.moveTo(0, 10); g.lineTo(0, 24); g.moveTo(-24, 0); g.lineTo(-10, 0); g.moveTo(10, 0); g.lineTo(24, 0); g.stroke(); g.fillStyle = '#ff5a3c'; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); }
    else if (k === 'recarga') { g.strokeStyle = Y; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 18, -2.6, 2.2); g.stroke(); g.fillStyle = Y; g.beginPath(); g.moveTo(-18, -14); g.lineTo(-8, -18); g.lineTo(-16, -6); g.fill(); g.strokeStyle = '#f4ead8'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -10); g.moveTo(0, 0); g.lineTo(8, 4); g.stroke(); }
    else if (k === 'muralla') { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { g.fillStyle = ['#6a6158', '#57504a', '#615a52'][(r + c) % 3]; g.fillRect(-24 + c * 16 + (r % 2) * 4, -20 + r * 13, 15, 12); } }
    else if (k === 'mochila') { roundRect(g, -16, -18, 32, 38, 8); g.fillStyle = '#5a4a32'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke(); roundRect(g, -11, 0, 22, 14, 4); g.fillStyle = '#6b5a3e'; g.fill(); g.stroke(); g.strokeStyle = Y; g.beginPath(); g.moveTo(-8, -18); g.quadraticCurveTo(0, -30, 8, -18); g.stroke(); }
    else if (k === 'carpinteria') { g.save(); g.scale(0.55, 0.55); g.translate(0, 34); TOWER_DRAW.tablas(g, { hp: 1, s: { maxHp: 1 } }); g.restore(); }
    else if (k === 'carcaj') { roundRect(g, -10, -14, 20, 34, 6); g.fillStyle = '#7a5230'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke(); for (let i = -1; i <= 1; i++) drawThrowable(g, i === 1 ? 'firearrow' : 'arrow', i * 5, -18, -Math.PI / 2, 0.8); }
    else if (k === 'alforja') { drawThrowable(g, 'molotov', -8, 4, -0.2, 2); drawThrowable(g, 'molotov', 10, 6, 0.3, 1.6); }
    else if (k === 'aliados') { g.save(); g.scale(0.55, 0.55); g.translate(0, 56); TOWER_DRAW.aliado(g, { anim: 0, throwA: 0, cd: 0, ang: 0 }, 0); g.restore(); }
  }

  // ------------------------------------------------------------ progreso
  function stats() {
    show('s-stats'); G = null;
    const s = SAVE.stats, r = rankOf(power());
    $('s-stats').innerHTML = `
      <div class="topbar"><h1>Progreso<small>Rango actual: ${r.name} · Poder ${power()}</small></h1><div class="pill">${ico('gear')} ${SAVE.gears}</div></div>
      <div class="statgrid">
        <div><b>${fmt(s.kills)}</b><span>Zombis eliminados</span></div>
        <div><b>${Math.min(OPEN_LEVELS, SAVE.maxLevel - 1 + (SAVE.stars[OPEN_LEVELS] && SAVE.maxLevel <= OPEN_LEVELS ? 1 : 0))}/${OPEN_LEVELS}</b><span>Niveles superados</span></div>
        <div><b>${totalStars()}/${OPEN_LEVELS * 3}</b><span>Estrellas</span></div>
        <div><b>${s.thrown ? Math.round(s.headshots / Math.max(1, s.thrown) * 100) : 0}%</b><span>Tiros a la cabeza</span></div>
        <div><b>${s.bossKills}</b><span>Jefes derrotados</span></div>
        <div><b>${s.bestWave}</b><span>Récord infinito</span></div>
      </div>
      <div class="chartbox"><h3>Crecimiento</h3><p>Tu poder sube con cada mejora y cada estrella. Las líneas marcan los rangos.</p><canvas id="pc" width="1500" height="640"></canvas></div>
      <div class="worldbox"><h3>Arsenal</h3><div id="wr"></div></div>
      <div class="bottombar" id="stb"></div>`;
    drawChart($('pc'));
    const wr = $('wr');
    WEAPON_ORDER.concat(STRUCT_ORDER).forEach(k => {
      const d = WEAPONS[k] || STRUCTS[k], on = WEAPONS[k] ? weaponUnlocked(k) : structUnlocked(k);
      wr.insertAdjacentHTML('beforeend', `<div class="arow ${on ? '' : 'off'}"><span>${on ? d.name : '???'}</span><em>${on ? (d.ammo ? (SAVE.stash[d.ammo] !== undefined && d.ammo !== 'aliado' ? (SAVE.stash[d.ammo] || 0) + ' en reserva' : 'por nivel') : 'infinita') : 'nivel ' + d.unlock}</em></div>`);
    });
    const bb = $('stb');
    bb.append(btn('‹ Menú', 'dark small', menu)); bb.append(btn('Mapa', 'dark small', () => map(0))); bb.append(btn(ico('gear') + ' Taller', 'small', () => shop()));
  }
  function drawChart(c) {
    const g = c.getContext('2d'); g.scale(2, 2);
    const w = 750, h = 320, pl = 40, pb = 26, pt = 10;
    const hist = SAVE.history.slice(); hist.unshift({ p: 0 });
    const maxP = Math.max(30, ...hist.map(e => e.p)) * 1.15;
    const X = i => pl + (hist.length > 1 ? i / (hist.length - 1) : 0) * (w - pl - 10), Y = v => pt + (1 - v / maxP) * (h - pt - pb);
    g.font = '600 11px Rubik, sans-serif'; g.textBaseline = 'middle';
    RANKS.forEach(([v, n]) => {
      if (v > maxP) return;
      g.strokeStyle = 'rgba(255,194,41,0.18)'; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(pl, Y(v)); g.lineTo(w - 10, Y(v)); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,210,120,0.7)'; g.textAlign = 'right'; g.fillText(n, w - 12, Y(v) - 8);
    });
    g.strokeStyle = '#3f352a'; g.beginPath(); g.moveTo(pl, pt); g.lineTo(pl, h - pb); g.lineTo(w - 10, h - pb); g.stroke();
    g.fillStyle = '#a7977f'; g.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const v = Math.round(maxP * k / 4); g.fillText(v, pl - 6, Y(v)); }
    g.textAlign = 'center'; g.fillText('Mejoras y victorias →', (w + pl) / 2, h - 8);
    if (hist.length < 2) { g.fillStyle = '#a7977f'; g.font = '500 15px Rubik, sans-serif'; g.fillText('Gana niveles y mejora el taller para ver tu curva de crecimiento.', (w + pl) / 2, h / 2); return; }
    const grad = g.createLinearGradient(0, pt, 0, h - pb); grad.addColorStop(0, 'rgba(255,194,41,0.35)'); grad.addColorStop(1, 'rgba(255,194,41,0)');
    g.fillStyle = grad; g.beginPath(); g.moveTo(X(0), Y(0)); hist.forEach((e, i) => g.lineTo(X(i), Y(e.p))); g.lineTo(X(hist.length - 1), h - pb); g.lineTo(X(0), h - pb); g.fill();
    g.strokeStyle = '#ffc229'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath(); hist.forEach((e, i) => i ? g.lineTo(X(i), Y(e.p)) : g.moveTo(X(i), Y(e.p))); g.stroke();
    const le = hist[hist.length - 1];
    g.fillStyle = '#ffc229'; g.beginPath(); g.arc(X(hist.length - 1), Y(le.p), 5, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'right'; g.font = '700 13px Rubik, sans-serif'; g.fillText('Poder ' + le.p, X(hist.length - 1) - 8, Y(le.p) - 12);
  }

  // ------------------------------------------------------------ opciones
  function options() {
    const p = modal(`<h2>Opciones</h2>
      <div class="toggle">Efectos de sonido <div class="sw ${SAVE.sound ? 'on' : ''}" id="ts"></div></div>
      <div class="toggle">Música <div class="sw ${SAVE.music ? 'on' : ''}" id="tm"></div></div>
      <div class="help"><b>Controles</b><br><b>Lanzar:</b> arrastra hacia atrás en el campo y suelta. Más arrastre = más fuerza.<br>
      <b>Cambiar arma:</b> toca su carta abajo o usa las teclas <b>1-6</b>.<br>
      <b>Defensas:</b> toca su carta y luego una ranura.<br>
      <b>Espacio</b>: pausa · <b>F</b>: velocidad · <b>Esc</b> / clic derecho: cancelar.</div>
      <div class="btns" id="ob"></div>`);
    wireToggles(p);
    const ob = p.querySelector('#ob');
    ob.append(btn('Listo', 'small', closeModal));
    let armed = false;
    const rb = btn('Borrar progreso', 'red small', () => {
      if (!armed) { armed = true; rb.innerHTML = '¿Seguro? Pulsa otra vez'; return; }
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
      loadSave(); closeModal(); menu();
    });
    ob.append(rb);
  }

  return {
    menu, map, shop, stats, show, brief, startLevel, startEndless, buildHud, hudTick, hudFlags, banner, toast, pulseMat, matPos,
    selectWeapon, selectWeaponByIndex, toggleSpeed, pause, resume, result, closeModal, refreshCards,
    get modalOpen() { return modalOpen; },
  };
})();
