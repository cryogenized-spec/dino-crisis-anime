const CACHE = 'containment-poc-v5-web';
const ASSETS = [
  './', './index.html', './src/game.css?v=5', './src/game.js?v=5', './manifest.webmanifest',
  './assets/atlas/part-00.b64','./assets/atlas/part-01.b64','./assets/atlas/part-02.b64','./assets/atlas/part-03.b64',
  './assets/atlas/part-04.b64','./assets/atlas/part-05.b64','./assets/atlas/part-06.b64','./assets/atlas/part-07.b64',
  './assets/atlas/part-08.b64','./assets/atlas/part-09.b64','./assets/atlas/part-10.b64','./assets/atlas/part-11.b64',
  './assets/atlas/part-12.b64','./assets/atlas/part-13.b64','./assets/atlas/part-14.b64','./assets/atlas/part-15.b64'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
