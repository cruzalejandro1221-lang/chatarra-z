'use strict';
// Reverse Audio (pestaña Trend): graba hasta 10 s con el micrófono y reprodúcelo normal o al revés.
// Todo ocurre en el celular: el audio no se envía ni se guarda en ningún servidor.
(() => {
  const MAX = 10;
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const READY = '¡Listo! Escúchalo normal o al revés 👇';

  window.FiestaReverse = function (api) {
    const { screen, $, cleanups, fx, buzz } = api;
    let buf = null, rec = null, stream = null, src = null, tick = 0, t0 = 0, ac = null, state = 'idle';
    const ctxA = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
    screen('Reverse Audio', '<div class="ra"><p class="ra-hint" id="raHint">Graba hasta 10 segundos y escúchalo al revés 🔁</p><div class="ra-bar"><i id="raFill"></i></div><output class="ra-time" id="raTime">0:00 / 0:10</output>' +
      '<button class="ra-btn rec" id="raRec"><span>🎙️</span><b>Grabar</b><small>Máx. 10 segundos</small></button>' +
      '<button class="ra-btn play" id="raPlay" disabled><span>▶️</span><b>Reproducir</b><small>Normal</small></button>' +
      '<button class="ra-btn rev" id="raRev" disabled><span>⏪</span><b>Al revés</b><small>Reverse</small></button></div>', () => {
      const hint = $('#raHint'), fill = $('#raFill'), time = $('#raTime'), bRec = $('#raRec'), bPlay = $('#raPlay'), bRev = $('#raRev');
      const set = (st, msg) => {
        state = st; if (msg) hint.textContent = msg;
        bRec.classList.toggle('on', st === 'rec'); bRec.querySelector('b').textContent = st === 'rec' ? 'Detener' : buf ? 'Grabar de nuevo' : 'Grabar'; bRec.querySelector('span').textContent = st === 'rec' ? '⏹️' : '🎙️';
        bPlay.disabled = bRev.disabled = !buf || st === 'rec' || st === 'busy';
        bPlay.classList.toggle('on', st === 'play'); bRev.classList.toggle('on', st === 'rev');
        bPlay.querySelector('b').textContent = st === 'play' ? 'Detener' : 'Reproducir'; bRev.querySelector('b').textContent = st === 'rev' ? 'Detener' : 'Al revés';
      };
      const stopSrc = () => { if (src) { src.onended = null; try { src.stop(); } catch (e) { /* nada */ } src = null; } };
      const freeMic = () => { clearInterval(tick); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
      cleanups.push(() => {
        stopSrc(); freeMic();
        try { if (rec && rec.state !== 'inactive') { rec.ondataavailable = rec.onstop = null; rec.stop(); } } catch (e) { /* nada */ }
        try { if (ac) ac.close(); } catch (e) { /* nada */ } ac = null;
      });
      const prog = sec => { fill.style.width = Math.min(100, sec / MAX * 100) + '%'; time.textContent = fmt(Math.floor(sec)) + ' / 0:10'; };
      const stopRec = () => { clearInterval(tick); if (rec && rec.state !== 'inactive') rec.stop(); };

      async function startRec() {
        stopSrc();
        if (!navigator.mediaDevices || !window.MediaRecorder) { set('idle', 'Tu navegador no permite grabar audio.'); return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch (e) { set('idle', 'Necesito permiso del micrófono. Actívalo en tu navegador y vuelve a intentar.'); return; }
        const chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          freeMic(); set('busy', 'Procesando…');
          try {
            const raw = await new Blob(chunks, { type: rec.mimeType }).arrayBuffer();
            buf = await ctxA().decodeAudioData(raw);
            if (buf.duration > MAX) {                                  // por si el navegador grabó de más
              const n = Math.floor(MAX * buf.sampleRate), cut = ctxA().createBuffer(buf.numberOfChannels, n, buf.sampleRate);
              for (let c = 0; c < buf.numberOfChannels; c++) cut.copyToChannel(buf.getChannelData(c).subarray(0, n), c);
              buf = cut;
            }
            prog(buf.duration); set('idle', READY); fx('notify');
          } catch (e) { buf = null; prog(0); set('idle', 'No se pudo procesar el audio. Intenta de nuevo.'); }
        };
        const a = ctxA(); if (a.resume) a.resume();
        rec.start(); t0 = Date.now(); buf = null; prog(0); set('rec', 'Grabando… ¡habla ahora!'); buzz(20);
        tick = setInterval(() => { const sec = (Date.now() - t0) / 1000; prog(sec); if (sec >= MAX) stopRec(); }, 100);
      }
      function play(reverse) {
        const st = reverse ? 'rev' : 'play';
        if (state === st) { stopSrc(); set('idle', READY); return; }
        stopSrc(); const a = ctxA(); if (a.resume) a.resume();
        let b = buf;
        if (reverse) { b = a.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c).slice(); d.reverse(); b.copyToChannel(d, c); } }
        src = a.createBufferSource(); src.buffer = b; src.connect(a.destination);
        src.onended = () => { src = null; set('idle', READY); };
        src.start(); set(st, reverse ? 'Sonando al revés… 🔁' : 'Sonando…');
      }
      bRec.onclick = () => { if (state === 'rec') stopRec(); else if (state !== 'busy') startRec(); };
      bPlay.onclick = () => play(false); bRev.onclick = () => play(true);
      set('idle');
    });
  };
})();
