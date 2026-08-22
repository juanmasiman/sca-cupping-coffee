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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
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

async function readPayload(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { error: json({ error: 'Session too large' }, 413) };
  let body;
  try { body = JSON.parse(raw); } catch (e) { return { error: json({ error: 'Invalid JSON' }, 400) }; }
  return { body };
}

async function handleApi(request, env, path) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (!env.CUPPINGS) return json({ error: 'Live codes are not configured' }, 503);

  // --- create a session -------------------------------------------------
  if (request.method === 'POST' && path === '/sessions') {
    const { body, error } = await readPayload(request);
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

    const { body, error } = await readPayload(request);
    if (error) return error;
    const record = JSON.parse(stored);
    if (!body || body.token !== record.token) return json({ error: 'Not allowed' }, 403);
    if (!validPayload(body.payload)) return json({ error: 'Invalid session payload' }, 400);

    await env.CUPPINGS.put(`s:${code}`, JSON.stringify({ payload: body.payload, token: record.token }), { expirationTtl: TTL_SECONDS });
    return json({ ok: true });
  }

  // --- someone joins ----------------------------------------------------
  if (request.method === 'POST' && participantsMatch) {
    const code = participantsMatch[1];
    if (!(await env.CUPPINGS.get(`s:${code}`))) return json({ error: 'Not found or expired' }, 404);

    const { body, error } = await readPayload(request);
    if (error) return error;
    const name = String((body && body.name) || '').trim().slice(0, 24) || 'Cupper';

    const existing = await env.CUPPINGS.list({ prefix: `p:${code}:`, limit: MAX_PARTICIPANTS + 1 });
    if (existing.keys.length > MAX_PARTICIPANTS) return json({ error: 'This cupping is full' }, 409);

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

    const { body, error } = await readPayload(request);
    if (error) return error;

    const scores = Array.isArray(body && body.scores)
      ? body.scores.slice(0, 10).map(v => Math.max(0, Math.min(100, Number(v) || 0)))
      : null;
    if (!scores || !scores.length) return json({ error: 'No scores supplied' }, 400);

    const prev = existing.metadata || {};
    await env.CUPPINGS.put(key, '', {
      expirationTtl: TTL_SECONDS,
      metadata: {
        name: String((body && body.name) || prev.name || 'Cupper').slice(0, 24),
        joinedAt: prev.joinedAt || Date.now(),
        submittedAt: Date.now(),
        scores,
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

    const { body, error } = await readPayload(request);
    if (error) return error;
    const record = JSON.parse(stored);
    if (!body || body.token !== record.token) return json({ error: 'Not allowed' }, 403);

    record.revealed = true;
    await env.CUPPINGS.put(`s:${code}`, JSON.stringify(record), { expirationTtl: TTL_SECONDS });
    return json({ ok: true, revealed: true });
  }

  // --- who is at the table ----------------------------------------------
  if (request.method === 'GET' && participantsMatch) {
    const code = participantsMatch[1];
    const stored = await env.CUPPINGS.get(`s:${code}`);
    const revealed = Boolean(stored && JSON.parse(stored).revealed);

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
      }));
    return json({ participants, revealed });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const api = url.pathname.match(/^\/cupping\/api(\/.*)?$/);
    if (api) return handleApi(request, env, api[1] || '/');
    return env.ASSETS.fetch(request);
  },
};
