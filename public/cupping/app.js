/* ============================================================
   SCA Cupping — app logic
   Vanilla JS. State lives in one object, persisted to localStorage.
   ============================================================ */

'use strict';

/* ---------- constants ---------- */

const STORAGE_KEY = 'sca-cupping-session-v1';
const HISTORY_KEY = 'sca-cupping-history-v1';
const CUPPER_KEY = 'sca-cupping-cupper-name-v1';

// Derived from wherever the app is served, so QR codes, share links,
// and sign-in redirects work on any domain (workers.dev, lento.cafe,
// a local server) with no config.
const APP_URL = location.origin + location.pathname.replace(/[^/]*$/, '');
// Relay for Apple-TV-style live codes, served by the same Worker; the
// app works fully without it (long codes + QR carry the data themselves).
const RELAY_URL = APP_URL + 'api';

// Optional Supabase project for sign-in + cloud history sync.
// Leave empty to run device-only; see DEPLOY.md to enable.
// (window overrides let deploys inject config without editing this file)
const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
const AUTH_KEY = 'sca-cupping-auth-v1';

/* ---- CVA: SCA Standard 104-2024, Affective Assessment ----
   Eight sections rated 1–9 (impression of quality), then
   score = 0.65625 × Σ(sections) + 52.75 − 2·(non-uniform cups)
           − 4·(defective cups), rounded to the nearest 0.25.
   Range runs 58.00 (all ones) to 100.00 (all nines).           */

const CVA_SECTIONS = [
  { key: 'fragrance', label: 'Fragrance', sub: 'dry aroma of the grounds' },
  { key: 'aroma', label: 'Aroma', sub: 'wet aroma after breaking the crust' },
  { key: 'flavor', label: 'Flavor', sub: 'principal character in the mouth' },
  { key: 'aftertaste', label: 'Aftertaste', sub: 'what lingers after swallowing' },
  { key: 'acidity', label: 'Acidity', sub: 'brightness and liveliness' },
  { key: 'sweetness', label: 'Sweetness', sub: 'perceived sweetness' },
  { key: 'mouthfeel', label: 'Mouthfeel', sub: 'tactile weight and texture' },
  { key: 'overall', label: 'Overall', sub: 'holistic impression of quality' },
];

const CVA_LABELS = [
  'extremely low', 'very low', 'moderately low', 'slightly low',
  'neither high nor low',
  'slightly high', 'moderately high', 'very high', 'extremely high',
];

const CVA_DEFECTS = [
  { key: 'nonUniform', label: 'Non-uniform cups', sub: 'cups that differ from the rest · −2 each' },
  { key: 'defective', label: 'Defective cups', sub: 'cups with a fault · −4 each' },
];

const FORMS = [
  { id: 'cva', name: 'CVA', sub: 'SCA 2024 standard' },
  { id: 'legacy', name: 'Legacy', sub: '2004 cupping form' },
];

// Scale attributes: scored 6.00–10.00 in 0.25 steps
const SCALE_ATTRS = [
  { key: 'fragrance', label: 'Fragrance / Aroma', sub: 'dry grounds & wet crust' },
  { key: 'flavor', label: 'Flavor', sub: 'principal taste & aroma character' },
  { key: 'aftertaste', label: 'Aftertaste', sub: 'length of positive flavor' },
  { key: 'acidity', label: 'Acidity', sub: 'brightness & liveliness' },
  { key: 'body', label: 'Body', sub: 'tactile feeling, weight' },
  { key: 'balance', label: 'Balance', sub: 'harmony of the whole' },
  { key: 'overall', label: 'Overall', sub: 'cupper’s holistic rating' },
];

// Per-cup attributes: each checked cup contributes 10/nCups points
const CUP_ATTRS = [
  { key: 'uniformity', label: 'Uniformity', sub: 'consistency across cups' },
  { key: 'cleanCup', label: 'Clean Cup', sub: 'free of negative impressions' },
  { key: 'sweetness', label: 'Sweetness', sub: 'pleasing fullness of flavor' },
];

const RADAR_ATTRS = [...SCALE_ATTRS, ...CUP_ATTRS];

const RADAR_COLORS = ['#e8b06b', '#8fc98a', '#7fb3d5', '#e07a5f', '#c39bd3', '#f4d35e', '#76d7c4', '#f1948a', '#aab7f0', '#d4a373'];

const LIMITS = { coffees: [1, 10], cups: [1, 5] };

// Coffee details (origin metadata)
const META_FIELDS = [
  { key: 'variety', label: 'Variety', placeholder: 'Geisha, Caturra…', list: 'variety-list' },
  { key: 'process', label: 'Process', placeholder: 'Washed, Natural…', list: 'process-list' },
  { key: 'altitude', label: 'Altitude (masl)', placeholder: '1750', inputmode: 'numeric' },
  { key: 'country', label: 'Origin', placeholder: 'Ethiopia, Colombia…' },
  { key: 'farm', label: 'Farm', placeholder: 'Finca…', wide: true },
  { key: 'producer', label: 'Producer', placeholder: 'Producer name', wide: true },
  { key: 'roast', label: 'Roast profile', placeholder: 'Light · 9:30 total · 1:45 dev · drop 203°C…', wide: true },
];

/* ---------- state ---------- */

let state = null; // { id, cupsPerCoffee, activeIndex, coffees: [...] }

function emptyMeta() {
  return Object.fromEntries(META_FIELDS.map(f => [f.key, '']));
}

function newCoffee(nCups) {
  const scores = {};
  SCALE_ATTRS.forEach(a => { scores[a.key] = 7.5; });
  const cva = {};
  CVA_SECTIONS.forEach(a => { cva[a.key] = 5; }); // 5 = neither high nor low
  return {
    name: '',
    meta: emptyMeta(),
    scores,
    cva,
    cups: Object.fromEntries(CUP_ATTRS.map(a => [a.key, Array(nCups).fill(true)])),
    taintCups: 0,
    faultCups: 0,
    nonUniform: 0,
    defective: 0,
    notes: '',
  };
}

function newSession(nCoffees, nCups, form) {
  state = {
    id: 'S' + Date.now(),
    form: form || 'cva',
    cupsPerCoffee: nCups,
    activeIndex: 0,
    coffees: [],
    team: [],
    shareDetails: false, // blind by default: guests get names, not origin details
  };
  for (let i = 0; i < nCoffees; i++) state.coffees.push(newCoffee(nCups));
  save();
}

function usingCVA() {
  return !state || state.form !== 'legacy';
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.coffees) || !s.coffees.length) return null;
    // migrate sessions saved by older versions
    if (!s.id) s.id = 'S' + Date.now();
    if (!Array.isArray(s.team)) s.team = [];
    if (typeof s.shareDetails !== 'boolean') s.shareDetails = false;
    if (!s.form) s.form = 'legacy'; // sessions saved before CVA support
    s.coffees.forEach(c => {
      c.meta = Object.assign(emptyMeta(), c.meta || {});
      if (!c.cva) { c.cva = {}; CVA_SECTIONS.forEach(a => { c.cva[a.key] = 5; }); }
      if (typeof c.nonUniform !== 'number') c.nonUniform = 0;
      if (typeof c.defective !== 'number') c.defective = 0;
    });
    return s;
  } catch (e) { return null; }
}

function clearSession() {
  state = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

/* ---------- history archive ---------- */

function loadArchive() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveArchive(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (e) {}
}

// Snapshot the current session into history (upsert by session id, so
// revisiting Results after edits refreshes the archived copy).
function archiveSession() {
  if (!state) return;
  const archive = loadArchive();
  const entry = {
    id: state.id,
    date: Date.now(),
    updated: Date.now(),
    form: state.form,
    cupsPerCoffee: state.cupsPerCoffee,
    coffees: state.coffees.map((c, i) => ({
      name: coffeeName(c, i),
      meta: { ...c.meta },
      notes: c.notes,
      score: coffeeScore(c),
    })),
  };
  const idx = archive.findIndex(s => s.id === state.id);
  if (idx >= 0) { entry.date = archive[idx].date; archive[idx] = entry; }
  else archive.push(entry);
  saveArchive(archive);
  cloudPushEntry(entry); // fire-and-forget backup when signed in
}

function clearArchive() {
  try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
}

/* ============================================================
   ACCOUNTS & CLOUD SYNC (Supabase, optional)
   Sign in with Apple/Google keeps history synced across devices.
   Everything works without it; this layer only activates when
   SUPABASE_URL is configured. Plain REST — no SDK.
   ============================================================ */

function cloudEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch (e) { return null; }
}

