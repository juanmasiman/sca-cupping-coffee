/* ============================================================
   lento.cafe — Cloudflare Worker

   Serves the static site (public/) and the cupping live-code API
   from one deployment:

     POST /cupping/api/sessions                     → { code, token }
     PUT  /cupping/api/sessions/{code}              → update lineup (leader)
     GET  /cupping/api/sessions/{code}              → { payload, revealed }
     POST /cupping/api/sessions/{code}/participants → { id }
     PUT  /cupping/api/sessions/{code}/participants/{id} → submit scores
     GET  /cupping/api/sessions/{code}/participants → { participants, revealed }
     POST /cupping/api/sessions/{code}/reveal       → open the scores (leader)
     everything else                                → static assets

   The SCA protocol has cuppers score independently and only then
   compare, so submitted scores stay sealed: the roster reports who
   has submitted, and individual numbers are withheld from every
   response until the leader reveals the session.

   Live codes are the Apple-TV-style short codes for joining a
   cupping. They need a KV namespace bound as CUPPINGS; until one
   is bound the API returns 503 and the app quietly falls back to
   QR and link sharing, which need no server at all.

   Keys: s:{code} holds the session, p:{code}:{id} holds one
   participant (name lives in KV metadata so listing is one call).
   ============================================================ */

const TTL_SECONDS = 12 * 60 * 60; // live codes last 12 hours
const MAX_BODY_BYTES = 24 * 1024; // a 10-coffee lineup is ~3 KB
const CODE_ATTEMPTS = 25;
const MAX_PARTICIPANTS = 60;

// The app is served from the same origin as this API, so no other site
// needs to call it. Keeping the list closed means a hostile page cannot
// drive the relay on a visitor's behalf.
const ALLOWED_ORIGINS = [
  'https://lento.cafe',
  'https://www.lento.cafe',
  'https://sca-cupping-coffee.arc-heli.workers.dev',
];

/* Headers every response carries.

   nosniff, so a JSON or text response can never be read as a script;
   no framing, so another site cannot lay lento.cafe under a transparent
   iframe and borrow a tap (the reveal is one button, and irreversible);
   a referrer that stops at the origin; and no camera, microphone or
   location, which nothing here uses. No full Content-Security-Policy yet:
   the pages carry inline scripts and styles, and a policy loose enough to
   allow them would mostly be a promise. frame-ancestors is the one
   directive that holds regardless.

   Static files are served by Cloudflare without running this Worker, so
   they get the same list from public/_headers. Keep the two in step. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

function withSecurityHeaders(res) {
  const out = new Response(res.body, res);
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => out.headers.set(k, v));
  return out;
}

/* Per-address limits on the three calls that cost nothing to repeat and
   something to answer: minting a code, looking one up, and taking a seat.
   A four-digit code is ten thousand guesses, and without a limit a script
   could walk them and fill any table it found with sixty empty seats.
   With one, a single address gets 60 of each a minute — room for a whole
   cupping on one café's wifi to join at once.

   Optional: the binding is LIMITER in wrangler.jsonc. Without it every
   call is allowed, exactly as before. */
async function overLimit(env, request, kind) {
  if (!env.LIMITER) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const { success } = await env.LIMITER.limit({ key: `${kind}:${ip}` });
    return !success;
  } catch (e) {
    return false; // a limiter that fails must not take the table down with it
  }
}

function corsFor(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

// Bound per request — several can be in flight in one isolate, so this
// must never live in module scope.
function responder(cors) {
  return (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
  });
}

function randomDigits(digits) {
  const max = 10 ** digits;
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % max;
  return String(n).padStart(digits, '0');
}

function randomToken() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function validPayload(obj) {
  return obj && typeof obj === 'object'
    && Array.isArray(obj.k) && obj.k.length >= 1 && obj.k.length <= 10
    && obj.k.every(c => c && typeof c === 'object');
}

async function readPayload(request, json) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { error: json({ error: 'Session too large' }, 413) };
  let body;
  try { body = JSON.parse(raw); } catch (e) { return { error: json({ error: 'Invalid JSON' }, 400) }; }
  return { body };
}

