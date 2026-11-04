'use strict';
// Giorgio Turbo: tema original compuesto para el juego y tocado en vivo con WebAudio (sin archivos ni derechos de terceros).
// Forma de 32 compases: intro, estribillo, respuesta, pausa, estribillo grande. Cada escenario cambia la tonalidad y el tempo sube con el nivel.
(function (root) {
  const KEY = 'gg_turbo_music';
  const CHORDS = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65], [38, 57, 62, 65], [40, 56, 59, 64]];
  // [semicorchea dentro de 4 compases, nota MIDI, duración]
  const HOOK = [[0, 76, 3], [3, 79, 3], [6, 81, 2], [8, 79, 2], [10, 76, 2], [12, 74, 4], [16, 72, 3], [19, 74, 3], [22, 76, 2], [24, 72, 2], [26, 69, 2], [28, 72, 4], [32, 79, 3], [35, 76, 3], [38, 79, 2], [40, 84, 4], [44, 83, 2], [46, 79, 2], [48, 74, 3], [51, 76, 3], [54, 79, 2], [56, 83, 6], [62, 81, 2]];
  const ANSWER = [[0, 81, 3], [3, 84, 3], [6, 88, 2], [8, 86, 4], [12, 84, 2], [14, 81, 2], [16, 77, 3], [19, 81, 3], [22, 84, 2], [24, 81, 4], [28, 77, 4], [32, 74, 3], [35, 77, 3], [38, 81, 2], [40, 86, 6], [46, 84, 2], [48, 80, 4], [52, 83, 2], [54, 86, 2], [56, 88, 8]];
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
  const KEYS = [0, 2, -3, 3, -2];
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  let ac = null, bus = null, duck = null, echo = null, noise = null, timer = 0, tr = 0, bpm = 146, step = 0, next = 0, playing = false;
  let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* nada */ }

  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    const master = ac.createGain(); master.gain.value = 0.5;
    bus = ac.createGain(); duck = ac.createGain();
    bus.connect(comp); duck.connect(bus); comp.connect(master).connect(ac.destination);
    echo = ac.createDelay(1); const fb = ac.createGain(), wet = ac.createGain(), lp = ac.createBiquadFilter();
    fb.gain.value = 0.34; wet.gain.value = 0.3; lp.type = 'lowpass'; lp.frequency.value = 3200;
    echo.connect(lp).connect(fb).connect(echo); lp.connect(wet).connect(duck);
    const n = ac.sampleRate * 0.25; noise = ac.createBuffer(1, n, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11); env(g, t, 0.002, 1, 0.2);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.22);
    duck.gain.setValueAtTime(0.4, t); duck.gain.linearRampToValueAtTime(1, t + 60 / bpm * 0.75);   // el resto "respira" con cada golpe
  }
  function hit(t, type, f, v, d) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise; fl.type = type; fl.frequency.value = f; env(g, t, 0.001, v, d);
    s.connect(fl).connect(g).connect(bus); s.start(t); s.stop(t + d + 0.02);
  }
  function bass(m, t, d) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = freq(m); f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + d); env(g, t, 0.004, 0.36, d);
    o.connect(f).connect(g).connect(duck); o.start(t); o.stop(t + d + 0.02);
  }
  function lead(m, t, d, v) {
    const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(1500, t + d);
    env(g, t, 0.008, v, d + 0.06);
    for (const c of [-9, 9, 0]) { const o = ac.createOscillator(); o.type = c ? 'sawtooth' : 'square'; o.frequency.value = freq(m); o.detune.value = c; o.connect(f); o.start(t); o.stop(t + d + 0.1); }
    f.connect(g); g.connect(duck); g.connect(echo);
  }
  function pad(notes, t, d, v) {
    const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; env(g, t, 0.12, v, d);
    for (const m of notes) for (const c of [-7, 7]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq(m); o.detune.value = c; o.connect(f); o.start(t); o.stop(t + d + 0.05); }
    f.connect(g).connect(duck);
  }
  function melody(list, pos, t, s, v, up) { for (const [at, m, d] of list) if (at === pos) lead(m + tr + (up || 0), t, d * s * 0.92, v); }
  function play16(i, t) {
    const s = 60 / bpm / 4, k = i % 16, bar = Math.floor(i / 16) % 32, ch = CHORDS[bar % 8], root_ = ch[0] + tr - 12, pos = (bar % 4) * 16 + k;
    const intro = bar < 4, brk = bar >= 12 && bar < 16, big = bar >= 16;
    if (!brk) { if (k % 4 === 0) kick(t); if (k === 4 || k === 12) hit(t, 'bandpass', 1900, intro ? 0.22 : 0.42, 0.13); }
    if (k % 2 === 1 && !brk) hit(t, 'highpass', 8000, k % 4 === 3 ? 0.17 : 0.09, 0.04);
    if (!brk && [0, 3, 6, 8, 11, 14].includes(k)) bass(root_ + (k === 14 ? 12 : 0), t, s * 2.2);
    if (k === 0) pad(ch.slice(1).map(m => m + tr), t, s * 16, brk ? 0.11 : 0.07);
    if (!intro) { const n = ch[1 + ARP[k % 8] % 3] + tr + 12; if (k % 2 === 0 || brk) lead(n, t, s * 0.9, brk ? 0.05 : 0.028); }
    if (bar >= 4 && bar < 8) melody(HOOK, pos, t, s, 0.09);
    else if (bar >= 8 && bar < 12) melody(ANSWER, pos, t, s, 0.09);
    else if (bar >= 16 && bar < 20) { melody(HOOK, pos, t, s, 0.09); melody(HOOK, pos, t, s, 0.04, 12); }
    else if (bar >= 20 && bar < 24) { melody(ANSWER, pos, t, s, 0.09); melody(ANSWER, pos, t, s, 0.04, 12); }
    else if (bar >= 24 && bar < 28) melody(HOOK, pos, t, s, 0.1, 12);
    else if (bar >= 28) melody(ANSWER, pos, t, s, 0.1);
    if (brk && bar === 15 && k >= 8 && k % 2 === 0) hit(t, 'bandpass', 1600 + k * 300, 0.1 + k * 0.016, 0.1);    // redoble antes de volver
    if (big && k === 0 && bar % 4 === 0) hit(t, 'highpass', 5000, 0.3, 0.5);
  }
  function pump() {
    if (!playing) return;
    while (next < ac.currentTime + 0.16) { play16(step++, next); next += 60 / bpm / 4; }
    timer = setTimeout(pump, 40);
  }
  function start(level) {
    if (!on) { stop(); return; }
    try {
      init(); if (ac.state === 'suspended') ac.resume();
      tr = KEYS[Math.min(KEYS.length - 1, Math.floor((level - 1) / 5))]; bpm = Math.min(170, 142 + level * 1.1);
      echo.delayTime.value = 60 / bpm * 0.75;
      if (playing) return;
      playing = true; step = 0; next = ac.currentTime + 0.06; pump();
    } catch (e) { /* sin audio */ }
  }
  function stop() { playing = false; clearTimeout(timer); }
  function toggle(level) { on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* nada */ } if (on && level) start(level); else stop(); return on; }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (playing) { ac.resume(); next = ac.currentTime + 0.06; } });
  root.TurboMusic = { start, stop, toggle, get on() { return on; } };
})(window);
