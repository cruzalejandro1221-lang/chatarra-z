'use strict';
// Tres en raya: contra el bot (Fácil / Medio / Difícil) o online por enlace. Se alternan quién empieza en cada revancha.
(() => {
  const esc = CG.esc;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const winLine = (b, s) => LINES.find(l => l.every(i => b[i] === s)) || null;
  const full = b => b.every(Boolean);
  const free = b => b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  const other = s => (s === 'X' ? 'O' : 'X');

  // Minimax completo (el bot Difícil no pierde). Devuelve la puntuación para "me".
  function minimax(b, turn, me, depth) {
    if (winLine(b, me)) return 10 - depth;
    if (winLine(b, other(me))) return depth - 10;
    if (full(b)) return 0;
    let best = turn === me ? -99 : 99;
    for (const i of free(b)) {
      b[i] = turn; const v = minimax(b, other(turn), me, depth + 1); b[i] = null;
      best = turn === me ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }
  function bestMove(b, me) {
    let bestV = -99, moves = [];
    for (const i of free(b)) {
      b[i] = me; const v = minimax(b, other(me), me, 1); b[i] = null;
      if (v > bestV) { bestV = v; moves = [i]; } else if (v === bestV) moves.push(i);
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }
  // Fácil: casi siempre al azar, a veces ve un tres en raya. Medio: gana o bloquea y, si no, juega bien el centro y las esquinas.
  function botMove(b, me, level) {
    const f = free(b), rand = () => f[Math.floor(Math.random() * f.length)];
    const tryWin = s => f.find(i => { b[i] = s; const w = !!winLine(b, s); b[i] = null; return w; });
    if (level === 0) { if (Math.random() < 0.3) { const w = tryWin(me); if (w !== undefined) return w; } return rand(); }
    if (level === 1) {
      if (Math.random() < 0.2) return rand();
      const w = tryWin(me); if (w !== undefined) return w;
      const bl = tryWin(other(me)); if (bl !== undefined) return bl;
      const pref = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter(i => f.includes(i)); return pref[0];
    }
    return bestMove(b, me);
  }

  const X_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 9L31 31M31 9L9 31" fill="none" stroke="#2f6fe4" stroke-width="6.5" stroke-linecap="round"/></svg>';
  const O_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="#ff7a1a" stroke-width="6.5"/></svg>';

  CG.register('tresenraya', {
    start(ctx) {
      const root = ctx.root, me = (ctx.isHost === (ctx.round % 2 === 0)) ? 'X' : 'O', op = other(me);    // 'X' siempre empieza
      const b = Array(9).fill(null); let turn = 'X', over = false, line = null, locked = false;
      root.innerHTML = '<div class="ttt"><div class="cg-player" id="tTop"></div><div class="ttt-board" id="tBoard" role="grid" aria-label="Tablero de tres en raya"></div><div class="cg-player" id="tMe"></div><div class="cg-msg" id="tMsg"></div></div>';
      const $ = s => root.querySelector(s), board = $('#tBoard');
      const bar = (name, sym, you) => '<span class="av">' + esc(name[0] || '?').toUpperCase() + '</span><span class="nm">' + esc(name) + (you ? ' (tú)' : '') + '</span><span class="sub ttt-sym">' + (sym === 'X' ? X_SVG : O_SVG) + '</span>';
      function draw() {
        board.innerHTML = b.map((v, i) => '<button class="tc ' + (v ? 'f ' : '') + (line && line.includes(i) ? 'w' : '') + '" data-i="' + i + '" role="gridcell" aria-label="Casilla ' + (i + 1) + (v ? ', ' + v : '') + '"' + (v || over ? ' disabled' : '') + '>' + (v === 'X' ? X_SVG : v === 'O' ? O_SVG : '') + '</button>').join('');
        $('#tTop').innerHTML = bar(ctx.rivalName, op, false); $('#tMe').innerHTML = bar(ctx.name, me, true);
        $('#tTop').classList.toggle('turn', !over && turn === op); $('#tMe').classList.toggle('turn', !over && turn === me);
        $('#tMsg').textContent = over ? '' : turn === me ? 'Tu turno' : 'Turno de ' + ctx.rivalName;
      }
      function finish() {
        const w = winLine(b, 'X') ? 'X' : winLine(b, 'O') ? 'O' : null;
        if (!w && !full(b)) return false;
        over = true; line = w ? winLine(b, w) : null; draw();
        if (!w) ctx.finish({ result: 'draw', title: 'Empate', sub: 'Nadie logró tres en raya.' });
        else if (w === me) ctx.finish({ result: 'win', title: '¡Tres en raya!', sub: 'Ganaste la partida.' });
        else ctx.finish({ result: 'loss', title: 'Perdiste', sub: ctx.rivalName + ' hizo tres en raya.' });
        return true;
      }
      function play(i, who) {
        if (over || b[i] || turn !== who) return false;
        b[i] = who; turn = other(who); CG.fx('move'); draw();
        if (finish()) return true;
        if (!ctx.online && turn === op) { locked = true; ctx.later(() => { locked = false; const m = botMove(b, op, ctx.level); if (m !== undefined) play(m, op); }, 450 + Math.random() * 350); }
        return true;
      }
      board.onclick = e => {
        const c = e.target.closest('.tc'); if (!c || over || locked || turn !== me) return;
        const i = +c.dataset.i;
        if (play(i, me) && ctx.online) ctx.send({ t: 'mv', c: i });
      };
      ctx.onmsg = m => {
        if (!m || m.t !== 'mv' || over) return;
        const i = m.c;
        if (!Number.isInteger(i) || i < 0 || i > 8 || b[i] || turn !== op) return;       // datos de la red: se validan
        play(i, op);
      };
      draw();
      if (!ctx.online && turn === op) { locked = true; ctx.later(() => { locked = false; play(botMove(b, op, ctx.level), op); }, 600); }
    },
  });
})();