async function handleApi(request, env, path, cors) {
  const json = responder(cors);
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!env.CUPPINGS) return json({ error: 'Live codes are not configured' }, 503);

  // --- create a session -------------------------------------------------
  if (request.method === 'POST' && path === '/sessions') {
    if (await overLimit(env, request, 'create')) return json({ error: 'Too many requests' }, 429);
    const { body, error } = await readPayload(request, json);
    if (error) return error;
    if (!validPayload(body)) return json({ error: 'Invalid session payload' }, 400);

    // find a free 4-digit code; fall back to 6 digits under heavy load
    let code = null;
    for (let i = 0; i < CODE_ATTEMPTS && !code; i++) {
      const candidate = randomDigits(4);
      if (!(await env.CUPPINGS.get(`s:${candidate}`))) code = candidate;
    }
    if (!code) code = randomDigits(6);

    const token = randomToken();
    await env.CUPPINGS.put(`s:${code}`, JSON.stringify({ payload: body, token }), { expirationTtl: TTL_SECONDS });
    return json({ code, token, expiresIn: TTL_SECONDS });
  }

  const sessionMatch = path.match(/^\/sessions\/(\d{4,6})$/);
  const participantsMatch = path.match(/^\/sessions\/(\d{4,6})\/participants$/);

  // --- read a session ---------------------------------------------------
  if (request.method === 'GET' && sessionMatch) {
    if (await overLimit(env, request, 'lookup')) return json({ error: 'Too many requests' }, 429);
    const stored = await env.CUPPINGS.get(`s:${sessionMatch[1]}`);
    if (!stored) return json({ error: 'Not found or expired' }, 404);
    const record = JSON.parse(stored);
    return json({ payload: record.payload, revealed: Boolean(record.revealed) });
  }

  // --- leader updates the lineup (e.g. reveals coffee details) ----------
  if (request.method === 'PUT' && sessionMatch) {
    const code = sessionMatch[1];
    const stored = await env.CUPPINGS.get(`s:${code}`);
    if (!stored) return json({ error: 'Not found or expired' }, 404);

    const { body, error } = await readPayload(request, json);
    if (error) return error;
    const record = JSON.parse(stored);
    if (!body || body.token !== record.token) return json({ error: 'Not allowed' }, 403);
    if (!validPayload(body.payload)) return json({ error: 'Invalid session payload' }, 400);

    // keep `revealed` — a lineup update after the reveal (the leader sharing
    // coffee details as they present) must not re-seal the table
    record.payload = body.payload;
    await env.CUPPINGS.put(`s:${code}`, JSON.stringify(record), { expirationTtl: TTL_SECONDS });
    return json({ ok: true });
  }

  // --- someone joins ----------------------------------------------------
  if (request.method === 'POST' && participantsMatch) {
    if (await overLimit(env, request, 'join')) return json({ error: 'Too many requests' }, 429);
    const code = participantsMatch[1];
    if (!(await env.CUPPINGS.get(`s:${code}`))) return json({ error: 'Not found or expired' }, 404);

    const { body, error } = await readPayload(request, json);
    if (error) return error;
    const name = String((body && body.name) || '').trim().slice(0, 24) || 'Cupper';

    const existing = await env.CUPPINGS.list({ prefix: `p:${code}:`, limit: MAX_PARTICIPANTS + 1 });
    if (existing.keys.length >= MAX_PARTICIPANTS) return json({ error: 'This cupping is full' }, 409);

    const id = randomToken();
    await env.CUPPINGS.put(`p:${code}:${id}`, '', {
      expirationTtl: TTL_SECONDS,
      metadata: { name, joinedAt: Date.now() },
    });
    return json({ id, name });
  }

  // --- a cupper submits their scores ------------------------------------
  const submitMatch = request.method === 'PUT' && path.match(/^\/sessions\/(\d{4,6})\/participants\/([0-9a-f]{32})$/);
  if (submitMatch) {
    const [, code, id] = submitMatch;
    const key = `p:${code}:${id}`;
    const existing = await env.CUPPINGS.getWithMetadata(key);
    if (existing.value === null && !existing.metadata) return json({ error: 'Not at this table' }, 404);

    const { body, error } = await readPayload(request, json);
    if (error) return error;

    /* null is a value here, and the only one that survives the round trip.

       A sheet that is not finished has no score — the sections nobody
       reached would enter the total at their stored default — so the client
       sends null for it. Coercing that to 0 would hand every device at the
       table a cupper who looked at the coffee and scored it nought, which is
       a worse lie than the one the null exists to stop. */
    const scores = Array.isArray(body && body.scores)
      ? body.scores.slice(0, 10).map(v =>
          typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, v)) : null)
      : null;

    /* A name on its own, with no scores attached.

       Somebody's name on the roster is not something they should have to
       submit a scoresheet to correct. The leader in particular was never
       asked for one — the roster read "Host" for a whole cupping, the field
       to fix it lived on Results, and typing in it changed nothing at the
       table until scores went in behind it. So a PUT carrying a name and no
       scores renames the seat and leaves everything else exactly as it was,
       including whether it counts as submitted. */
    if (!scores && body && typeof body.name === 'string') {
      const was = existing.metadata || {};
      await env.CUPPINGS.put(key, '', {
        expirationTtl: TTL_SECONDS,
        metadata: { ...was, name: body.name.trim().slice(0, 24) || was.name || 'Cupper' },
      });
      return json({ ok: true, renamed: true });
    }

    if (!scores || !scores.length) return json({ error: 'No scores supplied' }, 400);

    /* How much of each sheet is real, carried alongside the scores.

       The client has always sent this and the relay has always dropped it,
       which meant the honest-panel-math worked everywhere except the one
       place a number gets read out loud. A cupper who rated three of eight
       sections, or never opened a coffee at all, arrived at every other
       device indistinguishable from someone who finished: the untouched
       sections come through at their stored default of 5, so an unopened
       CVA sheet reads 79.00 and averages in at full weight. Measured at a
       four-person table: a Kenya one cupper never opened was read out at
       90.81, where the three who actually tasted it averaged 94.75 — near
       enough four points of under-call, on the wrong side of the line a
       buying decision gets made on.

       A count per coffee, clamped to the sections a form can have, and only
       as long as the scores it describes. Absent or malformed, it is simply
       not stored, and the client's own fallback treats such a sheet as
       complete — which is the right answer for an older client and the
       wrong one to reach for here. */
    const rated = Array.isArray(body && body.rated)
      ? body.rated.slice(0, scores.length).map(v => Math.max(0, Math.min(20, Math.round(Number(v) || 0))))
      : null;

    const prev = existing.metadata || {};
    await env.CUPPINGS.put(key, '', {
      expirationTtl: TTL_SECONDS,
      metadata: {
        name: String((body && body.name) || prev.name || 'Cupper').slice(0, 24),
        joinedAt: prev.joinedAt || Date.now(),
        submittedAt: Date.now(),
        scores,
        ...(rated && rated.length ? { rated } : {}),
      },
    });
    return json({ ok: true });
  }

  // --- leader reveals the table -----------------------------------------
  const revealMatch = request.method === 'POST' && path.match(/^\/sessions\/(\d{4,6})\/reveal$/);
  if (revealMatch) {
    const code = revealMatch[1];
    const stored = await env.CUPPINGS.get(`s:${code}`);
    if (!stored) return json({ error: 'Not found or expired' }, 404);

    const { body, error } = await readPayload(request, json);
    if (error) return error;
    const record = JSON.parse(stored);
    if (!body || body.token !== record.token) return json({ error: 'Not allowed' }, 403);

    record.revealed = true;
    await env.CUPPINGS.put(`s:${code}`, JSON.stringify(record), { expirationTtl: TTL_SECONDS });
    return json({ ok: true, revealed: true });
  }

  // --- who is at the table ----------------------------------------------
  // Codes are four digits, so knowing one proves very little. Cuppers'
  // names and scores therefore need the leader's token or a participant
  // id — brute-forcing a code alone reveals no people.
  if (request.method === 'GET' && participantsMatch) {
    const code = participantsMatch[1];
    const stored = await env.CUPPINGS.get(`s:${code}`);
    if (!stored) return json({ error: 'Not found or expired' }, 404);
    const record = JSON.parse(stored);
    const revealed = Boolean(record.revealed);

    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const id = url.searchParams.get('id');
    const isLeader = token && token === record.token;
    const isMember = id && /^[0-9a-f]{32}$/.test(id)
      && (await env.CUPPINGS.getWithMetadata(`p:${code}:${id}`)).metadata;
    if (!isLeader && !isMember) return json({ error: 'Not at this table' }, 403);

    const listed = await env.CUPPINGS.list({ prefix: `p:${code}:`, limit: MAX_PARTICIPANTS });
    const participants = listed.keys
      .map(k => k.metadata || {})
      .filter(m => m.name)
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
      .map(m => ({
        name: m.name,
        submitted: Boolean(m.submittedAt),
        // sealed until the leader reveals, so nobody anchors on anyone else
        ...(revealed && m.scores ? { scores: m.scores } : {}),
        // and how much of each sheet is real, so a part-scored submission
        // says so wherever its number appears rather than only on the
        // device that produced it
        ...(revealed && m.rated ? { rated: m.rated } : {}),
      }));
    return json({ participants, revealed });
  }

  return json({ error: 'Not found' }, 404);
}

