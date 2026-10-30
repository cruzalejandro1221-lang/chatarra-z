'use strict';
let SCREEN = 'menu';
const UI = (() => {
  const $ = id => document.getElementById(id);
  const iconCache = {};
  let mapWorld = 0, shopTab = 'def', toastT = 0, tpTower = null, lastScrap = -1, cardEls = {}, modalOpen = false, introQueue = [], tipStage = 0;
  const bgCache = {};

  function cloneCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; }
  function tIcon(k) { if (!iconCache[k]) iconCache[k] = makeTowerIcon(k); return cloneCanvas(iconCache[k]); }
  function zIcon(t, w, h) { const key = t + w + 'x' + h; if (!iconCache[key]) iconCache[key] = makeZombieIcon(t, w, h); return cloneCanvas(iconCache[key]); }
  function hydrateIcons(root) { root.querySelectorAll('[data-ico]').forEach(e => { e.innerHTML = ICONS[e.dataset.ico]; }); }

  function show(id) {
    ['hud', 's-menu', 's-map', 's-shop', 's-stats'].forEach(s => $(s).classList.toggle('on', s === id));
    SCREEN = id === 'hud' ? 'game' : id.replace('s-', '');
    closeModal();
  }
  function modal(html, cls) {
    const m = $('modal'); m.innerHTML = `<div class="panel ${cls || ''}">${html}</div>`; m.classList.add('on'); modalOpen = true;
    hydrateIcons(m);
    return m.firstChild;
  }
  function closeModal() { $('modal').classList.remove('on'); $('modal').innerHTML = ''; modalOpen = false; }
  function btn(label, cls, fn) { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.innerHTML = label; b.onclick = () => { SFX.click(); fn(); }; return b; }
  function demo(world) { G = newGame('demo', world || 0); }

  // ------------------------------------------------------------ menú
  function menu() {
    show('s-menu'); demo(Math.min(3, worldOf(SAVE.maxLevel)));
    const r = rankOf(power());
    $('s-menu').innerHTML = `
      <div class="logo"><div class="l1">CHATARRA <em>Z</em></div><div class="hazard strip"></div>
      <div class="l2">Defiende el taller con máquinas hechas de desechos. Mejóralas, sobrevive a la horda y avanza por 4 mundos.</div></div>
      <div class="menu-btns" id="mb"></div>
      <div class="menu-foot">Tu progreso se guarda automáticamente en este navegador.</div>
      <div class="menu-rank"><b>${r.name}</b><span>Nivel ${Math.min(SAVE.maxLevel, MAX_LEVEL)} · ${totalStars()} estrellas · ${SAVE.gears} engranajes</span></div>`;
    const mb = $('mb');
    mb.append(btn('▶&nbsp; JUGAR', '', () => map(Math.min(3, worldOf(SAVE.maxLevel)))));
    mb.append(btn(ico('gear') + '&nbsp;TALLER', 'dark', () => shop()));
    mb.append(btn(ico('star') + '&nbsp;PROGRESO', 'dark', () => stats()));
    mb.append(btn('⚙&nbsp; OPCIONES', 'dark small', () => options()));
  }

  // ------------------------------------------------------------ mapa
  const NODE_POS = [[120, 420], [240, 320], [360, 410], [480, 300], [600, 395], [720, 290], [840, 385], [960, 280], [1070, 370], [1175, 225]];
  function mapBg(wi) {
    if (bgCache[wi]) return bgCache[wi];
    const c = document.createElement('canvas'); c.width = W; c.height = 560;
    const g = c.getContext('2d');
    g.drawImage(makeBG(wi), 0, 0, W, H, 0, -60, W, H);
    g.fillStyle = 'rgba(10,8,6,0.35)'; g.fillRect(0, 0, W, 560);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); NODE_POS.forEach(([x, y], i) => { if (!i) g.moveTo(x, y); else { const [px, py] = NODE_POS[i - 1]; g.quadraticCurveTo((px + x) / 2, py, x, y); } }); };
    path(); g.stroke();
    g.strokeStyle = '#e9d8b0'; g.lineWidth = 4; g.setLineDash([12, 12]); path(); g.stroke(); g.setLineDash([]);
    bgCache[wi] = c; return c;
  }
  function map(wi) {
    if (wi !== undefined) mapWorld = clamp(wi, 0, 3);
    show('s-map'); G = null;
    const w = WORLDS[mapWorld], first = mapWorld * 10 + 1;
    const unlockedWorld = SAVE.maxLevel >= first;
    const wStars = Array.from({ length: 10 }, (_, i) => SAVE.stars[first + i] || 0).reduce((a, b) => a + b, 0);
    const el = $('s-map');
    el.innerHTML = `
      <div class="topbar"><h1>Mundo ${mapWorld + 1}: ${w.name}<small>${w.sub}</small></h1>
        <div class="pill st">${ico('star')} ${wStars}/30</div><div class="pill">${ico('gear')} ${SAVE.gears}</div></div>
      <div class="mapview" id="mv"></div>
      <button class="mapnav" id="mprev" style="left:14px">‹</button><button class="mapnav" id="mnext" style="right:14px">›</button>
      <div class="bottombar" id="mbb"></div>`;
    const mv = $('mv');
    mv.append(cloneCanvas(mapBg(mapWorld)));
    for (let i = 0; i < 10; i++) {
      const L = first + i, [x, y] = NODE_POS[i], locked = L > SAVE.maxLevel, boss = L % 10 === 0, st = SAVE.stars[L] || 0;
      const n = document.createElement('div');
      n.className = 'node' + (locked ? ' locked' : '') + (boss ? ' boss' : '') + (L === SAVE.maxLevel && !locked ? ' cur' : '');
      n.style.left = x + 'px'; n.style.top = y + 'px';
      n.innerHTML = (locked ? ico('lock') : boss ? ico('skull') : L) + (locked ? '' : `<div class="ns">${[1, 2, 3].map(k => ico('star', k <= st ? 'on' : '')).join('')}</div>`);
      if (!locked) n.onclick = () => { SFX.click(); brief(L); };
      mv.append(n);
    }
    if (!unlockedWorld) mv.insertAdjacentHTML('beforeend', `<div class="wlock">${ico('lock')}Derrota al jefe del mundo ${mapWorld} para entrar</div>`);
    $('mprev').disabled = mapWorld === 0; $('mnext').disabled = mapWorld === 3;
    $('mprev').onclick = () => { SFX.click(); map(mapWorld - 1); };
    $('mnext').onclick = () => { SFX.click(); map(mapWorld + 1); };
    const bb = $('mbb');
    bb.append(btn('‹ Menú', 'dark small', menu));
    bb.append(btn(ico('gear') + ' Taller', 'small', () => shop()));
    bb.append(btn(ico('star') + ' Progreso', 'dark small', stats));
    const eb = btn('∞ Modo infinito', 'red small', () => startEndless());
    if (SAVE.maxLevel <= 10) { eb.disabled = true; eb.title = 'Se desbloquea al vencer el nivel 10'; eb.innerHTML = ico('lock') + ' Infinito (nivel 10)'; }
    bb.append(eb);
  }

  function brief(L) {
    const lvl = buildLevel(L), boss = lvl.boss;
    const newDefs = DEF_ORDER.filter(k => DEFENSES[k].unlock === L);
    const p = modal(`
      <span class="tag ${boss ? 'red' : ''}">${boss ? 'NIVEL DE JEFE' : 'NIVEL ' + L}</span>
      <h2 class="${boss ? 'red' : ''}">${boss ? ZOMBIES[boss].name : 'Nivel ' + L}</h2>
      <p>${WORLDS[lvl.world].name} · ${lvl.waves.length} oleadas</p>
      <div class="enemies" id="be"></div>
      ${newDefs.length ? `<p><b style="color:var(--y)">Nueva defensa:</b> ${newDefs.map(k => DEFENSES[k].name).join(', ')}</p>` : ''}
      ${lvl.feature && !SAVE.seen[lvl.feature] ? `<p style="color:#ff9d7a">¡Aparece un enemigo nuevo!</p>` : ''}
      <div class="btns" id="bb"></div>`);
    const be = p.querySelector('#be');
    lvl.enemyTypes.forEach(t => { const c = zIcon(t, 56, 64); c.title = ZOMBIES[t].name; be.append(c); });
    const bb = p.querySelector('#bb');
    bb.append(btn('Volver', 'dark small', closeModal));
    bb.append(btn('¡A defender!', '', () => startLevel(L)));
  }

  // ------------------------------------------------------------ partida
  function startLevel(L) {
    newGame('level', L);
    show('hud'); buildHud();
    $('h-level').textContent = `Nivel ${L} · ${WORLDS[G.world].name}`;
    tipStage = 0;
    introQueue = G.lvl.enemyTypes.filter(t => !SAVE.seen[t]);
    if (introQueue.length) nextIntro();
    else levelTips();
    SFX.music(true); SFX.setIntensity(0);
  }
  function startEndless() {
    newGame('endless');
    show('hud'); buildHud();
    $('h-level').textContent = `Modo infinito · récord: oleada ${SAVE.stats.bestWave}`;
    G.stateT = 10; tipStage = 99;
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
      <p style="font-size:14px;color:var(--mut)">Vida ${d.hp}${d.armor ? ' · Blindaje ' + d.armor : ''}${d.shield ? ' · Escudo ' + d.shield : ''} · Velocidad ${d.speed < 20 ? 'lenta' : d.speed < 40 ? 'media' : 'alta'}</p>
      <div class="btns" style="justify-content:flex-start" id="zb"></div></div></div>`);
    p.querySelector('#zc').append(zIcon(t, 160, 180));
    p.querySelector('#zb').append(btn('¡Entendido!', 'small', () => { closeModal(); nextIntro(); }));
  }
  function levelTips() {
    const L = G.L;
    if (L === 1) { tipStage = 1; toast('Elige la <b>Ballesta</b> abajo (o pulsa <b>1</b>) y colócala en una <b>plataforma del búnker</b>.', 99); return; }
    const nd = DEF_ORDER.filter(k => DEFENSES[k].unlock === L);
    if (nd.length) toast(`Nueva defensa: <b>${DEFENSES[nd[0]].name}</b>. ${DEFENSES[nd[0]].desc}`, 7);
    else if (L === 4) toast('Toca una defensa construida para <b>mejorarla</b> con chatarra durante la partida.', 7);
  }
  function tutorialTick() {
    if (G.L !== 1 || G.mode !== 'level') return;
    if (tipStage === 1 && G.placed > 0) { tipStage = 2; toast('¡Bien! Ahora haz <b>clic en el campo</b> para disparar el <b>cañón</b> del búnker.', 99); }
    else if (tipStage === 2 && G.fired > 0) { tipStage = 3; toast('Los zombis sueltan <b>chatarra</b>: vuela sola a tu contador (o pasa el ratón encima). ¡Construye más ballestas!', 8); }
    else if (tipStage === 3 && G.waveIdx >= 1) { tipStage = 4; toast('Consejo: toca una defensa para <b>mejorarla</b>. Cuanto más alta, más daño.', 7); }
  }

  function buildHud() {
    const cards = $('cards'); cards.innerHTML = ''; cardEls = {};
    let n = 1;
    DEF_ORDER.forEach(k => {
      if (!isUnlocked(k)) return;
      const d = DEFENSES[k];
      const c = document.createElement('div'); c.className = 'card'; c.dataset.k = k;
      c.innerHTML = `<span class="key">${n++}</span><div class="nm">${d.name}</div><div class="cost">${ico('nut')}${d.cost}</div><div class="cdv"></div>`;
      c.prepend(tIcon(k));
      c.onclick = e => { e.stopPropagation(); selectCard(k); };
      cards.append(c); cardEls[k] = c;
    });
    hydrateIcons($('hud'));
    $('b-pause').onclick = () => { SFX.click(); pause(); };
    $('b-speed').onclick = () => { SFX.click(); toggleSpeed(); };
    $('b-call').onclick = () => { SFX.click(); callWaveEarly(); };
    closeTP(); lastScrap = -1; hudFlags();
    $('toast').classList.remove('on'); toastT = 0;
  }
  function selectCard(k) {
    if (!G || G.state === 'won' || G.state === 'lost') return;
    const d = DEFENSES[k];
    if (G.sel === k) { G.sel = null; }
    else if ((G.cards[k] || 0) > 0) { SFX.deny(); return; }
    else if (G.scrap < d.cost) { SFX.deny(); toast(`Te falta <b>${d.cost - G.scrap}</b> de chatarra para la ${d.name}.`, 2); return; }
    else { G.sel = k; SFX.click(); }
    closeTP(); refreshCards();
  }
  function selectCardByIndex(i) { const ks = Object.keys(cardEls); if (ks[i]) selectCard(ks[i]); }
  function toggleSpeed() { if (!G) return; G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; $('b-speed').textContent = 'x' + G.speed; }
  function refreshCards() {
    if (!G) return;
    for (const k in cardEls) {
      const c = cardEls[k], d = DEFENSES[k], cd = G.cards[k] || 0;
      c.classList.toggle('sel', G.sel === k);
      c.classList.toggle('poor', G.scrap < d.cost);
      c.classList.toggle('cool', cd > 0);
      c.querySelector('.cdv').style.height = (cd > 0 ? cd / d.cd * 100 : 0) + '%';
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
      b.innerHTML = w.boss ? ICONS.bossflag : (i < G.wavesCleared || (G.state === 'won') ? ICONS.flagdone : ICONS.flag);
      f.append(b);
    });
  }
  function hudTick(dt) {
    if (!G || SCREEN !== 'game') return;
    if (G.scrap !== lastScrap) { $('h-scrap').textContent = fmt(G.scrap); lastScrap = G.scrap; }
    const wf = G.wallHp / G.wallMax, wb = $('h-wall');
    wb.style.width = (wf * 100) + '%'; wb.className = wf < 0.3 ? 'low' : wf < 0.6 ? 'mid' : '';
    $('h-wallt').textContent = Math.ceil(G.wallHp);
    $('h-wavefill').style.width = (G.totalEv ? Math.min(1, G.spawned / G.totalEv) * 100 : 0) + '%';
    if (G.mode === 'endless') $('h-level').textContent = `Modo infinito · oleada ${Math.max(1, G.waveIdx + 1)} · récord ${SAVE.stats.bestWave}`;
    const cb = $('b-call');
    if ((G.state === 'prep' || G.state === 'between') && !G.paused) {
      cb.classList.add('on');
      cb.innerHTML = `${G.state === 'prep' ? '¡Que vengan!' : 'Siguiente oleada'}<small>en ${Math.ceil(G.stateT)}s · +${Math.round(G.stateT * 3)} chatarra</small>`;
    } else cb.classList.remove('on');
    refreshCards();
    if (tpTower) updateTP();
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
    tutorialTick();
  }
  function pulseScrap() { const e = document.querySelector('.res-scrap'); e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); }
  function banner(t, s, cls) {
    const b = $('banner'); b.className = cls || ''; b.innerHTML = `<div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}`;
    void b.offsetWidth; b.classList.add('show');
  }
  function toast(html, dur) { const t = $('toast'); t.innerHTML = html; t.classList.add('on'); toastT = dur || 4; }

  // ------------------------------------------------------------ panel de torre
  function openTP(t) {
    tpTower = t; G.selTower = t;
    const p = $('tpanel'); p.classList.add('on');
    p.style.left = clamp(t.x - 105, 10, W - 220) + 'px';
    p.style.top = clamp(t.y - (t.roof ? 60 : 250), 90, 420) + 'px';
    if (t.roof) p.style.left = (t.x + 40) + 'px';
    p.innerHTML = `<h4></h4><div class="tier"></div><div class="st"></div><div class="row"><button class="up"></button><button class="sell"></button></div>`;
    p.querySelector('.up').onclick = e => { e.stopPropagation(); if (upgradeTower(t)) updateTP(true); };
    p.querySelector('.sell').onclick = e => { e.stopPropagation(); sellTower(t); closeTP(); };
    updateTP(true);
  }
  function statLines(s, key) {
    const L = [];
    if (s.dmg) L.push(`Daño <b>${Math.round(s.dmg)}</b>`);
    if (s.dps) L.push(`Fuego <b>${Math.round(s.dps)}</b>/s`);
    if (s.rate) L.push(`Cadencia <b>${s.rate.toFixed(2)}</b>/s`);
    if (s.gen) L.push(`Produce <b>${s.gold ? s.gen * 2 : s.gen}</b> cada <b>${s.genTime.toFixed(1)}</b>s`);
    if (s.thorns) L.push(`Espinas <b>${Math.round(s.thorns)}</b>`);
    if (s.chains) L.push(`Saltos <b>${s.chains}</b>`);
    if (s.pierce) L.push(`Perforación <b>${s.pierce}</b>`);
    if (s.radius) L.push(`Radio <b>${Math.round(s.radius)}</b>`);
    if (s.splash) L.push(`Área <b>${Math.round(s.splash)}</b>`);
    return L.join(' · ');
  }
  function updateTP(force) {
    const t = tpTower; if (!t) return;
    if (!G.towers.includes(t)) { closeTP(); return; }
    const p = $('tpanel'), c = upgradeCost(t);
    if (force) {
      p.querySelector('h4').textContent = DEFENSES[t.key].name;
      p.querySelector('.tier').innerHTML = `Nivel <b>${t.tier}</b>/3 · Vida ${Math.ceil(t.hp)}/${Math.round(t.s.maxHp)}`;
      let st = statLines(t.s, t.key);
      if (t.tier < 3) { const n = defStats(t.key, t.tier + 1); st += `<br><span style="color:#8ef07c">Siguiente: ${statLines(n, t.key)}</span>`; }
      p.querySelector('.st').innerHTML = st;
    }
    const ub = p.querySelector('.up');
    if (t.tier >= 3) { ub.textContent = 'Máximo'; ub.disabled = true; }
    else { ub.innerHTML = `Mejorar ${c}`; ub.disabled = G.scrap < c; }
    p.querySelector('.sell').textContent = `Vender +${sellValue(t)}`;
  }
  function closeTP() { tpTower = null; if (G) G.selTower = null; $('tpanel').classList.remove('on'); }

  // ------------------------------------------------------------ modales de partida
  function pause() {
    if (!G || G.state === 'won' || G.state === 'lost' || modalOpen) return;
    G.paused = true;
    const p = modal(`<h2>Pausa</h2><p>${G.mode === 'endless' ? 'Modo infinito' : 'Nivel ' + G.L + ' · ' + WORLDS[G.world].name}</p>
      <div class="toggle">Efectos de sonido <div class="sw ${SAVE.sound ? 'on' : ''}" id="ts"></div></div>
      <div class="toggle">Música <div class="sw ${SAVE.music ? 'on' : ''}" id="tm"></div></div>
      <div class="btns" id="pb"></div>`, 'pause');
    wireToggles(p);
    const pb = p.querySelector('#pb');
    pb.append(btn('Continuar', '', resume));
    pb.append(btn('Reiniciar', 'dark small', () => { G.mode === 'endless' ? startEndless() : startLevel(G.L); }));
    pb.append(btn('Salir', 'dark small', () => { SFX.music(false); G.mode === 'endless' ? map(mapWorld) : map(G.world); }));
  }
  function resume() { closeModal(); if (G) G.paused = false; }
  function wireToggles(p) {
    const ts = p.querySelector('#ts'), tm = p.querySelector('#tm');
    if (ts) ts.onclick = () => { SAVE.sound = !SAVE.sound; ts.classList.toggle('on', SAVE.sound); SFX.apply(); writeSave(); SFX.click(); };
    if (tm) tm.onclick = () => { SAVE.music = !SAVE.music; tm.classList.toggle('on', SAVE.music); SFX.apply(); writeSave(); };
  }
  function result(res) {
    SFX.music(false);
    let html;
    if (res.mode === 'endless') {
      html = `<span class="tag red">MODO INFINITO</span><h2>${res.best ? '¡NUEVO RÉCORD!' : 'Fin de la partida'}</h2>
        <div class="kv"><div><b>${res.wave}</b><span>Oleadas</span></div><div><b>${res.kills}</b><span>Zombis</span></div><div><b>${SAVE.stats.bestWave}</b><span>Récord</span></div></div>
        <div class="gain">+${res.gears} ${ico('gear')}</div>`;
    } else if (res.win) {
      html = `<span class="tag">NIVEL ${res.L} COMPLETADO</span><h2>¡VICTORIA!</h2>
        <div class="stars">${[1, 2, 3].map(k => ico('star', k <= res.stars ? 'on' : '')).join('')}</div>
        <div class="kv"><div><b>${res.kills}</b><span>Zombis</span></div><div><b>${fmt(res.scrap)}</b><span>Chatarra</span></div><div><b>${Math.round(G.wallHp / G.wallMax * 100)}%</b><span>Muralla</span></div></div>
        <div class="gain">+${res.gears} ${ico('gear')}</div>${res.first ? '' : '<p style="font-size:13px;color:var(--mut)">Repetir un nivel da menos engranajes (salvo si mejoras las estrellas).</p>'}
        <div id="ul"></div>`;
    } else {
      html = `<span class="tag red">NIVEL ${res.L}</span><h2 class="red">DERROTA</h2>
        <p>Resististe ${res.wave} de ${G.lvl.waves.length} oleadas. Mejora tus máquinas en el taller e inténtalo de nuevo.</p>
        <div class="kv"><div><b>${res.kills}</b><span>Zombis</span></div><div><b>${res.wave}</b><span>Oleadas</span></div><div><b>+${res.gears}</b><span>Engranajes</span></div></div>`;
    }
    const p = modal(html + '<div class="btns" id="rb"></div>');
    const ul = p.querySelector('#ul');
    if (ul) {
      res.unlocks.forEach(k => {
        const d = document.createElement('div'); d.className = 'unlock';
        d.innerHTML = `<div><b>¡Nueva defensa: ${DEFENSES[k].name}!</b><span>${DEFENSES[k].desc}</span></div>`;
        d.prepend(tIcon(k)); ul.append(d);
      });
      if (res.newWorld) ul.insertAdjacentHTML('beforeend', `<div class="unlock"><div><b>¡Nuevo mundo: ${WORLDS[worldOf(res.L + 1)].name}!</b><span>${WORLDS[worldOf(res.L + 1)].sub}</span></div></div>`);
      if (res.endlessUnlocked) ul.insertAdjacentHTML('beforeend', `<div class="unlock"><div><b>¡Modo infinito desbloqueado!</b><span>Aguanta todas las oleadas que puedas para ganar engranajes.</span></div></div>`);
    }
    const rb = p.querySelector('#rb');
    if (res.mode === 'endless') {
      rb.append(btn('Otra vez', '', startEndless)); rb.append(btn(ico('gear') + ' Taller', 'dark small', () => shop())); rb.append(btn('Mapa', 'dark small', () => map(mapWorld)));
    } else if (res.win) {
      rb.append(btn('Mapa', 'dark small', () => map(worldOf(res.L + (res.L < MAX_LEVEL ? 1 : 0)))));
      rb.append(btn(ico('gear') + ' Taller', 'dark small', () => shop()));
      if (res.L < MAX_LEVEL) rb.append(btn('Siguiente ›', '', () => brief(res.L + 1)));
    } else {
      rb.append(btn('Mapa', 'dark small', () => map(worldOf(res.L))));
      rb.append(btn(ico('gear') + ' Taller', 'dark small', () => shop()));
      rb.append(btn('Reintentar', '', () => startLevel(res.L)));
    }
  }

  // ------------------------------------------------------------ taller
  function shop(tab) {
    if (tab) shopTab = tab;
    show('s-shop'); G = null;
    const r = rankOf(power()), p = power();
    const prog = r.next ? (p - r.min) / (r.next[0] - r.min) : 1;
    $('s-shop').innerHTML = `
      <div class="topbar"><h1>Taller<small>Mejoras permanentes para todas tus partidas</small></h1><div class="pill">${ico('gear')} <span id="sg">${SAVE.gears}</span></div></div>
      <div class="tabs"><button class="tab ${shopTab === 'def' ? 'on' : ''}" data-t="def">Defensas</button><button class="tab ${shopTab === 'base' ? 'on' : ''}" data-t="base">Búnker</button></div>
      <div class="rankbox"><div class="r1"><b>${r.name}</b><span>Poder del taller: ${p}${r.next ? ' / ' + r.next[0] + ' → ' + r.next[1] : ' (máximo)'}</span></div><div class="rb"><i style="width:${prog * 100}%"></i></div></div>
      <div class="grid" id="sgrid"></div>
      <div class="bottombar" id="sbb"></div>`;
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => { SFX.click(); shop(t.dataset.t); });
    const grid = $('sgrid');
    if (shopTab === 'def') DEF_ORDER.forEach(k => grid.append(defCard(k)));
    else BASE_ORDER.forEach(k => grid.append(baseCard(k)));
    const bb = $('sbb');
    bb.append(btn('‹ Mapa', 'dark small', () => map()));
    bb.append(btn(ico('star') + ' Progreso', 'dark small', stats));
    if (SAVE.maxLevel <= MAX_LEVEL) bb.append(btn('▶ Jugar nivel ' + Math.min(SAVE.maxLevel, MAX_LEVEL), 'small', () => { map(worldOf(Math.min(SAVE.maxLevel, MAX_LEVEL))); brief(Math.min(SAVE.maxLevel, MAX_LEVEL)); }));
  }
  function pips(l, max) { return `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`; }
  function defCard(k) {
    const d = DEFENSES[k], l = up(k), locked = !isUnlocked(k);
    const el = document.createElement('div'); el.className = 'ucard' + (locked ? ' locked' : '');
    const cost = UP_COST[l];
    const eff = `Daño y vida <em>+${l * 15}%</em> · cadencia <em>+${l * 6}%</em>`;
    el.innerHTML = `<div class="uc"><h3>${d.name}</h3>${pips(l, 5)}
      <div class="ud">${d.desc}<br>${eff}<br><span class="sp">Nv3: ${d.s3}${l >= 3 ? ' ✔' : ''}</span><br><span class="sp">Nv5: ${d.s5}${l >= 5 ? ' ✔' : ''}</span></div>
      <button class="ub ${l >= 5 ? 'max' : ''}">${l >= 5 ? 'Al máximo' : 'Mejorar ' + ico('gear') + ' ' + cost}</button></div>
      ${locked ? `<div class="lk">${ico('lock')} Nivel ${d.unlock}</div>` : ''}`;
    el.prepend(tIcon(k));
    const b = el.querySelector('.ub');
    b.disabled = l < 5 && (locked || SAVE.gears < cost);
    b.onclick = () => { if (l >= 5) return; buy(k, cost); };
    return el;
  }
  function baseCard(k) {
    const u = BASE_UP[k], l = up(k), cost = u.cost[l];
    const el = document.createElement('div'); el.className = 'ucard';
    el.innerHTML = `<div class="uc"><h3>${u.name}</h3>${pips(l, u.max)}
      <div class="ud">Ahora: ${l ? u.desc(l) : 'sin mejoras'}${l < u.max ? `<br>Siguiente: ${k === 'ampliacion' ? u.desc(l) : u.desc(l + 1)}` : ''}</div>
      <button class="ub ${l >= u.max ? 'max' : ''}">${l >= u.max ? 'Al máximo' : 'Mejorar ' + ico('gear') + ' ' + cost}</button></div>`;
    const c = document.createElement('canvas'); c.width = 168; c.height = 140; drawBaseIcon(c.getContext('2d'), k); el.prepend(c);
    const b = el.querySelector('.ub');
    if (l < u.max && SAVE.gears < cost) b.disabled = true;
    b.onclick = () => { if (l >= u.max) return; buy(k, cost); };
    return el;
  }
  function buy(k, cost) {
    if (SAVE.gears < cost) { SFX.deny(); return; }
    SAVE.gears -= cost; SAVE.up[k] = up(k) + 1; recordPower(); writeSave(); SFX.upgrade();
    const sc = $('sgrid').scrollTop;
    shop(); $('sgrid').scrollTop = sc;
    const idx = (shopTab === 'def' ? DEF_ORDER : BASE_ORDER).indexOf(k);
    const card = $('sgrid').children[idx]; if (card) card.classList.add('flash');
  }
  function drawBaseIcon(g, k) {
    g.scale(2, 2); g.translate(42, 35);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const Y = '#ffc229';
    if (k === 'muralla') { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { g.fillStyle = ['#6a6158', '#57504a', '#615a52'][(r + c) % 3]; g.fillRect(-24 + c * 16 + (r % 2) * 4, -20 + r * 13, 15, 12); } g.fillStyle = Y; g.beginPath(); g.moveTo(14, 4); g.lineTo(24, 4); g.lineTo(19, -6); g.fill(); }
    else if (k === 'canon') { g.fillStyle = '#5a524a'; g.beginPath(); g.arc(-6, 10, 14, Math.PI, 0); g.fill(); g.save(); g.translate(-6, 4); g.rotate(-0.5); g.fillStyle = '#34302b'; g.fillRect(0, -6, 30, 12); g.restore(); g.fillStyle = Y; g.beginPath(); g.arc(22, -18, 5, 0, 7); g.fill(); }
    else if (k === 'chatarra') { for (let i = 0; i < 5; i++) { g.save(); g.translate(-14 + (i % 3) * 14, 8 - Math.floor(i / 3) * 12); g.fillStyle = Y; g.beginPath(); for (let j = 0; j < 6; j++) g.lineTo(Math.cos(j * 1.047) * 8, Math.sin(j * 1.047) * 8); g.fill(); g.fillStyle = '#3a2203'; g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill(); g.restore(); } }
    else if (k === 'produccion') { g.strokeStyle = '#d33a2c'; g.lineWidth = 8; g.beginPath(); g.arc(0, -4, 14, 0, Math.PI); g.stroke(); g.fillStyle = '#cfd5da'; g.fillRect(-18, -12, 8, 9); g.fillRect(10, -12, 8, 9); g.strokeStyle = '#8ce6ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -16); g.lineTo(-6, -24); g.lineTo(0, -16); g.lineTo(6, -24); g.lineTo(14, -16); g.stroke(); }
    else if (k === 'reparacion') { g.save(); g.rotate(-0.7); g.fillStyle = '#9aa0a6'; g.fillRect(-4, -4, 8, 34); g.beginPath(); g.arc(0, -10, 11, 0, 7); g.fill(); g.fillStyle = '#272019'; g.fillRect(-4, -24, 8, 12); g.restore(); g.fillStyle = '#7de86a'; g.fillRect(12, -14, 14, 4); g.fillRect(17, -19, 4, 14); }
    else if (k === 'ampliacion') { g.strokeStyle = '#6b5236'; g.lineWidth = 3; g.strokeRect(-20, -14, 26, 34); g.beginPath(); g.moveTo(-20, -14); g.lineTo(6, 20); g.moveTo(6, -14); g.lineTo(-20, 20); g.stroke(); g.fillStyle = '#8a6a44'; g.fillRect(-24, -18, 34, 5); g.fillStyle = '#7de86a'; g.fillRect(14, -2, 14, 4); g.fillRect(19, -7, 4, 14); }
  }

  // ------------------------------------------------------------ progreso
  function stats() {
    show('s-stats'); G = null;
    const s = SAVE.stats, r = rankOf(power());
    $('s-stats').innerHTML = `
      <div class="topbar"><h1>Progreso<small>Rango actual: ${r.name} · Poder ${power()}</small></h1><div class="pill">${ico('gear')} ${SAVE.gears}</div></div>
      <div class="statgrid">
        <div><b>${fmt(s.kills)}</b><span>Zombis eliminados</span></div>
        <div><b>${Math.min(MAX_LEVEL, SAVE.maxLevel - 1 + (SAVE.stars[MAX_LEVEL] ? 1 : 0))}/${MAX_LEVEL}</b><span>Niveles superados</span></div>
        <div><b>${totalStars()}/${MAX_LEVEL * 3}</b><span>Estrellas</span></div>
        <div><b>${fmt(SAVE.gearsTotal)}</b><span>Engranajes ganados</span></div>
        <div><b>${s.bossKills}</b><span>Jefes derrotados</span></div>
        <div><b>${s.bestWave}</b><span>Récord infinito</span></div>
      </div>
      <div class="chartbox"><h3>Crecimiento del taller</h3><p>Tu poder sube con cada mejora y cada estrella. Las líneas marcan los rangos.</p><canvas id="pc" width="1500" height="640"></canvas></div>
      <div class="worldbox"><h3>Mundos</h3><div id="wr"></div></div>
      <div class="bottombar" id="stb"></div>`;
    drawChart($('pc'));
    const wr = $('wr');
    WORLDS.forEach((w, i) => {
      let st = 0, done = 0;
      for (let L = i * 10 + 1; L <= i * 10 + 10; L++) { st += SAVE.stars[L] || 0; if (SAVE.stars[L]) done++; }
      wr.insertAdjacentHTML('beforeend', `<div class="wrow"><div class="wn">${w.name}<span>${done}/10 niveles · ${st}/30 ★</span></div><div class="wb"><i style="width:${st / 30 * 100}%;background:${w.color}"></i></div></div>`);
    });
    const bb = $('stb');
    bb.append(btn('‹ Menú', 'dark small', menu)); bb.append(btn('Mapa', 'dark small', () => map())); bb.append(btn(ico('gear') + ' Taller', 'small', () => shop()));
  }
  function drawChart(c) {
    const g = c.getContext('2d'); g.scale(2, 2);
    const w = 750, h = 320, pl = 40, pb = 26, pt = 10;
    const hist = SAVE.history.length ? SAVE.history.slice() : [];
    hist.unshift({ p: 0 });
    const maxP = Math.max(60, ...hist.map(e => e.p)) * 1.15;
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
      <div class="help"><b>Controles</b><br>Clic en una carta (o teclas <b>1-9</b>) y luego en una ranura para construir.<br>
      Clic en el campo: dispara el <b>cañón</b> del búnker. Clic en una defensa: mejorar o vender.<br>
      <b>Espacio</b>: pausa · <b>F</b>: velocidad · <b>Esc</b> / clic derecho: cancelar.</div>
      <div class="btns" id="ob"></div>`);
    wireToggles(p);
    const ob = p.querySelector('#ob');
    ob.append(btn('Listo', 'small', closeModal));
    let armed = false;
    const rb = btn('Borrar progreso', 'red small', () => {
      if (!armed) { armed = true; rb.innerHTML = '¿Seguro? Pulsa otra vez'; return; }
      localStorage.removeItem(SAVE_KEY); loadSave(); closeModal(); menu();
    });
    ob.append(rb);
  }

  return {
    menu, map, shop, stats, show, brief, startLevel, startEndless, buildHud, hudTick, hudFlags, banner, toast, pulseScrap,
    openTP, closeTP, selectCard, selectCardByIndex, toggleSpeed, pause, resume, result, closeModal, refreshCards,
    get modalOpen() { return modalOpen; },
  };
})();
