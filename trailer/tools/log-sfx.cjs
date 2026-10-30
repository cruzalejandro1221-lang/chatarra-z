// Corre las partidas del tráiler sin pantalla y anota cada sonido del juego con su tiempo global.
// uso: node tools/log-sfx.js  → escribe tools/sfx-events.json
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const noop = () => {};
const grad = () => ({ addColorStop: noop });
const ctxStub = new Proxy({}, { get: (t, p) => (p in t ? t[p] : (p === 'createLinearGradient' || p === 'createRadialGradient') ? grad : noop), set: (t, p, v) => { t[p] = v; return true; } });
const sb = { console, Math, JSON, Object, Array, Set, Proxy, document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub }), getElementById: () => null }, localStorage: { getItem: () => null, setItem: noop } };
sb.window = sb; vm.createContext(sb);
for (const f of ['util', 'data', 'save', 'art', 'art2', 'game']) vm.runInContext(fs.readFileSync(path.join(root, 'assets/game', f + '.js'), 'utf8'), sb, { filename: f });
for (const f of ['player', 'scenes']) vm.runInContext(fs.readFileSync(path.join(root, 'assets/trailer', f + '.js'), 'utf8'), sb, { filename: f });
const events = [];
sb.__rec = (name, args) => {
  const s = vm.runInContext('TR.cur', sb);
  if (!s) return;
  const t = s.t0 + s.steps / 60 - (s.pre || 0);
  if (t >= s.t0 && t < s.t1) events.push({ t: +t.toFixed(3), name, args });
};
vm.runInContext(`SFX = new Proxy({}, { get: (o, name) => (...args) => __rec(name, args) });`, sb);
const shots = vm.runInContext('TR.shots', sb);
for (let i = 0; i < shots.length; i++) vm.runInContext(`advanceTo(TR.shots[${i}], TR.shots[${i}].t1 - TR.shots[${i}].t0 + (TR.shots[${i}].pre || 0))`, sb);
events.sort((a, b) => a.t - b.t);
fs.writeFileSync(path.join(__dirname, 'sfx-events.json'), JSON.stringify(events));
const counts = {}; events.forEach(e => counts[e.name] = (counts[e.name] || 0) + 1);
console.log(events.length, 'events', JSON.stringify(counts));
