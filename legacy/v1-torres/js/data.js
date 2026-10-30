'use strict';
const W = 1280, H = 720;
const GROUND_Y = 560;      // línea media del carril
const WALL_X = 200;        // cara frontal del búnker
const GRAV = 1800;
const SPAWN_X = 1340;
const MAX_LEVEL = 40;

// Ranuras de construcción. "roof" = elevadas (los zombis de suelo no las alcanzan).
const SLOT_DEFS = [
  { x: 108, y: 330, kind: 'roof' },
  { x: 166, y: 330, kind: 'roof' },
  { x: 320, y: GROUND_Y, kind: 'ground' },
  { x: 420, y: GROUND_Y, kind: 'ground' },
  { x: 520, y: GROUND_Y, kind: 'ground' },
  { x: 620, y: GROUND_Y, kind: 'ground' },
  { x: 720, y: GROUND_Y, kind: 'ground' },
  { x: 252, y: 440, kind: 'roof', extra: 1 },
  { x: 820, y: GROUND_Y, kind: 'ground', extra: 2 },
];

const DEFENSES = {
  ballesta: {
    name: 'Ballesta', cost: 100, cd: 2.5, hp: 260, unlock: 1, where: 'both', blocks: true,
    dmg: 22, rate: 1.1, range: 700,
    desc: 'Dispara virotes rápidos. Alcanza a los voladores.',
    s3: 'Perforación: atraviesa 2 enemigos', s5: 'Ráfaga triple',
  },
  recolector: {
    name: 'Recolector', cost: 75, cd: 4, hp: 220, unlock: 2, where: 'both', blocks: true,
    gen: 25, genTime: 9,
    desc: 'Imán que fabrica chatarra cada pocos segundos.',
    s3: 'Produce 40% más rápido', s5: 'Tornillos dorados (valor x2)',
  },
  barricada: {
    name: 'Barricada', cost: 50, cd: 12, hp: 1100, unlock: 3, where: 'ground', blocks: true,
    thorns: 10,
    desc: 'Muro de chatarra con púas. Frena a la horda y la hiere.',
    s3: 'Púas afiladas: espinas x3', s5: 'Autorreparación constante',
  },
  catapulta: {
    name: 'Catapulta', cost: 175, cd: 5, hp: 280, unlock: 5, where: 'both', blocks: true,
    dmg: 65, rate: 0.33, range: 1000, minRange: 140, splash: 90,
    desc: 'Lanza rocas en arco que aplastan grupos. Ignora escudos.',
    s3: 'Bomba de racimo', s5: 'Rocas incendiarias',
  },
  lanzallamas: {
    name: 'Lanzallamas', cost: 150, cd: 5, hp: 340, unlock: 8, where: 'both', blocks: true,
    dps: 48, burn: 12, range: 200,
    desc: 'Cono de fuego a corta distancia. Quema a todo el que esté delante.',
    s3: 'Alcance +35%', s5: 'Napalm: quemaduras más largas y fuertes',
  },
  tesla: {
    name: 'Bobina Tesla', cost: 225, cd: 7, hp: 280, unlock: 11, where: 'both', blocks: true,
    dmg: 42, rate: 0.75, range: 320, chains: 3,
    desc: 'Rayo que salta entre enemigos. Atraviesa escudos y alcanza voladores.',
    s3: '+2 saltos de rayo', s5: 'Aturde a los enemigos',
  },
  mina: {
    name: 'Mina', cost: 30, cd: 16, hp: 1, unlock: 15, where: 'ground', blocks: false,
    dmg: 320, radius: 135,
    desc: 'Explota cuando un zombi la pisa. Un solo uso, mucho daño.',
    s3: 'Radio +35%', s5: 'Doble detonación',
  },
  sierra: {
    name: 'Lanzasierras', cost: 200, cd: 6, hp: 300, unlock: 21, where: 'both', blocks: true,
    dmg: 38, rate: 0.42, pierce: 6,
    desc: 'Dispara sierras que ruedan y rebotan atravesando zombis.',
    s3: '+4 de perforación', s5: 'Las sierras regresan',
  },
  riel: {
    name: 'Cañón de Riel', cost: 300, cd: 9, hp: 320, unlock: 31, where: 'both', blocks: true,
    dmg: 190, rate: 0.17, range: 1200,
    desc: 'Carga y dispara un rayo que atraviesa a 8 enemigos, blindaje incluido.',
    s3: 'Carga 30% más rápida', s5: 'Doble disparo',
  },
};
const DEF_ORDER = ['ballesta', 'recolector', 'barricada', 'catapulta', 'lanzallamas', 'tesla', 'mina', 'sierra', 'riel'];

