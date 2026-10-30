'use strict';
const W = 1280, H = 720;
const GROUND_Y = 560;      // línea media del carril
const WALL_X = 200;        // cara frontal de la muralla
const GRAV = 1800;
const SPAWN_X = 1340;
const MAX_LEVEL = 40;
const OPEN_LEVELS = 10;    // niveles jugables en esta versión (Mundo 1)

// El superviviente: lanza desde la muralla.
const HAND = { x: 128, y: 268 };
const MAX_PULL = 210;      // px de arrastre para la potencia máxima

// Ranuras para defensas colocables. "roof" = sobre la muralla.
const SLOT_DEFS = [
  { x: 178, y: 326, kind: 'roof' },
  { x: 330, y: GROUND_Y, kind: 'ground' },
  { x: 450, y: GROUND_Y, kind: 'ground' },
  { x: 570, y: GROUND_Y, kind: 'ground' },
];

const MATS = {
  madera: { name: 'Madera', color: '#b07a42' },
  tela: { name: 'Tela', color: '#e6dcc4' },
  chatarra: { name: 'Chatarra', color: '#9aa3ab' },
};
const MAT_ORDER = ['madera', 'tela', 'chatarra'];

// Armas que lanza el superviviente. ammo: null = infinita, si no, clave de AMMO.
const WEAPONS = {
  piedra: { name: 'Piedras', unlock: 1, ammo: null, dmg: 18, cd: 0.55, vmax: 950, kind: 'rock', kx: 60, desc: 'Infinitas. Débiles, pero siempre a mano. A la cabeza hacen el doble.' },
  palo: { name: 'Palos', unlock: 3, ammo: null, dmg: 40, cd: 1.15, vmax: 820, kind: 'stick', kx: 260, desc: 'Infinitos. Lentos, pero golpean fuerte y empujan hacia atrás.' },
  honda: { name: 'Honda', unlock: 4, ammo: null, dmg: 24, cd: 0.45, vmax: 1300, kind: 'pebble', kx: 50, desc: 'Infinita. Más rápida, más recta y con más alcance que lanzar a mano.' },
  arco: { name: 'Arco', unlock: 6, ammo: 'flecha', dmg: 50, cd: 0.6, vmax: 1650, kind: 'arrow', pierce: 1, kx: 80, desc: 'Gasta flechas. Rápidas, rectas, atraviesan 2 zombis y perforan cascos.' },
  fuego: { name: 'Flechas de fuego', short: 'Fuego', unlock: 8, ammo: 'flechaFuego', dmg: 45, cd: 0.8, vmax: 1650, kind: 'firearrow', burn: 18, burnT: 4, splash: 70, kx: 80, desc: 'Muy escasas. Prenden fuego al blanco y a los que tenga cerca.' },
  molotov: { name: 'Molotov', unlock: 9, ammo: 'molotov', dmg: 30, cd: 1.2, vmax: 900, kind: 'molotov', patch: { r: 95, t: 5, dps: 24 }, kx: 0, desc: 'Muy escasas. Revientan en el suelo y dejan una zona en llamas.' },
};
const WEAPON_ORDER = ['piedra', 'palo', 'honda', 'arco', 'fuego', 'molotov'];

// Defensas colocables en ranuras: también limitadas por nivel.
const STRUCTS = {
  tablas: { name: 'Barricada', unlock: 2, ammo: 'tablas', where: 'ground', hp: 450, blocks: true, desc: 'Tablas clavadas que frenan a los zombis mientras apuntas.' },
  puas: { name: 'Púas', unlock: 5, ammo: 'puas', where: 'ground', hp: 320, blocks: false, dps: 28, desc: 'Trampa en el suelo: hiere a todo el que la pisa hasta romperse.' },
  aliado: { name: 'Aliado', unlock: 7, ammo: 'aliado', where: 'both', hp: 160, blocks: true, dmg: 14, cd: 1.5, desc: 'Un superviviente que lanza piedras por su cuenta. Arriba de la muralla está a salvo.' },
};
const STRUCT_ORDER = ['tablas', 'puas', 'aliado'];

