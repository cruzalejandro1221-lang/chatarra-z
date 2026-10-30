// Prueba de carga simple contra Supabase (solo lectura pública: top de jugadores y "¿usuario libre?").
// Uso: node tools/load-test.cjs [peticiones=600] [simultáneas=60]
const fs = require('fs');
const cfg = fs.readFileSync(__dirname + '/../config.js', 'utf8');
const URL = cfg.match(/supabaseUrl: '([^']+)'/)[1], KEY = cfg.match(/supabaseAnonKey: '([^']+)'/)[1];
const N = +process.argv[2] || 600, C = +process.argv[3] || 60;
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const calls = [
  () => fetch(URL + '/rest/v1/rpc/leaderboard', { method: 'POST', headers: H, body: '{"p_limit":10}' }),
  () => fetch(URL + '/rest/v1/rpc/username_available', { method: 'POST', headers: H, body: JSON.stringify({ p_username: 'u' + Math.random().toString(36).slice(2, 10) }) }),
];
(async () => {
  const times = [], codes = {}; let i = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: C }, async () => {
    while (i < N) {
      const k = i++, s = Date.now();
      try { const r = await calls[k % 2](); await r.text(); codes[r.status] = (codes[r.status] || 0) + 1; }
      catch (e) { codes.error = (codes.error || 0) + 1; }
      times.push(Date.now() - s);
    }
  }));
  const secs = (Date.now() - t0) / 1000; times.sort((a, b) => a - b);
  const p = q => times[Math.min(times.length - 1, Math.floor(times.length * q))];
  console.log(`${N} peticiones, ${C} a la vez, en ${secs.toFixed(1)} s → ${(N / secs).toFixed(0)} por segundo`);
  console.log(`tiempo de respuesta: mediana ${p(.5)} ms · 95% ${p(.95)} ms · peor ${times[times.length - 1]} ms`);
  console.log('códigos:', JSON.stringify(codes));
})();
