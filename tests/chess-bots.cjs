// Partidas bot contra bot: comprueba que Difícil > Medio > Fácil y mide el tiempo por jugada.
const C = require('../clasicos/chess-engine.js');
function game(wl, bl, maxPlies) {
  const g = new C.Game(); let t = [0, 0, 0], n = [0, 0, 0];
  for (let ply = 0; ply < maxPlies; ply++) {
    const st = g.status(); if (st.over) return { r: st.winner === null ? 0.5 : st.winner === 0 ? 1 : 0, ply, t, n, why: st.why };
    const lv = g.turn === 0 ? wl : bl, t0 = Date.now();
    const m = C.best(g, lv); t[lv] += Date.now() - t0; n[lv]++;
    if (!m || !g.play(m)) return { r: 0.5, ply, t, n, why: 'error' };
  }
  return { r: 0.5, ply: maxPlies, t, n, why: 'limite' };
}
const pairs = [[2, 0], [2, 1], [1, 0]], N = +process.argv[2] || 2;
const tt = [0, 0, 0], nn = [0, 0, 0];
for (const [a, b] of pairs) {
  let sa = 0;
  for (let i = 0; i < N; i++) {
    const w = i % 2 === 0, res = w ? game(a, b, 160) : game(b, a, 160);
    const sc = w ? res.r : 1 - res.r; sa += sc;
    for (let k = 0; k < 3; k++) { tt[k] += res.t[k]; nn[k] += res.n[k]; }
    console.log('nivel ' + a + ' vs ' + b + ' partida ' + (i + 1) + ': ' + (sc === 1 ? 'gana ' + a : sc === 0 ? 'gana ' + b : 'tablas') + ' (' + res.why + ', ' + res.ply + ' medias jugadas)');
  }
  console.log('=> nivel ' + a + ' suma ' + sa + ' de ' + N);
}
console.log('ms por jugada: Fácil ' + Math.round(tt[0] / (nn[0] || 1)) + ' · Medio ' + Math.round(tt[1] / (nn[1] || 1)) + ' · Difícil ' + Math.round(tt[2] / (nn[2] || 1)));
