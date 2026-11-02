'use strict';
// Guerra Zombie: el mundo (Phaser). Dibuja la aldea en vista isométrica, maneja los toques y simula la noche.
(() => {
  const K = () => GZ.K, TW = 64, TH = 32;
  const wpos = (tx, ty) => ({ x: (tx - ty) * TW / 2, y: (tx + ty) * TH / 2 });
  const tileAt = (x, y) => { const fx = (x / (TW / 2) + y / (TH / 2)) / 2, fy = (y / (TH / 2) - x / (TW / 2)) / 2; return { tx: Math.round(fx), ty: Math.round(fy) }; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rnd = (a, b) => a + Math.random() * (b - a);

  class World extends Phaser.Scene {
    constructor() { super('world'); }
    preload() { this.load.image('cat', '../media/giorgio/cara.webp'); }
    create() {
      GZ.makeArt(this);
      this.dpr = GZ.dpr;
      const bag = () => { const a = []; return { add: o => a.push(o), removeAll: () => { a.forEach(o => o.destroy()); a.length = 0; } }; };
      this.ground = bag(); this.objs = bag();
      this.fx = this.add.graphics().setDepth(1e6);
      this.dark = this.add.rectangle(0, 0, 10, 10, 0x0a1230, 0).setOrigin(0).setScrollFactor(0).setDepth(9e5);
      this.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9e5 + 1).setAlpha(0).setScale(1.5 / K());
      this.sel = this.add.image(0, 0, 't_sel').setOrigin(0.5, 0.5).setScale(1 / K()).setDepth(5).setVisible(false);
      this.ghost = null; this.night = null; this.walkers = [];
      this.setupInput();
      this.scale.on('resize', () => this.fit(false));
      GZ.world = this; GZ.onWorldReady && GZ.onWorldReady();
    }

    // ------------------------------------------------------------ dibujo de la aldea
    build(S) {
      this.S = S; this.R = GZ.RADIUS[S.era];
      this.tweens.killAll(); this.time.removeAllEvents(); this.dark.fillAlpha = this.night ? 0.46 : 0; this.glow.setAlpha(this.night ? 1 : 0);
      this.ground.removeAll(); this.objs.removeAll(); this.walkers.forEach(w => w.tw && w.tw.stop()); this.walkers = [];
      const { N, C } = GZ, R = this.R;
      for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
        const p = wpos(tx, ty), inside = Math.abs(tx - C) <= R && Math.abs(ty - C) <= R;
        const key = ty === 1 ? 't_water' : ty === 0 ? 't_wild' : inside ? ((tx + ty) % 2 ? 't_grass' : 't_grass2') : 't_wild';
        const im = this.add.image(p.x, p.y, key).setOrigin(0.5, 0.4).setScale(1 / K()).setDepth(p.y - 1000);
        if (!inside && ty > 1) im.setTint(0xb8c8b0);
        this.ground.add(im);
      }
      this.sprites = new Map();
      S.nature.forEach(n => { if (n.t === 'rio') return; this.addObj(n.rg > 0 ? 'n_toco' : 'n_' + n.t, n.x, n.y, n); });
      S.b.forEach(b => this.addBuilding(b));
      const fp = wpos(GZ.C, GZ.C);
      this.flame = this.add.image(fp.x, fp.y - 4, 'flame').setOrigin(0.5, 1).setScale(0.55 / K()).setDepth(fp.y + 2).setVisible(!!S.lit);
      this.objs.add(this.flame);
      this.tweens.add({ targets: this.flame, scaleY: 0.66 / K(), scaleX: 0.5 / K(), duration: 260, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.glow.setPosition(fp.x, fp.y - 10);
      // tú, Giorgio y los aliados
      const me = wpos(GZ.C, GZ.C + 1);
      this.player = this.person('p_' + S.gender, me.x - 6, me.y);
      this.cat = this.add.image(me.x + 30, me.y + 6, 'cat').setOrigin(0.5, 0.9).setScale(0.17).setDepth(me.y + 6);
      this.objs.add(this.cat); this.wander(this.cat, 0.17);
      this.allySprites = S.allies.map((a, i) => { const p = this.freeSpot(i); const s = this.person('p_aliado' + (a.look % 4), p.x, p.y); this.wander(s); return s; });
      this.fit(true);
    }
    addObj(key, tx, ty, ref) {
      const p = wpos(tx, ty), im = this.add.image(p.x, p.y, key).setOrigin(0.5, GZ.ORIGIN_Y).setScale(1 / K()).setDepth(p.y);
      this.objs.add(im); this.sprites.set(tx + ',' + ty, im); im.ref = ref; return im;
    }
    addBuilding(b) {
      const key = b.build > 0 ? 'b_obra' : 'b_' + b.t, im = this.addObj(key, b.x, b.y, b);
      if (b.broken) im.setTint(0x777777).setAlpha(0.8);
      return im;
    }
    person(key, x, y) { const s = this.add.image(x, y, key).setOrigin(0.5, 90 / 96).setScale(0.62 / K()).setDepth(y + 3); this.objs.add(s); return s; }
    freeSpot(i) { const a = (i * 2.4) + 0.6, r = 70 + (i % 3) * 18, c = wpos(GZ.C, GZ.C); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.5 + 10 }; }
    wander(s, base) {
      const c = wpos(GZ.C, GZ.C), lim = (this.R + 0.5) * 24;
      const step = () => {
        if (this.night || !s.active) return;
        const nx = Phaser.Math.Clamp(s.x + rnd(-40, 40), c.x - lim, c.x + lim), ny = Phaser.Math.Clamp(s.y + rnd(-20, 20), c.y - lim / 2, c.y + lim / 2);
        if (base) s.setFlipX(nx < s.x); else s.setFlipX(nx < s.x);
        s.tw = this.tweens.add({ targets: s, x: nx, y: ny, duration: rnd(1400, 2600), ease: 'Sine.inOut', onUpdate: () => s.setDepth(s.y + 3), onComplete: () => this.time.delayedCall(rnd(600, 2600), step) });
      };
      this.time.delayedCall(rnd(200, 1500), step); this.walkers.push(s);
    }
    flash(tx, ty) { const im = this.sprites.get(tx + ',' + ty); if (im) this.tweens.add({ targets: im, scaleY: 1.12 / K(), duration: 90, yoyo: true }); }
    pop(tx, ty, text) {
      const p = wpos(tx, ty), el = this.add.text(p.x, p.y - 40, text, { fontFamily: 'Nunito, sans-serif', fontSize: '15px', fontStyle: '900', color: '#ffffff', stroke: '#1d2a5b', strokeThickness: 4 }).setOrigin(0.5).setDepth(1e6 + 1).setResolution(this.dpr * 1.5);
      this.tweens.add({ targets: el, y: p.y - 74, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => el.destroy() });
    }

    // ------------------------------------------------------------ cámara y toques
    fit(first) {
      const w = this.scale.width, h = this.scale.height;
      this.dark.setSize(w, h);
      if (!this.S) return;
      const area = (2 * Math.min(this.R, 4) + 2.6) * TW, z = Phaser.Math.Clamp(Math.min(w / area, h / (area * 0.62)), 0.35 * this.dpr, 1.6 * this.dpr);
      const cam = this.cameras.main;
      if (first || !this.userZoom) cam.setZoom(z);
      const c = wpos(GZ.C, GZ.C);
      cam.setBounds(-GZ.N * TW / 2 - 700, -700, GZ.N * TW + 1400, GZ.N * TH + 1400);
      if (first) cam.centerOn(c.x, c.y + 10);
    }
    setupInput() {
      this.input.addPointer(1);
      let down = null, pinch = null;
      this.input.on('pointerdown', p => {
        const ps = this.input.manager.pointers.filter(q => q.isDown);
        if (ps.length >= 2) { pinch = { d: Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y), z: this.cameras.main.zoom }; down = null; return; }
        down = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false };
        if (this.night) this.throwAt(p.worldX, p.worldY);
      });
      this.input.on('pointermove', p => {
        const cam = this.cameras.main;
        if (pinch) {
          const ps = this.input.manager.pointers.filter(q => q.isDown); if (ps.length < 2) return;
          const d = Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y);
          cam.setZoom(Phaser.Math.Clamp(pinch.z * d / pinch.d, 0.3 * this.dpr, 2 * this.dpr)); this.userZoom = true; return;
        }
        if (!down || !p.isDown || this.night) return;
        const dx = p.x - down.x, dy = p.y - down.y;
        if (!down.moved && Math.hypot(dx, dy) < 10 * this.dpr) return;
        down.moved = true; cam.setScroll(down.sx - dx / cam.zoom, down.sy - dy / cam.zoom);
      });
      this.input.on('pointerup', p => {
        if (pinch) { if (!this.input.manager.pointers.some(q => q.isDown)) pinch = null; return; }
        if (down && !down.moved && !this.night) { const t = tileAt(p.worldX, p.worldY); GZ.game.tap(t.tx, t.ty); }
        down = null;
      });
      this.input.on('wheel', (p, o, dx, dy) => { const cam = this.cameras.main; cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.3 * this.dpr, 2 * this.dpr)); this.userZoom = true; });
    }
    showSel(tx, ty, kind) {
      if (tx === null) { this.sel.setVisible(false); if (this.ghost) { this.ghost.destroy(); this.ghost = null; } return; }
      const p = wpos(tx, ty);
      this.sel.setTexture(kind === 'bad' ? 't_bad' : kind === 'ok' ? 't_ok' : 't_sel').setPosition(p.x, p.y).setVisible(true).setDepth(p.y - 500);
    }
    showGhost(type, tx, ty, ok) {
      if (this.ghost) this.ghost.destroy();
      const p = wpos(tx, ty);
      this.ghost = this.add.image(p.x, p.y, 'b_' + type).setOrigin(0.5, GZ.ORIGIN_Y).setScale(1 / K()).setDepth(p.y + 0.5).setAlpha(0.75).setTint(ok ? 0xffffff : 0xff8080);
      this.showSel(tx, ty, ok ? 'ok' : 'bad');
    }
    setDay(day, instant) {
      this.tweens.add({ targets: this.dark, fillAlpha: day ? 0 : 0.46, duration: instant ? 0 : 1200 });
      this.tweens.add({ targets: this.glow, alpha: day ? 0 : 1, duration: instant ? 0 : 1200 });
    }

    // ------------------------------------------------------------ la noche
    startNight(n, onEnd) {
      const S = this.S, sc = GZ.scale(n), total = GZ.count(n), len = GZ.nightLength(n), share = GZ.runnerShare(n);
      const c = wpos(GZ.C, GZ.C), lvl = S.era;
      this.walkers.forEach(w => { if (w.tw) w.tw.stop(); });
      const spawns = [];
      for (let i = 0; i < total; i++) spawns.push({ at: 2 + (total > 1 ? i * len / (total - 1) : 0) + rnd(-0.6, 0.6), kind: Math.random() < share ? 'corredor' : 'errante' });
      spawns.sort((a, b) => a.at - b.at);
      this.night = { n, t: 0, sc, spawns, zs: [], shots: [], cd: 0, kills: 0, total, fogHp: GZ.B.fogata.hp[lvl], fogMax: GZ.B.fogata.hp[lvl], onEnd, over: false, allyCd: [] };
      // posiciones de defensa: tú junto a la fogata y los aliados en círculo
      const me = { x: c.x - 6, y: c.y + 26 };
      this.tweens.add({ targets: this.player, x: me.x, y: me.y, duration: 500, onUpdate: () => this.player.setDepth(this.player.y + 3) });
      this.allySprites.forEach((s, i) => { const a = -Math.PI / 2 + (i + 1) * (Math.PI * 2 / (this.allySprites.length + 1)), p = { x: c.x + Math.cos(a) * 46, y: c.y + 6 + Math.sin(a) * 24 }; this.tweens.add({ targets: s, x: p.x, y: p.y, duration: 600, onUpdate: () => s.setDepth(s.y + 3) }); this.night.allyCd[i] = rnd(0.3, 1.2); });
      this.tweens.add({ targets: this.cat, x: c.x + 18, y: c.y + 30, duration: 500 });
      this.setDay(false);
      GZ.ui.nightHud(this.night);
    }
    spawnZombie(kind) {
      const { N, C } = GZ, d = Math.min(this.R + 2, 7); let tx, ty;
      for (let k = 0; k < 30; k++) {
        const side = Math.floor(Math.random() * 4), o = Math.floor(rnd(-d, d + 1));
        [tx, ty] = side === 0 ? [C - d, C + o] : side === 1 ? [C + d, C + o] : side === 2 ? [C + o, C - d] : [C + o, C + d];
        tx = Phaser.Math.Clamp(tx, 0, N - 1); ty = Phaser.Math.Clamp(ty, 2, N - 1);
        if (Math.max(Math.abs(tx - C), Math.abs(ty - C)) > this.R) break;
      }
      const p = wpos(tx, ty), def = GZ.Z[kind], sc = this.night.sc;
      const s = this.add.image(p.x + rnd(-10, 10), p.y + rnd(-5, 5), 'z_' + kind).setOrigin(0.5, 90 / 96).setScale(0.62 / K()).setDepth(p.y).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 400 });
      this.objs.add(s);
      const z = { s, kind, hp: def.hp * sc.hp, max: def.hp * sc.hp, speed: def.speed * sc.speed * rnd(0.9, 1.1), dmg: def.dmg * sc.dmg, wob: rnd(0, 6) };
      this.night.zs.push(z); GZ.sfx('groan');
    }
    blocker(x, y) {
      const t = tileAt(x, y);
      if (t.tx === GZ.C && t.ty === GZ.C) return { fog: true };
      const b = this.S.b.find(q => q.x === t.tx && q.y === t.ty && q.t !== 'fogata');
      if (!b || b.broken || b.hp <= 0) return null;
      return b;
    }
    hurtBuilding(b, dmg) {
      b.hp -= dmg;
      if (b.hp <= 0) {
        b.hp = 0; const im = this.sprites.get(b.x + ',' + b.y);
        if (GZ.B[b.t].wall || GZ.B[b.t].trap) { b.gone = true; if (im) this.tweens.add({ targets: im, alpha: 0, duration: 300 }); }
        else { b.broken = true; if (im) im.setTint(0x777777).setAlpha(0.8); }
        GZ.sfx('crash');
      }
    }
    throwAt(x, y) {
      const N = this.night; if (!N || N.over || N.cd > 0) return;
      const wkey = this.S.weapon, W = GZ.WEAPONS[wkey]; N.cd = W.cd;
      const from = { x: this.player.x + 6, y: this.player.y - 30 };
      // ayuda de puntería: si tocas cerca de un zombie, apunta a donde va a estar
      let tgt = { x, y }, best = null, bd = 60 / this.cameras.main.zoom * this.dpr;
      for (const z of N.zs) { const d = Math.hypot(z.s.x - x, z.s.y - 20 - y); if (d < bd) { bd = d; best = z; } }
      this.player.setFlipX(x < this.player.x);
      if (wkey === 'lanza') {
        const ang = Math.atan2(y - from.y, x - from.x), s = this.add.image(from.x, from.y, 'spear').setScale(0.7 / K()).setRotation(ang).setDepth(1e6 - 1);
        N.shots.push({ s, kind: 'spear', vx: Math.cos(ang) * W.speed, vy: Math.sin(ang) * W.speed, left: W.range, pierce: W.pierce, dmg: W.dmg, hit: new Set() });
      } else {
        if (best) { const d = dist(from, best.s), dur = d / W.speed, v = this.zvel(best); tgt = { x: best.s.x + v.x * dur, y: best.s.y + v.y * dur }; } else tgt = { x, y: y + 18 };
        this.lob(from, tgt, W.dmg, W.radius);
      }
      GZ.sfx('throw');
    }
    lob(from, to, dmg, radius) {
      const d = dist(from, to), s = this.add.image(from.x, from.y, 'stone').setScale(0.9 / K()).setDepth(1e6 - 1);
      this.night.shots.push({ s, kind: 'stone', from, to, t: 0, dur: Math.max(0.18, d / 430), arc: Math.min(70, d * 0.35), dmg, radius });
    }
    zvel(z) {
      const c = wpos(GZ.C, GZ.C), dx = c.x - z.s.x, dy = c.y - z.s.y, L = Math.hypot(dx, dy) || 1;
      return z.blocked ? { x: 0, y: 0 } : { x: dx / L * z.speed, y: dy / L * z.speed };
    }
    damage(z, dmg) {
      z.hp -= dmg; z.hitT = 0.12;
      if (z.hp <= 0 && !z.dead) {
        z.dead = true; this.night.kills++; GZ.sfx('pop');
        const pf = this.add.image(z.s.x, z.s.y - 20, 'puff').setScale(0.6 / K()).setDepth(1e6 - 2).setTint(0xb8e08f);
        this.tweens.add({ targets: pf, scale: 2.2 / K(), alpha: 0, duration: 380, onComplete: () => pf.destroy() });
        this.tweens.add({ targets: z.s, alpha: 0, scaleY: 0.2 / K(), duration: 260, onComplete: () => z.s.destroy() });
      }
    }
    update(time, delta) {
      const N = this.night; if (!N || N.over) return;
      const dt = Math.min(0.05, delta / 1000), c = wpos(GZ.C, GZ.C);
      N.t += dt; N.cd = Math.max(0, N.cd - dt);
      while (N.spawns.length && N.spawns[0].at <= N.t) this.spawnZombie(N.spawns.shift().kind);
      // zombies
      for (const z of N.zs) {
        if (z.dead) continue;
        const s = z.s, dx = c.x - s.x, dy = c.y + 4 - s.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        z.hitT = Math.max(0, (z.hitT || 0) - dt); s.setTint(z.hitT > 0 ? 0xffaaaa : 0xffffff);
        if (L < 26) { N.fogHp -= z.dmg * dt; z.blocked = true; s.x += Math.sin(time / 90 + z.wob) * 0.3; continue; }
        const bl = this.blocker(s.x + ux * 14, s.y + uy * 14);
        if (bl && !bl.fog && !GZ.B[bl.t].trap) { this.hurtBuilding(bl, z.dmg * dt); z.blocked = true; s.x += Math.sin(time / 80 + z.wob) * 0.4; continue; }
        z.blocked = false;
        let slow = 1; const under = this.blocker(s.x, s.y);
        if (under && !under.fog && GZ.B[under.t].trap) { slow = 0.5; z.hp -= 3 * dt; under.hp -= 2 * dt; if (under.hp <= 0) this.hurtBuilding(under, 0.01); if (z.hp <= 0) { this.damage(z, 0); continue; } }
        let sx = 0, sy = 0;
        for (const o of N.zs) { if (o === z || o.dead) continue; const ox = s.x - o.s.x, oy = s.y - o.s.y, d = Math.hypot(ox, oy); if (d > 0 && d < 14) { sx += ox / d; sy += oy / d; } }
        s.x += (ux * z.speed * slow + sx * 10) * dt; s.y += (uy * z.speed * slow + sy * 6) * dt + Math.sin(time / 160 + z.wob) * 0.06;
        s.setFlipX(ux < 0).setDepth(s.y + 3);
      }
      // aliados disparan solos
      const allies = this.S.allies;
      this.allySprites.forEach((a, i) => {
        N.allyCd[i] -= dt; if (N.allyCd[i] > 0) return;
        let best = null, bd = GZ.ALLY_ATTACK.range;
        for (const z of N.zs) { if (z.dead) continue; const d = dist(a, z.s); if (d < bd) { bd = d; best = z; } }
        if (!best) { N.allyCd[i] = 0.3; return; }
        N.allyCd[i] = GZ.ALLY_ATTACK.cd * rnd(0.85, 1.15);
        const from = { x: a.x, y: a.y - 28 }, dur = dist(from, best.s) / 430, v = this.zvel(best);
        a.setFlipX(best.s.x < a.x);
        this.lob(from, { x: best.s.x + v.x * dur, y: best.s.y + v.y * dur }, GZ.ALLY_ATTACK.dmg * GZ.JOBS[allies[i].job].dmg, 16);
      });
      // proyectiles
      N.shots = N.shots.filter(p => {
        if (p.kind === 'stone') {
          p.t += dt / p.dur; const k = Math.min(1, p.t);
          p.s.setPosition(p.from.x + (p.to.x - p.from.x) * k, p.from.y + (p.to.y - p.from.y) * k - Math.sin(k * Math.PI) * p.arc).setRotation(k * 8);
          if (k < 1) return true;
          for (const z of N.zs) if (!z.dead && Math.hypot(z.s.x - p.to.x, (z.s.y - p.to.y) * 1.4) < p.radius + 8) this.damage(z, p.dmg);
          p.s.destroy(); return false;
        }
        p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.left -= Math.hypot(p.vx, p.vy) * dt;
        for (const z of N.zs) if (!z.dead && !p.hit.has(z) && Math.hypot(z.s.x - p.s.x, z.s.y - 22 - p.s.y) < 18) { p.hit.add(z); this.damage(z, p.dmg); if (--p.pierce <= 0) { p.left = 0; break; } }
        if (p.left <= 0) { p.s.destroy(); return false; }
        return true;
      });
      N.zs = N.zs.filter(z => !z.dead || z.s.active);
      // barras de vida
      const g = this.fx; g.clear();
      for (const z of N.zs) if (!z.dead && z.hp < z.max) { const w = 22, x = z.s.x - w / 2, y = z.s.y - 50; g.fillStyle(0x1d2a5b, 0.8).fillRect(x - 1, y - 1, w + 2, 5); g.fillStyle(0xe5383b).fillRect(x, y, w * Math.max(0, z.hp / z.max), 3); }
      GZ.ui.nightTick(N);
      const alive = N.zs.filter(z => !z.dead).length;
      if (N.fogHp <= 0) this.endNight(false);
      else if (!N.spawns.length && alive === 0) this.endNight(true);
    }
    endNight(win) {
      const N = this.night; N.over = true; this.fx.clear();
      N.zs.forEach(z => { if (!z.dead) this.tweens.add({ targets: z.s, alpha: 0, duration: 800, onComplete: () => z.s.destroy() }); });
      N.shots.forEach(p => p.s.destroy());
      this.time.delayedCall(win ? 700 : 1200, () => { this.night = null; this.setDay(true); N.onEnd({ win, kills: N.kills, total: N.total, fogHp: Math.max(0, N.fogHp) }); });
    }
  }
  GZ.World = World; GZ.wpos = wpos;
})();