// Consumibles: se fabrican con materiales y se gastan al usarlos.
// cap = cuánto puedes llevar a un nivel (sube con mejoras).
const AMMO = {
  flecha: { name: 'Flechas', per: 5, cost: { madera: 2, chatarra: 1 }, cap: 15, start: 15 },
  flechaFuego: { name: 'Flechas de fuego', per: 1, cost: { madera: 1, tela: 2, chatarra: 1 }, cap: 3, start: 3 },
  molotov: { name: 'Molotov', per: 1, cost: { tela: 3, chatarra: 1 }, cap: 2, start: 2 },
  tablas: { name: 'Barricadas', per: 1, cost: { madera: 4 }, cap: 1, start: 2 },
  puas: { name: 'Púas', per: 1, cost: { madera: 2, chatarra: 2 }, cap: 1, start: 2 },
  aliado: { name: 'Aliados', per: 1, cost: null, cap: 1, start: 0 },
};
const AMMO_ORDER = ['flecha', 'flechaFuego', 'molotov', 'tablas', 'puas'];

// Mejoras permanentes (se pagan con engranajes).
const UPGRADES = {
  fuerza: { name: 'Fuerza', unlock: 1, max: 5, cost: [12, 25, 45, 75, 120], desc: l => `Daño de lanzamiento <em>+${l * 15}%</em>` },
  punteria: { name: 'Puntería', unlock: 1, max: 5, cost: [10, 22, 40, 65, 100], desc: l => `Ves el <em>${aimPct(l)}%</em> de la trayectoria` },
  recarga: { name: 'Recarga', unlock: 1, max: 5, cost: [12, 25, 45, 75, 120], desc: l => `Lanzas <em>${l * 10}%</em> más rápido` },
  muralla: { name: 'Muralla', unlock: 1, max: 5, cost: [10, 22, 40, 65, 100], desc: l => `Vida de la muralla <em>+${l * 25}%</em>` },
  mochila: { name: 'Mochila', unlock: 3, max: 3, cost: [20, 60, 130], desc: l => `<em>${2 + l}</em> casillas de armas` },
  carpinteria: { name: 'Carpintería', unlock: 2, max: 3, cost: [20, 45, 90], desc: l => `Barricadas y púas: <em>+${l * 30}%</em> vida, llevas <em>${1 + l}</em> de cada` },
  carcaj: { name: 'Carcaj', unlock: 6, max: 3, cost: [25, 55, 110], desc: l => `Llevas <em>${15 + l * 5}</em> flechas y <em>${3 + l}</em> de fuego` },
  alforja: { name: 'Alforja', unlock: 9, max: 2, cost: [40, 100], desc: l => `Llevas <em>${2 + l}</em> molotov` },
  aliados: { name: 'Aliados', unlock: 7, max: 3, cost: [25, 60, 120], desc: l => `Daño del aliado <em>+${l * 30}%</em>${l >= 2 ? ', <em>2 aliados</em>' : ''}` },
};
const UP_ORDER = ['fuerza', 'punteria', 'recarga', 'muralla', 'mochila', 'carpinteria', 'carcaj', 'alforja', 'aliados'];
function aimPct(l) { return Math.min(100, 30 + l * 14); }

