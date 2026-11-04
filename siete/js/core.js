'use strict';
// Siete Vidas: reglas (sin dibujo ni red, para poder simular partidas). Solo el anfitrión tiene el estado completo;
// cada jugador recibe view(G, p), que oculta los platos que no conoce.
// Mesa de gatos con una pistola de agua: cada carga trae agua o está vacía. En tu turno te disparas o le pasas la pistola a otro.
// Quien la recibe dispara o la devuelve: devuelta, dispara quien la pasó y si traía agua moja el doble;
// pero si estaba vacía, el desconfiado pierde 1 vida y un objeto.
(function (root) {
  const LIVES = 4, MAX_TOOLS = 3;
  const TOOLS = {
    olfato: { name: 'Mirilla', icon: '🔎', desc: 'Mira en secreto la siguiente carga.', w: 5 },
    servilleta: { name: 'Paraguas', icon: '☂️', desc: 'Te cubre del próximo chorro.', w: 3 },
    cambio: { name: 'Girar tambor', icon: '🔀', desc: 'Cambia la siguiente carga por otra, al azar.', w: 4 },
    salsa: { name: 'Agua helada', icon: '🧊', desc: 'El próximo chorro quita 1 vida más.', w: 3 },
    robo: { name: 'Zarpazo', icon: '🐾', desc: 'Roba un objeto al azar a otro gato.', w: 3 },
    tirar: { name: 'Tiro al aire', icon: '💨', desc: 'Dispara la siguiente carga al aire y todos ven qué era.', w: 3 },
    sopa: { name: 'Toalla seca', icon: '🧺', desc: 'Te secas y recuperas 1 vida.', w: 2 },
    amuleto: { name: 'Séptima vida', icon: '🔔', desc: 'Si caes, vuelves con 1 vida. Funciona sola.', w: 1, passive: true },
  };
  const EVENTS = {
    apagon: { name: 'Apagón', icon: '🕯️', desc: 'Esta ronda nadie sabe cuántas cargas traen agua.' },
    doble: { name: 'Agua fría', icon: '🥶', desc: 'Esta ronda cada chorro quita 1 vida más.' },
    hambre: { name: 'Reparto', icon: '🎁', desc: 'Todos reciben un objeto extra.' },
    fantasma: { name: 'El fantasma habla', icon: '👻', desc: 'Una carga se revela a todos.' },
    inversion: { name: 'Manguera', icon: '🚿', desc: 'Hay más cargas con agua que vacías.' },
    corriente: { name: 'Corriente de aire', icon: '🌬️', desc: 'Cada gato pasa un objeto al de su izquierda.' },
  };
  const CHAT = ['Está vacía, confía 😺', 'Yo no dispararía…', 'Te lo juro', 'Mentiroso 👀', '¡Buena jugada!', 'Jajaja 😹', 'Uy…', 'Te voy a vengar'];

  function pickTool(R) {
    const k = Object.keys(TOOLS), tot = k.reduce((a, x) => a + TOOLS[x].w, 0); let v = R() * tot;
    for (const x of k) { v -= TOOLS[x].w; if (v <= 0) return x; } return k[0];
  }
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const alive = G => G.players.map((p, i) => i).filter(i => !G.players[i].out);
  const give = (G, p, R) => { if (G.players[p].tools.length < MAX_TOOLS) G.players[p].tools.push(pickTool(R)); };

  function create(players, R) {
    R = R || Math.random;
    const G = { players: players.map((p, i) => ({ name: p.name, cat: i, lives: LIVES, tools: [], shield: false, out: false })), round: 0, queue: [], idx: 0, know: players.map(() => new Set()), pub: new Set(),
      turn: Math.floor(R() * players.length), phase: 'choose', offer: null, event: null, dark: false, bonus: 0, spice: 0, seq: 0, last: null, winner: null };
    newRound(G, R); return G;
  }
  function newRound(G, R) {
    G.round++; const r = G.round, n = 4 + Math.min(r, 4); let bad = Math.max(1, Math.min(n - 1, Math.round(n * (0.32 + 0.05 * r))));
    G.event = null; G.dark = false; G.bonus = 0; G.spice = 0;
    if (r >= 2 && R() < 0.6) { const k = Object.keys(EVENTS); G.event = k[Math.floor(R() * k.length)]; }
    if (G.event === 'inversion') bad = Math.max(bad, Math.ceil(n * 0.6));
    G.queue = shuffle(Array.from({ length: n }, (_, i) => (i < bad ? 1 : 0)), R); G.idx = 0;
    G.know = G.players.map(() => new Set()); G.pub = new Set();
    const live = alive(G), spots = shuffle(Array.from({ length: n }, (_, i) => i), R);
    live.forEach((p, i) => { G.know[p].add(spots[i % n]); give(G, p, R); });                     // cada gato sabe en secreto un plato
    if (G.event === 'apagon') G.dark = true;
    if (G.event === 'doble') G.bonus = 1;
    if (G.event === 'hambre') live.forEach(p => give(G, p, R));
    if (G.event === 'fantasma') G.pub.add(Math.floor(R() * n));
    if (G.event === 'corriente') { const held = live.map(p => G.players[p].tools.pop()); live.forEach((p, i) => { const t = held[(i + live.length - 1) % live.length]; if (t) G.players[p].tools.push(t); }); }
    G.phase = 'choose'; G.offer = null;
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
  function after(G, R, keep) {
    G.phase = 'choose'; G.offer = null;
    const l = alive(G); if (l.length <= 1) { G.phase = 'over'; G.winner = l[0]; return; }
    if (!keep || G.players[G.turn].out) nextTurn(G);
    if (G.idx >= G.queue.length) newRound(G, R);
  }
  function eat(G, R, p, mult, from) {
    const bad = G.queue[G.idx], i = G.idx; G.idx++;
    const L = { type: 'eat', who: p, from, bad: !!bad, dish: i, seq: ++G.seq };
    if (bad) { Object.assign(L, hurt(G, p, (1 + G.bonus + G.spice) * mult)); G.spice = 0; }
    G.last = L; return !!bad;
  }

  // Aplica una acción del jugador p. Devuelve false si no es válida (los datos de la red no son de fiar).
  function act(G, p, a, R) {
    R = R || Math.random;
    if (!a || G.phase === 'over' || !G.players[p] || G.players[p].out) return false;
    if (G.phase === 'respond') {
      if (G.offer.to !== p) return false;
      const from = G.offer.from;
      if (a.t === 'accept') {
        const bad = eat(G, R, p, 1, from); if (!bad) give(G, p, R);
        after(G, R, false); return true;
      }
      if (a.t === 'return') {
        const bad = eat(G, R, from, 2, p); G.last.returned = true;
        if (!bad) { give(G, from, R); G.last.distrust = hurt(G, p, 1 + G.bonus); G.last.liar = p; const T = G.players[p].tools; if (T.length) T.splice(Math.floor(R() * T.length), 1); }      // desconfiar de un plato bueno cuesta 1 vida y un objeto
        after(G, R, false); return true;
      }
      return false;
    }
    if (G.turn !== p) return false;
    if (a.t === 'eat') { const bad = eat(G, R, p, 1, null); if (!bad) give(G, p, R); after(G, R, !bad); return true; }
    if (a.t === 'serve') {
      if (!Number.isInteger(a.to) || a.to === p || !G.players[a.to] || G.players[a.to].out) return false;
      G.offer = { from: p, to: a.to, claim: a.claim === 'malo' ? 'malo' : 'rico' }; G.phase = 'respond'; G.last = { type: 'serve', who: p, to: a.to, claim: G.offer.claim, seq: ++G.seq }; return true;
    }
    if (a.t === 'tool') {
      const P = G.players[p], i = P.tools.indexOf(a.k), T = TOOLS[a.k]; if (i < 0 || !T || T.passive) return false;
      const L = { type: 'tool', who: p, k: a.k, seq: ++G.seq };
      if (a.k === 'robo') { const v = G.players[a.to]; if (!v || a.to === p || v.out) return false; P.tools.splice(i, 1); if (v.tools.length) P.tools.push(v.tools.splice(Math.floor(R() * v.tools.length), 1)[0]); L.to = a.to; G.last = L; return true; }
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
    return { round: G.round, left: r.n, bad: G.dark ? null : r.bad, seen, turn: G.turn, phase: G.phase, offer: G.offer, event: G.event, bonus: G.bonus, spice: G.spice, winner: G.winner, last: G.last, me: p,
      players: G.players.map((x, i) => ({ name: x.name, cat: x.cat, lives: x.lives, out: x.out, shield: x.shield, n: x.tools.length, tools: i === p ? x.tools : null })) };
  }

  // Bots. style: 'lista' (la normal), 'comelona', 'sirve', 'devuelve', 'azar'. Devuelve la acción del jugador p.
  function bot(G, p, R, style) {
    R = R || Math.random; style = style || 'lista';
    const v = view(G, p), next = v.seen.find(s => s.i === 0), r = remaining(G), others = alive(G).filter(i => i !== p), P = G.players[p];
    const pBad = next ? (next.bad ? 1 : 0) : (v.bad === null ? 0.5 : (v.bad - v.seen.filter(s => s.bad).length) / Math.max(1, r.n - v.seen.length));
    const weak = () => others.slice().sort((a, b) => G.players[a].lives - G.players[b].lives)[0];
    const rnd = () => others[Math.floor(R() * others.length)];
    if (G.phase === 'respond') {
      if (style === 'comelona') return { t: 'accept' };
      if (style === 'devuelve') return { t: 'return' };
      if (style === 'azar') return { t: R() < 0.5 ? 'accept' : 'return' };
      if (style === 'sirve') return { t: pBad > 0.5 ? 'return' : 'accept' };
      if (next) return { t: next.bad ? 'return' : 'accept' };
      const server = G.players[G.offer.from];                                  // si devolver puede dejarlo fuera, tienta más
      return { t: R() < pBad * (server.lives <= 2 ? 0.95 : 0.6) ? 'return' : 'accept' };
    }
    if (style === 'lista') {
      const t = P.tools;
      if (t.includes('sopa') && P.lives <= 2) return { t: 'tool', k: 'sopa' };
      if (t.includes('servilleta') && !P.shield && P.lives <= 2) return { t: 'tool', k: 'servilleta' };
      if (!next && t.includes('olfato')) return { t: 'tool', k: 'olfato' };
      if (next && next.bad && t.includes('salsa') && R() < 0.6) return { t: 'tool', k: 'salsa' };
      if (t.includes('robo') && others.some(o => G.players[o].tools.length)) return { t: 'tool', k: 'robo', to: others.find(o => G.players[o].tools.length) };
      if (next && next.bad && t.includes('tirar') && P.lives <= 1) return { t: 'tool', k: 'tirar' };
      if (next) return next.bad ? { t: 'serve', to: weak(), claim: 'rico' } : R() < 0.7 ? { t: 'serve', to: weak(), claim: 'malo' } : { t: 'eat' };   // a veces sirve uno bueno como trampa
      return pBad < 0.34 ? { t: 'eat' } : { t: 'serve', to: R() < 0.6 ? weak() : rnd(), claim: 'rico' };
    }
    if (style === 'comelona') return { t: 'eat' };
    if (style === 'sirve') return { t: 'serve', to: weak(), claim: 'rico' };
    if (style === 'devuelve') return next && !next.bad ? { t: 'eat' } : { t: 'serve', to: rnd(), claim: 'rico' };
    return R() < 0.5 ? { t: 'eat' } : { t: 'serve', to: rnd(), claim: R() < 0.5 ? 'rico' : 'malo' };
  }

  const api = { LIVES, MAX_TOOLS, TOOLS, EVENTS, CHAT, create, act, view, bot, alive };
  if (typeof module !== 'undefined') module.exports = api; else root.SIETE = api;
})(typeof window !== 'undefined' ? window : globalThis);
