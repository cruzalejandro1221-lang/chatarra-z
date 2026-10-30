'use strict';
// Todo el sonido se sintetiza con WebAudio: sin archivos externos.
const SFX = (() => {
  let ac = null, sfxGain = null, musGain = null, noiseBuf = null;
  const last = {};
  let musTimer = null, step = 0, nextT = 0, intensity = 0, musPlaying = false;

  function init() {
    if (ac) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(master);
    sfxGain = ac.createGain(); sfxGain.connect(comp);
    musGain = ac.createGain(); musGain.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
  }
  function apply() {
    if (!ac) return;
    sfxGain.gain.value = SAVE.sound ? 1 : 0;
    musGain.gain.value = SAVE.music ? 0.16 : 0;
  }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }
  function ok(name, gap) {
    if (!ac || !SAVE.sound) return false;
    const t = ac.currentTime;
    if (last[name] && t - last[name] < gap) return false;
    last[name] = t;
    return true;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(t, dur, type, freq, q, peak, dec, dest) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ac.createGain(); env(g, t, 0.004, peak, dec);
    s.connect(f); f.connect(g); g.connect(dest || sfxGain);
    s.start(t, Math.random() * 1.2); s.stop(t + dur);
    return f;
  }
  function tone(t, type, f0, f1, peak, dec, dest, a) {
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dec);
    const g = ac.createGain(); env(g, t, a || 0.004, peak, dec);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + (a || 0.004) + dec + 0.05);
    return o;
  }
  const now = () => ac.currentTime;

  const S = {
    init, resume, apply,
    shoot() { if (!ok('shoot', 0.05)) return; const t = now(); noise(t, 0.1, 'highpass', 2600, 0.7, 0.22, 0.07); tone(t, 'triangle', 700, 260, 0.1, 0.07); },
    hit() { if (!ok('hit', 0.035)) return; const t = now(); tone(t, 'sine', 200 + Math.random() * 60, 80, 0.22, 0.08); noise(t, 0.05, 'bandpass', 1100, 1, 0.1, 0.04); },
    clank() { if (!ok('clank', 0.05)) return; const t = now(); tone(t, 'square', 900 + Math.random() * 300, 500, 0.06, 0.09); tone(t, 'triangle', 2400, 1800, 0.05, 0.12); },
    boom(big) {
      if (!ok('boom', 0.05)) return; const t = now(); const k = big ? 1 : 0.6;
      noise(t, 1.4, 'lowpass', big ? 800 : 1300, 0.7, 0.9 * k, big ? 1.1 : 0.5);
      tone(t, 'sine', big ? 110 : 150, 28, 0.8 * k, big ? 0.7 : 0.35);
    },
    thump() { if (!ok('thump', 0.06)) return; const t = now(); tone(t, 'sine', 90, 40, 0.5, 0.25); noise(t, 0.3, 'lowpass', 400, 1, 0.35, 0.2); },
    zap() {
      if (!ok('zap', 0.06)) return; const t = now();
      const o = tone(t, 'sawtooth', 1400, 200, 0.12, 0.22);
      for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(300 + Math.random() * 1800, t + i * 0.03);
      noise(t, 0.2, 'highpass', 3000, 1, 0.12, 0.18);
    },
    flame() { if (!ok('flame', 0.16)) return; const t = now(); noise(t, 0.35, 'bandpass', 500 + Math.random() * 200, 0.6, 0.16, 0.28); },
    coin() { if (!ok('coin', 0.045)) return; const t = now(); tone(t, 'square', 1320, null, 0.045, 0.05); tone(t + 0.045, 'square', 1980, null, 0.045, 0.08); },
    place() { if (!ac || !SAVE.sound) return; const t = now(); tone(t, 'square', 200, 80, 0.16, 0.12); noise(t, 0.12, 'lowpass', 900, 1, 0.3, 0.1); tone(t + 0.07, 'triangle', 1200, 900, 0.06, 0.08); },
    upgrade() { if (!ac || !SAVE.sound) return; const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, 'square', f, null, 0.06, 0.12)); },
    sell() { if (!ac || !SAVE.sound) return; const t = now(); [784, 523].forEach((f, i) => tone(t + i * 0.07, 'triangle', f, null, 0.1, 0.12)); },
    deny() { if (!ok('deny', 0.15)) return; const t = now(); tone(t, 'square', 160, 120, 0.1, 0.15); },
    click() { if (!ac || !SAVE.sound) return; tone(now(), 'square', 620, null, 0.04, 0.03); },
    splat() { if (!ok('splat', 0.04)) return; const t = now(); noise(t, 0.18, 'lowpass', 500, 2, 0.3, 0.14); },
    groan(boss) {
      if (!ok(boss ? 'roar' : 'groan', boss ? 2 : 1.4)) return; const t = now();
      const f = boss ? 55 : 85 + Math.random() * 50;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 0.75, t + (boss ? 1.4 : 0.8));
      const lfo = ac.createOscillator(); lfo.frequency.value = boss ? 9 : 6; const lg = ac.createGain(); lg.gain.value = f * 0.06;
      lfo.connect(lg); lg.connect(o.frequency);
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = boss ? 500 : 700; fl.Q.value = 4;
      const g = ac.createGain(); env(g, t, 0.15, boss ? 0.35 : 0.09, boss ? 1.3 : 0.7);
      o.connect(fl); fl.connect(g); g.connect(sfxGain);
      o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6);
    },
    horn() {
      if (!ac || !SAVE.sound) return; const t = now();
      [110, 138.6, 165].forEach(f => { const o = tone(t, 'sawtooth', f * 0.9, null, 0.09, 1.3, null, 0.25); o.frequency.linearRampToValueAtTime(f, t + 0.3); });
      noise(t, 1.4, 'bandpass', 300, 2, 0.08, 1.2);
    },
    rail() { if (!ok('rail', 0.1)) return; const t = now(); tone(t, 'sawtooth', 2400, 80, 0.2, 0.5); noise(t, 0.5, 'highpass', 1500, 1, 0.25, 0.45); tone(t, 'sine', 70, 30, 0.6, 0.4); },
    saw() { if (!ok('saw', 0.1)) return; const t = now(); const o = tone(t, 'sawtooth', 900, 1300, 0.05, 0.25); o.detune.value = 30; },
    thunder() { if (!ac || !SAVE.sound) return; const t = now(); noise(t, 2.5, 'lowpass', 300, 0.5, 0.5, 2.2); },
    win() { if (!ac || !SAVE.sound) return; const t = now(); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(t + i * 0.11, 'square', f, null, 0.07, i === 5 ? 0.6 : 0.12)); },
    lose() { if (!ac || !SAVE.sound) return; const t = now(); [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.22, 'sawtooth', f, f * 0.97, 0.08, 0.3)); },
    setIntensity(v) { intensity = v; },
    music(on) {
      if (!ac) return;
      if (on && !musPlaying) { musPlaying = true; step = 0; nextT = ac.currentTime + 0.1; musTimer = setInterval(sched, 30); }
      else if (!on && musPlaying) { musPlaying = false; clearInterval(musTimer); }
    },
  };

  // Música: ostinato de bajo + batería procedural; se intensifica durante las oleadas.
  const ROOTS = [55, 55, 43.65, 49];
  function sched() {
    if (!ac) return;
    const spb = 60 / 104 / 4;
    while (nextT < ac.currentTime + 0.15) { playStep(step, nextT); nextT += spb; step = (step + 1) % 64; }
  }
  function playStep(s, t) {
    if (!SAVE.music) return;
    const r = ROOTS[(s >> 4) % 4], i = s % 16;
    if (i % 4 === 0) { tone(t, 'sine', 120, 38, 0.5, 0.18, musGain); }
    if (intensity > 0 && (i === 6 || i === 10)) tone(t, 'sine', 110, 40, 0.35, 0.15, musGain);
    if (i % 2 === 1) noise(t, 0.05, 'highpass', 7000, 1, intensity ? 0.12 : 0.05, 0.03, musGain);
    if (intensity > 0 && i % 8 === 4) noise(t, 0.2, 'bandpass', 1800, 0.8, 0.22, 0.12, musGain);
    if ([0, 3, 6, 8, 11, 14].includes(i)) {
      const f = r * (i === 6 || i === 14 ? 1.5 : i === 11 ? 1.2 : 1);
      const o = tone(t, 'sawtooth', f, null, 0.22, 0.16, musGain);
      o.detune.value = -8;
    }
    if (i === 0 && (s >> 4) % 2 === 0) {
      [r * 4, r * 4.76, r * 6].forEach(f => tone(t, 'triangle', f, null, 0.035, 1.6, musGain, 0.3));
    }
  }
  return S;
})();