const ZOMBIES = {
  caminante: { name: 'Caminante', hp: 100, speed: 26, dmg: 12, atk: 1, w: 34, h: 80, mass: 1, unlock: 1, skin: '#8fae6b', shirt: '#5b6f8c', pants: '#3d3a4a', mats: { madera: 0.25, tela: 0.1 }, desc: 'Lento y torpe, pero nunca viene solo. Apunta a la cabeza.' },
  corredor: { name: 'Corredor', hp: 65, speed: 62, dmg: 8, atk: 1.4, w: 30, h: 78, mass: 0.8, unlock: 3, skin: '#a3b67a', shirt: '#a8432f', pants: '#2f3340', mats: { tela: 0.15, madera: 0.1 }, desc: 'Rápido pero frágil. Llega antes de que te des cuenta.' },
  casco: { name: 'Obrero', hp: 110, armor: 160, speed: 24, dmg: 12, atk: 1, w: 34, h: 80, mass: 1.1, unlock: 5, skin: '#86a466', shirt: '#d9822b', pants: '#3b4a6b', mats: { chatarra: 0.4, madera: 0.2 }, desc: 'Las piedras rebotan en su casco: apunta al cuerpo o usa flechas.' },
  bruto: { name: 'Bruto', hp: 480, speed: 18, dmg: 32, atk: 0.7, w: 52, h: 104, mass: 3, unlock: 7, skin: '#7d9b5e', shirt: '#3e5a3a', pants: '#4a3b2e', scale: 1.3, mats: { madera: 1, chatarra: 1 }, desc: 'Enorme y resistente. Sus golpes destrozan barricadas.' },
  hinchado: { name: 'Hinchado', hp: 170, speed: 22, dmg: 10, atk: 1, w: 44, h: 84, mass: 1.6, unlock: 8, skin: '#9cbf4f', shirt: '#6d7f3a', pants: '#3d3a4a', boom: { r: 110, dmg: 80 }, mats: { tela: 0.4 }, desc: 'Revienta al morir y daña lo que tenga cerca. ¡Mátalo lejos de tus defensas!' },
  saltador: { name: 'Saltador', hp: 115, speed: 42, dmg: 10, atk: 1.2, w: 30, h: 84, mass: 0.9, unlock: 9, skin: '#9ab27a', shirt: '#2f8f8a', pants: '#22262e', mats: { tela: 0.3, chatarra: 0.2 }, desc: 'Salta por encima de la primera defensa que le bloquea.' },
  cuervo: { name: 'Cuervo', hp: 55, speed: 80, dmg: 8, atk: 1.2, w: 40, h: 28, mass: 0.5, unlock: 12, fly: true, mats: { tela: 0.3 }, desc: 'Vuela directo a la muralla.' },
  escupidor: { name: 'Escupidor', hp: 140, speed: 24, dmg: 22, atk: 0.4, w: 36, h: 82, mass: 1, unlock: 14, skin: '#8a6fae', shirt: '#3a3550', pants: '#2b2838', ranged: 330, mats: { tela: 0.6 }, desc: 'Escupe ácido a distancia contra tus defensas.' },
  excavador: { name: 'Excavador', hp: 170, speed: 38, dmg: 14, atk: 1, w: 34, h: 80, mass: 1.1, unlock: 17, skin: '#94a870', shirt: '#6b5a3a', pants: '#3a3326', dig: true, mats: { chatarra: 0.6 }, desc: 'Avanza bajo tierra y emerge justo delante de la muralla.' },
  escudo: { name: 'Antidisturbios', hp: 170, shield: 520, speed: 20, dmg: 14, atk: 1, w: 40, h: 82, mass: 1.4, unlock: 22, skin: '#7e9a62', shirt: '#2a3550', pants: '#1d2333', mats: { chatarra: 1 }, desc: 'Su escudo bloquea lo que viene de frente.' },
  jefe1: { name: 'El Mamut', boss: true, hp: 4200, speed: 13, dmg: 70, atk: 0.55, w: 100, h: 192, mass: 12, unlock: 10, skin: '#6f8f52', shirt: '#5a3e2b', pants: '#3b2f25', scale: 2.4, stomp: true, mats: { madera: 12, tela: 8, chatarra: 10 }, desc: 'Una montaña de carne podrida. Sus pisotones sacuden tus defensas. Guarda tu mejor munición para él.' },
  jefe2: { name: 'La Abominación', boss: true, hp: 9000, speed: 12, dmg: 110, atk: 0.5, w: 104, h: 200, mass: 14, unlock: 20, skin: '#6c7f8f', shirt: '#2c2f3a', pants: '#22252e', scale: 2.5, summon: true, mats: {}, desc: 'Libera bandadas de cuervos mientras avanza.' },
  jefe3: { name: 'Reina del Pantano', boss: true, hp: 14000, speed: 12, dmg: 120, spitDmg: 38, atk: 0.4, w: 104, h: 200, mass: 14, unlock: 30, skin: '#7d5f9a', shirt: '#2f4a2a', pants: '#203320', scale: 2.5, ranged: 430, volley: true, mats: {}, desc: 'Lanza lluvias de ácido sobre tus defensas.' },
  jefe4: { name: 'Coloso de Hierro', boss: true, hp: 26000, armor: 3000, speed: 11, dmg: 150, atk: 0.5, w: 112, h: 216, mass: 18, unlock: 40, skin: '#7a8a6a', shirt: '#5a5f66', pants: '#3a3d42', scale: 2.7, thrower: true, mats: {}, desc: 'Blindado. Arroja zombis por encima de tus defensas.' },
};