function saveAuth(auth) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (e) {}
}

function clearAuth() {
  try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
}

async function sbFetch(path, opts = {}) {
  const auth = loadAuth();
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: `Bearer ${auth.access_token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function signInWith(provider) {
  const redirect = encodeURIComponent(APP_URL);
  location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirect}`;
}

async function signOut() {
  try { await sbFetch('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* best effort */ }
  clearAuth();
  renderAccountButton();
  toast('Signed out — history stays on this device');
}

// After the OAuth redirect, Supabase returns tokens in the URL hash.
async function handleAuthRedirect() {
  if (!location.hash.includes('access_token=')) return false;
  const params = new URLSearchParams(location.hash.slice(1));
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600', 10);
  history.replaceState(null, '', location.pathname + location.search);
  if (!access) return false;
  saveAuth({ access_token: access, refresh_token: refresh, expires_at: Date.now() + expiresIn * 1000, user: null });
  try {
    const user = await sbFetch('/auth/v1/user');
    const auth = loadAuth();
    auth.user = {
      id: user.id,
      email: user.email || '',
      name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '',
      avatar: (user.user_metadata && user.user_metadata.avatar_url) || '',
    };
    saveAuth(auth);
    if (auth.user.name && !getCupperName()) setCupperName(auth.user.name.split(' ')[0]);
    toast(`Signed in${auth.user.name ? ' as ' + auth.user.name.split(' ')[0] : ''}`);
    cloudSyncAll();
  } catch (e) {
    clearAuth();
    toast('Sign-in failed — please try again');
  }
  return true;
}

async function ensureFreshAuth() {
  const auth = loadAuth();
  if (!auth) return null;
  if (auth.expires_at - Date.now() > 60000) return auth;
  if (!auth.refresh_token) { clearAuth(); return null; }
  try {
    const data = await sbFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    const next = {
      ...auth,
      access_token: data.access_token,
      refresh_token: data.refresh_token || auth.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    };
    saveAuth(next);
    return next;
  } catch (e) {
    clearAuth();
    return null;
  }
}

async function cloudPushEntry(entry) {
  if (!cloudEnabled()) return;
  const auth = await ensureFreshAuth();
  if (!auth || !auth.user) return;
  try {
    await sbFetch('/rest/v1/cuppings?on_conflict=user_id,id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        id: entry.id,
        user_id: auth.user.id,
        date: entry.date,
        updated: entry.updated || entry.date,
        data: entry,
      }]),
    });
  } catch (e) { /* offline — next sync catches up */ }
}

