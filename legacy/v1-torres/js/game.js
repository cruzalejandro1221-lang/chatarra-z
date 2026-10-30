'use strict';
let G = null, UID = 0;
const TIER_DMG = [1, 1.6, 2.4], TIER_RATE = [1, 1.12, 1.25], TIER_HP = [1, 1.4, 1.9], TIER_COST = [0, 0.75, 1.4];
const INPUT = { mx: -1, my: -1 };

// ---------------------------------------------------------------- estadísticas
function defStats(key, tier) {
  const d = DEFENSES[key], u = up(key), i = tier - 1;
  const m = (1 + 0.15 * u) * TIER_DMG[i];
  const s = { key, u, tier };
  s.maxHp = d.hp * (1 + (key === 'barricada' ? 0.25 : 0.15) * u) * TIER_HP[i];
  s.dmg = (d.dmg || 0) * m;
  s.rate = (d.rate || 0) * (1 + 0.06 * u) * TIER_RATE[i];
  s.range = d.range || 0;
  switch (key) {
    case 'ballesta': s.pierce = (u >= 3 ? 2 : 0) + (tier >= 3 ? 1 : 0); s.multi = u >= 5 ? 3 : 1; break;
    case 'recolector': s.gen = Math.round(d.gen * (1 + 0.4 * i)); s.genTime = d.genTime / (u >= 3 ? 1.4 : 1) / (1 + 0.05 * u); s.gold = u >= 5; break;
    case 'barricada': s.thorns = d.thorns * (u >= 3 ? 3 : 1) * TIER_DMG[i]; s.regen = u >= 5 ? 0.015 : 0; break;
    case 'catapulta': s.splash = d.splash * (1 + 0.12 * i); s.cluster = u >= 3; s.fire = u >= 5; s.minRange = d.minRange; break;
    case 'lanzallamas': s.dps = d.dps * m; s.burn = d.burn * m * (u >= 5 ? 1.6 : 1); s.burnT = u >= 5 ? 5 : 2.5; s.range = d.range * (u >= 3 ? 1.35 : 1) * (1 + 0.08 * i); break;
    case 'tesla': s.chains = d.chains + (u >= 3 ? 2 : 0) + i; s.stun = u >= 5 ? 0.7 : 0; break;
    case 'mina': s.radius = d.radius * (u >= 3 ? 1.35 : 1) * (1 + 0.1 * i); s.double = u >= 5; break;
    case 'sierra': s.pierce = d.pierce + (u >= 3 ? 4 : 0) + i * 2; s.ret = u >= 5; break;
    case 'riel': s.rate *= (u >= 3 ? 1.3 : 1); s.multi = u >= 5 ? 2 : 1; break;
  }
  return s;
}
function cannonStats() {
  const u = up('canon');
  return { dmg: 55 * (1 + 0.25 * u), cd: 2.6 * (1 - 0.1 * u), r: 75 + u * 5 };
}
function upgradeCost(t) { return t.tier >= 3 ? 0 : Math.round(DEFENSES[t.key].cost * TIER_COST[t.tier]); }
function sellValue(t) { return Math.round(t.spent * 0.5 * (0.5 + 0.5 * Math.max(0, t.hp / t.s.maxHp))); }

// ---------------------------------------------------------------- partida
function newGame(mode, L) {
  const endless = mode === 'endless', demo = mode === 'demo';
  const lvl = (endless || demo) ? { L: 0, world: demo ? (L || 0) : 0, waves: [], hpMul: 1, spdMul: 1, enemyTypes: [] } : buildLevel(L);
  const wallMax = 1000 * (1 + 0.25 * up('muralla'));
  const cs = cannonStats();
  G = {
    mode, lvl, L: lvl.L, world: lvl.world, t: 0, speed: 1, paused: false,
    scrap: 200 + 40 * up('chatarra') + (lvl.L ? 20 * (lvl.L - 1) : 0), wallHp: wallMax, wallMax, wallFlash: 0,
    slots: SLOT_DEFS.filter(s => !s.extra || up('ampliacion') >= s.extra).map(s => ({ ...s, tower: null })),
    towers: [], zombies: [], proj: [], eproj: [], parts: [], gibs: [], drops: [], bolts: [], beams: [], texts: [], rings: [], decals: [], patches: [], timers: [],
    waveIdx: -1, state: demo ? 'demo' : 'prep', stateT: demo ? 0 : (L === 1 ? 18 : 12), spawnEv: [], waveT: 0, linger: 0,
    spawned: 0, totalEv: 0, cards: {}, sel: null, selTower: null,
    cannon: { cd: 0, max: cs.cd, ang: -0.35, recoil: 0 },
    shake: 0, kills: 0, scrapGot: 0, passiveT: 0, endT: 0, slowmo: 0, skyFlash: 0, nextThunder: 8,
    bg: makeBG(lvl.world), cracks: makeCracks(), boss: null, demoT: 0, tipsShown: {}, wavesCleared: 0, placed: 0, fired: 0,
  };
  if (!endless && !demo) G.totalEv = lvl.waves.reduce((a, w) => a + w.groups.reduce((b, g) => b + g.n, 0) + (w.boss ? 1 : 0), 0);
  if (demo) {
    G.wallHp = G.wallMax = 1e9; G.scrap = 9999;
    placeTower('ballesta', G.slots[0], true); placeTower('catapulta', G.slots[1], true); placeTower('barricada', G.slots[4], true);
    for (let i = 0; i < 4; i++) spawnZombie(pick(['caminante', 'corredor', 'casco', 'bruto']), rand(700, 1250));
  }
  return G;
}
function makeCracks() {
  const R = mulberry32(99), out = [];
  const ths = [0.75, 0.6, 0.45, 0.3, 0.18];
  for (let i = 0; i < 5; i++) {
    let x = 20 + R() * 160, y = BUNKER_TOP + 20 + R() * 180;
    const pts = [[x, y]];
    for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 30; y += 8 + R() * 16; pts.push([clamp(x, 0, 190), y]); }
    out.push({ th: ths[i], pts });
  }
  return out;
}

// ---------------------------------------------------------------- utilidades de efectos
function P(x, y, vx, vy, life, size, color, o) {
  if (G.parts.length > 1600) G.parts.splice(0, 200);
  o = o || {};
  G.parts.push({ x, y, vx, vy, life, max: life, size, color, g: o.g || 0, drag: o.drag || 0, add: !!o.add, grow: o.grow || 0, sq: o.sq });
}
function text(x, y, s, col, size) { G.texts.push({ x, y, s, col: col || '#fff', life: 1, size: size || 16 }); }
function shake(v) { G.shake = Math.min(26, G.shake + v); }
function gib(x, y, vx, vy, shape, col, o) {
  if (G.gibs.length > 240) G.gibs.splice(0, 30);
  o = o || {};
  G.gibs.push({ x, y, vx, vy, a: o.a || rand(0, 6.28), av: o.av !== undefined ? o.av : rand(-12, 12), shape, col, r: o.r || 6, w: o.w || 8, h: o.h || 20, life: o.life || rand(4, 6), gy: o.gy || (GROUND_Y + rand(-14, 14)), bounce: o.bounce || 0.35, rest: false });
}
function decal(x, y, r, col) {
  if (G.decals.length > 70) G.decals.shift();
  G.decals.push({ x, y, r, col, life: 18 });
}
function dust(x, y, n, col) {
  for (let i = 0; i < n; i++) P(x + rand(-10, 10), y - rand(0, 6), rand(-90, 90), rand(-120, -20), rand(0.4, 0.9), rand(4, 9), col || 'rgba(150,120,90,0.5)', { g: 200, drag: 2, grow: 10 });
}
function goo(x, y, n, col, k) {
  k = k || 1;
  for (let i = 0; i < n; i++) P(x, y, rand(-160, 160) * k, rand(-300, -40) * k, rand(0.4, 0.9), rand(2, 4.5), col, { g: 1100 });
}
function addTimer(t, fn) { G.timers.push({ t, fn }); }

