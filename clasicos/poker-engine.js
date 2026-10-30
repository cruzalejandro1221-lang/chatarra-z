'use strict';
// Póker: Texas Hold'em uno contra uno (heads-up, sin límite). Motor de reglas, evaluador de manos y bot de 3 niveles.
// Cartas: entero 0..51, rango = (c >> 2) + 2 (2..14, 14 = As), palo = c & 3 (0 ♠, 1 ♥, 2 ♦, 3 ♣).
(function (root) {
  const HAND_NAMES = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full house', 'Cuatro iguales', 'Escalera de color'];
  const BLINDS = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [500, 1000]];
  const HANDS_PER_LEVEL = 4;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function straightHigh(mask) {
    const m = mask | (((mask >> 14) & 1) << 1);
    for (let hi = 14; hi >= 5; hi--) { const need = 31 << (hi - 4); if ((m & need) === need) return hi; }
    return 0;
  }
  const pack = a => { let v = 0; for (let i = 0; i < 5; i++) v = (v << 4) | (a[i] || 0); return v; };
  // Puntuación de la mejor mano de 5 entre las cartas dadas (5 a 7). Mayor número = mejor mano.
  function evalHand(cs) {
    const rc = new Array(15).fill(0), sc = [0, 0, 0, 0], sm = [0, 0, 0, 0];
    for (let i = 0; i < cs.length; i++) { const c = cs[i], r = (c >> 2) + 2, s = c & 3; rc[r]++; sc[s]++; sm[s] |= 1 << r; }
    let all = 0, fs = -1;
    for (let r = 2; r <= 14; r++) if (rc[r]) all |= 1 << r;
    for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    if (fs >= 0) { const sf = straightHigh(sm[fs]); if (sf) return (8 << 20) | (sf << 16); }
    const quads = [], trips = [], pairs = [], singles = [];
    for (let r = 14; r >= 2; r--) { const n = rc[r]; if (n === 4) quads.push(r); else if (n === 3) trips.push(r); else if (n === 2) pairs.push(r); else if (n === 1) singles.push(r); }
    if (quads.length) { let k = 0; for (let r = 14; r >= 2; r--) if (rc[r] && r !== quads[0]) { k = r; break; } return (7 << 20) | pack([quads[0], k]); }
    if (trips.length && (trips.length > 1 || pairs.length)) { const p = trips.length > 1 ? Math.max(trips[1], pairs[0] || 0) : pairs[0]; return (6 << 20) | pack([trips[0], p]); }
    if (fs >= 0) { const rs = []; for (let r = 14; r >= 2; r--) if (sm[fs] & (1 << r)) rs.push(r); return (5 << 20) | pack(rs.slice(0, 5)); }
    const st = straightHigh(all);
    if (st) return (4 << 20) | (st << 16);
    if (trips.length) return (3 << 20) | pack([trips[0], singles[0], singles[1]]);
    if (pairs.length >= 2) return (2 << 20) | pack([pairs[0], pairs[1], Math.max(singles[0] || 0, pairs[2] || 0)]);
    if (pairs.length) return (1 << 20) | pack([pairs[0], singles[0], singles[1], singles[2]]);
    return pack(singles.slice(0, 5));
  }
  const handName = sc => { const c = sc >> 20; return c === 8 && ((sc >> 16) & 15) === 14 ? 'Escalera real' : HAND_NAMES[c]; };
  const shuffle = (a, rng) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  class Hold {
    constructor(o) {
      o = o || {};
      this.rng = o.rng || Math.random;
      this.startStack = o.stack || 1000;
      this.stack = [this.startStack, this.startStack];
      this.button = o.button === 1 ? 1 : 0;
      this.handNo = 0; this.matchOver = null; this.over = null; this.last = null;
      this.newHand(true);
    }
    blinds() { return BLINDS[Math.min(BLINDS.length - 1, Math.floor((Math.max(1, this.handNo) - 1) / HANDS_PER_LEVEL))]; }
    newHand(first) {
      if (this.stack[0] <= 0 || this.stack[1] <= 0) return false;
      this.handNo++;
      if (!first) this.button ^= 1;
      [this.sb, this.bb] = this.blinds();
      const deck = shuffle(Array.from({ length: 52 }, (_, i) => i), this.rng);
      this.deck = deck;
      this.hole = [[deck.pop(), deck.pop()], [deck.pop(), deck.pop()]];
      this.board = []; this.bet = [0, 0]; this.contrib = [0, 0];
      this.folded = [false, false]; this.allin = [false, false]; this.acted = [false, false];
      this.street = 0; this.over = null; this.last = null; this.lastRaise = this.bb;
      this._post(this.button, this.sb); this._post(this.button ^ 1, this.bb);
      this.cur = this.button;
      const x = this.allin[0] ? 0 : this.allin[1] ? 1 : -1;
      if (this.allin[0] && this.allin[1]) this._street();
      else if (x >= 0 && this.bet[x ^ 1] >= this.bet[x]) this._street();
      return true;
    }
    _post(p, amt) { const a = Math.min(amt, this.stack[p]); this.stack[p] -= a; this.bet[p] += a; this.contrib[p] += a; if (this.stack[p] === 0) this.allin[p] = true; }
    legal(p) {
      if (this.over || this.cur !== p) return null;
      const o = p ^ 1, mx = Math.max(this.bet[0], this.bet[1]), call = Math.min(this.stack[p], mx - this.bet[p]);
      const r = { fold: call > 0, check: call === 0, call, raise: null };
      if (!this.allin[o] && this.stack[p] > call) {
        const maxTo = this.bet[p] + this.stack[p];
        r.raise = { min: Math.min(maxTo, mx + this.lastRaise), max: maxTo };
      }
      return r;
    }
    act(p, a, amt) {
      const L = this.legal(p);
      if (!L) return false;
      const o = p ^ 1;
      if (a === 'fold') { if (!L.fold) return false; this.folded[p] = true; this.last = { p, a }; this._endFold(o); return true; }
      if (a === 'check') { if (!L.check) return false; this.acted[p] = true; this.last = { p, a }; }
      else if (a === 'call') { if (!L.call) return false; this._pay(p, L.call); this.acted[p] = true; this.last = { p, a, amt: L.call, allin: this.allin[p] }; }
      else if (a === 'raise') {
        if (!L.raise) return false;
        let to = Math.round(+amt);
        if (!isFinite(to)) return false;
        to = clamp(to, L.raise.min, L.raise.max);
        const mx = Math.max(this.bet[0], this.bet[1]), inc = to - mx;
        this._pay(p, to - this.bet[p]);
        if (inc >= this.lastRaise) this.lastRaise = inc;
        this.acted[p] = true; this.acted[o] = false;
        this.last = { p, a, amt: to, allin: this.allin[p] };
      } else return false;
      this._advance(p);
      return true;
    }
    _pay(p, n) { this.stack[p] -= n; this.bet[p] += n; this.contrib[p] += n; if (this.stack[p] === 0) this.allin[p] = true; }
    _advance(p) {
      const o = p ^ 1;
      let done = false;
      if (this.allin[0] && this.allin[1]) done = true;
      else if (this.allin[p] || this.allin[o]) { const x = this.allin[p] ? p : o; if (this.bet[x ^ 1] >= this.bet[x]) done = true; }
      else if (this.bet[0] === this.bet[1] && this.acted[0] && this.acted[1]) done = true;
      if (done) this._street(); else this.cur = o;
    }
    _street() {
      const e = this.bet[0] - this.bet[1];
      if (e > 0) { this.stack[0] += e; this.contrib[0] -= e; } else if (e < 0) { this.stack[1] -= e; this.contrib[1] += e; }
      this.bet = [0, 0]; this.acted = [false, false]; this.lastRaise = this.bb;
      if (this.allin[0] || this.allin[1]) { while (this.board.length < 5) this.board.push(this.deck.pop()); this.street = 4; this._showdown(); return; }
      if (this.street === 3) { this.street = 4; this._showdown(); return; }
      this.street++;
      const n = this.street === 1 ? 3 : 1;
      for (let i = 0; i < n; i++) this.board.push(this.deck.pop());
      this.cur = this.button ^ 1;
    }
    _showdown() {
      const sc = [evalHand(this.hole[0].concat(this.board)), evalHand(this.hole[1].concat(this.board))];
      const pot = this.contrib[0] + this.contrib[1];
      let winner = null;
      if (sc[0] > sc[1]) { winner = 0; this.stack[0] += pot; }
      else if (sc[1] > sc[0]) { winner = 1; this.stack[1] += pot; }
      else { const h = Math.floor(pot / 2); this.stack[0] += h; this.stack[1] += h; if (pot - 2 * h) this.stack[this.button ^ 1] += pot - 2 * h; }
      this._finish({ winner, reason: 'showdown', pot, scores: sc });
    }
    _endFold(w) { const pot = this.contrib[0] + this.contrib[1]; this.stack[w] += pot; this._finish({ winner: w, reason: 'fold', pot }); }
    _finish(o) {
      this.over = o;
      this.matchOver = this.stack[0] <= 0 ? 1 : this.stack[1] <= 0 ? 0 : null;
    }
    // Vista para el jugador p (sin las cartas ocultas del rival).
    view(p) {
      const o = p ^ 1, ov = this.over, show = !!ov && ov.reason === 'showdown';
      const rel = i => (i === null ? null : i === p ? 'you' : 'opp');
      return {
        hand: this.handNo, blinds: [this.sb, this.bb], button: rel(this.button), street: this.street, board: this.board.slice(),
        pot: this.contrib[0] + this.contrib[1], stack: [this.stack[p], this.stack[o]], bet: [this.bet[p], this.bet[o]],
        hole: this.hole[p].slice(), oppHole: show ? this.hole[o].slice() : null,
        folded: [this.folded[p], this.folded[o]], allin: [this.allin[p], this.allin[o]],
        cur: ov ? null : rel(this.cur), legal: this.legal(p),
        last: this.last ? { who: rel(this.last.p), a: this.last.a, amt: this.last.amt, allin: !!this.last.allin } : null,
        over: ov ? { winner: rel(ov.winner), reason: ov.reason, pot: ov.pot, you: ov.scores ? handName(ov.scores[p]) : '', opp: ov.scores ? handName(ov.scores[o]) : '' } : null,
        matchOver: rel(this.matchOver),
      };
    }
  }

  // ---------------------------------------------------------------- bot
  // Fuerza de salida de dos cartas (fórmula de Chen normalizada a 0..1): sirve para suponer qué manos apuesta un rival.
  function pref(c1, c2) {
    let r1 = (c1 >> 2) + 2, r2 = (c2 >> 2) + 2;
    if (r1 < r2) { const t = r1; r1 = r2; r2 = t; }
    const pts = r => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
    let sc = pts(r1);
    if (r1 === r2) sc = Math.max(5, sc * 2);
    else {
      if ((c1 & 3) === (c2 & 3)) sc += 2;
      const gap = r1 - r2 - 1;
      sc -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
      if (gap <= 1 && r1 < 12) sc += 1;
    }
    return Math.max(0.02, (sc + 1) / 21);
  }
  // Probabilidad de ganar contra una mano rival al azar (alpha = 0) o contra un rango más fuerte (alpha > 0) simulando el resto de cartas.
  function equity(hole, board, sims, rng, alpha) {
    const known = new Set(hole.concat(board)), deck = [];
    for (let c = 0; c < 52; c++) if (!known.has(c)) deck.push(c);
    const need = 5 - board.length, k = 2 + need, n = deck.length;
    let win = 0, done = 0;
    for (let tries = 0; done < sims && tries < sims * 12; tries++) {
      for (let i = 0; i < k; i++) { const j = i + Math.floor(rng() * (n - i)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      if (alpha > 0 && rng() > Math.pow(pref(deck[0], deck[1]), alpha)) continue;
      const full = board.concat(deck.slice(2, k));
      const a = evalHand(hole.concat(full)), b = evalHand([deck[0], deck[1]].concat(full));
      win += a > b ? 1 : a === b ? 0.5 : 0; done++;
    }
    return done ? win / done : 0.5;
  }
  const BOT = [
    { sims: 40, noise: 0.14 },
    { sims: 160, noise: 0.05 },
    { sims: 450, noise: 0 },
  ];
  // Decide la jugada del jugador p. level: 0 fácil, 1 medio, 2 difícil. mem = { agg } (agresividad observada del rival, 0..1).
  function botDecide(g, p, level, mem, simsOverride) {
    const L = g.legal(p);
    if (!L) return null;
    const rng = g.rng, cfg = BOT[level] || BOT[1];
    const hole = g.hole[p], pot = g.contrib[0] + g.contrib[1], call = L.call, odds = call > 0 ? call / (pot + call) : 0;
    const mx = Math.max(g.bet[0], g.bet[1]), inPos = g.button === p, pre = g.street === 0;
    // Si el rival apuesta, su rango es más fuerte que una mano al azar: más cuanto mayor la apuesta.
    const tight = call > 0 ? Math.min(1, call / Math.max(1, pot - call)) : 0;
    const alpha = call > 0 ? [0, 0.3 + 1.0 * tight, 0.6 + 2.2 * tight][level] : 0;
    let eq = equity(hole, g.board, simsOverride || cfg.sims, rng, alpha);
    eq = clamp(eq + (rng() * 2 - 1) * cfg.noise, 0, 1);
    const R = f => {
      if (!L.raise) return null;
      let to = Math.round((mx + f * (pot + call)) / g.sb) * g.sb;
      return { a: 'raise', amt: clamp(to, L.raise.min, L.raise.max) };
    };
    const pass = () => (L.check ? { a: 'check' } : { a: 'fold' });
    const take = () => (L.call ? { a: 'call' } : { a: 'check' });
    const agg = mem && mem.agg !== undefined ? mem.agg : 0.3;

    if (level === 0) {
      if (call === 0) {
        if (eq > 0.72 && rng() < 0.45) return R(0.5) || { a: 'check' };
        return { a: 'check' };
      }
      if (eq > 0.9 && rng() < 0.3) return R(0.6) || take();
      let ok = eq > odds * 0.75;
      if (rng() < 0.1) ok = !ok;
      return ok ? take() : pass();
    }
    if (level === 1) {
      if (call === 0) {
        if (eq > 0.82) return R(0.9) || { a: 'check' };
        if (eq > (pre ? 0.55 : 0.64)) return R(0.55 + rng() * 0.25) || { a: 'check' };
        if (!pre && g.street < 3 && eq < 0.45 && rng() < 0.08) return R(0.5) || { a: 'check' };
        return { a: 'check' };
      }
      const big = call > g.stack[p] * 0.5;
      if (eq > 0.8 && rng() < 0.6) return R(0.8) || take();
      if (eq > odds + (big ? 0.12 : 0.04)) return take();
      return pass();
    }
    // difícil
    const foldRate = mem && mem.fold !== undefined ? mem.fold : 0.35;   // con qué frecuencia el rival se retira ante una apuesta
    const wantsBluff = !pre && L.check && rng() < (g.street === 3 ? 0.12 : 0.2) * clamp(foldRate / 0.35, 0.05, 1.8);
    if (call === 0) {
      if (eq > 0.88 && !inPos && rng() < 0.25) return { a: 'check' };             // trampa
      if (eq > 0.8) return R(0.75 + rng() * 0.35) || { a: 'check' };
      if (eq > (pre ? 0.47 : 0.58)) return R((pre ? 0.9 : 0.55) + rng() * 0.25) || { a: 'check' };
      if (!pre && eq < (g.street === 3 ? 0.3 : 0.45) && wantsBluff && (inPos || rng() < 0.5)) return R(0.55 + rng() * 0.2) || { a: 'check' };
      return { a: 'check' };
    }
    const need = odds + 0.01 - (agg > 0.45 ? 0.05 : agg < 0.2 ? -0.03 : 0);
    if (eq > 0.88 && (call > g.stack[p] * 0.3 || rng() < 0.25) && L.raise) return { a: 'raise', amt: L.raise.max };
    if (eq > 0.72) return R(0.8) || take();
    if (eq > need) return take();
    if (!pre && call < pot * 0.4 && rng() < 0.07 && L.raise) return R(2.2) || pass();   // farol de resubida ocasional
    return pass();
  }
  // Aprende del rival a partir de sus acciones: agresividad (mem.agg) y frecuencia con que se retira ante apuestas (mem.fold).
  function trackOpp(mem, a, facing) {
    mem.n = (mem.n || 0) + 1; if (a === 'raise') mem.r = (mem.r || 0) + 1;
    if (facing) { mem.fb = (mem.fb || 0) + 1; if (a === 'fold') mem.f = (mem.f || 0) + 1; }
    mem.agg = Math.min(1, ((mem.r || 0) + 0.6) / (mem.n + 2));
    mem.fold = ((mem.f || 0) + 1) / ((mem.fb || 0) + 3);
  }

  const api = { Hold, evalHand, handName, equity, pref, botDecide, trackOpp, BLINDS, HAND_NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Poker = api;
})(typeof self !== 'undefined' ? self : this);