// Two-way merge: newest copy of each cupping wins, everywhere.
async function cloudSyncAll() {
  if (!cloudEnabled()) return false;
  const auth = await ensureFreshAuth();
  if (!auth || !auth.user) return false;
  try {
    const rows = await sbFetch('/rest/v1/cuppings?select=id,updated,data');
    const byId = new Map(loadArchive().map(e => [e.id, e]));
    let changed = false;
    rows.forEach(r => {
      const mine = byId.get(r.id);
      if (!mine || (r.updated || 0) > (mine.updated || mine.date || 0)) {
        byId.set(r.id, r.data);
        changed = true;
      }
    });
    if (changed) saveArchive([...byId.values()]);
    const cloudUpdated = new Map(rows.map(r => [r.id, r.updated || 0]));
    for (const e of byId.values()) {
      if (!cloudUpdated.has(e.id) || (e.updated || e.date || 0) > cloudUpdated.get(e.id)) {
        await cloudPushEntry(e);
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function cloudDeleteAll() {
  if (!cloudEnabled()) return;
  const auth = await ensureFreshAuth();
  if (!auth || !auth.user) return;
  try {
    await sbFetch(`/rest/v1/cuppings?user_id=eq.${auth.user.id}`, { method: 'DELETE' });
  } catch (e) { /* best effort */ }
}

/* ---------- account UI ---------- */

function renderAccountButton() {
  const auth = loadAuth();
  $('#account-dot').classList.toggle('hidden', !(auth && auth.user));
}

const googleIconSVG = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.5 2.2-6.3 0-11.7-3.7-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;

// Free passwordless option for non-Google users: Supabase emails a
// sign-in link that redirects back with tokens in the URL hash.
async function sendMagicLink(email) {
  try {
    await sbFetch(`/auth/v1/otp?redirect_to=${encodeURIComponent(APP_URL)}`, {
      method: 'POST',
      body: JSON.stringify({ email, create_user: true }),
    });
    return true;
  } catch (e) {
    return false;
  }
}

function openAccountSheet() {
  const modal = $('#account-modal');
  const sheet = $('#account-sheet');
  const auth = loadAuth();
  const archive = loadArchive();
  const close = () => { modal.classList.add('hidden'); modal.onclick = null; };

  if (auth && auth.user) {
    const initial = (auth.user.name || auth.user.email || '?').trim()[0].toUpperCase();
    sheet.innerHTML = `
      <h3>Your profile</h3>
      <div class="account-user">
        <div class="account-avatar">${auth.user.avatar ? `<img src="${escapeHTML(auth.user.avatar)}" alt="">` : escapeHTML(initial)}</div>
        <div class="account-user-info">
          <div class="account-user-name">${escapeHTML(auth.user.name || 'Cupper')}</div>
          <div class="account-user-mail">${escapeHTML(auth.user.email)}</div>
        </div>
      </div>
      <p class="account-status" id="account-status">${archive.length} cupping${archive.length === 1 ? '' : 's'} in your history</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-signout">Sign out</button>
        <button class="btn btn-primary" id="btn-sync">Sync now</button>
      </div>
    `;
    sheet.querySelector('#btn-signout').onclick = async () => { await signOut(); close(); };
    sheet.querySelector('#btn-sync').onclick = async () => {
      const status = sheet.querySelector('#account-status');
      status.textContent = 'Syncing…';
      const ok = await cloudSyncAll();
      const n = loadArchive().length;
      status.textContent = ok ? `Synced · ${n} cupping${n === 1 ? '' : 's'} backed up` : 'Could not reach the cloud — will retry later';
    };
  } else if (cloudEnabled()) {
    sheet.innerHTML = `
      <h3>Keep your history everywhere</h3>
      <p class="modal-hint">Sign in to back up your cuppings and sync them across devices. Joining a cupping and scoring never requires an account.</p>
      <div class="auth-buttons">
        <button class="auth-btn auth-google" id="btn-auth-google">${googleIconSVG} Continue with Google</button>
        <div class="auth-divider"><span>or with your email</span></div>
        <div class="auth-email-row">
          <input class="detail-field" id="auth-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com">
          <button class="btn btn-ghost" id="btn-auth-email">Send link</button>
        </div>
        <p class="account-status" id="auth-email-status"></p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-auth-cancel">Not now</button>
      </div>
    `;
    sheet.querySelector('#btn-auth-google').onclick = () => signInWith('google');
    sheet.querySelector('#btn-auth-email').onclick = async () => {
      const email = sheet.querySelector('#auth-email').value.trim();
      const status = sheet.querySelector('#auth-email-status');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Enter a valid email address.'; return; }
      status.textContent = 'Sending…';
      const ok = await sendMagicLink(email);
      status.textContent = ok
        ? 'Check your inbox — tap the link to sign in.'
        : 'Could not send the link. Try again in a minute.';
    };
    sheet.querySelector('#btn-auth-cancel').onclick = close;
  } else {
    sheet.innerHTML = `
      <h3>Your cupping history</h3>
      <p class="modal-hint">History is saved on this device (${archive.length} cupping${archive.length === 1 ? '' : 's'} so far). Cloud sign-in isn’t configured on this deployment yet — once it is, you’ll be able to back up and sync across devices with Apple or Google.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-auth-cancel">Close</button>
      </div>
    `;
    sheet.querySelector('#btn-auth-cancel').onclick = close;
  }

  modal.classList.remove('hidden');
  modal.onclick = e => { if (e.target === modal) close(); };
}

/* ---------- scoring ---------- */

function coffeeScore(c) {
  return usingCVA() ? cvaScore(c) : legacyScore(c);
}

// SCA Standard 104-2024
function cvaScore(c) {
  let sum = 0;
  CVA_SECTIONS.forEach(a => { sum += c.cva[a.key]; });
  const raw = 0.65625 * sum + 52.75 - defectPenalty(c);
  return Math.max(0, Math.round(raw / 0.25) * 0.25);
}

function legacyScore(c) {
  let total = 0;
  SCALE_ATTRS.forEach(a => { total += c.scores[a.key]; });
  CUP_ATTRS.forEach(a => {
    const cups = c.cups[a.key];
    total += 10 * cups.filter(Boolean).length / cups.length;
  });
  total -= defectPenalty(c);
  return Math.max(0, total);
}

function defectPenalty(c) {
  return usingCVA()
    ? c.nonUniform * 2 + c.defective * 4
    : c.taintCups * 2 + c.faultCups * 4;
}

function gradeFor(score) {
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Excellent';
  if (score >= 80) return 'Very Good · Specialty';
  if (score >= 70) return 'Good · Below specialty';
  return 'Below cupping quality';
}

function coffeeName(c, i) {
  return c.name.trim() || `Coffee ${i + 1}`;
}

function metaSummary(meta) {
  const bits = [];
  if (meta.variety) bits.push(meta.variety);
  if (meta.process) bits.push(meta.process);
  if (meta.roast) bits.push(meta.roast);
  if (meta.altitude) bits.push(`${meta.altitude} masl`);
  if (meta.country) bits.push(meta.country);
  if (meta.farm) bits.push(meta.farm);
  return bits.join(' · ');
}

function fmt(n) {
  return n.toFixed(2);
}

/* ---------- tiny helpers ---------- */

const $ = sel => document.querySelector(sel);

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

function haptic() {
  if (navigator.vibrate) navigator.vibrate(4);
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  $('#scorebar').classList.toggle('visible', id === '#screen-cupping');
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/* ============================================================
   SESSION & SCORE CODES (social cupping, serverless)
   The "code" carries the data itself: JSON → gzip → base64url,
   so sharing works over any messenger with no backend.
   ============================================================ */

function b64urlEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function gzipBytes(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipBytes(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// kind is 'CUP' (session) or 'SCR' (scores); G = gzipped, P = plain
async function encodeCode(kind, obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream !== 'undefined') {
    try { return `${kind}G.${b64urlEncode(await gzipBytes(raw))}`; } catch (e) { /* fall through */ }
  }
  return `${kind}P.${b64urlEncode(raw)}`;
}

async function decodeCode(kind, text) {
  // tolerate the code being pasted with surrounding message text
  const m = (text || '').replace(/\s+/g, ' ').match(new RegExp(kind + '([GP])\\.([A-Za-z0-9_-]+)'));
  if (!m) return null;
  try {
    let bytes = b64urlDecode(m[2]);
    if (m[1] === 'G') {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = await gunzipBytes(bytes);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) { return null; }
}

function buildSessionPayload() {
  return {
    v: 1,
    f: state.form,
    c: state.cupsPerCoffee,
    k: state.coffees.map((c, i) => {
      const entry = { n: coffeeName(c, i) };
      // origin details only travel when the leader chooses to share them
      if (state.shareDetails) {
        entry.m = Object.fromEntries(Object.entries(c.meta).filter(([, v]) => v && v.trim()));
      }
      return entry;
    }),
  };
}

async function buildSessionCode() {
  return encodeCode('CUP', buildSessionPayload());
}

function applySessionPayload(obj) {
  if (!obj || !Array.isArray(obj.k) || !obj.k.length) return false;
  const nCups = Math.min(LIMITS.cups[1], Math.max(LIMITS.cups[0], obj.c || 5));
  const coffees = obj.k.slice(0, LIMITS.coffees[1]);
  // cuppers join on the leader's scoresheet
  newSession(coffees.length, nCups, obj.f === 'legacy' ? 'legacy' : 'cva');
  coffees.forEach((k, i) => {
    state.coffees[i].name = String(k.n || '').slice(0, 40);
    state.coffees[i].meta = Object.assign(emptyMeta(),
      Object.fromEntries(Object.entries(k.m || {}).map(([key, v]) => [key, String(v).slice(0, 60)])));
  });
  save();
  return true;
}

async function joinSessionFromCode(text) {
  return applySessionPayload(await decodeCode('CUP', text));
}

/* ---------- live-code relay (optional backend) ---------- */

async function relayRequest(path, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${RELAY_URL}${path}`, { ...options, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Returns { code, token } or null when the relay is unreachable.
async function relayCreateSession(payload) {
  const data = await relayRequest('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data && data.code ? { code: String(data.code), token: data.token } : null;
}

// Push an updated lineup to an existing code (e.g. after revealing details).
async function relayUpdateSession(code, token, payload) {
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, payload }),
  });
  return Boolean(data && data.ok);
}

async function relayFetchSession(code) {
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}`, { method: 'GET' });
  return data && data.payload ? data.payload : null;
}

async function relayJoinSession(code, name) {
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return Boolean(data && data.id);
}

async function relayListParticipants(code) {
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}/participants`, { method: 'GET' });
  return data && Array.isArray(data.participants) ? data.participants : null;
}

function getCupperName() {
  try { return localStorage.getItem(CUPPER_KEY) || ''; } catch (e) { return ''; }
}

function setCupperName(name) {
  try { localStorage.setItem(CUPPER_KEY, name); } catch (e) {}
}

async function buildScoreCode() {
  return encodeCode('SCR', {
    v: 1,
    n: getCupperName() || 'Cupper',
    s: state.coffees.map(c => Math.round(coffeeScore(c) * 100) / 100),
    t: state.coffees.map((c, i) => coffeeName(c, i)),
  });
}

async function addTeamScoresFromCode(text) {
  const obj = await decodeCode('SCR', text);
  if (!obj || !Array.isArray(obj.s) || !obj.s.length) return { ok: false, error: 'That doesn’t look like a score code.' };
  if (obj.s.length !== state.coffees.length) {
    return { ok: false, error: `That code has ${obj.s.length} coffee${obj.s.length > 1 ? 's' : ''}, this session has ${state.coffees.length}.` };
  }
  const scores = obj.s.map(v => Math.max(0, Math.min(100, Number(v) || 0)));
  state.team.push({ name: String(obj.n || 'Cupper').slice(0, 24), scores });
  save();
  return { ok: true };
}

/* ---------- modal ---------- */

function openModal({ title, hint, cta, onSubmit }) {
  const modal = $('#modal');
  const input = $('#modal-input');
  $('#modal-title').textContent = title;
  $('#modal-hint').textContent = hint;
  $('#modal-submit').textContent = cta;
  input.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 60);

  const close = () => {
    modal.classList.add('hidden');
    $('#modal-submit').onclick = null;
    $('#modal-cancel').onclick = null;
    modal.onclick = null;
  };
  $('#modal-cancel').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  $('#modal-submit').onclick = async () => {
    const done = await onSubmit(input.value);
    if (done) close();
  };
}

/* ---------- join by keypad ---------- */

function openJoinSheet() {
  const modal = $('#join-modal');
  const boxes = $('#pin-boxes');
  const keypad = $('#keypad');
  const errorEl = $('#pin-error');
  const LEN = 4;
  let digits = '';
  let busy = false;

  const close = () => {
    modal.classList.add('hidden');
    document.removeEventListener('keydown', onKey);
  };

  const render = () => {
    [...boxes.children].forEach((box, i) => {
      box.textContent = digits[i] || '';
      box.classList.toggle('filled', i < digits.length);
      box.classList.toggle('next', i === digits.length);
    });
  };

  const submit = async () => {
    busy = true;
    errorEl.textContent = '';
    const payload = await relayFetchSession(digits);
    busy = false;
    if (!payload) {
      errorEl.textContent = 'No cupping found for that code.';
      boxes.classList.remove('shake');
      void boxes.offsetWidth;
      boxes.classList.add('shake');
      digits = '';
      render();
      return;
    }
    close();
    askNameThenJoin(payload, digits);
  };

  const press = key => {
    if (busy) return;
    haptic();
    if (key === 'del') {
      digits = digits.slice(0, -1);
      errorEl.textContent = '';
      render();
      return;
    }
    if (digits.length >= LEN) return;
    digits += key;
    const box = boxes.children[digits.length - 1];
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    render();
    if (digits.length === LEN) setTimeout(submit, 180);
  };

  const onKey = e => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Escape') close();
  };

  // build once per open so state is always fresh
  boxes.innerHTML = '';
  for (let i = 0; i < LEN; i++) boxes.appendChild(el('div', 'pin-box'));

  keypad.innerHTML = '';
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].forEach(k => {
    if (k === '') { keypad.appendChild(el('div', 'key blank')); return; }
    const btn = el('button', k === 'del' ? 'key action' : 'key', k === 'del' ? '⌫' : k);
    btn.type = 'button';
    if (k === 'del') btn.setAttribute('aria-label', 'Delete');
    btn.addEventListener('click', () => press(k));
    keypad.appendChild(btn);
  });

  errorEl.textContent = '';
  render();
  modal.classList.remove('hidden');
  document.addEventListener('keydown', onKey);

  $('#join-cancel').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  $('#pin-alt').onclick = () => {
    close();
    openModal({
      title: 'Paste a cupping link or code',
      hint: 'Paste the message the leader shared — the app will find the code inside it.',
      cta: 'Join',
      onSubmit: async text => {
        const ok = await joinSessionFromCode(text);
        if (!ok) { toast('That doesn’t look like a cupping code'); return false; }
        startCupping();
        toast(`Joined · ${state.coffees.length} coffee${state.coffees.length > 1 ? 's' : ''}`);
        return true;
      },
    });
  };
}

/* ---------- name prompt, then join ---------- */

function askNameThenJoin(payload, code) {
  const finish = async name => {
    if (name) setCupperName(name);
    applySessionPayload(payload);
    if (code) {
      state.joinedCode = code;
      save();
      if (name) relayJoinSession(code, name); // fire-and-forget presence
    }
    startCupping();
    toast(`Joined · ${state.coffees.length} coffee${state.coffees.length > 1 ? 's' : ''}`);
  };

  const known = getCupperName();
  if (known) { finish(known); return; }

  const modal = $('#name-modal');
  const input = $('#name-input');
  input.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 80);

  const close = () => { modal.classList.add('hidden'); modal.onclick = null; };
  const go = name => { close(); finish(name); };

  $('#name-submit').onclick = () => go(input.value.trim());
  $('#name-skip').onclick = () => go('');
  input.onkeydown = e => { if (e.key === 'Enter') go(input.value.trim()); };
  modal.onclick = e => { if (e.target === modal) go(''); };
}

/* ---------- invite sheet: QR + live code ---------- */

function joinURL(code) {
  return `${APP_URL}#join=${code}`;
}

let inviteTimer = null;

function renderQR(url) {
  const qrBox = $('#share-qr');
  qrBox.innerHTML = '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
  } catch (e) {
    qrBox.textContent = 'QR unavailable';
  }
}

async function openInviteSheet() {
  const modal = $('#share-modal');
  const pinWrap = $('#share-pin-wrap');
  const pin = $('#share-pin');
  const toggle = $('#toggle-details');
  const joinedWrap = $('#joined-wrap');
  const joinedList = $('#joined-list');

  // link that carries the lineup itself — works with no relay at all
  let shareUrl = joinURL(await buildSessionCode());
  renderQR(shareUrl);

  toggle.checked = state.shareDetails;
  pin.textContent = 'Getting live code…';
  pin.classList.add('pending');
  pinWrap.classList.remove('hidden');
  joinedWrap.classList.add('hidden');
  modal.classList.remove('hidden');

  const close = () => {
    modal.classList.add('hidden');
    clearInterval(inviteTimer);
    inviteTimer = null;
    $('#share-close').onclick = null;
    $('#share-link').onclick = null;
    toggle.onchange = null;
    modal.onclick = null;
  };
  $('#share-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  $('#share-link').onclick = () => shareText(
    `☕️ Join my cupping: ${shareUrl}\n\nOr open ${APP_URL}, tap “Join a cupping” and enter the code.`,
    'Join link copied'
  );

  const refreshJoined = async () => {
    if (!state.liveCode) return;
    const people = await relayListParticipants(state.liveCode);
    if (!people) return;
    joinedWrap.classList.remove('hidden');
    $('#joined-title').textContent = people.length ? `At the table · ${people.length}` : 'At the table';
    joinedList.innerHTML = '';
    if (!people.length) {
      joinedList.appendChild(el('span', 'joined-empty', 'Waiting for cuppers to join…'));
      return;
    }
    people.forEach((p, i) => {
      const chip = el('span', 'joined-chip', escapeHTML(p.name));
      chip.style.animationDelay = `${i * 0.04}s`;
      joinedList.appendChild(chip);
    });
  };

  // revealing details reissues the lineup under the same code
  toggle.onchange = async () => {
    state.shareDetails = toggle.checked;
    save();
    haptic();
    shareUrl = joinURL(await buildSessionCode());
    if (!state.liveCode) renderQR(shareUrl);
    if (state.liveCode && state.liveToken) {
      await relayUpdateSession(state.liveCode, state.liveToken, buildSessionPayload());
    }
    toast(state.shareDetails ? 'Coffee details shared' : 'Cupping is blind again');
  };

  // live code is a bonus on top — fetch it after the sheet is visible
  const live = await relayCreateSession(buildSessionPayload());
  if (live) {
    state.liveCode = live.code;
    state.liveToken = live.token;
    save();
    pin.classList.remove('pending');
    pin.textContent = live.code;
    // point the QR at the code so joiners are counted and can get late updates
    shareUrl = `${APP_URL}#code=${live.code}`;
    renderQR(shareUrl);
    refreshJoined();
    clearInterval(inviteTimer);
    inviteTimer = setInterval(refreshJoined, 4000);
  } else {
    pinWrap.classList.add('hidden');
  }
}

/* ---------- native share with clipboard fallback ---------- */

async function shareText(text, copiedMsg) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(copiedMsg);
  } catch (e) {
    toast('Could not share');
  }
}

/* ============================================================
   SETUP SCREEN
   ============================================================ */

const setup = { coffees: 3, cups: 5, form: 'cva' };

function initFormPicker() {
  const seg = $('#form-seg');
  const hint = $('#form-hint');
  const hints = {
    cva: 'SCA Coffee Value Assessment · 8 sections rated 1–9',
    legacy: 'Retired 2004 form · 7 attributes from 6.00 to 10.00',
  };
  FORMS.forEach(f => {
    const btn = el('button', 'seg-btn' + (f.id === setup.form ? ' active' : ''), f.name);
    btn.addEventListener('click', () => {
      setup.form = f.id;
      haptic();
      seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hint.textContent = hints[f.id];
    });
    seg.appendChild(btn);
  });
  hint.textContent = hints[setup.form];
}

function initStepper(rootId, valueId, key, limitKey) {
  const root = $(rootId);
  const valueEl = $(valueId);
  const [min, max] = LIMITS[limitKey];

  const render = () => {
    valueEl.textContent = setup[key];
    root.querySelector('[data-action="dec"]').disabled = setup[key] <= min;
    root.querySelector('[data-action="inc"]').disabled = setup[key] >= max;
  };

  root.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn || btn.disabled) return;
    setup[key] += btn.dataset.action === 'inc' ? 1 : -1;
    setup[key] = Math.min(max, Math.max(min, setup[key]));
    valueEl.classList.remove('bump');
    void valueEl.offsetWidth; // restart animation
    valueEl.classList.add('bump');
    haptic();
    render();
    renderCupsPreview();
  });

  render();
}

