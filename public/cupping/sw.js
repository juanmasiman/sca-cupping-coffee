/* ============================================================
   SCA Cupping — service worker

   Cupping happens in lab basements, at origin, and in warehouses
   with one bar of signal, so the whole app is served from cache
   and works with no network at all. Only the live-code relay
   needs to reach the internet, and it fails softly when it can't.
   ============================================================ */

const VERSION = 'v41';
const SHELL_CACHE = `lento-cupping-shell-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  '/shared/config.js',
  '/shared/account.js',
  '/shared/wheel.js',
  '/shared/wheel.css',
  './app.js',
  './qrcode.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // The design system and its faces are shared across lento's apps and
  // precached by each of them, for the same reason everything else here is:
  // a font that only arrives with signal is a font the basement never sees.
  '/shared/tokens.css',
  '/shared/fonts/plex-sans-var.woff2',
  '/shared/fonts/plex-mono-400.woff2',
  '/shared/fonts/plex-mono-600.woff2',
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
        // Scoped for the same reason as below: another app's index.html
        // is not this one's, and offline is exactly when that would show.
        .catch(() => caches.match('./index.html', { ignoreSearch: true, cacheName: SHELL_CACHE })
          .then(hit => hit || caches.match('./', { cacheName: SHELL_CACHE })))
    );
    return;
  }

  // Everything else: serve from cache immediately, refresh in the background.
  event.respondWith(
  /* FROM THIS WORKER'S OWN CACHE, AND NO OTHER.

     `caches.match(request)` with no cacheName searches EVERY cache in
     the origin. There are four workers here and all of them precache
     /shared/*.js, so a file could be answered out of a sibling app's
     cache — a copy frozen whenever THAT app's version was last bumped,
     which has nothing to do with this one.

     It is not theoretical. The front door shipped a `home.js` that calls
     `LentoCoffees.ageWord`, and the espresso app's cache still held a
     `/shared/coffees.js` from before that function existed. New caller,
     old callee, and the page died on boot with "ageWord is not a
     function" — reported from a phone, not from a test.

     Scoped, every file a page gets comes from one cache with one version
     behind it, which is the whole point of naming the cache after the
     version. */
    caches.match(request, { cacheName: SHELL_CACHE }).then(hit => {
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
