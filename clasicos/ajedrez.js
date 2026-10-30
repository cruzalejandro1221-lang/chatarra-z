'use strict';
// Ajedrez: tablero táctil, bot de 3 niveles (Worker) y partida online. Reglas y bot en chess-engine.js.
(() => {
  const C = window.Chess, esc = CG.esc;
  const INIT = { 1: 8, 2: 2, 3: 2, 4: 2, 5: 1 };
  const VAL = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9 };
  const SHAPES = {
    1: '<path d="M22.5 8.5a5.3 5.3 0 0 0-2.9 9.7c-3.1 1.6-5.1 4.7-5.1 8.3 0 2.2.9 4.1 2.2 5.5-3 1.2-5.2 4-5.2 7.500h22c0-3.500-2.200-6.300-5.200-7.500 1.300-1.400 2.200-3.300 2.200-5.500 0-3.600-2-6.700-5.100-8.300a5.300 5.300 0 0 0-2.900-9.700z"/>',
    2: '<path d="M13.500 39.500c-.5-9 1.500-14.800 6-18.500-2-.3-3.800.2-5.500 1.600L12.500 19c2.500-3 5-5.500 6.500-9l.5-3.200 3.700 2c9-.5 16 6.700 15.300 19.200-.2 3.400-.5 6.800-.5 9.500z"/><circle cx="19.500" cy="14.500" r="1.300" fill="var(--ps)"/><path d="M25 12.500c5 1.500 8 6.500 8.500 13.500" fill="none" stroke="var(--pd)"/>',
    3: '<path d="M12 39.500c3.700-1.900 6.500-1.500 10.500 0 4-1.500 6.800-1.900 10.500 0v-3.500H12z"/><path d="M15 36c0-5.500 1.500-8.500 4.200-11-3-2.500-5-5.500-5-9.500 0-4.200 3.200-7.500 8.300-10 5.100 2.500 8.300 5.800 8.300 10 0 4-2 7-5 9.500 2.700 2.500 4.200 5.500 4.200 11z"/><circle cx="22.500" cy="6.500" r="2.600"/><path d="M22.500 14.500v8M18.500 18.500h8" fill="none" stroke="var(--pd)" stroke-width="1.900"/>',
    4: '<path d="M10.500 39.500h24v-4h-24z"/><path d="M13 35.500l1.500-4.500v-14h16v14l1.500 4.500z"/><path d="M11 17v-7h4v2.500h4V10h7v2.500h4V10h4v7z"/>',
    5: '<path d="M10.500 39.500h24v-4h-24z"/><path d="M11.500 35.500L8 14.500l5.200 10.500 2.300-13.500 4 13 3-15 3 15 4-13 2.300 13.500L37 14.500l-3.500 21z"/><circle cx="8" cy="13" r="2.300"/><circle cx="15.500" cy="10" r="2.300"/><circle cx="22.500" cy="8" r="2.300"/><circle cx="29.500" cy="10" r="2.300"/><circle cx="37" cy="13" r="2.300"/>',
    6: '<path d="M22.5 3.5v9M18.3 7.2h8.4" fill="none" stroke-width="2.8"/><path d="M10.5 39.5h24v-4h-24z"/><path d="M22.5 12.5c-5 0-8.5 3.4-8.5 7.5 0 2.4 1.2 4 2.6 5.2C12.2 27.2 8.5 31 8.5 35.5h28c0-4.5-3.7-8.3-8.1-10.3 1.4-1.2 2.6-2.8 2.6-5.2 0-4.1-3.5-7.5-8.5-7.5z"/><path d="M14.5 21.5c2.5 1.3 5 1.8 8 1.8s5.5-.5 8-1.8" fill="none" stroke="var(--pd)" stroke-width="1.5"/>',
  };
  const sprite = () => {
    if (document.getElementById('chSprite')) return;
    const el = document.createElement('div');
    el.innerHTML = '<svg id="chSprite" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      Object.keys(SHAPES).map(k => '<symbol id="ch-' + k + '" viewBox="0 0 45 45"><g fill="var(--pf)" stroke="var(--ps)" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">' + SHAPES[k] + '</g></symbol>').join('') + '</defs></svg>';
    document.body.append(el.firstChild);
  };
  CG.ICONS.ajedrez = '<svg viewBox="0 0 45 45" fill="currentColor" stroke="none" aria-hidden="true">' + SHAPES[2].replace(/var\(--ps\)/g, '#15101f').replace(/var\(--pd\)/g, '#15101f') + '</svg>';
  const piece = (p, cls) => '<svg class="pc ' + (p & 8 ? 'b' : 'w') + (cls ? ' ' + cls : '') + '" viewBox="0 0 45 45" aria-hidden="true"><use href="#ch-' + (p & 7) + '"/></svg>';
  const WHY = { ahogado: 'Rey ahogado: sin jugadas legales.', material: 'Material insuficiente para dar mate.', 50: 'Regla de las 50 jugadas.', repeticion: 'La posición se repitió tres veces.' };

  CG.register('ajedrez', {
    start(ctx) {
      sprite();
      const root = ctx.root;
      const me = (ctx.isHost === (ctx.round % 2 === 0)) ? 0 : 1;      // el anfitrión (o tú contra el bot) juega blancas en rondas pares
      const g = new C.Game(), hist = [];
      let sel = null, targets = new Map(), legal = g.legalMoves(), last = null, over = false, thinking = false, reqId = 0, pending = null, worker = null;

      root.innerHTML = '<div class="ch"><div class="cg-player" id="chTop"></div><div class="ch-wrap"><div class="ch-board" id="chBoard" role="grid" aria-label="Tablero de ajedrez"></div></div><div class="cg-player" id="chMe"></div><div class="cg-msg" id="chMsg"></div>' +
        '<div class="cg-actions"><button class="cg-btn ghost" id="chResign">Rendirme</button>' + (ctx.online ? '<button class="cg-btn ghost" id="chDraw">Proponer tablas</button>' : '') + '</div></div>';
      const $ = s => root.querySelector(s), board = $('#chBoard');

      if (!ctx.online) {
        try {
          worker = new Worker('clasicos/chess-worker.js');
          worker.onmessage = e => { if (pending && pending.id === e.data.id) { const p = pending; pending = null; p.res(e.data.move); } };
          worker.onerror = () => { try { worker.terminate(); } catch (e) { /* nada */ } worker = null; if (pending) { const p = pending; pending = null; inline(p.moves, p.res); } };
        } catch (e) { worker = null; }
        ctx.onCleanup(() => { if (worker) try { worker.terminate(); } catch (e) { /* nada */ } });
      }
      function inline(moves, res) {
        setTimeout(() => { const gg = new C.Game(); moves.forEach(u => gg.playUCI(u)); const m = C.best(gg, ctx.level); res(m ? C.uci(m) : ''); }, 30);
      }
      function ask(id) {
        return new Promise(res => {
          const moves = hist.slice();
          if (worker) { pending = { id, moves, res }; worker.postMessage({ id, moves, level: ctx.level }); } else inline(moves, res);
        });
      }

      function captured() {
        const cnt = [{}, {}];
        for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = g.b[s]; if (p && (p & 7) !== 6) cnt[p >> 3][p & 7] = (cnt[p >> 3][p & 7] || 0) + 1; }
        const miss = [[], []], mat = [0, 0];
        for (const c of [0, 1]) for (const t of [5, 4, 3, 2, 1]) { const n = Math.max(0, INIT[t] - (cnt[c][t] || 0)); for (let i = 0; i < n; i++) { miss[c].push(t | (c << 3)); mat[c] += VAL[t]; } }
        return { miss, mat };
      }
      function bars() {
        const { miss, mat } = captured(), you = me, rv = me ^ 1;
        const bar = (c, name, lost, diff, turn) => '<span class="av">' + esc(name[0] || '?').toUpperCase() + '</span><span class="nm">' + esc(name) + (c === me ? ' (tú)' : '') + '</span><span class="sub">' +
          lost.map(p => '<svg class="mini ' + (p & 8 ? 'b' : 'w') + '" viewBox="0 0 45 45"><use href="#ch-' + (p & 7) + '"/></svg>').join('') + (diff > 0 ? '<b>+' + diff + '</b>' : '') + '</span>';
        $('#chTop').innerHTML = bar(rv, ctx.rivalName, miss[you], mat[you] - mat[rv]);
        $('#chMe').innerHTML = bar(you, ctx.name, miss[rv], mat[rv] - mat[you]);
        $('#chTop').classList.toggle('turn', !over && g.turn === rv); $('#chMe').classList.toggle('turn', !over && g.turn === you);
      }
      function draw() {
        const flip = me === 1, st = over ? null : g.inCheck(), ksq = g.ks[g.turn];
        let h = '';
        for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
          const rank = flip ? r : 7 - r, file = flip ? 7 - f : f, s = rank * 16 + file, p = g.b[s];
          let cl = 'sq ' + ((rank + file) % 2 === 0 ? 'd' : 'l');
          if (sel === s) cl += ' sel';
          if (last && (last.from === s || last.to === s)) cl += ' last';
          if (st && s === ksq) cl += ' chk';
          if (targets.has(s)) cl += targets.get(s) ? ' cap' : ' tgt';
          h += '<div class="' + cl + '" data-s="' + s + '" role="gridcell" aria-label="' + C.sqName(s) + '">' + (p ? piece(p) : '') +
            (f === 0 ? '<i class="rk">' + (rank + 1) + '</i>' : '') + (r === 7 ? '<i class="fl">' + 'abcdefgh'[file] + '</i>' : '') + '</div>';
        }
        board.innerHTML = h; bars();
      }
      function msg(t) { $('#chMsg').textContent = t || ''; }
      function status() {
        if (over) return;
        if (thinking) { msg('Pensando…'); return; }
        const chk = g.inCheck();
        msg((g.turn === me ? 'Tu turno' : 'Turno de ' + ctx.rivalName) + (chk ? ' · ¡Jaque!' : ''));
      }

      function finish(st) {
        over = true; sel = null; targets = new Map(); draw();
        if (st.winner === null) { msg('Tablas'); ctx.finish({ result: 'draw', title: 'Tablas', sub: WHY[st.why] || '' }); }
        else if (st.winner === me) { msg('¡Jaque mate!'); ctx.finish({ result: 'win', title: '¡Jaque mate!', sub: 'Ganaste la partida.' }); }
        else { msg('Jaque mate'); ctx.finish({ result: 'loss', title: 'Jaque mate', sub: ctx.rivalName + ' ganó esta vez.' }); }
      }
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      function slide(from, to) {
        const a = board.querySelector('[data-s="' + from + '"]'), b = board.querySelector('[data-s="' + to + '"]'), pc = b && b.querySelector('.pc');
        if (calm || !a || !pc || !pc.animate) return;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        pc.style.zIndex = 5;
        pc.animate([{ transform: 'translate(' + (ra.left - rb.left) + 'px,' + (ra.top - rb.top) + 'px)' }, { transform: 'none' }], { duration: 190, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => { pc.style.zIndex = ''; };
      }
      function apply(m) {
        const d = C.dec(m), took = !!g.b[d.to] || (d.flags & 1);
        g.play(m); hist.push(C.uci(m)); last = { from: d.from, to: d.to }; sel = null; targets = new Map();
        legal = g.legalMoves(); draw(); slide(d.from, d.to);
        CG.fx(took ? 'capture' : 'move');
        const st = g.status();
        if (st.over) { finish(st); return; }
        status();
        if (!ctx.online && g.turn !== me) botTurn();
      }
      function botTurn() {
        thinking = true; status();
        const id = ++reqId, t0 = Date.now();
        ask(id).then(u => {
          ctx.later(() => {
            if (id !== reqId || !thinking || over) return;
            thinking = false;
            const m = legal.find(x => C.uci(x) === u) || legal[0];
            if (m) apply(m);
          }, Math.max(0, 500 - (Date.now() - t0)));
        });
      }
      function pick(s) {
        sel = s; targets = new Map();
        for (const m of legal) { const d = C.dec(m); if (d.from === s) targets.set(d.to, (d.flags & 1) ? 1 : 0); }
        draw();
      }
      function tryMove(to) {
        const cands = legal.filter(m => { const d = C.dec(m); return d.from === sel && d.to === to; });
        if (!cands.length) return;
        if (cands.length > 1) {
          const dlg = ctx.modal({ title: 'Corona tu peón', html: '<div class="ch-promo">' + [5, 4, 3, 2].map(t => '<button data-t="' + t + '" aria-label="' + ['', '', 'Caballo', 'Alfil', 'Torre', 'Dama'][t] + '">' + piece(t | (me << 3)) + '</button>').join('') + '</div>', buttons: [] });
          dlg.querySelector('.ch-promo').onclick = e => {
            const b = e.target.closest('button'); if (!b) return;
            ctx.closeModal();
            const m = cands.find(x => C.dec(x).promo === +b.dataset.t);
            if (m) send(m);
          };
          return;
        }
        send(cands[0]);
      }
      function send(m) {
        if (ctx.online) ctx.send({ t: 'mv', m: C.uci(m) });
        apply(m);
      }
      board.onclick = e => {
        const sq = e.target.closest('.sq'); if (!sq || over || thinking || g.turn !== me) return;
        const s = +sq.dataset.s, p = g.b[s];
        if (sel !== null && targets.has(s)) { tryMove(s); return; }
        if (p && (p >> 3) === me && s !== sel) pick(s);
        else { sel = null; targets = new Map(); draw(); }
      };
      $('#chResign').onclick = () => {
        if (over) return;
        ctx.modal({ title: '¿Rendirte?', text: 'Darás la partida por perdida.', buttons: [{ label: 'Seguir', cls: 'ghost' }, { label: 'Rendirme', cls: 'danger', fn: () => { if (ctx.online) ctx.send({ t: 'resign' }); over = true; reqId++; thinking = false; draw(); msg('Te rendiste'); ctx.finish({ result: 'loss', title: 'Te rendiste', sub: '', delay: 400 }); } }] });
      };
      const dr = $('#chDraw');
      if (dr) dr.onclick = () => { if (over) return; ctx.send({ t: 'draw' }); ctx.toast('Propuesta de tablas enviada'); };

      ctx.onmsg = m => {
        if (!m || over) return;
        if (m.t === 'mv') {
          if (typeof m.m !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m.m) || g.turn === me) return;
          const mv = legal.find(x => C.uci(x) === m.m);
          if (!mv) { ctx.toast('Jugada inválida del rival'); return; }
          apply(mv);
        } else if (m.t === 'resign') {
          over = true; draw(); msg(ctx.rivalName + ' se rindió'); ctx.finish({ result: 'win', title: '¡Ganas!', sub: ctx.rivalName + ' se rindió.', delay: 400 });
        } else if (m.t === 'draw') {
          ctx.modal({ title: 'Propuesta de tablas', text: ctx.rivalName + ' ofrece tablas.', buttons: [
            { label: 'Aceptar', cls: 'primary', fn: () => { ctx.send({ t: 'drawok' }); over = true; draw(); msg('Tablas'); ctx.finish({ result: 'draw', title: 'Tablas', sub: 'Acordadas entre los dos.', delay: 300 }); } },
            { label: 'Rechazar', cls: 'ghost', fn: () => ctx.send({ t: 'drawno' }) }] });
        } else if (m.t === 'drawok') {
          over = true; draw(); msg('Tablas'); ctx.finish({ result: 'draw', title: 'Tablas', sub: 'Acordadas entre los dos.', delay: 300 });
        } else if (m.t === 'drawno') ctx.toast(ctx.rivalName + ' rechazó las tablas');
      };

      draw(); status();
      if (!ctx.online && g.turn !== me) botTurn();
    },
  });
})();
