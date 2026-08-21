# Deploying to lento.cafe

The whole site is one Cloudflare Worker: it serves the static files in `public/` and the cupping live-code API at `/cupping/api/*`. No build step, no second project.

```
public/index.html          → lento.cafe          (landing page)
public/cupping/            → lento.cafe/cupping  (the app)
worker/index.js            → lento.cafe/cupping/api/*
wrangler.jsonc             → Worker config
```

## 1. Point lento.cafe at Cloudflare

Add the domain in the Cloudflare dashboard and set your registrar's nameservers to the two Cloudflare gives you. DNSSEC must be **off** at the registrar during the switch. Wait until the domain shows **Active** — a freshly registered domain can take a few hours.

## 2. Deploy the Worker

Workers & Pages → **Create → Workers → Import a repository** → `juanmasiman/sca-cupping-coffee`, production branch `main`. Cloudflare reads `wrangler.jsonc`, so leave the build command empty. Each push to `main` redeploys automatically.

You get a `*.workers.dev` URL immediately — the real site, testable before the domain is ready.

## 3. Attach the domain

In the Worker → **Settings → Domains & Routes → Add → Custom domain** → `lento.cafe`. Cloudflare creates the DNS record itself. Add `www.lento.cafe` the same way if you want it.

## 4. Turn on live join codes (optional)

Live codes are the Apple-TV-style 4-digit codes for joining a cupping. Without them, QR codes and share links still work — they carry the session data themselves — and the app hides the live-code UI automatically.

1. Storage & Databases → **KV → Create namespace**, name it `CUPPINGS`, and copy its **namespace ID**.
2. In `wrangler.jsonc`, uncomment the `kv_namespaces` block and paste the ID:

```jsonc
"kv_namespaces": [
  { "binding": "CUPPINGS", "id": "your-namespace-id" }
]
```

3. Commit and push — the Worker redeploys with KV attached.

Codes expire after 12 hours; nothing else is stored.

## 5. Sign-in and cloud history sync (optional)

Without this, history stays on each device and the profile sheet says so. To enable Google and email sign-in:

1. Create a free project at [supabase.com](https://supabase.com).
2. SQL Editor → run `server/supabase-schema.sql` (creates the `cuppings` table with row-level security).
3. Authentication → URL Configuration → **Site URL**: `https://lento.cafe/cupping/`.
4. **Google provider** (free): in [Google Cloud Console](https://console.cloud.google.com) create a project → OAuth consent screen (External) → Credentials → OAuth client ID (Web application), with authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase → Authentication → Providers → Google.
5. **Email magic links** work out of the box using Supabase's built-in mailer, which is rate-limited to a few messages an hour. Before real launch, add free SMTP (Resend, Brevo) under Authentication → SMTP settings so mail comes from `cupping@lento.cafe`.
6. Put the project URL and anon key into `public/cupping/app.js`:

```js
const SUPABASE_URL = window.SUPABASE_URL || 'https://<project-ref>.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '<anon public key>';
```

The anon key is meant to be public — row-level security is what protects user data.

## Local development

```sh
npx wrangler dev
```

Serves the site and API at `http://localhost:8787`. The app derives its own URLs from wherever it's served, so QR codes and API calls work on localhost, on `*.workers.dev`, and on lento.cafe with no config changes.