const ZOMBIES = {
  caminante: { name: 'Caminante', hp: 100, speed: 26, dmg: 12, atk: 1, scrap: 10, w: 34, h: 80, mass: 1, unlock: 1, skin: '#8fae6b', shirt: '#5b6f8c', pants: '#3d3a4a', desc: 'Lento y torpe, pero nunca viene solo.' },
  corredor: { name: 'Corredor', hp: 65, speed: 62, dmg: 8, atk: 1.4, scrap: 12, w: 30, h: 78, mass: 0.8, unlock: 2, skin: '#a3b67a', shirt: '#a8432f', pants: '#2f3340', desc: 'Rápido pero frágil. Llega antes de que te des cuenta.' },
  casco: { name: 'Obrero', hp: 110, armor: 180, speed: 24, dmg: 12, atk: 1, scrap: 16, w: 34, h: 80, mass: 1.1, unlock: 4, skin: '#86a466', shirt: '#d9822b', pants: '#3b4a6b', desc: 'Su casco absorbe gran parte del daño hasta que sale volando.' },
  bruto: { name: 'Bruto', hp: 480, speed: 18, dmg: 32, atk: 0.7, scrap: 35, w: 52, h: 104, mass: 3, unlock: 6, skin: '#7d9b5e', shirt: '#3e5a3a', pants: '#4a3b2e', scale: 1.3, desc: 'Enorme y resistente. Sus golpes destrozan defensas.' },
  hinchado: { name: 'Hinchado', hp: 170, speed: 22, dmg: 10, atk: 1, scrap: 20, w: 44, h: 84, mass: 1.6, unlock: 7, skin: '#9cbf4f', shirt: '#6d7f3a', pants: '#3d3a4a', boom: { r: 110, dmg: 90 }, desc: 'Revienta al morir y daña lo que tenga cerca. ¡Mátalo lejos!' },
  saltador: { name: 'Saltador', hp: 115, speed: 42, dmg: 10, atk: 1.2, scrap: 18, w: 30, h: 84, mass: 0.9, unlock: 9, skin: '#9ab27a', shirt: '#2f8f8a', pants: '#22262e', desc: 'Salta por encima de la primera defensa que le bloquea.' },
  cuervo: { name: 'Cuervo', hp: 55, speed: 80, dmg: 8, atk: 1.2, scrap: 12, w: 40, h: 28, mass: 0.5, unlock: 12, fly: true, desc: 'Vuela directo al búnker. Solo lo alcanzan ballestas, teslas, rieles y explosiones.' },
  escupidor: { name: 'Escupidor', hp: 140, speed: 24, dmg: 22, atk: 0.4, scrap: 22, w: 36, h: 82, mass: 1, unlock: 14, skin: '#8a6fae', shirt: '#3a3550', pants: '#2b2838', ranged: 330, desc: 'Escupe ácido a distancia contra tus defensas.' },
  excavador: { name: 'Excavador', hp: 170, speed: 38, dmg: 14, atk: 1, scrap: 24, w: 34, h: 80, mass: 1.1, unlock: 17, skin: '#94a870', shirt: '#6b5a3a', pants: '#3a3326', dig: true, desc: 'Avanza bajo tierra y emerge justo delante del búnker.' },
  escudo: { name: 'Antidisturbios', hp: 170, shield: 520, speed: 20, dmg: 14, atk: 1, scrap: 30, w: 40, h: 82, mass: 1.4, unlock: 22, skin: '#7e9a62', shirt: '#2a3550', pants: '#1d2333', desc: 'Su escudo bloquea virotes y sierras. Usa arcos, fuego o electricidad.' },
  jefe1: { name: 'El Mamut', boss: true, hp: 4200, speed: 13, dmg: 90, atk: 0.55, scrap: 300, w: 100, h: 192, mass: 12, unlock: 10, skin: '#6f8f52', shirt: '#5a3e2b', pants: '#3b2f25', scale: 2.4, stomp: true, desc: 'Una montaña de carne podrida. Sus pisotones sacuden tus defensas.' },
  jefe2: { name: 'La Abominación', boss: true, hp: 9000, speed: 12, dmg: 110, atk: 0.5, scrap: 500, w: 104, h: 200, mass: 14, unlock: 20, skin: '#6c7f8f', shirt: '#2c2f3a', pants: '#22252e', scale: 2.5, summon: true, desc: 'Libera bandadas de cuervos mientras avanza.' },
  jefe3: { name: 'Reina del Pantano', boss: true, hp: 14000, speed: 12, dmg: 120, spitDmg: 38, atk: 0.4, scrap: 700, w: 104, h: 200, mass: 14, unlock: 30, skin: '#7d5f9a', shirt: '#2f4a2a', pants: '#203320', scale: 2.5, ranged: 430, volley: true, desc: 'Lanza lluvias de ácido sobre tus máquinas.' },
  jefe4: { name: 'Coloso de Hierro', boss: true, hp: 26000, armor: 3000, speed: 11, dmg: 150, atk: 0.5, scrap: 1000, w: 112, h: 216, mass: 18, unlock: 40, skin: '#7a8a6a', shirt: '#5a5f66', pants: '#3a3d42', scale: 2.7, thrower: true, desc: 'Blindado. Arroja zombis por encima de tus defensas.' },
};

