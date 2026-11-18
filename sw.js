// Service worker: makes the site installable and usable offline.
// Strategy is network-first, so visitors always get the latest version when online and the
// last copy they loaded when offline. Only same-origin GET requests are handled.
const CACHE = 'plssize-v1';
const CORE = [
  './', 'index.html', 'compare.html', 'size-chart.html', 'progress.html', 'how-to-measure.html',
  'camera-measure.html', 'condom-recommendations.html', 'methodology.html', 'user-info.html',
  'css/site.css', 'js/boot.js', 'js/layout.js', 'js/stats.js', 'js/store.js', 'js/config.js',
  'android-chrome-192x192.png', 'site.webmanifest',
];

self.addEventListener('install', (event) => {
  // Best effort: a missing file must not stop the worker from installing.
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url)))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(request, { ignoreSearch: true })) ?? Response.error()),
  );
});