// ---------------------------------------------------------------- torres
function slotAllowed(key, slot) {
  const w = DEFENSES[key].where;
  return w === 'both' || w === slot.kind;
}
function placeTower(key, slot, free) {
  const d = DEFENSES[key];
  const t = { key, slot, x: slot.x, y: slot.y, roof: slot.kind === 'roof', tier: 1, cd: 0.8, anim: Math.random() * 6, ang: -0.1, flash: 0, recoil: 0, armT: 9, charge: 0, genT: 0, spent: d.cost, active: false, flameT: 0, id: ++UID };
  t.s = defStats(key, 1); t.hp = t.s.maxHp; t.genT = t.s.genTime || 0;
  slot.tower = t; G.towers.push(t);
  if (!free) {
    G.scrap -= d.cost; G.cards[key] = d.cd; G.placed++;
    dust(slot.x, slot.y, 10, 'rgba(180,160,130,0.55)');
    for (let i = 0; i < 8; i++) P(slot.x + rand(-20, 20), slot.y - rand(0, 50), rand(-40, 40), rand(-120, -40), 0.6, 3, '#ffd24d', { add: true, g: 200 });
    SFX.place();
  }
  return t;
}
function upgradeTower(t) {
  const c = upgradeCost(t);
  if (!c || G.scrap < c) { SFX.deny(); return false; }
  G.scrap -= c; t.spent += c; t.tier++;
  const f = t.hp / t.s.maxHp;
  t.s = defStats(t.key, t.tier); t.hp = t.s.maxHp * Math.min(1, f + 0.35);
  for (let i = 0; i < 24; i++) P(t.x + rand(-24, 24), t.y - rand(0, 70), rand(-30, 30), rand(-160, -40), rand(0.6, 1), rand(2, 4), i % 2 ? '#ffd24d' : '#fff3c4', { add: true, g: -40 });
  G.rings.push({ x: t.x, y: t.y - 30, r: 10, max: 70, life: 0.4, maxLife: 0.4, col: '255,210,77' });
  SFX.upgrade();
  return true;
}
function sellTower(t) {
  G.scrap += sellValue(t);
  SFX.sell();
  removeTower(t, false);
}
function removeTower(t, destroyed) {
  t.slot.tower = null;
  const i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1);
  if (G.selTower === t) { G.selTower = null; UI.closeTP(); }
  if (destroyed && t.key !== 'mina') {
    G.lostT = (G.lostT || 0) + 1;
    const cols = ['#6a625a', '#8a8278', '#4d463f', '#9b6b3f'];
    for (let i = 0; i < 9; i++) gib(t.x + rand(-15, 15), t.y - rand(10, 50), rand(-220, 220), rand(-520, -200), 'plate', pick(cols), { w: rand(6, 16), h: rand(4, 10), gy: (t.roof ? t.y - 2 : GROUND_Y + rand(-6, 10)), life: rand(3, 5) });
    for (let i = 0; i < 14; i++) P(t.x + rand(-15, 15), t.y - rand(0, 40), rand(-80, 80), rand(-160, -30), rand(0.6, 1.2), rand(8, 16), 'rgba(70,64,58,0.55)', { drag: 1.5, grow: 20 });
    for (let i = 0; i < 12; i++) P(t.x, t.y - 25, rand(-260, 260), rand(-300, 50), rand(0.2, 0.5), 2.5, '#ffd27a', { add: true, g: 600 });
    shake(5); SFX.boom(false);
  } else if (!destroyed) {
    dust(t.x, t.y, 8);
  }
}
function hurtTower(t, dmg) {
  if (!G.towers.includes(t)) return;
  t.hp -= dmg; t.flash = 0.1;
  if (t.hp <= 0) removeTower(t, true);
}
function hurtWall(dmg) {
  if (G.state === 'lost' || G.state === 'demo') return;
  G.wallHp -= dmg; G.wallFlash = 0.15; shake(2);
  if (G.wallHp <= 0) { G.wallHp = 0; loseLevel(); }
}

// ---------------------------------------------------------------- zombis
function spawnZombie(type, x, o) {
  const d = ZOMBIES[type];
  const hpM = G.mode === 'endless' ? 1 + 0.07 * Math.max(0, G.waveIdx) : G.lvl.hpMul;
  const spM = G.mode === 'endless' ? 1 + 0.004 * Math.max(0, G.waveIdx) : G.lvl.spdMul;
  const dmM = G.mode === 'endless' ? 1 + 0.035 * Math.max(0, G.waveIdx) : (G.lvl.dmgMul || 1);
  const z = {
    type, d, x: x !== undefined ? x : SPAWN_X + rand(0, 40), z: d.boss ? 0.4 : rand(-1, 1), y: 0, vy: 0, kvx: 0, onGround: true, rot: 0, av: 0,
    hp: d.hp * hpM, maxHp: d.hp * hpM, armor: (d.armor || 0) * hpM, maxArmor: (d.armor || 0) * hpM, shield: (d.shield || 0) * hpM, maxShield: (d.shield || 0) * hpM,
    dmg: d.dmg * dmM, spitDmg: (d.spitDmg || d.dmg) * dmM,
    speed: d.speed * spM * (d.boss ? 1 : rand(0.9, 1.1)), w: d.w, h: d.h, mass: d.mass, fly: !!d.fly,
    state: d.dig ? 'dig' : 'walk', atkT: rand(0, 0.5), atkAnim: 0, anim: rand(0, 6), flash: 0, shieldFlash: 0, burn: 0, burnDps: 0, stun: 0,
    jumped: false, dead: false, id: ++UID, spitT: rand(0.5, 1.5), spitAnim: 0, specT: d.boss ? 5 : 0, groanT: rand(2, 10), target: null,
  };
  z.gy = GROUND_Y + z.z * 18; z.y = z.gy;
  if (z.fly) { z.y = rand(250, 400); z.baseY = z.y; z.fvx = -z.speed; z.fvy = 0; }
  if (o) Object.assign(z, o);
  G.zombies.push(z);
  if (d.boss) { G.boss = z; SFX.groan(true); shake(8); UI.banner(d.name.toUpperCase(), '¡Jefe a la vista!', 'red'); }
  return z;
}
function zcy(z) { return z.fly ? z.y : z.y - z.h * 0.55; }
function targetable(z) { return !z.dead && z.state !== 'dig'; }

function findBlocker(z) {
  let best = null, bx = WALL_X;
  for (const t of G.towers) {
    if (t.roof || !DEFENSES[t.key].blocks) continue;
    if (t.x > z.x + 4) continue;
    const right = t.x + 26;
    if (right > bx) { bx = right; best = t; }
  }
  return { t: best, x: bx };
}

function hurt(z, dmg, o) {
  if (z.dead) return;
  o = o || {};
  const type = o.type || 'hit';
  if (z.shield > 0 && (type === 'arrow' || type === 'saw')) {
    z.shield -= dmg; z.shieldFlash = 0.08;
    for (let i = 0; i < 4; i++) P(z.x - 18, zcy(z), rand(-200, 40), rand(-160, 60), 0.3, 2, '#e8f4ff', { add: true, g: 500 });
    SFX.clank();
    if (z.shield <= 0) {
      gib(z.x - 18, zcy(z), rand(80, 200), rand(-500, -300), 'shield', 'rgba(150,180,210,0.85)', { w: 12, h: 46, gy: z.gy, av: rand(-8, 8) });
      text(z.x, z.y - z.h - 20, '¡Escudo roto!', '#8cc8ff', 14);
    }
    return 'blocked';
  }
  if (z.armor > 0 && type !== 'burn' && type !== 'rail') {
    const a = dmg * 0.75; z.armor -= a; dmg -= a;
    if (z.armor <= 0) {
      if (z.type === 'casco') gib(z.x - 3, z.y - z.h + 6, rand(60, 180), rand(-560, -380), 'helmet', '#f2c230', { r: 10, gy: z.gy, av: rand(-14, 14) });
      else { for (let i = 0; i < 6; i++) gib(z.x, z.y - z.h * rand(0.4, 0.9), rand(-100, 260), rand(-600, -300), 'plate', '#6a7078', { w: rand(14, 30), h: rand(8, 16), gy: z.gy }); text(z.x, z.y - z.h - 20, '¡Blindaje destruido!', '#ffd24d', 18); shake(6); }
      SFX.clank();
    }
  }
  z.hp -= dmg;
  if (type !== 'burn') z.flash = 0.07;
  if (o.kx) z.kvx += o.kx / z.mass;
  if (o.ky && !z.fly) {
    const vy = z.vy + o.ky / z.mass;
    if (vy < -140 && z.state !== 'dig') { z.vy = vy; z.onGround = false; z.av = rand(-4, 4) * (o.kx > 0 ? 1 : -1); }
  }
  if (o.ky && z.fly) z.y += o.ky * 0.03;
  if (z.hp <= 0) killZombie(z, o);
}