function renderCupsPreview() {
  const wrap = $('#cups-preview');
  wrap.innerHTML = '';
  for (let i = 0; i < setup.coffees; i++) {
    const row = el('div', 'preview-row');
    row.appendChild(el('span', 'preview-coffee-dot'));
    const cups = el('div', 'preview-cups');
    for (let j = 0; j < setup.cups; j++) {
      const cup = el('span', 'preview-cup');
      cup.style.animationDelay = `${i * 0.05 + j * 0.04}s`;
      cups.appendChild(cup);
    }
    row.appendChild(cups);
    wrap.appendChild(row);
  }
}

/* ============================================================
   CUPPING SCREEN
   ============================================================ */

const cupIconSVG = `
  <svg viewBox="0 0 24 24" fill="none">
    <path class="cup-outline" d="M5 8h11v2.2c2.4 0 3.6 1.2 3.6 2.7s-1.2 2.7-3.6 2.7h-.4c-.8 2.2-2.7 3.4-5.1 3.4s-4.3-1.2-5.1-3.4V8z"
      stroke-width="1.7" stroke-linejoin="round"/>
    <path class="cup-outline" d="M16 11.4c1.4 0 2 .7 2 1.5s-.6 1.5-2 1.5" stroke-width="1.7"/>
  </svg>`;