const WORLDS = [
  { name: 'El Deshuesadero', sub: 'Atardecer entre montañas de chatarra', color: '#f08a4b' },
  { name: 'Ciudad Apagada', sub: 'Lluvia, edificios muertos y la horda', color: '#7fb2ff' },
  { name: 'Pantano Tóxico', sub: 'Niebla verde y criaturas mutadas', color: '#b6ff5a' },
  { name: 'Fundición Infernal', sub: 'El corazón de hierro del apocalipsis', color: '#ff7a2a' },
];

const UP_COST = [20, 45, 90, 160, 260];
const BASE_UP = {
  muralla: { name: 'Muralla reforzada', max: 5, cost: [30, 60, 110, 180, 280], desc: l => `Vida del búnker <em>+${l * 25}%</em>` },
  canon: { name: 'Cañón del búnker', max: 5, cost: [30, 60, 110, 180, 280], desc: l => `Daño <em>+${l * 25}%</em> · recarga <em>-${l * 10}%</em>` },
  chatarra: { name: 'Reservas', max: 5, cost: [25, 50, 90, 150, 240], desc: l => `Chatarra inicial <em>+${l * 40}</em>` },
  produccion: { name: 'Producción', max: 5, cost: [30, 60, 110, 180, 280], desc: l => `Chatarra pasiva <em>+${l * 25}%</em>` },
  reparacion: { name: 'Reparación', max: 3, cost: [60, 140, 260], desc: l => `Repara <em>${l * 8}%</em> del búnker entre oleadas` },
  ampliacion: { name: 'Ampliar taller', max: 2, cost: [90, 220], desc: l => l === 0 ? 'Nv1: andamio con plataforma elevada extra' : l === 1 ? 'Nv2: nueva ranura de suelo adelantada' : 'Taller al máximo: <em>+2 ranuras</em>' },
};
const BASE_ORDER = ['muralla', 'canon', 'chatarra', 'produccion', 'reparacion', 'ampliacion'];

const RANKS = [[0, 'Novato'], [20, 'Chatarrero'], [50, 'Mecánico'], [100, 'Ingeniero'], [170, 'Maestro forjador'], [260, 'Leyenda del taller']];

// ---------- Niveles ----------
// Curva de dificultad (calibrada con simulaciones de la campaña completa).
const BAL = { base: 30, lin: 12, quad: 0.42, hp: 0.11, hp2: 0.006, dmg: 0.035 };
const THREAT = { caminante: 1, corredor: 1.1, casco: 2, bruto: 5, hinchado: 2.6, saltador: 2, cuervo: 1.4, escupidor: 2.6, excavador: 2.6, escudo: 4 };
const WEIGHT = { caminante: 5, corredor: 3, casco: 2.4, bruto: 1.1, hinchado: 1.4, saltador: 1.7, cuervo: 1.2, escupidor: 1.4, excavador: 1.4, escudo: 1.2 };

// Primeros niveles hechos a mano: [tipo, cantidad, separación (s), inicio (s)]
const HAND_LEVELS = {
  1: [[['caminante', 3, 7, 3]], [['caminante', 5, 4.5, 1]], [['caminante', 9, 2.4, 0]]],
  2: [[['caminante', 4, 5, 2]], [['caminante', 4, 4, 0], ['corredor', 2, 5, 6]], [['caminante', 8, 2.3, 0], ['corredor', 5, 2.8, 4]]],
  3: [[['caminante', 5, 4, 2], ['corredor', 2, 4, 10]], [['corredor', 5, 2.4, 0], ['caminante', 6, 2.8, 3]], [['caminante', 11, 1.9, 0], ['corredor', 7, 2.2, 5]]],
};

