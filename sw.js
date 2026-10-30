// Service worker de Giorgio Games: funciona sin conexión y se actualiza solo.
// Código (páginas, scripts, estilos): primero la red, así siempre ves la última versión; si no hay red, la copia guardada.
// Imágenes y video: primero la copia guardada y se refresca en segundo plano.
// Las llamadas a Supabase (otro dominio) nunca pasan por aquí: los datos de la cuenta no se guardan en caché.
const CACHE = 'gg-v3';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'account.js', 'vendor/supabase.min.js', 'manifest.webmanifest', 'icons/icon-192.png',
  'media/giorgio/cara.webp', 'media/giorgio/principal.webp', 'media/giorgio/feliz.webp', 'media/giorgio/triste.webp', 'media/giorgio/pensando.webp', 'media/giorgio/guino.webp', 'media/giorgio/asoma.webp',
  'game/index.html', 'game/style.css', 'game/js/util.js', 'game/js/data.js', 'game/js/save.js', 'game/js/audio.js',
  'game/js/art.js', 'game/js/art2.js', 'game/js/game.js', 'game/js/ui.js', 'game/js/main.js',
  'clasicos/clasicos.css', 'clasicos/core.js', 'clasicos/vendor/peerjs.min.js',
  'clasicos/chess-engine.js', 'clasicos/chess-worker.js', 'clasicos/ajedrez.js',
  'clasicos/poker-engine.js', 'clasicos/poker.js', 'clasicos/batalla-engine.js', 'clasicos/batalla.js',
  'clasicos/ludo-engine.js', 'clasicos/ludo.js',
  'media/chatarra-thumb.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || req.headers.has('range')) return;
  const code = req.mode === 'navigate' || ['script', 'style', 'worker', 'manifest'].includes(req.destination) || /\.(js|css|html|webmanifest)$/.test(new URL(req.url).pathname);
  if (code) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