function killZombie(z, o) {
  z.dead = true;
  o = o || {};
  if (G.mode !== 'demo') G.kills++;
  const d = z.d, s = d.scale || 1, cx = z.x, cy = zcy(z);
  const kx = (o.kx || 60) / Math.max(1, z.mass * 0.5), ky = o.ky ? o.ky / Math.max(1, z.mass * 0.5) : -260;
  const blast = o.type === 'blast' || o.type === 'rail';
  const goocol = z.type === 'escupidor' || z.type === 'jefe3' ? '#8f5ab8' : '#5d8a2a';
  if (z.fly) {
    gib(cx, cy, kx * 0.6 + rand(-40, 40), -100, 'c', '#24202a', { r: 9, gy: GROUND_Y + z.z * 14, life: 4 });
    for (let i = 0; i < 10; i++) P(cx, cy, rand(-120, 120), rand(-160, 40), rand(1.2, 2.2), rand(2.5, 4), '#1d1a22', { g: 90, drag: 2.5 });
  } else {
    const spread = blast ? 1.6 : 0.9, gy = z.gy;
    const hy = z.y - z.h * 0.88, ty = z.y - z.h * 0.5, ly = z.y - z.h * 0.18;
    gib(cx - 3 * s, hy, kx * spread + rand(-80, 80), ky * spread + rand(-200, -60), 'head', d.skin, { r: 9.5 * s, gy, av: rand(-15, 15) });
    gib(cx, ty, kx * spread * 0.6 + rand(-40, 40), ky * spread * 0.7 + rand(-80, 0), 'r', d.shirt, { w: 20 * s, h: 26 * s, gy, av: rand(-6, 6) });
    for (let i = 0; i < 2; i++) {
      gib(cx + rand(-6, 6), ty - 6 * s, kx * spread + rand(-140, 140), ky * spread + rand(-260, 0), 'r', d.skin, { w: 6 * s, h: 20 * s, gy });
      gib(cx + rand(-6, 6), ly, kx * spread * 0.5 + rand(-110, 110), ky * spread * 0.6 + rand(-160, 0), 'r', d.pants, { w: 7 * s, h: 24 * s, gy });
    }
    if (d.boss || z.type === 'bruto') for (let i = 0; i < (d.boss ? 10 : 3); i++) gib(cx + rand(-30, 30) * s, ty + rand(-20, 20) * s, rand(-300, 300), rand(-700, -200), 'c', i % 2 ? d.skin : d.shirt, { r: rand(5, 10) * s, gy });
    if (z.type === 'casco' && z.armor > 0) gib(cx, hy - 6, rand(60, 180), rand(-560, -380), 'helmet', '#f2c230', { r: 10, gy });
    if (z.type === 'escudo' && z.shield > 0) gib(cx - 18, ty, rand(60, 160), rand(-400, -200), 'shield', 'rgba(150,180,210,0.85)', { w: 12, h: 46, gy });
    goo(cx, ty, d.boss ? 50 : 14, goocol, blast ? 1.3 : 1);
    decal(cx + rand(-10, 10), gy + 2, rand(10, 18) * s, goocol);
  }
  SFX.splat();
  if (G.mode !== 'demo') {
    const bonus = 1 + 0.1 * up('produccion');
    const val = Math.round(d.scrap * bonus);
    const n = d.boss ? 12 : val > 20 ? 3 : val > 12 ? 2 : 1;
    for (let i = 0; i < n; i++) spawnDrop(cx, cy, Math.round(val / n), false);
  }
  if (d.boom) {
    addTimer(0.05, () => explode(cx, z.y - 30, d.boom.r, d.boom.dmg, { towers: 1, wallMul: 1, imp: 520, hurtZ: 0.6, col: '#a8d850' }));
  }
  if (d.boss) {
    G.slowmo = 1.6; shake(20); G.boss = null;
    for (let i = 0; i < 4; i++) addTimer(i * 0.18, () => explode(cx + rand(-60, 60), z.y - rand(30, 160), 90, 0, { imp: 300, vis: 1 }));
    if (G.mode !== 'demo') { SAVE.stats.bossKills++; UI.banner('¡JEFE DERROTADO!', d.name, 'gold'); }
  }
}

function spawnDrop(x, y, v, fromGen) {
  G.drops.push({ x, y, vx: rand(-90, 90), vy: rand(-420, -250), v, t: 0, state: 0, gold: fromGen === 'gold', gy: GROUND_Y + rand(-10, 16), sp: 0, a: rand(0, 6) });
}

// ---------------------------------------------------------------- explosiones y proyectiles
function explode(x, y, r, dmg, o) {
  o = o || {};
  const imp = o.imp || 480;
  if (dmg > 0) {
    for (const z of G.zombies) {
      if (!targetable(z)) continue;
      const d = Math.max(0, dist(x, y, z.x, zcy(z)) - z.w * 0.4);
      if (d > r) continue;
      const f = 1 - (d / r) * 0.55, dir = z.x >= x ? 1 : -1;
      hurt(z, dmg * f * (o.hurtZ !== undefined ? o.hurtZ : 1), { type: 'blast', kx: dir * imp * f * 0.8, ky: -imp * f });
      if (o.fire) { z.burn = Math.max(z.burn, 2.5); z.burnDps = Math.max(z.burnDps, o.fire); }
      if (o.stun) z.stun = Math.max(z.stun, o.stun);
    }
    if (o.towers) {
      for (const t of G.towers.slice()) { const d = dist(x, y, t.x, t.y - 25); if (d < r) hurtTower(t, dmg * (1 - d / r * 0.5) * o.towers); }
      if (o.wallMul && x - WALL_X < r) hurtWall(dmg * 0.6 * o.wallMul * (1 - Math.max(0, x - WALL_X) / r));
    }
  }
  for (const g of G.gibs) { const d = dist(x, y, g.x, g.y); if (d < r * 1.4) { const f = 1 - d / (r * 1.4); g.vx += Math.sign(g.x - x || 1) * imp * f; g.vy -= imp * 1.2 * f; g.av += rand(-20, 20) * f; g.rest = false; } }
  for (const dr of G.drops) { const d = dist(x, y, dr.x, dr.y); if (d < r && dr.state === 0) { dr.vy -= 300; dr.vx += Math.sign(dr.x - x || 1) * 150; } }
  // efectos
  const big = r > 100;
  P(x, y, 0, 0, 0.12, r * 1.3, 'rgba(255,240,200,0.9)', { add: true });
  for (let i = 0; i < (big ? 18 : 11); i++) { const a = rand(0, 6.28), sp = rand(60, 260); P(x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 80, rand(0.25, 0.55), rand(10, 22) * (r / 90), pick(['#ffb347', '#ff7a2a', '#ffd27a', '#ff5a2a']), { add: true, drag: 3, grow: -10 }); }
  for (let i = 0; i < (big ? 14 : 8); i++) P(x + rand(-r * 0.4, r * 0.4), y + rand(-20, 10), rand(-60, 60), rand(-120, -30), rand(0.8, 1.6), rand(14, 26) * (r / 90), o.col ? rgba(o.col, 0.35) : 'rgba(60,54,48,0.5)', { drag: 1.5, grow: 30 });
  for (let i = 0; i < (big ? 26 : 14); i++) P(x, y, rand(-420, 420), rand(-520, 80), rand(0.3, 0.8), rand(1.5, 3), '#ffe0a0', { add: true, g: 900 });
  if (y > GROUND_Y - 40) for (let i = 0; i < 6; i++) gib(x + rand(-10, 10), y - 5, rand(-260, 260), rand(-520, -220), 'rock', shade(THEMES[G.world].ground[0], rand(-0.3, 0.1)), { r: rand(2.5, 5), life: rand(1.5, 3), gy: GROUND_Y + rand(-12, 14) });
  G.rings.push({ x, y, r: r * 0.2, max: r * 1.2, life: 0.35, maxLife: 0.35, col: '255,230,190' });
  if (y > GROUND_Y - 40) decal(x, Math.min(GROUND_Y + 20, y + 6), r * 0.45, 'rgba(20,14,10,0.55)');
  shake(r / 14);
  SFX.boom(big);
}

