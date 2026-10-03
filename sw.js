const CACHE = 'containment-poc-v8-new-fire';
const ASSETS = [
  './', './index.html', './src/game.css?v=8', './src/game.js?v=8', './manifest.webmanifest',
  './assets/facility-dusk.webp?v=8',
  './assets/animation/regina-idle-right.webp?v=8',
  './assets/animation/regina-jog-right.webp?v=8',
  './assets/animation/regina-aim-raise-right.webp?v=8',
  './assets/animation/regina-aim-hold-right.webp?v=8',
  './assets/animation/regina-fire-right.webp?v=8',
  './assets/animation/sprites.json'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));