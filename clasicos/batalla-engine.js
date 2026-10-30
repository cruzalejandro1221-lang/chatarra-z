'use strict';
// Batalla Naval: tablero, flota y bot de 3 niveles (disparos al azar, caza y rastreo, densidad de probabilidad).
(function (root) {
  const N = 10;
  const SHIPS = [
    { id: 'portaaviones', name: 'Portaaviones', len: 5 },
    { id: 'acorazado', name: 'Acorazado', len: 4 },
    { id: 'crucero', name: 'Crucero', len: 3 },
    { id: 'submarino', name: 'Submarino', len: 3 },
    { id: 'destructor', name: 'Destructor', len: 2 },
  ];
  const shipDef = id => SHIPS.find(s => s.id === id);

  class Board {
    constructor() { this.ships = []; this.shots = Array.from({ length: N }, () => new Array(N).fill(0)); }   // shots: 0 nada, 1 agua, 2 impacto
    static cells(len, r, c, h) { const a = []; for (let i = 0; i < len; i++) a.push(h ? [r, c + i] : [r + i, c]); return a; }
    shipAt(r, c) { for (const s of this.ships) for (const x of s.cells) if (x[0] === r && x[1] === c) return s; return null; }
    canPlace(id, r, c, h) {
      const d = shipDef(id); if (!d || !Number.isInteger(r) || !Number.isInteger(c)) return false;
      for (const [rr, cc] of Board.cells(d.len, r, c, !!h)) {
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) return false;
        const s = this.shipAt(rr, cc); if (s && s.id !== id) return false;
      }
      return true;
    }
    place(id, r, c, h) {
      if (!this.canPlace(id, r, c, h)) return false;
      this.remove(id);
      const d = shipDef(id);
      this.ships.push({ id, len: d.len, r, c, h: !!h, cells: Board.cells(d.len, r, c, !!h), hits: 0 });
      return true;
    }
    remove(id) { this.ships = this.ships.filter(s => s.id !== id); }
    complete() { return SHIPS.every(d => this.ships.some(s => s.id === d.id)); }
    // Recibe un disparo. Devuelve null si ya se había disparado ahí.
    receive(r, c) {
      if (r < 0 || c < 0 || r >= N || c >= N || this.shots[r][c]) return null;
      const s = this.shipAt(r, c);
      if (!s) { this.shots[r][c] = 1; return { res: 'miss' }; }
      this.shots[r][c] = 2; s.hits++;
      if (s.hits === s.len) return { res: 'sunk', id: s.id, cells: s.cells, over: this.ships.every(x => x.hits === x.len) };
      return { res: 'hit' };
    }
    static random(rng) {
      rng = rng || Math.random;
      const b = new Board();
      for (const d of SHIPS) { for (let g = 0; g < 500; g++) { if (b.place(d.id, Math.floor(rng() * N), Math.floor(rng() * N), rng() < 0.5)) break; } }
      return b;
    }
    // Reconstruye una flota recibida de la red; devuelve null si no es válida.
    static fromList(list) {
      if (!Array.isArray(list) || list.length !== SHIPS.length) return null;
      const b = new Board();
      for (const x of list) { if (!x || !b.place(x.id, x.r, x.c, x.h)) return null; }
      return b.complete() ? b : null;
    }
    list() { return this.ships.map(s => ({ id: s.id, r: s.r, c: s.c, h: s.h })); }
  }

  // Bot que dispara. level: 0 azar, 1 caza y rastreo, 2 densidad de probabilidad.
  class Shooter {
    constructor(level, rng) {
      this.level = level; this.rng = rng || Math.random;
      this.st = Array.from({ length: N }, () => new Array(N).fill(0));      // 0 desconocido, 1 agua, 2 impacto sin hundir, 3 hundido
      this.rem = SHIPS.map(s => s.len);
    }
    pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }
    unknown() { const a = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!this.st[r][c]) a.push([r, c]); return a; }
    hits() { const a = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.st[r][c] === 2) a.push([r, c]); return a; }
    next() {
      const unk = this.unknown(); if (!unk.length) return null;
      if (this.level === 0) return this.pick(unk);
      const hits = this.hits();
      if (this.level === 1) {
        if (hits.length) {
          const cand = [], free = (r, c) => r >= 0 && c >= 0 && r < N && c < N && !this.st[r][c];
          const sameRow = hits.every(x => x[0] === hits[0][0]), sameCol = hits.every(x => x[1] === hits[0][1]);
          if (hits.length > 1 && (sameRow || sameCol)) {
            if (sameRow) { const cs = hits.map(x => x[1]); const lo = Math.min(...cs), hi = Math.max(...cs); if (free(hits[0][0], lo - 1)) cand.push([hits[0][0], lo - 1]); if (free(hits[0][0], hi + 1)) cand.push([hits[0][0], hi + 1]); }
            else { const rs = hits.map(x => x[0]); const lo = Math.min(...rs), hi = Math.max(...rs); if (free(lo - 1, hits[0][1])) cand.push([lo - 1, hits[0][1]]); if (free(hi + 1, hits[0][1])) cand.push([hi + 1, hits[0][1]]); }
          }
          if (!cand.length) for (const [r, c] of hits) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (free(r + dr, c + dc)) cand.push([r + dr, c + dc]);
          if (cand.length) return this.pick(cand);
        }
        const par = unk.filter(x => (x[0] + x[1]) % 2 === 0);
        return this.pick(par.length ? par : unk);
      }
      // nivel 2: contar en cuántas colocaciones posibles cabría cada barco restante en cada casilla
      const score = Array.from({ length: N }, () => new Array(N).fill(0)), target = hits.length > 0;
      for (const len of this.rem) {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const h of [true, false]) {
          if (h ? c + len > N : r + len > N) continue;
          let ok = true, cov = 0; const cells = Board.cells(len, r, c, h);
          for (const [rr, cc] of cells) { const v = this.st[rr][cc]; if (v === 1 || v === 3) { ok = false; break; } if (v === 2) cov++; }
          if (!ok || (target && !cov)) continue;
          const w = target ? cov * cov : 1;
          for (const [rr, cc] of cells) if (!this.st[rr][cc]) score[rr][cc] += w;
        }
      }
      let best = -1, cands = [];
      for (const [r, c] of unk) { const v = score[r][c]; if (v > best) { best = v; cands = [[r, c]]; } else if (v === best) cands.push([r, c]); }
      return this.pick(cands);
    }
    feed(r, c, res, cells) {
      this.st[r][c] = res === 'miss' ? 1 : 2;
      if (res === 'sunk' && cells) {
        for (const [rr, cc] of cells) this.st[rr][cc] = 3;
        const i = this.rem.indexOf(cells.length); if (i >= 0) this.rem.splice(i, 1);
      }
    }
  }

  const api = { N, SHIPS, shipDef, Board, Shooter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Naval = api;
})(typeof self !== 'undefined' ? self : this);
