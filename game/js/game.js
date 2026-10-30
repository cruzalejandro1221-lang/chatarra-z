'use strict';
let G = null, UID = 0;
const INPUT = { mx: -1, my: -1 };

// ---------------------------------------------------------------- estadísticas
function weaponStats(k) {
  const w = WEAPONS[k];
  return {
    dmg: w.dmg * (1 + 0.15 * up('fuerza')),
    cd: w.cd * (1 - 0.1 * up('recarga')),
    vmax: w.vmax,
    g: w.kind === 'arrow' || w.kind === 'firearrow' ? GRAV * 0.5 : w.kind === 'pebble' ? GRAV * 0.8 : GRAV,
  };
}
function structStats(k) {
  const s = STRUCTS[k], c = up('carpinteria');
  return {
    maxHp: s.hp * (k === 'aliado' ? 1 : 1 + 0.3 * c),
    dps: s.dps || 0,
    dmg: (s.dmg || 0) * (1 + 0.3 * up('aliados')),
    cd: s.cd || 0,
  };
}

// ---------------------------------------------------------------- partida
function newGame(mode, L) {
  const endless = mode === 'endless', demo = mode === 'demo';
  const lvl = (endless || demo) ? { L: 0, world: demo ? (L || 0) : 0, waves: [], hpMul: 1, bossMul: BAL.boss, spdMul: 1, dmgMul: 1, enemyTypes: [] } : buildLevel(L);
  const wallMax = 600 * (1 + 0.25 * up('muralla'));
  const loadout = demo ? ['piedra'] : SAVE.loadout.filter(weaponUnlocked);
  if (!loadout.includes('piedra')) loadout.unshift('piedra');
  const ammo = {};
  if (!demo) for (const k of AMMO_ORDER.concat(['aliado'])) if (ammoUnlocked(k)) ammo[k] = carry(k);
  G = {
    mode, lvl, L: lvl.L, world: lvl.world, t: 0, speed: 1, paused: false,
    wallHp: wallMax, wallMax, wallFlash: 0,
    slots: SLOT_DEFS.map(s => ({ ...s, tower: null })),
    towers: [], zombies: [], proj: [], parts: [], gibs: [], drops: [], texts: [], rings: [], decals: [], patches: [], timers: [],
    waveIdx: -1, state: demo ? 'demo' : 'prep', stateT: demo ? 0 : (L === 1 ? 14 : 10), spawnEv: [], waveT: 0, linger: 0,
    spawned: 0, totalEv: 0, sel: null,
    player: { weapon: 'piedra', cd: 0, anim: 0, ang: -0.6 }, aim: null, loadout, ammo, used: {}, mats: { madera: 0, tela: 0, chatarra: 0 },
    shake: 0, kills: 0, slowmo: 0, skyFlash: 0, nextThunder: 8, thrown: 0, hits: 0, headshots: 0, placed: 0,
    bg: makeBG(lvl.world), cracks: makeCracks(), boss: null, demoT: 0, wavesCleared: 0, ended: false,
  };
  if (!endless && !demo) G.totalEv = lvl.waves.reduce((a, w) => a + w.groups.reduce((b, g) => b + g.n, 0) + (w.boss ? 1 : 0), 0);
  if (demo) {
    G.wallHp = G.wallMax = 1e9;
    placeStruct('tablas', G.slots[2], true);
    for (let i = 0; i < 4; i++) spawnZombie(pick(['caminante', 'corredor', 'casco']), rand(650, 1250));
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

// ---------------------------------------------------------------- efectos
function P(x, y, vx, vy, life, size, color, o) {
  if (G.parts.length > 1400) G.parts.splice(0, 200);
  o = o || {};
  G.parts.push({ x, y, vx, vy, life, max: life, size, color, g: o.g || 0, drag: o.drag || 0, add: !!o.add, grow: o.grow || 0 });
}
function text(x, y, s, col, size) { G.texts.push({ x, y, s, col: col || '#fff', life: 1, size: size || 16 }); }
function shake(v) { G.shake = Math.min(24, G.shake + v); }
function gib(x, y, vx, vy, shape, col, o) {
  if (G.gibs.length > 220) G.gibs.splice(0, 30);
  o = o || {};
  G.gibs.push({ x, y, vx, vy, a: o.a !== undefined ? o.a : rand(0, 6.28), av: o.av !== undefined ? o.av : rand(-12, 12), shape, col, r: o.r || 6, w: o.w || 8, h: o.h || 20, life: o.life || rand(4, 6), gy: o.gy || (GROUND_Y + rand(-14, 14)), bounce: o.bounce || 0.35, rest: false });
}
function decal(x, y, r, col) { if (G.decals.length > 60) G.decals.shift(); G.decals.push({ x, y, r, col, life: 18 }); }
function dust(x, y, n, col) {
  for (let i = 0; i < n; i++) P(x + rand(-10, 10), y - rand(0, 6), rand(-90, 90), rand(-120, -20), rand(0.4, 0.9), rand(4, 9), col || 'rgba(150,120,90,0.5)', { g: 200, drag: 2, grow: 10 });
}
function goo(x, y, n, col, k) {
  k = k || 1;
  for (let i = 0; i < n; i++) P(x, y, rand(-160, 160) * k, rand(-300, -40) * k, rand(0.4, 0.9), rand(2, 4.5), col, { g: 1100 });
}
function addTimer(t, fn) { G.timers.push({ t, fn }); }

// ---------------------------------------------------------------- defensas colocables
function slotAllowed(key, slot) { const w = STRUCTS[key].where; return w === 'both' || w === slot.kind; }
function placeStruct(key, slot, free) {
  const st = structStats(key);
  const t = { key, slot, x: slot.x, y: slot.y, roof: slot.kind === 'roof', hp: st.maxHp, s: st, cd: 1, anim: Math.random() * 6, ang: -0.5, flash: 0, throwA: 0, id: ++UID };
  slot.tower = t; G.towers.push(t);
  if (!free) {
    const a = STRUCTS[key].ammo;
    G.ammo[a]--; G.used[a] = (G.used[a] || 0) + 1; G.placed++;
    dust(slot.x, slot.y, 10, 'rgba(180,160,130,0.55)');
    SFX.place();
  }
  return t;
}
function removeTower(t, destroyed) {
  t.slot.tower = null;
  const i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1);
  if (!destroyed) return;
  const cols = t.key === 'aliado' ? ['#6b5a44', '#8a6a4a'] : ['#8a6038', '#6b4a2a', '#a57a48'];
  for (let k = 0; k < 8; k++) gib(t.x + rand(-15, 15), t.y - rand(10, 40), rand(-200, 200), rand(-480, -180), 'plate', pick(cols), { w: rand(8, 22), h: rand(4, 8), gy: t.roof ? t.y - 2 : GROUND_Y + rand(-6, 10), life: rand(3, 5) });
  dust(t.x, t.y, 12, 'rgba(110,90,70,0.5)');
  shake(4); SFX.clank();
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
  const hpM = G.mode === 'endless' ? 0.6 + 0.06 * Math.max(0, G.waveIdx) : G.lvl.hpMul * (d.boss ? G.lvl.bossMul : 1);
  const z = {
    type, d, x: x !== undefined ? x : SPAWN_X + rand(0, 40), z: d.boss ? 0.4 : rand(-1, 1), y: 0, vy: 0, kvx: 0, onGround: true, rot: 0, av: 0,
    hp: d.hp * hpM, maxHp: d.hp * hpM, armor: d.armor || 0, maxArmor: d.armor || 0, shield: 0, maxShield: 0, dmg: d.dmg * (G.lvl.dmgMul || 1),
    speed: d.speed * (G.lvl.spdMul || 1) * (d.boss ? 1 : rand(0.9, 1.1)), w: d.w, h: d.h, mass: d.mass,
    state: 'walk', atkT: rand(0, 0.5), atkAnim: 0, anim: rand(0, 6), flash: 0, shieldFlash: 0, burn: 0, burnDps: 0, stun: 0,
    jumped: false, dead: false, id: ++UID, spitAnim: 0, specT: d.boss ? 6 : 0, groanT: rand(2, 10),
  };
  z.gy = GROUND_Y + z.z * 18; z.y = z.gy;
  if (o) Object.assign(z, o);
  G.zombies.push(z);
  if (d.boss) { G.boss = z; SFX.groan(true); shake(8); UI.banner(d.name.toUpperCase(), '¡Jefe a la vista!', 'red'); }
  return z;
}
function zcy(z) { return z.y - z.h * 0.55; }
function headY(z) { return z.y - z.h * 0.76; }
function targetable(z) { return !z.dead; }

function findBlocker(z) {
  let best = null, bx = WALL_X;
  for (const t of G.towers) {
    if (t.roof || !STRUCTS[t.key].blocks || t.x > z.x + 4) continue;
    const right = t.x + 26;
    if (right > bx) { bx = right; best = t; }
  }
  return { t: best, x: bx };
}

function hurt(z, dmg, o) {
  if (z.dead) return;
  o = o || {};
  if (z.d.boss && z.armor > 0 && o.type !== 'burn') { const a = dmg * 0.75; z.armor -= a; dmg -= a; }
  z.hp -= dmg;
  if (o.type !== 'burn') z.flash = 0.07;
  if (o.kx) z.kvx += o.kx / z.mass;
  if (o.ky) {
    const vy = z.vy + o.ky / z.mass;
    if (vy < -140) { z.vy = vy; z.onGround = false; z.av = rand(-4, 4); }
  }
  if (o.stun) z.stun = Math.max(z.stun, o.stun / Math.max(1, z.mass * 0.7));
  if (z.hp <= 0) killZombie(z, o);
}

function killZombie(z, o) {
  z.dead = true;
  o = o || {};
  if (G.mode !== 'demo') G.kills++;
  const d = z.d, s = d.scale || 1, cx = z.x, cy = zcy(z);
  const kx = (o.kx || 60) / Math.max(1, z.mass * 0.5), ky = o.ky ? o.ky / Math.max(1, z.mass * 0.5) : -260;
  const blast = o.type === 'blast';
  const spread = blast ? 1.6 : 0.9, gy = z.gy;
  const hy = z.y - z.h * 0.88, ty = z.y - z.h * 0.5, ly = z.y - z.h * 0.18;
  gib(cx - 3 * s, hy, kx * spread + rand(-80, 80) + (o.head ? 120 : 0), ky * spread + rand(-200, -60) - (o.head ? 200 : 0), 'head', d.skin, { r: 9.5 * s, gy, av: rand(-15, 15) });
  gib(cx, ty, kx * spread * 0.6 + rand(-40, 40), ky * spread * 0.7 + rand(-80, 0), 'r', d.shirt, { w: 20 * s, h: 26 * s, gy, av: rand(-6, 6) });
  for (let i = 0; i < 2; i++) {
    gib(cx + rand(-6, 6), ty - 6 * s, kx * spread + rand(-140, 140), ky * spread + rand(-260, 0), 'r', d.skin, { w: 6 * s, h: 20 * s, gy });
    gib(cx + rand(-6, 6), ly, kx * spread * 0.5 + rand(-110, 110), ky * spread * 0.6 + rand(-160, 0), 'r', d.pants, { w: 7 * s, h: 24 * s, gy });
  }
  if (d.boss || z.type === 'bruto') for (let i = 0; i < (d.boss ? 10 : 3); i++) gib(cx + rand(-30, 30) * s, ty + rand(-20, 20) * s, rand(-300, 300), rand(-700, -200), 'c', i % 2 ? d.skin : d.shirt, { r: rand(5, 10) * s, gy });
  if (z.type === 'casco' && z.armor > 0) gib(cx, hy - 6, rand(60, 180), rand(-560, -380), 'helmet', '#f2c230', { r: 10, gy });
  goo(cx, ty, d.boss ? 50 : 14, '#5d8a2a', blast ? 1.3 : 1);
  decal(cx + rand(-10, 10), gy + 2, rand(10, 18) * s, '#5d8a2a');
  SFX.splat();
  if (G.mode !== 'demo') {
    for (const m in d.mats) {
      const e = d.mats[m], n = Math.floor(e) + (Math.random() < e % 1 ? 1 : 0);
      for (let i = 0; i < n; i++) spawnDrop(cx, cy, m);
    }
  }
  if (d.boom) addTimer(0.05, () => explode(cx, z.y - 30, d.boom.r, d.boom.dmg, { towers: 1, wallMul: 1, imp: 520, hurtZ: 0.6, col: '#a8d850' }));
  if (d.boss) {
    G.slowmo = 1.6; shake(20); G.boss = null;
    for (let i = 0; i < 4; i++) addTimer(i * 0.18, () => explode(cx + rand(-60, 60), z.y - rand(30, 160), 90, 0, { imp: 300 }));
    if (G.mode !== 'demo') { SAVE.stats.bossKills++; UI.banner('¡JEFE DERROTADO!', d.name, 'gold'); }
  }
}

function spawnDrop(x, y, mat) {
  G.drops.push({ x, y, vx: rand(-110, 110), vy: rand(-420, -250), mat, t: 0, state: 0, gy: GROUND_Y + rand(-10, 16), sp: 0, a: rand(0, 6) });
}

// ---------------------------------------------------------------- explosiones y fuego
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
    }
    if (o.towers) {
      for (const t of G.towers.slice()) { const d = dist(x, y, t.x, t.y - 25); if (d < r) hurtTower(t, dmg * (1 - d / r * 0.5) * o.towers); }
      if (o.wallMul && x - WALL_X < r) hurtWall(dmg * 0.6 * o.wallMul * (1 - Math.max(0, x - WALL_X) / r));
    }
  }
  for (const g of G.gibs) { const d = dist(x, y, g.x, g.y); if (d < r * 1.4) { const f = 1 - d / (r * 1.4); g.vx += Math.sign(g.x - x || 1) * imp * f; g.vy -= imp * 1.2 * f; g.av += rand(-20, 20) * f; g.rest = false; } }
  const big = r > 100;
  P(x, y, 0, 0, 0.12, r * 1.3, 'rgba(255,240,200,0.9)', { add: true });
  for (let i = 0; i < (big ? 18 : 11); i++) { const a = rand(0, 6.28), sp = rand(60, 260); P(x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 80, rand(0.25, 0.55), rand(10, 22) * (r / 90), pick(['#ffb347', '#ff7a2a', '#ffd27a', '#ff5a2a']), { add: true, drag: 3, grow: -10 }); }
  for (let i = 0; i < (big ? 14 : 8); i++) P(x + rand(-r * 0.4, r * 0.4), y + rand(-20, 10), rand(-60, 60), rand(-120, -30), rand(0.8, 1.6), rand(14, 26) * (r / 90), o.col ? rgba(o.col, 0.35) : 'rgba(60,54,48,0.5)', { drag: 1.5, grow: 30 });
  for (let i = 0; i < (big ? 26 : 14); i++) P(x, y, rand(-420, 420), rand(-520, 80), rand(0.3, 0.8), rand(1.5, 3), '#ffe0a0', { add: true, g: 900 });
  G.rings.push({ x, y, r: r * 0.2, max: r * 1.2, life: 0.35, maxLife: 0.35, col: '255,230,190' });
  if (y > GROUND_Y - 40) decal(x, Math.min(GROUND_Y + 20, y + 6), r * 0.45, 'rgba(20,14,10,0.55)');
  shake(r / 14);
  SFX.boom(big);
}
function ignite(z, dps, t) { z.burn = Math.max(z.burn, t); z.burnDps = Math.max(z.burnDps, dps); }
function firePatch(x, r, t, dps) {
  G.patches.push({ x, w: r, t, dps });
  for (let i = 0; i < 16; i++) P(x + rand(-r * 0.6, r * 0.6), GROUND_Y + rand(-10, 10), rand(-60, 60), rand(-220, -80), rand(0.4, 0.8), rand(8, 14), pick(['#ffb347', '#ff7a2a', '#ffd27a']), { add: true, grow: -6 });
  SFX.flame();
}

