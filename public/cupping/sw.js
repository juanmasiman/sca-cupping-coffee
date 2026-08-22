/* ============================================================
   SCA Cupping — service worker

   Cupping happens in lab basements, at origin, and in warehouses
   with one bar of signal, so the whole app is served from cache
   and works with no network at all. Only the live-code relay
   needs to reach the internet, and it fails softly when it can't.
   ============================================================ */

const VERSION = 'v2';
const SHELL_CACHE = `lento-cupping-shell-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './app.js',
  './qrcode.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n.startsWith('lento-cupping-') && n !== SHELL_CACHE)
          .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The relay is live data — never served from cache, and allowed to fail
  // so the app can fall back to QR and long codes.
  if (url.pathname.includes('/cupping/api/')) return;

  // Navigations: try the network so deploys land promptly, fall back to
  // the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Everything else: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(request).then(hit => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
