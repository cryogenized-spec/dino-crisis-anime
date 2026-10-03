const CACHE = 'containment-poc-v7-web';
const ASSETS = [
  './',
  './index.html',
  './src/game.css?v=7',
  './src/game.js?v=7',
  './manifest.webmanifest',
  './assets/game-atlas.webp?v=7'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
