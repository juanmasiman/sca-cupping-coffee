/* ============================================================
   SCA Cupping — live-code relay (Cloudflare Worker)

   Maps short Apple-TV-style codes ("4821") to cupping session
   payloads so participants can join by typing a PIN instead of
   pasting a long code. Sessions expire automatically; the app
   works fine without this — it's an optional convenience layer.

   Setup (Cloudflare dashboard):
   1. Workers & Pages → Create Worker → paste this file.
   2. Settings → Bindings → add a KV namespace binding named
      CUPPINGS (create the namespace when prompted).
   3. Settings → Domains & Routes → add route:
        lento.cafe/cupping/api/*   (zone: lento.cafe)

   Endpoints (all CORS-open, JSON):
     POST /cupping/api/sessions          {v, c, k:[…]}  → {code, expiresIn}
     GET  /cupping/api/sessions/{code}                  → {payload}
   ============================================================ */

const TTL_SECONDS = 12 * 60 * 60; // live codes last 12 hours
const MAX_BODY_BYTES = 24 * 1024; // a 10-coffee lineup is ~3 KB
const CODE_ATTEMPTS = 25;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function randomCode(digits) {
  const max = 10 ** digits;
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % max;
  return String(n).padStart(digits, '0');
}

function validPayload(obj) {
  return obj && typeof obj === 'object'
    && Array.isArray(obj.k) && obj.k.length >= 1 && obj.k.length <= 10
    && obj.k.every(c => c && typeof c === 'object');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    // strip everything up to and including "/api"
    const path = url.pathname.replace(/^.*\/api/, '');

    if (request.method === 'POST' && path === '/sessions') {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return json({ error: 'Session too large' }, 413);

      let payload;
      try { payload = JSON.parse(raw); } catch (e) { return json({ error: 'Invalid JSON' }, 400); }
      if (!validPayload(payload)) return json({ error: 'Invalid session payload' }, 400);

      // find a free 4-digit code; fall back to 6 digits under heavy load
      let code = null;
      for (let i = 0; i < CODE_ATTEMPTS && !code; i++) {
        const candidate = randomCode(4);
        if (!(await env.CUPPINGS.get(candidate))) code = candidate;
      }
      if (!code) code = randomCode(6);

      await env.CUPPINGS.put(code, JSON.stringify(payload), { expirationTtl: TTL_SECONDS });
      return json({ code, expiresIn: TTL_SECONDS });
    }

    const getMatch = request.method === 'GET' && path.match(/^\/sessions\/(\d{4,6})$/);
    if (getMatch) {
      const stored = await env.CUPPINGS.get(getMatch[1]);
      if (!stored) return json({ error: 'Not found or expired' }, 404);
      return json({ payload: JSON.parse(stored) });
    }

    return json({ error: 'Not found' }, 404);
  },
};
