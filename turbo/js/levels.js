'use strict';
// Giorgio Turbo: niveles y física (sin dibujo, para poder probarlos sin navegador).
// El tubo tiene M lados; cada anillo guarda qué hay en cada lado. Todo nivel se genera con un camino seguro garantizado.
(function (root) {
  const M = 12, RING = 2.4, LEVELS = 25, STEP = Math.PI * 2 / M;
  const GAP = 0, FLOOR = 1, BOX = 2, FISH = 3, BOOST = 4;
  const GRAV = 30, JUMP = 10.5, FALL_DEAD = -2.4, BOX_H = 0.95;
  const BIOMES = [
    { name: 'Caramelo', sky: 0xffd9a0, tile: 0xff9f43, tile2: 0xffc36b, box: 0xc0392b },
    { name: 'Menta', sky: 0xbff3e2, tile: 0x1fb5a3, tile2: 0x6fdcc5, box: 0x7b3fe4 },
    { name: 'Algodón', sky: 0xffd3ec, tile: 0xf062a8, tile2: 0xffa3d1, box: 0x2f6fe4 },
    { name: 'Atardecer', sky: 0xff9d76, tile: 0x7b3fe4, tile2: 0xb48cf2, box: 0xffc629 },
    { name: 'Aurora', sky: 0x1d2a5b, tile: 0x22c1dc, tile2: 0x7fe7a8, box: 0xff5a5f },
  ];
  const biome = n => BIOMES[Math.min(BIOMES.length - 1, Math.floor((n - 1) / 5))];
  const speedOf = n => 9 + (n - 1) * 0.42;                                  // 9 → 19 unidades por segundo
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  function make(n) {
    const r = rng(n * 7919 + 13), f = (n - 1) / (LEVELS - 1), sp = speedOf(n);
    const len = Math.round(64 + n * 10), rings = [], path = [];
    const hole = 0.05 + 0.5 * f, box = 0.03 + 0.14 * f;                     // huecos y cajas fuera del camino
    const width = n < 6 ? 2 : 1;                                            // lados libres a cada lado del camino
    const air = 2 * JUMP / GRAV, maxGap = Math.max(1, Math.floor(air * sp / RING) - 1);
    const turnEvery = Math.max(2, Math.round(7 - 5 * f));                   // cada cuántos anillos puede girar el camino
    const gapEvery = Math.round(26 - 16 * f);                               // cada cuántos anillos hay un salto obligatorio
    let p = 0, nextGap = 18, fish = 0;
    for (let k = 0; k < len; k++) {
      const ring = new Uint8Array(M).fill(FLOOR);
      if (k > 10 && k < len - 6) {
        if (k % turnEvery === 0 && r() < 0.55 + 0.3 * f) p = (p + (r() < 0.5 ? 1 : -1) + M) % M;
        for (let i = 0; i < M; i++) { const v = r(); if (v < hole) ring[i] = GAP; else if (v < hole + box) ring[i] = BOX; }
        for (let d = -width; d <= width; d++) ring[(p + d + M) % M] = FLOOR;
        if (k >= nextGap) {                                                 // salto obligatorio: anillos enteros vacíos
          const g = 1 + Math.floor(r() * maxGap);
          for (let j = 0; j < g && k + j < len - 6; j++) { rings.push(new Uint8Array(M)); path.push(p); }
          k += g; nextGap = k + gapEvery + Math.floor(r() * 6);
          // el anillo de aterrizaje y el siguiente quedan limpios
          for (let j = 0; j < 2; j++) { rings.push(new Uint8Array(M).fill(FLOOR)); path.push(p); k++; }
          k--; continue;
        }
        if (k % 3 === 0) { ring[p] = FISH; fish++; }
        else if (n >= 8 && r() < 0.012) ring[p] = BOOST;
      }
      rings.push(ring); path.push(p);
    }
    // en cada giro del camino, el lado viejo y el nuevo quedan libres unos anillos para que el cambio sea justo
    for (let k = 1; k < rings.length; k++) if (path[k] !== path[k - 1]) for (let j = Math.max(0, k - 3); j <= Math.min(rings.length - 1, k + 2); j++) {
      if (rings[j].every(v => v === GAP)) continue;
      for (const q of [path[k - 1], path[k]]) if (rings[j][q] === GAP || rings[j][q] === BOX) rings[j][q] = FLOOR;
    }
    return { n, rings, path, fish, speed: sp, biome: biome(n), length: rings.length };
  }

  // Estado del corredor: theta (ángulo en el tubo), dist (avance), h (altura sobre el piso), vy.
  const newRun = L => ({ L, theta: 0, dist: 0, h: 0, vy: 0, ground: true, dead: null, done: false, fish: 0, got: new Set(), boost: 0, buffer: 0, coyote: 0 });
  const sideOf = s => ((Math.round(s.theta / STEP) % M) + M) % M;
  const ringOf = s => Math.floor(s.dist / RING);
  const tile = (s, k, side) => { if (k < 0) return FLOOR; const r = s.L.rings[k]; return r ? r[side] : FLOOR; };

  // Avanza dt segundos. wantJump: el jugador pidió saltar (se recuerda 0,12 s para que el salto se sienta inmediato).
  function step(s, dt, wantJump) {
    if (s.dead || s.done) return null;
    let ev = null;
    if (wantJump) s.buffer = 0.12; else s.buffer = Math.max(0, s.buffer - dt);
    const v = s.L.speed * (s.boost > 0 ? 1.35 : 1); s.boost = Math.max(0, s.boost - dt);
    s.dist += v * dt;
    const k = ringOf(s), side = sideOf(s), t = tile(s, k, side);
    if (k >= s.L.length) { s.done = true; return 'win'; }
    if (s.ground) {
      if (t === GAP) { s.ground = false; s.coyote = 0.09; s.vy = 0; }
      else if (s.buffer > 0) { s.ground = false; s.vy = JUMP; s.buffer = 0; ev = 'jump'; }
    } else {
      if (s.coyote > 0) { s.coyote -= dt; if (s.buffer > 0) { s.vy = JUMP; s.coyote = 0; s.buffer = 0; ev = 'jump'; } }
      s.vy -= GRAV * dt; s.h += s.vy * dt;
      if (s.h <= 0 && s.h > -0.5 && s.vy < 0 && t !== GAP) { s.h = 0; s.vy = 0; s.ground = true; ev = 'land'; }
      if (s.h < FALL_DEAD) { s.dead = 'fall'; return 'fall'; }
    }
    if (t === BOX && s.h < BOX_H) { s.dead = 'box'; return 'box'; }
    if (t === BOOST && s.ground && s.boost <= 0) { s.boost = 1.2; ev = 'boost'; }
    if (t === FISH && s.h < 1.5 && !s.got.has(k)) { s.got.add(k); s.fish++; ev = 'fish'; }
    return ev;
  }
  const starsFor = (s) => { const p = s.L.fish ? s.fish / s.L.fish : 1; return p >= 0.85 ? 3 : p >= 0.5 ? 2 : 1; };

  const api = { M, RING, LEVELS, STEP, GAP, FLOOR, BOX, FISH, BOOST, JUMP, GRAV, BIOMES, biome, speedOf, make, newRun, step, sideOf, ringOf, tile, starsFor };
  if (typeof module !== 'undefined') module.exports = api; else root.TURBO = api;
})(typeof window !== 'undefined' ? window : globalThis);
