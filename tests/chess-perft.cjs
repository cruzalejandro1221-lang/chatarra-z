// Verifica las reglas del ajedrez con posiciones de referencia (conteos oficiales de perft).
const C = require('../clasicos/chess-engine.js');
const cases = [
  ['inicial', C.START, [20, 400, 8902, 197281]],
  ['kiwipete (enroques, clavadas)', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['posición 3 (al paso, finales)', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['posición 4 (coronaciones)', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['posición 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
let bad = 0;
for (const [name, fen, exp] of cases) {
  const g = new C.Game(fen);
  exp.forEach((e, i) => { const n = C.perft(g, i + 1); const ok = n === e; if (!ok) bad++; console.log((ok ? 'OK  ' : 'FALLA') + ' ' + name + ' prof ' + (i + 1) + ': ' + n + (ok ? '' : ' (esperado ' + e + ')')); });
}
console.log(bad ? 'HAY ERRORES' : 'Todas las posiciones coinciden');
process.exit(bad ? 1 : 0);