/* KEEPING SUPABASE AWAKE.

   A free Supabase project is paused after about a week with no activity,
   and a paused project signs nobody in and syncs nothing; it happened in
   November 2026. Once a day this runs one real query against the
   database, which is the activity that counts.

   It reads the project's address and public key from the site's own
   shared/config.js rather than keeping a second copy here, so the two
   cannot disagree. The query asks for one row with the anon key and no
   user, so row-level security returns nothing: it touches the database
   and reads no one's data. */
async function supabaseConfig(env) {
  const res = await env.ASSETS.fetch('https://lento.cafe/shared/config.js');
  if (!res.ok) return null;
  const text = await res.text();
  const pick = name => {
    const m = text.match(new RegExp(`window\\.${name}\\s*=\\s*['"]([^'"]+)['"]`));
    return m ? m[1] : null;
  };
  const url = pick('SUPABASE_URL');
  const key = pick('SUPABASE_ANON_KEY');
  return url && key ? { url, key } : null;
}

async function keepSupabaseAwake(env) {
  const cfg = await supabaseConfig(env);
  if (!cfg) { console.log('keep-awake: no Supabase configured'); return; }
  const res = await fetch(`${cfg.url}/rest/v1/cuppings?select=id&limit=1`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  // in the Worker's logs, so a paused or broken project shows up there
  console.log(`keep-awake: Supabase answered ${res.status}`);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(keepSupabaseAwake(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const api = url.pathname.match(/^\/cupping\/api(\/.*)?$/);
    if (api) return withSecurityHeaders(await handleApi(request, env, api[1] || '/', corsFor(request)));
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
