/* ============================================================
   lento — one account, three tools

   WHY THIS EXISTS

   The cupping sheet has had sign-in and cloud history since it was built.
   The dial-in and the brew log had neither, so the same person had a
   history that followed them on one tool and a history that lived in one
   browser on the other two — and the kit that feeds all three was
   answered separately in each.

   This is the layer the three share. It is the cupping sheet's own auth,
   lifted out and generalised: same project, same anon key, same
   row-level security, same plain REST with no SDK. Nothing about how
   cupping signs in has changed; it has moved.

   TWO THINGS IT REFUSES TO DO

   It never becomes the source of truth. Every tool reads and writes
   localStorage and works signed out, with no network, for ever; this
   layer is a copy that follows you to another device. PRODUCT.md is
   explicit that offline is the default state rather than the fallback,
   and that the product needs no account to start. A sync layer that
   quietly promotes itself to the database breaks both.

   And it never merges silently where merging loses something. See
   `syncTool` for what that costs and where the cost lands.

   THE TOKEN MOVED, AND NOBODY GETS SIGNED OUT

   The key was `sca-cupping-auth-v1` — the name of one tool. One account
   across three of them needs a name that is not one of their names, so it
   is `lento-auth-v1`, and the old key is migrated in place the first time
   this file loads. A person signed into the cupping sheet stays signed
   in, and gains the other two.
   ============================================================ */

