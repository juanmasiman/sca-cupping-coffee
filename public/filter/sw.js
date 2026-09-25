/* ============================================================
   lento — filter brew log, service worker

   A kitchen at seven in the morning may have signal and may not,
   and nothing here needs it: the whole app is served from cache
   and works with nothing behind it. There is no relay and no
   account, so offline is the normal case rather than the
   fallback.
   ============================================================ */

const VERSION = 'v2';
const SHELL_CACHE = `lento-filter-shell-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // The design system and its faces are shared across lento's apps and
  // precached by each of them: a font that only arrives with signal is a
  // font the bar never sees.
  '/shared/tokens.css',
  // The components both instruments are built from. A stylesheet that only
  // arrives with signal is a stylesheet the bar never sees.
  '/shared/components.css',
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
        names.filter(n => n.startsWith('lento-filter-') && n !== SHELL_CACHE)
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
