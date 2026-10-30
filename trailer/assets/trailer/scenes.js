'use strict';
// Guion de planos de gameplay. Tiempos: t0/t1 globales (s); dentro de cada plano, ls = segundos de simulación.
const CH0 = 54, CHL = 7.25, CARD = 1.6;
function nearest(G) { return G.zombies.filter(targetable).sort((a, b) => a.x - b.x)[0]; }
function farthest(G) { return G.zombies.filter(z => targetable(z) && z.x < 1150).sort((a, b) => b.x - a.x)[0]; }
function farReach(G) { return G.zombies.filter(z => targetable(z) && z.x < 760).sort((a, b) => b.x - a.x)[0]; }
function casco(G) { return G.zombies.find(z => z.type === 'casco' && !z.dead) || nearest(G); }
function throwAt(pickFn, head, weapon, power) {
  return (G) => {
    const z = pickFn(G); if (!z) return;
    if (weapon) G.player.weapon = weapon;
    const st = weaponStats(G.player.weapon);
    const v = autoAim(HAND.x, HAND.y, z, st.vmax * (power || 0.93), st.g, 0, head ? 1 : 0);
    if (v) { G.player.cd = 0; throwWeapon(v.vx, v.vy); }
  };
}
function spawn(type, x) { return (G) => spawnZombie(type, x); }
function stream(type, from, every, n, x) { const ev = []; for (let i = 0; i < n; i++) ev.push([from + i * every, spawn(type, (x || 1300) + (i % 3) * 22)]); return ev; }
function place(key, slot) { return (G) => placeStruct(key, G.slots[slot], true); }
const ALL = { maxLevel: 10 };
function chapter(i, o) {
  const c0 = CH0 + i * CHL;
  return Object.assign({ id: 'ch' + (i + 2), t0: c0 + CARD, t1: c0 + CHL + (i < 7 ? 0.4 : 0), pre: 3, slots: true }, ALL, o);
}

