'use strict';
// Guerra Zombie: dibujos generados con código (estilo caricatura con contorno azul marino, como Giorgio).
// Cada textura mide 128×128 unidades con el centro de la casilla en (64,100); se dibuja al doble (K) para pantallas nítidas.
(() => {
  const K = 2, OX = 64, OY = 100, INK = 0x1d2a5b;
  GZ.K = K; GZ.ORIGIN_Y = OY / 128;

  function pen(scene, w, h) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const P = pts => pts.map(([x, y]) => new Phaser.Geom.Point(x * K, y * K));
    const api = {
      g,
      fill(c, a) { g.fillStyle(c, a === undefined ? 1 : a); return api; },
      line(w, c, a) { g.lineStyle(w * K, c === undefined ? INK : c, a === undefined ? 1 : a); return api; },
      poly(pts, s) { g.fillPoints(P(pts), true); if (s !== false) g.strokePoints(P(pts), true, true); return api; },
      circ(x, y, r, s) { g.fillCircle(x * K, y * K, r * K); if (s !== false) g.strokeCircle(x * K, y * K, r * K); return api; },
      ell(x, y, w, h, s) { g.fillEllipse(x * K, y * K, w * K, h * K); if (s !== false) g.strokeEllipse(x * K, y * K, w * K, h * K); return api; },
      rect(x, y, w, h, r, s) { g.fillRoundedRect(x * K, y * K, w * K, h * K, (r || 0.01) * K); if (s !== false) g.strokeRoundedRect(x * K, y * K, w * K, h * K, (r || 0.01) * K); return api; },
      seg(x1, y1, x2, y2) { g.lineBetween(x1 * K, y1 * K, x2 * K, y2 * K); return api; },
      done(key) { g.generateTexture(key, w * K, h * K); g.destroy(); },
    };
    return api;
  }
  const shade = (c, f) => { const r = Math.min(255, ((c >> 16) & 255) * f) | 0, gg = Math.min(255, ((c >> 8) & 255) * f) | 0, b = Math.min(255, (c & 255) * f) | 0; return (r << 16) | (gg << 8) | b; };
  // caja isométrica: base rombo de medio ancho hw y medio alto hh centrado en (cx,cy), altura h
  function box(p, cx, cy, hw, hh, h, col) {
    const T = [cx, cy - hh], R = [cx + hw, cy], Bt = [cx, cy + hh], L = [cx - hw, cy];
    const up = q => [q[0], q[1] - h];
    p.line(1.6).fill(shade(col, 0.8)).poly([L, Bt, up(Bt), up(L)]);
    p.fill(shade(col, 0.62)).poly([Bt, R, up(R), up(Bt)]);
    p.fill(col).poly([up(T), up(R), up(Bt), up(L)]);
    return { T: up(T), R: up(R), B: up(Bt), L: up(L) };
  }
  function roof(p, top, hgt, col) {
    const apex = [(top.L[0] + top.R[0]) / 2, (top.T[1] + top.B[1]) / 2 - hgt];
    p.line(1.6).fill(shade(col, 0.75)).poly([top.L, top.B, apex]);
    p.fill(shade(col, 0.55)).poly([top.B, top.R, apex]);
    p.fill(col).poly([top.L, top.T, apex], false); p.fill(shade(col, 0.9)).poly([top.T, top.R, apex], false);
    return apex;
  }
  const shadow = (p, w, h) => p.fill(0x000000, 0.18).ell(OX, OY + 2, w || 46, h || 20, false);

  function tiles(scene) {
    const tile = (key, top, edge, deco) => {
      const p = pen(scene, 64, 40);
      p.fill(edge).poly([[32, 8], [64, 24], [32, 40], [0, 24]], false);
      p.fill(top).poly([[32, 0], [64, 16], [32, 32], [0, 16]], false);
      if (deco) deco(p);
      p.done(key);
    };
    tile('t_grass', 0x8fcf5e, 0x5f9e3a, p => { p.fill(0xa6dc72).circ(20, 13, 2, false).circ(42, 19, 2.5, false).circ(30, 24, 1.6, false); });
    tile('t_grass2', 0x84c656, 0x5f9e3a, p => { p.fill(0x9ad567).circ(26, 10, 2, false).circ(38, 22, 1.8, false); });
    tile('t_wild', 0x5f9a45, 0x3f7030, p => { p.fill(0x6fae50).circ(24, 14, 2.4, false).circ(40, 20, 2, false); });
    tile('t_water', 0x4aa8e8, 0x2c78b8, p => { p.line(1.4, 0xffffff, 0.55).seg(18, 14, 26, 12).seg(34, 20, 44, 18); });
    tile('t_sand', 0xe8d39a, 0xc2a96a);
    // rombo de selección y de colocación
    const sel = (key, col) => { const p = pen(scene, 64, 32); p.line(2.4, col).fill(col, 0.25).poly([[32, 2], [62, 16], [32, 30], [2, 16]]); p.done(key); };
    sel('t_sel', 0xffc629); sel('t_bad', 0xe5383b); sel('t_ok', 0x22a35a);
  }

  function nature(scene) {
    let p = pen(scene, 128, 128); shadow(p, 40, 16);
    p.line(1.8).fill(0x8a5a2b).rect(59, 70, 10, 32, 3);
    p.fill(0x3f8f3a).circ(64, 56, 22).fill(0x4fa646).circ(52, 64, 14).circ(76, 63, 14).fill(0x66bf55).circ(60, 48, 12, false);
    p.done('n_arbol');
    p = pen(scene, 128, 128); shadow(p, 44, 16);
    p.line(1.8).fill(0x9aa0ad).poly([[42, 100], [48, 80], [62, 72], [80, 78], [88, 98], [70, 106], [52, 106]]);
    p.fill(0xc5c9d4).poly([[50, 84], [62, 76], [74, 80], [66, 88]], false);
    p.done('n_roca');
    p = pen(scene, 128, 128); shadow(p, 40, 14);
    p.line(1.8).fill(0x3f8f3a).circ(56, 88, 13).circ(72, 88, 13).fill(0x4fa646).circ(64, 80, 14);
    p.fill(0xe5383b).line(1).circ(56, 82, 3).circ(68, 76, 3).circ(74, 88, 3).circ(60, 92, 3);
    p.done('n_arbusto');
    p = pen(scene, 128, 128); shadow(p, 24, 10);                        // tocón mientras vuelve a crecer
    p.line(1.6).fill(0x8a5a2b).ell(64, 98, 20, 10).fill(0xc79a5d).ell(64, 95, 16, 7);
    p.done('n_toco');
  }

  function buildings(scene) {
    let p;
    // fogata apagada y llama (la llama es un sprite aparte que se anima)
    p = pen(scene, 128, 128); shadow(p, 52, 22);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; p.line(1.4).fill(0x9aa0ad).circ(64 + Math.cos(a) * 20, 100 + Math.sin(a) * 9, 5); }
    p.line(1.8).fill(0x8a5a2b).poly([[50, 98], [78, 92], [80, 96], [52, 102]]).fill(0x6e4420).poly([[52, 90], [76, 100], [74, 104], [50, 94]]);
    p.done('b_fogata');
    p = pen(scene, 64, 64);
    p.line(1.4, 0xc95a00).fill(0xff7a1a).poly([[32, 6], [46, 34], [44, 50], [32, 58], [20, 50], [18, 34]]);
    p.fill(0xffc629).poly([[32, 22], [40, 40], [38, 50], [32, 54], [26, 50], [24, 40]], false);
    p.fill(0xfff2a8).ell(32, 48, 8, 10, false);
    p.done('flame');
    // tienda
    p = pen(scene, 128, 128); shadow(p, 60, 26);
    p.line(1.8).fill(0xd98f45).poly([[34, 100], [64, 116], [64, 54]]).fill(0xb06d2c).poly([[64, 116], [94, 100], [64, 54]]);
    p.fill(0x5a3510).poly([[52, 106], [64, 112], [64, 80]]).line(2).seg(64, 54, 64, 48);
    p.done('b_tienda');
    // pila de palos
    p = pen(scene, 128, 128); shadow(p, 60, 24);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
      const x = 44 + i * 12 + r * 6, y = 102 - r * 10;
      p.line(1.4).fill(0x9b6a35).rect(x - 2, y - 14, 30, 8, 4).fill(0xd9b07a).circ(x + 27, y - 10, 4);
    }
    p.line(2, 0x6e4420).seg(40, 104, 40, 70).seg(92, 104, 92, 70);
    p.done('b_pila');
    // recolector de bayas
    p = pen(scene, 128, 128); shadow(p, 56, 22);
    p.line(1.8).fill(0x3f8f3a).circ(50, 84, 16).fill(0x4fa646).circ(46, 76, 10);
    p.fill(0xe5383b).line(1).circ(44, 82, 3).circ(54, 78, 3).circ(52, 90, 3);
    p.line(1.8).fill(0xc79a5d).poly([[64, 96], [92, 96], [88, 112], [68, 112]]).fill(0xe5383b).circ(72, 94, 4).circ(80, 92, 4).circ(86, 95, 4).fill(0x7b3fe4).circ(76, 96, 3.5);
    p.done('b_bayas');
    // cubetas del río
    p = pen(scene, 128, 128); shadow(p, 56, 22);
    p.line(2, 0x6e4420).seg(40, 104, 44, 64).seg(88, 104, 84, 64).seg(42, 68, 86, 68);
    const bucket = (x, y) => { p.line(1.6).fill(0x8a6f50).poly([[x - 9, y - 14], [x + 9, y - 14], [x + 7, y], [x - 7, y]]).fill(0x4aa8e8).ell(x, y - 14, 18, 6); };
    bucket(54, 108); bucket(76, 110); p.line(1.4).seg(64, 68, 64, 84); bucket(64, 98);
    p.done('b_cubetas');
    // taller de palos: tejado sobre postes y mesa
    p = pen(scene, 128, 128); shadow(p, 66, 28);
    p.line(1.8).fill(0x9b6a35).rect(58, 92, 26, 8, 2).fill(0x6e4420).rect(60, 99, 3, 9, 1).rect(79, 99, 3, 9, 1);
    p.line(2.4, 0x6e4420).seg(38, 100, 38, 60).seg(90, 100, 90, 60).seg(64, 112, 64, 74);
    p.line(1.8).fill(0xc98a4a).poly([[30, 64], [64, 44], [98, 64], [64, 84]]).fill(0xa06a32).poly([[30, 64], [64, 84], [64, 90], [30, 70]]).fill(0x7f5124).poly([[64, 84], [98, 64], [98, 70], [64, 90]]);
    p.line(1.6).fill(0xd9d2c3).poly([[66, 88], [74, 84], [76, 86], [68, 90]]);
    p.done('b_taller');
    // muro de palos (empalizada)
    p = pen(scene, 128, 128); shadow(p, 60, 24);
    for (let i = 0; i < 6; i++) { const x = 38 + i * 10, y = 106 - Math.abs(i - 2.5) * 2; p.line(1.6).fill(i % 2 ? 0xa06a32 : 0xb77c3e).poly([[x - 5, y], [x + 5, y], [x + 5, y - 34], [x, y - 42], [x - 5, y - 34]]); }
    p.line(2.2, 0x6e4420).seg(34, 90, 94, 90);
    p.done('b_muro');
    // estacas
    p = pen(scene, 128, 128);
    for (const [x, y] of [[46, 104], [60, 96], [74, 104], [86, 96], [56, 110], [70, 112]]) p.line(1.4).fill(0xb77c3e).poly([[x - 4, y], [x + 4, y], [x + 1, y - 20], [x - 1, y - 20]]);
    p.done('b_estacas');
    // cabaña de troncos
    p = pen(scene, 128, 128); shadow(p, 68, 30);
    let top = box(p, 64, 100, 32, 16, 30, 0xb77c3e);
    p.line(1, 0x6e4420, 0.7); for (let i = 1; i < 4; i++) p.seg(32, 100 - i * 8, 64, 116 - i * 8);
    p.line(1.6).fill(0x5a3510).poly([[44, 106], [54, 111], [54, 92], [44, 87]]);
    roof(p, top, 26, 0xe5383b);
    p.done('b_cabana');
    // huerto
    p = pen(scene, 128, 128);
    p.line(1.6).fill(0x8a5a2b).poly([[64, 82], [98, 99], [64, 116], [30, 99]]);
    for (let i = 0; i < 3; i++) { const y = 92 + i * 7; p.line(1.2, 0x5a3510).seg(42 + i * 4, y, 86 - i * 4, y + 2); for (let j = 0; j < 4; j++) p.fill(0x4fa646).line(1).circ(48 + j * 10 + i * 2, y - 2, 3); }
    p.done('b_huerto');
    // pedrera
    p = pen(scene, 128, 128); shadow(p, 60, 24);
    p.line(1.8).fill(0x9aa0ad).circ(54, 98, 12).circ(74, 100, 10).circ(64, 88, 11).fill(0xc5c9d4).circ(62, 84, 4, false);
    p.line(2.6, 0x6e4420).seg(84, 104, 96, 80).line(1.8).fill(0x8c8f99).poly([[90, 78], [104, 82], [98, 86]]);
    p.done('b_pedrera');
    // atalaya de palos
    p = pen(scene, 128, 128); shadow(p, 46, 20);
    p.line(2.6, 0x6e4420).seg(46, 104, 54, 50).seg(82, 104, 74, 50).seg(64, 112, 64, 54).seg(48, 88, 80, 74).seg(80, 88, 48, 74);
    p.line(1.8).fill(0xb77c3e).poly([[42, 50], [64, 38], [86, 50], [64, 62]]).fill(0x9b6a35).poly([[42, 50], [64, 62], [64, 68], [42, 56]]).fill(0x7f5124).poly([[64, 62], [86, 50], [86, 56], [64, 68]]);
    p.line(2, 0x6e4420).seg(48, 48, 48, 24).seg(80, 48, 80, 24);
    p.line(1.6).fill(0xe5383b).poly([[42, 26], [64, 10], [86, 26], [64, 36]]);
    p.done('b_atalaya');
    // lanzapiedras
    p = pen(scene, 128, 128); shadow(p, 62, 26);
    p.line(1.8).fill(0x9b6a35).poly([[36, 98], [64, 84], [92, 98], [64, 112]]);
    p.line(3, 0x6e4420).seg(52, 96, 60, 66).seg(78, 96, 68, 66);
    p.line(3.4, 0x8a5a2b).seg(40, 88, 92, 46);
    p.line(1.6).fill(0x9aa0ad).circ(92, 42, 8);
    p.line(1.6).fill(0xc5c9d4).circ(64, 66, 4);
    p.done('b_lanzador');
    // obra en construcción (andamio)
    p = pen(scene, 128, 128); shadow(p, 56, 24);
    p.line(2, 0x8a5a2b).seg(40, 104, 40, 66).seg(88, 104, 88, 66).seg(64, 114, 64, 76).seg(40, 76, 88, 76).seg(40, 90, 64, 104).seg(64, 90, 88, 104);
    p.line(1.6).fill(0xffc629).poly([[54, 66], [74, 66], [64, 50]]).fill(INK).circ(64, 62, 1.6, false);
    p.done('b_obra');
  }

  function people(scene) {
    // persona: cuerpo, cabeza y detalles; facing = mirando a la cámara
    function person(key, shirt, pants, skin, hair, opts) {
      opts = opts || {};
      const p = pen(scene, 64, 96);
      p.fill(0x000000, 0.2).ell(32, 90, 26, 8, false);
      p.line(1.6).fill(pants).rect(24, 66, 7, 22, 3).rect(33, 66, 7, 22, 3);
      p.fill(shirt).rect(20, 42, 24, 28, 7);
      p.fill(skin).rect(14, 46, 7, 18, 3).rect(43, 46, 7, 18, 3);
      p.fill(skin).circ(32, 30, 13);
      p.fill(hair);
      if (opts.long) { p.poly([[18, 30], [20, 16], [32, 12], [44, 16], [46, 30], [46, 46], [40, 40], [40, 24], [24, 24], [24, 40], [18, 46]]); }
      else p.poly([[19, 28], [21, 18], [32, 14], [43, 18], [45, 28], [40, 22], [24, 22]]);
      p.fill(INK).circ(27, 31, 1.8, false).circ(37, 31, 1.8, false);
      p.line(1.4).seg(29, 37, 35, 37);
      if (opts.band) p.line(1.6).fill(0xe5383b).rect(19, 19, 26, 5, 2);
      p.done(key);
    }
    person('p_chico', 0x2f6fe4, 0x3b4466, 0xf2c79a, 0x5a3510, { band: true });
    person('p_chica', 0xff7a1a, 0x3b4466, 0xf2c79a, 0x3a2412, { long: true, band: true });
    person('p_aliado0', 0x22a35a, 0x5a4636, 0xe0b088, 0x2b1a0e, {});
    person('p_aliado1', 0x7b3fe4, 0x3b4466, 0xf6d3ac, 0x8a5a2b, { long: true });
    person('p_aliado2', 0xc95a00, 0x4a3b2c, 0xc58d5f, 0x1b1b1b, {});
    person('p_aliado3', 0x1fb5a3, 0x3b4466, 0xf2c79a, 0xd9a865, { long: true });

    function zombie(key, skin, shirt, pants, opts) {
      const p = pen(scene, 64, 96);
      p.fill(0x000000, 0.22).ell(32, 90, 26, 8, false);
      p.line(1.6).fill(pants).rect(24, 64, 7, 24, 3).rect(34, 66, 7, 22, 3);
      p.fill(shirt).poly([[20, 44], [44, 44], [46, 70], [40, 66], [34, 72], [28, 66], [18, 70]]);
      p.fill(skin).rect(4, 46, 20, 7, 3).rect(40, 50, 20, 7, 3);                 // brazos al frente
      p.fill(skin).circ(32, 30, opts.big ? 15 : 13);
      p.fill(0xffffff).line(1.2).circ(26, 29, 4).circ(38, 30, 3.2).fill(0xe5383b).circ(26, 29, 1.6, false).circ(38, 30, 1.3, false);
      p.line(1.6).seg(26, 38, 38, 36).line(1.2).seg(29, 36, 29, 39).seg(34, 36, 34, 39);
      p.fill(shade(skin, 0.75)).circ(40, 22, 3, false);
      p.done(key);
    }
    zombie('z_errante', 0x8fc46a, 0x5f6b8a, 0x4a3b2c, {});
    zombie('z_corredor', 0xa8d47e, 0xb5383b, 0x3b4466, {});
  }

  function fx(scene) {
    let p = pen(scene, 16, 16); p.line(1.2).fill(0x9aa0ad).circ(8, 8, 5); p.fill(0xc5c9d4).circ(6, 6, 1.6, false); p.done('stone');
    p = pen(scene, 64, 12); p.line(1.2).fill(0x9b6a35).rect(2, 4, 48, 4, 2).fill(0xc5c9d4).poly([[50, 1], [62, 6], [50, 11]]); p.done('spear');
    p = pen(scene, 24, 24); p.fill(0xffffff, 0.9).circ(12, 12, 9, false); p.done('puff');
    // brillo de la fogata para la noche (degradado radial)
    const g = scene.make.graphics({ add: false }), R = 160;
    for (let i = 24; i > 0; i--) { g.fillStyle(0xffb347, 0.045); g.fillCircle(R * K, R * K, (R * i / 24) * K); }
    g.generateTexture('glow', R * 2 * K, R * 2 * K); g.destroy();
  }

  GZ.makeArt = scene => { tiles(scene); nature(scene); buildings(scene); people(scene); fx(scene); };
})();