const WORLDS = [
  { name: 'El Deshuesadero', sub: 'Sobrevive con lo que encuentres a mano', color: '#f08a4b' },
  { name: 'Ciudad Apagada', sub: 'La era de la pólvora', color: '#7fb2ff' },
  { name: 'Pantano Tóxico', sub: 'La era del metal', color: '#b6ff5a' },
  { name: 'Fundición Infernal', sub: 'La era de la chatarra eléctrica', color: '#ff7a2a' },
];

const RANKS = [[0, 'Novato'], [12, 'Superviviente'], [30, 'Cazador'], [55, 'Veterano'], [85, 'Guardián'], [120, 'Leyenda del muro']];

// ---------- Niveles del Mundo 1 (hechos a mano) ----------
// Cada oleada: [tipo, cantidad, separación (s), inicio (s)]. hp = multiplicador de vida.
const BAL = { hp: 1, boss: 0.42 };
const LEVELS = (() => {
  const C = 'caminante', R = 'corredor', K = 'casco', B = 'bruto', X = 'hinchado', S = 'saltador';
  return {
  1: { hp: 0.65, waves: [[[C, 2, 7, 3]], [[C, 3, 5, 1]], [[C, 5, 3.6, 0]]] },
  2: { hp: 0.75, waves: [[[C, 3, 5, 2]], [[C, 4, 3.8, 0]], [[C, 7, 2.6, 0]]] },
  3: { hp: 0.85, waves: [[[C, 3, 4, 2], [R, 1, 1, 10]], [[C, 4, 3.4, 0], [R, 2, 4, 5]], [[C, 6, 2.5, 0], [R, 4, 3, 4]]] },
  4: { hp: 0.9, waves: [[[C, 4, 3, 1], [R, 1, 3, 8]], [[R, 3, 3, 0], [C, 5, 2.8, 3]], [[C, 7, 2.3, 0], [R, 4, 2.6, 3]]] },
  5: { hp: 0.95, waves: [[[C, 4, 3, 1], [K, 1, 1, 9]], [[K, 3, 4, 0], [C, 4, 3, 2], [R, 2, 3, 8]], [[C, 6, 2, 0], [K, 4, 3, 2], [R, 4, 2.5, 6]]] },
  6: { hp: 1.0, waves: [[[C, 5, 2.5, 1], [R, 2, 2, 8]], [[K, 3, 3, 0], [R, 3, 2.2, 4]], [[C, 6, 2, 0], [K, 3, 3, 3]], [[C, 7, 1.9, 0], [K, 4, 2.6, 2], [R, 5, 2.2, 6]]] },
  7: { hp: 1.05, waves: [[[C, 5, 2.5, 1], [B, 1, 1, 10]], [[R, 6, 2, 0], [K, 3, 3, 4]], [[B, 2, 6, 0], [C, 6, 2, 2]], [[C, 8, 1.6, 0], [K, 4, 2.5, 3], [B, 2, 5, 6], [R, 5, 2, 8]]] },
  8: { hp: 1.1, waves: [[[C, 6, 2, 1], [X, 1, 1, 8]], [[K, 4, 2.5, 0], [X, 2, 4, 3]], [[B, 2, 5, 0], [R, 6, 1.8, 2], [C, 4, 2, 6]], [[C, 10, 1.4, 0], [X, 3, 3, 3], [B, 2, 5, 5], [K, 5, 2, 8]]] },
  9: { hp: 1.15, waves: [[[C, 6, 2, 1], [S, 2, 4, 8]], [[S, 3, 3, 0], [K, 3, 2.5, 3]], [[B, 2, 5, 0], [X, 2, 3, 2], [R, 5, 1.8, 5]], [[C, 9, 1.4, 0], [S, 3, 3, 3], [B, 2, 5, 6], [K, 4, 2.2, 8], [X, 2, 4, 10]]] },
  10: { hp: 1.15, boss: 'jefe1', waves: [[[C, 6, 2, 1], [R, 4, 2, 6]], [[K, 5, 2.5, 0], [B, 2, 5, 4], [S, 3, 3, 6]], [[C, 8, 1.5, 0], [X, 3, 3, 2], [R, 6, 1.6, 5]], [[C, 6, 2.2, 0], [K, 4, 2.5, 3], [S, 2, 4, 8]]] },
  };
})();