function aim(sx, sy, tx, ty, T, g) { return { vx: (tx - sx) / T, vy: (ty - sy - 0.5 * g * T * T) / T }; }
function predictX(z, T) {
  if (z.fly) return z.x + (z.fvx || 0) * T;
  if (z.state !== 'walk' || !z.onGround || z.stun > 0) return z.x;
  return z.x - z.speed * T;
}

function fireCannon(x, y) {
  if (G.cannon.cd > 0) { SFX.deny(); return false; }
  const cs = cannonStats();
  const sx = 46 + Math.cos(G.cannon.ang) * 50, sy = BUNKER_TOP - 42 + Math.sin(G.cannon.ang) * 50;
  const ty = Math.min(y, GROUND_Y + 10), tx = Math.max(x, 230);
  const T = 0.45 + dist(sx, sy, tx, ty) / 1500;
  const v = aim(sx, sy, tx, ty, T, GRAV);
  G.proj.push({ kind: 'shell', x: sx, y: sy, vx: v.vx, vy: v.vy, g: GRAV, t: 0, T, dmg: cs.dmg, r: cs.r });
  G.cannon.cd = G.cannon.max = cs.cd; G.cannon.recoil = 1; G.fired++;
  for (let i = 0; i < 10; i++) P(sx, sy, v.vx * 0.15 + rand(-60, 60), v.vy * 0.15 + rand(-60, 60), rand(0.3, 0.7), rand(6, 12), 'rgba(90,84,76,0.5)', { drag: 2, grow: 18 });
  P(sx, sy, 0, 0, 0.08, 26, 'rgba(255,220,150,0.9)', { add: true });
  shake(3); SFX.boom(false);
  return true;
}

// ---------------------------------------------------------------- oleadas
function startWave(i) {
  if (G.mode === 'endless' && !G.lvl.waves[i]) G.lvl.waves[i] = endlessWave(i + 1);
  const w = G.lvl.waves[i];
  if (!w) return;
  G.waveIdx = i; G.state = 'wave'; G.waveT = 0; G.linger = 0;
  G.spawnEv = [];
  for (const g of w.groups) for (let k = 0; k < g.n; k++) G.spawnEv.push({ t: g.at + k * g.gap, type: g.type });
  if (w.boss) G.spawnEv.push({ t: 7, type: w.boss });
  G.spawnEv.sort((a, b) => a.t - b.t);
  if (G.mode === 'endless') {
    G.totalEv = G.spawnEv.length; G.spawned = 0;
    const nw = Math.min(3, Math.floor(i / 8));
    if (nw !== G.world) { G.world = nw; G.bg = makeBG(nw); }
  }
  const last = w.final;
  if (G.mode === 'endless') UI.banner('OLEADA ' + (i + 1), i % 5 === 4 ? '¡Horda masiva!' : '', i % 5 === 4 ? 'red' : '');
  else UI.banner(last ? '¡OLEADA FINAL!' : 'OLEADA ' + (i + 1), last ? 'Aguanta un poco más' : (i + 1) + ' de ' + G.lvl.waves.length, last ? 'red' : '');
  SFX.horn(); SFX.setIntensity(1);
  UI.hudFlags();
}
function callWaveEarly() {
  if (G.state !== 'prep' && G.state !== 'between') return;
  const bonus = Math.round(G.stateT * 3);
  if (bonus > 0) { G.scrap += bonus; text(W - 120, 120, '+' + bonus, '#ffc229', 20); SFX.coin(); }
  startWave(G.waveIdx + 1);
}
function updateWaves(dt) {
  if (G.state === 'prep' || G.state === 'between') {
    G.stateT -= dt;
    if (G.stateT <= 0) startWave(G.waveIdx + 1);
    return;
  }
  if (G.state !== 'wave') return;
  G.waveT += dt;
  while (G.spawnEv.length && G.spawnEv[0].t <= G.waveT) { spawnZombie(G.spawnEv.shift().type); G.spawned++; }
  if (G.spawnEv.length) return;
  const alive = G.zombies.some(z => !z.dead);
  const w = G.lvl.waves[G.waveIdx];
  if (G.mode !== 'endless' && w.final) {
    if (!alive) winLevel();
    return;
  }
  G.linger += dt;
  if (!alive) {
    G.wavesCleared = G.waveIdx + 1;
    G.state = 'between'; G.stateT = 8; SFX.setIntensity(0);
    const rep = up('reparacion');
    if (rep > 0 && G.wallHp < G.wallMax) { const h = G.wallMax * 0.08 * rep; G.wallHp = Math.min(G.wallMax, G.wallHp + h); text(110, BUNKER_TOP - 70, '+' + Math.round(h) + ' muralla', '#7de86a', 16); }
    if (G.mode === 'endless') { const b = 20 + G.waveIdx * 4; G.scrap += b; text(W / 2, 140, '+' + b + ' por sobrevivir', '#ffc229', 20); }
    UI.hudFlags();
  } else if (G.linger > 20) {
    G.wavesCleared = G.waveIdx + 1;
    startWave(G.waveIdx + 1);
  }
}
function winLevel() {
  if (G.state === 'won' || G.state === 'lost') return;
  G.state = 'won'; G.endT = 2.4; G.wavesCleared = G.lvl.waves.length; SFX.setIntensity(0);
  UI.banner('¡VICTORIA!', 'El taller resiste', 'gold'); SFX.win();
  G.drops.forEach(d => { d.state = 1; });
}
function loseLevel() {
  if (G.state === 'won' || G.state === 'lost') return;
  G.state = 'lost'; G.endT = 3; SFX.setIntensity(0);
  for (let i = 0; i < 6; i++) addTimer(i * 0.25, () => explode(rand(20, 190), rand(BUNKER_TOP, GROUND_Y), 90, 0, { imp: 200 }));
  for (let i = 0; i < 20; i++) gib(rand(0, 200), rand(BUNKER_TOP, GROUND_Y), rand(-100, 400), rand(-700, -200), 'plate', pick(['#615a52', '#57504a', '#6a6158']), { w: rand(16, 40), h: rand(10, 30), life: 8 });
  UI.banner('¡EL BÚNKER CAYÓ!', '', 'red'); SFX.lose();
}

// ---------------------------------------------------------------- actualización
function updateGame(dt) {
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.35; }
  G.t += dt;
  G.shake *= Math.exp(-dt * 7);
  G.wallFlash = Math.max(0, G.wallFlash - dt);
  G.skyFlash = Math.max(0, G.skyFlash - dt * 2.5);
  if (G.world === 1) { G.nextThunder -= dt; if (G.nextThunder <= 0) { G.nextThunder = rand(12, 26); G.skyFlash = 1; addTimer(rand(0.3, 1.2), () => SFX.thunder()); } }

  for (let i = G.timers.length - 1; i >= 0; i--) { const tm = G.timers[i]; tm.t -= dt; if (tm.t <= 0) { G.timers.splice(i, 1); tm.fn(); } }

  if (G.mode === 'demo') updateDemo(dt);
  else if (G.state !== 'won' && G.state !== 'lost') updateWaves(dt);

  // ingreso pasivo
  if (G.mode !== 'demo' && (G.state === 'wave' || G.state === 'between' || G.state === 'prep')) {
    G.passiveT += dt;
    if (G.passiveT >= 5) { G.passiveT = 0; G.scrap += Math.round(8 * (1 + 0.25 * up('produccion'))); }
  }
  for (const k in G.cards) G.cards[k] = Math.max(0, G.cards[k] - dt);

  // cañón
  const c = G.cannon;
  c.cd = Math.max(0, c.cd - dt); c.recoil = Math.max(0, c.recoil - dt * 4);
  if (G.mode !== 'demo' && INPUT.mx >= 0 && !G.sel) {
    const ta = Math.atan2(Math.min(INPUT.my, GROUND_Y) - (BUNKER_TOP - 42) - 120, Math.max(INPUT.mx, 120) - 46);
    c.ang = lerp(c.ang, clamp(ta, -1.3, 0.25), Math.min(1, dt * 10));
  }

  for (const t of G.towers.slice()) updateTower(t, dt);
  for (const z of G.zombies) updateZombie(z, dt);
  G.zombies = G.zombies.filter(z => !z.dead && z.x > -200);
  updateProjectiles(dt);
  updateEnemyProj(dt);
  updateFx(dt);

  if (G.state === 'won' || G.state === 'lost') {
    G.endT -= dt;
    if (G.endT <= 0 && !G.ended) { G.ended = true; finishLevel(G.state === 'won'); }
  }
}

