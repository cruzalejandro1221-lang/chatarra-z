// Pruebas de Ludo: recorrido, capturas, casillas seguras, turnos extra y fuerza de los 3 niveles del bot.
const L = require('../clasicos/ludo-engine.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FALLA: ' + m); } };
// recorrido: 52 casillas distintas, y las casillas de salida de cada color están a 13 de distancia
ok(L.TRACK.length === 52 && new Set(L.TRACK.map(x => x.join())).size === 52, 'recorrido de 52 casillas distintas');
const CORNERS = new Set([4, 17, 30, 43]);                 // al girar junto al centro el recorrido avanza en diagonal
for (let i = 0; i < 52; i++) { const a = L.TRACK[i], b = L.TRACK[(i + 1) % 52], dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]); ok(CORNERS.has(i) ? (dx === 1 && dy === 1) : dx + dy === 1, 'casillas contiguas ' + i); }
for (let c = 0; c < 4; c++) { const last = L.TRACK[L.trackIdx(c, 51)], lane = L.LANE[c][0]; ok(Math.abs(last[0] - lane[0]) + Math.abs(last[1] - lane[1]) === 1, 'el pasillo del color ' + c + ' empieza junto a su última casilla'); }
function seq(vals) { let i = 0; return () => (vals[i++ % vals.length] - 0.5) / 6; }   // rng que da los dados indicados
function mk(dice, first) { const g = new L.Ludo({ rng: seq(dice), first }); return g; }
// salir de la base solo con 6
let g = mk([3, 6]);
ok(g.roll() && g.phase === 'roll' && g.turn === 1, 'un 3 sin fichas en juego pasa el turno');
g = mk([6]); g.roll(); ok(g.legal().length === 4 && g.move(0) && g.pos[0][0] === 1 && g.phase === 'roll' && g.turn === 0, 'el 6 saca ficha y da tiro extra');
// tres seises seguidos pierden el turno
g = mk([6, 6, 6]); g.roll(); g.move(0); g.roll(); g.move(0); g.roll(); ok(g.turn === 1 && g.phase === 'roll', 'tres 6 seguidos: pierdes el turno');
// captura: jugador 0 (azul) y jugador 1 (verde)
g = mk([2]); g.pos[0][0] = 5; g.pos[1][0] = 20;         // azul avance 5 -> casilla (13*3+4)%52=43 ; verde avance 20 -> (13+19)%52=32
const tgt = L.trackIdx(1, 20); g.pos[0][0] = ((tgt - 39 + 52) % 52) + 1 - 2;   // dejar a azul 2 pasos antes de la casilla del verde
ok(L.trackIdx(3, g.pos[0][0] + 2) === tgt, 'preparación de captura');
g.roll(); ok(g.move(0) && g.pos[1][0] === 0 && g.last.captured === 1 && g.phase === 'roll' && g.turn === 0, 'captura y tiro extra');
// casilla segura: no se captura
g = mk([2]); const safeIdx = 8; g.pos[1][0] = ((safeIdx - 13 + 52) % 52) + 1; g.pos[0][0] = ((safeIdx - 39 + 52) % 52) + 1 - 2;
ok(L.trackIdx(1, g.pos[1][0]) === 8 && L.trackIdx(3, g.pos[0][0] + 2) === 8, 'preparación segura');
g.roll(); g.move(0); ok(g.pos[1][0] !== 0 && g.last.captured === 0, 'en casilla con estrella no hay captura');
// llegar a casa exige tirada exacta
g = mk([4]); g.pos[0][0] = 55; g.roll(); ok(g.phase === 'roll' && g.turn === 1, 'tirada que se pasa de casa: sin movimiento');
g = mk([2]); g.pos[0][0] = 55; g.roll(); ok(g.legal().includes(0) && g.move(0) && g.pos[0][0] === 57, 'tirada exacta llega a casa');
// victoria
g = mk([2]); g.pos[0] = [57, 57, 57, 55]; g.roll(); g.move(3); ok(g.winner === 0 && g.phase === 'over', 'ganar con las 4 fichas en casa');
// simulación: partidas completas con el bot
function play(l0, l1, seed) {
  let s = seed; const rng = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const g = new L.Ludo({ rng, first: seed & 1 }), lv = [l0, l1]; let turns = 0;
  while (g.winner === null && turns++ < 4000) {
    if (g.phase === 'roll') g.roll(); else { const m = L.botMove(g, lv[g.turn]); ok(m !== null && g.move(m), 'jugada del bot válida'); }
    for (const p of [0, 1]) for (const x of g.pos[p]) ok(x >= 0 && x <= 57, 'avance fuera de rango');
  }
  ok(turns < 4000, 'partida sin fin'); return { w: g.winner, turns };
}
const N = +process.argv[2] || 400; let tt = 0;
for (const [a, b] of [[2, 0], [1, 0], [2, 1]]) {
  let wa = 0;
  for (let i = 0; i < N; i++) { const sw = i & 1; const r = sw ? play(b, a, 500 + i) : play(a, b, 500 + i); tt += r.turns; if ((r.w === 0) !== !!sw) wa++; }
  console.log('nivel ' + a + ' vs ' + b + ': gana el ' + a + ' ' + wa + ' de ' + N + ' (' + Math.round(100 * wa / N) + '%)');
}
console.log('acciones medias por partida: ' + Math.round(tt / (3 * N)));
console.log(bad ? 'HAY ERRORES: ' + bad : 'Reglas de Ludo correctas'); process.exit(bad ? 1 : 0);
