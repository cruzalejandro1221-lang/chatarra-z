'use strict';
// Batalla Naval: colocas tu flota, disparas al radar del rival y hundes sus barcos. Bot de 3 niveles o partida online.
// Online: cada jugador guarda su flota en su propio dispositivo; el que recibe un disparo responde agua, tocado o hundido.
// Al terminar se revelan las flotas y se comprueba que las respuestas fueron honestas.
(() => {
  const NV = window.Naval, esc = CG.esc, N = NV.N, SHIPS = NV.SHIPS, COL = 'ABCDEFGHIJ';
  const coord = (r, c) => COL[c] + (r + 1);
  CG.ICONS.batalla = '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M4 31h40l-6.500 9H11z"/><path d="M13 31v-9h13v9M26 31v-6h9v6" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M19.500 22v-7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4 44c5 0 5-2.500 10-2.500S19 44 24 44s5-2.500 10-2.500S39 44 44 44" fill="none" stroke="#ff6a4f" stroke-width="2.600" stroke-linecap="round"/></svg>';
  const isInt = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;


  // ---------------------------------------------------------------- dibujo 2D de barcos y efectos (SVG sobre la cuadrícula, 1 casilla = 1 unidad)
  const HULL = L => '<path class="hl" d="M.12 .2H' + (L - .42) + 'Q' + (L - .04) + ' .5 ' + (L - .42) + ' .8H.12Q.02 .5 .12 .2Z"/><path class="dk" d="M.22 .3H' + (L - .5) + 'Q' + (L - .24) + ' .5 ' + (L - .5) + ' .7H.22Z"/>';
  const TURRET = x => '<circle class="tr" cx="' + x + '" cy=".5" r=".16"/><path class="gun" d="M' + x + ' .5H' + (x + .36) + '"/>';
  const DECK = {
    portaaviones: L => '<rect class="rw" x=".3" y=".31" width="' + (L - .95) + '" height=".38" rx=".05"/><path class="lane" d="M.5 .5H' + (L - .75) + '"/><rect class="tw" x="' + (L - 1.9) + '" y=".16" width=".5" height=".17"/><path class="pl" d="M1 .5h.3M1.15 .4v.2M2 .5h.3M2.15 .4v.2"/>',
    acorazado: L => TURRET(.85) + TURRET(L - 1.45) + '<rect class="tw" x="1.5" y=".35" width=".55" height=".3" rx=".05"/><circle class="fn" cx="2.35" cy=".5" r=".09"/>',
    crucero: L => TURRET(.8) + '<rect class="tw" x="1.25" y=".35" width=".5" height=".3" rx=".05"/><circle class="fn" cx="2" cy=".5" r=".09"/>',
    destructor: L => '<rect class="tw" x=".6" y=".38" width=".4" height=".24" rx=".05"/><circle class="tr" cx="1.3" cy=".5" r=".1"/>',
  };
  function shipSvg(id, len, r, c, h, cls) {
    const body = id === 'submarino'
      ? '<rect class="sub" x=".1" y=".22" width="' + (len - .3) + '" height=".56" rx=".28"/><rect class="sub2" x="' + (len / 2 - .3) + '" y=".1" width=".5" height=".3" rx=".08"/><path class="per" d="M' + (len / 2 - .05) + ' .1V.02H' + (len / 2 + .15) + '"/><circle class="ph" cx=".7" cy=".5" r=".06"/><circle class="ph" cx="' + (len - .7) + '" cy=".5" r=".06"/>'
      : HULL(len) + DECK[id](len);
    return '<g class="bn-sg ' + cls + '" transform="' + (h ? 'translate(' + c + ' ' + r + ')' : 'translate(' + (c + 1) + ' ' + r + ') rotate(90)') + '">' + body + '</g>';
  }
  const shipGeo = cells => { const r = Math.min(...cells.map(x => x[0])), c = Math.min(...cells.map(x => x[1])); return { r, c, h: cells.length < 2 || cells[0][0] === cells[1][0] }; };
  const age = f => Date.now() - f.t;
  function fireSvg(r, c, freshHit) {
    return '<g transform="translate(' + (c + .5) + ' ' + (r + .5) + ')"><circle class="ember" r=".34"/><path class="flame" d="M0 -.4C.2 -.2 .28 0 .13 .2Q0 .32 -.13 .2C-.28 0 -.1 -.2 0 -.4Z"/><path class="flame2" d="M0 -.2C.1 -.07 .13 .04 .05 .15Q0 .19 -.05 .15C-.13 .04 -.04 -.07 0 -.2Z"/><circle class="smoke" cx=".05" cy="-.3" r=".13"/><circle class="smoke s2" cx="-.06" cy="-.3" r=".1"/>' +
      (freshHit ? '<circle class="boom" r=".5" style="animation-delay:-' + age(freshHit) + 'ms"/><circle class="boom ring" r=".5" style="animation-delay:-' + age(freshHit) + 'ms"/>' : '') + '</g>';
  }
  function splashSvg(r, c, fr) {
    return '<g transform="translate(' + (c + .5) + ' ' + (r + .5) + ')"><circle class="rip" r=".2"/><circle class="rip2" r=".08"/>' +
      (fr ? '<circle class="spl" r=".25" style="animation-delay:-' + age(fr) + 'ms"/><circle class="spl d2" r=".25" style="animation-delay:-' + age(fr) + 'ms"/>' : '') + '</g>';
  }

  CG.register('batalla', {
    start(ctx) {
      const root = ctx.root, online = ctx.online;
      let mine = new NV.Board(), phase = 'place', turn = null, sel = SHIPS[0].id, horiz = true, target = null, pending = null, over = false, msg = '';
      const enemy = Array.from({ length: N }, () => new Array(N).fill(0)), enemySunk = new Set(), fired = [], sunkShips = [];
      let fresh = null, shakeNext = false;
      let shotsFired = 0, hitsMade = 0, myReady = false, rivalReady = false, revealed = null, bot = null;
      if (!online) bot = { board: NV.Board.random(), shooter: new NV.Shooter(ctx.level) };

      root.innerHTML = '<div class="bn"><div class="bn-head" id="bnHead"></div><div class="bn-grid" id="bnMain" role="grid"></div><div class="cg-msg" id="bnMsg"></div><div class="bn-ctl" id="bnCtl"></div>' +
        '<div class="bn-info" id="bnMiniWrap" hidden><div class="bn-side"><div class="bn-label">Flota rival</div><div class="bn-fleet" id="bnFleet" aria-label="Flota rival"></div></div><div class="bn-mini"><div class="bn-label">Tu flota</div><div class="bn-grid mini" id="bnMini"></div></div></div></div>';
      const $ = s => root.querySelector(s);

      const shipIdx = id => SHIPS.findIndex(s => s.id === id);
      const WAVES = '<g class="bn-waves">' + [1.2, 3.2, 5.2, 7.2, 9.2].map((y, i) => '<path d="M-2 ' + y + 'q.5 -.22 1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0t1 0" style="animation-delay:-' + i * .6 + 's"/>').join('') + '</g>';
      function layer(side) {
        let sv = '';
        const mark = (r, c, v) => {
          const f = fresh && fresh.side === side && fresh.r === r && fresh.c === c && age(fresh) < 900 ? fresh : null;
          return v === 1 ? splashSvg(r, c, f) : v >= 2 ? fireSvg(r, c, f) : '';
        };
        if (side === 'mine') {
          mine.ships.forEach(sh => { sv += shipSvg(sh.id, sh.len, sh.r, sh.c, sh.h, sh.cells.every(x => mine.shots[x[0]][x[1]] === 2) ? 'sunk' : ''); });
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) sv += mark(r, c, mine.shots[r][c]);
        } else {
          if (revealed) revealed.ships.forEach(sh => { if (!sunkShips.some(x => x.id === sh.id)) sv += shipSvg(sh.id, sh.len, sh.r, sh.c, sh.h, 'rv'); });
          sunkShips.forEach(x => { const g = shipGeo(x.cells); sv += shipSvg(x.id, x.cells.length, g.r, g.c, g.h, 'sunk'); });
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) sv += mark(r, c, enemy[r][c]);
        }
        return '<svg class="bn-fx" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true">' + WAVES + sv + '</svg>';
      }
      const grid = (fn, side) => { let h = ''; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) h += '<div class="bc ' + fn(r, c) + '" data-r="' + r + '" data-c="' + c + '" role="gridcell" aria-label="' + coord(r, c) + '"></div>'; return h + layer(side); };
      const mineCell = (r, c) => {
        const s = mine.shipAt(r, c), sh = mine.shots[r][c];
        return (s ? 's sh' + shipIdx(s.id) : '') + (sh === 1 ? ' m' : sh === 2 ? ' h' : '');
      };
      const radarCell = (r, c) => {
        const v = enemy[r][c];
        let cl = v === 1 ? 'm' : v === 2 ? 'h' : v === 3 ? 'k' : '';
        if (!v && revealed && revealed.shipAt(r, c)) cl = 'rv';
        if (target && target[0] === r && target[1] === c) cl += ' t';
        return cl;
      };

      function render() {
        const head = $('#bnHead'), main = $('#bnMain'), ctl = $('#bnCtl'), mini = $('#bnMiniWrap');
        $('#bnMsg').textContent = msg;
        if (phase === 'place') {
          head.textContent = 'Coloca tu flota';
          main.className = 'bn-grid'; main.innerHTML = grid(mineCell, 'mine'); mini.hidden = true;
          ctl.innerHTML = '<div class="bn-tray">' + SHIPS.map(s => '<button class="bn-ship' + (mine.ships.some(x => x.id === s.id) ? ' done' : '') + (sel === s.id ? ' on' : '') + '" data-id="' + s.id + '"><span class="bl">' + '<u></u>'.repeat(s.len) + '</span><b>' + s.name + '</b></button>').join('') + '</div>' +
            '<div class="cg-actions"><button class="cg-btn ghost" id="bnRot">' + (horiz ? '↔ Horizontal' : '↕ Vertical') + '</button><button class="cg-btn ghost" id="bnRnd">Aleatoria</button></div>' +
            '<button class="cg-btn primary" id="bnReady"' + (mine.complete() ? '' : ' disabled') + '>' + (mine.complete() ? '¡Listo para la batalla!' : 'Coloca los 5 barcos') + '</button>';
          return;
        }
        if (phase === 'wait') {
          head.textContent = 'Flota lista';
          main.className = 'bn-grid'; main.innerHTML = grid(mineCell, 'mine'); mini.hidden = true;
          ctl.innerHTML = '<div class="cg-wait"><div class="cg-spin sm"></div><span>Esperando a ' + esc(ctx.rivalName) + '…</span></div>';
          return;
        }
        head.textContent = over ? 'Fin de la batalla' : turn === 'me' ? 'Tu turno · elige dónde disparar' : 'Turno de ' + ctx.rivalName;
        head.classList.toggle('mine', !over && turn === 'me');
        main.className = 'bn-grid radar' + (turn === 'me' && !over ? ' live' : ''); main.innerHTML = grid(radarCell, 'radar');
        $('#bnMini').innerHTML = grid(mineCell, 'mine'); mini.hidden = false;
        $('#bnFleet').innerHTML = SHIPS.map(s => '<span class="' + (enemySunk.has(s.id) ? 'x' : '') + '" title="' + s.name + '">' + '<u></u>'.repeat(s.len) + '</span>').join('');
        if (over) ctl.innerHTML = '';
        else if (turn === 'me') ctl.innerHTML = '<button class="cg-btn primary" id="bnFire"' + (target && !pending ? '' : ' disabled') + '>' + (pending ? 'Disparando…' : target ? '¡Fuego! ' + coord(target[0], target[1]) : 'Toca una casilla del radar') + '</button>';
        else ctl.innerHTML = '<div class="cg-wait"><div class="cg-spin sm"></div><span>' + esc(ctx.rivalName) + ' apunta…</span></div>';
        if (shakeNext) { shakeNext = false; main.classList.add('shake'); ctx.later(() => main.classList.remove('shake'), 450); }
      }

      // ---------------------------------------------------------------- colocación
      function autoNext() { const n = SHIPS.find(s => !mine.ships.some(x => x.id === s.id)); sel = n ? n.id : null; }
      function placeAt(r, c) {
        const s = mine.shipAt(r, c);
        if (!sel) { if (s) { sel = s.id; horiz = s.h; mine.remove(s.id); render(); } return; }
        const d = NV.shipDef(sel);
        if (s && s.id !== sel) { sel = s.id; horiz = s.h; mine.remove(s.id); render(); return; }
        const rr = horiz ? r : Math.min(r, N - d.len), cc = horiz ? Math.min(c, N - d.len) : c;
        if (!mine.place(sel, rr, cc, horiz)) { ctx.toast('Ahí no cabe: choca con otro barco'); return; }
        autoNext(); render();
      }
      function ready() {
        if (!mine.complete()) return;
        if (bot) { phase = 'battle'; turn = Math.random() < 0.5 ? 'me' : 'rival'; msg = turn === 'me' ? '¡Empiezas tú!' : ctx.rivalName + ' empieza.'; render(); if (turn === 'rival') ctx.later(botShoot, 900); return; }
        phase = 'wait'; myReady = true; ctx.send({ t: 'ready' }); maybeGo(); render();
      }
      function maybeGo() {
        if (ctx.isHost && myReady && rivalReady && phase === 'wait') { const first = Math.random() < 0.5 ? 'host' : 'guest'; ctx.send({ t: 'go', first }); begin(first === 'host' ? 'me' : 'rival'); }
      }
      function begin(t) { phase = 'battle'; turn = t; msg = t === 'me' ? '¡Empiezas tú!' : ctx.rivalName + ' empieza.'; render(); }

      // ---------------------------------------------------------------- batalla
      function fire(r, c) {
        if (phase !== 'battle' || turn !== 'me' || over || pending || enemy[r][c]) return;
        target = null; shotsFired++;
        if (bot) { handleResult(r, c, bot.board.receive(r, c)); return; }
        pending = [r, c]; ctx.send({ t: 'shot', r, c }); render();
      }
      function handleResult(r, c, o) {
        pending = null; fired.push({ r, c, res: o.res }); CG.fx(o.res === 'miss' ? 'splash' : 'boom'); fresh = { side: 'radar', r, c, t: Date.now() };
        if (o.res === 'miss') { enemy[r][c] = 1; msg = 'Disparaste a ' + coord(r, c) + ': ¡agua!'; }
        else {
          enemy[r][c] = 2; hitsMade++; msg = 'Disparaste a ' + coord(r, c) + ': ¡tocado!';
          if (o.res === 'sunk') { for (const [a, b] of o.cells) enemy[a][b] = 3; enemySunk.add(o.id); sunkShips.push({ id: o.id, cells: o.cells }); shakeNext = true; msg = '¡Hundiste el ' + NV.shipDef(o.id).name.toLowerCase() + ' de ' + ctx.rivalName + '!'; }
        }
        if (o.over) { endGame(true); return; }
        turn = 'rival'; render();
        if (bot) ctx.later(botShoot, 750 + Math.random() * 600);
      }
      function describeIn(r, c, o) {
        CG.fx(o.res === 'miss' ? 'splash' : 'boom'); fresh = { side: 'mine', r, c, t: Date.now() }; if (o.res === 'sunk') shakeNext = true;
        return ctx.rivalName + ' disparó a ' + coord(r, c) + ': ' + (o.res === 'miss' ? '¡agua!' : o.res === 'hit' ? '¡te tocó!' : '¡hundió tu ' + NV.shipDef(o.id).name.toLowerCase() + '!');
      }
      function botShoot() {
        if (over || turn !== 'rival') return;
        const p = bot.shooter.next(), o = mine.receive(p[0], p[1]);
        bot.shooter.feed(p[0], p[1], o.res, o.cells);
        msg = describeIn(p[0], p[1], o);
        if (o.over) { endGame(false); return; }
        turn = 'me'; render();
      }
      function endGame(win) {
        over = true; phase = 'battle'; target = null;
        if (online) ctx.send({ t: 'reveal', ships: mine.list() }); else if (!win) revealed = bot.board;
        render();
        const acc = shotsFired ? Math.round(100 * hitsMade / shotsFired) : 0;
        ctx.finish({ result: win ? 'win' : 'loss', title: win ? '¡Flota enemiga hundida!' : 'Tu flota fue hundida', sub: win ? 'Lo lograste en ' + shotsFired + ' disparos (' + acc + '% de acierto).' : ctx.rivalName + ' ganó esta vez. Acertaste el ' + acc + '% de tus disparos.', delay: 1400 });
      }

      // ---------------------------------------------------------------- toques
      $('#bnMain').onclick = e => {
        const el = e.target.closest('.bc'); if (!el) return;
        const r = +el.dataset.r, c = +el.dataset.c;
        if (phase === 'place') placeAt(r, c);
        else if (phase === 'battle' && turn === 'me' && !over && !pending) {
          if (enemy[r][c]) return;
          if (target && target[0] === r && target[1] === c) fire(r, c); else { target = [r, c]; render(); }
        }
      };
      $('#bnCtl').onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('bn-ship')) { sel = b.dataset.id; const s = mine.ships.find(x => x.id === sel); if (s) { horiz = s.h; mine.remove(sel); } render(); }
        else if (b.id === 'bnRot') { horiz = !horiz; render(); }
        else if (b.id === 'bnRnd') { mine = NV.Board.random(); sel = null; render(); }
        else if (b.id === 'bnReady') ready();
        else if (b.id === 'bnFire' && target) fire(target[0], target[1]);
      };

      // ---------------------------------------------------------------- red
      ctx.onmsg = m => {
        if (!m) return;
        if (m.t === 'ready') { rivalReady = true; maybeGo(); }
        else if (m.t === 'go' && phase === 'wait' && !ctx.isHost && (m.first === 'host' || m.first === 'guest')) begin(m.first === 'guest' ? 'me' : 'rival');
        else if (m.t === 'shot') {
          if (phase !== 'battle' || turn !== 'rival' || over || !isInt(m.r, 0, N - 1) || !isInt(m.c, 0, N - 1)) return;
          const o = mine.receive(m.r, m.c); if (!o) return;
          ctx.send({ t: 'res', r: m.r, c: m.c, res: o.res, id: o.id, cells: o.cells, over: !!o.over });
          msg = describeIn(m.r, m.c, o);
          if (o.over) { endGame(false); return; }
          turn = 'me'; render();
        } else if (m.t === 'res') {
          if (!pending || pending[0] !== m.r || pending[1] !== m.c || !['miss', 'hit', 'sunk'].includes(m.res)) return;
          let o = { res: m.res, over: !!m.over };
          if (m.res === 'sunk') {
            const d = NV.shipDef(m.id);
            if (!d || !Array.isArray(m.cells) || m.cells.length !== d.len || !m.cells.every(x => Array.isArray(x) && isInt(x[0], 0, N - 1) && isInt(x[1], 0, N - 1))) return;
            o.id = m.id; o.cells = m.cells;
          }
          handleResult(m.r, m.c, o);
        } else if (m.t === 'reveal') {
          const b = NV.Board.fromList(m.ships); if (!b) return;
          revealed = b; render();
          const cheat = fired.some(f => (f.res !== 'miss') !== !!b.shipAt(f.r, f.c));
          if (cheat) ctx.modal({ title: '¡Trampa detectada!', text: ctx.rivalName + ' respondió a algún disparo con una mentira. Su flota real no coincide con lo que te dijo.', buttons: [{ label: 'Entendido', cls: 'primary' }] });
        }
      };

      render();
    },
  });
})();