// ---------------------------------------------------------------- lanzamientos
function aimFromPull(px, py) {
  const st = weaponStats(G.player.weapon);
  const k = st.vmax / MAX_PULL;
  let vx = px * k, vy = py * k;
  const m = Math.hypot(vx, vy);
  if (m > st.vmax) { vx *= st.vmax / m; vy *= st.vmax / m; }
  return { vx, vy, power: Math.min(1, m / st.vmax) };
}
function canThrow() {
  const w = WEAPONS[G.player.weapon];
  return G.player.cd <= 0 && (!w.ammo || G.ammo[w.ammo] > 0);
}
function throwWeapon(vx, vy, from) {
  const key = G.player.weapon, w = WEAPONS[key];
  if (G.player.cd > 0) return false;
  if (w.ammo) {
    if (!(G.ammo[w.ammo] > 0)) { SFX.deny(); return false; }
    G.ammo[w.ammo]--; G.used[w.ammo] = (G.used[w.ammo] || 0) + 1;
  }
  const st = weaponStats(key);
  const o = from || HAND;
  G.proj.push({ kind: w.kind, w: key, x: o.x, y: o.y, vx, vy, g: st.g, dmg: st.dmg, pierce: w.pierce || 0, hit: [], a: Math.atan2(vy, vx), av: w.kind === 'stick' ? 16 : w.kind === 'molotov' ? 9 : 0, life: 4, ally: !!from });
  G.player.cd = st.cd; G.player.anim = 1; G.player.ang = Math.atan2(vy, vx);
  if (!from) G.thrown++;
  SFX.shoot();
  if (w.ammo && G.ammo[w.ammo] <= 0 && !from) {
    addTimer(0.3, () => { if (G.player.weapon === key) { G.player.weapon = 'piedra'; UI.refreshCards(); UI.toast(`Se acabó la munición de <b>${w.name}</b>. Vuelves a las piedras.`, 3); } });
  }
  return true;
}
// Calcula el lanzamiento (tiro bajo) hacia un punto con una velocidad dada; null si no llega.
function solveThrow(sx, sy, tx, ty, v, g) {
  const dx = tx - sx, dy = sy - ty;
  if (dx <= 0) return null;
  const v2 = v * v, disc = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
  if (disc < 0) return null;
  const ang = Math.atan((v2 - Math.sqrt(disc)) / (g * dx));
  return { vx: v * Math.cos(ang), vy: -v * Math.sin(ang), T: dx / (v * Math.cos(ang)) };
}
function predictX(z, T) { return (z.state !== 'walk' || !z.onGround || z.stun > 0) ? z.x : z.x - z.speed * T; }
// Puntería automática con error (para el aliado, la demo y el simulador).
function autoAim(sx, sy, z, v, g, err, headChance) {
  const ty = Math.random() < (headChance || 0) ? headY(z) - 4 : zcy(z);
  let s = solveThrow(sx, sy, z.x, ty, v, g);
  if (!s) return null;
  s = solveThrow(sx, sy, predictX(z, s.T), ty, v, g) || s;
  const a = Math.atan2(s.vy, s.vx) + (Math.random() + Math.random() + Math.random() - 1.5) * err;
  const m = Math.hypot(s.vx, s.vy) * (1 + (Math.random() - 0.5) * err * 0.8);
  return { vx: Math.cos(a) * m, vy: Math.sin(a) * m };
}

