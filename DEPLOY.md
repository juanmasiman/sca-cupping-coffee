# Deploying to lento.cafe/cupping

The app is a static site (no build step) plus one optional Cloudflare Worker for live join codes. The simplest stack that serves both from the same domain is **Cloudflare Pages + Workers** (free tier covers all of it).

## 1. Point lento.cafe at Cloudflare

If the domain isn't on Cloudflare yet: Cloudflare dashboard → Add a domain → `lento.cafe` → follow the nameserver instructions at your registrar. (Skip if you bought it through Cloudflare.)

## 2. Deploy the app (Cloudflare Pages)

1. Workers & Pages → **Create → Pages → Connect to Git** → pick `juanmasiman/sca-cupping-coffee`, production branch `main`.
2. Build settings: no framework, **no build command**, output directory `/`.
3. Deploy, then **Custom domains → add `lento.cafe`**.

The repo is already laid out for the domain: the root `index.html` is a small lento.cafe landing page, and the app lives in `cupping/`, so `lento.cafe/cupping/` just works.

## 3. Deploy the live-code relay (optional but recommended)

Enables Apple-TV-style 4-digit join codes. Without it, QR and link/code sharing still work — the app hides the live-code UI automatically when the relay is unreachable.

1. Workers & Pages → **Create → Worker** → paste `server/cloudflare-worker.js`.
2. Worker → Settings → **Bindings → KV namespace**: binding name `CUPPINGS` (create the namespace when prompted).
3. Worker → Settings → **Domains & Routes → add route** `lento.cafe/cupping/api/*` on the `lento.cafe` zone.

Live codes expire after 12 hours; nothing else is stored.

## 4. Enable sign-in + cloud history sync (optional)

Without this, the app runs device-only and the profile sheet says cloud sync isn't configured — nothing breaks. To enable Apple/Google sign-in:

1. Create a free project at [supabase.com](https://supabase.com) (any name, e.g. `lento-cupping`).
2. SQL Editor → paste and run `server/supabase-schema.sql` (creates the `cuppings` table with row-level security).
3. Authentication → URL Configuration → set **Site URL** to `https://lento.cafe/cupping/`.
4. **Google provider** (free): in [Google Cloud Console](https://console.cloud.google.com) create a project → OAuth consent screen (External) → Credentials → Create OAuth client ID (Web application). Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`. Copy client ID + secret into Supabase → Authentication → Providers → Google.
5. **Email magic links** (free, works out of the box): the Email provider is enabled by default, so the "Send link" option already works using Supabase's built-in mailer. That mailer is rate-limited (a few emails/hour) — fine for testing; before real launch plug in a free SMTP sender (e.g. Resend or Brevo) under Authentication → SMTP settings, sending from something like `cupping@lento.cafe`.
6. Put the project's URL and anon key into `app.js`:

```js
const SUPABASE_URL = window.SUPABASE_URL || 'https://<your-project-ref>.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '<anon public key>';
```

The anon key is designed to be public — row-level security is what protects user data. Alternatively define `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` in a small inline script before `app.js` and leave the source untouched.

## 5. Check the constants

`app.js` points at production:

```js
const APP_URL   = 'https://lento.cafe/cupping/';
const RELAY_URL = 'https://lento.cafe/cupping/api';
```

If the path or domain changes, update these two lines.