function updateDemo(dt) {
  G.demoT -= dt;
  if (G.demoT <= 0) { G.demoT = rand(1.4, 2.6); spawnZombie(pick(['caminante', 'caminante', 'corredor', 'casco', 'bruto', 'hinchado', 'saltador'])); }
  if (G.cannon.cd <= 0) {
    const cands = G.zombies.filter(z => targetable(z) && z.x < 1100 && z.x > 300);
    if (cands.length) {
      const z = pick(cands);
      G.cannon.ang = Math.atan2(-140, z.x - 46);
      fireCannon(predictX(z, 0.9), z.gy);
      G.cannon.cd = G.cannon.max = 2.2;
    }
  }
  for (const t of G.towers) t.hp = t.s.maxHp;
}

function nearestTarget(t, range, opts) {
  let best = null, bx = 1e9;
  for (const z of G.zombies) {
    if (!targetable(z) || z.x > SPAWN_X - 30) continue;
    if (opts && opts.noFly && z.fly) continue;
    const dx = z.x - t.x;
    if (dx < (opts && opts.min || 0) || dx > range) continue;
    if (z.x < bx) { bx = z.x; best = z; }
  }
  return best;
}

function updateTower(t, dt) {
  t.flash = Math.max(0, t.flash - dt);
  t.recoil = Math.max(0, t.recoil - dt * 3);
  t.armT += dt; t.anim += dt;
  t.cd -= dt;
  const s = t.s;
  const mx = t.x + 10, my = t.y - 44;
  switch (t.key) {
    case 'ballesta': {
      const z = nearestTarget(t, s.range);
      if (z) {
        const ty = zcy(z), T = Math.max(0.15, dist(mx, my, z.x, ty) / 950);
        const tx = predictX(z, T);
        t.ang = lerp(t.ang, Math.atan2(ty - my, tx - mx), Math.min(1, dt * 12));
        if (t.cd <= 0) {
          t.cd = 1 / s.rate; t.recoil = 1;
          for (let k = 0; k < s.multi; k++) {
            const v = aim(mx, my, tx, ty + (k - (s.multi - 1) / 2) * 16, T, 380);
            G.proj.push({ kind: 'arrow', x: mx, y: my, vx: v.vx, vy: v.vy, g: 380, dmg: s.dmg, pierce: s.pierce, hit: [], life: 2.5 });
          }
          SFX.shoot();
        }
      } else t.ang = lerp(t.ang, -0.08, dt * 2);
      break;
    }
    case 'recolector': {
      if (G.state === 'won' || G.state === 'lost') break;
      t.genT -= dt;
      if (t.genT <= 0) {
        t.genT = s.genTime;
        const v = s.gold ? s.gen * 2 : s.gen;
        G.drops.push({ x: t.x, y: t.y - 70, vx: rand(-60, 60), vy: rand(-380, -260), v, t: 0, state: 0, gold: s.gold, gy: t.roof ? t.y - 6 : GROUND_Y + rand(-6, 10), sp: 0, a: 0, roofY: t.roof ? t.y - 6 : 0 });
        for (let i = 0; i < 8; i++) P(t.x, t.y - 66, rand(-80, 80), rand(-80, 40), 0.4, 2, '#8ce6ff', { add: true });
      }
      break;
    }
    case 'barricada':
      if (s.regen) t.hp = Math.min(s.maxHp, t.hp + s.maxHp * s.regen * dt);
      break;
    case 'catapulta': {
      if (t.cd > 0) break;
      const z = nearestTarget(t, s.range, { noFly: true, min: s.minRange });
      if (!z) break;
      t.cd = 1 / s.rate; t.armT = 0;
      const sx = t.x + 10, sy = t.y - 90;
      addTimer(0.1, () => {
        const T = 1.0 + Math.abs(z.x - sx) / 1400;
        const tx = predictX(z, T + 0.1), ty = z.gy - 4;
        const v = aim(sx, sy, tx, ty, T, GRAV);
        G.proj.push({ kind: 'rock', x: sx, y: sy, vx: v.vx, vy: v.vy, g: GRAV, t: 0, T, dmg: s.dmg, r: s.splash, cluster: s.cluster, fire: s.fire, a: 0, av: rand(-8, 8) });
        SFX.thump();
      });
      break;
    }
    case 'lanzallamas': {
      const lo = t.x + (t.roof ? -10 : 10), hi = t.x + s.range + (t.roof ? 40 : 0);
      let far = null; t.active = false;
      for (const z of G.zombies) {
        if (!targetable(z) || z.fly || z.x < lo || z.x > hi) continue;
        t.active = true;
        hurt(z, s.dps * dt, { type: 'burn' });
        z.burn = Math.max(z.burn, s.burnT); z.burnDps = Math.max(z.burnDps, s.burn);
        if (!far || z.x > far.x) far = z;
      }
      const nx = t.x + 6, ny = t.y - 40;
      const tx = far ? far.x : t.x + s.range * 0.8, ty = far ? zcy(far) + 10 : GROUND_Y - 30;
      t.ang = lerp(t.ang, Math.atan2(ty - ny, tx - nx), Math.min(1, dt * 8));
      if (t.active) {
        const ex = nx + Math.cos(t.ang) * 32, ey = ny + Math.sin(t.ang) * 32;
        const sp = Math.min(560, s.range * 2.6);
        for (let i = 0; i < 4; i++) {
          const a = t.ang + rand(-0.18, 0.18), v = sp * rand(0.7, 1.1);
          P(ex, ey, Math.cos(a) * v, Math.sin(a) * v, rand(0.3, 0.48), rand(7, 12), pick(['#ffb347', '#ff7a2a', '#ffd27a', '#ff4a1a']), { add: true, drag: 1.2, grow: 26, g: -150 });
        }
        if (Math.random() < 0.3) P(ex + Math.cos(t.ang) * s.range * 0.6, ey + Math.sin(t.ang) * s.range * 0.6, rand(-20, 20), rand(-80, -40), 1, 14, 'rgba(50,40,36,0.35)', { drag: 1, grow: 22 });
        SFX.flame();
      }
      break;
    }
    case 'tesla': {
      t.charge = Math.min(1, 1 - t.cd * s.rate);
      if (t.cd > 0) break;
      const ox = t.x, oy = t.y - 84;
      let first = null, bd = s.range;
      for (const z of G.zombies) { if (!targetable(z)) continue; const d = dist(ox, oy, z.x, zcy(z)); if (d < bd && z.x > t.x - 40) { bd = d; first = z; } }
      if (!first) break;
      t.cd = 1 / s.rate;
      const hitL = [first]; let cur = first;
      for (let k = 0; k < s.chains; k++) {
        let nb = null, nd = 170;
        for (const z of G.zombies) { if (!targetable(z) || hitL.includes(z)) continue; const d = dist(cur.x, zcy(cur), z.x, zcy(z)); if (d < nd) { nd = d; nb = z; } }
        if (!nb) break; hitL.push(nb); cur = nb;
      }
      let px = ox, py = oy;
      hitL.forEach((z, i) => {
        const zx = z.x, zy = zcy(z);
        bolt(px, py, zx, zy);
        hurt(z, s.dmg * Math.pow(0.78, i), { type: 'elec', kx: 40 });
        if (s.stun) z.stun = Math.max(z.stun, s.stun);
        for (let k = 0; k < 6; k++) P(zx, zy, rand(-150, 150), rand(-150, 150), 0.25, 2, '#c8d4ff', { add: true });
        px = zx; py = zy;
      });
      SFX.zap();
      break;
    }
    case 'mina': {
      for (const z of G.zombies) {
        if (!targetable(z) || z.fly || !z.onGround || Math.abs(z.x - t.x) > 26) continue;
        const r = s.radius, dmg = s.dmg, x = t.x;
        removeTower(t, true);
        explode(x, GROUND_Y - 10, r, dmg, { imp: 700 });
        if (s.double) addTimer(0.4, () => explode(x + 20, GROUND_Y - 10, r * 0.8, dmg * 0.6, { imp: 600 }));
        break;
      }
      break;
    }
    case 'sierra': {
      if (t.cd > 0) break;
      const z = nearestTarget(t, 900, { noFly: true });
      if (!z) break;
      t.cd = 1 / s.rate;
      G.proj.push({ kind: 'saw', x: t.x + 6, y: t.y - 48, vx: 440, vy: -160, g: 1600, dmg: s.dmg, pierce: s.pierce, hit: [], a: 0, ret: s.ret, back: false, ox: t.x, roof: t.roof });
      SFX.saw();
      break;
    }
    case 'riel': {
      t.charge = Math.min(1, 1 - t.cd * s.rate);
      const z = nearestTarget(t, s.range, { noFly: false });
      const aimY = z ? zcy(z) : GROUND_Y - 40;
      const ang = Math.atan2(aimY - (t.y - 44), (z ? z.x : t.x + 600) - t.x);
      t.ang = lerp(t.ang, clamp(ang, -0.6, 0.6), Math.min(1, dt * 6));
      if (t.cd > 0 || !z) break;
      t.cd = 1 / s.rate;
      const shots = s.multi;
      for (let k = 0; k < shots; k++) addTimer(k * 0.25, () => fireRail(t));
      break;
    }
  }
}
function bolt(x1, y1, x2, y2) {
  const pts = [[x1, y1]], n = Math.max(3, Math.floor(dist(x1, y1, x2, y2) / 14));
  const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < n; i++) { const f = i / n, o = rand(-11, 11); pts.push([lerp(x1, x2, f) + nx / l * o, lerp(y1, y2, f) + ny / l * o]); }
  pts.push([x2, y2]);
  G.bolts.push({ pts, life: 0.16, max: 0.16 });
}
function fireRail(t) {
  if (!G.towers.includes(t)) return;
  const s = t.s, sx = t.x + Math.cos(t.ang) * 44, sy = t.y - 44 + Math.sin(t.ang) * 44;
  const ex = sx + Math.cos(t.ang) * 1400, ey = sy + Math.sin(t.ang) * 1400;
  G.beams.push({ x1: sx, y1: sy, x2: ex, y2: ey, life: 0.35, max: 0.35 });
  const dx = ex - sx, dy = ey - sy, L2 = dx * dx + dy * dy;
  const hits = [];
  for (const z of G.zombies) {
    if (!targetable(z)) continue;
    const zx = z.x, zy = zcy(z);
    const u = clamp(((zx - sx) * dx + (zy - sy) * dy) / L2, 0, 1);
    if (dist(zx, zy, sx + dx * u, sy + dy * u) < z.h * 0.5 + 10) hits.push([u, z]);
  }
  // Atraviesa a los 8 primeros, perdiendo fuerza con cada uno.
  hits.sort((a, b) => a[0] - b[0]).slice(0, 8).forEach(([, z], i) => {
    hurt(z, s.dmg * Math.pow(0.85, i), { type: 'rail', kx: 220, ky: -120 });
    for (let k = 0; k < 8; k++) P(z.x, zcy(z), rand(-120, 200), rand(-160, 60), 0.4, 2.5, '#9ffff0', { add: true });
  });
  for (let i = 0; i < 30; i++) { const f = Math.random(); P(sx + dx * f * 0.8, sy + dy * f * 0.8, rand(-30, 30), rand(-60, 0), rand(0.3, 0.6), rand(2, 4), '#5ff5df', { add: true }); }
  t.recoil = 1; shake(6); SFX.rail();
}

