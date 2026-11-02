'use strict';
// Guerra Zombie: reglas del juego (día, construir, recolectar, aliados, amanecer) y arranque.
(() => {
  const D = GZ;
  const cheb = (x, y) => Math.max(Math.abs(x - D.C), Math.abs(y - D.C));
  const canPay = (S, cost) => Object.entries(cost).every(([k, v]) => (S.res[k] || 0) >= v);
  const pay = (S, cost) => Object.entries(cost).forEach(([k, v]) => { S.res[k] -= v; });
  const add = (into, give, f) => Object.entries(give).forEach(([k, v]) => { into[k] = (into[k] || 0) + Math.round(v * (f || 1)); });
  const fmtCost = cost => Object.entries(cost).map(([k, v]) => v + ' ' + D.RES[k].icon).join('  ');
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function genNature(seed) {
    const r = rng(seed), out = [], fixed = { '5,6': 'arbol', '9,8': 'arbol', '6,9': 'roca', '8,5': 'roca', '9,6': 'arbusto', '5,8': 'arbol', '8,9': 'roca' };
    for (let y = 2; y < D.N; y++) for (let x = 0; x < D.N; x++) {
      const d = cheb(x, y); if (d <= 1) continue;
      const f = fixed[x + ',' + y]; if (f) { out.push({ x, y, t: f, rg: 0 }); continue; }
      const p = r(), inner = d <= D.RADIUS[0];
      if (p > (inner ? 0.14 : 0.48)) continue;
      const q = r(), t = inner ? (q < 0.45 ? 'arbol' : q < 0.8 ? 'roca' : 'arbusto') : (q < 0.6 ? 'arbol' : q < 0.85 ? 'roca' : 'arbusto');
      out.push({ x, y, t, rg: 0 });
    }
    return out;
  }
  function newGame(o) {
    const seed = (Math.random() * 1e9) | 0;
    return {
      seed, name: o.name, gender: o.gender, mode: o.mode, day: 1, lit: false, era: 0, res: Object.assign({}, D.START), moral: 70, energy: D.ENERGY,
      b: [{ id: 1, t: 'fogata', x: D.C, y: D.C, lvl: 1, hp: D.B.fogata.hp[0], build: 0 }], nature: genNature(seed), allies: [], quest: 0,
      weapon: 'piedra', hasLanza: false, best: 0, streak: 0, kills: 0, nightsWon: 0, story: {}, nextId: 2,
    };
  }
  const beds = S => S.b.reduce((a, b) => a + (!b.build && !b.broken && D.B[b.t].beds ? D.B[b.t].beds : 0), 0);
  const freeBeds = S => beds(S) - 1 - S.allies.length;
  const countOf = (S, t) => S.b.filter(b => b.t === t).length;
  function buildable(S, t) {
    const d = D.B[t];
    if (d.era > S.era) return 'Era ' + d.era + ' (' + D.ERAS[d.era] + ')';
    if (d.need && !D.has(S, d.need, true)) return 'Necesitas ' + D.B[d.need].name;
    if (countOf(S, t) >= d.max) return 'Máximo ' + d.max;
    if (!S.lit && t !== 'tienda') return 'Enciende la fogata';
    return '';
  }

  const G = {
    S: null, placing: null, target: null,
    canPay, fmtCost, beds, freeBeds, buildable, countOf,
    async boot() {
      GZ.ui.boot();
      if (!GZ.store.user()) { GZ.ui.gate(); return; }
      const saved = await GZ.store.load();
      GZ.ui.title(saved);
    },
    newGame(o) { this.S = newGame(o); GZ.store.save(this.S, true); return this.S; },
    start(S) {
      this.S = S;
      const go = () => { GZ.world.build(S); GZ.ui.hud(S); GZ.ui.quest(S); if (S.quest === 0 && S.day === 1) GZ.ui.narr('Llegaste al campo con Giorgio. Antes de que oscurezca, junta palos: toca los árboles 🌳 cerca de la fogata.'); };
      if (GZ.world) go(); else GZ.onWorldReady = go;
    },
    save(now) { GZ.store.save(this.S, now); },
    changed() { this.checkQuests(); GZ.ui.hud(this.S); this.save(); },
    checkQuests() {
      const S = this.S; let moved = false;
      while (S.quest < D.QUESTS.length - 1 && D.QUESTS[S.quest].check(S)) { S.quest++; moved = true; }
      if (moved) { GZ.ui.quest(S); GZ.ui.narr(D.QUESTS[S.quest].text); GZ.sfx('quest'); }
    },

    // ------------------------------------------------------------ toques en la aldea
    tap(tx, ty) {
      const S = this.S; if (!S || GZ.ui.busy()) return;
      if (tx < 0 || ty < 0 || tx >= D.N || ty >= D.N) return;
      if (this.placing) return this.placeTap(tx, ty);
      const b = S.b.find(q => q.x === tx && q.y === ty);
      if (b) { GZ.world.showSel(tx, ty); GZ.ui.buildingSheet(b); return; }
      const n = S.nature.find(q => q.x === tx && q.y === ty);
      if (n && n.rg === 0) return this.gather(n.t, tx, ty, n);
      if (ty === 1) return this.gather('rio', tx, ty, null);
      GZ.world.showSel(tx, ty); setTimeout(() => GZ.world.showSel(null), 300);
    },
    gather(t, tx, ty, n) {
      const S = this.S, R = D.RADIUS[S.era];
      if (cheb(tx, ty) > R + 1) { GZ.ui.toast('Está muy lejos. Mejora la fogata para llegar más allá.'); return; }
      if (S.energy <= 0) { GZ.ui.toast('Ya no te quedan fuerzas hoy ⚡. Pasa la noche para descansar.'); return; }
      const give = D.NATURE[t].give; add(S.res, give); S.energy--;
      if (n) { n.rg = D.NATURE[t].regrow; const im = GZ.world.sprites.get(tx + ',' + ty); if (im) im.setTexture('n_toco'); }
      GZ.world.pop(tx, ty, Object.entries(give).map(([k, v]) => '+' + v + ' ' + D.RES[k].icon).join(' '));
      GZ.sfx('gather'); this.changed();
    },
    // ------------------------------------------------------------ construir
    startPlacing(t) {
      const why = buildable(this.S, t); if (why) { GZ.ui.toast(why); return; }
      if (!canPay(this.S, D.B[t].cost)) { GZ.ui.toast('Te faltan recursos: ' + fmtCost(D.B[t].cost)); return; }
      this.placing = t; this.target = null; GZ.ui.placingBar(t, null);
    },
    validTile(tx, ty) {
      const S = this.S;
      if (ty < 2 || cheb(tx, ty) > D.RADIUS[S.era]) return 'Fuera de tu terreno';
      if (S.b.some(b => b.x === tx && b.y === ty)) return 'Ya hay algo construido';
      const n = S.nature.find(q => q.x === tx && q.y === ty);
      if (n && n.rg === 0) return 'Primero recoge lo que hay ahí';
      return '';
    },
    placeTap(tx, ty) {
      const why = this.validTile(tx, ty);
      if (this.target && this.target.tx === tx && this.target.ty === ty && !why) return this.confirmPlace();
      this.target = { tx, ty, ok: !why }; GZ.world.showGhost(this.placing, tx, ty, !why); GZ.ui.placingBar(this.placing, this.target, why);
    },
    confirmPlace() {
      const S = this.S, t = this.placing, d = D.B[t], tg = this.target;
      if (!tg || !tg.ok || !canPay(S, d.cost)) return;
      pay(S, d.cost);
      S.nature = S.nature.filter(q => !(q.x === tg.tx && q.y === tg.ty));
      const b = { id: S.nextId++, t, x: tg.tx, y: tg.ty, lvl: 1, hp: d.hp, build: d.days };
      S.b.push(b);
      const keep = (d.wall || d.trap) && canPay(S, d.cost) && countOf(S, t) < d.max;   // muros y estacas: sigues colocando
      GZ.world.showSel(null); const old = GZ.world.sprites.get(tg.tx + ',' + tg.ty); if (old) old.destroy();
      GZ.world.addBuilding(b); GZ.world.flash(tg.tx, tg.ty); GZ.sfx('build');
      if (d.days) GZ.ui.toast(d.name + ': listo en ' + d.days + (d.days === 1 ? ' día' : ' días') + ' (al amanecer).');
      this.target = null;
      if (keep) GZ.ui.placingBar(t, null); else this.cancelPlace();
      this.changed();
    },
    cancelPlace() { this.placing = null; this.target = null; GZ.world.showSel(null); GZ.ui.placingBar(null); },
    // ------------------------------------------------------------ acciones sobre edificios
    lightFire() {
      const S = this.S; if (S.lit) return;
      if (!canPay(S, D.FOGATA_LIGHT)) { GZ.ui.toast('Necesitas ' + fmtCost(D.FOGATA_LIGHT)); return; }
      pay(S, D.FOGATA_LIGHT); S.lit = true; GZ.world.flame.setVisible(true); GZ.sfx('fire'); GZ.ui.closeSheet(); this.changed();
    },
    upgradeFire() {
      const S = this.S, U = D.FOGATA_UP;
      if (S.era >= 1) return;
      if (!D.has(S, U.need, true)) { GZ.ui.toast('Necesitas el ' + D.B[U.need].name + ' terminado.'); return; }
      if (S.allies.length < U.allies) { GZ.ui.toast('Necesitas ' + U.allies + ' aliados.'); return; }
      if (!canPay(S, U.cost)) { GZ.ui.toast('Te faltan recursos: ' + fmtCost(U.cost)); return; }
      pay(S, U.cost); S.era = 1;
      const f = S.b.find(b => b.t === 'fogata'); f.lvl = 2; f.hp = D.B.fogata.hp[1];
      GZ.ui.closeSheet(); GZ.world.build(S); GZ.sfx('quest');
      GZ.ui.narr('¡La fogata arde más fuerte! Entras en la era de Piedra y palos: tu terreno crece, y ya puedes construir cabañas, huertos y la pedrera. En el taller puedes hacer una lanza.');
      this.changed();
    },
    craftSpear() {
      const S = this.S; if (S.hasLanza) return;
      if (!canPay(S, D.LANZA.cost)) { GZ.ui.toast('Necesitas ' + fmtCost(D.LANZA.cost)); return; }
      pay(S, D.LANZA.cost); S.hasLanza = true; S.weapon = 'lanza'; GZ.sfx('build'); GZ.ui.closeSheet();
      GZ.ui.narr('¡Lanza lista! Atraviesa a dos zombies y hace más daño, pero tarda más. De noche puedes cambiar entre piedra y lanza.');
      this.changed();
    },
    repair(b) {
      const cost = {}; Object.entries(D.B[b.t].cost).forEach(([k, v]) => { cost[k] = Math.ceil(v / 2); });
      if (!canPay(this.S, cost)) { GZ.ui.toast('Reparar cuesta ' + fmtCost(cost)); return; }
      pay(this.S, cost); b.broken = false; b.hp = D.B[b.t].hp; GZ.ui.closeSheet(); GZ.world.build(this.S); this.changed();
    },
    remove(b) { this.S.b = this.S.b.filter(q => q !== b); GZ.ui.closeSheet(); GZ.world.build(this.S); this.changed(); },
    repairCost(b) { const c = {}; Object.entries(D.B[b.t].cost).forEach(([k, v]) => { c[k] = Math.ceil(v / 2); }); return c; },

    // ------------------------------------------------------------ noche y amanecer
    night() {
      const S = this.S;
      if (!S.lit) { GZ.ui.narr('Sin fuego no hay luz para defenderte. Primero toca la fogata y enciéndela.'); return; }
      if (this.placing) this.cancelPlace();
      GZ.ui.confirmNight(S, () => {
        GZ.ui.dayMode(false); GZ.sfx('night');
        GZ.world.startNight(S.day, r => this.afterNight(r));
      });
    },
    afterNight(r) {
      const S = this.S;
      S.kills += r.kills;
      S.b = S.b.filter(b => !b.gone);
      if (!r.win && S.mode === 'dificil') { S.best = Math.max(S.best, S.day - 1); GZ.store.wipe(); GZ.ui.gameOver(S); return; }
      const lost = {};
      if (r.win) { S.streak++; S.nightsWon++; }
      else { S.streak = 0; Object.keys(S.res).forEach(k => { lost[k] = Math.floor(S.res[k] * 0.3); S.res[k] -= lost[k]; }); }
      const sum = this.dawn(r.win);
      sum.lost = lost;
      GZ.world.build(S); GZ.ui.dayMode(true); GZ.ui.hud(S);
      GZ.ui.dawnSheet(S, r, sum, () => { this.checkQuests(); if (sum.ally) GZ.ui.narr(sum.ally.intro); });
      this.save(true);
    },
    dawn(win) {
      const S = this.S, sum = { prod: {}, done: [], ally: null, left: null, short: 0 };
      S.b.forEach(b => {
        const d = D.B[b.t];
        if (b.build > 0) { b.build--; if (!b.build) sum.done.push(d.name); return; }
        if (b.broken) return;
        b.hp = b.t === 'fogata' ? d.hp[S.era] : d.hp;
        if (d.prod) add(sum.prod, d.prod);
      });
      S.allies.forEach(a => add(sum.prod, D.JOBS[a.job].bonus));
      add(S.res, sum.prod);
      const people = 1 + S.allies.length;
      ['comida', 'agua'].forEach(k => { S.res[k] -= people; if (S.res[k] < 0) { sum.short += -S.res[k]; S.res[k] = 0; } });
      sum.eat = people;
      S.moral += sum.short ? -8 * sum.short : 3; S.moral += win ? 4 : -20;
      S.moral = Math.max(0, Math.min(100, S.moral));
      if (S.moral < 20 && S.allies.length) { sum.left = S.allies.pop(); S.moral += 15; }
      S.nature.forEach(n => { if (n.rg > 0) n.rg--; });
      S.energy = D.ENERGY;
      // supervivientes que llegan
      if (!S.story.rosa && freeBeds(S) > 0) { S.story.rosa = true; sum.ally = { name: 'Rosa', job: 'recolector', look: 1, intro: 'Al amanecer llegó Rosa, que vio tu fogata desde el bosque. Es recolectora: cada día trae comida y agua. ¡Ya no estás solo! Construye una Pila de palos.' }; }
      else if (freeBeds(S) > 0 && (Math.random() < 0.5 || S.day % 3 === 0)) {
        const used = new Set(S.allies.map(a => a.name)), name = D.NAMES.filter(n => !used.has(n))[Math.floor(Math.random() * 10)] || 'Alex';
        const jobs = Object.keys(D.JOBS), job = jobs[Math.floor(Math.random() * jobs.length)];
        sum.ally = { name, job, look: Math.floor(Math.random() * 4), intro: name + ' llegó a tu refugio: es ' + D.JOBS[job].name.toLowerCase().replace('/a', '') + '. Más manos para trabajar… y una boca más que alimentar.' };
      }
      if (sum.ally) S.allies.push({ name: sum.ally.name, job: sum.ally.job, look: sum.ally.look });
      S.day++; S.best = Math.max(S.best, S.day - 1);
      return sum;
    },
  };
  GZ.game = G;

  // ------------------------------------------------------------ sonidos (WebAudio, sin archivos)
  let ac = null;
  const SFX = { throw: [[520, 0, 0.06, 'triangle', 0.08]], pop: [[180, 0, 0.12, 'square', 0.07], [120, 0.05, 0.12, 'sine', 0.08]], gather: [[660, 0, 0.06, 'triangle', 0.08], [880, 0.05, 0.08, 'triangle', 0.06]],
    build: [[300, 0, 0.08, 'square', 0.06], [400, 0.08, 0.08, 'square', 0.06]], fire: [[200, 0, 0.3, 'sawtooth', 0.04]], quest: [[523, 0, 0.1, 'triangle', 0.08], [659, 0.1, 0.1, 'triangle', 0.08], [784, 0.2, 0.16, 'triangle', 0.08]],
    groan: [[110, 0, 0.35, 'sawtooth', 0.025]], crash: [[90, 0, 0.18, 'square', 0.07]], night: [[330, 0, 0.3, 'sine', 0.06], [247, 0.3, 0.5, 'sine', 0.06]], dawn: [[392, 0, 0.15, 'triangle', 0.07], [523, 0.15, 0.25, 'triangle', 0.07]], lose: [[300, 0, 0.3, 'sawtooth', 0.05], [200, 0.3, 0.5, 'sawtooth', 0.05]] };
  GZ.sfx = name => {
    try { if (localStorage.getItem('gz_mute') === '1') return; } catch (e) { /* nada */ }
    const seq = SFX[name]; if (!seq) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime + 0.01;
      for (const [f, at, dur, type, vol] of seq) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0 + at); g.gain.setValueAtTime(vol, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur); o.connect(g).connect(ac.destination); o.start(t0 + at); o.stop(t0 + at + dur + 0.02); }
    } catch (e) { /* sin audio */ }
  };

  // ------------------------------------------------------------ arranque de Phaser (nítido en pantallas de alta densidad)
  GZ.dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = () => Math.round(innerWidth * GZ.dpr), H = () => Math.round(innerHeight * GZ.dpr);
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'stage', backgroundColor: '#3f7030', scale: { mode: Phaser.Scale.NONE, width: W(), height: H(), zoom: 1 / GZ.dpr }, render: { antialias: true }, scene: [GZ.World], banner: false });
  addEventListener('resize', () => { game.scale.resize(W(), H()); game.scale.setZoom(1 / GZ.dpr); });
  G.boot();
})();
