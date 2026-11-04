'use strict';
// Giorgio Turbo: música original generada en el momento con WebAudio (sin archivos ni derechos de terceros).
// Cada escenario tiene su propia progresión de acordes; el tempo sube con el nivel.
(function (root) {
  const KEY = 'gg_turbo_music';
  // notas MIDI de la raíz de cada acorde (4 compases) y escala para el arpegio
  const SONGS = [
    { roots: [45, 41, 48, 43], scale: [0, 3, 5, 7, 10, 12, 15, 17] },
    { roots: [43, 48, 45, 41], scale: [0, 2, 4, 7, 9, 12, 14, 16] },
    { roots: [41, 45, 43, 48], scale: [0, 2, 4, 7, 9, 12, 16, 19] },
    { roots: [40, 43, 38, 45], scale: [0, 3, 5, 7, 10, 12, 15, 19] },
    { roots: [38, 45, 41, 43], scale: [0, 3, 7, 10, 12, 15, 19, 22] },
  ];
  const ARP = [0, 2, 4, 2, 5, 4, 2, 6, 0, 3, 4, 2, 5, 6, 4, 7];
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  let ac = null, out = null, timer = 0, song = SONGS[0], bpm = 124, step = 0, next = 0, playing = false;
  let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* nada */ }

  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    out = ac.createGain(); out.gain.value = 0.2;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    out.connect(lp).connect(ac.destination);
  }
  function tone(f, t, d, type, v, slide) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.02);
  }
  function hat(t, v) {
    const n = ac.sampleRate * 0.04, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = v;
    s.connect(f).connect(g).connect(out); s.start(t);
  }
  function play16(i, t) {
    const s16 = 60 / bpm / 4, bar = Math.floor(i / 16) % 4, k = i % 16, root = song.roots[bar], section = Math.floor(i / 64) % 4;
    if (k % 4 === 0) tone(150, t, 0.16, 'sine', 0.9, 45);                                  // bombo
    if (k % 4 === 2) hat(t, 0.28);
    if (k === 4 || k === 12) hat(t, 0.45);
    if (k % 2 === 0) tone(freq(root - 12 + (k % 8 === 6 ? 12 : 0)), t, s16 * 1.8, 'sawtooth', 0.26);    // bajo
    if (section > 0) tone(freq(root + 24 + song.scale[ARP[k] % song.scale.length]), t, s16 * 1.5, 'square', 0.075);   // arpegio
    if (k === 0) for (const n of [0, 7, 12]) tone(freq(root + 12 + n), t, s16 * 15, 'triangle', 0.08); // acorde de fondo
    if (section === 3 && k % 4 === 3) tone(freq(root + 36 + song.scale[(i >> 2) % song.scale.length]), t, s16 * 2, 'triangle', 0.1); // melodía alta
  }
  function pump() {
    if (!playing) return;
    while (next < ac.currentTime + 0.14) { play16(step++, next); next += 60 / bpm / 4; }
    timer = setTimeout(pump, 40);
  }
  function start(level) {
    if (!on) { stop(); return; }
    try {
      init(); if (ac.state === 'suspended') ac.resume();
      song = SONGS[Math.min(SONGS.length - 1, Math.floor((level - 1) / 5))]; bpm = Math.min(158, 122 + level * 1.4);
      if (playing) return;
      playing = true; step = 0; next = ac.currentTime + 0.06; pump();
    } catch (e) { /* sin audio */ }
  }
  function stop() { playing = false; clearTimeout(timer); }
  function toggle(level) { on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* nada */ } if (on && level) start(level); else stop(); return on; }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (playing) { ac.resume(); next = ac.currentTime + 0.06; } });
  root.TurboMusic = { start, stop, toggle, get on() { return on; } };
})(window);
