'use strict';
// Pupiletras (sopa de letras): arrastra el dedo sobre las letras en línea recta. Tema al azar, pista y cronómetro.
(() => {
  const esc = CG.esc;
  const THEMES = [
    ['Animales', ['PERRO', 'GATO', 'CABALLO', 'DELFIN', 'TORTUGA', 'JIRAFA', 'LEON', 'TIGRE', 'MONO', 'LORO', 'CONEJO', 'OSO', 'PULPO', 'ZORRO']],
    ['Frutas', ['MANZANA', 'PERA', 'UVA', 'FRESA', 'MANGO', 'PIÑA', 'SANDIA', 'LIMON', 'NARANJA', 'CEREZA', 'PAPAYA', 'KIWI', 'DURAZNO', 'MELON']],
    ['Países', ['PERU', 'CHILE', 'MEXICO', 'BRASIL', 'ESPAÑA', 'CUBA', 'ITALIA', 'JAPON', 'FRANCIA', 'ECUADOR', 'BOLIVIA', 'PANAMA', 'CANADA', 'EGIPTO']],
    ['Deportes', ['FUTBOL', 'VOLEY', 'TENIS', 'NATACION', 'BOXEO', 'GOLF', 'SURF', 'KARATE', 'RUGBY', 'BASQUET', 'CICLISMO', 'ESQUI', 'JUDO', 'REMO']],
    ['Colores', ['ROJO', 'AZUL', 'VERDE', 'AMARILLO', 'NEGRO', 'BLANCO', 'MORADO', 'NARANJA', 'ROSADO', 'GRIS', 'CELESTE', 'DORADO', 'PLATA', 'MARRON']],
    ['Comidas', ['CEVICHE', 'PIZZA', 'TACOS', 'ARROZ', 'SOPA', 'PAPAS', 'ENSALADA', 'POLLO', 'PASTA', 'TORTA', 'GALLETA', 'HELADO', 'EMPANADA', 'CHURROS']],
    ['Oficios', ['DOCTOR', 'CHEF', 'PILOTO', 'BOMBERO', 'POLICIA', 'MAESTRO', 'DENTISTA', 'PINTOR', 'CARTERO', 'ACTOR', 'MUSICO', 'ARQUITECTO', 'PANADERO', 'JUEZ']],
  ];
  const LEVELS = [{ n: 8, words: 6, dirs: [[0, 1], [1, 0]] }, { n: 10, words: 8, dirs: [[0, 1], [1, 0], [1, 1]] }, { n: 12, words: 10, dirs: [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]] }];
  const ALPHA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  const COLORS = ['#ffd86b', '#9fd7ae', '#a9c4f7', '#f4a6a0', '#d2b5f2', '#9ad8e6', '#f6c28b', '#c4e08b', '#f2a8d0', '#b6b6e8'];
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function make(level) {
    const L = LEVELS[level], n = L.n, theme = THEMES[rnd(THEMES.length)];
    const pool = shuffle(theme[1].filter(w => w.length <= n)); let g, placed;
    for (let attempt = 0; attempt < 30; attempt++) {
      g = Array(n * n).fill(''); placed = [];
      for (const w of pool) {
        if (placed.length >= L.words) break;
        for (let tries = 0; tries < 60; tries++) {
          const [dr, dc] = L.dirs[rnd(L.dirs.length)], r = rnd(n), c = rnd(n), er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
          if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
          let ok = true; for (let k = 0; k < w.length; k++) { const ch = g[(r + dr * k) * n + c + dc * k]; if (ch && ch !== w[k]) { ok = false; break; } }
          if (!ok) continue;
          for (let k = 0; k < w.length; k++) g[(r + dr * k) * n + c + dc * k] = w[k];
          placed.push({ w, r, c, dr, dc }); break;
        }
      }
      if (placed.length >= L.words) break;
    }
    for (let i = 0; i < g.length; i++) if (!g[i]) g[i] = ALPHA[rnd(ALPHA.length)];
    return { n, g, placed, theme: theme[0] };
  }

  CG.register('pupiletras', {
    start(ctx) {
      const root = ctx.root, P = make(ctx.level), n = P.n, found = new Set();
      let t0 = Date.now(), over = false, drag = null, hintCell = -1;
      root.innerHTML = '<div class="pl"><div class="sd-top"><span id="plTime">0:00</span><span>Tema: <b>' + esc(P.theme) + '</b></span></div><div class="pl-board" id="plBoard" style="--n:' + n + '" role="grid" aria-label="Sopa de letras"></div><div class="pl-words" id="plWords"></div><div class="cg-actions"><button class="cg-btn ghost" id="plHint">💡 Pista</button></div></div>';
      const $ = s => root.querySelector(s), board = $('#plBoard');
      const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      const timer = setInterval(() => { if (!over) $('#plTime').textContent = fmt(Math.floor((Date.now() - t0) / 1000)); }, 500);
      ctx.onCleanup(() => clearInterval(timer));
      const owner = Array(n * n).fill(-1);                         // qué palabra encontrada cubre cada casilla
      const cells = (a, b) => { const dr = Math.sign(b.r - a.r), dc = Math.sign(b.c - a.c), len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)); return Array.from({ length: len + 1 }, (_, k) => (a.r + dr * k) * n + a.c + dc * k); };
      function draw() {
        const sel = drag ? new Set(drag.cells) : new Set();
        board.innerHTML = P.g.map((ch, i) => '<div class="plc ' + (sel.has(i) ? 'sel ' : '') + (owner[i] >= 0 ? 'ok ' : '') + (i === hintCell ? 'hint' : '') + '" data-i="' + i + '"' + (owner[i] >= 0 ? ' style="background:' + COLORS[owner[i] % COLORS.length] + '"' : '') + '>' + ch + '</div>').join('');
        $('#plWords').innerHTML = P.placed.map((p, k) => '<span class="' + (found.has(k) ? 'f' : '') + '"' + (found.has(k) ? ' style="background:' + COLORS[k % COLORS.length] + '"' : '') + '>' + esc(p.w) + '</span>').join('');
      }
      const at = e => { const r = board.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return { r: Math.max(0, Math.min(n - 1, Math.floor(y / r.height * n))), c: Math.max(0, Math.min(n - 1, Math.floor(x / r.width * n))), fx: x / r.width * n, fy: y / r.height * n }; };
      function snap(a, p) {                                        // ajusta el arrastre a una de las 8 direcciones
        const dy = p.fy - (a.r + 0.5), dx = p.fx - (a.c + 0.5), ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), dirs = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]], d = dirs[(ang + 8) % 8];
        const len = Math.max(Math.abs(dy), Math.abs(dx)) | 0; let r = a.r, c = a.c;
        for (let k = 0; k < len; k++) { const nr = r + d[0], nc = c + d[1]; if (nr < 0 || nr >= n || nc < 0 || nc >= n) break; r = nr; c = nc; }
        return { r, c };
      }
      board.addEventListener('pointerdown', e => { if (over) return; e.preventDefault(); try { board.setPointerCapture(e.pointerId); } catch (x) { /* nada */ } const p = at(e); drag = { a: p, cells: [p.r * n + p.c] }; hintCell = -1; draw(); });
      board.addEventListener('pointermove', e => { if (!drag) return; const end = snap(drag.a, at(e)), cs = cells(drag.a, end); if (cs.length !== drag.cells.length || cs[cs.length - 1] !== drag.cells[drag.cells.length - 1]) { drag.cells = cs; draw(); } });
      const release = () => {
        if (!drag) return; const cs = drag.cells; drag = null;
        const word = cs.map(i => P.g[i]).join(''), rev = word.split('').reverse().join('');
        const k = P.placed.findIndex((p, j) => !found.has(j) && (p.w === word || p.w === rev) && cs.length === p.w.length);
        if (k >= 0) { found.add(k); cs.forEach(i => { owner[i] = k; }); CG.fx('notify'); }
        draw();
        if (found.size === P.placed.length && !over) { over = true; const s = Math.floor((Date.now() - t0) / 1000); ctx.finish({ result: 'win', title: '¡Todas encontradas!', sub: P.placed.length + ' palabras en ' + fmt(s), delay: 500 }); }
      };
      ['pointerup', 'pointercancel'].forEach(ev => board.addEventListener(ev, release));
      board.addEventListener('contextmenu', e => e.preventDefault());
      $('#plHint').onclick = () => {
        if (over) return; const left = P.placed.map((p, k) => k).filter(k => !found.has(k)); if (!left.length) return;
        const p = P.placed[left[rnd(left.length)]]; hintCell = p.r * n + p.c; CG.fx('click'); draw();
      };
      draw();
    },
  });
})();
