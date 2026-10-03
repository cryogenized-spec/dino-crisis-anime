const CACHE = 'containment-poc-v6-web';
const ASSETS = [
  './', './index.html', './src/game.css?v=6', './src/game.js?v=6', './manifest.webmanifest',
  './assets/atlas/part-00.b64','./assets/atlas/part-01.b64','./assets/atlas/part-02.b64','./assets/atlas/part-03.b64'
  './assets/atlas/part-04.b64','./assets/atlas/part-05.b64','./assets/atlas/part-06.b64','./assets/atlas/part-07.b64'
  './assets/atlas/part-08.b64','./assets/atlas/part-09.b64','./assets/atlas/part-10.b64','./assets/atlas/part-11.b64'
  './assets/atlas/part-12.b64','./assets/atlas/part-13.b64','./assets/atlas/part-14.b64','./assets/atlas/part-15.b64'
  './assets/atlas/part-16.b64','./assets/atlas/part-17.b64','./assets/atlas/part-18.b64','./assets/atlas/part-19.b64'
  './assets/atlas/part-20.b64','./assets/atlas/part-21.b64','./assets/atlas/part-22.b64','./assets/atlas/part-23.b64'
  './assets/atlas/part-24.b64','./assets/atlas/part-25.b64','./assets/atlas/part-26.b64','./assets/atlas/part-27.b64'
  './assets/atlas/part-28.b64','./assets/atlas/part-29.b64','./assets/atlas/part-30.b64','./assets/atlas/part-31.b64'
  './assets/atlas/part-32.b64','./assets/atlas/part-33.b64'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
