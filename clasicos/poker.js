'use strict';
// Póker (Texas Hold'em 1 contra 1): mesa táctil, bot de 3 niveles y partida online. Reglas y bot en poker-engine.js.
// Online: el anfitrión lleva las reglas y reparte; al invitado solo le llegan sus cartas y lo que se ve en la mesa.
(() => {
  const PK = window.Poker, esc = CG.esc;
  const STACK = 600;
  const SUIT = ['♠', '♥', '♦', '♣'], RK = '23456789TJQKA';
  const fmt = n => Number(n).toLocaleString('es');
  const rankCh = c => { const r = RK[c >> 2]; return r === 'T' ? '10' : r; };
  const card = (c, cls) => '<div class="pcard ' + ((c & 3) === 1 || (c & 3) === 2 ? 'red ' : '') + (cls || '') + '"><b>' + rankCh(c) + '</b><i>' + SUIT[c & 3] + '︎</i></div>';
  const back = cls => '<div class="pcard back ' + (cls || '') + '"></div>';
  CG.ICONS.poker = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="8" width="22" height="31" rx="3.5" fill="currentColor" transform="rotate(-12 17 23)"/><rect x="19" y="9" width="22" height="31" rx="3.5" fill="#f6eedf" stroke="currentColor" stroke-width="2.4" transform="rotate(9 30 24)"/><path d="M30 33.5c-4-3-6-5-6-7.5a3.2 3.2 0 0 1 6-1.4 3.2 3.2 0 0 1 6 1.4c0 2.500-2 4.500-6 7.500z" fill="#ff6a4f" transform="rotate(9 30 24)"/></svg>';
  const STREETS = ['Preflop', 'Flop', 'Turn', 'River', 'Showdown'];

  CG.register('poker', {
    start(ctx) {
      const root = ctx.root, online = ctx.online, seat = ctx.isHost ? 0 : 1;
      let eng = null, view = null, rdy = [false, false], pressed = -1, raising = false, raiseTo = 0, finished = false;
      const mem = {};
      root.innerHTML = '<div class="pk"><div class="pk-info" id="pkInfo"></div><div class="cg-player" id="pkOpp"></div><div class="pk-cards opp" id="pkOppCards"></div>' +
        '<div class="pk-table"><div class="pk-bet" id="pkBetOpp"></div><div class="pk-board" id="pkBoard"></div><div class="pk-pot" id="pkPot"></div><div class="pk-bet me" id="pkBetMe"></div></div>' +
        '<div class="cg-msg" id="pkMsg"></div><div class="pk-cards me" id="pkMyCards"></div><div class="cg-player" id="pkMe"></div><div class="pk-act" id="pkAct"></div></div>';
      const $ = s => root.querySelector(s);

      // ---------------------------------------------------------------- pintar
      const bar = (name, st, you, isBtn, v) => '<span class="av">' + esc(name[0] || '?').toUpperCase() + '</span><span class="nm">' + esc(name) + (you ? ' (tú)' : '') + '</span>' +
        (isBtn ? '<span class="dlr" title="Repartidor">D</span>' : '') + '<span class="sub"><span class="chips-ico"></span>' + fmt(st) + (v ? ' <em>' + v + '</em>' : '') + '</span>';
      function actText(l) {
        if (!l) return '';
        const who = l.who === 'you' ? 'Tú' : ctx.rivalName, s = l.who === 'you' ? '' : 's';
        switch (l.a) {
          case 'fold': return who + (l.who === 'you' ? ' te retiras' : ' se retira');
          case 'check': return who + (l.who === 'you' ? ' pasas' : ' pasa');
          case 'call': return who + (l.who === 'you' ? ' igualas ' : ' iguala ') + fmt(l.amt) + (l.allin ? ' (all-in)' : '');
          default: return who + (l.who === 'you' ? ' subes a ' : ' sube a ') + fmt(l.amt) + (l.allin ? ' (all-in)' : '');
        }
      }
      function render() {
        const v = view; if (!v) return;
        $('#pkInfo').textContent = 'Mano ' + v.hand + ' · Ciegas ' + v.blinds[0] + '/' + v.blinds[1] + ' · ' + STREETS[Math.min(4, v.street)];
        const oppTag = v.folded[1] ? 'Retirado' : v.allin[1] ? 'All-in' : '', meTag = v.folded[0] ? 'Retirado' : v.allin[0] ? 'All-in' : '';
        $('#pkOpp').innerHTML = bar(ctx.rivalName, v.stack[1], false, v.button === 'opp', oppTag);
        $('#pkMe').innerHTML = bar(ctx.name, v.stack[0], true, v.button === 'you', meTag);
        $('#pkOpp').classList.toggle('turn', v.cur === 'opp'); $('#pkMe').classList.toggle('turn', v.cur === 'you');
        $('#pkOppCards').innerHTML = v.oppHole ? v.oppHole.map(c => card(c, 'show')).join('') : (v.folded[1] ? '' : back() + back());
        $('#pkMyCards').innerHTML = v.folded[0] ? v.hole.map(c => card(c, 'dim')).join('') : v.hole.map(c => card(c)).join('');
        let b = ''; for (let i = 0; i < 5; i++) b += v.board[i] !== undefined ? card(v.board[i], 'tab') : '<div class="pcard slot"></div>';
        $('#pkBoard').innerHTML = b;
        $('#pkPot').textContent = 'Bote ' + fmt(v.pot);
        $('#pkBetOpp').innerHTML = v.bet[1] ? '<span>' + fmt(v.bet[1]) + '</span>' : ''; $('#pkBetMe').innerHTML = v.bet[0] ? '<span>' + fmt(v.bet[0]) + '</span>' : '';
        let m = '';
        if (v.over) {
          const o = v.over;
          if (o.winner === null) m = 'Empate: se reparte el bote';
          else if (o.reason === 'fold') m = o.winner === 'you' ? 'Ganas ' + fmt(o.pot) + ' · ' + ctx.rivalName + ' se retiró' : ctx.rivalName + ' gana ' + fmt(o.pot) + ' · te retiraste';
          else m = (o.winner === 'you' ? 'Ganas ' : ctx.rivalName + ' gana ') + fmt(o.pot) + ' · ' + (o.winner === 'you' ? o.you + ' vence a ' + o.opp : o.opp + ' vence a ' + o.you);
        } else m = actText(v.last) || (v.cur === 'you' ? 'Te toca' : '');
        $('#pkMsg').textContent = m;
        $('#pkMsg').classList.toggle('won', !!v.over && v.over.winner === 'you');
        actions();
      }
      function actions() {
        const v = view, A = $('#pkAct');
        if (v.matchOver) { A.innerHTML = ''; return; }
        if (v.over) {
          const waiting = pressed === v.hand;
          A.innerHTML = waiting ? '<div class="cg-wait"><div class="cg-spin sm"></div><span>Esperando a ' + esc(ctx.rivalName) + '…</span></div>' : '<button class="cg-btn primary" id="pkNext">Siguiente mano</button>';
          const n = $('#pkNext'); if (n) n.onclick = () => nextHand();
          return;
        }
        const L = v.legal;
        if (v.cur !== 'you' || !L) { A.innerHTML = '<div class="cg-wait"><div class="cg-spin sm"></div><span>' + (online ? 'Turno de ' + esc(ctx.rivalName) : esc(ctx.rivalName) + ' está pensando…') + '</span></div>'; raising = false; return; }
        if (raising && L.raise) { raisePanel(L, v); return; }
        raising = false;
        A.innerHTML = '<div class="pk-btns">' + (L.fold ? '<button class="cg-btn ghost" data-a="fold">Retirarme</button>' : '') +
          (L.check ? '<button class="cg-btn ghost" data-a="check">Pasar</button>' : '<button class="cg-btn ghost" data-a="call">Igualar ' + fmt(L.call) + '</button>') +
          (L.raise ? '<button class="cg-btn primary" data-a="raise">' + (v.bet[0] + v.bet[1] > 0 ? 'Subir' : 'Apostar') + '</button>' : '') + '</div>';
        A.querySelector('.pk-btns').onclick = e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.a === 'raise') { raising = true; raiseTo = L.raise.min; render(); } else act(b.dataset.a);
        };
      }
      function raisePanel(L, v) {
        const mx = Math.max(v.bet[0], v.bet[1]), pot = v.pot, sb = v.blinds[0];
        const to = f => Math.max(L.raise.min, Math.min(L.raise.max, Math.round((mx + f * (pot + L.call)) / sb) * sb));
        raiseTo = Math.max(L.raise.min, Math.min(L.raise.max, raiseTo));
        const A = $('#pkAct');
        A.innerHTML = '<div class="pk-raise"><div class="pk-presets"><button data-v="' + L.raise.min + '">Mín</button><button data-v="' + to(0.5) + '">½ bote</button><button data-v="' + to(1) + '">Bote</button><button data-v="' + L.raise.max + '">Todo</button></div>' +
          '<input type="range" id="pkRange" min="' + L.raise.min + '" max="' + L.raise.max + '" step="' + (L.raise.max - L.raise.min >= sb ? sb : 1) + '" value="' + raiseTo + '" aria-label="Cantidad">' +
          '<div class="cg-btnrow row"><button class="cg-btn ghost" id="pkCancel">Atrás</button><button class="cg-btn primary" id="pkGo"></button></div></div>';
        const rg = $('#pkRange'), go = $('#pkGo');
        const label = () => { go.textContent = (raiseTo >= L.raise.max ? 'All-in ' : (mx > 0 ? 'Subir a ' : 'Apostar ')) + fmt(raiseTo); };
        label();
        rg.oninput = () => { raiseTo = +rg.value; label(); };
        A.querySelector('.pk-presets').onclick = e => { const b = e.target.closest('button'); if (!b) return; raiseTo = +b.dataset.v; rg.value = raiseTo; label(); };
        $('#pkCancel').onclick = () => { raising = false; render(); };
        go.onclick = () => { raising = false; act('raise', raiseTo); };
      }

      // ---------------------------------------------------------------- reglas (anfitrión / bot)
      function newMatch() {
        eng = new PK.Hold({ stack: STACK, button: ctx.round % 2, rng: Math.random });
        rdy = [false, false]; pressed = -1; finished = false;
        sync();
      }
      function sync() {
        view = eng.view(seat);
        if (online) ctx.send({ t: 'v', v: eng.view(1) });
        render();
        if (eng.over) afterHand();
        else if (!online && eng.cur === 1) ctx.later(botMove, 650 + Math.random() * 900 + (ctx.level === 2 ? 300 : 0));
      }
      function botMove() {
        if (!eng || eng.over || eng.cur !== 1) return;
        const d = PK.botDecide(eng, 1, ctx.level, mem);
        if (d && eng.act(1, d.a, d.amt)) sync(); else { eng.act(1, eng.legal(1).check ? 'check' : 'call'); sync(); }
      }
      function afterHand() {
        if (eng.matchOver !== null && !finished) { finished = true; endMatch(eng.view(seat).matchOver); return; }
        if (!online && !finished) { /* el jugador toca "Siguiente mano" */ }
      }
      function endMatch(w) {
        const youWin = w === 'you';
        ctx.finish({ result: youWin ? 'win' : 'loss', title: youWin ? '¡Te quedaste con todas las fichas!' : 'Te quedaste sin fichas', sub: youWin ? 'Ganaste la partida.' : ctx.rivalName + ' ganó esta vez.', delay: 2200 });
      }
      function act(a, amt) {
        const v = view; if (!v || v.cur !== 'you') return;
        if (!ctx.isHost && online) { ctx.send({ t: 'act', a, amt }); view.cur = 'opp'; view.legal = null; render(); return; }
        const facing = eng.legal(0) && eng.legal(0).call > 0;
        if (eng.act(0, a, amt)) { if (!online) PK.trackOpp(mem, a, facing); sync(); }
      }
      function nextHand() {
        const v = view; if (!v || !v.over || v.matchOver) return;
        pressed = v.hand;
        if (online && !ctx.isHost) { ctx.send({ t: 'next' }); render(); return; }
        rdy[0] = true;
        if (!online) rdy[1] = true;
        if (rdy[0] && rdy[1]) startNext(); else render();
      }
      function startNext() { rdy = [false, false]; pressed = -1; eng.newHand(); sync(); }

      ctx.onmsg = m => {
        if (!m) return;
        if (ctx.isHost) {
          if (m.t === 'act' && eng && eng.cur === 1 && typeof m.a === 'string') { if (eng.act(1, m.a, m.amt)) sync(); else ctx.send({ t: 'v', v: eng.view(1) }); }
          else if (m.t === 'next' && eng && eng.over && !eng.matchOver) { rdy[1] = true; if (rdy[0]) startNext(); }
        } else if (m.t === 'v' && m.v && Array.isArray(m.v.stack) && Array.isArray(m.v.hole)) {
          const prev = view; view = m.v;
          if (!prev || prev.hand !== view.hand) { pressed = -1; raising = false; }
          render();
          if (view.matchOver && !finished) { finished = true; endMatch(view.matchOver); }
        }
      };
      ctx.onresume = () => { if (ctx.isHost && eng) ctx.send({ t: 'v', v: eng.view(1) }); };

      if (ctx.isHost) newMatch(); else { $('#pkMsg').textContent = 'Repartiendo…'; }
    },
  });
})();