function pickType(types, rng) {
  let tot = 0;
  const ws = types.map(t => { tot += WEIGHT[t]; return WEIGHT[t]; });
  let r = rng() * tot;
  for (let i = 0; i < types.length; i++) { r -= ws[i]; if (r <= 0) return types[i]; }
  return types[0];
}

function makeWave(budget, types, rng, feature, isFinal, isFirst) {
  const groups = [];
  let at = 1 + rng() * 2, b = budget;
  if (feature) {
    const n = Math.max(1, Math.min(4, Math.floor(b * 0.3 / THREAT[feature])));
    groups.push({ type: feature, n, gap: 2.6, at: at + 3 });
    b -= n * THREAT[feature];
  }
  let guard = 0;
  while (b > 0.9 && guard++ < 60) {
    const avail = types.filter(t => THREAT[t] <= b + 0.4);
    if (!avail.length) break;
    const t = pickType(avail, rng), th = THREAT[t];
    const n = Math.max(1, Math.min(Math.floor((b + 0.4) / th), 2 + Math.floor(rng() * (isFinal ? 7 : 5))));
    const base = (t === 'bruto' || t === 'escudo') ? 3.2 : (t === 'corredor' || t === 'cuervo') ? 1.1 : 1.8;
    const gap = base * (isFinal ? 0.6 : 1) * (0.8 + rng() * 0.5);
    groups.push({ type: t, n, gap, at });
    b -= n * th;
    at += n * gap * (isFinal ? 0.45 : 0.7) + rng() * 2.5;
  }
  // Cada oleada cabe en una ventana fija: a más presupuesto, más densidad (y más presión).
  const D = isFinal ? 38 : isFirst ? 40 : 30;
  const end = Math.max(...groups.map(g => g.at + (g.n - 1) * g.gap));
  if (end > D) { const f = D / end; groups.forEach(g => { g.at *= f; g.gap *= f; }); }
  return groups;
}

function worldOf(L) { return Math.min(3, Math.floor((L - 1) / 10)); }

function buildLevel(L) {
  const world = worldOf(L);
  const rng = mulberry32(L * 7919 + 31);
  const types = Object.keys(THREAT).filter(t => ZOMBIES[t].unlock <= L);
  const feature = types.find(t => ZOMBIES[t].unlock === L) || null;
  let waves;
  if (HAND_LEVELS[L]) {
    waves = HAND_LEVELS[L].map(gs => ({ groups: gs.map(g => ({ type: g[0], n: g[1], gap: g[2], at: g[3] })) }));
  } else {
    const nW = L <= 5 ? 3 : L <= 15 ? 4 : 5;
    const budget = BAL.base + L * BAL.lin + L * L * BAL.quad;
    waves = [];
    for (let i = 0; i < nW; i++) {
      const isFinal = i === nW - 1;
      const share = isFinal ? 0.36 : 0.64 * (i + 1) / (nW * (nW - 1) / 2);
      waves.push({ groups: makeWave(budget * share, types, rng, (feature && i >= 1) ? feature : null, isFinal, i === 0) });
    }
  }
  waves[waves.length - 1].final = true;
  const boss = L % 10 === 0 ? 'jefe' + (world + 1) : null;
  if (boss) waves[waves.length - 1].boss = boss;
  const enemyTypes = [...new Set(waves.flatMap(w => w.groups.map(g => g.type)).concat(boss ? [boss] : []))];
  return { L, world, waves, boss, feature: boss || feature, enemyTypes, hpMul: 1 + BAL.hp * (L - 1) + BAL.hp2 * (L - 1) * (L - 1), spdMul: 1 + 0.004 * (L - 1), dmgMul: 1 + BAL.dmg * (L - 1) };
}

function endlessWave(n) {
  const eff = Math.min(39, Math.floor(n * 1.3));
  const types = Object.keys(THREAT).filter(t => ZOMBIES[t].unlock <= Math.max(1, eff));
  const budget = 10 + n * 7 + n * n * 0.35;
  const w = { groups: makeWave(budget, types, Math.random, null, n % 5 === 0) };
  if (n % 10 === 0) w.boss = 'jefe' + (((n / 10 - 1) % 4) + 1);
  return w;
}