function hitZombie(p, z) {
  const head = p.y < headY(z) + 2;
  const helmet = z.type === 'casco' && z.armor > 0;
  const blunt = p.kind === 'rock' || p.kind === 'pebble' || p.kind === 'stick';
  let dmg = p.dmg;
  if (head && helmet) {
    if (blunt) {
      z.armor -= dmg * 0.5; z.flash = 0.05; SFX.clank();
      for (let i = 0; i < 5; i++) P(p.x, p.y, rand(-120, 60), rand(-140, 20), 0.25, 2, '#fff3b0', { add: true, g: 500 });
      if (!p.ally) text(z.x, headY(z) - 22, '¡CLANK!', '#ffd24d', 14);
      if (z.armor <= 0) popHelmet(z);
      return 'bounce';
    }
    z.armor -= dmg; if (z.armor <= 0) popHelmet(z);
    dmg *= 0.5;
  } else if (head) {
    dmg *= 2;
    if (!p.ally) { G.headshots++; text(z.x, headY(z) - 22, '¡A LA CABEZA!', '#ff8a5a', 15); }
  }
  G.hits += p.ally ? 0 : 1;
  const w = WEAPONS[p.w] || {};
  hurt(z, dmg, { type: 'hit', kx: (w.kx || 60) * Math.sign(p.vx || 1), stun: p.kind === 'stick' ? 0.45 : 0, head });
  goo(p.x, p.y, 4, '#6a9a3a');
  SFX.hit();
  if (p.kind === 'firearrow') {
    ignite(z, w.burn, w.burnT);
    for (const o of G.zombies) if (o !== z && targetable(o) && Math.abs(o.x - z.x) < w.splash) ignite(o, w.burn * 0.7, w.burnT * 0.7);
    for (let i = 0; i < 10; i++) P(p.x, p.y, rand(-120, 120), rand(-160, 20), rand(0.3, 0.6), rand(5, 9), pick(['#ffb347', '#ff7a2a']), { add: true, grow: -6 });
    SFX.flame();
  }
  return 'hit';
}
function popHelmet(z) {
  gib(z.x - 3, z.y - z.h + 6, rand(60, 180), rand(-560, -380), 'helmet', '#f2c230', { r: 10, gy: z.gy, av: rand(-14, 14) });
  text(z.x, z.y - z.h - 26, '¡Casco fuera!', '#ffd24d', 14);
}
function shatterMolotov(p) {
  const w = WEAPONS.molotov;
  const x = p.x, gyx = Math.min(p.y, GROUND_Y);
  for (const z of G.zombies) if (targetable(z) && Math.abs(z.x - x) < w.patch.r) { hurt(z, p.dmg, { type: 'blast', kx: 0 }); ignite(z, w.patch.dps, 2); }
  firePatch(x, w.patch.r, w.patch.t, w.patch.dps);
  for (let i = 0; i < 10; i++) P(x, gyx - 6, rand(-200, 200), rand(-260, -60), rand(0.3, 0.6), 2, '#cfe8ff', { g: 900 });
  P(x, gyx - 10, 0, 0, 0.15, 80, 'rgba(255,200,120,0.8)', { add: true });
  shake(3); SFX.boom(false);
}

