// Mide el balance de Giorgio Brawl: enfrenta a todos los personajes con bots en las 3 arenas. Meta: nadie sobre 55 % de victorias en conjunto.
const B = require('../pelea/js/core.js');
const N = Number(process.argv[2] || 60), ids = B.IDS, wins = {}, games = {}, cross = {};
let seed = 12345; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let frames = 0, n = 0;
for (const a of ids) for (const b of ids) {
  if (a === b) continue;
  for (let k = 0; k < N; k++) {
    const m = B.match([a, b], k % 3);
    while (!m.over) B.step(m, [B.bot(m, 0, 2, R), B.bot(m, 1, 2, R)]);
    const w = m.over.winner === 0 ? a : b;
    wins[w] = (wins[w] || 0) + 1; games[a] = (games[a] || 0) + 1; games[b] = (games[b] || 0) + 1;
    cross[a + '>' + b] = (cross[a + '>' + b] || 0) + (w === a ? 1 : 0);
    cross[b + '>' + a] = (cross[b + '>' + a] || 0) + (w === b ? 1 : 0);
    frames += m.t; n++;
  }
}
console.log('Duración media:', (frames / n / 60).toFixed(0), 's');
for (const a of ids) console.log(a.padEnd(8), ((wins[a] || 0) / games[a] * 100).toFixed(1).padStart(5) + ' %', ids.filter(b => b !== a).map(b => b + ' ' + Math.round(cross[a + '>' + b] / (2 * N) * 100) + '%').join('  '));
