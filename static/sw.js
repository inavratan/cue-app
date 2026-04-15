const CACHE_NAME = 'cue-v2.0.0';
const STATIC_ASSETS = ['/', '/style.css', '/app.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))));
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) { e.respondWith(fetch(e.request)); return; }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