// ---------------------------------------------------------------- oleadas
function startWave(i) {
  if (G.mode === 'endless' && !G.lvl.waves[i]) G.lvl.waves[i] = endlessWave(i + 1);
  const w = G.lvl.waves[i];
  if (!w) return;
  G.waveIdx = i; G.state = 'wave'; G.waveT = 0; G.linger = 0;
  G.spawnEv = [];
  for (const g of w.groups) for (let k = 0; k < g.n; k++) G.spawnEv.push({ t: g.at + k * g.gap, type: g.type });
  if (w.boss) G.spawnEv.push({ t: 6, type: w.boss });
  G.spawnEv.sort((a, b) => a.t - b.t);
  if (G.mode === 'endless') { G.totalEv = G.spawnEv.length; G.spawned = 0; UI.banner('OLEADA ' + (i + 1), '', ''); }
  else UI.banner(w.final ? '¡OLEADA FINAL!' : 'OLEADA ' + (i + 1), w.final ? 'Aguanta un poco más' : (i + 1) + ' de ' + G.lvl.waves.length, w.final ? 'red' : '');
  SFX.horn(); SFX.setIntensity(1);
  UI.hudFlags();
}
function callWaveEarly() { if (G.state === 'prep' || G.state === 'between') startWave(G.waveIdx + 1); }
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
  if (G.mode !== 'endless' && w.final) { if (!alive) winLevel(); return; }
  G.linger += dt;
  if (!alive) {
    G.wavesCleared = G.waveIdx + 1;
    G.state = 'between'; G.stateT = 7; SFX.setIntensity(0);
    UI.hudFlags();
  } else if (G.linger > 22) {
    G.wavesCleared = G.waveIdx + 1;
    startWave(G.waveIdx + 1);
  }
}
function winLevel() {
  if (G.state === 'won' || G.state === 'lost') return;
  G.state = 'won'; G.endT = 2.4; G.wavesCleared = G.lvl.waves.length; SFX.setIntensity(0);
  UI.banner('¡VICTORIA!', 'La muralla resiste', 'gold'); SFX.win();
  G.drops.forEach(d => { d.state = 1; });
}
function loseLevel() {
  if (G.state === 'won' || G.state === 'lost') return;
  G.state = 'lost'; G.endT = 3; SFX.setIntensity(0);
  for (let i = 0; i < 6; i++) addTimer(i * 0.25, () => explode(rand(20, 190), rand(BUNKER_TOP, GROUND_Y), 90, 0, { imp: 200 }));
  for (let i = 0; i < 20; i++) gib(rand(0, 200), rand(BUNKER_TOP, GROUND_Y), rand(-100, 400), rand(-700, -200), 'plate', pick(['#615a52', '#57504a', '#6a6158']), { w: rand(16, 40), h: rand(10, 30), life: 8 });
  UI.banner('¡LA MURALLA CAYÓ!', '', 'red'); SFX.lose();
}

