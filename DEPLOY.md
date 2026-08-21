# Deploying to lento.cafe/cupping

The app is a static site (no build step) plus one optional Cloudflare Worker for live join codes. The simplest stack that serves both from the same domain is **Cloudflare Pages + Workers** (free tier covers all of it).

## 1. Point lento.cafe at Cloudflare

If the domain isn't on Cloudflare yet: Cloudflare dashboard → Add a domain → `lento.cafe` → follow the nameserver instructions at your registrar. (Skip if you bought it through Cloudflare.)

## 2. Deploy the app (Cloudflare Pages)

1. Workers & Pages → **Create → Pages → Connect to Git** → pick `juanmasiman/sca-cupping-coffee`.
2. Build settings: no framework, **no build command**, output directory `/`.
3. Deploy, then **Custom domains → add `lento.cafe`**.

To serve the app under the `/cupping/` path specifically, either:
- keep the repo files at the root and add a redirect from `/cupping/*` (Pages → `_redirects` file), or
- simplest: move the app files into a `cupping/` folder in the repo so `lento.cafe/cupping/` maps naturally. A landing page for lento.cafe itself can live at the root later.

## 3. Deploy the live-code relay (optional but recommended)

Enables Apple-TV-style 4-digit join codes. Without it, QR and link/code sharing still work — the app hides the live-code UI automatically when the relay is unreachable.

1. Workers & Pages → **Create → Worker** → paste `server/cloudflare-worker.js`.
2. Worker → Settings → **Bindings → KV namespace**: binding name `CUPPINGS` (create the namespace when prompted).
3. Worker → Settings → **Domains & Routes → add route** `lento.cafe/cupping/api/*` on the `lento.cafe` zone.

Live codes expire after 12 hours; nothing else is stored.

## 4. Check the constants

`app.js` points at production:

```js
const APP_URL   = 'https://lento.cafe/cupping/';
const RELAY_URL = 'https://lento.cafe/cupping/api';
```

If the path or domain changes, update these two lines.
