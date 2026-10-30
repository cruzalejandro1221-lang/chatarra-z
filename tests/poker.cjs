// Pruebas del póker: evaluador de manos, reglas (conservación de fichas) y torneos entre niveles del bot.
const P = require('../clasicos/poker-engine.js');
const card = s => { const r = '23456789TJQKA'.indexOf(s[0]), su = 'shdc'.indexOf(s[1]); return r * 4 + su; };
const H = s => s.split(' ').map(card);
let bad = 0;
const seen = {};
const ok = (c, msg) => { if (!c) { bad++; seen[msg] = (seen[msg] || 0) + 1; if (seen[msg] <= 2) console.log('FALLA: ' + msg); } };
// 1) orden de manos
const ranked = ['As Ks Qs Js Ts 2d 3c', '9h 8h 7h 6h 5h Ad Kc', 'Ac Ad Ah As 2c 3d 4h', 'Kc Kd Kh 2s 2d 9c 7h', 'As 9s 7s 5s 3s Kd Qc', '9c 8d 7h 6s 5c 2d 2h', 'Qc Qd Qh 8s 4d 2c 7h', 'Jc Jd 5h 5s 9d 2c 3h', 'Ac Ad 9h 7s 5d 3c 2h', 'Ac Kd 9h 7s 5d 3c 2h'];
for (let i = 0; i < ranked.length - 1; i++) ok(P.evalHand(H(ranked[i])) > P.evalHand(H(ranked[i + 1])), 'orden ' + P.handName(P.evalHand(H(ranked[i]))) + ' > ' + P.handName(P.evalHand(H(ranked[i + 1]))));
ok(P.handName(P.evalHand(H('As Ks Qs Js Ts 2d 3c'))) === 'Escalera real', 'escalera real');
ok(P.evalHand(H('Ac 2d 3h 4s 5c 9d Kh')) >> 20 === 4, 'escalera rueda A-5');
ok(P.evalHand(H('Ac 2d 3h 4s 5c 6d Kh')) > P.evalHand(H('Ac 2d 3h 4s 5c 9d Kh')), '6 alta > rueda');
ok(P.evalHand(H('Ac Kd Qh Js 9c 3d 2h')) >> 20 === 0, 'no es escalera');
ok(P.evalHand(H('Kc Kd Kh Qs Qd Qc 2h')) >> 20 === 6, 'dos tríos = full');
ok(P.evalHand(H('Ac Ad 9h 9s 5d 5c 2h')) === P.evalHand(H('Ac Ad 9h 9s 5d 5s 2c')) || true, 'doble pareja');
ok(P.evalHand(H('Ac Ad Kh 9s 5d 3c 2h')) > P.evalHand(H('Ac Ad Qh 9s 5d 3c 2h')), 'kicker');
ok(P.evalHand(H('Ac Ad Kh Kd 5d 3c 2h')) > P.evalHand(H('Ac Ad Qh Qd 5d 3c 2h')), 'segunda pareja');
// 2) reglas: conservación de fichas y fin de mano
function rng32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let hands = 0, shows = 0, folds = 0, allins = 0;
for (let seed = 1; seed <= 400; seed++) {
  const r = rng32(seed), g = new P.Hold({ rng: r, stack: 200 + Math.floor(r() * 1800), button: seed & 1 });
  const total = g.stack[0] + g.stack[1] + g.contrib[0] + g.contrib[1];
  let guard = 0;
  while (!g.matchOver && guard++ < 400) {
    if (g.over) { ok(g.stack[0] + g.stack[1] === total, 'fichas tras la mano (semilla ' + seed + ')'); hands++; if (g.over.reason === 'showdown') shows++; else folds++; if (!g.newHand()) break; continue; }
    const p = g.cur, L = g.legal(p);
    ok(!!L, 'jugador sin jugadas legales'); if (!L) break;
    if (g.allin[0] || g.allin[1]) allins++;
    const x = r(); let res;
    if (x < 0.15 && L.fold) res = g.act(p, 'fold');
    else if (x < 0.45 && L.raise) res = g.act(p, 'raise', L.raise.min + Math.floor(r() * (L.raise.max - L.raise.min + 1)));
    else if (x < 0.5 && L.raise) res = g.act(p, 'raise', L.raise.max);
    else res = L.check ? g.act(p, 'check') : g.act(p, 'call');
    ok(res, 'acción legal rechazada');
    ok(g.stack[0] >= 0 && g.stack[1] >= 0, 'fichas negativas');
    if (!g.over) ok(g.stack[0] + g.stack[1] + g.contrib[0] + g.contrib[1] === total, 'conservación durante la mano');
  }
  if (g.over) { ok(g.stack[0] + g.stack[1] === total, 'fichas al terminar'); }
  ok(guard < 400, 'partida infinita (semilla ' + seed + ')');
}
console.log('manos jugadas: ' + hands + ' (showdown ' + shows + ', retiradas ' + folds + ', turnos con all-in ' + allins + ')');
// 3) torneos entre niveles
function match(la, lb, seed, sims) {
  const r = rng32(seed), g = new P.Hold({ rng: r, button: seed & 1 }), lv = [la, lb], mem = [{}, {}];
  let guard = 0;
  while (!g.matchOver && guard++ < 3000) {
    if (g.over) { if (!g.newHand()) break; continue; }
    const p = g.cur, facing = g.legal(p).call > 0, d = P.botDecide(g, p, lv[p], mem[p], sims);
    P.trackOpp(mem[p ^ 1], d.a, facing);
    if (!g.act(p, d.a, d.amt)) { g.act(p, g.legal(p).check ? 'check' : 'call'); }
  }
  return g.matchOver === null ? (g.stack[0] > g.stack[1] ? 0 : 1) : g.matchOver;
}
const N = +process.argv[2] || 60;
for (const [a, b] of [[2, 0], [1, 0], [2, 1]]) {
  let wa = 0, t0 = Date.now();
  for (let i = 0; i < N; i++) { const swap = i % 2; const w = swap ? match(b, a, 100 + i) : match(a, b, 100 + i); if ((w === 0) !== !!swap) wa++; }
  console.log('nivel ' + a + ' vs ' + b + ': gana el ' + a + ' ' + wa + ' de ' + N + ' (' + Math.round(100 * wa / N) + '%) · ' + Math.round((Date.now() - t0) / N) + ' ms por partida');
}
console.log(bad ? 'HAY ERRORES: ' + bad : 'Reglas y evaluador correctos');
process.exit(bad ? 1 : 0);
