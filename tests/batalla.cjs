// Pruebas de Batalla Naval: colocación, disparos y fuerza de los 3 niveles del bot (disparos medios para hundir la flota).
const B = require('../clasicos/batalla-engine.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FALLA: ' + m); } };
const b = new B.Board();
ok(b.place('portaaviones', 0, 0, true), 'colocar'); ok(!b.place('acorazado', 0, 3, true), 'no solapar'); ok(!b.place('acorazado', 9, 8, true), 'no salir'); ok(b.place('acorazado', 1, 0, false), 'vertical');
ok(b.place('portaaviones', 5, 5, false) && b.shipAt(0, 0) === null, 'mover un barco');
const t = new B.Board(); for (const d of B.SHIPS) t.place(d.id, B.SHIPS.indexOf(d) * 2, 0, true);
ok(t.complete(), 'flota completa');
let last, sunk = 0;
for (const sh of t.ships.slice()) for (const [r, c] of sh.cells) { last = t.receive(r, c); if (last.res === 'sunk') { sunk++; ok(sh.id === last.id && last.over === (sunk === 5), 'hundir y terminar solo con el último'); } }
ok(sunk === 5 && last.over === true, 'flota hundida');
ok(t.receive(0, 0) === null, 'no repetir');
ok(B.Board.fromList(t.list()) !== null, 'fromList válido'); ok(B.Board.fromList([{ id: 'x', r: 0, c: 0, h: true }]) === null, 'fromList inválido');
for (let i = 0; i < 300; i++) { const r = B.Board.random(); ok(r.complete() && r.ships.reduce((a, s) => a + s.len, 0) === 17, 'flota aleatoria completa'); }
const N = +process.argv[2] || 300;
function shots(level) {
  const f = B.Board.random(), s = new B.Shooter(level); let n = 0;
  for (;;) { const p = s.next(); if (!p) return n; const o = f.receive(p[0], p[1]); n++; s.feed(p[0], p[1], o.res, o.cells); if (o.over) return n; }
}
const avg = [0, 1, 2].map(l => { let sum = 0; for (let i = 0; i < N; i++) sum += shots(l); return sum / N; });
console.log('disparos medios para hundir la flota (menos = mejor): Fácil ' + avg[0].toFixed(1) + ' · Medio ' + avg[1].toFixed(1) + ' · Difícil ' + avg[2].toFixed(1));
ok(avg[2] < avg[1] && avg[1] < avg[0] - 10, 'orden de niveles');
console.log(bad ? 'HAY ERRORES' : 'Batalla naval correcta'); process.exit(bad ? 1 : 0);