const SHOTS = [
  // 0–20 · gancho y la horda
  {
    id: 'hook', t0: 0, t1: 20.45, pre: 2.4, level: 1, maxLevel: 1, seed: 11,
    events: [
      [0, spawn('caminante', 600)], [0, spawn('caminante', 760)],
      [2.05, throwAt(nearest, true)], [3.7, throwAt(nearest, true)], [5.3, throwAt(nearest, true)], [6.8, throwAt(nearest, false)],
      ...stream('caminante', 5.2, 1.15, 12), [9.5, spawn('corredor', 1320)], [12.5, spawn('corredor', 1320)],
    ],
    bot: { from: 8.4, err: 0.05, head: 0.35, gest: 0.85 },
    cam: [[0, 1.65, 360, 420], [5.2, 1.55, 400, 430], [8.6, 1.0, 640, 360], [20, 1.0, 640, 360]],
  },
  // 29–54 · cómo se juega
  {
    id: 'howto', t0: 29, t1: 54.4, pre: 1, level: 3, maxLevel: 1, seed: 23,
    events: [[0, spawn('caminante', 700)], [0, spawn('caminante', 860)], [0, spawn('casco', 1180)], [7, spawn('caminante', 1250)], [14, spawn('caminante', 1300)]],
    drags: [
      { t: 2.0, dur: 1.6, hold: 0.6, from: [780, 360] },
      { t: 7.4, dur: 1.0, hold: 0.25, from: [800, 330], pickZ: farReach, power: 1 },
      { t: 12.0, dur: 0.9, hold: 0.25, from: [760, 350], head: true },
      { t: 16.6, dur: 0.9, hold: 0.2, from: [700, 330], head: true, pickZ: casco, power: 1 },
      { t: 18.6, dur: 0.8, hold: 0.2, from: [700, 330], head: true, pickZ: casco, power: 0.97 },
      { t: 21.0, dur: 0.9, hold: 0.2, from: [700, 330], pickZ: casco, power: 0.97 },
    ],
    bot: { from: 23.2, err: 0.05, head: 0.3, gest: 0.9 },
    cam: [[0, 1.12, 560, 400], [10.4, 1.12, 560, 400], [11.2, 1.45, 520, 420], [14.6, 1.45, 520, 420], [15.4, 1.35, 560, 400], [24, 1.3, 580, 410]],
  },
  // capítulos: nivel 2 a 9
  chapter(0, { level: 2, seed: 31, events: [...stream('caminante', 0, 0.9, 9, 980), [3.4, place('tablas', 3)]], bot: { from: 0, err: 0.06, head: 0.25, gest: 1.1 }, cam: [[0, 1.2, 640, 420], [5.6, 1.25, 600, 420]] }),
  chapter(1, { level: 3, seed: 37, loadout: ['piedra', 'palo'], weapon: 'palo', events: [[0, spawn('corredor', 560)], [0, spawn('caminante', 640)], [0.6, spawn('corredor', 720)], ...stream('corredor', 1.2, 0.8, 5, 900)], bot: { from: 2.6, pick: () => 'palo', err: 0.04, head: 0.2, gest: 1.0 }, cam: [[0, 1.4, 520, 430], [5.6, 1.4, 540, 430]] }),
  chapter(2, { level: 4, seed: 41, loadout: ['piedra', 'honda'], weapon: 'honda', events: [[0, spawn('caminante', 1010)], [0, spawn('caminante', 1080)], [0, spawn('corredor', 1180)], ...stream('caminante', 0.5, 0.7, 6, 1200)], bot: { from: 2.9, pick: () => 'honda', minX: 850, maxX: 1260, err: 0.03, head: 0.4, gest: 0.75 }, cam: [[0, 1.0, 640, 360]] }),
  chapter(3, { level: 5, seed: 43, setup: G => placeStruct('puas', G.slots[2], true), events: [...stream('caminante', 0, 0.75, 8, 700), [1, spawn('casco', 760)]], bot: { from: 4.2, err: 0.06, gest: 1.3 }, cam: [[0, 1.55, 470, 450], [5.6, 1.55, 480, 450]] }),
  chapter(4, { level: 6, seed: 47, loadout: ['piedra', 'arco'], weapon: 'arco', stash: { flecha: 15 }, ammo: 'flecha', events: [[0, spawn('casco', 820)], [0, spawn('caminante', 900)], [0, spawn('casco', 980)], ...stream('caminante', 0.4, 0.9, 6, 1150)], bot: { from: 3.15, pick: () => 'arco', err: 0.03, head: 0.4, gest: 0.62 }, cam: [[0, 1.1, 600, 380], [5.6, 1.15, 620, 390]] }),
  chapter(5, { level: 7, seed: 53, setup: G => { placeStruct('aliado', G.slots[0], true); placeStruct('tablas', G.slots[3], true); }, events: [[0, spawn('bruto', 820)], ...stream('caminante', 0, 0.9, 7, 900)], bot: { from: 3, err: 0.05, gest: 1.0 }, cam: [[0, 1.6, 300, 330], [2.2, 1.6, 300, 330], [4.2, 1.15, 560, 380]] }),
  chapter(6, { level: 8, seed: 59, loadout: ['piedra', 'fuego'], weapon: 'fuego', stash: { flechaFuego: 3 }, ammo: 'flechaFuego', setup: G => placeStruct('tablas', G.slots[3], true), events: [...stream('caminante', 0, 0.35, 7, 780), [0.2, spawn('hinchado', 820)]], bot: { from: 3.3, pick: () => 'fuego', err: 0.02, head: 0, gest: 1.25 }, cam: [[0, 1.35, 620, 430], [5.6, 1.4, 640, 430]] }),
  chapter(7, { level: 9, seed: 61, loadout: ['piedra', 'molotov'], weapon: 'molotov', stash: { molotov: 2 }, ammo: 'molotov', setup: G => placeStruct('tablas', G.slots[3], true), events: [...stream('caminante', 0, 0.45, 8, 760), [0.6, spawn('saltador', 900)], [1.2, spawn('bruto', 980)]], bot: { from: 3.2, pick: () => 'molotov', err: 0.01, gest: 1.6 }, cam: [[0, 1.3, 640, 420], [5.6, 1.35, 650, 430]] }),
  // 112–117 · materiales
  {
    id: 'mats', t0: 112, t1: 117.55, pre: 1.5, level: 4, maxLevel: 4, seed: 67, mats: true,
    events: [...stream('caminante', 0, 0.3, 8, 700),
      ...[1.6, 2.1, 2.6, 3.1, 3.6, 4.1, 4.6, 5.1].map(t => [t, G => { const z = G.zombies.filter(targetable).sort((a, b) => a.x - b.x)[0]; if (!z) return; const x = z.x, y = zcy(z); killZombie(z, { kx: 200, ky: -380 }); ['madera', 'tela', 'chatarra'].forEach(m => spawnDrop(x, y, m)); }])],
    bot: { from: 1.5, err: 0.04, gest: 0.5 },
    cam: [[0, 1.0, 640, 360]],
  },
  // 126–133 · puntería
  {
    id: 'aim', t0: 126, t1: 133, pre: 0.5, level: 1, maxLevel: 1, seed: 71, pips: true,
    events: [[0, spawn('caminante', 620)], [0, spawn('caminante', 740)]],
    drags: [{ t: 0.8, dur: 0.9, hold: 5.6, from: [760, 360], power: 1, pickZ: farReach }],
    onFrame: (G, lt) => { SAVE.up.punteria = clamp(Math.floor((lt - 1.0) / 0.95), 0, 5); },
    cam: [[0, 1.0, 640, 360]],
  },
  // 133–150 · el jefe
  {
    id: 'boss', t0: 133, t1: 150.45, pre: 2, level: 10, maxLevel: 10, seed: 73, wall: 1200, slots: true,
    loadout: ['piedra', 'arco', 'fuego', 'molotov'], stash: { flecha: 15, flechaFuego: 3, molotov: 2 }, weapon: 'arco',
    setup: G => { placeStruct('tablas', G.slots[3], true); placeStruct('aliado', G.slots[0], true); },
    events: [[2.15, spawn('jefe1', 1130)], ...stream('caminante', 0, 1.4, 6, 1000), [6, spawn('casco', 1250)],
      [14.6, G => { if (G.boss && !G.boss.dead) hurt(G.boss, 99999, { type: 'blast', kx: 260, ky: -420 }); }]],
    bot: { from: 3.0, err: 0.03, head: 0.3, gest: 0.85, pick: (z, G) => z.d.boss ? (G.ammo.molotov > 0 && z.x < 900 ? 'molotov' : G.ammo.flechaFuego > 0 ? 'fuego' : 'arco') : 'arco' },
    cam: [[0, 1.0, 640, 360], [4.5, 1.0, 640, 360], [5.3, 1.35, 860, 400], [10.5, 1.35, 800, 400], [11.4, 1.6, 760, 390], [15, 1.6, 720, 400], [16.2, 1.15, 640, 380]],
  },
];
TR.shots = SHOTS;
