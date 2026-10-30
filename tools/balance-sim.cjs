// Simulación del Mundo 1 con un bot que apunta con error humano.
// uso: node tools/balance-sim.cjs [error_rad=0.08] [prob_cabeza=0.2] [BAL_json]   (GEST=segundos por gesto)
// Ej.: GEST=1.3 node tools/balance-sim.cjs 0.1 0.1   -> jugador casual
const fs = require('fs'), vm = require('vm');
const path = require('path');
const dir = path.join(__dirname, '..', 'game', 'js') + path.sep, ERR = +(process.argv[2] || 0.08), HEAD = +(process.argv[3] || 0.2), GEST = +(process.env.GEST || 1.0);
const noop = () => {};
const grad = () => ({ addColorStop: noop });
const ctxStub = new Proxy({}, { get: (t, p) => (p in t ? t[p] : (p === 'createLinearGradient' || p === 'createRadialGradient') ? grad : noop), set: (t, p, v) => { t[p] = v; return true; } });
let lastRes = null;
const sb = {
  console, Math, JSON, Date, Object, Array, Set, Promise, setTimeout, parseInt, parseFloat, isNaN,
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub }) },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  SFX: new Proxy({}, { get: () => noop }),
  UI: new Proxy({}, { get: (t, p) => p === 'result' ? (r => { lastRes = r; }) : p === 'matPos' ? (() => [60, 90]) : noop }),
};
sb.window = sb; vm.createContext(sb);
for (const f of ['util.js', 'data.js', 'save.js', 'art.js', 'art2.js', 'game.js']) vm.runInContext(fs.readFileSync(dir + f, 'utf8'), sb, { filename: f });
if (process.argv[4]) vm.runInContext('Object.assign(BAL,' + process.argv[4] + ')', sb);
vm.runInContext(`
loadSave();
var BOT = { err: ${ERR}, head: ${HEAD}, gest: ${GEST} };
function botStart(){
  const want = [['tablas',3],['puas',2],['aliado',0],['aliado',1]];
  for (const [k, si] of want) { const s=G.slots[si]; if (s && !s.tower && G.ammo[STRUCTS[k].ammo]>0 && slotAllowed(k,s)) placeStruct(k,s); }
}
function botReplace(){ // vuelve a poner barricada si se rompió
  for (const [k, si] of [['tablas',3],['tablas',2],['puas',2]]) { const s=G.slots[si]; if (s && !s.tower && G.ammo[STRUCTS[k].ammo]>0) { placeStruct(k,s); return; } }
}
function pickWeapon(z){
  const has = k => G.loadout.includes(k) && (!WEAPONS[k].ammo || G.ammo[WEAPONS[k].ammo]>0);
  const near = G.zombies.filter(o=>targetable(o)&&Math.abs(o.x-z.x)<90).length;
  if ((z.d.boss || near>=4) && has('molotov') && z.x < 900) return 'molotov';
  if ((z.d.boss || near>=3 || z.type==='bruto') && has('fuego')) return 'fuego';
  if ((z.d.boss || z.type==='bruto' || (z.type==='casco'&&z.armor>0) || z.x < 330) && has('arco')) return 'arco';
  if (has('honda')) return 'honda';
  if (has('palo') && z.x < 520) return 'palo';
  return 'piedra';
}
function botThink(){
  if (G.state==='prep' && !G._placed) { G._placed=1; botStart(); }
  if (Math.random()<0.01) botReplace();
  if (G.player.cd>0 || G.t < (G._next||0)) return; // tiempo del gesto de arrastrar y soltar
  const zs = G.zombies.filter(z=>targetable(z)).sort((a,b)=>a.x-b.x);
  for (const z of zs) {
    const k = pickWeapon(z); G.player.weapon = k;
    const st = weaponStats(k);
    const v = autoAim(HAND.x, HAND.y, z, st.vmax*0.97, st.g, BOT.err, BOT.head);
    if (v) { throwWeapon(v.vx, v.vy); G._next = G.t + BOT.gest*(0.75+Math.random()*0.5); return; }
  }
}
function botMeta(){
  // fabrica hasta la capacidad y compra mejoras (prioridad simple)
  for (let i=0;i<40;i++){ let did=false; for (const k of AMMO_ORDER) if (ammoUnlocked(k) && (SAVE.stash[k]||0) < ammoCap(k) && canCraft(k)) { craft(k); did=true; } if(!did) break; }
  for(;;){
    const opts = UP_ORDER.filter(k=>upUnlocked(k) && up(k)<UPGRADES[k].max).map(k=>[k, UPGRADES[k].cost[up(k)] * ({fuerza:0.8,punteria:1.2,recarga:0.9,muralla:0.9,mochila:0.7}[k]||1)]).sort((a,b)=>a[1]-b[1]);
    const o = opts.find(([k]) => UPGRADES[k].cost[up(k)] <= SAVE.gears);
    if (!o) break;
    SAVE.gears -= UPGRADES[o[0]].cost[up(o[0])]; SAVE.up[o[0]] = up(o[0])+1; grantUnlocks();
  }
  SAVE.loadout = ['piedra'].concat(['molotov','fuego','arco','honda','palo'].filter(weaponUnlocked)).slice(0, loadoutSlots());
}
`, sb);

function play(L) {
  lastRes = null;
  vm.runInContext(`botMeta(); newGame('level', ${L}); G.stateT = 3;`, sb);
  let t = 0;
  const dt = 1 / 30;
  while (!lastRes && t < 900) { vm.runInContext(`botThink(); updateGame(${dt});`, sb); t += dt; }
  const g = vm.runInContext('({wall:G.wallHp/G.wallMax, thrown:G.thrown, hits:G.hits, heads:G.headshots, used:JSON.stringify(G.used)})', sb);
  return { ...(lastRes || { win: false }), t: Math.round(t), ...g };
}
const out = [];
for (let L = 1; L <= 10; L++) {
  let tries = 0, r;
  do { tries++; r = play(L); if (!r.win && L > 1) play(L - 1); } while (!r.win && tries < 8);
  const mats = vm.runInContext('JSON.stringify(SAVE.mats)', sb);
  out.push(`L${String(L).padStart(2)} ${r.win ? 'W' : 'F'} x${tries} *${r.stars || 0} wall=${(r.wall * 100) | 0}% t=${r.t}s acc=${r.thrown ? Math.round(r.hits / r.thrown * 100) : 0}% heads=${r.heads} used=${r.used} gears=${vm.runInContext('SAVE.gears', sb)} mats=${mats}`);
  if (!r.win) break;
}
console.log(out.join('\n'));
console.log('ups', vm.runInContext('JSON.stringify(SAVE.up)', sb), 'stash', vm.runInContext('JSON.stringify(SAVE.stash)', sb));
