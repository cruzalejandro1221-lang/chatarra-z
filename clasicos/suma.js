'use strict';
// Suma Giorgio: desliza y todos los bloques se mueven; dos bloques iguales se suman. Tablero 5×5 con cajas que estorban:
// una caja bloquea el paso y se rompe cuando haces una suma a su lado. Fácil no tiene cajas; deshacer limitado.
(() => {
  const N = 5, BEST = 'gg_suma_best';
  const LEVELS = [{ goal: 512, boxEvery: 0, undo: 3 }, { goal: 1024, boxEvery: 14, undo: 2 }, { goal: 2048, boxEvery: 9, undo: 1 }];
  const COLORS = { 2: '#fff0c4', 4: '#ffe08a', 8: '#ffc629', 16: '#ffa63d', 32: '#ff7a1a', 64: '#e5383b', 128: '#f062a8', 256: '#7b3fe4', 512: '#2f6fe4', 1024: '#1fb5a3', 2048: '#22a35a' };
  const DIRS = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
  const best = () => { try { return +localStorage.getItem(BEST) || 0; } catch (e) { return 0; } };

  CG.register('suma', {
    start(ctx) {
      const L = LEVELS[ctx.level], root = ctx.root;
      root.innerHTML = '<div class="sm"><div class="sm-top"><div><small>Puntos</small><b id="smS">0</b></div><div><small>Récord</small><b id="smB">' + best() + '</b></div><div><small>Meta</small><b>' + L.goal + '</b></div></div>' +
        '<div class="sm-board" id="smBoard" aria-label="Tablero, desliza para mover"></div><div class="cg-actions"><button class="cg-btn ghost" id="smU">↶ Deshacer (<span id="smUn">' + L.undo + '</span>)</button></div>' +
        '<p class="sm-how">' + (L.boxEvery ? 'Las cajas 📦 bloquean: suma a su lado para romperlas.' : 'Desliza: los bloques iguales se suman.') + '</p></div>';
      const $ = s => root.querySelector(s), board = $('#smBoard');
      let id = 1, tiles = [], score = 0, moves = 0, undo = L.undo, hist = null, over = false, won = false;
      const at = (r, c) => tiles.find(t => t.r === r && t.c === c && !t.gone);
      const empties = () => { const e = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!at(r, c)) e.push([r, c]); return e; };
      function spawn(box) {
        const e = empties(); if (!e.length) return;
        const [r, c] = e[Math.floor(Math.random() * e.length)];
        tiles.push({ id: id++, r, c, v: box ? 0 : Math.random() < 0.9 ? 2 : 4, fresh: true });
      }
      function draw() {
        const seen = new Set();
        tiles.forEach(t => {
          let el = board.querySelector('[data-id="' + t.id + '"]');
          if (!el) { el = document.createElement('div'); el.dataset.id = t.id; board.append(el); }
          seen.add(String(t.id));
          el.className = 'sm-t' + (t.fresh ? ' new' : '') + (t.pop ? ' pop' : '') + (t.v ? '' : ' box');
          el.style.transform = 'translate(' + t.c * 100 + '%,' + t.r * 100 + '%)';
          el.innerHTML = '<i style="background:' + (t.v ? COLORS[t.v] || '#1d2a5b' : '') + ';color:' + (t.v >= 8 ? '#fff' : '#1d2a5b') + '">' + (t.v || '📦') + '</i>';
          t.fresh = t.pop = false;
        });
        board.querySelectorAll('.sm-t').forEach(el => { if (!seen.has(el.dataset.id)) el.remove(); });
        $('#smS').textContent = score; $('#smUn').textContent = undo; $('#smU').disabled = !hist || !undo;
        if (score > best()) { try { localStorage.setItem(BEST, String(score)); } catch (e) { /* nada */ } $('#smB').textContent = score; }
      }
      const canMove = () => {
        if (empties().length) return true;
        return tiles.some(t => t.v && [[0, 1], [1, 0]].some(([a, b]) => { const o = at(t.r + a, t.c + b); return o && o.v === t.v; }));
      };
      function slide(dir) {
        if (over) return;
        const [dr, dc] = DIRS[dir], snap = JSON.stringify({ tiles, score, moves });
        const order = tiles.filter(t => t.v).sort((a, b) => (dr ? (b.r - a.r) * dr : (b.c - a.c) * dc));
        const merged = new Set(), hits = []; let moved = false;
        for (const t of order) {
          let r = t.r, c = t.c, into = null;
          for (;;) {
            const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= N || nc >= N) break;
            const o = at(nr, nc);
            if (!o) { r = nr; c = nc; continue; }
            if (o !== t && o.v === t.v && !merged.has(o.id)) into = o;
            break;
          }
          if (into) { t.gone = true; t.r = into.r; t.c = into.c; into.v *= 2; into.pop = true; merged.add(into.id); score += into.v; hits.push(into); moved = true; }
          else if (r !== t.r || c !== t.c) { t.r = r; t.c = c; moved = true; }
        }
        if (!moved) return;
        hist = snap; moves++;
        let broke = false;
        for (const h of hits) for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const o = at(h.r + a, h.c + b); if (o && !o.v) { o.gone = true; broke = true; } }
        draw();                                                    // anima el movimiento antes de quitar los que se unieron
        tiles = tiles.filter(t => !t.gone);
        spawn(false); if (L.boxEvery && moves % L.boxEvery === 0) spawn(true);
        CG.fx(broke ? 'capture' : hits.length ? 'click' : 'move');
        ctx.later(draw, 110);
        const top = Math.max(...tiles.map(t => t.v));
        if (!won && top >= L.goal) { won = true; over = true; ctx.finish({ result: 'win', title: '¡Llegaste a ' + top + '!', sub: score + ' puntos en ' + moves + ' movimientos', delay: 500 }); }
        else if (!canMove()) { over = true; ctx.finish({ result: 'draw', title: 'Sin movimientos', sub: 'Bloque más alto: ' + top + ' · ' + score + ' puntos', delay: 600 }); }
      }
      $('#smU').onclick = () => { if (!hist || !undo || over) return; const s = JSON.parse(hist); tiles = s.tiles; score = s.score; moves = s.moves; hist = null; undo--; board.innerHTML = ''; draw(); };
      let p0 = null;
      board.addEventListener('pointerdown', e => { p0 = { x: e.clientX, y: e.clientY }; try { board.setPointerCapture(e.pointerId); } catch (x) { /* nada */ } });
      const swipe = e => { if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; p0 = null; slide(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); };
      board.addEventListener('pointermove', swipe); board.addEventListener('pointerup', () => { p0 = null; }); board.addEventListener('pointercancel', () => { p0 = null; });
      const key = e => { const d = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]; if (d) { e.preventDefault(); slide(d); } };
      document.addEventListener('keydown', key); ctx.onCleanup(() => document.removeEventListener('keydown', key));
      spawn(false); spawn(false); draw();
    },
  });
})();