// ---------------------------------------------------------------- actualización
function updateGame(dt) {
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.35; }
  G.t += dt;
  G.shake *= Math.exp(-dt * 7);
  G.wallFlash = Math.max(0, G.wallFlash - dt);
  G.skyFlash = Math.max(0, G.skyFlash - dt * 2.5);
  for (let i = G.timers.length - 1; i >= 0; i--) { const tm = G.timers[i]; tm.t -= dt; if (tm.t <= 0) { G.timers.splice(i, 1); tm.fn(); } }

  if (G.mode === 'demo') updateDemo(dt);
  else if (G.state !== 'won' && G.state !== 'lost') updateWaves(dt);

  const pl = G.player;
  pl.cd = Math.max(0, pl.cd - dt); pl.anim = Math.max(0, pl.anim - dt * 4);
  if (G.aim) { const a = aimFromPull(G.aim.sx - G.aim.cx, G.aim.sy - G.aim.cy); if (a.power > 0.05) pl.ang = Math.atan2(a.vy, a.vx); }

  for (const t of G.towers.slice()) updateStruct(t, dt);
  for (const z of G.zombies) updateZombie(z, dt);
  G.zombies = G.zombies.filter(z => !z.dead && z.x > -200);
  updateProjectiles(dt);
  updateFx(dt);

  if (G.state === 'won' || G.state === 'lost') {
    G.endT -= dt;
    if (G.endT <= 0 && !G.ended) { G.ended = true; finishLevel(G.state === 'won'); }
  }
}