function updateZombie(z, dt) {
  z.flash = Math.max(0, z.flash - dt); z.shieldFlash = Math.max(0, z.shieldFlash - dt);
  z.spitAnim = Math.max(0, z.spitAnim - dt * 2.5);
  if (z.burn > 0) {
    z.burn -= dt;
    hurt(z, z.burnDps * dt, { type: 'burn' });
    if (Math.random() < dt * 14) P(z.x + rand(-z.w * 0.3, z.w * 0.3), zcy(z) + rand(-z.h * 0.3, z.h * 0.3), rand(-10, 10), rand(-90, -40), rand(0.3, 0.5), rand(5, 9), pick(['#ffb347', '#ff7a2a']), { add: true, grow: -6 });
    if (z.burn <= 0) z.burnDps = 0;
  }
  if (z.dead) return;
  z.groanT -= dt;
  if (z.groanT <= 0 && z.x < W) { z.groanT = rand(6, 16); SFX.groan(false); }
  if (z.stun > 0) z.stun -= dt;
  if (G.state === 'lost') { z.state = 'idle'; return; }

  // vuelo
  if (z.fly) {
    if (z.stun > 0) return;
    if (!z.target || (z.target !== 'wall' && !G.towers.includes(z.target))) {
      const roofs = G.towers.filter(t => t.roof);
      z.target = roofs.length && Math.random() < 0.6 ? pick(roofs) : 'wall';
      z.tyOff = rand(-40, 40);
    }
    const tx = z.target === 'wall' ? WALL_X + 14 : z.target.x + 20, ty = z.target === 'wall' ? 440 + z.tyOff : z.target.y - 40;
    const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy);
    z.x += z.kvx * dt; z.kvx *= Math.exp(-4 * dt);
    if (d > 16) {
      z.fvx = dx / d * z.speed; z.fvy = dy / d * z.speed;
      z.x += z.fvx * dt; z.y += z.fvy * dt + Math.sin(G.t * 4 + z.id) * 20 * dt; z.state = 'walk';
    } else {
      z.fvx = 0; z.fvy = 0; z.state = 'attack';
      z.atkT -= dt;
      if (z.atkT <= 0) {
        z.atkT = 1 / z.d.atk;
        if (z.target === 'wall') hurtWall(z.dmg); else hurtTower(z.target, z.dmg);
        z.x += 14; SFX.hit();
        for (let i = 0; i < 4; i++) P(tx, ty, rand(-80, 80), rand(-80, 40), 0.3, 2, '#e8dcc8', { g: 300 });
      }
    }
    return;
  }

  // excavando
  if (z.state === 'dig') {
    z.x -= z.speed * dt;
    if (Math.random() < dt * 20) P(z.x + rand(-14, 14), z.gy - 4, rand(-40, 80), rand(-160, -60), 0.5, rand(2, 4), '#6b5236', { g: 700 });
    const b = findBlocker(z);
    if (z.x < Math.max(380, b.x + 60) - 60 || z.x < 360) {
      z.state = 'walk'; z.vy = -420; z.onGround = false;
      dust(z.x, z.gy, 14, 'rgba(110,85,55,0.6)');
      for (let i = 0; i < 10; i++) gib(z.x + rand(-10, 10), z.gy - 4, rand(-200, 200), rand(-400, -150), 'rock', '#5a4630', { r: rand(2, 4), life: 1.5, gy: z.gy + rand(-4, 6) });
    }
    return;
  }

  // física
  z.x += z.kvx * dt;
  if (!z.onGround) {
    z.vy += GRAV * dt; z.y += z.vy * dt; z.rot += z.av * dt;
    z.kvx *= Math.exp(-0.4 * dt);
    if (z.y >= z.gy) {
      z.y = z.gy;
      if (z.vy > 650) { dust(z.x, z.gy, 6); hurt(z, (z.vy - 650) * 0.05, { type: 'hit' }); SFX.thump(); }
      z.vy = 0; z.onGround = true; z.kvx *= 0.3; z.rot = 0; z.av = 0;
    }
    clampToBlocker(z);
    return;
  }
  z.kvx *= Math.exp(-7 * dt);
  z.atkAnim = Math.max(0, z.atkAnim - dt * 3);

  const d = z.d;
  if (d.boss) bossSpecial(z, dt);
  if (z.stun > 0) { clampToBlocker(z); return; }

  const b = findBlocker(z);
  const front = z.x - z.w * 0.4;
  const contact = front <= b.x + 1;

  // a distancia
  if (d.ranged && !contact) {
    let tgt = null, tx = 0;
    for (const t of G.towers) { if (t.x < z.x && z.x - t.x <= d.ranged && (t.roof ? z.x - WALL_X <= d.ranged : true) && t.x > tx) { tx = t.x; tgt = t; } }
    if (!tgt && z.x - WALL_X <= d.ranged) tgt = 'wall';
    if (tgt) {
      z.state = 'spit';
      if (d.boss) { z.x -= z.speed * 0.5 * dt; z.anim += dt * 1.1; }
      z.spitT -= dt;
      if (z.spitT <= 0) {
        z.spitT = 1 / d.atk; z.spitAnim = 1;
        const n = d.volley ? 3 : 1;
        for (let k = 0; k < n; k++) {
          const target = tgt === 'wall' || k > 0 && d.volley ? (k === 0 ? tgt : (G.towers.length ? pick(G.towers) : 'wall')) : tgt;
          const ttx = target === 'wall' ? WALL_X - 10 + rand(-30, 10) : target.x, tty = target === 'wall' ? rand(BUNKER_TOP + 20, GROUND_Y - 30) : target.y - 25;
          const sx = z.x - 10 * (d.scale || 1), sy = z.y - z.h * 0.85;
          const T = 0.9 + Math.abs(sx - ttx) / 900;
          const v = aim(sx, sy, ttx, tty, T, 900);
          G.eproj.push({ x: sx, y: sy, vx: v.vx, vy: v.vy, g: 900, t: 0, T, target, dmg: z.spitDmg, big: !!d.boss });
        }
      }
      return;
    }
  }

  if (contact) {
    if (z.type === 'saltador' && !z.jumped && b.t) {
      z.jumped = true; z.onGround = false; z.vy = -760; z.kvx = -270; z.av = -2;
      dust(z.x, z.gy, 6);
      return;
    }
    z.state = 'attack';
    z.atkT -= dt;
    if (z.atkT <= 0) {
      z.atkT = 1 / d.atk; z.atkAnim = 1;
      if (b.t) {
        hurtTower(b.t, z.dmg);
        if (b.t.key === 'barricada' && G.towers.includes(b.t)) hurt(z, b.t.s.thorns, { type: 'hit' });
      } else hurtWall(z.dmg);
      for (let i = 0; i < (d.boss ? 10 : 4); i++) P(b.x + 2, z.y - z.h * 0.6 + rand(-10, 10), rand(-40, 120), rand(-150, 20), 0.35, 2, '#ffe0a0', { add: true, g: 600 });
      SFX.hit();
      if (d.boss) shake(5);
    }
  } else {
    z.state = 'walk';
    z.x -= z.speed * dt;
    z.anim += dt * (z.type === 'corredor' ? 10 : z.type === 'saltador' ? 8 : d.boss ? 2.2 : 4.5) * (z.speed / d.speed);
  }
  clampToBlocker(z);
}
function clampToBlocker(z) {
  if (z.type === 'saltador' && !z.onGround) return;
  const b = findBlocker(z);
  const minX = b.x + z.w * 0.4;
  if (z.x < minX && z.x > b.x - 30) z.x = minX;
  if (z.x < WALL_X + z.w * 0.4) z.x = WALL_X + z.w * 0.4;
}
function bossSpecial(z, dt) {
  z.specT -= dt;
  if (z.specT > 0) return;
  const d = z.d;
  if (d.stomp) {
    z.specT = 7;
    shake(14); SFX.boom(true);
    dust(z.x, z.gy, 30, 'rgba(140,110,80,0.6)');
    G.rings.push({ x: z.x, y: z.gy, r: 20, max: 220, life: 0.5, maxLife: 0.5, col: '200,170,130' });
    for (const t of G.towers) if (!t.roof && Math.abs(t.x - z.x) < 220) hurtTower(t, 60);
    for (const g of G.gibs) if (Math.abs(g.x - z.x) < 300) { g.vy -= 400; g.rest = false; }
  } else if (d.summon) {
    z.specT = 8;
    SFX.groan(true);
    for (let i = 0; i < 3; i++) spawnZombie('cuervo', z.x + rand(-20, 20), { y: z.y - z.h * 0.8 + rand(-20, 20), baseY: 300 });
  } else if (d.thrower) {
    z.specT = 6;
    const zz = spawnZombie(pick(['caminante', 'corredor', 'casco']), z.x - 30);
    const tx = WALL_X + rand(60, 300), T = 1.4;
    zz.y = z.y - z.h * 0.9; zz.onGround = false; zz.kvx = (tx - zz.x) / T; zz.vy = (zz.gy - zz.y - 0.5 * GRAV * T * T) / T; zz.av = rand(-6, -3);
    z.atkAnim = 1;
  } else z.specT = 999;
}

