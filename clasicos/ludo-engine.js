'use strict';
// Ludo para 2 jugadores: reglas, recorrido del tablero y bot de 3 niveles.
// Cada ficha tiene un avance 0..57: 0 = en la base, 1..51 = recorrido común, 52..56 = pasillo de casa, 57 = llegó a casa.
// Colores (esquina): 0 rojo arriba-izquierda, 1 verde arriba-derecha, 2 amarillo abajo-derecha, 3 azul abajo-izquierda.
(function (root) {
  const TRACK = [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6]];
  const LANE = [
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  ];
  const BASE = [[0, 0], [9, 0], [9, 9], [0, 9]];                      // esquina superior izquierda de cada base (celdas)
  const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);               // salidas y casillas con estrella
  const trackIdx = (color, p) => (13 * color + p - 1) % 52;

  class Ludo {
    constructor(o) {
      o = o || {};
      this.rng = o.rng || Math.random;
      this.colors = [3, 1];                                            // jugador 0 azul (abajo-izquierda), jugador 1 verde (arriba-derecha)
      this.pos = [[0, 0, 0, 0], [0, 0, 0, 0]];
      this.turn = o.first === 1 ? 1 : 0; this.phase = 'roll'; this.dice = null; this.sixes = 0;
      this.winner = null; this.n = 0; this.last = null;
    }
    legal() {
      if (this.phase !== 'move') return [];
      const out = [], d = this.dice;
      for (let i = 0; i < 4; i++) { const p = this.pos[this.turn][i]; if (p === 0 ? d === 6 : p + d <= 57) out.push(i); }
      return out;
    }
    roll() {
      if (this.phase !== 'roll') return false;
      const d = 1 + Math.floor(this.rng() * 6), me = this.turn;
      this.dice = d; this.n++; this.sixes = d === 6 ? this.sixes + 1 : 0;
      if (this.sixes === 3) { this.last = { p: me, d, ev: 'tres6' }; this._pass(); return true; }
      this.phase = 'move';
      if (!this.legal().length) { this.last = { p: me, d, ev: 'sin' }; this._pass(); return true; }
      this.last = { p: me, d, ev: 'tiro' };
      return true;
    }
    _pass() { this.turn ^= 1; this.phase = 'roll'; this.sixes = 0; }
    // Mueve la ficha i del jugador al turno. Devuelve false si no es válido.
    move(i) {
      if (!this.legal().includes(i)) return false;
      const me = this.turn, op = me ^ 1, d = this.dice, from = this.pos[me][i], to = from === 0 ? 1 : from + d;
      this.pos[me][i] = to;
      let captured = 0, capProg = 0;
      if (to <= 51) {
        const ti = trackIdx(this.colors[me], to);
        if (!SAFE.has(ti)) {
          for (let j = 0; j < 4; j++) { const q = this.pos[op][j]; if (q >= 1 && q <= 51 && trackIdx(this.colors[op], q) === ti) { capProg += q; this.pos[op][j] = 0; captured++; } }
        }
      }
      const done = to === 57;
      this.last = { p: me, d, ev: 'mueve', i, from, to, captured, capProg, done };
      if (this.pos[me].every(x => x === 57)) { this.winner = me; this.phase = 'over'; return true; }
      if (d === 6 || captured || done) this.phase = 'roll';              // tiro extra
      else this._pass();
      return true;
    }
    state() { return { pos: this.pos.map(a => a.slice()), turn: this.turn, phase: this.phase, dice: this.dice, legal: this.legal(), winner: this.winner, n: this.n, last: this.last, colors: this.colors }; }
  }

  // ---------------------------------------------------------------- bot
  // Cuántas fichas rivales podrían caer sobre la casilla común ti en su próximo turno.
  function danger(g, me, ti) {
    if (SAFE.has(ti)) return 0;
    const op = me ^ 1; let n = 0;
    for (let j = 0; j < 4; j++) {
      const q = g.pos[op][j]; if (q < 1 || q > 51) continue;
      const dist = (ti - trackIdx(g.colors[op], q) + 52) % 52;
      if (dist >= 1 && dist <= 6 && q + dist <= 51) n++;
    }
    return n;
  }
  function botMove(g, level) {
    const L = g.legal(); if (!L.length) return null;
    const rng = g.rng;
    if (level === 0) return L[Math.floor(rng() * L.length)];
    const me = g.turn, op = me ^ 1, d = g.dice, outCount = g.pos[me].filter(x => x > 0 && x < 57).length;
    let best = L[0], bestS = -1e9;
    for (const i of L) {
      const from = g.pos[me][i], to = from === 0 ? 1 : from + d;
      let s = rng() * 2;
      let cap = 0, capProg = 0, ti = -1;
      if (to <= 51) {
        ti = trackIdx(g.colors[me], to);
        if (!SAFE.has(ti)) for (let j = 0; j < 4; j++) { const q = g.pos[op][j]; if (q >= 1 && q <= 51 && trackIdx(g.colors[op], q) === ti) { cap++; capProg += q; } }
      }
      s += cap * 50 + (to === 57 ? 40 : 0) + (from === 0 ? 30 : 0) + (to >= 52 && from < 52 ? 10 : 0) + (ti >= 0 && SAFE.has(ti) ? 8 : 0) + to * 0.1;
      if (level === 2) {
        const before = from >= 1 && from <= 51 ? danger(g, me, trackIdx(g.colors[me], from)) : 0;
        const after = ti >= 0 ? danger(g, me, ti) : 0;
        s += capProg * 0.6 + (before - after) * 14 - after * 6;
        if (from === 0) s += outCount < 2 ? 14 : 0;
        if (to === 57) s += 8;
        if (ti >= 0 && !SAFE.has(ti)) {                                  // quedar justo detrás de una ficha rival da opción de captura
          for (let j = 0; j < 4; j++) { const q = g.pos[op][j]; if (q >= 1 && q <= 51) { const dist = (trackIdx(g.colors[op], q) - ti + 52) % 52; if (dist >= 1 && dist <= 6) { s += 3; break; } } }
        }
      }
      if (s > bestS) { bestS = s; best = i; }
    }
    return best;
  }

  const api = { Ludo, botMove, danger, TRACK, LANE, BASE, SAFE, trackIdx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LudoEngine = api;
})(typeof self !== 'undefined' ? self : this);