function buildCuppingUI() {
  buildTabs();
  buildPanels();
  syncActivePanel(false);
  updateScorebar();
}

function buildTabs() {
  const tabs = $('#coffee-tabs');
  tabs.innerHTML = '';
  state.coffees.forEach((c, i) => {
    const tab = el('button', 'coffee-tab');
    tab.innerHTML = `<span class="tab-name">${escapeHTML(coffeeName(c, i))}</span><span class="tab-score">${fmt(coffeeScore(c))}</span>`;
    tab.addEventListener('click', () => {
      state.activeIndex = i;
      scrollToPanel(i, true);
      syncActivePanel(true);
      save();
    });
    tabs.appendChild(tab);
  });
}

function refreshTabs() {
  const tabs = $('#coffee-tabs').children;
  state.coffees.forEach((c, i) => {
    const tab = tabs[i];
    if (!tab) return;
    tab.querySelector('.tab-name').textContent = coffeeName(c, i);
    tab.querySelector('.tab-score').textContent = fmt(coffeeScore(c));
    tab.classList.toggle('active', i === state.activeIndex);
  });
}

function buildPanels() {
  const panels = $('#panels');
  panels.innerHTML = '';
  state.coffees.forEach((c, i) => panels.appendChild(buildPanel(c, i)));

  // sync active tab with horizontal swipe position
  let scrollTimer = null;
  panels.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const idx = Math.round(panels.scrollLeft / panels.clientWidth);
      if (idx !== state.activeIndex && idx >= 0 && idx < state.coffees.length) {
        state.activeIndex = idx;
        syncActivePanel(true);
        save();
      }
    }, 80);
  }, { passive: true });
}

function scrollToPanel(i, smooth) {
  const panels = $('#panels');
  panels.scrollTo({ left: i * panels.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}

function syncActivePanel(animated) {
  refreshTabs();
  const tabs = $('#coffee-tabs');
  const active = tabs.children[state.activeIndex];
  if (active) active.scrollIntoView({ behavior: animated ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  updateScorebar();
}

function buildPanel(coffee, index) {
  const panel = el('div', 'panel');

  // name
  const name = document.createElement('input');
  name.className = 'name-field';
  name.type = 'text';
  name.placeholder = `Coffee ${index + 1} — name or lot…`;
  name.value = coffee.name;
  name.maxLength = 40;
  name.addEventListener('input', () => {
    coffee.name = name.value;
    refreshTabs();
    updateScorebar();
    save();
  });
  panel.appendChild(name);

  // origin details
  panel.appendChild(buildDetailsCard(coffee));

  if (usingCVA()) {
    CVA_SECTIONS.forEach(section => panel.appendChild(buildCvaCard(coffee, section)));
    panel.appendChild(buildCvaDefectsCard(coffee));
  } else {
    SCALE_ATTRS.forEach(attr => panel.appendChild(buildScaleCard(coffee, attr)));
    CUP_ATTRS.forEach(attr => panel.appendChild(buildCupCard(coffee, attr)));
    panel.appendChild(buildDefectsCard(coffee));
  }

  // notes
  const notes = document.createElement('textarea');
  notes.className = 'notes-field';
  notes.placeholder = 'Tasting notes — jasmine, stone fruit, cocoa…';
  notes.value = coffee.notes;
  notes.addEventListener('input', () => { coffee.notes = notes.value; save(); });
  panel.appendChild(notes);

  return panel;
}

/* ---------- details card (variety, process, altitude, …) ---------- */

function buildDetailsCard(coffee) {
  const card = el('div', 'details-card');
  card.innerHTML = `
    <button class="details-toggle">
      <span class="details-toggle-label">Details</span>
      <span class="details-summary"></span>
      <svg class="details-chevron" viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="details-collapse"><div class="details-collapse-inner"><div class="details-grid"></div></div></div>
  `;

  const summaryEl = card.querySelector('.details-summary');
  const grid = card.querySelector('.details-grid');

  const refreshSummary = () => {
    summaryEl.textContent = metaSummary(coffee.meta) || 'variety · process · farm…';
  };

  META_FIELDS.forEach(f => {
    const cell = el('div', 'detail-cell' + (f.wide ? ' wide' : ''));
    const input = document.createElement('input');
    input.className = 'detail-field';
    input.type = 'text';
    input.placeholder = f.placeholder;
    input.value = coffee.meta[f.key] || '';
    input.maxLength = 60;
    if (f.list) input.setAttribute('list', f.list);
    if (f.inputmode) input.setAttribute('inputmode', f.inputmode);
    input.addEventListener('input', () => {
      coffee.meta[f.key] = input.value;
      refreshSummary();
      save();
    });
    cell.appendChild(el('span', 'detail-label', f.label));
    cell.appendChild(input);
    grid.appendChild(cell);
  });

  card.querySelector('.details-toggle').addEventListener('click', () => {
    haptic();
    card.classList.toggle('open');
  });

  refreshSummary();
  return card;
}

/* ---------- CVA section card: 1–9 impression of quality ---------- */

function buildCvaCard(coffee, section) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">${section.label}</div>
        <div class="attr-sub">${section.sub}</div>
      </div>
      <div class="attr-value">${coffee.cva[section.key]}</div>
    </div>
    <div class="cva-scale"></div>
    <div class="cva-desc"></div>
  `;

  const valueEl = card.querySelector('.attr-value');
  const scale = card.querySelector('.cva-scale');
  const desc = card.querySelector('.cva-desc');

  const refresh = popIt => {
    const v = coffee.cva[section.key];
    valueEl.textContent = v;
    desc.textContent = CVA_LABELS[v - 1];
    [...scale.children].forEach((btn, i) => btn.classList.toggle('selected', i + 1 === v));
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
    }
  };

  for (let v = 1; v <= 9; v++) {
    const btn = el('button', 'cva-btn' + (v === 5 ? ' neutral' : ''), String(v));
    btn.type = 'button';
    btn.setAttribute('aria-label', `${section.label}: ${v}, ${CVA_LABELS[v - 1]}`);
    btn.addEventListener('click', () => {
      coffee.cva[section.key] = v;
      haptic();
      refresh(true);
      refreshTabs();
      updateScorebar();
      save();
    });
    scale.appendChild(btn);
  }

  refresh(false);
  return card;
}

/* ---------- CVA cup deductions ---------- */

function buildCvaDefectsCard(coffee) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">Cup deductions</div>
        <div class="attr-sub">subtracted from the affective score</div>
      </div>
    </div>
    <div class="defect-rows">
      ${CVA_DEFECTS.map(d => `
        <div class="defect-row" data-kind="${d.key}">
          <div class="defect-info">
            <span class="defect-name">${d.label}</span>
            <span class="defect-pts">${d.sub}</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" data-action="dec">−</button>
            <span class="stepper-value">0</span>
            <button class="stepper-btn" data-action="inc">+</button>
          </div>
        </div>`).join('')}
    </div>
    <div class="defect-penalty"></div>
  `;

  const penaltyEl = card.querySelector('.defect-penalty');

  const refresh = () => {
    card.querySelectorAll('.defect-row').forEach(rowEl => {
      const kind = rowEl.dataset.kind;
      rowEl.querySelector('.stepper-value').textContent = coffee[kind];
      rowEl.querySelector('[data-action="dec"]').disabled = coffee[kind] <= 0;
      rowEl.querySelector('[data-action="inc"]').disabled = coffee[kind] >= state.cupsPerCoffee;
    });
    const p = defectPenalty(coffee);
    penaltyEl.textContent = p > 0 ? `−${fmt(p)} points` : '';
  };

  card.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn || btn.disabled) return;
    const kind = btn.closest('.defect-row').dataset.kind;
    coffee[kind] = Math.min(state.cupsPerCoffee, Math.max(0, coffee[kind] + (btn.dataset.action === 'inc' ? 1 : -1)));
    haptic();
    refresh();
    refreshTabs();
    updateScorebar();
    save();
  });

  refresh();
  return card;
}

