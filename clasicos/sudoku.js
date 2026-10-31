'use strict';
// Sudoku: tablero generado al momento con solución única. Notas, borrar, deshacer, pista y errores resaltados.
(() => {
  const CLUES = [40, 32, 26];                       // pistas iniciales: Fácil / Medio / Difícil
  const ROW = i => (i / 9) | 0, COL = i => i % 9, BOX = i => ((ROW(i) / 3) | 0) * 3 + ((COL(i) / 3) | 0);
  const PEERS = Array.from({ length: 81 }, (_, i) => { const s = []; for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) s.push(j); return s; });
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Resolutor con máscaras de bits y la casilla con menos candidatos primero. Cuenta soluciones hasta "limit".
  function solve(g, limit, randomize) {
    const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
    for (let i = 0; i < 81; i++) if (g[i]) { const m = 1 << g[i]; rows[ROW(i)] |= m; cols[COL(i)] |= m; boxes[BOX(i)] |= m; }
    let count = 0, first = null;
    (function go() {
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const mask = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3fe;
        let n = 0; for (let m = mask; m; m &= m - 1) n++;
        if (n < bestN) { best = i; bestMask = mask; bestN = n; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (!first) first = g.slice(); return; }
      if (!bestN) return;
      let ds = []; for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) ds.push(d);
      if (randomize) ds = shuffle(ds);
      for (const d of ds) {
        const m = 1 << d; g[best] = d; rows[ROW(best)] |= m; cols[COL(best)] |= m; boxes[BOX(best)] |= m;
        go();
        g[best] = 0; rows[ROW(best)] &= ~m; cols[COL(best)] &= ~m; boxes[BOX(best)] &= ~m;
        if (count >= limit) return;
      }
    })();
    return { count, first };
  }
  function generate(level) {
    const sol = solve(Array(81).fill(0), 1, true).first, puzzle = sol.slice();
    let clues = 81;
    for (const i of shuffle([...Array(81).keys()])) {
      if (clues <= CLUES[level]) break;
      const keep = puzzle[i]; puzzle[i] = 0;
      if (solve(puzzle.slice(), 2, false).count !== 1) puzzle[i] = keep; else clues--;
    }
    return { sol, puzzle };
  }
  CG.ICONS.sudoku = '';

  CG.register('sudoku', {
    start(ctx) {
      const root = ctx.root;
      root.innerHTML = '<div class="sd"><div class="sd-load"><div class="cg-spin"></div><p>Preparando tu tablero…</p></div></div>';
      ctx.later(() => run(ctx), 60);                                  // deja pintar la pantalla de carga antes de generar
    },
  });

  function run(ctx) {
    const root = ctx.root, { sol, puzzle } = generate(ctx.level);
    const val = puzzle.slice(), given = puzzle.map(Boolean), notes = Array(81).fill(0), hist = [];
    let sel = -1, noteMode = false, mistakes = 0, hints = 0, over = false, t0 = Date.now(), secs = 0;
    root.innerHTML = '<div class="sd"><div class="sd-top"><span id="sdTime">0:00</span><span id="sdErr">Errores 0</span></div><div class="sd-board" id="sdBoard" role="grid" aria-label="Tablero de Sudoku"></div>' +
      '<div class="sd-tools"><button id="sdUndo" aria-label="Deshacer">↶<small>Deshacer</small></button><button id="sdDel" aria-label="Borrar">⌫<small>Borrar</small></button><button id="sdNote" aria-label="Notas">✎<small>Notas</small></button><button id="sdHint" aria-label="Pista">💡<small>Pista</small></button></div>' +
      '<div class="sd-pad" id="sdPad"></div></div>';
    const $ = s => root.querySelector(s), board = $('#sdBoard'), pad = $('#sdPad');
    const wrong = i => val[i] && val[i] !== sol[i];
    const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const timer = setInterval(() => { if (over) return; secs = Math.floor((Date.now() - t0) / 1000); $('#sdTime').textContent = fmt(secs); }, 500);
    ctx.onCleanup(() => clearInterval(timer));

    function draw() {
      const sv = sel >= 0 ? val[sel] : 0;
      let h = '';
      for (let i = 0; i < 81; i++) {
        let c = 'sc';
        if (given[i]) c += ' g';
        if (sel >= 0) { if (i === sel) c += ' sel'; else if (PEERS[sel].includes(i)) c += ' pr'; if (sv && val[i] === sv && i !== sel) c += ' same'; }
        if (wrong(i)) c += ' bad';
        if (COL(i) % 3 === 2 && COL(i) < 8) c += ' rb'; if (ROW(i) % 3 === 2 && ROW(i) < 8) c += ' bb';
        let inner = '';
        if (val[i]) inner = val[i];
        else if (notes[i]) { inner = '<span class="nt">'; for (let d = 1; d <= 9; d++) inner += '<i>' + (notes[i] & (1 << d) ? d : '') + '</i>'; inner += '</span>'; }
        h += '<button class="' + c + '" data-i="' + i + '" role="gridcell" aria-label="Fila ' + (ROW(i) + 1) + ', columna ' + (COL(i) + 1) + (val[i] ? ', ' + val[i] : ', vacía') + '">' + inner + '</button>';
      }
      board.innerHTML = h;
      const left = d => 9 - val.filter(v => v === d).length;
      pad.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => '<button data-d="' + d + '"' + (left(d) <= 0 ? ' disabled' : '') + '>' + d + '<small>' + Math.max(0, left(d)) + '</small></button>').join('');
      $('#sdNote').classList.toggle('on', noteMode);
      $('#sdErr').textContent = 'Errores ' + mistakes;
    }
    function done() {
      if (over || val.some((v, i) => v !== sol[i])) return;
      over = true; draw(); secs = Math.floor((Date.now() - t0) / 1000);
      ctx.finish({ result: 'win', title: '¡Sudoku completo!', sub: fmt(secs) + ' · ' + mistakes + ' error' + (mistakes === 1 ? '' : 'es') + (hints ? ' · ' + hints + ' pista' + (hints === 1 ? '' : 's') : ''), delay: 500 });
    }
    function put(i, d) {
      if (over || i < 0 || given[i]) return;
      hist.push({ i, v: val[i], n: notes[i] });
      if (noteMode && d) { if (val[i]) { hist.pop(); return; } notes[i] ^= 1 << d; CG.fx('click'); }
      else {
        val[i] = d; notes[i] = 0;
        if (d) { for (const p of PEERS[i]) if (!val[p]) notes[p] &= ~(1 << d); }          // limpia las notas de ese número
        if (d && d !== sol[i]) { mistakes++; CG.fx('capture'); } else CG.fx('click');
      }
      draw(); done();
    }
    board.onclick = e => { const c = e.target.closest('.sc'); if (!c) return; sel = +c.dataset.i; draw(); };
    pad.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; if (sel < 0) { CG.toast('Toca primero una casilla'); return; } put(sel, +b.dataset.d); };
    $('#sdDel').onclick = () => { if (sel >= 0 && !given[sel] && (val[sel] || notes[sel])) { const was = noteMode; noteMode = false; put(sel, 0); noteMode = was; draw(); } };
    $('#sdNote').onclick = () => { noteMode = !noteMode; draw(); };
    $('#sdUndo').onclick = () => { const h = hist.pop(); if (!h || over) return; val[h.i] = h.v; notes[h.i] = h.n; sel = h.i; draw(); };
    $('#sdHint').onclick = () => {
      if (over) return;
      const empty = [...Array(81).keys()].filter(i => !val[i] || wrong(i));
      if (!empty.length) return;
      const i = (sel >= 0 && empty.includes(sel)) ? sel : empty[Math.floor(Math.random() * empty.length)];
      hist.push({ i, v: val[i], n: notes[i] }); val[i] = sol[i]; notes[i] = 0; given[i] = true; hints++; sel = i; CG.fx('notify'); draw(); done();
    };
    root.onkeydown = e => { if (e.key >= '1' && e.key <= '9') put(sel, +e.key); else if (e.key === 'Backspace' || e.key === 'Delete') $('#sdDel').click(); else if (e.key.startsWith('Arrow') && sel >= 0) { sel = Math.max(0, Math.min(80, sel + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key]))); draw(); } };
    draw();
  }
})();
