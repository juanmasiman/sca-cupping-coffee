/* ============================================================
   lento — the front door, service worker

   This page had no worker for as long as it was only a list of links:
   somewhere you passed through once and then installed the thing you
   came for. Two changes made that wrong. It holds the account now, and
   every instrument has a way back to it — so an offline dial-in with a
   door that opens onto a browser error is a door this project put there.

   SCOPE, AND WHY THIS DOES NOT TAKE OVER THE APPS

   This worker's scope is the whole origin, and each app registers its own
   at its own path. A client is controlled by the registration with the
   longest matching scope, so a page at /espresso/ is controlled by
   /espresso/sw.js and never by this one. This worker sees the front door
   and nothing else.
   ============================================================ */

/* The version is what keeps a new page and an old script from meeting.
   Assets are served cache-first here and navigations are network-first,
   so without a new cache name a returning visitor gets the new markup
   alongside the script that went looking for the element it replaced.

   v2 — the account moved from a fixed corner button into a row.
   v4 — the shelf and the gear arrived, which added two shared scripts to
        the shell and two sections to the page that the old home.js knows
        nothing about.
   v5 — those two sections became two buttons and four sheets, and the
        brewer table came along to describe what is on the shelf.
   v6 — deletions became writes, which added the tombstone paths.
   v7 — the gear catalogue and store arrived as two new shared scripts,
        and the brewer table moved into the catalogue.
   v8 — the gear sheet became a record that expands, which is markup and
        wiring the old home.js has no idea about.
   v9 — the shelf says how old a bag is, which is a new export on
        /shared/coffees.js and a style the old sheet has no rule for.
   v10 — the brewer's method arrived, which is another shared script.
   v11 — not a content change: the fetch handler was answering out of
        whichever cache in the origin happened to hold the file, which
        on a site with four workers meant another app's copy. Bumped so
        the fix reaches a device that already has a worker. */
const VERSION = 'v12';
const SHELL_CACHE = `lento-home-shell-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './home.js',
  '/shared/tokens.css',
  '/shared/components.css',
  '/shared/config.js',
  '/shared/account.js',
  '/shared/account-sheet.js',
  '/shared/gear-db.js',
  '/shared/gear.js',
  '/shared/kit.js',
  '/shared/coffees.js',
  '/shared/temp.js',
  '/shared/recipes.js',
  '/shared/brewers.js',
  '/shared/fonts/plex-sans-var.woff2',
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
        names.filter(n => n.startsWith('lento-home-') && n !== SHELL_CACHE)
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

  /* An instrument's own worker handles the instrument. If one of those is
     not installed yet, the network handles it — what this worker must not
     do is answer for a page it does not hold, because a cache miss served
     as a miss is a blank screen where a redirect belonged. */
  if (/^\/(cupping|espresso|filter)\//.test(url.pathname)) return;

  // Navigations: network first so a deploy lands promptly, cached shell
  // when there is nothing behind it.
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

  // Everything else: from cache at once, refreshed behind it.
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