function updateDemo(dt) {
  G.demoT -= dt;
  if (G.demoT <= 0) { G.demoT = rand(1.6, 2.8); spawnZombie(pick(['caminante', 'caminante', 'corredor', 'casco', 'bruto'])); }
  if (G.player.cd <= 0) {
    const z = G.zombies.filter(z => targetable(z) && z.x < 900).sort((a, b) => a.x - b.x)[0];
    if (z) { const st = weaponStats('piedra'); const v = autoAim(HAND.x, HAND.y, z, st.vmax, st.g, 0.04, 0.4); if (v) throwWeapon(v.vx, v.vy); G.player.cd = 0.9; }
  }
  for (const t of G.towers) t.hp = t.s.maxHp;
}

function updateStruct(t, dt) {
  t.flash = Math.max(0, t.flash - dt);
  t.anim += dt; t.cd -= dt; t.throwA = Math.max(0, t.throwA - dt * 4);
  if (t.key === 'puas') {
    let on = 0;
    for (const z of G.zombies) {
      if (!targetable(z) || !z.onGround || Math.abs(z.x - t.x) > 34) continue;
      on++;
      hurt(z, t.s.dps * dt, { type: 'burn' });
      if (Math.random() < dt * 6) goo(z.x, z.y - 6, 2, '#6a9a3a', 0.4);
    }
    if (on) { t.hp -= 9 * on * dt; if (t.hp <= 0) removeTower(t, true); }
  } else if (t.key === 'aliado') {
    if (t.cd > 0 || G.state === 'won' || G.state === 'lost') return;
    const sx = t.x + 8, sy = t.y - 46;
    const z = G.zombies.filter(z => targetable(z) && z.x > t.x + 30 && z.x < t.x + 700).sort((a, b) => a.x - b.x)[0];
    if (!z) return;
    const v = autoAim(sx, sy, z, 900, GRAV, 0.07, 0.15);
    if (!v) return;
    t.cd = t.s.cd; t.throwA = 1; t.ang = Math.atan2(v.vy, v.vx);
    G.proj.push({ kind: 'rock', w: 'piedra', x: sx, y: sy, vx: v.vx, vy: v.vy, g: GRAV, dmg: t.s.dmg, pierce: 0, hit: [], a: 0, av: 0, life: 4, ally: true });
  }
}

