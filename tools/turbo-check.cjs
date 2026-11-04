// Comprueba que los 25 niveles de Giorgio Turbo se pueden terminar: un bot sigue el camino seguro con la física real del juego.
const T = require('../turbo/js/levels.js');
let bad = 0;
for (let n = 1; n <= T.LEVELS; n++) {
  const L = T.make(n), s = T.newRun(L), dt = 1 / 60, rate = 6;              // rate: giro máximo del bot (rad/s), menor que un dedo
  let t = 0, ev = null;
  while (!s.done && !s.dead && t < 200) {
    const k = T.ringOf(s), want = L.path[Math.min(L.length - 1, k + 1)] * T.STEP;
    let d = ((want - s.theta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    s.theta += Math.max(-rate * dt, Math.min(rate * dt, d));
    const ahead = T.tile(s, T.ringOf({ dist: s.dist + L.speed * 0.09 }), T.sideOf(s));
    const jump = s.ground && ahead === T.GAP;
    ev = T.step(s, dt, jump); t += dt;
  }
  const ok = s.done;
  if (!ok) bad++;
  console.log(`Nivel ${String(n).padStart(2)}: ${ok ? 'OK ' : 'MAL'} ${t.toFixed(1)} s · vel ${L.speed.toFixed(1)} · anillos ${L.length} · peces ${s.fish}/${L.fish}${s.dead ? ' · murió por ' + s.dead + ' en anillo ' + T.ringOf(s) : ''}`);
}
process.exit(bad ? 1 : 0);