/* ---------- scale attribute card with custom slider ---------- */

function buildScaleCard(coffee, attr) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">${attr.label}</div>
        <div class="attr-sub">${attr.sub}</div>
      </div>
      <div class="attr-value">${fmt(coffee.scores[attr.key])}</div>
    </div>
    <div class="slider">
      <div class="slider-track"><div class="slider-fill"></div></div>
      <div class="slider-ticks"></div>
      <div class="slider-thumb"></div>
    </div>
    <div class="slider-labels"><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>
  `;

  const valueEl = card.querySelector('.attr-value');
  const slider = card.querySelector('.slider');
  const fill = card.querySelector('.slider-fill');
  const thumb = card.querySelector('.slider-thumb');
  const ticks = card.querySelector('.slider-ticks');

  // whole-point tick marks
  for (let v = 6; v <= 10; v++) {
    const tick = el('span', 'slider-tick');
    tick.style.left = `${((v - 6) / 4) * 100}%`;
    ticks.appendChild(tick);
  }

  const MIN = 6, MAX = 10, STEP = 0.25;

  const position = () => {
    const pct = ((coffee.scores[attr.key] - MIN) / (MAX - MIN)) * 100;
    fill.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
  };

  const setValue = (v, popIt) => {
    v = Math.round(v / STEP) * STEP;
    v = Math.min(MAX, Math.max(MIN, v));
    if (v === coffee.scores[attr.key]) return;
    coffee.scores[attr.key] = v;
    valueEl.textContent = fmt(v);
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
      haptic();
    }
    position();
    refreshTabs();
    updateScorebar();
    save();
  };

  const valueFromEvent = e => {
    const rect = slider.getBoundingClientRect();
    const x = Math.min(rect.right, Math.max(rect.left, e.clientX));
    return MIN + ((x - rect.left) / rect.width) * (MAX - MIN);
  };

  slider.addEventListener('pointerdown', e => {
    slider.setPointerCapture(e.pointerId);
    slider.classList.add('dragging');
    setValue(valueFromEvent(e), true);
  });
  slider.addEventListener('pointermove', e => {
    if (!slider.classList.contains('dragging')) return;
    setValue(valueFromEvent(e), true);
  });
  const endDrag = () => slider.classList.remove('dragging');
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('pointercancel', endDrag);

  position();
  return card;
}

/* ---------- per-cup attribute card ---------- */

function buildCupCard(coffee, attr) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">${attr.label}</div>
        <div class="attr-sub">${attr.sub} · tap a cup to fail it</div>
      </div>
      <div class="attr-value"></div>
    </div>
    <div class="cups-row"></div>
  `;

  const valueEl = card.querySelector('.attr-value');
  const row = card.querySelector('.cups-row');
  const cups = coffee.cups[attr.key];

  const attrScore = () => 10 * cups.filter(Boolean).length / cups.length;

  const refresh = popIt => {
    valueEl.textContent = fmt(attrScore());
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
    }
    [...row.children].forEach((btn, i) => btn.classList.toggle('checked', cups[i]));
  };

  cups.forEach((_, i) => {
    const btn = el('button', 'cup-check');
    btn.innerHTML = `${cupIconSVG}<span class="cup-num">${i + 1}</span>`;
    btn.addEventListener('click', () => {
      cups[i] = !cups[i];
      haptic();
      refresh(true);
      refreshTabs();
      updateScorebar();
      save();
    });
    row.appendChild(btn);
  });

  refresh(false);
  return card;
}

/* ---------- defects card ---------- */

function buildDefectsCard(coffee) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">Defects</div>
        <div class="attr-sub">cups affected, subtracted from total</div>
      </div>
    </div>
    <div class="defect-rows">
      <div class="defect-row" data-kind="taintCups">
        <div class="defect-info">
          <span class="defect-name">Taint</span>
          <span class="defect-pts">off-flavor in aroma · −2 pts / cup</span>
        </div>
        <div class="stepper">
          <button class="stepper-btn" data-action="dec">−</button>
          <span class="stepper-value">0</span>
          <button class="stepper-btn" data-action="inc">+</button>
        </div>
      </div>
      <div class="defect-row" data-kind="faultCups">
        <div class="defect-info">
          <span class="defect-name">Fault</span>
          <span class="defect-pts">off-flavor in taste · −4 pts / cup</span>
        </div>
        <div class="stepper">
          <button class="stepper-btn" data-action="dec">−</button>
          <span class="stepper-value">0</span>
          <button class="stepper-btn" data-action="inc">+</button>
        </div>
      </div>
    </div>
    <div class="defect-penalty"></div>
  `;

  const penaltyEl = card.querySelector('.defect-penalty');

  const refresh = () => {
    card.querySelectorAll('.defect-row').forEach(rowEl => {
      const kind = rowEl.dataset.kind;
      rowEl.querySelector('.stepper-value').textContent = coffee[kind];
      rowEl.querySelector('[data-action="dec"]').disabled = coffee[kind] <= 0;
      rowEl.querySelector('[data-action="inc"]').disabled = coffee[kind] >= state.cupsPerCoffee;
    });
    const p = defectPenalty(coffee);
    penaltyEl.textContent = p > 0 ? `−${fmt(p)} points` : '';
  };

  card.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn || btn.disabled) return;
    const rowEl = btn.closest('.defect-row');
    const kind = rowEl.dataset.kind;
    coffee[kind] += btn.dataset.action === 'inc' ? 1 : -1;
    coffee[kind] = Math.min(state.cupsPerCoffee, Math.max(0, coffee[kind]));
    haptic();
    refresh();
    refreshTabs();
    updateScorebar();
    save();
  });

  refresh();
  return card;
}

/* ---------- score bar ---------- */

function updateScorebar() {
  if (!state) return;
  const c = state.coffees[state.activeIndex];
  if (!c) return;
  const score = coffeeScore(c);
  $('#scorebar-name').textContent = coffeeName(c, state.activeIndex);
  $('#scorebar-grade').textContent = gradeFor(score);
  const valueEl = $('#scorebar-value');
  if (valueEl.textContent !== fmt(score)) {
    valueEl.textContent = fmt(score);
    const box = valueEl.parentElement;
    box.classList.remove('pulse');
    void box.offsetWidth;
    box.classList.add('pulse');
  }
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */

function buildResults() {
  const ranked = state.coffees
    .map((c, i) => ({ coffee: c, index: i, score: coffeeScore(c) }))
    .sort((a, b) => b.score - a.score);

  // podium
  const winner = ranked[0];
  const winnerMeta = metaSummary(winner.coffee.meta);
  const podium = $('#podium');
  podium.innerHTML = `
    <div class="podium-crown">🏆</div>
    <div class="podium-name">${escapeHTML(coffeeName(winner.coffee, winner.index))}</div>
    <div class="podium-score">${fmt(winner.score)}</div>
    <div class="podium-grade">${gradeFor(winner.score)}</div>
    ${winnerMeta ? `<div class="podium-meta">${escapeHTML(winnerMeta)}</div>` : ''}
  `;

  buildRadar(ranked);

  // ranking cards
  const ranking = $('#ranking');
  ranking.innerHTML = '';
  ranked.forEach((r, pos) => {
    const card = el('div', 'rank-card');
    card.style.animationDelay = `${pos * 0.07}s`;
    const medalCls = pos < 3 ? ` m${pos + 1}` : '';
    const meta = metaSummary(r.coffee.meta);
    card.innerHTML = `
      <div class="rank-top">
        <div class="rank-medal${medalCls}">${pos + 1}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHTML(coffeeName(r.coffee, r.index))}</div>
          <div class="rank-grade">${gradeFor(r.score)}</div>
        </div>
        <div class="rank-score">${fmt(r.score)}</div>
      </div>
      <div class="rank-bar"><div class="rank-bar-fill"></div></div>
      ${meta ? `<div class="rank-meta">${escapeHTML(meta)}</div>` : ''}
      ${r.coffee.notes.trim() ? `<div class="rank-notes">${escapeHTML(r.coffee.notes.trim())}</div>` : ''}
    `;
    ranking.appendChild(card);
    requestAnimationFrame(() => {
      card.querySelector('.rank-bar-fill').style.width = `${r.score}%`;
    });
  });

  renderTeamCard();

  // every visit to Results refreshes the archived snapshot
  archiveSession();
}

/* ---------- team scores (social cupping) ---------- */

function renderTeamCard() {
  const card = $('#team-card');
  card.innerHTML = `
    <h3>Team scores</h3>
    <p class="team-sub">Cupping with others? Share your scores as a code, and paste theirs to see how the table scored.</p>
    <div class="team-name-row">
      <span class="detail-label">Your name</span>
      <input class="detail-field" id="cupper-name" type="text" maxlength="24" placeholder="e.g. Juan">
    </div>
    <div class="team-actions">
      <button class="btn btn-ghost" id="btn-share-scores">Share my scores</button>
      <button class="btn btn-ghost" id="btn-add-scores">Add cupper’s scores</button>
    </div>
    <div class="team-cuppers-row" id="team-cuppers"></div>
    <div class="team-results" id="team-results"></div>
  `;

  const nameInput = card.querySelector('#cupper-name');
  nameInput.value = getCupperName();
  nameInput.addEventListener('input', () => setCupperName(nameInput.value.trim()));

  card.querySelector('#btn-share-scores').addEventListener('click', async () => {
    const code = await buildScoreCode();
    shareText(
      `☕️ My cupping scores — in SCA Cupping open Results → “Add cupper’s scores” and paste:\n\n${code}`,
      'Score code copied'
    );
  });

  card.querySelector('#btn-add-scores').addEventListener('click', () => {
    openModal({
      title: 'Add cupper’s scores',
      hint: 'Paste a score code another cupper shared from their Results screen.',
      cta: 'Add scores',
      onSubmit: async text => {
        const res = await addTeamScoresFromCode(text);
        if (!res.ok) { toast(res.error); return false; }
        renderTeamTable();
        toast('Scores added');
        return true;
      },
    });
  });

  renderTeamTable();
}

function renderTeamTable() {
  const chips = $('#team-cuppers');
  const results = $('#team-results');
  chips.innerHTML = '';
  results.innerHTML = '';
  if (!state.team.length) return;

  const myName = getCupperName() || 'You';

  const me = el('span', 'cupper-chip me', escapeHTML(myName));
  chips.appendChild(me);
  state.team.forEach((t, ti) => {
    const chip = el('span', 'cupper-chip');
    chip.innerHTML = `${escapeHTML(t.name)}<button aria-label="Remove ${escapeHTML(t.name)}">×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      state.team.splice(ti, 1);
      save();
      renderTeamTable();
    });
    chips.appendChild(chip);
  });

  const rows = state.coffees.map((c, i) => {
    const values = [
      { name: myName, score: coffeeScore(c) },
      ...state.team.map(t => ({ name: t.name, score: t.scores[i] })),
    ];
    const avg = values.reduce((a, v) => a + v.score, 0) / values.length;
    return { name: coffeeName(c, i), avg, values };
  }).sort((a, b) => b.avg - a.avg);

  rows.forEach(r => {
    const row = el('div', 'team-coffee-row');
    row.innerHTML = `
      <div class="team-coffee-top">
        <span class="team-coffee-name">${escapeHTML(r.name)}</span>
        <span class="team-coffee-avg">${fmt(r.avg)}<small>AVG</small></span>
      </div>
      <div class="team-coffee-cuppers">${r.values.map(v => `${escapeHTML(v.name)} ${fmt(v.score)}`).join(' · ')}</div>
    `;
    results.appendChild(row);
  });
}

