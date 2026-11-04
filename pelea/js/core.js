'use strict';
// Giorgio Brawl: reglas de la pelea, sin dibujo (se puede simular sin navegador para medir el balance).
// Daño acumulado en %: cuanto más daño tienes, más lejos vuelas. Pierdes una vida al salir de la zona de la arena.
(function (root) {
  const FPS = 60, DT = 1 / FPS, G = 2300, STOCKS = 3, W = 44, H = 74;
  const BLAST = { l: -340, r: 1620, t: -420, b: 980 };
  const STAGES = [
    { id: 'plaza', name: 'Plaza de Villa Albor', sky: ['#ffb36b', '#ffe3a8'], ground: '#8a5a2b', top: '#6fbf4f', plats: [{ x: 240, y: 560, w: 800, solid: true }, { x: 320, y: 410, w: 200 }, { x: 760, y: 410, w: 200 }] },
    { id: 'tubo', name: 'Tubo Caramelo', sky: ['#f062a8', '#ffd3ec'], ground: '#7b3fe4', top: '#ffc629', plats: [{ x: 290, y: 570, w: 700, solid: true }, { x: 240, y: 430, w: 170 }, { x: 870, y: 430, w: 170 }, { x: 555, y: 310, w: 170 }] },
    { id: 'aldea', name: 'Aldea de noche', sky: ['#101838', '#34428a'], ground: '#4a3b2c', top: '#3f7030', plats: [{ x: 340, y: 550, w: 600, solid: true }, { x: 540, y: 400, w: 200 }] },
  ];
  // Golpes: f = [inicio, activo, final] en cuadros; d = daño; b = empuje base; g = crecimiento; a = ángulo (grados); r = [alcance, alto]
  const CHARS = {
    giorgio: { name: 'Giorgio', role: 'Equilibrado', weapon: 'Garras', color: '#f3e6d2', accent: '#ff7a1a', speed: 372, air: 332, jump: 802, weight: 100, jumps: 2,
      moves: { light: { f: [4, 4, 10], d: 5, b: 260, g: 7.0, a: 40, r: [66, 46] }, heavy: { f: [13, 5, 20], d: 14, b: 435, g: 16.7, a: 42, r: [80, 57] }, air: { f: [6, 6, 12], d: 8, b: 300, g: 11.0, a: 45, r: [70, 60] }, special: { f: [12, 2, 18], d: 7, b: 250, g: 8, a: 35, proj: { v: 620, life: 55, r: 15, color: '#d9c2a3' } } } },
    rosa: { name: 'Rosa', role: 'Alcance', weapon: 'Lanza', color: '#7b3fe4', accent: '#c5c9d4', speed: 348, air: 315, jump: 780, weight: 97, jumps: 2,
      moves: { light: { f: [6, 4, 11], d: 6, b: 272, g: 7.9, a: 30, r: [106, 31] }, heavy: { f: [15, 5, 22], d: 13, b: 430, g: 16.5, a: 36, r: [128, 34] }, air: { f: [8, 6, 14], d: 8, b: 300, g: 11.0, a: 40, r: [104, 40] }, special: { f: [16, 2, 20], d: 9, b: 300, g: 9, a: 60, proj: { v: 430, life: 70, r: 18, color: '#e5383b', arc: true } } } },
    tomas: { name: 'Tomás', role: 'Pesado', weapon: 'Hacha', color: '#22a35a', accent: '#8c8f99', speed: 305, air: 285, jump: 745, weight: 118, jumps: 2,
      moves: { light: { f: [7, 4, 14], d: 8, b: 300, g: 8.5, a: 42, r: [76, 56] }, heavy: { f: [20, 6, 26], d: 19, b: 470, g: 19, a: 44, r: [92, 70] }, air: { f: [9, 6, 16], d: 11, b: 340, g: 12.5, a: -50, r: [80, 66] }, special: { f: [16, 8, 22], d: 12, b: 340, g: 11, a: 38, r: [84, 60], lunge: 620 } } },
    chispa: { name: 'Chispa', role: 'Rápida', weapon: 'Dagas', color: '#ff5a5f', accent: '#ffe27d', speed: 430, air: 380, jump: 840, weight: 78, jumps: 3,
      moves: { light: { f: [3, 3, 7], d: 4, b: 240, g: 5.8, a: 45, r: [56, 42] }, heavy: { f: [10, 4, 17], d: 11, b: 400, g: 14.5, a: 48, r: [66, 50] }, air: { f: [4, 5, 9], d: 6, b: 270, g: 9, a: 50, r: [60, 52] }, special: { f: [8, 8, 16], d: 8, b: 280, g: 8.5, a: 30, r: [58, 44], lunge: 820 } } },
    pepe: { name: 'Pepe', role: 'Resistente', weapon: 'Pala', color: '#8fc46a', accent: '#c5c9d4', speed: 330, air: 305, jump: 765, weight: 115, jumps: 2,
      moves: { light: { f: [6, 5, 12], d: 7, b: 280, g: 7.8, a: 50, r: [84, 50] }, heavy: { f: [17, 6, 23], d: 16, b: 450, g: 17.5, a: 65, r: [96, 66] }, air: { f: [8, 6, 14], d: 9, b: 310, g: 11.5, a: 55, r: [84, 62] }, special: { f: [14, 2, 20], d: 8, b: 280, g: 9, a: 70, proj: { v: 380, life: 60, r: 20, color: '#8a5a2b', arc: true } } } },
    sofia: { name: 'Sofía', role: 'A distancia', weapon: 'Arco', color: '#1fb5a3', accent: '#b77c3e', speed: 365, air: 335, jump: 810, weight: 94, jumps: 2, zoner: true,
      moves: { light: { f: [4, 4, 10], d: 6, b: 265, g: 7.4, a: 42, r: [64, 44] }, heavy: { f: [14, 5, 20], d: 12, b: 410, g: 15, a: 40, r: [72, 52] }, air: { f: [6, 6, 12], d: 7, b: 285, g: 10, a: 45, r: [64, 54] }, special: { f: [10, 2, 16], d: 8, b: 270, g: 9, a: 25, proj: { v: 860, life: 48, r: 11, color: '#ffc629' } } } },
  };
  const IDS = Object.keys(CHARS);

  function fighter(id, x, side) {
    return { id, c: CHARS[id], x, y: 300, vx: 0, vy: 0, face: side, dmg: 0, stocks: STOCKS, ground: false, jumps: CHARS[id].jumps, upUsed: false, atk: null, af: 0, hit: false, stun: 0, dodge: 0, dcd: 0, inv: 90, drop: 0, dead: 0, flash: 0, lastPad: {} };
  }
  function match(ids, stage) {
    const st = STAGES[stage || 0];
    return { st, f: [fighter(ids[0], 480, 1), fighter(ids[1], 800, -1)], shots: [], t: 0, over: null, events: [], hitstop: 0 };
  }
  const box = (x, y, w, h) => ({ x, y, w, h });
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const hurt = p => box(p.x - W / 2, p.y - H, W, H);

  // Fórmula de lanzamiento: empuje = base + (daño total) × crecimiento × (100 / peso)
  function launch(m, t, mv, dir) {
    t.dmg = Math.min(999, t.dmg + mv.d);
    const kb = mv.b + t.dmg * mv.g * (100 / t.c.weight), a = mv.a * Math.PI / 180;
    t.vx = Math.cos(a) * kb * dir; t.vy = -Math.sin(a) * kb;
    t.stun = Math.round(6 + kb * 0.024); t.atk = null; t.ground = false; t.flash = 8; t.upUsed = false;
    t.jumps = Math.max(t.jumps, 1);
    m.hitstop = Math.min(10, 3 + (mv.d / 3 | 0));
    m.events.push({ e: 'hit', x: t.x, y: t.y - H / 2, d: mv.d, big: kb > 900 });
  }
  function startAtk(p, kind) { const mv = p.c.moves[kind]; p.atk = mv; p.kind = kind; p.af = 0; p.hit = false; }

  function step(m, pads) {
    m.events.length = 0;
    if (m.over) return;
    if (m.hitstop > 0) { m.hitstop--; return; }
    m.t++;
    m.f.forEach((p, i) => { if (p.stocks > 0) control(m, p, pads[i] || {}); });
    m.f.forEach((p, i) => { if (p.stocks > 0) physics(m, p); });
    const [a, b] = m.f;
    hits(m, a, b); hits(m, b, a);
    shots(m);
    m.f.forEach((p, i) => {
      if (p.stocks <= 0 || p.dead > 0) return;
      if (p.x < BLAST.l || p.x > BLAST.r || p.y < BLAST.t || p.y > BLAST.b) ko(m, p, i);
    });
    const loser = m.f.findIndex(p => p.stocks <= 0);
    if (loser >= 0) m.over = { winner: 1 - loser };
    else if (m.t > FPS * 240) { const [x, y] = m.f; m.over = { winner: x.stocks !== y.stocks ? (x.stocks > y.stocks ? 0 : 1) : x.dmg <= y.dmg ? 0 : 1 }; }
  }
  function ko(m, p, i) {
    p.stocks--; m.events.push({ e: 'ko', x: Math.max(0, Math.min(1280, p.x)), y: Math.max(0, Math.min(720, p.y)), who: i });
    if (p.stocks <= 0) return;
    Object.assign(p, { x: 640, y: 140, vx: 0, vy: 0, dmg: 0, atk: null, stun: 0, inv: 120, dead: 40, jumps: p.c.jumps, upUsed: false, ground: false });
  }
  function control(m, p, pad) {
    const was = p.lastPad, press = k => pad[k] && !was[k];
    p.lastPad = pad;
    if (p.dead > 0) { p.dead--; p.vy = 0; p.vx = 0; return; }
    if (p.inv > 0) p.inv--; if (p.dcd > 0) p.dcd--; if (p.drop > 0) p.drop--; if (p.flash > 0) p.flash--;
    if (p.stun > 0) { p.stun--; if (pad.mx) p.vx += pad.mx * 8; return; }
    if (p.dodge > 0) { p.dodge--; p.vx *= 0.9; return; }
    const mx = pad.mx || 0;
    if (mx && !p.atk) p.face = mx > 0 ? 1 : -1;
    // movimiento
    const top = (p.ground ? p.c.speed : p.c.air) * (p.atk && p.ground ? 0.25 : 1), acc = p.ground ? 0.28 : 0.1;
    p.vx += (mx * top - p.vx) * acc;
    if (pad.down && !p.ground) p.vy = Math.max(p.vy, 0) + 40;                    // caída rápida
    if (pad.down && p.ground && press('down') && p.plat && !p.plat.solid) { p.drop = 12; p.ground = false; p.y += 2; }
    if (p.atk) return;
    if (press('jump') && p.jumps > 0) { p.vy = -p.c.jump * (p.ground ? 1 : 0.92); p.jumps--; p.ground = false; m.events.push({ e: 'jump', x: p.x, y: p.y }); }
    if (press('dodge') && p.dcd === 0) { p.dodge = 18; p.inv = Math.max(p.inv, 15); p.dcd = 42; p.vx = (mx || p.face) * 620; if (!p.ground) p.vy = Math.min(p.vy, 0) * 0.3; m.events.push({ e: 'dodge', x: p.x, y: p.y }); return; }
    if (press('light')) startAtk(p, p.ground ? 'light' : 'air');
    else if (press('heavy')) startAtk(p, p.ground ? 'heavy' : 'air');
    else if (press('special')) {
      if (pad.up && !p.upUsed) { p.upUsed = true; p.vy = -p.c.jump * 1.25; p.vx = p.face * 240 + mx * 120; p.inv = Math.max(p.inv, 8); m.events.push({ e: 'up', x: p.x, y: p.y }); }
      else if (!pad.up) startAtk(p, 'special');
    }
  }
  function physics(m, p) {
    if (p.dead > 0) return;
    if (p.atk) {
      p.af++;
      const [s, a, e] = p.atk.f, mv = p.atk;
      if (mv.lunge && p.af === s) p.vx = p.face * mv.lunge;
      if (mv.proj && p.af === s) m.shots.push({ o: m.f.indexOf(p), x: p.x + p.face * 40, y: p.y - 44, vx: p.face * mv.proj.v, vy: mv.proj.arc ? -420 : 0, life: mv.proj.life, r: mv.proj.r, color: mv.proj.color, arc: mv.proj.arc, mv, dir: p.face });
      if (p.af >= s + a + e) p.atk = null;
    }
    p.vy += G * DT; if (p.vy > 1400) p.vy = 1400;
    const py = p.y;
    p.x += p.vx * DT; p.y += p.vy * DT;
    p.ground = false; p.plat = null;
    if (p.vy >= 0 && !p.drop) for (const q of m.st.plats) {
      if (p.x > q.x - 8 && p.x < q.x + q.w + 8 && py <= q.y + 2 && p.y >= q.y) {
        p.y = q.y; p.vy = 0; p.ground = true; p.plat = q; p.jumps = p.c.jumps; p.upUsed = false;
        if (p.stun > 0) p.stun = Math.min(p.stun, 6);
        break;
      }
    }
    if (p.ground && !p.atk) p.vx *= 0.92;
  }
  function hits(m, p, t) {
    if (!p.atk || p.hit || p.atk.proj || t.inv > 0 || t.dead > 0 || t.stocks <= 0 || p.stocks <= 0) return;
    const [s, a] = p.atk.f; if (p.af < s || p.af >= s + a) return;
    const [rw, rh] = p.atk.r, hb = box(p.face > 0 ? p.x : p.x - rw, p.y - H + (H - rh) / 2, rw, rh);
    if (overlap(hb, hurt(t))) { p.hit = true; launch(m, t, p.atk, p.face); }
  }
  function shots(m) {
    m.shots = m.shots.filter(s => {
      s.x += s.vx * DT; s.y += s.vy * DT; if (s.arc) s.vy += 1100 * DT; s.life--;
      const t = m.f[1 - s.o];
      if (t.stocks > 0 && t.inv <= 0 && t.dead <= 0 && overlap(box(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2), hurt(t))) { launch(m, t, s.mv, s.dir); return false; }
      return s.life > 0;
    });
  }

  // Bot: skill 0 fácil, 1 medio, 2 difícil. Devuelve los botones de este cuadro.
  function bot(m, i, skill, rnd) {
    const p = m.f[i], t = m.f[1 - i], pad = {}, R = rnd || Math.random;
    if (p.dead > 0 || p.stocks <= 0) return pad;
    const main = m.st.plats[0], off = p.x < main.x - 10 || p.x > main.x + main.w + 10;
    const dx = t.x - p.x, dy = t.y - p.y, ad = Math.abs(dx), think = [0.05, 0.12, 0.22][skill];
    if (off || p.y > main.y + 30) {                                              // volver a la arena
      pad.mx = p.x < main.x + main.w / 2 ? 1 : -1;
      if (p.vy > -80) {
        if (p.jumps > 0 && !p.lastPad.jump) pad.jump = true;
        else if (p.jumps === 0 && !p.upUsed && !p.lastPad.special) { pad.up = true; pad.special = true; }
      }
      return pad;
    }
    const stay = ad < 62;
    if (p.c.zoner && !p.atk) {                                                   // pelea a distancia: se aleja y dispara
      pad.mx = ad < 230 ? -Math.sign(dx) : ad > 460 ? Math.sign(dx) : 0;
      if (p.x < main.x + 70 || p.x > main.x + main.w - 70) pad.mx = Math.sign(640 - p.x);
      if (ad < 90 && R() < think && !p.lastPad.dodge) pad.dodge = true;
      if (Math.abs(dy) < 60 && R() < think * 1.3 && !p.lastPad.special) { p.face = Math.sign(dx) || p.face; pad.special = true; }
      if (ad < 80 && Math.abs(dy) < 70 && R() < think && !p.lastPad.light) { p.face = Math.sign(dx) || p.face; pad.light = true; }
      return pad;
    }
    pad.mx = stay ? 0 : Math.sign(dx);
    if (p.ground && dy < -90 && R() < 0.05 && !p.lastPad.jump) pad.jump = true;
    if (!p.ground && dy > 90) pad.down = R() < 0.5;
    const reach = (p.c.moves.heavy.r && p.c.moves.heavy.r[0]) || 80;
    if (t.atk && ad < 150 && R() < think * 0.6 && !p.lastPad.dodge) pad.dodge = true;
    if (R() < think) {
      if (ad < reach + 8 && Math.abs(dy) < 70) { p.face = Math.sign(dx) || p.face; const k = t.dmg > 70 && R() < 0.6 ? 'heavy' : R() < 0.75 ? 'light' : 'heavy'; if (!p.lastPad[k]) pad[k] = true; }
      else if (ad > 240 && ad < 620 && R() < 0.1 && !p.lastPad.special) { p.face = Math.sign(dx) || p.face; pad.special = true; }
    }
    return pad;
  }
  const api = { FPS, STOCKS, W, H, BLAST, STAGES, CHARS, IDS, match, step, bot };
  if (typeof module !== 'undefined') module.exports = api; else root.BRAWL = api;
})(typeof window !== 'undefined' ? window : globalThis);
