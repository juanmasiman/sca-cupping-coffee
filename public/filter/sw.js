/* ============================================================
   lento — filter brew log, service worker

   A kitchen at seven in the morning may have signal and may not,
   and nothing here needs it: the whole app is served from cache
   and works with nothing behind it. There is an account now, and it
   changes none of that: signing in adds a copy that follows you to
   another device, and everything the app does it still does signed
   out, with no signal, for ever. Which is why the account layer is
   precached like everything else — an app that will not boot because
   its auth file did not arrive is not an offline app.
   ============================================================ */

const VERSION = 'v23';
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
  '/shared/config.js',
  '/shared/account.js',
  '/shared/account-sheet.js',
  '/shared/gear-db.js',
  '/shared/gear.js',
  '/shared/kit.js',
  '/shared/coffees.js',
  '/shared/temp.js',
  '/shared/beans.js',
  '/shared/recipes.js',
  '/shared/brewers.js',
  '/shared/grind.js',
  '/shared/wheel.js',
  '/shared/wheel.css',
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
