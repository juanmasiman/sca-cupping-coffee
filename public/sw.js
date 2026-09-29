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
        brewer table came along to describe what is on the shelf. */
const VERSION = 'v6';
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
  '/shared/kit.js',
  '/shared/coffees.js',
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
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Everything else: from cache at once, refreshed behind it.
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
