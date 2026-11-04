// Simula partidas de Siete Vidas para ver si alguna estrategia domina. Meta: ninguna pasa de 55 % en duelo contra la bot lista.
const C = require('../siete/js/core.js');
const N = Number(process.argv[2] || 1000), styles = ['lista', 'comelona', 'sirve', 'devuelve', 'azar'];
let seed = 7; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function play(st) {
  const G = C.create(st.map((s, i) => ({ name: 'p' + i })), R); let acts = 0;
  while (G.phase !== 'over' && acts < 3000) {
    const p = G.phase === 'respond' ? G.offer.to : G.turn;
    if (!C.act(G, p, C.bot(G, p, R, st[p]), R)) { if (!C.act(G, p, { t: 'eat' }, R)) C.act(G, p, { t: 'accept' }, R); }
    acts++;
  }
  if (G.phase !== 'over') throw new Error('partida sin fin');
  return { w: G.winner, rounds: G.round, acts };
}
console.log('Duelo 1 contra 1 frente a "lista" (' + N + ' partidas):');
for (const s of styles) { let w = 0; for (let i = 0; i < N; i++) { const a = i % 2, st = a ? ['lista', s] : [s, 'lista']; if (play(st).w === a) w++; } console.log(' ', s.padEnd(9), (w / N * 100).toFixed(1) + ' %'); }
console.log('Mesa de 4, un jugador con esa estrategia y 3 "lista" (25 % sería parejo):');
let rounds = 0, acts = 0, games = 0;
for (const s of styles) { let w = 0; for (let i = 0; i < N; i++) { const a = i % 4, st = ['lista', 'lista', 'lista', 'lista']; st[a] = s; const r = play(st); if (r.w === a) w++; rounds += r.rounds; acts += r.acts; games++; } console.log(' ', s.padEnd(9), (w / N * 100).toFixed(1) + ' %'); }
console.log('Promedio por partida de 4:', (rounds / games).toFixed(1), 'rondas,', (acts / games).toFixed(0), 'acciones');
