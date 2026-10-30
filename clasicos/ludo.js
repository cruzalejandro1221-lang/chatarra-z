'use strict';
// Ludo: tablero en SVG, dado animado, bot de 3 niveles y partida online (el anfitrión lleva las reglas y tira el dado).
(() => {
  const LE = window.LudoEngine, Ludo = LE.Ludo, esc = CG.esc;
  const COLS = ['#e0453a', '#3fae5a', '#f2b51f', '#3d7be0'], LIGHT = ['#f3a59f', '#9fd7ae', '#f8d98a', '#a3bdf0'], NAMES = ['rojo', 'verde', 'amarillo', 'azul'];
  const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
  const FIN = [[6.85, 7.5, 0, 1], [7.5, 6.85, 1, 0], [8.15, 7.5, 0, 1], [7.5, 8.15, 1, 0]];     // llegada en el centro: x, y, desplazamiento x, y
  CG.ICONS.ludo = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="9" fill="currentColor"/><g fill="#15101f"><circle cx="16" cy="16" r="3.4"/><circle cx="32" cy="16" r="3.4"/><circle cx="24" cy="24" r="3.4"/><circle cx="16" cy="32" r="3.4"/><circle cx="32" cy="32" r="3.4"/></g></svg>';

  const diceSvg = n => '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="3" y="3" width="54" height="54" rx="13" fill="#fffaf0"/>' + (n ? '' : '<text x="30" y="41" text-anchor="middle" font-size="34" font-weight="800" fill="#1a1325" font-family="sans-serif">?</text>') + (PIPS[n] || []).map(([x, y]) => '<circle cx="' + (15 + x * 15) + '" cy="' + (15 + y * 15) + '" r="5.2" fill="#1a1325"/>').join('') + '</svg>';

  function boardSvg(active) {
    let s = '<svg class="ld-svg" viewBox="0 0 15 15" aria-label="Tablero de Ludo"><rect width="15" height="15" rx="0.5" fill="#fbf6ea"/>';
    LE.BASE.forEach(([bx, by], c) => {
      const on = active.includes(c);
      s += '<g opacity="' + (on ? 1 : 0.28) + '"><rect x="' + bx + '" y="' + by + '" width="6" height="6" fill="' + COLS[c] + '"/><rect x="' + (bx + 0.8) + '" y="' + (by + 0.8) + '" width="4.4" height="4.4" rx="0.6" fill="#fbf6ea"/>';
      for (const [dx, dy] of [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]]) s += '<circle cx="' + (bx + dx) + '" cy="' + (by + dy) + '" r="0.62" fill="' + LIGHT[c] + '"/>';
      s += '</g>';
    });
    LE.TRACK.forEach(([x, y], i) => {
      const start = i % 13 === 0;
      s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + (start ? (active.includes(i / 13) ? COLS[i / 13] : LIGHT[i / 13]) : '#fbf6ea') + '" stroke="#cdbf9c" stroke-width="0.06"/>';
      if (i % 13 === 8) s += '<path transform="translate(' + (x + 0.5) + ' ' + (y + 0.5) + ')" d="M0-0.36L0.1-0.12 0.36-0.1 0.16 0.07 0.22 0.32 0-0.1 -0.22 0.32 -0.16 0.07 -0.36-0.1 -0.1-0.12z" fill="#c4b283"/>';
    });
    LE.LANE.forEach((cells, c) => cells.forEach(([x, y]) => { s += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + COLS[c] + '" opacity="' + (active.includes(c) ? 0.9 : 0.3) + '" stroke="#fbf6ea" stroke-width="0.06"/>'; }));
    s += '<polygon points="6,6 7.5,7.5 6,9" fill="' + COLS[0] + '"/><polygon points="6,6 9,6 7.5,7.5" fill="' + COLS[1] + '"/><polygon points="9,6 9,9 7.5,7.5" fill="' + COLS[2] + '"/><polygon points="6,9 9,9 7.5,7.5" fill="' + COLS[3] + '"/>';
    return s + '<g id="ldDest"></g><g id="ldTok"></g></svg>';
  }

  CG.register('ludo', {
    start(ctx) {
      const root = ctx.root, online = ctx.online, host = ctx.isHost, me = host ? 0 : 1, op = me ^ 1;
      let eng = null, S = null, rolling = false, shownN = -1, diceVal = 0, spin = 0, autoTimer = null, finished = false;
      const colors = [3, 1];
      root.innerHTML = '<div class="ld"><div class="cg-player" id="ldOpp"></div><div class="ld-board' + (me === 1 ? ' rot' : '') + '" id="ldBoard">' + boardSvg(colors) + '</div><div class="cg-player" id="ldMe"></div>' +
        '<div class="ld-dice-row"><button class="ld-dice" id="ldDice" aria-label="Tirar el dado"></button><div class="ld-text" id="ldText"></div></div></div>';
      const $ = s => root.querySelector(s), NS = 'http://www.w3.org/2000/svg';
      const tokG = $('#ldTok'), destG = $('#ldDest'), tks = [[], []];
      for (let p = 0; p < 2; p++) for (let i = 0; i < 4; i++) {
        const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'ld-tk'); g.dataset.p = p; g.dataset.i = i;
        g.innerHTML = '<ellipse cx="0.03" cy="0.2" rx="0.4" ry="0.2" fill="rgba(0,0,0,.28)"/><circle r="0.43" fill="' + COLS[colors[p]] + '" stroke="#fffaf0" stroke-width="0.09"/><circle r="0.19" cx="-0.1" cy="-0.13" fill="rgba(255,255,255,.4)"/><circle class="ring" r="0.56" fill="none" stroke="#fff" stroke-width="0.09"/>';
        tokG.append(g); tks[p][i] = g;
      }
      const slot = (p, i) => { const [bx, by] = LE.BASE[colors[p]], o = [[1.8, 1.8], [4.2, 1.8], [1.8, 4.2], [4.2, 4.2]][i]; return [bx + o[0], by + o[1]]; };
      function xy(p, i, prog) {
        const c = colors[p];
        if (prog === 0) return slot(p, i);
        if (prog <= 51) { const t = LE.TRACK[LE.trackIdx(c, prog)]; return [t[0] + 0.5, t[1] + 0.5]; }
        if (prog <= 56) { const t = LE.LANE[c][prog - 52]; return [t[0] + 0.5, t[1] + 0.5]; }
        const f = FIN[c]; return [f[0] + f[2] * (i - 1.5) * 0.22, f[1] + f[3] * (i - 1.5) * 0.22];
      }
      function showTokens() {
        const pts = [], groups = {};
        for (let p = 0; p < 2; p++) for (let i = 0; i < 4; i++) {
          const prog = S.pos[p][i], [x, y] = xy(p, i, prog); pts.push([p, i, x, y, prog]);
          if (prog > 0 && prog < 57) (groups[x + ',' + y] = groups[x + ',' + y] || []).push([p, i]);
        }
        for (const [p, i, x0, y0, prog] of pts) {
          let x = x0, y = y0; const g = groups[x0 + ',' + y0];
          if (g && g.length > 1) { const k = g.findIndex(a => a[0] === p && a[1] === i), a = (k / g.length) * 6.283 + 0.6; x += Math.cos(a) * 0.2; y += Math.sin(a) * 0.2; }
          const el = tks[p][i];
          el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
          const can = S.turn === me && S.phase === 'move' && p === me && S.legal.includes(i) && !finished;
          el.classList.toggle('can', can); el.classList.toggle('done', prog === 57);
        }
        // marcas de destino de las fichas que se pueden mover
        let d = '';
        if (S.turn === me && S.phase === 'move' && !finished) for (const i of S.legal) {
          const from = S.pos[me][i], to = from === 0 ? 1 : from + S.dice, [x, y] = xy(me, i, to);
          d += '<circle cx="' + x + '" cy="' + y + '" r="0.5" fill="' + COLS[colors[me]] + '" fill-opacity="0.22" stroke="' + COLS[colors[me]] + '" stroke-width="0.1" stroke-dasharray="0.22 0.16"/>';
        }
        destG.innerHTML = d;
      }
      function bars() {
        const home = p => S.pos[p].filter(x => x === 57).length;
        const bar = (p, name, you) => '<span class="av" style="background:' + COLS[colors[p]] + ';color:#fff">' + esc(name[0] || '?').toUpperCase() + '</span><span class="nm">' + esc(name) + (you ? ' (tú)' : '') + ' · ' + NAMES[colors[p]] + '</span><span class="sub">En casa ' + home(p) + '/4</span>';
        $('#ldOpp').innerHTML = bar(op, ctx.rivalName, false); $('#ldMe').innerHTML = bar(me, ctx.name, true);
        $('#ldOpp').classList.toggle('turn', !finished && S.turn === op); $('#ldMe').classList.toggle('turn', !finished && S.turn === me);
      }
      function text() {
        const l = S.last, who = l && l.p === me ? 'Tú' : ctx.rivalName;
        let t = '';
        if (S.winner !== null) t = S.winner === me ? '¡Llevaste las cuatro fichas a casa!' : ctx.rivalName + ' llevó sus cuatro fichas a casa';
        else if (S.turn === me) t = S.phase === 'roll' ? (rolling ? 'Tirando…' : 'Tu turno: toca el dado') : (S.legal.length > 1 ? 'Elige una ficha' : 'Moviendo…');
        else t = rolling ? ctx.rivalName + ' tira el dado…' : 'Turno de ' + ctx.rivalName;
        let extra = '';
        if (l && !rolling) {
          if (l.ev === 'sin') extra = who + (l.p === me ? ' no puedes' : ' no puede') + ' mover con el ' + l.d;
          else if (l.ev === 'tres6') extra = 'Tres 6 seguidos: ' + (l.p === me ? 'pierdes' : 'pierde') + ' el turno';
          else if (l.ev === 'mueve' && l.captured) extra = '¡' + who + (l.p === me ? ' comiste' : ' comió') + (l.captured > 1 ? ' ' + l.captured + ' fichas' : ' una ficha') + '!';
          else if (l.ev === 'mueve' && l.done) extra = '¡' + who + (l.p === me ? ' llevaste' : ' llevó') + ' una ficha a casa!';
          else if (l.ev === 'mueve' && l.d === 6 && S.phase === 'roll') extra = 'Sacó un 6: tiro extra';
        }
        $('#ldText').innerHTML = '<b>' + esc(t) + '</b>' + (extra ? '<span>' + esc(extra) + '</span>' : '');
      }
      function dice() {
        const d = $('#ldDice');
        d.innerHTML = diceSvg(diceVal);
        const canRoll = S && S.turn === me && S.phase === 'roll' && !rolling && !finished && S.winner === null;
        d.classList.toggle('ready', canRoll); d.classList.toggle('roll', rolling);
        d.style.setProperty('--c', S ? COLS[colors[S.turn]] : '#fff');
        d.disabled = !canRoll;
      }
      function renderAll() { if (!S) return; showTokens(); bars(); text(); dice(); }

      // ---------------------------------------------------------------- dado
      function animate(done) {
        if (rolling) return;
        rolling = true; renderAll(); let k = 0;
        const step = () => { diceVal = 1 + Math.floor(Math.random() * 6); dice(); if (++k < 9) ctx.later(step, 65); else if (done) done(); };
        step();
      }
      function userRoll() {
        if (!S || S.turn !== me || S.phase !== 'roll' || rolling || finished) return;
        if (online && !host) { ctx.send({ t: 'roll' }); animate(null); return; }
        animate(() => { eng.roll(); rolling = false; push(); });
      }
      function userMove(i) {
        if (!S || S.turn !== me || S.phase !== 'move' || !S.legal.includes(i) || finished) return;
        if (online && !host) { ctx.send({ t: 'move', i }); S.phase = 'wait'; S.legal = []; renderAll(); return; }
        eng.move(i); push();
      }

      // ---------------------------------------------------------------- estado (anfitrión / bot)
      function push() {
        const st = eng.state();
        if (online) ctx.send({ t: 's', s: st });
        apply(st);
      }
      function apply(st) {
        const newRoll = !S || st.n !== S.n;
        S = st;
        if (newRoll && st.dice) diceVal = st.dice;
        rolling = false; renderAll();
        if (st.winner !== null) { if (!finished) { finished = true; const w = st.winner === me; renderAll(); ctx.finish({ result: w ? 'win' : 'loss', title: w ? '¡Ganaste!' : 'Perdiste', sub: w ? 'Tus cuatro fichas llegaron a casa.' : ctx.rivalName + ' llegó primero.', delay: 1200 }); } return; }
        // jugada automática cuando solo hay una opción
        if (st.turn === me && st.phase === 'move' && st.legal.length === 1) ctx.later(() => userMove(st.legal[0]), 650);
        // turno del bot
        if (!online && st.turn === op) {
          if (st.phase === 'roll') ctx.later(() => animate(() => { eng.roll(); rolling = false; push(); }), 700);
          else if (st.phase === 'move') ctx.later(() => { const m = LE.botMove(eng, ctx.level); if (m !== null) { eng.move(m); push(); } }, 750 + Math.random() * 500);
        }
      }

      root.querySelector('.ld-board').onclick = e => {
        const g = e.target.closest('.ld-tk'); if (!g || +g.dataset.p !== me) return;
        userMove(+g.dataset.i);
      };
      $('#ldDice').onclick = userRoll;

      ctx.onmsg = m => {
        if (!m) return;
        if (host) {
          if (!eng) return;
          if (m.t === 'roll' && eng.turn === 1 && eng.phase === 'roll') { animate0(); }
          else if (m.t === 'move' && eng.turn === 1 && eng.phase === 'move' && Number.isInteger(m.i)) { if (eng.move(m.i)) push(); }
        } else if (m.t === 's' && m.s && Array.isArray(m.s.pos) && Array.isArray(m.s.legal)) apply(m.s);
      };
      function animate0() { if (rolling) return; rolling = true; renderAll(); ctx.later(() => { eng.roll(); rolling = false; push(); }, 600); }
      ctx.onresume = () => { if (host && eng) ctx.send({ t: 's', s: eng.state() }); };

      if (host) { eng = new Ludo({ first: ctx.round % 2 }); push(); }
      else { S = new Ludo().state(); S.turn = 0; renderAll(); $('#ldText').innerHTML = '<b>Preparando la partida…</b>'; }
    },
  });
})();
