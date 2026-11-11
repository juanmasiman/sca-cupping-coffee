/* ============================================================
   lento — extraction, service worker

   A refractometer reading gets taken wherever the grinder is, which
   on this site's evidence is as often a cellar as a counter. The whole
   page is served from cache and works with nothing behind it.

   WHY THIS SHELL IS SHORTER THAN THE OTHER THREE.

   It is not an omission. This page is one self-contained file: no
   app.js, no stylesheet of its own, and none of /shared's model —
   no coffees, no gear, no kit, no account. It computes a number from
   three numbers you type and keeps its own log under its own key, so
   the only things it needs are the design system and its faces.

   If it ever grows an account or reads the shelf, the list grows with
   it, and the version below goes up. A worker whose shell has drifted
   from what the page loads is a page that half-arrives offline.
   ============================================================ */

const VERSION = 'v1';
const SHELL_CACHE = `lento-extraction-shell-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // The design system and its faces are shared across lento's apps and
  // precached by each of them: a font that only arrives with signal is a
  // font the bar never sees, and so is a stylesheet.
  '/shared/tokens.css',
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
        names.filter(n => n.startsWith('lento-extraction-') && n !== SHELL_CACHE)
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
     the origin. There are five workers here now and every one of them
     precaches /shared/tokens.css and /shared/components.css, so a file
     could be answered out of a sibling app's cache — a copy frozen
     whenever THAT app's version was last bumped, which has nothing to do
     with this one.

     It is not theoretical. The front door shipped a `home.js` calling
     `LentoCoffees.ageWord` while the espresso app's cache still held a
     `/shared/coffees.js` from before that function existed. New caller,
     old callee, and the page died on boot — reported from a phone, not
     from a test. This worker is scoped from its first line so it never
     joins that. */
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
