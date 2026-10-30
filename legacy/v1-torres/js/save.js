'use strict';
const SAVE_KEY = 'chatarraZ_v1';
let SAVE;

function defaultSave() {
  return {
    maxLevel: 1, stars: {}, gears: 0, gearsTotal: 0, up: {},
    stats: { kills: 0, wins: 0, losses: 0, bestWave: 0, time: 0, bossKills: 0 },
    history: [], seen: {}, tips: {}, sound: true, music: true,
  };
}
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { s = null; }
  const d = defaultSave();
  SAVE = Object.assign(d, s || {});
  SAVE.stats = Object.assign(defaultSave().stats, SAVE.stats || {});
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
  const next = RANKS[idx + 1] || null;
  return { name: RANKS[idx][1], min: RANKS[idx][0], next, idx };
}
function isUnlocked(k) { return DEFENSES[k].unlock <= SAVE.maxLevel; }
function recordPower() {
  SAVE.history.push({ t: Date.now(), p: power(), lvl: SAVE.maxLevel });
  if (SAVE.history.length > 200) SAVE.history.shift();
}
