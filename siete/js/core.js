'use strict';
// Siete Vidas: reglas (sin dibujo ni red, para poder simular partidas). Solo el anfitrión tiene el estado completo;
// cada jugador recibe view(G, p), que oculta las cargas que no conoce.
// Regla Contragolpe: nadie se dispara a sí mismo. En tu turno eliges a un gato y disparas: si la carga trae agua lo mojas,
// si está vacía la pistola te revienta y te mojas tú. O abres la caja sorpresa (2 por ronda) en vez de disparar.
(function (root) {
  const LIVES = 4, MAX_TOOLS = 3, BOXES = 2;
  const TOOLS = {
    olfato: { name: 'Mirilla', icon: '🔎', desc: 'Ves la siguiente carga', w: 5 },
    servilleta: { name: 'Paraguas', icon: '☂️', desc: 'Te cubre de un chorro', w: 3 },
    cambio: { name: 'Girar tambor', icon: '🔀', desc: 'Cambia la siguiente carga', w: 4 },
    salsa: { name: 'Agua helada', icon: '🧊', desc: 'El próximo chorro moja más', w: 3 },
    robo: { name: 'Zarpazo', icon: '🐾', desc: 'Robas un objeto', w: 3 },
    tirar: { name: 'Tiro al aire', icon: '💨', desc: 'Gastas la carga sin riesgo', w: 3 },
    sopa: { name: 'Toalla seca', icon: '🧺', desc: 'Recuperas 1 vida', w: 2 },
    amuleto: { name: 'Séptima vida', icon: '🔔', desc: 'Si caes, vuelves con 1 vida', w: 1, passive: true },
  };
  const EVENTS = {
    apagon: { name: 'Apagón', icon: '🕯️', desc: 'Nadie sabe cuántas cargas traen agua' },
    doble: { name: 'Agua fría', icon: '🥶', desc: 'Cada chorro quita 1 vida más' },
    hambre: { name: 'Reparto', icon: '🎁', desc: 'Todos sacan un objeto extra' },
    fantasma: { name: 'Fantasma', icon: '👻', desc: 'Una carga se revela a todos' },
    inversion: { name: 'Manguera', icon: '🚿', desc: 'Hay más cargas con agua' },
    corriente: { name: 'Corriente', icon: '🌬️', desc: 'Cada gato pasa un objeto' },
  };
  const CHAT = ['😺', '😹', '😾', '👀', '💦', 'Te voy a mojar', '¡Buena!', 'Uy…'];

  function pickTool(R) {
    const k = Object.keys(TOOLS), tot = k.reduce((a, x) => a + TOOLS[x].w, 0); let v = R() * tot;
    for (const x of k) { v -= TOOLS[x].w; if (v <= 0) return x; } return k[0];
  }
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const alive = G => G.players.map((p, i) => i).filter(i => !G.players[i].out);
  const give = (G, p, R) => { if (G.players[p].tools.length >= MAX_TOOLS) return null; const t = pickTool(R); G.players[p].tools.push(t); return t; };

  function create(players, R) {
    R = R || Math.random;
    const G = { players: players.map((p, i) => ({ name: p.name, cat: i, lives: LIVES, tools: [], shield: false, out: false })), round: 0, queue: [], idx: 0, know: players.map(() => new Set()), pub: new Set(),
      turn: Math.floor(R() * players.length), phase: 'choose', event: null, dark: false, bonus: 0, spice: 0, seq: 0, last: null, winner: null, boxes: [], gain: [] };
    newRound(G, R); return G;
  }
  function newRound(G, R) {
    G.round++; const r = G.round, n = 4 + Math.min(r, 4); let bad = Math.max(1, Math.min(n - 1, Math.round(n * (0.42 + 0.05 * r))));
    G.event = null; G.dark = false; G.bonus = 0; G.spice = 0;
    if (r >= 2 && R() < 0.6) { const k = Object.keys(EVENTS); G.event = k[Math.floor(R() * k.length)]; }
    if (G.event === 'inversion') bad = Math.max(bad, Math.ceil(n * 0.7));
    G.queue = shuffle(Array.from({ length: n }, (_, i) => (i < bad ? 1 : 0)), R); G.idx = 0;
    G.know = G.players.map(() => new Set()); G.pub = new Set(); G.boxes = G.players.map(() => BOXES); G.gain = G.players.map(() => []);
    const live = alive(G), spots = shuffle(Array.from({ length: n }, (_, i) => i), R);
    const box = p => { const t = give(G, p, R); if (t) G.gain[p].push(t); };
    live.forEach((p, i) => { G.know[p].add(spots[i % n]); box(p); });                            // cada gato conoce en secreto una carga
    if (G.event === 'apagon') G.dark = true;
    if (G.event === 'doble') G.bonus = 1;
    if (G.event === 'hambre') live.forEach(box);
    if (G.event === 'fantasma') G.pub.add(Math.floor(R() * n));
    if (G.event === 'corriente') { const held = live.map(p => G.players[p].tools.pop()); live.forEach((p, i) => { const t = held[(i + live.length - 1) % live.length]; if (t) G.players[p].tools.push(t); }); }
    G.phase = 'choose';
  }
  function hurt(G, p, n) {
    const P = G.players[p];
    if (P.shield) { P.shield = false; return { blocked: true, dmg: 0 }; }
    P.lives -= n; const ev = { dmg: n };
    if (P.lives <= 0) {
      const a = P.tools.indexOf('amuleto');
      if (a >= 0) { P.tools.splice(a, 1); P.lives = 1; ev.saved = true; } else { P.lives = 0; P.out = true; ev.out = true; }
    }
    return ev;
  }
  function nextTurn(G) { const l = alive(G); let t = G.turn; do { t = (t + 1) % G.players.length; } while (!l.includes(t)); G.turn = t; }
  function after(G, R) {
    const l = alive(G); if (l.length <= 1) { G.phase = 'over'; G.winner = l[0]; return; }
    nextTurn(G);
    if (G.idx >= G.queue.length) newRound(G, R);
  }
  // Aplica una acción del jugador p. Devuelve false si no es válida (los datos de la red no son de fiar).
  function act(G, p, a, R) {
    R = R || Math.random;
    if (!a || G.phase === 'over' || G.turn !== p || !G.players[p] || G.players[p].out) return false;
    if (a.t === 'shoot') {
      const to = a.to; if (!Number.isInteger(to) || to === p || !G.players[to] || G.players[to].out) return false;
      const bad = !!G.queue[G.idx]; G.idx++;
      const L = { type: 'shot', who: p, to, bad, hit: bad ? to : p, seq: ++G.seq };
      Object.assign(L, hurt(G, L.hit, bad ? 1 + G.bonus + G.spice : 1)); if (bad) G.spice = 0;
      G.last = L; after(G, R); return true;
    }
    if (a.t === 'box') {
      if (G.boxes[p] <= 0 || G.players[p].tools.length >= MAX_TOOLS) return false;
      G.boxes[p]--; G.last = { type: 'box', who: p, k: give(G, p, R), seq: ++G.seq }; after(G, R); return true;
    }
    if (a.t === 'tool') {
      const P = G.players[p], i = P.tools.indexOf(a.k), T = TOOLS[a.k]; if (i < 0 || !T || T.passive) return false;
      const L = { type: 'tool', who: p, k: a.k, seq: ++G.seq };
      if (a.k === 'robo') { const v = G.players[a.to]; if (!v || a.to === p || v.out || !v.tools.length) return false; P.tools.splice(i, 1); P.tools.push(v.tools.splice(Math.floor(R() * v.tools.length), 1)[0]); L.to = a.to; G.last = L; return true; }
      if (a.k === 'sopa' && P.lives >= LIVES) return false;
      P.tools.splice(i, 1);
      if (a.k === 'olfato') G.know[p].add(G.idx);
      else if (a.k === 'servilleta') P.shield = true;
      else if (a.k === 'salsa') G.spice = 1;
      else if (a.k === 'sopa') P.lives++;
      else if (a.k === 'cambio') {
        const left = G.queue.length - G.idx - 1;
        if (left > 0) { const j = G.idx + 1 + Math.floor(R() * left); [G.queue[G.idx], G.queue[j]] = [G.queue[j], G.queue[G.idx]]; for (const s of G.know) { s.delete(G.idx); s.delete(j); } G.pub.delete(G.idx); G.pub.delete(j); }
      } else if (a.k === 'tirar') { L.bad = !!G.queue[G.idx]; G.idx++; G.last = L; if (G.idx >= G.queue.length) newRound(G, R); return true; }
      G.last = L; return true;
    }
    return false;
  }
  const remaining = G => { const q = G.queue.slice(G.idx); return { n: q.length, bad: q.filter(Boolean).length }; };
  function view(G, p) {
    const r = remaining(G), seen = [];
    for (let i = G.idx; i < G.queue.length; i++) if (G.pub.has(i) || (G.know[p] && G.know[p].has(i))) seen.push({ i: i - G.idx, bad: !!G.queue[i], pub: G.pub.has(i) });
    return { round: G.round, left: r.n, bad: G.dark ? null : r.bad, seen, gain: G.gain, boxes: G.boxes[p], turn: G.turn, phase: G.phase, event: G.event, bonus: G.bonus, spice: G.spice, winner: G.winner, last: G.last, me: p,
      players: G.players.map(x => ({ name: x.name, cat: x.cat, lives: x.lives, out: x.out, shield: x.shield, tools: x.tools.slice() })) };
  }

  // Bots. style: 'lista' (la normal), 'dispara', 'caja', 'azar'. Devuelve la acción del jugador p.
  function bot(G, p, R, style) {
    R = R || Math.random; style = style || 'lista';
    const v = view(G, p), next = v.seen.find(s => s.i === 0), others = alive(G).filter(i => i !== p), P = G.players[p], t = P.tools;
    const unk = v.left - v.seen.length, kBad = v.seen.filter(s => s.bad).length;
    const pBad = next ? (next.bad ? 1 : 0) : v.bad === null ? 0.55 : unk > 0 ? Math.max(0, v.bad - kBad) / unk : 0;
    const weak = others.slice().sort((a, b) => G.players[a].lives - G.players[b].lives)[0], rnd = others[Math.floor(R() * others.length)];
    const canBox = G.boxes[p] > 0 && t.length < MAX_TOOLS, shoot = to => ({ t: 'shoot', to });
    if (style === 'dispara') return shoot(weak);
    if (style === 'caja') return canBox ? { t: 'box' } : shoot(rnd);
    if (style === 'azar') return canBox && R() < 0.4 ? { t: 'box' } : shoot(rnd);
    if (t.includes('sopa') && P.lives <= 2) return { t: 'tool', k: 'sopa' };
    if (!next && t.includes('olfato')) return { t: 'tool', k: 'olfato' };
    if (t.includes('robo') && P.tools.length < MAX_TOOLS) { const o = others.find(x => G.players[x].tools.length); if (o !== undefined) return { t: 'tool', k: 'robo', to: o }; }
    if (pBad >= 0.55) { if (next && t.includes('salsa') && R() < 0.7) return { t: 'tool', k: 'salsa' }; return shoot(weak); }
    if (next && !next.bad && t.includes('tirar')) return { t: 'tool', k: 'tirar' };
    if (next && !next.bad && t.includes('cambio')) return { t: 'tool', k: 'cambio' };
    if (t.includes('servilleta') && !P.shield && !canBox) return { t: 'tool', k: 'servilleta' };
    return canBox ? { t: 'box' } : shoot(weak);
  }

  const api = { LIVES, MAX_TOOLS, BOXES, TOOLS, EVENTS, CHAT, create, act, view, bot, alive };
  if (typeof module !== 'undefined') module.exports = api; else root.SIETE = api;
})(typeof window !== 'undefined' ? window : globalThis);