function updateProjectiles(dt) {
  for (let i = G.proj.length - 1; i >= 0; i--) {
    const p = G.proj[i];
    let dead = false;
    if (p.kind === 'arrow') {
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      for (const z of G.zombies) {
        if (!targetable(z) || p.hit.includes(z)) continue;
        if (Math.abs(p.x - z.x) > z.w * 0.5 + 4) continue;
        if (z.fly ? Math.abs(p.y - z.y) > z.h * 0.6 + 4 : (p.y < z.y - z.h || p.y > z.y + 2)) continue;
        const r = hurt(z, p.dmg, { type: 'arrow', kx: 90 });
        p.hit.push(z);
        SFX.hit();
        for (let k = 0; k < 4; k++) P(p.x, p.y, rand(-80, 80), rand(-120, 20), 0.3, 2, z.fly ? '#2a2630' : '#6a9a3a', { g: 600 });
        if (r === 'blocked' || p.pierce-- <= 0) { dead = true; break; }
      }
      if (!dead && p.y > GROUND_Y + 22) {
        dead = true;
        gib(p.x, GROUND_Y + 18, 0, 0, 'r', '#d8c7a0', { w: 22, h: 3, a: Math.atan2(p.vy, p.vx), av: 0, life: 1.5, gy: GROUND_Y + 22 });
      }
      if (p.life <= 0 || p.x > W + 60) dead = true;
    } else if (p.kind === 'rock' || p.kind === 'shell' || p.kind === 'bomblet') {
      p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.a !== undefined) p.a += (p.av || 0) * dt;
      if (p.kind === 'shell' && Math.random() < 0.6) P(p.x, p.y, rand(-15, 15), rand(-15, 15), 0.4, rand(3, 6), 'rgba(120,110,100,0.4)', { grow: 8 });
      if (p.t >= p.T) {
        dead = true;
        if (p.kind === 'rock') {
          explode(p.x, p.y, p.r, p.dmg, { imp: 520, fire: p.fire ? 14 : 0 });
          gib(p.x, p.y - 6, p.vx * 0.25, -p.vy * 0.25, 'rock', '#8d8478', { r: 8, gy: Math.min(GROUND_Y + 14, p.y), life: 3, bounce: 0.45 });
          if (p.cluster) for (let k = 0; k < 3; k++) G.proj.push({ kind: 'bomblet', x: p.x, y: p.y - 10, vx: rand(-160, 220), vy: rand(-520, -360), g: GRAV, t: 0, T: rand(0.5, 0.6), dmg: p.dmg * 0.4, r: p.r * 0.55 });
          if (p.fire) G.patches.push({ x: p.x, w: p.r * 0.8, t: 4, dps: 14 });
        } else if (p.kind === 'bomblet') {
          explode(p.x, Math.min(p.y, GROUND_Y), p.r, p.dmg, { imp: 300 });
        } else {
          explode(p.x, p.y, p.r, p.dmg, { imp: 560 });
        }
      }
    } else if (p.kind === 'saw') {
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * 25 * Math.sign(p.vx);
      const gy = GROUND_Y + 2;
      if (p.y >= gy) {
        p.y = gy;
        if (Math.abs(p.vy) > 140) { p.vy = -p.vy * 0.38; for (let k = 0; k < 6; k++) P(p.x, gy + 8, rand(-120, 120), rand(-200, -50), 0.3, 2, '#ffd27a', { add: true, g: 700 }); }
        else p.vy = 0;
        if (Math.random() < 0.5) P(p.x - Math.sign(p.vx) * 10, gy + 10, -Math.sign(p.vx) * rand(40, 160), rand(-140, -40), 0.3, 1.8, '#ffe0a0', { add: true, g: 500 });
      }
      for (const z of G.zombies) {
        if (!targetable(z) || z.fly || p.hit.includes(z)) continue;
        if (Math.abs(p.x - z.x) > z.w * 0.5 + 14 || p.y < z.y - z.h - 10) continue;
        p.hit.push(z);
        const r = hurt(z, p.dmg, { type: 'saw', kx: 120 * Math.sign(p.vx) });
        goo(p.x, p.y - 10, 6, '#5d8a2a');
        if (r === 'blocked') { p.pierce = -1; }
        else p.pierce--;
        if (p.pierce < 0) break;
      }
      if (p.pierce < 0 || p.x > W + 40) {
        if (p.ret && !p.back && p.pierce >= -1) { p.back = true; p.vx = -440; p.hit = []; p.pierce = Math.max(3, p.pierce + 4); p.x = Math.min(p.x, W + 20); }
        else if (!p.back || p.pierce < 0) dead = true;
      }
      if (p.back && p.x < p.ox) dead = true;
      if (dead && p.x < W) gib(p.x, p.y, p.vx * 0.3, -200, 'saw', '#c9d1d8', { r: 13, gy: GROUND_Y + 6, life: 2 });
    }
    if (dead) G.proj.splice(i, 1);
  }
}