function updateZombie(z, dt) {
  z.flash = Math.max(0, z.flash - dt);
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
  if (z.x - z.w * 0.4 <= b.x + 1) {
    if (z.type === 'saltador' && !z.jumped && b.t) {
      z.jumped = true; z.onGround = false; z.vy = -760; z.kvx = -270; z.av = -2;
      dust(z.x, z.gy, 6);
      return;
    }
    z.state = 'attack';
    z.atkT -= dt;
    if (z.atkT <= 0) {
      z.atkT = 1 / d.atk; z.atkAnim = 1;
      if (b.t) hurtTower(b.t, z.dmg); else hurtWall(z.dmg);
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
  const b = findBlocker(z), minX = b.x + z.w * 0.4;
  if (z.x < minX && z.x > b.x - 30) z.x = minX;
  if (z.x < WALL_X + z.w * 0.4) z.x = WALL_X + z.w * 0.4;
}
function bossSpecial(z, dt) {
  z.specT -= dt;
  if (z.specT > 0 || !z.d.stomp) return;
  z.specT = 7;
  shake(14); SFX.boom(true);
  dust(z.x, z.gy, 30, 'rgba(140,110,80,0.6)');
  G.rings.push({ x: z.x, y: z.gy, r: 20, max: 220, life: 0.5, maxLife: 0.5, col: '200,170,130' });
  for (const t of G.towers.slice()) if (!t.roof && Math.abs(t.x - z.x) < 220) hurtTower(t, 60);
  for (const g of G.gibs) if (Math.abs(g.x - z.x) < 300) { g.vy -= 400; g.rest = false; }
}

function updateProjectiles(dt) {
  for (let i = G.proj.length - 1; i >= 0; i--) {
    const p = G.proj[i];
    let dead = false;
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    p.a = p.av ? p.a + p.av * dt : Math.atan2(p.vy, p.vx);
    if (p.kind === 'firearrow' && Math.random() < 0.8) P(p.x, p.y, rand(-20, 20), rand(-40, 0), 0.3, rand(3, 6), pick(['#ffb347', '#ff7a2a']), { add: true, grow: -8 });
    const r = p.kind === 'stick' ? 12 : p.kind === 'pebble' ? 5 : 7;
    if (!p.inert) {
      for (const z of G.zombies) {
        if (!targetable(z) || p.hit.includes(z)) continue;
        if (Math.abs(p.x - z.x) > z.w * 0.5 + r || p.y < z.y - z.h - r || p.y > z.y + 2) continue;
        if (p.kind === 'molotov') { shatterMolotov(p); dead = true; break; }
        p.hit.push(z);
        const res = hitZombie(p, z);
        if (res === 'bounce') { p.inert = true; p.vx = -p.vx * 0.25; p.vy = -260; p.av = 12; break; }
        if (p.kind === 'arrow' || p.kind === 'firearrow') { if (p.pierce-- <= 0) { dead = true; break; } }
        else { p.inert = true; p.vx = -p.vx * 0.2 + rand(-40, 40); p.vy = -180; p.av = rand(-14, 14); break; }
      }
    }
    if (!dead && p.y > GROUND_Y + 14) {
      dead = true;
      if (p.kind === 'molotov') shatterMolotov(p);
      else if (p.kind === 'arrow' || p.kind === 'firearrow') {
        gib(p.x, GROUND_Y + 12, 0, 0, 'r', '#d8c7a0', { w: 22, h: 3, a: Math.atan2(p.vy, p.vx), av: 0, life: 1.5, gy: GROUND_Y + 14 });
        if (p.kind === 'firearrow' && !p.inert) firePatch(p.x, 40, 2, 12);
      } else if (p.kind === 'stick') gib(p.x, GROUND_Y + 8, p.vx * 0.3, -Math.abs(p.vy) * 0.3, 'r', '#8a6038', { w: 6, h: 30, a: p.a, life: 2, gy: GROUND_Y + 10 });
      else gib(p.x, GROUND_Y + 8, p.vx * 0.3, -Math.abs(p.vy) * 0.25, 'rock', '#8d8478', { r: p.kind === 'pebble' ? 3.5 : 6, life: 2, gy: GROUND_Y + 10, bounce: 0.4 });
      if (p.kind !== 'molotov') dust(p.x, GROUND_Y + 8, 3, 'rgba(150,120,90,0.4)');
    }
    if (p.life <= 0 || p.x > W + 80 || p.x < -40) dead = true;
    if (dead) G.proj.splice(i, 1);
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
      if (g.vy > 60) { g.vy = -g.vy * g.bounce; g.vx *= 0.7; g.av *= 0.6; }
      else { g.vy = 0; g.vx *= Math.exp(-8 * dt); g.av *= Math.exp(-8 * dt); if (Math.abs(g.vx) < 4) g.rest = true; }
    }
  }
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.t += dt; d.a += dt * 6;
    if (d.state === 0) {
      d.vy += GRAV * 0.8 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y >= d.gy) { d.y = d.gy; d.vy = Math.abs(d.vy) > 80 ? -d.vy * 0.45 : 0; d.vx *= 0.6; }
      if (d.t > 1.2) d.state = 1;
    } else {
      const [tx, ty] = UI.matPos(d.mat), dx = tx - d.x, dy = ty - d.y, l = Math.hypot(dx, dy) || 1;
      d.sp += dt * 2600;
      const step = Math.min(l, (300 + d.sp) * dt);
      d.x += dx / l * step; d.y += dy / l * step;
      if (l < 16) { G.drops.splice(i, 1); G.mats[d.mat]++; SFX.coin(); UI.pulseMat(d.mat); }
    }
  }
  for (let i = G.rings.length - 1; i >= 0; i--) { G.rings[i].life -= dt; if (G.rings[i].life <= 0) G.rings.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt * 0.9; t.y -= dt * 40; if (t.life <= 0) G.texts.splice(i, 1); }
  for (let i = G.decals.length - 1; i >= 0; i--) { G.decals[i].life -= dt; if (G.decals[i].life <= 0) G.decals.splice(i, 1); }
  for (let i = G.patches.length - 1; i >= 0; i--) {
    const p = G.patches[i]; p.t -= dt;
    if (Math.random() < dt * 30) P(p.x + rand(-p.w, p.w), GROUND_Y + rand(-14, 14), rand(-10, 10), rand(-120, -50), rand(0.3, 0.6), rand(6, 11), pick(['#ffb347', '#ff7a2a']), { add: true, grow: -8 });
    for (const z of G.zombies) if (targetable(z) && Math.abs(z.x - p.x) < p.w) ignite(z, p.dps, 1.2);
    if (p.t <= 0) G.patches.splice(i, 1);
  }
}