/* ---------- radar chart (SVG) ---------- */

function radarAttrs() {
  return usingCVA() ? CVA_SECTIONS : RADAR_ATTRS;
}

// radar floors: enough headroom that differences read, without clipping
function radarRange() {
  return usingCVA() ? { min: 3, max: 9 } : { min: 5, max: 10 };
}

function attrValue(coffee, attr) {
  if (usingCVA()) return coffee.cva[attr.key];
  if (attr.key in coffee.scores) return coffee.scores[attr.key];
  const cups = coffee.cups[attr.key];
  return 10 * cups.filter(Boolean).length / cups.length;
}

function buildRadar(ranked) {
  const SIZE = 320, CX = SIZE / 2, CY = SIZE / 2, R = 108;
  const ATTRS = radarAttrs();
  const N = ATTRS.length;
  const { min: MIN, max: MAX } = radarRange();

  const angle = i => (Math.PI * 2 * i) / N - Math.PI / 2;
  const point = (i, r) => [CX + Math.cos(angle(i)) * r, CY + Math.sin(angle(i)) * r];

  let svg = `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">`;

  // grid rings
  for (let ring = 1; ring <= 5; ring++) {
    const r = (R * ring) / 5;
    const pts = ATTRS.map((_, i) => point(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
    svg += `<polygon class="radar-grid" points="${pts}" stroke-width="${ring === 5 ? 1.2 : 0.6}"/>`;
  }

  // spokes + labels
  ATTRS.forEach((attr, i) => {
    const [x, y] = point(i, R);
    svg += `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-grid" stroke-width="0.6"/>`;
    const [lx, ly] = point(i, R + 18);
    const short = attr.label.split(' / ')[0].split(' ')[0];
    svg += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" class="radar-axis-label">${short}</text>`;
  });

  // one polygon per coffee (ranked order so winner draws last, on top)
  [...ranked].reverse().forEach(r => {
    const color = RADAR_COLORS[r.index % RADAR_COLORS.length];
    const pts = ATTRS.map((attr, i) => {
      const v = Math.max(MIN, attrValue(r.coffee, attr));
      const rr = (R * (v - MIN)) / (MAX - MIN);
      return point(i, rr).map(n => n.toFixed(1)).join(',');
    }).join(' ');
    svg += `<polygon points="${pts}" fill="${color}" fill-opacity="0.13" stroke="${color}" stroke-width="2" stroke-linejoin="round" data-coffee="${r.index}"/>`;
  });

  svg += '</svg>';
  $('#radar-wrap').innerHTML = svg;

  // legend with tap-to-highlight
  const legend = $('#radar-legend');
  legend.innerHTML = '';
  ranked.forEach(r => {
    const color = RADAR_COLORS[r.index % RADAR_COLORS.length];
    const item = el('button', 'legend-item');
    item.innerHTML = `<span class="legend-dot" style="background:${color}"></span>${escapeHTML(coffeeName(r.coffee, r.index))}`;
    item.addEventListener('click', () => {
      const muting = !item.classList.contains('solo');
      legend.querySelectorAll('.legend-item').forEach(li => li.classList.remove('solo', 'muted'));
      $('#radar-wrap').querySelectorAll('polygon[data-coffee]').forEach(p => (p.style.opacity = ''));
      if (muting) {
        item.classList.add('solo');
        legend.querySelectorAll('.legend-item').forEach(li => { if (li !== item) li.classList.add('muted'); });
        $('#radar-wrap').querySelectorAll('polygon[data-coffee]').forEach(p => {
          p.style.opacity = p.dataset.coffee === String(r.index) ? '1' : '0.08';
        });
      }
    });
    legend.appendChild(item);
  });
}

/* ---------- share ---------- */

function buildShareText() {
  const ranked = state.coffees
    .map((c, i) => ({ coffee: c, index: i, score: coffeeScore(c) }))
    .sort((a, b) => b.score - a.score);

  const lines = [`☕️ SCA Cupping Results — ${usingCVA() ? 'CVA (SCA 2024)' : '2004 form'}`, ''];
  ranked.forEach((r, pos) => {
    lines.push(`${pos + 1}. ${coffeeName(r.coffee, r.index)} — ${fmt(r.score)} (${gradeFor(r.score)})`);
    const meta = metaSummary(r.coffee.meta);
    if (meta) lines.push(`   ${meta}`);
    if (r.coffee.notes.trim()) lines.push(`   ${r.coffee.notes.trim()}`);
  });
  return lines.join('\n');
}

async function shareResults() {
  const text = buildShareText();
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Results copied to clipboard');
  } catch (e) {
    toast('Could not share results');
  }
}

/* ============================================================
   HISTORY SCREEN
   ============================================================ */

const DIMENSIONS = [
  { key: 'process', label: 'Process' },
  { key: 'variety', label: 'Variety' },
  { key: 'roast', label: 'Roast' },
  { key: 'country', label: 'Origin' },
  { key: 'farm', label: 'Farm' },
  { key: 'producer', label: 'Producer' },
  { key: 'altitude', label: 'Altitude' },
];

let activeDim = 'process';

function altitudeBucket(raw) {
  const m = String(raw).match(/\d{3,4}/);
  if (!m) return null;
  const masl = parseInt(m[0], 10);
  if (masl < 1200) return 'Below 1200 masl';
  if (masl < 1500) return '1200–1500 masl';
  if (masl < 1800) return '1500–1800 masl';
  if (masl < 2100) return '1800–2100 masl';
  return 'Above 2100 masl';
}

function flatCoffees(archive) {
  return archive.flatMap(s => s.coffees.map(c => ({ ...c, date: s.date, form: s.form || 'legacy' })));
}

function aggregateBy(coffees, dimKey) {
  const groups = new Map();
  coffees.forEach(c => {
    let value = (c.meta && c.meta[dimKey] || '').trim();
    if (dimKey === 'altitude') value = altitudeBucket(value) || '';
    if (!value) return;
    const norm = value.toLowerCase();
    if (!groups.has(norm)) groups.set(norm, { name: value, scores: [] });
    groups.get(norm).scores.push(c.score);
  });
  return [...groups.values()]
    .map(g => ({
      name: g.name,
      count: g.scores.length,
      avg: g.scores.reduce((a, b) => a + b, 0) / g.scores.length,
      best: Math.max(...g.scores),
    }))
    .sort((a, b) => b.avg - a.avg);
}

function buildHistory() {
  const archive = loadArchive().sort((a, b) => b.date - a.date);
  const empty = archive.length === 0;
  $('#history-empty').classList.toggle('hidden', !empty);
  $('#history-content').classList.toggle('hidden', empty);
  if (empty) return;

  const coffees = flatCoffees(archive);
  const allScores = coffees.map(c => c.score);
  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  // stat tiles
  $('#stats-row').innerHTML = `
    <div class="stat-tile"><div class="stat-value">${archive.length}</div><div class="stat-label">Cuppings</div></div>
    <div class="stat-tile"><div class="stat-value">${coffees.length}</div><div class="stat-label">Coffees</div></div>
    <div class="stat-tile"><div class="stat-value">${fmt(avg)}</div><div class="stat-label">Avg score</div></div>
  `;

  // dimension segmented control
  const seg = $('#dim-seg');
  seg.innerHTML = '';
  DIMENSIONS.forEach(d => {
    const btn = el('button', 'seg-btn' + (d.key === activeDim ? ' active' : ''), d.label);
    btn.addEventListener('click', () => {
      activeDim = d.key;
      haptic();
      seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGroups(coffees);
    });
    seg.appendChild(btn);
  });

  renderGroups(coffees);

  // recent coffees
  const list = $('#hist-list');
  list.innerHTML = '';
  coffees
    .sort((a, b) => b.date - a.date)
    .slice(0, 12)
    .forEach(c => {
      const item = el('div', 'hist-item');
      const meta = metaSummary(c.meta || {});
      const date = new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      item.innerHTML = `
        <div class="hist-item-info">
          <div class="hist-item-name">${escapeHTML(c.name)}<span class="form-tag">${c.form === 'legacy' ? '2004' : 'CVA'}</span></div>
          ${meta ? `<div class="hist-item-meta">${escapeHTML(meta)}</div>` : ''}
        </div>
        <div class="hist-item-right">
          <div class="hist-item-score">${fmt(c.score)}</div>
          <div class="hist-item-date">${date}</div>
        </div>
      `;
      list.appendChild(item);
    });
}

function renderGroups(coffees) {
  const wrap = $('#group-list');
  wrap.innerHTML = '';
  const groups = aggregateBy(coffees, activeDim);
  const dimLabel = DIMENSIONS.find(d => d.key === activeDim).label.toLowerCase();

  if (!groups.length) {
    wrap.appendChild(el('div', 'group-empty',
      `No ${escapeHTML(dimLabel)} data yet — fill in coffee details while cupping.`));
    return;
  }

  groups.forEach((g, i) => {
    const row = el('div', 'group-row');
    row.style.animationDelay = `${i * 0.04}s`;
    row.innerHTML = `
      <div class="group-row-top">
        <span class="group-name">${escapeHTML(g.name)}</span>
        <span class="group-count">${g.count} coffee${g.count > 1 ? 's' : ''} · best ${fmt(g.best)}</span>
        <span class="group-avg">${fmt(g.avg)}</span>
      </div>
      <div class="group-bar"><div class="group-bar-fill"></div></div>
    `;
    wrap.appendChild(row);
    // bars scaled over 60–100 so small score differences stay visible
    const barPct = Math.max(0, Math.min(100, ((g.avg - 60) / 40) * 100));
    requestAnimationFrame(() => {
      row.querySelector('.group-bar-fill').style.width = `${barPct}%`;
    });
  });
}

/* ============================================================
   WIRING
   ============================================================ */

function startCupping() {
  buildCuppingUI();
  showScreen('#screen-cupping');
  requestAnimationFrame(() => scrollToPanel(state.activeIndex, false));
}

document.addEventListener('DOMContentLoaded', () => {
  initFormPicker();
  initStepper('#stepper-coffees', '#value-coffees', 'coffees', 'coffees');
  initStepper('#stepper-cups', '#value-cups', 'cups', 'cups');
  renderCupsPreview();

  // resume?
  const saved = load();
  if (saved) {
    state = saved;
    const btn = $('#btn-resume');
    btn.classList.remove('hidden');
    btn.textContent = `Resume session · ${saved.coffees.length} coffee${saved.coffees.length > 1 ? 's' : ''}`;
    btn.addEventListener('click', () => startCupping());
  }

  $('#btn-start').addEventListener('click', () => {
    newSession(setup.coffees, setup.cups, setup.form);
    startCupping();
  });

  $('#btn-back-setup').addEventListener('click', () => showScreen('#screen-setup'));

  $('#btn-join').addEventListener('click', openJoinSheet);

  $('#btn-share-session').addEventListener('click', openInviteSheet);

  // account: OAuth return, profile button, quiet background sync
  $('#btn-account').addEventListener('click', openAccountSheet);
  handleAuthRedirect().then(() => renderAccountButton());
  renderAccountButton();
  if (loadAuth()) cloudSyncAll();

  // auto-join when opened from a scanned QR / shared link
  const codeMatch = location.hash.match(/code=(\d{4,6})/);       // …#code=4821
  const joinMatch = location.hash.match(/join=([^&]+)/);          // …#join=CUPG.xxx
  if (codeMatch) {
    history.replaceState(null, '', location.pathname + location.search);
    relayFetchSession(codeMatch[1]).then(payload => {
      if (payload) askNameThenJoin(payload, codeMatch[1]);
      else toast('That cupping has ended or the code expired');
    });
  } else if (joinMatch) {
    history.replaceState(null, '', location.pathname + location.search);
    decodeCode('CUP', decodeURIComponent(joinMatch[1])).then(payload => {
      if (payload) askNameThenJoin(payload, null);
    });
  }

  $('#btn-finish').addEventListener('click', () => {
    buildResults();
    showScreen('#screen-results');
  });

  $('#btn-back-cupping').addEventListener('click', () => {
    showScreen('#screen-cupping');
    requestAnimationFrame(() => scrollToPanel(state.activeIndex, false));
  });

  $('#btn-share').addEventListener('click', shareResults);

  $('#btn-new-session').addEventListener('click', () => {
    if (!confirm('Start a new session? This cupping is already saved to History.')) return;
    clearSession();
    $('#btn-resume').classList.add('hidden');
    showScreen('#screen-setup');
  });

  $('#btn-history').addEventListener('click', () => {
    buildHistory();
    showScreen('#screen-history');
  });

  $('#btn-back-history').addEventListener('click', () => showScreen('#screen-setup'));

  $('#btn-clear-history').addEventListener('click', () => {
    const signedIn = Boolean(loadAuth() && loadAuth().user);
    const msg = signedIn
      ? 'Delete all cupping history, including your cloud backup? This cannot be undone.'
      : 'Delete all cupping history? This cannot be undone.';
    if (!confirm(msg)) return;
    clearArchive();
    if (signedIn) cloudDeleteAll();
    buildHistory();
    toast('History cleared');
  });

  // keep swipe panel aligned on rotation / resize
  window.addEventListener('resize', () => {
    if ($('#screen-cupping').classList.contains('active')) scrollToPanel(state.activeIndex, false);
  });
});
