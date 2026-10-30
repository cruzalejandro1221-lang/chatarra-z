'use strict';
// Motor de ajedrez: reglas completas (enroque, al paso, coronación, jaque mate, tablas) y búsqueda para el bot.
// Funciona en el hilo principal y dentro de un Worker (chess-worker.js). Tablero 0x88: casilla = fila*16 + columna.
(function (root) {
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const KN = [-33, -31, -18, -14, 14, 18, 31, 33], KG = [-17, -16, -15, -1, 1, 15, 16, 17];
  const BD = [-17, -15, 15, 17], RD = [-16, -1, 1, 16], QD = BD.concat(RD);
  const CRM = new Int8Array(128).fill(15);
  CRM[0] = 13; CRM[7] = 14; CRM[4] = 12; CRM[112] = 7; CRM[119] = 11; CRM[116] = 3;
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const VAL = [0, 100, 320, 330, 500, 900, 0];
  const PST = {
    1: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    4: [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5, -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    6: [20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30],
  };
  const KEND = [-50, -30, -30, -30, -30, -30, -30, -50, -30, -30, 0, 0, 0, 0, -30, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -20, -10, 0, 0, -10, -20, -30, -50, -40, -30, -20, -20, -30, -40, -50];

  const mk = (f, t, p, fl) => f | (t << 7) | (p << 14) | (fl << 17);
  const dec = m => ({ from: m & 127, to: (m >> 7) & 127, promo: (m >> 14) & 7, flags: m >> 17 });
  const sqName = s => String.fromCharCode(97 + (s & 7)) + ((s >> 4) + 1);
  const sqFrom = n => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16;
  const PCH = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
  const uci = m => { const d = dec(m); return sqName(d.from) + sqName(d.to) + (d.promo ? PCH[d.promo] : ''); };

  class Game {
    constructor(fen) { this.b = new Int8Array(128); this.ks = [4, 116]; this.hist = []; this.keys = []; this.load(fen || START); }
    load(fen) {
      const [pos, turn, cas, ep, half, full] = fen.split(' ');
      this.b.fill(0); let r = 7, f = 0;
      for (const ch of pos) {
        if (ch === '/') { r--; f = 0; } else if (ch >= '0' && ch <= '9') f += +ch;
        else { const col = ch === ch.toUpperCase() ? 0 : 1, t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1, sq = r * 16 + f; this.b[sq] = t | (col << 3); if (t === K) this.ks[col] = sq; f++; }
      }
      this.turn = turn === 'b' ? 1 : 0; this.cr = 0;
      if (cas.includes('K')) this.cr |= 1; if (cas.includes('Q')) this.cr |= 2; if (cas.includes('k')) this.cr |= 4; if (cas.includes('q')) this.cr |= 8;
      this.ep = !ep || ep === '-' ? -1 : sqFrom(ep);
      this.half = +half || 0; this.full = +full || 1; this.hist = []; this.keys = [this.key()];
    }
    key() {
      let k = '';
      for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } k += this.b[s].toString(16); }
      return k + this.turn + this.cr + this.ep;
    }
    att(sq, by) {
      const b = this.b, c = by << 3;
      if (by === 0) { if (b[sq - 15] === (P | c) && !((sq - 15) & 0x88)) return true; if (b[sq - 17] === (P | c) && !((sq - 17) & 0x88)) return true; }
      else { if (b[sq + 15] === (P | c) && !((sq + 15) & 0x88)) return true; if (b[sq + 17] === (P | c) && !((sq + 17) & 0x88)) return true; }
      for (let i = 0; i < 8; i++) { let t = sq + KN[i]; if (!(t & 0x88) && b[t] === (N | c)) return true; t = sq + KG[i]; if (!(t & 0x88) && b[t] === (K | c)) return true; }
      for (let i = 0; i < 4; i++) {
        let d = BD[i], t = sq + d;
        while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (B | c) || p === (Q | c)) return true; break; } t += d; }
        d = RD[i]; t = sq + d;
        while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (R | c) || p === (Q | c)) return true; break; } t += d; }
      }
      return false;
    }
    inCheck() { return this.att(this.ks[this.turn], this.turn ^ 1); }
    gen(caps) {
      const b = this.b, side = this.turn, enemy = side ^ 1, mv = [];
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s];
        if (!p || (p >> 3) !== side) continue;
        const t = p & 7;
        if (t === P) {
          const dir = side === 0 ? 16 : -16, rk = s >> 4, promoRk = side === 0 ? 6 : 1, startRk = side === 0 ? 1 : 6;
          let to = s + dir;
          if (!b[to]) {
            if (rk === promoRk) { mv.push(mk(s, to, 5, 0), mk(s, to, 4, 0), mk(s, to, 3, 0), mk(s, to, 2, 0)); }
            else if (!caps) { mv.push(mk(s, to, 0, 0)); if (rk === startRk && !b[to + dir]) mv.push(mk(s, to + dir, 0, 16)); }
          }
          for (let k = -1; k <= 1; k += 2) {
            to = s + dir + k;
            if (to & 0x88) continue;
            const q = b[to];
            if (q && (q >> 3) === enemy) {
              if (rk === promoRk) mv.push(mk(s, to, 5, 1), mk(s, to, 4, 1), mk(s, to, 3, 1), mk(s, to, 2, 1)); else mv.push(mk(s, to, 0, 1));
            } else if (!q && to === this.ep) mv.push(mk(s, to, 0, 3));
          }
        } else if (t === N || t === K) {
          const dirs = t === N ? KN : KG;
          for (let i = 0; i < 8; i++) {
            const to = s + dirs[i];
            if (to & 0x88) continue;
            const q = b[to];
            if (!q) { if (!caps) mv.push(mk(s, to, 0, 0)); } else if ((q >> 3) === enemy) mv.push(mk(s, to, 0, 1));
          }
        } else {
          const dirs = t === B ? BD : t === R ? RD : QD;
          for (let i = 0; i < dirs.length; i++) {
            const d = dirs[i]; let to = s + d;
            while (!(to & 0x88)) {
              const q = b[to];
              if (!q) { if (!caps) mv.push(mk(s, to, 0, 0)); } else { if ((q >> 3) === enemy) mv.push(mk(s, to, 0, 1)); break; }
              to += d;
            }
          }
        }
      }
      if (!caps) {
        if (side === 0) {
          if ((this.cr & 1) && !b[5] && !b[6] && !this.att(4, 1) && !this.att(5, 1) && !this.att(6, 1)) mv.push(mk(4, 6, 0, 4));
          if ((this.cr & 2) && !b[3] && !b[2] && !b[1] && !this.att(4, 1) && !this.att(3, 1) && !this.att(2, 1)) mv.push(mk(4, 2, 0, 8));
        } else {
          if ((this.cr & 4) && !b[117] && !b[118] && !this.att(116, 0) && !this.att(117, 0) && !this.att(118, 0)) mv.push(mk(116, 118, 0, 4));
          if ((this.cr & 8) && !b[115] && !b[114] && !b[113] && !this.att(116, 0) && !this.att(115, 0) && !this.att(114, 0)) mv.push(mk(116, 114, 0, 8));
        }
      }
      return mv;
    }
    make(m) {
      const b = this.b, from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, fl = m >> 17, side = this.turn, p = b[from];
      const u = { m, cap: b[to], cr: this.cr, ep: this.ep, half: this.half };
      this.hist.push(u);
      b[to] = p; b[from] = 0;
      if (fl & 2) { const cs = to + (side === 0 ? -16 : 16); u.cap = b[cs]; b[cs] = 0; }
      if (promo) b[to] = promo | (side << 3);
      if (fl & 4) { b[to - 1] = b[to + 1]; b[to + 1] = 0; }
      if (fl & 8) { b[to + 1] = b[to - 2]; b[to - 2] = 0; }
      if ((p & 7) === K) this.ks[side] = to;
      this.cr &= CRM[from] & CRM[to];
      this.ep = (fl & 16) ? (from + to) >> 1 : -1;
      this.half = ((p & 7) === P || u.cap) ? 0 : this.half + 1;
      if (side === 1) this.full++;
      this.turn ^= 1;
      if (this.att(this.ks[side], side ^ 1)) { this.unmake(); return false; }
      return true;
    }
    unmake() {
      const u = this.hist.pop(), b = this.b, m = u.m, from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, fl = m >> 17;
      this.turn ^= 1;
      const side = this.turn;
      let p = b[to];
      if (promo) p = P | (side << 3);
      b[from] = p;
      if (fl & 2) { b[to] = 0; b[to + (side === 0 ? -16 : 16)] = u.cap; } else b[to] = u.cap;
      if (fl & 4) { b[to + 1] = b[to - 1]; b[to - 1] = 0; }
      if (fl & 8) { b[to - 2] = b[to + 1]; b[to + 1] = 0; }
      if ((p & 7) === K) this.ks[side] = from;
      this.cr = u.cr; this.ep = u.ep; this.half = u.half;
      if (side === 1) this.full--;
    }
    legalMoves() {
      const out = [];
      for (const m of this.gen(false)) { if (this.make(m)) { out.push(m); this.unmake(); } }
      return out;
    }
    play(m) {
      if (!this.make(m)) return false;
      this.keys.push(this.key());
      return true;
    }
    playUCI(s) {
      const f = sqFrom(s.slice(0, 2)), t = sqFrom(s.slice(2, 4)), pr = s[4] ? PCH.indexOf(s[4]) : 0;
      for (const m of this.legalMoves()) { const d = dec(m); if (d.from === f && d.to === t && d.promo === pr) { return this.play(m) ? m : 0; } }
      return 0;
    }
    pieceAt(s) { return this.b[s]; }
    insufficient() {
      let minors = 0;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const t = this.b[s] & 7;
        if (t === P || t === R || t === Q) return false;
        if (t === N || t === B) minors++;
      }
      return minors <= 1;
    }
    status() {
      const check = this.inCheck(), has = this.legalMoves().length > 0;
      if (!has) return check ? { over: true, why: 'mate', winner: this.turn ^ 1, check } : { over: true, why: 'ahogado', winner: null, check };
      if (this.insufficient()) return { over: true, why: 'material', winner: null, check };
      if (this.half >= 100) return { over: true, why: '50', winner: null, check };
      const k = this.keys[this.keys.length - 1]; let n = 0;
      for (const x of this.keys) if (x === k) n++;
      if (n >= 3) return { over: true, why: 'repeticion', winner: null, check };
      return { over: false, check };
    }
    evaluate() {
      const b = this.b; let sc = 0, mat = 0;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if (!p) continue;
        const t = p & 7; if (t !== K && t !== P) mat += VAL[t];
      }
      const end = mat < 2600;
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if (!p) continue;
        const t = p & 7, white = !(p & 8), idx = white ? (s >> 4) * 8 + (s & 7) : (7 - (s >> 4)) * 8 + (s & 7);
        const v = VAL[t] + (t === K && end ? KEND[idx] : PST[t][idx]);
        sc += white ? v : -v;
      }
      return this.turn === 0 ? sc : -sc;
    }
  }

  // ---------------------------------------------------------------- búsqueda
  const INF = 1e6, MATE = 100000;
  let nodes = 0, deadline = 0, stop = false;
  function order(g, moves) {
    const b = g.b, sc = new Array(moves.length);
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i], to = (m >> 7) & 127, from = m & 127, promo = (m >> 14) & 7;
      let s = 0;
      if (m >> 17 & 1) s = 10 * VAL[b[to] & 7 || 1] - VAL[b[from] & 7] + 1000;
      if (promo) s += VAL[promo];
      sc[i] = s;
    }
    const idx = moves.map((_, i) => i).sort((x, y) => sc[y] - sc[x]);
    return idx.map(i => moves[i]);
  }
  function qs(g, alpha, beta, ply) {
    nodes++;
    const stand = g.evaluate();
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 6) return alpha;
    const moves = order(g, g.gen(true));
    for (const m of moves) {
      if (!g.make(m)) continue;
      const sc = -qs(g, -beta, -alpha, ply + 1);
      g.unmake();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function nega(g, depth, alpha, beta, ply) {
    if (stop) return 0;
    if ((nodes & 1023) === 0 && Date.now() > deadline) { stop = true; return 0; }
    const chk = g.inCheck();
    if (chk && ply < 10) depth++;
    if (depth <= 0) return qs(g, alpha, beta, 0);
    nodes++;
    if (g.half >= 100) return 0;
    const moves = order(g, g.gen(false));
    let legal = 0, best = -INF;
    for (const m of moves) {
      if (!g.make(m)) continue;
      legal++;
      const sc = -nega(g, depth - 1, -beta, -alpha, ply + 1);
      g.unmake();
      if (stop) return 0;
      if (sc > best) best = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    if (!legal) return chk ? -MATE + ply : 0;
    return best;
  }
  const LEVELS = [
    { depth: 1, ms: 300, noise: 170, blunder: 0.1 },
    { depth: 4, ms: 1000, noise: 18, blunder: 0 },
    { depth: 6, ms: 1700, noise: 0, blunder: 0 },
  ];
  // Devuelve la mejor jugada (entero) para el jugador al turno; level 0 = fácil, 1 = medio, 2 = difícil.
  function best(g, level) {
    const cfg = LEVELS[level] || LEVELS[1];
    let root = g.legalMoves();
    if (!root.length) return 0;
    if (root.length === 1) return root[0];
    if (cfg.blunder && Math.random() < cfg.blunder) return root[Math.floor(Math.random() * root.length)];
    root = order(g, root);
    stop = false; nodes = 0; deadline = Date.now() + cfg.ms;
    let bestMove = root[0];
    for (let d = 1; d <= cfg.depth; d++) {
      let alpha = -INF; const scores = [];
      let done = true, iterBest = null, iterScore = -INF;
      for (const m of root) {
        g.make(m);
        let sc = -nega(g, d - 1, -INF, cfg.noise ? INF : -alpha, 1);
        g.unmake();
        if (stop) { done = false; break; }
        if (cfg.noise) sc += (Math.random() * 2 - 1) * cfg.noise;
        else { g.make(m); const k = g.key(); g.unmake(); if (g.keys.indexOf(k) >= 0 && sc > -50) sc -= 30; }
        scores.push([sc, m]);
        if (sc > iterScore) { iterScore = sc; iterBest = m; }
        if (sc > alpha) alpha = sc;
      }
      if (done && iterBest !== null) {
        bestMove = iterBest;
        root = scores.sort((x, y) => y[0] - x[0]).map(x => x[1]);
        if (iterScore > MATE - 100) break;
      } else break;
    }
    return bestMove;
  }
  function perft(g, d) {
    if (!d) return 1;
    let n = 0;
    for (const m of g.gen(false)) { if (!g.make(m)) continue; n += perft(g, d - 1); g.unmake(); }
    return n;
  }

  const api = { Game, best, perft, dec, uci, sqName, sqFrom, START, P, N, B, R, Q, K, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Chess = api;
})(typeof self !== 'undefined' ? self : this);