// ---------------------------------------------------------------- fin de nivel
function finishLevel(win) {
  const res = { win, mode: G.mode, L: G.L, kills: G.kills, stars: 0, gears: 0, first: false, unlocks: [], wave: G.wavesCleared, mats: { ...G.mats }, bonus: {}, used: { ...G.used } };
  SAVE.stats.kills += G.kills; SAVE.stats.thrown += G.thrown; SAVE.stats.headshots += G.headshots;
  for (const k in G.used) if (k !== 'aliado') SAVE.stash[k] = Math.max(0, (SAVE.stash[k] || 0) - G.used[k]);
  if (G.mode === 'endless') {
    res.wave = G.waveIdx;
    res.gears = G.waveIdx * 3;
    res.best = G.waveIdx > SAVE.stats.bestWave;
    SAVE.stats.bestWave = Math.max(SAVE.stats.bestWave, G.waveIdx);
  } else {
    const L = G.L, base = 10 + 3 * L, prev = SAVE.stars[L] || 0;
    if (win) {
      const f = G.wallHp / G.wallMax;
      res.stars = f >= 0.8 ? 3 : f >= 0.4 ? 2 : 1;
      res.first = prev === 0;
      res.gears = Math.round(base * (res.first ? 1 : 0.4) * [0, 0.6, 0.8, 1][res.stars]);
      if (!res.first && res.stars > prev) res.gears += Math.round(base * 0.25 * (res.stars - prev));
      res.bonus = { madera: 2 + Math.ceil(L / 3), tela: 1 + Math.ceil(L / 4), chatarra: 1 + Math.ceil(L / 4) };
      if (!res.first) for (const m in res.bonus) res.bonus[m] = Math.ceil(res.bonus[m] / 2);
      SAVE.stars[L] = Math.max(prev, res.stars);
      SAVE.stats.wins++;
      if (L >= SAVE.maxLevel) {
        const before = SAVE.maxLevel;
        SAVE.maxLevel = Math.min(L + 1, MAX_LEVEL);
        res.unlocks = WEAPON_ORDER.filter(k => WEAPONS[k].unlock > before && WEAPONS[k].unlock <= SAVE.maxLevel).map(k => ({ type: 'w', k }))
          .concat(STRUCT_ORDER.filter(k => STRUCTS[k].unlock > before && STRUCTS[k].unlock <= SAVE.maxLevel).map(k => ({ type: 's', k })));
        res.fresh = grantUnlocks();
      }
      res.endlessUnlocked = res.first && L === 10;
    } else {
      SAVE.stats.losses++;
      res.gears = Math.round(base * 0.3 * (G.wavesCleared / G.lvl.waves.length));
    }
  }
  for (const m of MAT_ORDER) SAVE.mats[m] += (res.mats[m] || 0) + (res.bonus[m] || 0);
  SAVE.gears += res.gears; SAVE.gearsTotal += res.gears;
  if (win || G.mode === 'endless') recordPower();
  writeSave();
  UI.result(res);
}
