'use strict';
const SAVE_KEY = 'chatarraZ_v2';
let SAVE;

function defaultSave() {
  return {
    maxLevel: 1, stars: {}, gears: 0, gearsTotal: 0, up: {},
    mats: { madera: 6, tela: 4, chatarra: 4 }, stash: {}, loadout: ['piedra'], granted: {},
    stats: { kills: 0, wins: 0, losses: 0, bestWave: 0, bossKills: 0, thrown: 0, headshots: 0 },
    history: [], seen: {}, sound: true, music: true,
  };
}
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { s = null; }
  const d = defaultSave();
  SAVE = Object.assign(d, s || {});
  SAVE.stats = Object.assign(defaultSave().stats, SAVE.stats || {});
  SAVE.mats = Object.assign({ madera: 0, tela: 0, chatarra: 0 }, SAVE.mats || {});
  grantUnlocks();
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* almacenamiento bloqueado */ }
}
function up(k) { return SAVE.up[k] || 0; }
function totalStars() { return Object.values(SAVE.stars).reduce((a, b) => a + b, 0); }
function power() {
  let s = 0;
  for (const k in SAVE.up) s += SAVE.up[k];
  return s * 3 + totalStars();
}
function rankOf(p) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (p >= RANKS[i][0]) idx = i;
  return { name: RANKS[idx][1], min: RANKS[idx][0], next: RANKS[idx + 1] || null, idx };
}
function recordPower() {
  SAVE.history.push({ t: Date.now(), p: power(), lvl: SAVE.maxLevel });
  if (SAVE.history.length > 200) SAVE.history.shift();
}

function weaponUnlocked(k) { return WEAPONS[k].unlock <= SAVE.maxLevel; }
function structUnlocked(k) { return STRUCTS[k].unlock <= SAVE.maxLevel; }
function upUnlocked(k) { return UPGRADES[k].unlock <= SAVE.maxLevel; }
function loadoutSlots() { return 2 + up('mochila'); }
function ammoCap(k) {
  switch (k) {
    case 'flecha': return 15 + 5 * up('carcaj');
    case 'flechaFuego': return 3 + up('carcaj');
    case 'molotov': return 2 + up('alforja');
    case 'tablas': case 'puas': return 1 + up('carpinteria');
    case 'aliado': return 1 + (up('aliados') >= 2 ? 1 : 0);
  }
  return 0;
}
function ammoUnlocked(k) {
  for (const w in WEAPONS) if (WEAPONS[w].ammo === k) return weaponUnlocked(w);
  for (const s in STRUCTS) if (STRUCTS[s].ammo === k) return structUnlocked(s);
  return false;
}
// Cuántas unidades de un consumible llevarás al próximo nivel.
function carry(k) { return k === 'aliado' ? ammoCap(k) : Math.min(SAVE.stash[k] || 0, ammoCap(k)); }
function canCraft(k) {
  const a = AMMO[k];
  if (!a.cost) return false;
  for (const m in a.cost) if ((SAVE.mats[m] || 0) < a.cost[m]) return false;
  return true;
}
function craft(k) {
  if (!canCraft(k)) return false;
  const a = AMMO[k];
  for (const m in a.cost) SAVE.mats[m] -= a.cost[m];
  SAVE.stash[k] = (SAVE.stash[k] || 0) + a.per;
  return true;
}
// Regala la munición inicial de cada objeto la primera vez que se desbloquea.
function grantUnlocks() {
  const fresh = [];
  for (const k of AMMO_ORDER) {
    if (SAVE.granted[k] || !ammoUnlocked(k)) continue;
    SAVE.granted[k] = 1;
    SAVE.stash[k] = (SAVE.stash[k] || 0) + AMMO[k].start;
    fresh.push(k);
  }
  for (const w of WEAPON_ORDER) {
    if (!weaponUnlocked(w) || SAVE.granted['w_' + w]) continue;
    SAVE.granted['w_' + w] = 1;
    if (!SAVE.loadout.includes(w) && SAVE.loadout.length < loadoutSlots()) SAVE.loadout.push(w);
  }
  return fresh;
}