(function (root) {
  'use strict';

  var AUTH_KEY = 'lento-auth-v1';
  var LEGACY_KEYS = ['sca-cupping-auth-v1'];
  var listeners = [];

  function url() { return root.SUPABASE_URL || ''; }
  function anon() { return root.SUPABASE_ANON_KEY || ''; }
  function enabled() { return Boolean(url() && anon()); }

  /* The old key, adopted once. Runs before anything reads the new one. */
  (function migrate() {
    try {
      if (localStorage.getItem(AUTH_KEY)) return;
      for (var i = 0; i < LEGACY_KEYS.length; i++) {
        var old = localStorage.getItem(LEGACY_KEYS[i]);
        if (old) { localStorage.setItem(AUTH_KEY, old); return; }
      }
    } catch (e) { /* private mode: sign-in simply will not persist */ }
  }());

  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch (e) { return null; }
  }
  function saveAuth(a) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function clearAuth() {
    try {
      localStorage.removeItem(AUTH_KEY);
      LEGACY_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  function user() {
    var a = loadAuth();
    return a && a.user ? a.user : null;
  }

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function announce() {
    listeners.forEach(function (fn) { try { fn(user()); } catch (e) {} });
  }

  async function sbFetch(path, opts) {
    opts = opts || {};
    var a = loadAuth();
    var headers = Object.assign({
      apikey: anon(),
      'Content-Type': 'application/json',
    }, a ? { Authorization: 'Bearer ' + a.access_token } : {}, opts.headers || {});
    var res = await fetch(url() + path, Object.assign({}, opts, { headers: headers }));
    if (!res.ok) {
      /* The status, on the error, because a caller that cannot tell 429
         from a dead connection can only say "something went wrong" — and
         that is what the sign-in sheet was saying. A person who has asked
         for a code three times in an hour is rate-limited, not offline,
         and "check the connection" sends them to look at the wrong thing.
         The server's own message rides along too where there is one. */
      var why = null;
      try { why = JSON.parse(await res.text()); } catch (e) { /* not JSON */ }
      var err = new Error('supabase ' + res.status);
      err.status = res.status;
      err.detail = why && (why.msg || why.message || why.error_description || why.error) || '';
      throw err;
    }
    var text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /* A token that is about to expire is refreshed before it is used, and a
     refresh that fails signs you out rather than leaving a session that
     half works. */
  async function freshAuth() {
    var a = loadAuth();
    if (!a) return null;
    if (a.expires_at - Date.now() > 60000) return a;
    if (!a.refresh_token) { clearAuth(); announce(); return null; }
    try {
      var data = await sbFetch('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: a.refresh_token }),
      });
      var next = Object.assign({}, a, {
        access_token: data.access_token,
        refresh_token: data.refresh_token || a.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      });
      saveAuth(next);
      return next;
    } catch (e) { clearAuth(); announce(); return null; }
  }

  async function adoptSession(data) {
    if (!data || !data.access_token) return false;
    saveAuth({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      user: null,
    });
    try {
      var u = data.user || await sbFetch('/auth/v1/user');
      var a = loadAuth();
      a.user = {
        id: u.id,
        email: u.email || '',
        name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '',
        avatar: (u.user_metadata && u.user_metadata.avatar_url) || '',
      };
      saveAuth(a);
      announce();
      return true;
    } catch (e) { clearAuth(); announce(); return false; }
  }

  function signInWith(provider) {
    var here = location.origin + location.pathname.replace(/[^/]*$/, '');
    location.href = url() + '/auth/v1/authorize?provider=' + encodeURIComponent(provider)
      + '&redirect_to=' + encodeURIComponent(here);
  }

  /* Supabase's email carries both a code and a link. The code is what this
     sheet asks for — links get opened by spam scanners and land in
     whichever browser the mail app prefers — but the link is in the
     message either way, and without `redirect_to` it goes to the project's
     Site URL rather than the page you started from. Somebody who signs in
     from the dial-in and taps the link in the email should come back to
     the dial-in.

     The cupping sheet has passed this since it was written. This layer was
     lifted out of that one and dropped it on the way, which is exactly the
     kind of drift a shared layer is supposed to end. */
  async function sendEmailCode(email) {
    var here = location.origin + location.pathname.replace(/[^/]*$/, '');
    await sbFetch('/auth/v1/otp?redirect_to=' + encodeURIComponent(here), {
      method: 'POST',
      body: JSON.stringify({ email: email, create_user: true }),
    });
    return true;
  }

  async function verifyEmailCode(email, code) {
    try {
      var data = await sbFetch('/auth/v1/verify', {
        method: 'POST',
        body: JSON.stringify({ type: 'email', email: email, token: code }),
      });
      return await adoptSession(data);
    } catch (e) { return false; }
  }

  async function signOut() {
    try { await sbFetch('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* best effort */ }
    clearAuth();
    announce();
  }

  /* An OAuth return lands as a URL fragment. Consumed and wiped from the
     address bar, so a token never survives in history or a shared link. */
  async function adoptRedirect() {
    if (!enabled() || !location.hash) return false;
    var h = new URLSearchParams(location.hash.slice(1));
    if (!h.get('access_token')) return false;
    var ok = await adoptSession({
      access_token: h.get('access_token'),
      refresh_token: h.get('refresh_token'),
      expires_in: Number(h.get('expires_in')) || 3600,
    });
    history.replaceState(null, '', location.pathname + location.search);
    return ok;
  }

  /* ---------- records ----------

     One table for everything that is not a cupping: `records`, keyed by
     (user_id, tool, id). The cupping sheet keeps its own `cuppings` table
     untouched, because migrating live history to prove a point is a bad
     trade — a second table is cheaper than a migration that can only go
     wrong once. */

  async function push(tool, id, data, updated) {
    if (!enabled()) return false;
    var a = await freshAuth();
    if (!a || !a.user) return false;
    try {
      await sbFetch('/rest/v1/records?on_conflict=user_id,tool,id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([{
          user_id: a.user.id,
          tool: tool,
          id: id,
          updated: updated || Date.now(),
          data: data,
        }]),
      });
      return true;
    } catch (e) { return false; }
  }

  async function pull(tool) {
    if (!enabled()) return null;
    var a = await freshAuth();
    if (!a || !a.user) return null;
    try {
      return await sbFetch('/rest/v1/records?select=id,updated,data&tool=eq.' + encodeURIComponent(tool));
    } catch (e) { return null; }
  }

  /* A record deleted locally, removed from the cloud too.

     Without this a delete is local only: the row is still there, the next
     pull hands it straight back, and on another device it never happened.
     The caller keeps its own tombstone as well, because the pull that
     races this one has to be told to ignore what it just fetched. */
  async function remove(tool, id) {
    if (!enabled()) return false;
    var a = await freshAuth();
    if (!a || !a.user) return false;
    try {
      await sbFetch('/rest/v1/records?tool=eq.' + encodeURIComponent(tool)
        + '&id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
      return true;
    } catch (e) { return false; }
  }

  /* Two-way, newest wins, per record.

     WHAT THIS COSTS, STATED PLAINLY. Last-write-wins means an edit made on
     one device while another device edits the same record is lost, and
     lost without being mentioned. For records that only ever get APPENDED
     to — a log of shots, where two phones produce a union and never a
     collision — that cost is theoretical. For a record edited in two
     places at once it is real, and this app's own standard elsewhere is
     that it does not quietly discard what somebody typed.

     It is the chosen behaviour, not an oversight. The merge callback is
     where a tool can do better than the default if it wants to: it is
     handed both copies and returns the one to keep, so a tool that can
     merge field-by-field is free to. */
  async function syncTool(tool, opts) {
    if (!enabled()) return false;
    var a = await freshAuth();
    if (!a || !a.user) return false;
    var rows = await pull(tool);
    if (!rows) return false;

    var mine = opts.load() || [];
    var byId = new Map(mine.map(function (r) { return [opts.idOf(r), r]; }));
    var changed = false;

    rows.forEach(function (row) {
      var local = byId.get(row.id);
      if (!local) { byId.set(row.id, row.data); changed = true; return; }
      var keep = opts.merge
        ? opts.merge(local, row.data, row.updated || 0)
        : ((row.updated || 0) > (opts.updatedOf(local) || 0) ? row.data : local);
      if (keep !== local) { byId.set(row.id, keep); changed = true; }
    });

    if (changed) opts.save(Array.from(byId.values()));

    var remote = new Map(rows.map(function (r) { return [r.id, r.updated || 0]; }));
    for (var rec of byId.values()) {
      var id = opts.idOf(rec);
      var up = opts.updatedOf(rec) || 0;
      if (!remote.has(id) || up > remote.get(id)) await push(tool, id, rec, up);
    }
    return true;
  }

  root.LentoAccount = {
    AUTH_KEY: AUTH_KEY,
    enabled: enabled,
    user: user,
    /* The cupping sheet keeps its own `cuppings` requests and its own
       history merge; what it must not keep is a second copy of the
       sign-out. Clearing has to drop the legacy key too, or the migration
       above helpfully restores the session you just ended. */
    clearAuth: clearAuth,
    onChange: onChange,
    signInWith: signInWith,
    sendEmailCode: sendEmailCode,
    verifyEmailCode: verifyEmailCode,
    signOut: signOut,
    adoptRedirect: adoptRedirect,
    push: push,
    pull: pull,
    remove: remove,
    syncTool: syncTool,
  };
}(window));
