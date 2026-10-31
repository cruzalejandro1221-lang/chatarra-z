'use strict';
// Tetris: 10×20, bolsa de 7 piezas, pieza fantasma, pieza siguiente, caída rápida y récord guardado.
// Táctil: botones grandes (mantener para repetir) o gestos sobre el tablero (arrastrar = mover, toque = girar, deslizar abajo = caer).
(() => {
  const W = 10, H = 20, BEST = 'gg_tetris_best';
  const SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  };
  const COLORS = { I: '#38c8e8', O: '#ffc629', T: '#a45be0', S: '#34c46b', Z: '#e5383b', J: '#2f6fe4', L: '#ff7a1a' };
  const START_LEVEL = [0, 3, 7];
  const rot = (cells, size) => cells.map(([x, y]) => [size - 1 - y, x]);                // gira 90° dentro de una caja size×size
  const sizeOf = k => (k === 'I' ? 4 : k === 'O' ? 4 : 3);
  const bag = () => { const a = Object.keys(SHAPES); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const best = () => { try { return +localStorage.getItem(BEST) || 0; } catch (e) { return 0; } };

  CG.register('tetris', {
    start(ctx) {
      const root = ctx.root;
      root.innerHTML = '<div class="tt"><div class="tt-info"><div><small>Puntos</small><b id="ttScore">0</b></div><div><small>Líneas</small><b id="ttLines">0</b></div><div><small>Nivel</small><b id="ttLevel">1</b></div><div><small>Récord</small><b id="ttBest">' + best() + '</b></div><canvas id="ttNext" width="80" height="60" aria-label="Pieza siguiente"></canvas></div>' +
        '<div class="tt-wrap"><canvas id="ttBoard" width="300" height="600" aria-label="Tablero de Tetris"></canvas><div class="tt-pause" id="ttPause" hidden><b>Pausa</b><small>Toca para seguir</small></div></div>' +
        '<div class="tt-pad"><button data-k="left" aria-label="Izquierda">◀</button><button data-k="rot" aria-label="Girar">⟳</button><button data-k="right" aria-label="Derecha">▶</button><button data-k="down" aria-label="Bajar">▼</button><button data-k="drop" aria-label="Caída rápida">⏬</button><button data-k="pause" aria-label="Pausa">⏸</button></div></div>';
      const $ = s => root.querySelector(s), cv = $('#ttBoard'), g = cv.getContext('2d'), nx = $('#ttNext').getContext('2d');
      const grid = Array.from({ length: H }, () => Array(W).fill(null));
      let queue = [], cur = null, nextK = null, score = 0, lines = 0, level = START_LEVEL[ctx.level], over = false, paused = false, acc = 0, last = performance.now(), raf = 0, flash = [];
      const take = () => { if (queue.length < 2) queue = queue.concat(bag()); return queue.shift(); };
      const interval = () => Math.max(70, 820 - level * 72);
      function spawn() {
        const k = nextK || take(); nextK = take();
        cur = { k, cells: SHAPES[k].map(c => c.slice()), x: 3, y: 0 };
        if (hit(cur.cells, cur.x, cur.y)) end();
        drawNext();
      }
      const hit = (cells, x, y) => cells.some(([cx, cy]) => { const px = x + cx, py = y + cy; return px < 0 || px >= W || py >= H || (py >= 0 && grid[py][px]); });
      function move(dx, dy) { if (!cur || over || paused) return false; if (hit(cur.cells, cur.x + dx, cur.y + dy)) return false; cur.x += dx; cur.y += dy; return true; }
      function rotate() {
        if (!cur || over || paused || cur.k === 'O') return;
        const r = rot(cur.cells, sizeOf(cur.k));
        for (const k of [0, -1, 1, -2, 2]) if (!hit(r, cur.x + k, cur.y)) { cur.cells = r; cur.x += k; CG.fx('click'); return; }
      }
      function lock() {
        cur.cells.forEach(([cx, cy]) => { const py = cur.y + cy; if (py >= 0) grid[py][cur.x + cx] = cur.k; });
        const full = []; for (let y = 0; y < H; y++) if (grid[y].every(Boolean)) full.push(y);
        if (full.length) {
          full.forEach(y => { grid.splice(y, 1); grid.unshift(Array(W).fill(null)); });
          score += [0, 100, 300, 500, 800][full.length] * (level + 1); lines += full.length;
          const nl = START_LEVEL[ctx.level] + Math.floor(lines / 10); if (nl > level) { level = nl; CG.fx('notify'); }
          flash = full.map(y => y); setTimeout(() => { flash = []; }, 160); CG.fx(full.length >= 4 ? 'win' : 'capture');
        } else CG.fx('move');
        ui(); spawn();
      }
      function drop() { while (move(0, 1)) score += 2; lock(); }
      function ghostY() { let y = cur.y; while (!hit(cur.cells, cur.x, y + 1)) y++; return y; }
      function ui() { $('#ttScore').textContent = score; $('#ttLines').textContent = lines; $('#ttLevel').textContent = level + 1; }
      function block(c, x, y, s, k, a) { c.globalAlpha = a || 1; c.fillStyle = COLORS[k]; c.fillRect(x * s + 1, y * s + 1, s - 2, s - 2); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x * s + 1, y * s + 1, s - 2, 5); c.globalAlpha = 1; }
      function draw() {
        g.clearRect(0, 0, 300, 600); g.fillStyle = '#1d2a5b'; g.fillRect(0, 0, 300, 600);
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
        for (let i = 1; i < W; i++) { g.beginPath(); g.moveTo(i * 30, 0); g.lineTo(i * 30, 600); g.stroke(); }
        for (let i = 1; i < H; i++) { g.beginPath(); g.moveTo(0, i * 30); g.lineTo(300, i * 30); g.stroke(); }
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x]) block(g, x, y, 30, grid[y][x]);
        if (cur && !over) {
          const gy = ghostY(); cur.cells.forEach(([cx, cy]) => block(g, cur.x + cx, gy + cy, 30, cur.k, 0.22));
          cur.cells.forEach(([cx, cy]) => { if (cur.y + cy >= 0) block(g, cur.x + cx, cur.y + cy, 30, cur.k); });
        }
        flash.forEach(y => { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, y * 30, 300, 30); });
      }
      function drawNext() {
        nx.clearRect(0, 0, 80, 60); const cs = SHAPES[nextK], minx = Math.min(...cs.map(c => c[0])), maxx = Math.max(...cs.map(c => c[0])), miny = Math.min(...cs.map(c => c[1])), maxy = Math.max(...cs.map(c => c[1]));
        const s = 15, ox = (80 - (maxx - minx + 1) * s) / 2 - minx * s, oy = (60 - (maxy - miny + 1) * s) / 2 - miny * s;
        cs.forEach(([cx, cy]) => { nx.fillStyle = COLORS[nextK]; nx.fillRect(ox + cx * s + 1, oy + cy * s + 1, s - 2, s - 2); });
      }
      function end() {
        over = true; cancelAnimationFrame(raf); draw();
        const b = best(), rec = score > b; if (rec) { try { localStorage.setItem(BEST, String(score)); } catch (e) { /* nada */ } $('#ttBest').textContent = score; }
        CG.fx('lose');
        ctx.finish({ result: rec ? 'win' : 'draw', title: rec ? '¡Nuevo récord!' : 'Fin del juego', sub: score + ' puntos · ' + lines + ' línea' + (lines === 1 ? '' : 's') + ' · nivel ' + (level + 1), delay: 700 });
      }
      function loop(now) {
        raf = requestAnimationFrame(loop); const dt = Math.min(100, now - last); last = now;
        if (!paused && !over) { acc += dt; if (acc >= interval()) { acc = 0; if (!move(0, 1)) lock(); } }
        draw();
      }
      function setPause(p) { if (over) return; paused = p; $('#ttPause').hidden = !p; last = performance.now(); }

      // controles: botones con repetición al mantener
      const act = { left: () => move(-1, 0), right: () => move(1, 0), down: () => { if (move(0, 1)) score += 1; ui(); }, rot: rotate, drop, pause: () => setPause(!paused) };
      const pad = $('.tt-pad'); let rep = null;
      const stop = () => { clearTimeout(rep); clearInterval(rep); rep = null; };
      pad.addEventListener('pointerdown', e => {
        const b = e.target.closest('button'); if (!b) return; e.preventDefault(); const k = b.dataset.k; act[k]();
        if (k === 'left' || k === 'right' || k === 'down') { stop(); rep = setTimeout(() => { rep = setInterval(act[k], 70); }, 220); }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => pad.addEventListener(ev, stop));
      pad.addEventListener('contextmenu', e => e.preventDefault());
      // gestos sobre el tablero
      let gs = null; const wrap = $('.tt-wrap');
      wrap.addEventListener('pointerdown', e => { if (paused) { setPause(false); return; } gs = { x: e.clientX, y: e.clientY, cx: e.clientX, t: performance.now(), moved: false }; });
      wrap.addEventListener('pointermove', e => {
        if (!gs) return; const cell = cv.getBoundingClientRect().width / W, dx = e.clientX - gs.cx;
        if (Math.abs(dx) >= cell) { const steps = Math.trunc(dx / cell); for (let i = 0; i < Math.abs(steps); i++) move(Math.sign(steps), 0); gs.cx += steps * cell; gs.moved = true; }
        if (e.clientY - gs.y > cell * 2.5) { gs.moved = true; if (move(0, 1)) { score++; gs.y += cell; } }
      });
      wrap.addEventListener('pointerup', e => { if (!gs) return; const dy = e.clientY - gs.y, fast = performance.now() - gs.t < 220; if (!gs.moved && Math.abs(e.clientX - gs.x) < 8 && Math.abs(dy) < 8) rotate(); else if (fast && dy > 40 && !gs.moved) drop(); gs = null; });
      wrap.addEventListener('pointercancel', () => { gs = null; });
      const key = e => { const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rot', ' ': 'drop', p: 'pause', P: 'pause' }[e.key]; if (m) { e.preventDefault(); act[m](); } };
      document.addEventListener('keydown', key); ctx.onCleanup(() => document.removeEventListener('keydown', key));
      const vis = () => { if (document.hidden) setPause(true); }; document.addEventListener('visibilitychange', vis); ctx.onCleanup(() => document.removeEventListener('visibilitychange', vis));
      ctx.onCleanup(() => { cancelAnimationFrame(raf); stop(); });
      spawn(); ui(); raf = requestAnimationFrame(loop);
    },
  });
})();
