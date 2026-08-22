# Deploying to lento.cafe

## Open to-dos

- [x] **Custom SMTP** — sending through Google Workspace (`smtp.gmail.com`, port 465) with an app password, from `jm@lento.cafe` as "LENTO! Cupping". Delivers to the inbox because lento.cafe is already SPF/DKIM-authenticated for Google.
- [ ] **Paste the branded sign-in email into Supabase.** Authentication → Emails → **Magic Link**. Replace **both** fields: the subject (default is "Your sign in link") with something like `Your lento sign-in code`, and the body with `server/email-magic-link.html` from this repo. Not cosmetic — the default body contains only `{{ .ConfirmationURL }}`, so the **6-digit code does not appear in the email** until this is done.
- [ ] **Create a `cupping@lento.cafe` alias** in Google Workspace (Admin console → Users → your user → Add alias, or a Group of that name), then switch the Supabase sender to it so sign-in mail isn't tied to a personal mailbox.
- [x] **Google sign-in** — OAuth client wired into Supabase and working.
- [ ] **Google consent screen shows the Supabase project URL** ("sign in to albzajlwlotjnexymazb.supabase.co") because Supabase owns the OAuth callback. Setting the app name, logo and `lento.cafe` as an authorized domain in the Google consent screen improves it for free. Removing the raw URL entirely needs Supabase's Custom Domains add-on, so auth runs at `auth.lento.cafe` — a paid add-on on top of the Pro plan.
- [ ] **Full UX/UI review pass.**


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

## Sending sign-in email from lento.cafe

Supabase's built-in mailer is shared, rate-limited to a few messages an hour, and has poor sender reputation — mail lands in junk, where spam scanners follow the sign-in link and consume its one-time token. Custom SMTP fixes all of that.

### Quickest unblock: Resend's test sender (no DNS)

Supabase locks email-template editing until custom SMTP exists, and Resend will send from `onboarding@resend.dev` with no domain verification — but **only to the address you signed up with**. That is enough to unlock the templates and test your own sign-in:

1. Sign up at [resend.com](https://resend.com).
2. **API Keys → Create API Key** (sending access). Copy it.
3. Supabase → **Project Settings → Authentication → SMTP Settings** → enable Custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, password = the API key, sender email `onboarding@resend.dev`, sender name `lento`.
4. Save. Template editing unlocks — paste `server/email-magic-link.html` into Authentication → Emails → Magic Link.

Then verify the domain below to send to anyone from `cupping@lento.cafe`.

### Full setup: verify lento.cafe

**Resend** (free: 3,000 emails/month, 100/day) with the domain already on Cloudflare:

1. Sign up at [resend.com](https://resend.com) → **Domains → Add Domain** → `lento.cafe`.
2. Resend shows a set of DNS records. Add each one in Cloudflare → lento.cafe → **DNS → Records → Add record**, copying the type, name and value exactly. They are typically:
   - an **MX** record on a `send` subdomain (bounce handling),
   - a **TXT** SPF record on that same subdomain,
   - a **TXT** DKIM record at `resend._domainkey`.

   MX and TXT records have no proxy option, so there is nothing to toggle.

   > **Do not touch the existing MX records on the root domain** — those are Google Workspace, and changing them breaks your mail. Resend deliberately uses a subdomain so the two coexist.
3. Back in Resend, click **Verify**. Usually a few minutes.
4. Resend → **API Keys → Create API Key** (send access is enough). Copy it — it is shown once.
5. Supabase → **Project Settings → Authentication → SMTP Settings** → enable **Custom SMTP**:
   - Host `smtp.resend.com`
   - Port `465`
   - Username `resend`
   - Password: the API key from step 4
   - Sender email `cupping@lento.cafe`
   - Sender name `lento`
6. Save, then send yourself a sign-in code from the app to confirm it arrives in the inbox.
7. Supabase → Authentication → **Rate Limits** → raise the email limit, which the built-in mailer had pinned low.

Brevo (300/day free) works the same way if you prefer it; only the host and credentials differ.

## Local development

```sh
npx wrangler dev
```

Serves the site and API at `http://localhost:8787`. The app derives its own URLs from wherever it's served, so QR codes and API calls work on localhost, on `*.workers.dev`, and on lento.cafe with no config changes.