function updateEnemyProj(dt) {
  for (let i = G.eproj.length - 1; i >= 0; i--) {
    const p = G.eproj[i];
    p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (Math.random() < 0.7) P(p.x, p.y, rand(-20, 20), rand(-20, 20), 0.35, rand(2, 4), '#a6ff4a', { add: true, grow: -2 });
    if (p.t >= p.T) {
      G.eproj.splice(i, 1);
      if (p.target === 'wall') hurtWall(p.dmg); else if (G.towers.includes(p.target)) hurtTower(p.target, p.dmg);
      for (let k = 0; k < (p.big ? 18 : 10); k++) P(p.x, p.y, rand(-150, 150), rand(-200, 40), rand(0.4, 0.8), rand(2, 4), '#9be83a', { g: 700 });
      P(p.x, p.y, 0, 0, 0.3, p.big ? 40 : 22, 'rgba(160,255,80,0.6)', { add: true });
      SFX.splat();
    }
  }
}

function updateFx(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.size = Math.max(0.3, p.size + p.grow * dt);
  }
  for (let i = G.gibs.length - 1; i >= 0; i--) {
    const g = G.gibs[i];
    g.life -= dt;
    if (g.life <= 0) { G.gibs.splice(i, 1); continue; }
    if (g.rest) continue;
    g.vy += GRAV * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.a += g.av * dt;
    if (g.x < 4) { g.x = 4; g.vx = Math.abs(g.vx) * 0.4; }
    if (g.y >= g.gy) {
      g.y = g.gy;
      if (g.vy > 60) { g.vy = -g.vy * g.bounce; g.vx *= 0.7; g.av *= 0.6; if (g.vy < -120 && g.shape !== 'rock') SFX.splat(); }
      else { g.vy = 0; g.vx *= Math.exp(-8 * dt); g.av *= Math.exp(-8 * dt); if (Math.abs(g.vx) < 4) { g.rest = true; g.a = Math.round(g.a / (Math.PI / 2)) * (Math.PI / 2) * (g.shape === 'r' || g.shape === 'plate' ? 1 : 0) || g.a; } }
    }
  }
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.t += dt; d.a += dt * 6;
    if (d.state === 0) {
      d.vy += GRAV * 0.8 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y >= d.gy) { d.y = d.gy; d.vy = Math.abs(d.vy) > 80 ? -d.vy * 0.45 : 0; d.vx *= 0.6; }
      if (d.t > 1.1 || (INPUT.mx >= 0 && dist(INPUT.mx, INPUT.my, d.x, d.y) < 40)) d.state = 1;
    } else {
      const tx = 40, ty = 30, dx = tx - d.x, dy = ty - d.y, l = Math.hypot(dx, dy);
      d.sp += dt * 2600;
      const step = Math.min(l, (300 + d.sp) * dt);
      d.x += dx / l * step; d.y += dy / l * step;
      if (l < 18) { G.drops.splice(i, 1); G.scrap += d.v; G.scrapGot += d.v; SFX.coin(); UI.pulseScrap(); }
    }
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) { G.bolts[i].life -= dt; if (G.bolts[i].life <= 0) G.bolts.splice(i, 1); }
  for (let i = G.beams.length - 1; i >= 0; i--) { G.beams[i].life -= dt; if (G.beams[i].life <= 0) G.beams.splice(i, 1); }
  for (let i = G.rings.length - 1; i >= 0; i--) { const r = G.rings[i]; r.life -= dt; if (r.life <= 0) G.rings.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt * 0.8; t.y -= dt * 40; if (t.life <= 0) G.texts.splice(i, 1); }
  for (let i = G.decals.length - 1; i >= 0; i--) { G.decals[i].life -= dt; if (G.decals[i].life <= 0) G.decals.splice(i, 1); }
  for (let i = G.patches.length - 1; i >= 0; i--) {
    const p = G.patches[i]; p.t -= dt;
    if (Math.random() < dt * 30) P(p.x + rand(-p.w, p.w), GROUND_Y + rand(-14, 14), rand(-10, 10), rand(-120, -50), rand(0.3, 0.6), rand(6, 11), pick(['#ffb347', '#ff7a2a']), { add: true, grow: -8 });
    for (const z of G.zombies) if (targetable(z) && !z.fly && Math.abs(z.x - p.x) < p.w) { z.burn = Math.max(z.burn, 1.5); z.burnDps = Math.max(z.burnDps, p.dps); }
    if (p.t <= 0) G.patches.splice(i, 1);
  }
}

// ---------------------------------------------------------------- fin de nivel
function finishLevel(win) {
  const res = { win, mode: G.mode, L: G.L, kills: G.kills, scrap: G.scrapGot, stars: 0, gears: 0, first: false, unlocks: [], wave: G.wavesCleared };
  SAVE.stats.kills += G.kills;
  if (G.mode === 'endless') {
    const waves = G.waveIdx;
    res.wave = waves;
    res.gears = waves * 4;
    res.best = waves > SAVE.stats.bestWave;
    SAVE.stats.bestWave = Math.max(SAVE.stats.bestWave, waves);
  } else {
    const L = G.L, base = 15 + 4 * L, prev = SAVE.stars[L] || 0;
    if (win) {
      const f = G.wallHp / G.wallMax;
      res.stars = f >= 0.8 ? 3 : f >= 0.4 ? 2 : 1;
      res.first = prev === 0;
      res.gears = Math.round(base * (res.first ? 1 : 0.4) * [0, 0.6, 0.8, 1][res.stars]);
      if (!res.first && res.stars > prev) res.gears += Math.round(base * 0.25 * (res.stars - prev));
      SAVE.stars[L] = Math.max(prev, res.stars);
      SAVE.stats.wins++;
      if (L >= SAVE.maxLevel && L < MAX_LEVEL) {
        SAVE.maxLevel = L + 1;
        res.unlocks = DEF_ORDER.filter(k => DEFENSES[k].unlock === L + 1);
      } else if (L === MAX_LEVEL) SAVE.maxLevel = Math.max(SAVE.maxLevel, MAX_LEVEL);
      res.newWorld = res.first && L % 10 === 0 && L < MAX_LEVEL;
      res.endlessUnlocked = res.first && L === 10;
    } else {
      SAVE.stats.losses++;
      res.gears = Math.round(base * 0.3 * (G.wavesCleared / G.lvl.waves.length));
    }
  }
  SAVE.gears += res.gears; SAVE.gearsTotal += res.gears;
  if (win || G.mode === 'endless') recordPower();
  writeSave();
  UI.result(res);
}