function worldOf(L) { return Math.min(3, Math.floor((L - 1) / 10)); }

function buildLevel(L) {
  const def = LEVELS[L];
  const waves = def.waves.map(gs => ({ groups: gs.map(g => ({ type: g[0], n: g[1], gap: g[2], at: g[3] })) }));
  waves[waves.length - 1].final = true;
  if (def.boss) waves[waves.length - 1].boss = def.boss;
  const enemyTypes = [...new Set(waves.flatMap(w => w.groups.map(g => g.type)).concat(def.boss ? [def.boss] : []))];
  const feature = def.boss || enemyTypes.find(t => ZOMBIES[t].unlock === L) || null;
  return { L, world: worldOf(L), waves, boss: def.boss || null, feature, enemyTypes, hpMul: def.hp * BAL.hp, bossMul: BAL.boss, spdMul: 1, dmgMul: 1 };
}

// Modo infinito: oleadas generadas con los zombis del Mundo 1.
const THREAT = { caminante: 1, corredor: 1.1, casco: 2, bruto: 5, hinchado: 2.6, saltador: 2 };
const WEIGHT = { caminante: 5, corredor: 3, casco: 2.4, bruto: 1.1, hinchado: 1.4, saltador: 1.7 };
function endlessWave(n) {
  const types = Object.keys(THREAT).filter(t => ZOMBIES[t].unlock <= Math.min(9, 1 + n));
  let b = 6 + n * 3.5 + n * n * 0.15, at = 1;
  const groups = [];
  for (let guard = 0; b > 0.9 && guard < 40; guard++) {
    const av = types.filter(t => THREAT[t] <= b + 0.4);
    if (!av.length) break;
    let tot = 0; av.forEach(t => tot += WEIGHT[t]);
    let r = Math.random() * tot, t = av[0];
    for (const k of av) { r -= WEIGHT[k]; if (r <= 0) { t = k; break; } }
    const cnt = Math.max(1, Math.min(Math.floor((b + 0.4) / THREAT[t]), 2 + Math.floor(Math.random() * 5)));
    const gap = (t === 'bruto' ? 3.5 : t === 'corredor' ? 1.3 : 2) * (0.8 + Math.random() * 0.4);
    groups.push({ type: t, n: cnt, gap, at });
    b -= cnt * THREAT[t]; at += cnt * gap * 0.6 + Math.random() * 2;
  }
  const end = Math.max(...groups.map(g => g.at + (g.n - 1) * g.gap));
  if (end > 32) { const f = 32 / end; groups.forEach(g => { g.at *= f; g.gap *= f; }); }
  const w = { groups };
  if (n % 10 === 0) w.boss = 'jefe1';
  return w;
}
