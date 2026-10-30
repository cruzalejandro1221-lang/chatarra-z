// Service worker de Giorgio Games: funciona sin conexión y se actualiza solo.
// Páginas: primero la red (para ver siempre la última versión); el resto: caché y se refresca en segundo plano.
const CACHE = 'gg-v1';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png',
  'game/index.html', 'game/style.css', 'game/js/util.js', 'game/js/data.js', 'game/js/save.js', 'game/js/audio.js',
  'game/js/art.js', 'game/js/art2.js', 'game/js/game.js', 'game/js/ui.js', 'game/js/main.js',
  'media/chatarra-thumb.jpg', 'media/chatarra-loop.mp4'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
