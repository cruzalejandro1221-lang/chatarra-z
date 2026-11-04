'use strict';
// Guerra Zombie: interfaz en HTML sobre el mapa (barra superior, narrador, menús, pantallas de inicio).
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ICON = { fogata: '🔥', tienda: '⛺', pila: '🪵', bayas: '🫐', cubetas: '🪣', taller: '🔨', muro: '🧱', estacas: '🔱', atalaya: '🗼', lanzador: '🎯', cabana: '🛖', huerto: '🌱', pedrera: '⛏️' };
  const D = () => GZ, G = () => GZ.game;
  const resTxt = cost => Object.entries(cost).map(([k, v]) => '<span class="' + (G().S && (G().S.res[k] || 0) < v ? 'no' : '') + '">' + v + ' ' + D().RES[k].icon + '</span>').join(' ');
  let narrTimer = 0, sheetOpen = false;

  const UI = {
    boot() {
      $('#bBuild').onclick = () => UI.buildMenu();
      $('#bAllies').onclick = () => UI.allies();
      $('#bNight').onclick = () => G().night();
      $('#bCollect').onclick = () => G().collectAll();
      $('#menuBtn').onclick = () => UI.menu();
      $('#narrOk').onclick = () => { $('#narr').hidden = true; };
      $('#sheet').onclick = e => { if (e.target.id === 'sheet') UI.closeSheet(); };
    },
    busy: () => sheetOpen || !$('#screen').hidden,
    toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 2600); },
    cloud(ok) { const el = $('#cloud'); if (el) el.textContent = ok ? '☁️ Guardado en tu cuenta' : '📱 Guardado en este celular'; },

    // ------------------------------------------------------------ barra superior y narrador
    hud(S) {
      $('#hud').hidden = false; $('#bar').hidden = false;
      $('#hDay').textContent = 'Día ' + S.day;
      $('#hEra').textContent = 'Era ' + S.era + ' · ' + D().ERAS[S.era];
      const beds = G().beds(S);
      $('#hRes').innerHTML = Object.keys(D().RES).map(k => '<span title="' + D().RES[k].name + '"><i>' + D().RES[k].icon + '</i><b>' + S.res[k] + '</b></span>').join('');
      $('#hStat').innerHTML = '<span title="Energía para recolectar hoy">⚡' + S.energy + '</span><span title="Moral">' + (S.moral >= 60 ? '😊' : S.moral >= 30 ? '😐' : '😟') + S.moral + '</span><span title="Aliados / camas">👥' + S.allies.length + '/' + Math.max(0, beds - 1) + '</span>';
      const ready = S.b.filter(b => b.store && !b.build).length; $('#bCollect').hidden = !ready; $('#bCollect').querySelector('b').textContent = ready;
      $('#bNight').classList.toggle('ready', S.lit);
    },
    quest(S) { const q = D().QUESTS[S.quest]; $('#questBar').hidden = !q; if (q) $('#questBar').innerHTML = '<b>Objetivo</b> ' + esc(q.text); },
    narr(text) {
      const el = $('#narr'); $('#narrText').textContent = text; el.hidden = false;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      clearTimeout(narrTimer); narrTimer = setTimeout(() => { el.hidden = true; }, Math.max(6000, text.length * 75));
    },
    dayMode(day) { $('#hud').hidden = !day; $('#bar').hidden = !day; $('#sel').hidden = true; $('#questBar').hidden = !day; $('#nhud').hidden = day; if (!day) $('#narr').hidden = true; },

    // ------------------------------------------------------------ hojas (paneles)
    sheet(html, bind) { const c = $('#sheetCard'); c.innerHTML = html; $('#sheet').hidden = false; sheetOpen = true; c.scrollTop = 0; if (bind) bind(c); c.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => UI.closeSheet(); }); },
    closeSheet() { $('#sheet').hidden = true; sheetOpen = false; GZ.world && GZ.world.showSel(null); },
    selBar(b) {
      const el = $('#sel');
      if (!b) { el.hidden = true; if (GZ.world) GZ.world.showSel(null); return; }
      const d = D().B[b.t], fog = b.t === 'fogata', lvl = fog ? G().S.era + 1 : b.lvl;
      const canUp = !fog && !b.build && !b.broken && b.lvl < D().MAX_LVL;
      el.hidden = false;
      el.innerHTML = '<div class="s-name"><b>' + d.name + '</b><small>Nivel ' + lvl + (b.build ? ' · 🚧 ' + b.build + 'd' : b.broken ? ' · 💥 dañado' : '') + '</small></div><div class="s-acts"><button id="sInfo"><i>ℹ️</i>Info</button>' +
        (canUp ? '<button id="sUp"><i>⬆️</i>' + resTxt(D().upCost(b)) + '</button>' : '') + (!fog ? '<button id="sMove"><i>✥</i>Mover</button>' : '') + '</div>';
      const on = (id, f) => { const x = el.querySelector(id); if (x) x.onclick = f; };
      on('#sInfo', () => UI.buildingSheet(b)); on('#sUp', () => G().upgrade(b)); on('#sMove', () => G().startMove(b));
    },
    buildMenu() {
      const S = G().S;
      const cards = D().BUILD_ORDER.map(t => {
        const d = D().B[t], why = G().buildable(S, t), ok = !why && G().canPay(S, d.cost);
        return '<button class="bcard' + (why ? ' lock' : ok ? '' : ' poor') + '" data-t="' + t + '"><span class="bi">' + ICON[t] + '</span><b>' + d.name + '</b><small>' + (why ? '🔒 ' + esc(why) : resTxt(d.cost)) + '</small>' +
          (why ? '' : '<em>' + (d.days ? d.days + (d.days === 1 ? ' día' : ' días') : 'Al instante') + ' · ' + G().countOf(S, t) + '/' + d.max + '</em>') + '</button>';
      }).join('');
      UI.sheet('<div class="sh-head"><h3>Construir</h3><button class="x" data-close>✕</button></div><p class="muted">Elige un edificio y luego toca dónde ponerlo, dentro de tu terreno.</p><div class="bgrid">' + cards + '</div>', c => {
        c.querySelectorAll('.bcard').forEach(b => { b.onclick = () => { const t = b.dataset.t; UI.closeSheet(); G().startPlacing(t); }; });
      });
    },
    placingBar(t, target, why) {
      const el = $('#place');
      if (!t) { el.hidden = true; $('#bar').hidden = false; return; }
      $('#bar').hidden = true; el.hidden = false;
      const d = D().B[t];
      el.innerHTML = '<div class="pl-txt"><b>' + ICON[t] + ' ' + d.name + '</b><span>' + (target ? (target.ok ? 'Toca otra vez o pulsa Colocar' : '⚠️ ' + esc(why)) : 'Toca una casilla de tu terreno') + '</span></div>' +
        '<button class="pbtn no" id="plNo">Cancelar</button><button class="pbtn ok" id="plOk"' + (target && target.ok ? '' : ' disabled') + '>Colocar</button>';
      $('#plNo').onclick = () => G().cancelPlace(); $('#plOk').onclick = () => G().confirmPlace();
    },
    buildingSheet(b) {
      const S = G().S, d = D().B[b.t];
      let status = '', acts = '';
      if (b.build > 0) status = '<p class="tag">🚧 En obra: lista en ' + b.build + (b.build === 1 ? ' día' : ' días') + '</p>';
      else if (b.broken) status = '<p class="tag bad">💥 Dañado: no funciona hasta repararlo</p>';
      const info = [];
      if (d.prod && !b.build) info.push('Produce cada día: ' + Object.entries(d.prod).map(([k, v]) => v * b.lvl + ' ' + D().RES[k].icon).join(' ') + ' (tócalo para recoger)');
      if (d.tower) info.push('Dispara solo · daño ' + Math.round(d.tower.dmg * (1 + 0.5 * (b.lvl - 1))) + ' · alcance ' + Math.round(d.tower.range / 32) + ' casillas');
      if (d.beds) info.push('Camas: ' + (d.beds + b.lvl - 1));
      if (b.t !== 'fogata') info.push('Resistencia: ' + Math.ceil(b.hp) + '/' + D().hpOf(b));
      if (b.t === 'fogata') {
        info.push('Resistencia de noche: ' + d.hp[S.era]);
        if (!S.lit) acts += '<button class="btn primary" id="aLight">Encender la fogata · ' + resTxt(D().FOGATA_LIGHT) + '</button>';
        else if (S.era < 1) {
          const U = D().FOGATA_UP, okNeed = D().has(S, U.need, true), okAl = S.allies.length >= U.allies;
          acts += '<div class="req"><b>Mejorar a nivel 2 · Era 1 (Piedra y palos)</b><span class="' + (okNeed ? 'ok' : 'no') + '">' + (okNeed ? '✔' : '✖') + ' Taller de palos terminado</span><span class="' + (okAl ? 'ok' : 'no') + '">' + (okAl ? '✔' : '✖') + ' ' + U.allies + ' aliados (tienes ' + S.allies.length + ')</span><span>' + resTxt(U.cost) + '</span><small>Tu terreno crece y se desbloquean cabaña, huerto, pedrera y la lanza.</small></div><button class="btn primary" id="aUp">Mejorar fogata</button>';
        } else acts += '<p class="muted">La siguiente era (Tirachinas) llegará en la próxima actualización del juego.</p>';
      }
      if (b.t === 'taller' && !b.build) {
        if (S.era >= 1 && !S.hasLanza) acts += '<button class="btn primary" id="aSpear">Hacer una lanza · ' + resTxt(D().LANZA.cost) + '</button>';
        else if (!S.hasLanza) acts += '<p class="muted">En la era 1 podrás hacer una lanza aquí.</p>';
        else acts += '<p class="muted">✔ Ya tienes tu lanza.</p>';
      }
      if (b.broken) acts += '<button class="btn primary" id="aFix">Reparar · ' + resTxt(G().repairCost(b)) + '</button>';
      if (b.t !== 'fogata') acts += '<button class="btn ghost" id="aDel">Quitar</button>';
      UI.sheet('<div class="sh-head"><span class="bi big">' + ICON[b.t] + '</span><h3>' + d.name + (b.t === 'fogata' ? ' · nivel ' + (S.era + 1) : '') + '</h3><button class="x" data-close>✕</button></div><p>' + esc(d.desc) + '</p>' + status + (info.length ? '<ul class="info">' + info.map(i => '<li>' + i + '</li>').join('') + '</ul>' : '') + '<div class="acts">' + acts + '</div>', c => {
        const on = (id, f) => { const el = c.querySelector(id); if (el) el.onclick = f; };
        on('#aLight', () => G().lightFire()); on('#aUp', () => G().upgradeFire()); on('#aSpear', () => G().craftSpear()); on('#aFix', () => G().repair(b));
        on('#aDel', () => UI.confirm('¿Quitar ' + d.name + '?', 'No se devuelven los recursos.', 'Quitar', () => G().remove(b)));
      });
    },
    allies() {
      const S = G().S, beds = G().beds(S);
      const list = S.allies.length ? S.allies.map(a => { const j = D().JOBS[a.job]; return '<li><span class="av a' + (a.look % 4) + '">' + esc(a.name[0]) + '</span><div><b>' + esc(a.name) + '</b><small>' + j.name + ' · cada día: ' + Object.entries(j.bonus).map(([k, v]) => '+' + v + ' ' + D().RES[k].icon).join(' ') + '</small></div></li>'; }).join('')
        : '<li class="empty">Todavía estás solo con Giorgio. Ten camas libres (tienda o cabaña) y llegará gente al amanecer.</li>';
      UI.sheet('<div class="sh-head"><h3>Tu comunidad</h3><button class="x" data-close>✕</button></div>' +
        '<div class="kpis"><div><b>' + (1 + S.allies.length) + '</b><span>personas</span></div><div><b>' + Math.max(0, beds - 1 - S.allies.length) + '</b><span>camas libres</span></div><div><b>' + S.moral + '</b><span>moral</span></div></div>' +
        '<ul class="allies">' + list + '</ul><p class="muted">Cada persona come 1 🫐 y bebe 1 💧 al día. De día trabajan; de noche defienden la fogata lanzando piedras. Si falta comida, la moral baja, y con la moral muy baja alguien se va.</p>');
    },
    confirm(title, text, ok, fn) {
      UI.sheet('<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="acts"><button class="btn primary" id="cOk">' + esc(ok) + '</button><button class="btn ghost" data-close>Cancelar</button></div>', c => { c.querySelector('#cOk').onclick = () => { UI.closeSheet(); fn(); }; });
    },
    confirmNight(S, go) {
      const n = S.day, z = D().count(n), runner = n >= D().Z.corredor.from;
      const tips = [];
      if (!S.b.some(b => b.t === 'muro' || b.t === 'estacas')) tips.push('Aún no tienes muros ni estacas: los zombies llegarán directo a la fogata.');
      if (S.res.comida < 1 + S.allies.length || S.res.agua < 1 + S.allies.length) tips.push('Al amanecer cada persona come y bebe 1. Te falta comida o agua.');
      if (S.energy > 0) tips.push('Todavía te queda ⚡' + S.energy + ' de energía para recolectar hoy.');
      UI.sheet('<div class="sh-head"><h3>🌙 Noche ' + n + '</h3><button class="x" data-close>✕</button></div><p>Llegarán unos <b>' + z + ' zombies</b>' + (runner ? ', algunos <b>corredores</b> (rápidos)' : '') + '. Toca la pantalla para lanzar ' + (S.weapon === 'lanza' ? 'tu lanza' : 'piedras') + '. Tus aliados disparan solos.</p>' +
        (tips.length ? '<ul class="info warn">' + tips.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') +
        '<div class="acts"><button class="btn night" id="goN">¡Que venga la noche!</button><button class="btn ghost" data-close>Todavía no</button></div>', c => { c.querySelector('#goN').onclick = () => { UI.closeSheet(); go(); }; });
    },
    // ------------------------------------------------------------ noche
    nightHud(N) {
      const S = G().S, el = $('#nhud'); el.hidden = false;
      el.innerHTML = '<div class="nh-top"><b>🌙 Noche ' + N.n + '</b><div class="hpbar"><i id="nhHp"></i><span>🔥 Fogata</span></div><span id="nhZ">🧟 0/' + N.total + '</span></div>' +
        '<p class="nh-hint" id="nhHint">Toca donde quieras lanzar</p>' + (S.hasLanza ? '<div class="nh-w"><button data-w="piedra" class="' + (S.weapon === 'piedra' ? 'on' : '') + '">🪨 Piedra</button><button data-w="lanza" class="' + (S.weapon === 'lanza' ? 'on' : '') + '">🗡️ Lanza</button></div>' : '');
      el.querySelectorAll('[data-w]').forEach(b => { b.onpointerdown = e => { e.stopPropagation(); S.weapon = b.dataset.w; el.querySelectorAll('[data-w]').forEach(x => x.classList.toggle('on', x === b)); }; });
      setTimeout(() => { const h = $('#nhHint'); if (h) h.classList.add('fade'); }, 4000);
    },
    nightTick(N) {
      const hp = $('#nhHp'); if (hp) hp.style.width = Math.max(0, N.fogHp / N.fogMax * 100) + '%';
      const z = $('#nhZ'); if (z) z.textContent = '🧟 ' + N.kills + '/' + N.total;
    },
    dawnSheet(S, r, sum, after) {
      GZ.sfx(r.win ? 'dawn' : 'lose');
      const prod = Object.entries(sum.prod).filter(([, v]) => v).map(([k, v]) => '+' + v + ' ' + D().RES[k].icon).join('  ') || 'Nada todavía';
      const lost = Object.entries(sum.lost || {}).filter(([, v]) => v).map(([k, v]) => '−' + v + ' ' + D().RES[k].icon).join('  ');
      const rows = [
        ['🧟 Zombies derrotados', r.kills + ' de ' + r.total],
        ['📦 Listo para recoger', Object.entries(sum.ready).filter(([, v]) => v).map(([k, v]) => v + ' ' + D().RES[k].icon).join('  ') || 'Nada todavía'],
        ['🧑‍🌾 Trajeron tus aliados', prod],
        ['🍽️ Comieron y bebieron', sum.eat + ' 🫐  ' + sum.eat + ' 💧' + (sum.short ? ' · ⚠️ faltaron ' + sum.short : '')],
      ];
      if (sum.done.length) rows.push(['🏗️ Obras terminadas', sum.done.join(', ')]);
      if (lost) rows.push(['💔 Saqueado', lost]);
      if (sum.ally) rows.push(['🙋 Llegó', esc(sum.ally.name) + ' (' + D().JOBS[sum.ally.job].name + ')']);
      if (sum.left) rows.push(['🚶 Se fue', esc(sum.left.name) + ' (moral muy baja)']);
      UI.sheet('<div class="dawn ' + (r.win ? 'win' : 'loss') + '"><div class="sun">' + (r.win ? '☀️' : '🌫️') + '</div><h3>' + (r.win ? '¡Sobreviviste la noche ' + (S.day - 1) + '!' : 'La fogata se apagó…') + '</h3><p>' + (r.win ? 'Amanece el día ' + S.day + '.' : 'Los zombies saquearon parte de tus recursos antes del amanecer. Tu racha vuelve a cero, pero la aldea sigue en pie.') + '</p></div>' +
        '<ul class="sum">' + rows.map(([a, b]) => '<li><span>' + a + '</span><b>' + b + '</b></li>').join('') + '</ul><div class="acts"><button class="btn primary" id="dOk">Seguir</button></div>', c => { c.querySelector('#dOk').onclick = () => { UI.closeSheet(); after(); }; });
    },
    gameOver(S) {
      UI.screen('<div class="scr dark center"><div class="big">🔥</div><h1>Se apagó la fogata</h1><p>Sobreviviste <b>' + (S.day - 1) + (S.day - 1 === 1 ? ' noche' : ' noches') + '</b> en modo Difícil y derrotaste ' + S.kills + ' zombies.</p><button class="btn primary" id="goNew">Nueva partida</button><button class="btn ghost" id="goOut">Salir a Giorgio Games</button></div>', s => {
        s.querySelector('#goNew').onclick = () => UI.create(); s.querySelector('#goOut').onclick = () => UI.exit();
      });
    },
    menu() {
      let mute = false; try { mute = localStorage.getItem('gz_mute') === '1'; } catch (e) { /* nada */ }
      const S = G().S;
      UI.sheet('<div class="sh-head"><h3>Menú</h3><button class="x" data-close>✕</button></div><p class="muted">' + esc(S.name) + ' · ' + (S.mode === 'dificil' ? 'Difícil' : 'Normal') + ' · récord ' + S.best + ' noches · <span id="cloud"></span></p>' +
        '<div class="acts"><button class="btn ghost" id="mHelp">¿Cómo se juega?</button><button class="btn ghost" id="mSnd">' + (mute ? '🔇 Sonido apagado' : '🔊 Sonido encendido') + '</button><button class="btn ghost" id="mClassic">Modo clásico: Chatarra Z</button><button class="btn primary" id="mExit">Salir a Giorgio Games</button><button class="btn danger" id="mWipe">Borrar partida</button></div>', c => {
        UI.cloud(GZ.store.cloudOk);
        c.querySelector('#mHelp').onclick = () => UI.help();
        c.querySelector('#mSnd').onclick = e => { mute = !mute; try { localStorage.setItem('gz_mute', mute ? '1' : '0'); } catch (x) { /* nada */ } e.target.textContent = mute ? '🔇 Sonido apagado' : '🔊 Sonido encendido'; };
        c.querySelector('#mClassic').onclick = () => { G().save(true); location.href = '../game/index.html'; };
        c.querySelector('#mExit').onclick = () => UI.exit();
        c.querySelector('#mWipe').onclick = () => UI.confirm('¿Borrar tu partida?', 'Perderás tu aldea, tus aliados y tu progreso. No se puede deshacer.', 'Borrar', () => { GZ.store.wipe(); G().S.wiped = true; G().save(true); UI.create(); });
      });
    },
    help() {
      UI.sheet('<div class="sh-head"><h3>¿Cómo se juega?</h3><button class="x" data-close>✕</button></div><ul class="info"><li><b>De día</b> recolectas tocando árboles, rocas, arbustos y el río (gasta ⚡), y construyes con el botón 🔨.</li><li>Las obras y mejoras terminan al amanecer: cada noche es un día. Al amanecer, toca las burbujas sobre los edificios para recoger lo producido.</li><li>Toca un edificio para mejorarlo o moverlo.</li><li><b>De noche</b> llegan los zombies: toca para lanzar. Muros y estacas los frenan; atalayas, lanzapiedras y aliados disparan solos.</li><li>Cada persona come y bebe 1 al día. Ten camas libres para que llegue gente.</li><li>Mejora la fogata para avanzar de era y agrandar tu terreno.</li><li>Arrastra para mover el mapa y pellizca para acercar.</li></ul>');
    },
    exit() { try { G().save(true); } catch (e) { /* nada */ } window.parent.postMessage({ gg: 'exit' }, location.origin); },

    // ------------------------------------------------------------ pantallas completas: cuenta, título, personaje y prólogo
    screen(html, bind) { const s = $('#screen'); s.innerHTML = html; s.hidden = false; if (bind) bind(s); },
    hideScreen() { $('#screen').hidden = true; $('#screen').innerHTML = ''; },
    gate() {
      UI.screen('<div class="scr title center"><img class="cat" src="../media/giorgio/sorpresa.webp" alt=""><h1>GUERRA<br><span>ZOMBIE</span></h1><p>Este juego se juega con tu <b>cuenta de Giorgio Games</b>: así tu aldea queda guardada y puedes seguir en cualquier celular.</p><button class="btn primary" id="gAcc">Crear cuenta gratis o entrar</button><button class="btn ghost" id="gOut">Volver</button></div>', s => {
        s.querySelector('#gAcc').onclick = () => window.parent.postMessage({ gg: 'account' }, location.origin);
        s.querySelector('#gOut').onclick = () => UI.exit();
      });
    },
    title(saved) {
      const cont = saved && !saved.wiped ? '<button class="btn primary" id="tCont">Continuar · Día ' + saved.day + ' · ' + esc(saved.name) + '</button>' : '';
      UI.screen('<div class="scr title center"><img class="cat" src="../media/giorgio/principal.webp" alt=""><h1>GUERRA<br><span>ZOMBIE</span></h1><p class="sub">La Aldea de Giorgio</p>' + cont +
        '<button class="btn ' + (cont ? 'ghost' : 'primary') + '" id="tNew">Nueva partida</button><button class="link" id="tClassic">Modo clásico: Chatarra Z</button><button class="link" id="tOut">‹ Volver a Giorgio Games</button></div>', s => {
        const c = s.querySelector('#tCont'); if (c) c.onclick = () => { UI.hideScreen(); G().start(saved); };
        s.querySelector('#tNew').onclick = () => cont ? UI.confirm('¿Empezar de cero?', 'Tu partida actual (día ' + saved.day + ') se borrará.', 'Nueva partida', () => UI.create()) : UI.create();
        s.querySelector('#tClassic').onclick = () => { location.href = '../game/index.html'; };
        s.querySelector('#tOut').onclick = () => UI.exit();
      });
    },
    create() {
      UI.closeSheet();
      const A = GZ.store.user(); let gender = 'chica', mode = 'normal';
      const avatar = g => '<svg viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="76" rx="16" ry="3" fill="rgba(0,0,0,.2)"/><rect x="24" y="52" width="7" height="22" rx="3" fill="#3b4466" stroke="#1d2a5b" stroke-width="1.6"/><rect x="33" y="52" width="7" height="22" rx="3" fill="#3b4466" stroke="#1d2a5b" stroke-width="1.6"/><rect x="18" y="30" width="28" height="26" rx="8" fill="' + (g === 'chico' ? '#2f6fe4' : '#ff7a1a') + '" stroke="#1d2a5b" stroke-width="1.6"/>' +
        (g === 'chica' ? '<path d="M17 22 Q18 6 32 6 Q46 6 47 22 L48 40 L41 34 L41 18 L23 18 L23 34 L16 40Z" fill="#3a2412" stroke="#1d2a5b" stroke-width="1.6"/>' : '') + '<circle cx="32" cy="20" r="12" fill="#f2c79a" stroke="#1d2a5b" stroke-width="1.6"/>' +
        (g === 'chico' ? '<path d="M20 18 Q22 7 32 7 Q42 7 44 18 L40 13 L24 13Z" fill="#5a3510" stroke="#1d2a5b" stroke-width="1.6"/>' : '') + '<rect x="20" y="10" width="24" height="4" rx="2" fill="#e5383b"/><circle cx="27" cy="21" r="1.7" fill="#1d2a5b"/><circle cx="37" cy="21" r="1.7" fill="#1d2a5b"/><path d="M29 27 Q32 29 35 27" fill="none" stroke="#1d2a5b" stroke-width="1.4"/></svg>';
      UI.screen('<div class="scr form"><h2>¿Quién eres?</h2><div class="who"><button data-g="chico">' + avatar('chico') + '<b>Chico</b></button><button data-g="chica" class="on">' + avatar('chica') + '<b>Chica</b></button></div>' +
        '<label class="lbl">¿Cómo te llamas?<input id="cName" maxlength="14" autocomplete="off" value="' + esc(A && A.profile ? A.profile.username.slice(0, 14) : '') + '"></label>' +
        '<div class="lbl">Dificultad</div><div class="seg"><button data-m="normal" class="on"><b>Normal</b><small>Si cae la fogata, pierdes recursos pero sigues</small></button><button data-m="dificil"><b>Difícil</b><small>Una sola vida. Si cae, se acaba</small></button></div>' +
        '<button class="btn primary" id="cGo">Empezar</button></div>', s => {
        s.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => { gender = b.dataset.g; s.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); }; });
        s.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { mode = b.dataset.m; s.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); }; });
        s.querySelector('#cGo').onclick = () => {
          const name = s.querySelector('#cName').value.trim().replace(/\s+/g, ' ');
          if (!name) { UI.toast('Escribe tu nombre'); s.querySelector('#cName').focus(); return; }
          const S = G().newGame({ name, gender, mode }); UI.prologue(S);
        };
      });
    },
    prologue(S) {
      const cards = [
        ['🌆', 'Lo llamaron <b>el Mal del Ocaso</b>. Empezó en la ciudad: los infectados dormían escondidos de día… y despertaban al caer el sol.'],
        ['🏚️', 'En pocos días llegó a <b>Villa Albor</b>, tu pueblo. Resistieron dos noches. La tercera, no.'],
        ['<img src="../media/giorgio/triste.webp" alt="">', 'Escapaste con lo único que pudiste salvar: <b>Giorgio</b>, tu gato.'],
        ['🌄', 'Al amanecer llegaste a un campo junto a un río. No hay nadie. Esta noche volverán… <b>' + esc(S.name) + '</b>, tienes hasta el atardecer.'],
      ];
      let i = 0;
      const show = () => UI.screen('<div class="scr dark story"><button class="skip" id="pSkip">Saltar ›</button><div class="pic">' + cards[i][0] + '</div><p>' + cards[i][1] + '</p><div class="dots">' + cards.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div><small>Toca para seguir</small></div>', s => {
        s.querySelector('#pSkip').onclick = e => { e.stopPropagation(); UI.hideScreen(); G().start(S); };
        s.firstChild.onclick = () => { i++; if (i >= cards.length) { UI.hideScreen(); G().start(S); } else show(); };
      });
      show();
    },
  };
  GZ.ui = UI;
})();
