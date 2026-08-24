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
const OTP_LENGTH = Math.min(10, Math.max(6, window.OTP_LENGTH || 6));
const AUTH_KEY = 'sca-cupping-auth-v1';

// Captured before anything can rewrite the address bar, so sign-in tokens
// and join codes survive whatever else happens during startup.
const ENTRY_HASH = location.hash;
const ENTRY_SEARCH = location.search;

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

/* ---- CVA: SCA Standard 103-2024, Descriptive Assessment ----
   Describes the coffee without judging it: intensity 0–15 per
   attribute, plus check-all-that-apply descriptors.            */

// Sections rated 0–15 for intensity, in the order of the printed form
const DESC_ATTRS = [
  { key: 'fragrance', label: 'Fragrance', sub: 'dry grounds' },
  { key: 'aroma', label: 'Aroma', sub: 'after breaking the crust' },
  { key: 'flavor', label: 'Flavor', sub: 'in the mouth' },
  { key: 'aftertaste', label: 'Aftertaste', sub: 'after swallowing' },
  { key: 'acidity', label: 'Acidity', sub: '' },
  { key: 'sweetness', label: 'Sweetness', sub: '' },
  { key: 'mouthfeel', label: 'Mouthfeel', sub: '' },
];

// The olfactory CATA list, exactly as printed on the SCA form: nine
// categories, some with their own sub-descriptors. Used for the
// fragrance/aroma box and again for the flavor/aftertaste box.
const CATA_OLFACTORY = [
  { name: 'Floral' },
  { name: 'Fruity', children: ['Berry', 'Dried Fruit', 'Citrus Fruit'] },
  { name: 'Sour/Fermented', children: ['Sour', 'Fermented'] },
  { name: 'Green/Vegetative' },
  { name: 'Other', children: ['Chemical', 'Musty/Earthy', 'Woody'] },
  { name: 'Roasted', children: ['Cereal', 'Burnt', 'Tobacco'] },
  { name: 'Spice' },
  { name: 'Nutty/Cocoa', children: ['Nutty', 'Cocoa'] },
  { name: 'Sweet', children: ['Vanilla/Vanillin', 'Brown Sugar'] },
];

const CATA_TASTES = ['Salty', 'Bitter', 'Sour', 'Sweet', 'Umami'];

const CATA_MOUTHFEEL = [
  { name: 'Rough', hint: 'gritty, chalky, sandy' },
  { name: 'Smooth', hint: 'velvety, silky, syrupy' },
  { name: 'Metallic' },
  { name: 'Oily' },
  { name: 'Mouth-Drying' },
];

// Acidity and sweetness carry no CATA list — the standard has tasters
// write their own descriptors there.
const DESC_NOTE_FIELDS = ['fragrance', 'flavor', 'acidity', 'sweetness', 'mouthfeel'];

/* ---------- guided mode help ---------- */

const GUIDED_KEY = 'sca-cupping-guided-v1';

const HELP = {
  intro: {
    title: 'How a cupping works',
    body: 'Grind at 8.25 g of coffee per 150 mL of cup, smell the dry grounds, then pour water at 93 ± 3 °C to the rim. Let it stand, break the crust with your spoon and smell again, skim the foam, and taste as the coffee cools. Score each coffee on your own — the standard asks every cupper to score independently, without comparing notes, and the coffee’s score is the panel average. Discuss afterwards.',
  },
  cvaScale: {
    title: 'The 1–9 quality scale',
    body: 'You are rating your impression of quality, not how strong something is. 5 means neither high nor low — a perfectly ordinary coffee sits there. Above 5 is where quality rises, below 5 is where it falls. Most specialty coffees land between 6 and 8; reserve 9 for something remarkable.',
  },
  score: {
    title: 'What the score means',
    body: 'The CVA score runs from 58 to 100: it is 0.65625 × the sum of your eight section scores, plus 52.75, minus 2 points per non-uniform cup and 4 per defective cup. By long convention 80+ is considered specialty grade. It is a measure of quality impression, not of how much you personally liked the coffee.',
  },
  'cva.fragrance': { title: 'Fragrance', body: 'The smell of the dry, freshly ground coffee, before any water touches it. Break the surface of the grounds with your nose close to the cup. High quality here means the fragrance is clean, distinct, and appealing — not simply loud.' },
  'cva.aroma': { title: 'Aroma', body: 'The smell of the wet coffee, judged as you break the crust about four minutes after pouring. Push the crust back with your spoon and inhale as the trapped aromatics release. This is often the most revealing moment of the whole cupping.' },
  'cva.flavor': { title: 'Flavor', body: 'The coffee’s principal character in the mouth — everything between the first impression and the final swallow, combining taste and retronasal aroma. Slurp sharply so the coffee sprays across the palate.' },
  'cva.aftertaste': { title: 'Aftertaste', body: 'What remains after you swallow or spit. Quality here is about whether the finish is pleasant and holds together — a fine coffee resolves cleanly and lingers agreeably, a lesser one turns thin, harsh, or simply disappears.' },
  'cva.acidity': { title: 'Acidity', body: 'The brightness and liveliness of the cup. At its best it reads as sweet, juicy, and structural, giving the coffee lift. Judge how well it fits the coffee — high quality acidity is well-integrated, not merely sharp or sour.' },
  'cva.sweetness': { title: 'Sweetness', body: 'The perception of sweetness, which in coffee comes from ripe, well-processed fruit rather than added sugar. It often shows as a rounded, full sensation and a pleasant lingering finish. Under-ripe or over-fermented lots lose it.' },
  'cva.mouthfeel': { title: 'Mouthfeel', body: 'The tactile sensation of the liquid — its weight, texture and viscosity. A heavy body is not automatically better than a light one: rate how pleasing and appropriate the texture is, whether that is syrupy and coating or delicate and tea-like.' },
  'cva.overall': { title: 'Overall', body: 'Your holistic judgement of the coffee as a whole. This is where you record what the individual sections miss — complexity, harmony, distinctiveness, and whether the coffee amounts to more than the sum of its parts.' },
  cvaDefects: {
    title: 'Cup deductions',
    body: 'Count cups, not severity. A non-uniform cup is one that clearly differs from its neighbours and costs 2 points. A defective cup carries a genuine fault — phenolic, ferment, mould, chemical — and costs 4. When a cup is defective, count it only as defective, not also as non-uniform.',
  },
  describeVsScore: {
    title: 'Describe vs Score',
    body: 'These are two different SCA forms asking two different questions, and only one of them produces a number. Describe (Standard 103) records what the coffee is like: how intense each section is on a 0–15 scale, and which descriptors apply — no opinion about whether that is good. Score (Standard 104) records how good it is: your impression of quality for each of the eight sections on a 1–9 scale, and those eight are what add up to the score out of 100. Describing is optional and changes nothing about the score; a delicate coffee can be low intensity and still score highly. Fill the Describe card if you want the vocabulary and the history, and score every section either way.',
  },
  descIntensity: {
    title: 'Intensity, not quality',
    body: 'This is the opposite of the scoring form: here you record how strong each section is, from 0 to 15, with no judgement about whether that is good. Rate the total intensity of the section, not of any one note — if a fragrance has a strong fruity note and a faint chocolate one, rate how strong the fragrance is overall. A delicate, elegant coffee can score highly for quality and still be low intensity.',
  },
  cata: {
    title: 'Choosing descriptors',
    body: 'Check the descriptors that best represent the coffee — up to five in the olfactory list, and up to two main tastes. These are categories from the Coffee Taster’s Flavor Wheel, not poetic notes: check the category, then write specifics like “jasmine” or “dried apricot” in the notes beside it. Acidity and sweetness have no checklist by design — describe those in your own words.',
  },
  'legacy.scale': { title: 'The 6–10 scale', body: 'The 2004 form scores quality from 6.00 to 10.00 in quarter-point steps: 6 is Good, 7 Very Good, 8 Excellent, 9 Outstanding. Most specialty coffees sit between 7.00 and 8.50. The ten attributes sum to a maximum of 100.' },
  legacyCups: { title: 'Uniformity, Clean Cup, Sweetness', body: 'These three are judged cup by cup rather than scored on a scale. Every cup starts with credit; tap a cup to fail it. Each cup is worth its share of 10 points, so with five cups on the table each failed cup costs 2 points.' },
  legacyDefects: { title: 'Taints and faults', body: 'A taint is an off-flavor noticeable in the aroma but not overwhelming, costing 2 points per affected cup. A fault is stronger and usually found in the taste, costing 4 points per cup. Count how many cups are affected, not how bad it seems.' },
  details: { title: 'Coffee details', body: 'Recording variety, process, altitude, farm, producer and roast profile is what makes your history useful later — it lets the app show how your scores break down by process or origin over time. When you share a cupping, these stay hidden from the table unless you choose to reveal them.' },
};

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
    // which sections the cupper has actually rated — a default 5 and a
    // deliberate 5 are the same number, and only one of them is data
    touched: {},
    desc: emptyDescriptive(),
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

/* ---------- guided mode ---------- */

function guidedOn() {
  try { return localStorage.getItem(GUIDED_KEY) !== 'off'; } catch (e) { return true; }
}

function setGuided(on) {
  try { localStorage.setItem(GUIDED_KEY, on ? 'on' : 'off'); } catch (e) {}
  applyGuided();
}

// Off means a denser sheet, not just missing help buttons.
function applyGuided() {
  document.body.classList.toggle('plain', !guidedOn());
}

// Small "?" button; returns null when guided mode is off so callers can
// append unconditionally.
function helpBtn(id) {
  if (!guidedOn() || !HELP[id]) return null;
  const btn = el('button', 'help-btn', '?');
  btn.type = 'button';
  btn.setAttribute('aria-label', `About ${HELP[id].title}`);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    openHelp(id);
  });
  return btn;
}

function addHelp(container, id) {
  const btn = helpBtn(id);
  if (btn) container.appendChild(btn);
}

function openHelp(id) {
  const entry = HELP[id];
  if (!entry) return;
  haptic();
  const modal = $('#help-modal');
  $('#help-title').textContent = entry.title;
  $('#help-body').textContent = entry.body;
  modal.classList.remove('hidden');
  const close = () => { modal.classList.add('hidden'); modal.onclick = null; };
  $('#help-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
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
      // sessions predating progress tracking were scored deliberately
      if (!c.touched) {
        c.touched = {};
        [...CVA_SECTIONS, ...SCALE_ATTRS].forEach(a => { c.touched[a.key] = true; });
      }
      if (typeof c.nonUniform !== 'number') c.nonUniform = 0;
      if (typeof c.defective !== 'number') c.defective = 0;
      // descriptive data predating the 103-2024 rebuild is dropped rather
      // than half-migrated: its CATA lists no longer map onto the standard
      const base = emptyDescriptive();
      if (!c.desc || !c.desc.cata || !Array.isArray(c.desc.cata.aroma)) c.desc = base;
      else {
        c.desc.roast = c.desc.roast || '';
        c.desc.intensity = Object.assign(base.intensity, c.desc.intensity || {});
        c.desc.notes = Object.assign(base.notes, c.desc.notes || {});
        c.desc.cata = Object.assign(base.cata, c.desc.cata);
      }
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
      // descriptors travel with the record so history stays searchable
      descriptors: usingCVA() && c.desc
        ? [...new Set([...c.desc.cata.aroma, ...c.desc.cata.flavor, ...c.desc.cata.tastes, ...c.desc.cata.mouthfeel])]
        : [],
      intensity: usingCVA() && c.desc ? { ...c.desc.intensity } : null,
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

// Turn a fresh token pair into a signed-in session.
async function adoptSession(data) {
  if (!data || !data.access_token) return false;
  saveAuth({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: null,
  });
  try {
    const user = data.user || await sbFetch('/auth/v1/user');
    const auth = loadAuth();
    auth.user = {
      id: user.id,
      email: user.email || '',
      name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '',
      avatar: (user.user_metadata && user.user_metadata.avatar_url) || '',
    };
    saveAuth(auth);
    if (auth.user.name && !getCupperName()) setCupperName(auth.user.name.split(' ')[0]);
    renderAccountButton();
    const label = auth.user.name ? auth.user.name.split(' ')[0] : auth.user.email;
    toast(`Signed in${label ? ' as ' + label : ''}`);
    cloudSyncAll();
    return true;
  } catch (e) {
    clearAuth();
    return false;
  }
}

// Sign in with the 6-digit code from the email — immune to the link
// being consumed by a spam scanner or opened in a different browser.
async function verifyEmailCode(email, code) {
  try {
    const data = await sbFetch('/auth/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ type: 'email', email, token: code }),
    });
    return await adoptSession(data);
  } catch (e) {
    return false;
  }
}

// Handle the return trip from a magic link or OAuth. Supabase reports
// failures here too, and staying silent about them is worse than useless.
async function handleAuthRedirect() {
  const hash = new URLSearchParams(ENTRY_HASH.replace(/^#/, ''));
  const query = new URLSearchParams(ENTRY_SEARCH);
  const clean = () => history.replaceState(null, '', location.pathname);

  const error = hash.get('error_description') || hash.get('error')
    || query.get('error_description') || query.get('error');
  if (error) {
    clean();
    const text = decodeURIComponent(String(error).replace(/\+/g, ' '));
    toast(/expired|invalid/i.test(text)
      ? 'That sign-in link was already used or expired — use the code instead'
      : text.slice(0, 90));
    return true;
  }

  if (hash.get('access_token')) {
    const data = {
      access_token: hash.get('access_token'),
      refresh_token: hash.get('refresh_token'),
      expires_in: parseInt(hash.get('expires_in') || '3600', 10),
    };
    clean();
    if (!await adoptSession(data)) toast('Sign-in failed — please try again');
    return true;
  }

  // PKCE-style return: we never started a PKCE flow, so say so plainly
  // rather than appearing to do nothing.
  if (query.get('code') && !query.get('state')) {
    clean();
    toast('Sign-in link needs the code instead — open your profile and enter it');
    return true;
  }

  return false;
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

// Free passwordless option for non-Google users. Supabase emails both a
// link and a 6-digit code; we lead with the code because links get
// consumed by spam scanners and open in whichever browser the mail app
// prefers, neither of which the code cares about.
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

function openEmailCodeSheet(email) {
  const modal = $('#otp-modal');
  $('#otp-where').textContent = email;

  const pad = mountKeypad({
    boxes: $('#otp-boxes'),
    keypad: $('#otp-keypad'),
    errorEl: $('#otp-error'),
    length: OTP_LENGTH,
    maxLength: 10, // Supabase allows 6–10; keep typing if yours is longer
    onComplete: async code => {
      const ok = await verifyEmailCode(email, code);
      if (!ok) return code.length < 10
        ? 'Not yet — keep typing if your code is longer.'
        : 'That code didn’t work — send a new one.';
      close();
      return null;
    },
  });

  const close = () => {
    modal.classList.add('hidden');
    pad.detach();
    modal.onclick = null;
  };

  modal.classList.remove('hidden');
  $('#otp-cancel').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  $('#otp-resend').onclick = async () => {
    $('#otp-error').textContent = '';
    $('#otp-resend').textContent = 'Sending…';
    const ok = await sendMagicLink(email);
    $('#otp-resend').textContent = ok ? 'New code sent' : 'Could not resend — wait a minute';
    setTimeout(() => { $('#otp-resend').textContent = 'Send a new code'; }, 4000);
  };
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
      <p class="modal-hint">We’ll email you a 6-digit code — no password. Your cuppings then back up and follow you across devices. Joining a cupping and scoring never requires an account.</p>
      <div class="auth-buttons">
        <label class="detail-label" for="auth-email">Your email</label>
        <input class="detail-field auth-email-field" id="auth-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com">
        <button class="btn btn-primary" id="btn-auth-email">Email me a code</button>
        <p class="account-status" id="auth-email-status"></p>
        <div class="auth-divider"><span>or</span></div>
        <button class="auth-btn auth-google" id="btn-auth-google">${googleIconSVG} Continue with Google</button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-auth-cancel">Not now</button>
      </div>
    `;
    sheet.querySelector('#btn-auth-google').onclick = () => signInWith('google');

    const emailInput = sheet.querySelector('#auth-email');
    const sendCode = async () => {
      const email = emailInput.value.trim();
      const status = sheet.querySelector('#auth-email-status');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Enter a valid email address.'; return; }
      status.textContent = 'Sending…';
      const ok = await sendMagicLink(email);
      if (!ok) { status.textContent = 'Could not send the code. Try again in a minute.'; return; }
      close();
      openEmailCodeSheet(email);
    };
    sheet.querySelector('#btn-auth-email').onclick = sendCode;
    emailInput.onkeydown = e => { if (e.key === 'Enter') sendCode(); };
    setTimeout(() => emailInput.focus(), 80);
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

// How much of a coffee's scoresheet has actually been filled in.
function scoreProgress(c) {
  const sections = usingCVA() ? CVA_SECTIONS : SCALE_ATTRS;
  const done = sections.filter(a => c.touched && c.touched[a.key]).length;
  return { done, total: sections.length, complete: done === sections.length };
}

function sessionProgress() {
  const rows = state.coffees.map(scoreProgress);
  return {
    complete: rows.every(r => r.complete),
    untouched: rows.filter(r => r.done === 0).length,
    partial: rows.filter(r => r.done > 0 && !r.complete).length,
  };
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

// Join codes arrive from anyone who can send a link, and a few kilobytes of
// gzip can expand to gigabytes, so the output is read in chunks and
// abandoned once it passes a sane ceiling for a ten-coffee lineup.
const MAX_DECODED_BYTES = 256 * 1024;

async function gunzipBytes(bytes) {
  const reader = new Blob([bytes]).stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DECODED_BYTES) {
      reader.cancel();
      throw new Error('decoded payload too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  chunks.forEach(c => { out.set(c, at); at += c.length; });
  return out;
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
  const m = (text || '').replace(/\s+/g, ' ').match(new RegExp(kind + '([GP])\\.([A-Za-z0-9_-]{1,32768})'));
  if (!m) return null;
  try {
    let bytes = b64urlDecode(m[2]);
    if (bytes.length > MAX_DECODED_BYTES) return null;
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
    // only the fields the form actually has — a crafted payload does not get
    // to stuff arbitrary keys into stored state
    const meta = emptyMeta();
    META_FIELDS.forEach(f => {
      const v = k.m && k.m[f.key];
      if (typeof v === 'string' || typeof v === 'number') meta[f.key] = String(v).slice(0, 60);
    });
    state.coffees[i].meta = meta;
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
  return data && data.id ? data.id : null;
}

async function relaySubmitScores(code, id, name, scores) {
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}/participants/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, scores }),
  });
  return Boolean(data && data.ok);
}

async function relayReveal(code, token) {
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return Boolean(data && data.ok);
}

// { participants:[{name, submitted, scores?}], revealed }
// The roster is only served to the leader or someone already at the table,
// so proof of one or the other travels with the request.
async function relayListParticipants(code) {
  const proof = state.liveToken && code === state.liveCode
    ? `token=${encodeURIComponent(state.liveToken)}`
    : state.participantId ? `id=${encodeURIComponent(state.participantId)}` : '';
  if (!proof) return null;
  const data = await relayRequest(`/sessions/${encodeURIComponent(code)}/participants?${proof}`, { method: 'GET' });
  return data && Array.isArray(data.participants) ? data : null;
}

function myScores() {
  return state.coffees.map(c => Math.round(coffeeScore(c) * 100) / 100);
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

/* ---------- reusable digit keypad ---------- */

// Wires a set of code boxes and a 0–9 pad. onComplete(code) may return a
// string to show as an error, which shakes the boxes and clears them.
// Codes auto-submit at `length`; when `maxLength` is larger, a failed
// attempt keeps the digits so a longer code can simply be typed out —
// providers do not agree on how long a one-time code should be.
function mountKeypad({ boxes, keypad, errorEl, length, maxLength = length, onComplete }) {
  let digits = '';
  let busy = false;
  let shown = length;

  const render = () => {
    const want = Math.max(length, Math.min(maxLength, digits.length + (digits.length >= length ? 1 : 0)));
    if (want !== shown) {
      shown = want;
      boxes.innerHTML = '';
      for (let i = 0; i < shown; i++) boxes.appendChild(el('div', 'pin-box'));
    }
    [...boxes.children].forEach((box, i) => {
      box.textContent = digits[i] || '';
      box.classList.toggle('filled', i < digits.length);
      box.classList.toggle('next', i === digits.length);
    });
  };

  const fail = message => {
    errorEl.textContent = message;
    boxes.classList.remove('shake');
    void boxes.offsetWidth;
    boxes.classList.add('shake');
    // a longer code is still possible, so keep what was typed
    if (digits.length >= maxLength) digits = '';
    render();
  };

  const submit = async () => {
    busy = true;
    errorEl.textContent = '';
    const problem = await onComplete(digits);
    busy = false;
    if (problem) fail(problem);
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
    if (digits.length >= maxLength) return;
    digits += key;
    const box = boxes.children[digits.length - 1];
    if (box) {
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    }
    render();
    if (digits.length >= length) setTimeout(submit, 180);
  };

  const onKey = e => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
  };

  boxes.innerHTML = '';
  for (let i = 0; i < shown; i++) boxes.appendChild(el('div', 'pin-box'));

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
  document.addEventListener('keydown', onKey);
  return { detach: () => document.removeEventListener('keydown', onKey) };
}

/* ---------- join by keypad ---------- */

function openJoinSheet() {
  const modal = $('#join-modal');

  const pad = mountKeypad({
    boxes: $('#pin-boxes'),
    keypad: $('#keypad'),
    errorEl: $('#pin-error'),
    length: 4,
    maxLength: 6, // the relay falls back to 6 digits if 4-digit codes collide
    onComplete: async code => {
      const payload = await relayFetchSession(code);
      if (!payload) return code.length < 6
        ? 'No cupping yet — keep typing if your code is longer.'
        : 'No cupping found for that code.';
      close();
      askNameThenJoin(payload, code);
      return null;
    },
  });

  const close = () => {
    modal.classList.add('hidden');
    pad.detach();
  };

  modal.classList.remove('hidden');

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
      relayJoinSession(code, name || 'Cupper').then(id => {
        if (!id || !state) return;
        state.participantId = id;
        save();
      });
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
    const data = await relayListParticipants(state.liveCode);
    if (!data) return;
    const people = data.participants;
    const done = people.filter(p => p.submitted).length;
    state.revealed = data.revealed;
    save();

    joinedWrap.classList.remove('hidden');
    $('#joined-title').textContent = people.length
      ? `At the table · ${done} of ${people.length} submitted`
      : 'At the table';

    joinedList.innerHTML = '';
    if (!people.length) {
      joinedList.appendChild(el('span', 'joined-empty', 'Waiting for cuppers to join…'));
    } else {
      people.forEach((p, i) => {
        const chip = el('span', `joined-chip${p.submitted ? ' done' : ''}`, escapeHTML(p.name));
        chip.style.animationDelay = `${i * 0.04}s`;
        joinedList.appendChild(chip);
      });
    }

    // reveal control: sealed scores are the protocol, so this is deliberate
    revealBtn.classList.toggle('hidden', !people.length);
    if (data.revealed) {
      revealBtn.textContent = 'Scores revealed — see Results';
      revealBtn.disabled = true;
    } else {
      revealBtn.disabled = false;
      revealBtn.textContent = done < people.length
        ? `Reveal scores now (${people.length - done} still cupping)`
        : 'Reveal scores to the table';
    }
  };

  const revealBtn = $('#btn-reveal');
  revealBtn.onclick = async () => {
    if (!state.liveCode || !state.liveToken) return;
    if (!confirm('Reveal every cupper’s scores? The protocol asks cuppers to score independently first — this opens the table for discussion and cannot be undone.')) return;
    revealBtn.disabled = true;
    const ok = await relayReveal(state.liveCode, state.liveToken);
    if (!ok) { revealBtn.disabled = false; toast('Could not reveal — try again'); return; }
    state.revealed = true;
    save();
    toast('Scores revealed');
    refreshJoined();
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

  // Reuse the code this session already has — reopening the sheet must not
  // mint a new one, or everyone who already joined is orphaned.
  let live = null;
  if (state.liveCode && state.liveToken && await relayFetchSession(state.liveCode)) {
    live = { code: state.liveCode, token: state.liveToken };
    relayUpdateSession(live.code, live.token, buildSessionPayload()); // keep the lineup current
  } else {
    live = await relayCreateSession(buildSessionPayload());
  }

  if (live) {
    state.liveCode = live.code;
    state.liveToken = live.token;
    save();
    refreshTabs(); // surface the code on the header button
    // The leader is a cupper too: register them at their own table so the
    // panel average is computed from the same roster everyone else sees.
    if (!state.participantId) {
      const id = await relayJoinSession(live.code, getCupperName() || 'Host');
      if (id && state) { state.participantId = id; save(); }
    }
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
   LINEUP SCREEN
   A step between "how many coffees" and scoring them. Entering
   eight coffees one panel at a time, mid-cupping, was the part
   of the first real session that dragged; here they are one
   list, names are optional, and details fold away.
   ============================================================ */

// Someone who joined a table is cupping the leader's lineup. Scores are
// submitted by position, so letting a guest add, remove or rename coffees
// would quietly misalign their sheet against everyone else's.
function lineupLocked() {
  return Boolean(state && state.joinedCode);
}

function openLineup() {
  buildLineup();
  showScreen('#screen-lineup');
}

function buildLineup() {
  const locked = lineupLocked();
  const list = $('#lineup-list');
  list.innerHTML = '';
  state.coffees.forEach((coffee, i) => list.appendChild(buildLineupRow(coffee, i, locked)));

  $('#lineup-intro').innerHTML = locked
    ? 'This lineup comes from the cupping leader. Details appear here if they choose to share them.'
    : 'Name the coffees before you invite anyone — the table sees these names. Leave a card blank and it stays <strong>Coffee 1</strong>, <strong>Coffee 2</strong>, and you can fill in the rest later.';

  $('#btn-lineup-add').classList.toggle('hidden', locked);
  $('#btn-lineup-paste').classList.toggle('hidden', locked);
  $('#btn-lineup-invite').classList.toggle('hidden', locked);
  $('#btn-lineup-add').disabled = state.coffees.length >= LIMITS.coffees[1];

  // once there are scores on the sheet this screen is an edit, not a setup
  const scored = state.coffees.length - sessionProgress().untouched;
  $('#btn-lineup-start').textContent = scored > 0 ? 'Back to cupping' : 'Start cupping';
}

function buildLineupRow(coffee, index, locked) {
  const row = el('div', 'lineup-row');
  row.style.animationDelay = `${Math.min(index, 8) * 0.03}s`;
  row.innerHTML = `
    <div class="lineup-top">
      <span class="lineup-num">${index + 1}</span>
      <input class="lineup-name" type="text" maxlength="40" autocomplete="off" enterkeyhint="next">
      <button class="lineup-icon remove" type="button" aria-label="Remove coffee ${index + 1}">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <button class="lineup-icon chev" type="button" aria-label="Details for coffee ${index + 1}">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="details-collapse"><div class="details-collapse-inner"><div class="details-grid"></div></div></div>
  `;

  const nameInput = row.querySelector('.lineup-name');
  nameInput.placeholder = `Coffee ${index + 1} — name or lot…`;
  nameInput.value = coffee.name;
  nameInput.readOnly = locked;

  const syncRow = () => {
    row.classList.toggle('named', Boolean(coffee.name.trim()));
    row.classList.toggle('has-meta', Boolean(metaSummary(coffee.meta)));
  };

  nameInput.addEventListener('input', () => {
    coffee.name = nameInput.value;
    syncRow();
    save();
  });
  // Enter walks down the list, so a whole lineup can be typed in one go
  nameInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = $('#lineup-list').children[index + 1];
    if (next) next.querySelector('.lineup-name').focus();
    else nameInput.blur();
  });

  const grid = row.querySelector('.details-grid');
  META_FIELDS.forEach(f => {
    const cell = el('div', 'detail-cell' + (f.wide ? ' wide' : ''));
    const input = document.createElement('input');
    input.className = 'detail-field';
    input.type = 'text';
    input.placeholder = f.placeholder;
    input.value = coffee.meta[f.key] || '';
    input.maxLength = 60;
    input.readOnly = locked;
    if (f.list) input.setAttribute('list', f.list);
    if (f.inputmode) input.setAttribute('inputmode', f.inputmode);
    input.addEventListener('input', () => {
      coffee.meta[f.key] = input.value;
      syncRow();
      save();
    });
    cell.appendChild(el('span', 'detail-label', f.label));
    cell.appendChild(input);
    grid.appendChild(cell);
  });

  row.querySelector('.lineup-icon.chev').addEventListener('click', () => {
    haptic();
    row.classList.toggle('open');
  });

  const removeBtn = row.querySelector('.lineup-icon.remove');
  removeBtn.classList.toggle('hidden', locked || state.coffees.length <= 1);
  removeBtn.addEventListener('click', () => {
    if (state.coffees.length <= 1) return;
    const p = scoreProgress(coffee);
    if (p.done > 0 && !confirm(`${coffeeName(coffee, index)} has ${p.done} section${p.done > 1 ? 's' : ''} scored. Remove it anyway?`)) return;
    state.coffees.splice(index, 1);
    state.activeIndex = Math.min(state.activeIndex, state.coffees.length - 1);
    haptic();
    save();
    buildLineup();
  });

  syncRow();
  return row;
}

function addLineupCoffee() {
  if (lineupLocked() || state.coffees.length >= LIMITS.coffees[1]) return;
  state.coffees.push(newCoffee(state.cupsPerCoffee));
  haptic();
  save();
  buildLineup();
  const rows = $('#lineup-list').children;
  const last = rows[rows.length - 1];
  if (last) {
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    last.querySelector('.lineup-name').focus();
  }
}

// Typing eight names into eight fields is the tedious part; a roaster
// usually has the list somewhere already.
function openLineupPaste() {
  if (lineupLocked()) return;
  openModal({
    title: 'Paste the lineup',
    hint: 'One coffee per line — just the names. The lineup grows or shrinks to match, up to ten.',
    cta: 'Fill the lineup',
    onSubmit: text => {
      const names = String(text || '')
        .split('\n')
        .map(s => s.replace(/^\s*[-–—•*\d.)\]]+\s*/, '').trim())
        .filter(Boolean)
        .slice(0, LIMITS.coffees[1]);
      if (!names.length) { toast('No names found'); return false; }

      const scored = state.coffees.slice(names.length).filter(c => scoreProgress(c).done > 0).length;
      if (scored > 0 && !confirm(`This shortens the lineup and drops ${scored} coffee${scored > 1 ? 's' : ''} that already ${scored > 1 ? 'have' : 'has'} scores. Continue?`)) return false;

      while (state.coffees.length < names.length) state.coffees.push(newCoffee(state.cupsPerCoffee));
      state.coffees.length = names.length;
      names.forEach((n, i) => { state.coffees[i].name = n.slice(0, 40); });
      state.activeIndex = Math.min(state.activeIndex, state.coffees.length - 1);
      save();
      buildLineup();
      toast(`${names.length} coffee${names.length > 1 ? 's' : ''} in the lineup`);
      return true;
    },
  });
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

// One segment per coffee — a whole table fits the width at ten samples,
// where a scrolling tab strip showed barely one and a half.
function buildTabs() {
  const rail = $('#coffee-rail');
  rail.innerHTML = '';
  state.coffees.forEach((c, i) => {
    const seg = el('button', 'rail-seg');
    seg.type = 'button';
    seg.innerHTML = '<span class="rail-fill"></span><span class="rail-num"></span>';
    seg.addEventListener('click', () => {
      if (i === state.activeIndex) return;
      state.activeIndex = i;
      haptic();
      scrollToPanel(i, true);
      syncActivePanel(true);
      save();
    });
    rail.appendChild(seg);
  });
  rail.classList.toggle('dense', state.coffees.length > 6);
}

function refreshTabs() {
  const rail = $('#coffee-rail');
  const active = state.coffees[state.activeIndex];
  if (!active) return;

  // once a table is live the button carries the code, so the leader can
  // read it out without opening the sheet
  const invite = $('#btn-share-session');
  const live = Boolean(state.liveCode);
  invite.classList.toggle('live', live);
  invite.querySelector('span').textContent = live ? state.liveCode : 'Invite';
  invite.setAttribute('aria-label', live
    ? `Cupping code ${state.liveCode.split('').join(' ')} — open invite`
    : 'Invite cuppers to this session');

  const progress = scoreProgress(active);
  $('#cupping-name').textContent = coffeeName(active, state.activeIndex);
  $('#cupping-position').textContent = state.coffees.length > 1
    ? `${state.activeIndex + 1} of ${state.coffees.length} · ${progress.complete ? fmt(coffeeScore(active)) : `${progress.done}/${progress.total} rated`}`
    : (progress.complete ? fmt(coffeeScore(active)) : `${progress.done} of ${progress.total} rated`);

  state.coffees.forEach((c, i) => {
    const seg = rail.children[i];
    if (!seg) return;
    const p = scoreProgress(c);
    seg.querySelector('.rail-fill').style.width = `${(p.done / p.total) * 100}%`;
    seg.querySelector('.rail-num').textContent = i + 1;
    seg.classList.toggle('active', i === state.activeIndex);
    seg.classList.toggle('done', p.complete);
    seg.setAttribute('aria-label',
      `${coffeeName(c, i)}, ${p.complete ? 'rated' : `${p.done} of ${p.total} rated`}`);
    seg.setAttribute('aria-current', i === state.activeIndex ? 'true' : 'false');
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
    // the two halves are different SCA forms asking different questions, and
    // on one scrolling sheet they read as the same thing
    panel.appendChild(panelHead('Describe', 'what you taste · no judgement', 'describeVsScore'));
    panel.appendChild(buildDescriptiveCard(coffee));
    panel.appendChild(panelHead('Score', 'how good it is · 1–9 each', 'describeVsScore'));
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

// A labelled divider inside a panel, with the guided-mode help attached.
function panelHead(title, sub, helpId) {
  const head = el('div', 'panel-head');
  const label = el('span', 'panel-head-title', escapeHTML(title));
  head.appendChild(label);
  head.appendChild(el('span', 'panel-head-sub', escapeHTML(sub)));
  if (helpId) addHelp(label, helpId);
  return head;
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
  addHelp(card.querySelector('.details-toggle-label'), 'details');

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

/* ============================================================
   FLAVOR WHEEL
   A reference wheel built from the categories of the SCA/WCR/UC
   Davis Coffee Taster's Flavor Wheel. Tapping an inner category
   ticks the matching CATA box; tapping an outer descriptor drops
   the word into the coffee's tasting notes.
   ============================================================ */

const WHEEL = [
  { name: 'Floral', color: '#e87fa8', children: ['Black Tea', 'Chamomile', 'Rose', 'Jasmine'] },
  { name: 'Fruity', color: '#e0464b', children: ['Berry', 'Dried Fruit', 'Citrus Fruit', 'Blueberry', 'Strawberry', 'Raisin', 'Prune', 'Peach', 'Apple', 'Grape', 'Lemon', 'Orange'] },
  { name: 'Sour/Fermented', color: '#e5c650', children: ['Sour', 'Fermented', 'Citric Acid', 'Malic Acid', 'Winey', 'Whiskey', 'Overripe'] },
  { name: 'Green/Vegetative', color: '#5fa855', children: ['Olive Oil', 'Raw', 'Under-ripe', 'Peapod', 'Fresh', 'Hay-like', 'Herb-like'] },
  { name: 'Other', color: '#9aa3ab', children: ['Chemical', 'Musty/Earthy', 'Woody', 'Papery', 'Petroleum', 'Medicinal', 'Salty', 'Stale'] },
  { name: 'Roasted', color: '#8a4a2b', children: ['Cereal', 'Burnt', 'Tobacco', 'Pipe Tobacco', 'Acrid', 'Ashy', 'Smoky', 'Grain', 'Malt'] },
  { name: 'Spices', color: '#b8452f', children: ['Pungent', 'Pepper', 'Brown Spice', 'Anise', 'Nutmeg', 'Cinnamon', 'Clove'] },
  { name: 'Nutty/Cocoa', color: '#c08a4e', children: ['Nutty', 'Cocoa', 'Peanuts', 'Hazelnut', 'Almond', 'Chocolate', 'Dark Chocolate'] },
  { name: 'Sweet', color: '#e8963f', children: ['Vanilla/Vanillin', 'Brown Sugar', 'Honey', 'Caramelized', 'Maple Syrup', 'Molasses', 'Overall Sweet'] },
];

// wheel category → the CATA descriptor it corresponds to on the form
const WHEEL_TO_CATA = { Spices: 'Spice' };

function wheelCataName(category) {
  return WHEEL_TO_CATA[category] || category;
}

function buildWheelSVG() {
  const SIZE = 340, C = SIZE / 2;
  const R_IN = 52, R_MID = 108, R_OUT = 164;
  const total = WHEEL.reduce((n, c) => n + c.children.length, 0);

  const arc = (r0, r1, a0, a1) => {
    const p = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
    const [x0, y0] = p(r0, a0), [x1, y1] = p(r1, a0);
    const [x2, y2] = p(r1, a1), [x3, y3] = p(r0, a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} A${r1},${r1} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r0},${r0} 0 ${large} 0 ${x0.toFixed(1)},${y0.toFixed(1)} Z`;
  };

  let svg = `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coffee flavor wheel">`;
  let angle = -Math.PI / 2;
  let outerAngle = -Math.PI / 2;

  WHEEL.forEach(cat => {
    const span = (cat.children.length / total) * Math.PI * 2;
    const a0 = angle, a1 = angle + span;
    const mid = (a0 + a1) / 2;

    svg += `<path class="wheel-seg wheel-cat" d="${arc(R_IN, R_MID, a0, a1)}" fill="${cat.color}" data-cat="${escapeHTML(cat.name)}"/>`;

    // category label, rotated to sit along its wedge
    const lx = C + ((R_IN + R_MID) / 2) * Math.cos(mid);
    const ly = C + ((R_IN + R_MID) / 2) * Math.sin(mid);
    let deg = (mid * 180) / Math.PI;
    if (deg > 90 || deg < -90) deg += 180;
    svg += `<text class="wheel-cat-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${deg.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${escapeHTML(cat.name.replace('/', ' / '))}</text>`;

    cat.children.forEach(child => {
      const cSpan = (1 / total) * Math.PI * 2;
      const c0 = outerAngle, c1 = outerAngle + cSpan;
      const cMid = (c0 + c1) / 2;
      svg += `<path class="wheel-seg wheel-child" d="${arc(R_MID, R_OUT, c0, c1)}" fill="${cat.color}" fill-opacity="0.45" data-desc="${escapeHTML(child)}" data-cat="${escapeHTML(cat.name)}"/>`;
      const tx = C + ((R_MID + R_OUT) / 2 - 2) * Math.cos(cMid);
      const ty = C + ((R_MID + R_OUT) / 2 - 2) * Math.sin(cMid);
      let cDeg = (cMid * 180) / Math.PI;
      if (cDeg > 90 || cDeg < -90) cDeg += 180;
      svg += `<text class="wheel-child-label" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${cDeg.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})">${escapeHTML(child)}</text>`;
      outerAngle = c1;
    });

    angle = a1;
  });

  svg += `<circle cx="${C}" cy="${C}" r="${R_IN - 2}" class="wheel-hub"/>`;
  svg += `<text x="${C}" y="${C - 5}" text-anchor="middle" class="wheel-hub-label">flavor</text>`;
  svg += `<text x="${C}" y="${C + 11}" text-anchor="middle" class="wheel-hub-label">wheel</text>`;
  svg += '</svg>';
  return svg;
}

// every outer-ring word, for spotting the ones already sitting in the notes
const WHEEL_WORDS = WHEEL.flatMap(c => c.children);

// notes the wheel writes are comma-separated items, so they can be matched
// and removed exactly rather than by searching the taster's prose
function noteItems(notes) {
  return notes.split(',').map(s => s.trim()).filter(Boolean);
}

function openFlavorWheel() {
  const modal = $('#wheel-modal');
  const holder = $('#wheel-holder');
  const status = $('#wheel-status');
  const pickedWrap = $('#wheel-picked');
  if (!holder.dataset.built) {
    holder.innerHTML = buildWheelSVG();
    holder.dataset.built = '1';
  }

  const coffee = state && state.coffees[state.activeIndex];

  const cataList = () => coffee.desc.cata.flavor;
  const notesFromWheel = () => {
    const items = noteItems(coffee.notes).map(s => s.toLowerCase());
    return WHEEL_WORDS.filter(w => items.includes(w.toLowerCase()));
  };

  const dropNote = word => {
    coffee.notes = noteItems(coffee.notes)
      .filter(s => s.toLowerCase() !== word.toLowerCase())
      .join(', ');
  };

  const sync = message => {
    if (!coffee || !coffee.desc) return;
    const cata = new Set([...coffee.desc.cata.aroma, ...coffee.desc.cata.flavor]);
    const words = notesFromWheel();
    const wordSet = new Set(words.map(w => w.toLowerCase()));

    holder.querySelectorAll('.wheel-cat').forEach(seg => {
      seg.classList.toggle('picked', cata.has(wheelCataName(seg.dataset.cat)));
    });
    holder.querySelectorAll('.wheel-child').forEach(seg => {
      seg.classList.toggle('picked', wordSet.has(seg.dataset.desc.toLowerCase()));
    });

    // a running list of what has been taken from the wheel, each one tappable
    // to take it back — the wheel was hard to read as a record on its own
    pickedWrap.innerHTML = '';
    [...cata].forEach(name => {
      const chip = el('button', 'wheel-pick', `${escapeHTML(name)} <b>×</b>`);
      chip.type = 'button';
      chip.onclick = () => {
        haptic();
        ['aroma', 'flavor'].forEach(k => {
          const at = coffee.desc.cata[k].indexOf(name);
          if (at >= 0) coffee.desc.cata[k].splice(at, 1);
        });
        save();
        sync(`${name} unchecked`);
        refreshOpenPanel();
      };
      pickedWrap.appendChild(chip);
    });
    words.forEach(word => {
      const chip = el('button', 'wheel-pick note', `${escapeHTML(word)} <b>×</b>`);
      chip.type = 'button';
      chip.onclick = () => {
        haptic();
        dropNote(word);
        save();
        sync(`“${word}” removed from your notes`);
        refreshOpenPanel();
      };
      pickedWrap.appendChild(chip);
    });

    status.textContent = message
      || `${cataList().length} of 5 descriptors checked${words.length ? ` · ${words.length} word${words.length > 1 ? 's' : ''} in your notes` : ''}`;
  };

  if (!coffee) {
    pickedWrap.innerHTML = '';
    status.textContent = 'Tap a wedge to explore the wheel';
  } else {
    sync();
  }

  holder.onclick = e => {
    const seg = e.target.closest('.wheel-seg');
    if (!seg || !coffee) return;
    haptic();
    let message;

    if (seg.classList.contains('wheel-cat')) {
      const name = wheelCataName(seg.dataset.cat);
      // five is the cap the standard sets for this list, not a UI choice
      if (!toggleCata(cataList(), name, 5)) {
        sync('Five already checked — tap one below to free a slot');
        return;
      }
      message = cataList().includes(name)
        ? `${name} checked · ${cataList().length} of 5`
        : `${name} unchecked · ${cataList().length} of 5`;
    } else {
      const word = seg.dataset.desc;
      if (notesFromWheel().some(w => w.toLowerCase() === word.toLowerCase())) {
        dropNote(word);
        message = `“${word}” removed from your notes`;
      } else {
        const existing = coffee.notes.trim();
        coffee.notes = existing ? `${existing}, ${word}` : word;
        message = `“${word}” added to your notes`;
      }
    }
    save();
    sync(message);
    refreshOpenPanel();
  };

  modal.classList.remove('hidden');
  const close = () => { modal.classList.add('hidden'); modal.onclick = null; holder.onclick = null; };
  $('#wheel-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
}

// keep the visible panel in step with edits made from the wheel
function refreshOpenPanel() {
  const panel = $('#panels').children[state.activeIndex];
  if (!panel) return;
  const notes = panel.querySelector('.notes-field');
  if (notes) notes.value = state.coffees[state.activeIndex].notes;
  const descCard = panel.querySelector('.describe-card');
  if (descCard && descCard.syncCata) descCard.syncCata();
}

/* ---------- CVA Descriptive Assessment (SCA 103-2024) ----------
   Describes the coffee without valuing it: 0–15 intensities and
   check-all-that-apply descriptors. Collapsed by default.        */

function emptyDescriptive() {
  const intensity = {};
  DESC_ATTRS.forEach(a => { intensity[a.key] = 5; }); // 5 = MEDIUM anchor
  const notes = {};
  DESC_NOTE_FIELDS.forEach(k => { notes[k] = ''; });
  return {
    roast: '',
    intensity,
    notes,
    cata: { aroma: [], flavor: [], tastes: [], mouthfeel: [] },
  };
}

function descriptiveSummary(desc) {
  const unique = [...new Set([...desc.cata.aroma, ...desc.cata.flavor])];
  return unique.length ? unique.slice(0, 3).join(' · ') + (unique.length > 3 ? '…' : '') : '';
}

// Toggle a descriptor in a capped CATA list; returns false when full.
function toggleCata(list, option, max) {
  const at = list.indexOf(option);
  if (at >= 0) { list.splice(at, 1); return true; }
  if (list.length >= max) return false;
  list.push(option);
  return true;
}

function buildDescriptiveCard(coffee) {
  const card = el('div', 'details-card describe-card');
  card.innerHTML = `
    <button class="details-toggle">
      <span class="details-toggle-label">Describe<span class="optional-pill">optional</span></span>
      <span class="details-summary"></span>
      <svg class="details-chevron" viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="details-collapse"><div class="details-collapse-inner">
      <div class="desc-body"></div>
    </div></div>
  `;

  const summaryEl = card.querySelector('.details-summary');
  const refreshSummary = () => {
    summaryEl.textContent = descriptiveSummary(coffee.desc) || 'what you taste, not how good';
  };

  const body = card.querySelector('.desc-body');
  const d = coffee.desc;
  addHelp(card.querySelector('.details-toggle-label'), 'describeVsScore');

  body.appendChild(el('p', 'desc-intro',
    'This half records <strong>what the coffee is like</strong> — intensity from 0 to 15, and which descriptors apply. None of it changes the score; the 1–9 sections below the card do that.'));

  // roast level, recorded before tasting begins
  const roast = el('div', 'desc-field');
  roast.innerHTML = `<span class="detail-label">Roast level</span>
    <input class="detail-field" type="text" maxlength="40" placeholder="e.g. light-medium, Agtron 63">`;
  const roastInput = roast.querySelector('input');
  roastInput.value = d.roast || '';
  roastInput.addEventListener('input', () => { d.roast = roastInput.value; save(); });
  body.appendChild(roast);

  const intensityRow = attr => {
    const row = el('div', 'desc-row');
    row.innerHTML = `
      <div class="desc-row-head">
        <span class="desc-row-name">${attr.label}${attr.sub ? ` <span class="desc-note">${attr.sub}</span>` : ''}</span>
        <span class="desc-row-value"></span>
      </div>
      <div class="slider slim">
        <div class="slider-track"><div class="slider-fill"></div></div>
        <div class="slider-ticks"></div>
        <div class="slider-thumb"></div>
      </div>
      <div class="slider-labels"><span>0 LOW</span><span>5</span><span>10 MEDIUM</span><span>15 HIGH</span></div>
    `;
    const valueEl = row.querySelector('.desc-row-value');
    const slider = row.querySelector('.slider');
    const fill = row.querySelector('.slider-fill');
    const thumb = row.querySelector('.slider-thumb');
    const ticks = row.querySelector('.slider-ticks');
    [0, 5, 10, 15].forEach(v => {
      const tick = el('span', 'slider-tick');
      tick.style.left = `${(v / 15) * 100}%`;
      ticks.appendChild(tick);
    });

    const position = () => {
      const pct = (d.intensity[attr.key] / 15) * 100;
      fill.style.width = `${pct}%`;
      thumb.style.left = `${pct}%`;
      valueEl.textContent = d.intensity[attr.key];
    };
    const setValue = v => {
      v = Math.min(15, Math.max(0, Math.round(v)));
      if (v === d.intensity[attr.key]) return;
      d.intensity[attr.key] = v;
      haptic();
      position();
      save();
    };
    const fromEvent = e => {
      const rect = slider.getBoundingClientRect();
      const x = Math.min(rect.right, Math.max(rect.left, e.clientX));
      return ((x - rect.left) / rect.width) * 15;
    };
    slider.addEventListener('pointerdown', e => {
      slider.setPointerCapture(e.pointerId);
      slider.classList.add('dragging');
      setValue(fromEvent(e));
    });
    slider.addEventListener('pointermove', e => {
      if (slider.classList.contains('dragging')) setValue(fromEvent(e));
    });
    const end = () => slider.classList.remove('dragging');
    slider.addEventListener('pointerup', end);
    slider.addEventListener('pointercancel', end);

    position();
    return row;
  };

  // Olfactory CATA: parent categories with their sub-descriptors, as printed
  const olfactoryChips = (listKey, max) => {
    const wrap = el('div', 'cata-chips-tree');
    const list = () => d.cata[listKey];
    const chips = [];
    CATA_OLFACTORY.forEach(cat => {
      const line = el('div', 'cata-line');
      [cat.name, ...(cat.children || [])].forEach((name, idx) => {
        const chip = el('button', `cata-chip${idx ? ' child' : ''}`, escapeHTML(name));
        chip.type = 'button';
        chip.dataset.name = name;
        const sync = () => chip.classList.toggle('on', list().includes(name));
        chip.addEventListener('click', () => {
          if (!toggleCata(list(), name, max)) { toast(`Up to ${max} descriptors here`); return; }
          haptic();
          chips.forEach(c => c.sync());
          refreshSummary();
          save();
        });
        chips.push({ sync });
        sync();
        line.appendChild(chip);
      });
      wrap.appendChild(line);
    });
    return { wrap, syncAll: () => chips.forEach(c => c.sync()) };
  };

  const flatChips = (listKey, options, max) => {
    const wrap = el('div', 'cata-chips');
    const list = () => d.cata[listKey];
    const chips = [];
    options.forEach(opt => {
      const name = typeof opt === 'string' ? opt : opt.name;
      const hint = typeof opt === 'string' ? '' : opt.hint;
      const chip = el('button', 'cata-chip',
        `${escapeHTML(name)}${hint ? ` <span class="chip-hint">${escapeHTML(hint)}</span>` : ''}`);
      chip.type = 'button';
      const sync = () => chip.classList.toggle('on', list().includes(name));
      chip.addEventListener('click', () => {
        if (!toggleCata(list(), name, max)) { toast(`Up to ${max} here`); return; }
        haptic();
        chips.forEach(c => c());
        save();
      });
      chips.push(sync);
      sync();
      wrap.appendChild(chip);
    });
    return wrap;
  };

  const noteField = (key, placeholder) => {
    const wrap = el('div', 'desc-field');
    wrap.innerHTML = `<span class="detail-label">Notes</span>
      <input class="detail-field" type="text" maxlength="80" placeholder="${escapeHTML(placeholder)}">`;
    const input = wrap.querySelector('input');
    input.value = d.notes[key] || '';
    input.addEventListener('input', () => { d.notes[key] = input.value; save(); });
    return wrap;
  };

  const section = (title, helpId) => {
    const s = el('div', 'desc-section');
    const h = el('div', 'desc-section-head');
    const label = el('span', 'detail-label', title);
    h.appendChild(label);
    if (helpId) addHelp(label, helpId);
    s.appendChild(h);
    return s;
  };

  // --- fragrance + aroma share one olfactory CATA box ---
  const fa = section('Fragrance & aroma', 'descIntensity');
  fa.appendChild(intensityRow(DESC_ATTRS[0]));
  fa.appendChild(intensityRow(DESC_ATTRS[1]));
  const aromaTree = olfactoryChips('aroma', 5);
  fa.appendChild(el('span', 'cata-cap', 'Orthonasal descriptors · up to 5'));
  fa.appendChild(aromaTree.wrap);
  fa.appendChild(noteField('fragrance', 'freely elicited notes…'));
  body.appendChild(fa);

  // --- flavor + aftertaste: olfactory CATA plus main tastes ---
  const fl = section('Flavor & aftertaste', 'cata');
  fl.appendChild(intensityRow(DESC_ATTRS[2]));
  fl.appendChild(intensityRow(DESC_ATTRS[3]));
  const flavorTree = olfactoryChips('flavor', 5);
  fl.appendChild(el('span', 'cata-cap', 'Retronasal descriptors · up to 5'));
  fl.appendChild(flavorTree.wrap);
  fl.appendChild(el('span', 'cata-cap', 'Main tastes · up to 2'));
  fl.appendChild(flatChips('tastes', CATA_TASTES, 2));
  fl.appendChild(noteField('flavor', 'freely elicited notes…'));
  body.appendChild(fl);

  // --- acidity and sweetness: intensity plus the taster's own words ---
  const ac = section('Acidity');
  ac.appendChild(intensityRow(DESC_ATTRS[4]));
  ac.appendChild(noteField('acidity', 'e.g. citric, malic, winey…'));
  body.appendChild(ac);

  const sw = section('Sweetness');
  sw.appendChild(intensityRow(DESC_ATTRS[5]));
  sw.appendChild(noteField('sweetness', 'e.g. honeyed, cane sugar…'));
  body.appendChild(sw);

  // --- mouthfeel ---
  const mf = section('Mouthfeel');
  mf.appendChild(intensityRow(DESC_ATTRS[6]));
  mf.appendChild(el('span', 'cata-cap', 'Up to 2'));
  mf.appendChild(flatChips('mouthfeel', CATA_MOUTHFEEL, 2));
  mf.appendChild(noteField('mouthfeel', 'freely elicited notes…'));
  body.appendChild(mf);

  // let the flavor wheel tick these boxes
  card.syncCata = () => { aromaTree.syncAll(); flavorTree.syncAll(); refreshSummary(); };

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
  // the chosen wording sits beside the number rather than on its own line
  // below the buttons — eight sections of that added up to a screenful
  card.innerHTML = `
    <div class="attr-head">
      <div class="attr-head-left">
        <div class="attr-title">${section.label}</div>
        <div class="attr-sub">${section.sub}</div>
      </div>
      <div class="attr-head-right">
        <div class="attr-value-row">
          <div class="attr-value">${coffee.cva[section.key]}</div>
          <button class="cva-clear" type="button" aria-label="Clear the ${section.label} rating">×</button>
        </div>
        <div class="cva-desc"></div>
      </div>
    </div>
    <div class="cva-scale"></div>
  `;

  const valueEl = card.querySelector('.attr-value');
  const scale = card.querySelector('.cva-scale');
  const desc = card.querySelector('.cva-desc');
  addHelp(card.querySelector('.attr-title'), `cva.${section.key}`);

  const refresh = popIt => {
    const v = coffee.cva[section.key];
    const rated = Boolean(coffee.touched[section.key]);
    card.classList.toggle('unrated', !rated);
    card.classList.toggle('rated', rated);
    valueEl.textContent = rated ? v : '–';
    desc.textContent = rated ? CVA_LABELS[v - 1] : 'not rated yet';
    [...scale.children].forEach((btn, i) => btn.classList.toggle('selected', rated && i + 1 === v));
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
    }
  };

  // A rating tapped by accident had no way back: the section stayed rated
  // forever and quietly weighted the score.
  card.querySelector('.cva-clear').addEventListener('click', () => {
    if (!coffee.touched[section.key]) return;
    delete coffee.touched[section.key];
    coffee.cva[section.key] = 5;
    haptic();
    refresh(false);
    refreshTabs();
    updateScorebar();
    save();
  });

  for (let v = 1; v <= 9; v++) {
    const btn = el('button', 'cva-btn' + (v === 5 ? ' neutral' : ''), String(v));
    btn.type = 'button';
    btn.setAttribute('aria-label', `${section.label}: ${v}, ${CVA_LABELS[v - 1]}`);
    btn.addEventListener('click', () => {
      coffee.cva[section.key] = v;
      coffee.touched[section.key] = true;
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
  addHelp(card.querySelector('.attr-title'), 'cvaDefects');

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
      <div class="attr-value-row">
        <div class="attr-value">${fmt(coffee.scores[attr.key])}</div>
        <button class="cva-clear" type="button" aria-label="Clear the ${attr.label} rating">×</button>
      </div>
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
  addHelp(card.querySelector('.attr-title'), 'legacy.scale');
  card.classList.toggle('unrated', !coffee.touched[attr.key]);
  card.classList.toggle('rated', Boolean(coffee.touched[attr.key]));

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
    const firstTouch = !coffee.touched[attr.key];
    if (v === coffee.scores[attr.key] && !firstTouch) return;
    coffee.scores[attr.key] = v;
    coffee.touched[attr.key] = true;
    card.classList.remove('unrated');
    card.classList.add('rated');
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

  card.querySelector('.cva-clear').addEventListener('click', () => {
    if (!coffee.touched[attr.key]) return;
    delete coffee.touched[attr.key];
    coffee.scores[attr.key] = 7.5;
    card.classList.add('unrated');
    card.classList.remove('rated');
    valueEl.textContent = fmt(coffee.scores[attr.key]);
    haptic();
    position();
    refreshTabs();
    updateScorebar();
    save();
  });

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
  addHelp(card.querySelector('.attr-title'), 'legacyCups');

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
  const progress = scoreProgress(c);
  $('#scorebar-name').textContent = coffeeName(c, state.activeIndex);
  // an unfinished sheet reports how far along it is rather than a number
  // that looks authoritative but is mostly untouched defaults
  $('#scorebar-grade').textContent = progress.complete
    ? gradeFor(score)
    : `${progress.done} of ${progress.total} sections rated`;
  $('#scorebar').classList.toggle('provisional', !progress.complete);
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
    const descriptors = usingCVA() && r.coffee.desc
      ? [...new Set([...r.coffee.desc.cata.aroma, ...r.coffee.desc.cata.flavor])]
      : null;
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
      ${descriptors ? `<div class="rank-tags">${descriptors.map(d => `<span class="rank-tag">${escapeHTML(d)}</span>`).join('')}</div>` : ''}
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

function tableCode() {
  return state.liveCode || state.joinedCode || null;
}

function renderTeamCard() {
  const card = $('#team-card');
  const live = Boolean(tableCode());
  const leader = isTableLeader();

  card.innerHTML = `
    <h3>${live ? 'The table' : 'Team scores'}</h3>
    <p class="team-sub">${live
      ? 'Everyone here scores on their own device. Nobody sees anyone else’s numbers until the leader opens the table — that independence is what the standard asks for.'
      : 'Cupping with others? Share your scores as a code, and paste theirs to see how the table scored.'}</p>
    <div class="team-name-row">
      <span class="detail-label">Your name</span>
      <input class="detail-field" id="cupper-name" type="text" maxlength="24" placeholder="e.g. Juan">
    </div>
    <div class="live-table hidden" id="live-table"></div>
    ${leader ? '<button class="btn btn-primary present-cta" id="btn-present">Present to the table</button>' : ''}
    <div class="team-actions${live ? ' hidden' : ''}">
      <button class="btn btn-ghost" id="btn-share-scores">Share my scores</button>
      <button class="btn btn-ghost" id="btn-add-scores">Add cupper’s scores</button>
    </div>
    <div class="team-cuppers-row" id="team-cuppers"></div>
    <div class="team-results" id="team-results"></div>
  `;

  if (leader) card.querySelector('#btn-present').addEventListener('click', openPresent);
  if (live) refreshLiveTable();

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

/* ---------- live table: submit, then read the panel result ---------- */

async function refreshLiveTable() {
  const code = tableCode();
  const wrap = $('#live-table');
  if (!code || !wrap) return;

  const data = await relayListParticipants(code);
  if (!data) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  state.revealed = data.revealed;
  save();

  const canSubmit = Boolean(state.participantId);
  const myName = getCupperName() || (state.liveCode ? 'Host' : 'You');
  const submittedMine = Boolean(state.submittedAt);

  let html = `<div class="live-head"><span class="detail-label">Live table · code ${escapeHTML(code)}</span></div>`;

  if (!data.revealed) {
    const done = data.participants.filter(p => p.submitted).length;
    html += `<p class="live-note">Scores stay sealed until the leader opens the table — the protocol asks every cupper to score independently first. <strong>${done} of ${data.participants.length}</strong> submitted.</p>`;
    // who is still out, so the leader knows what they are waiting on
    if (data.participants.length) {
      html += `<div class="live-roster">${data.participants
        .map(p => `<span class="joined-chip${p.submitted ? ' done' : ''}">${escapeHTML(p.name)}</span>`)
        .join('')}</div>`;
    }
    if (canSubmit) {
      html += submittedMine
        ? `<p class="live-ok">✓ Your scores are in. You can keep editing and submit again.</p>`
        : '';
      html += `<button class="btn btn-primary" id="btn-submit-scores">${submittedMine ? 'Update my scores' : 'Submit my scores'}</button>`;
    }
    if (isTableLeader()) {
      html += `<p class="live-note">You are the leader: <strong>Present to the table</strong> below walks the lineup and opens the scores when you are ready.</p>`;
    }
    wrap.innerHTML = html;
  } else {
    // panel result: average of the independent scores, per SCA practice.
    // Everyone at the table — the leader included — is in this roster, so
    // every device computes the same panel score.
    const all = data.participants
      .filter(p => Array.isArray(p.scores))
      .map(p => ({ ...p, me: p.name === myName }));

    if (!all.length) {
      wrap.innerHTML = html + `<p class="live-note">No scores submitted yet.</p>`;
    } else {
      const perCoffee = state.coffees.map((c, i) => {
        const vals = all.map(p => p.scores[i]).filter(v => typeof v === 'number');
        const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        return { name: coffeeName(c, i), avg, index: i };
      }).sort((a, b) => b.avg - a.avg);

      html += `<p class="live-note">Panel score is the average of ${all.length} independent cupper${all.length > 1 ? 's' : ''}.</p>`;
      html += perCoffee.map(row => `
        <div class="team-coffee-row">
          <div class="team-coffee-top">
            <span class="team-coffee-name">${escapeHTML(row.name)}</span>
            <span class="team-coffee-avg">${fmt(row.avg)}<small>PANEL</small></span>
          </div>
          <div class="team-coffee-cuppers">${all.map(p => {
            const v = p.scores[row.index];
            if (typeof v !== 'number') return '';
            const d = v - row.avg;
            const sign = d >= 0 ? '+' : '−';
            return `<span class="cupper-score${p.me ? ' me' : ''}">${escapeHTML(p.name)} ${fmt(v)} <em>${sign}${fmt(Math.abs(d))}</em></span>`;
          }).filter(Boolean).join('')}</div>
        </div>`).join('');

      // calibration: who consistently runs high or low against the table
      const calib = all.map(p => {
        const diffs = perCoffee.map(r => p.scores[r.index] - r.avg).filter(v => typeof v === 'number' && !isNaN(v));
        const mean = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
        return { name: p.name, mean, me: p.me };
      }).sort((a, b) => b.mean - a.mean);

      html += `<div class="calib"><span class="detail-label">Calibration · average difference from the panel</span>
        ${calib.map(c => `<div class="calib-row${c.me ? ' me' : ''}"><span>${escapeHTML(c.name)}</span>
          <span class="calib-val ${c.mean >= 0 ? 'high' : 'low'}">${c.mean >= 0 ? '+' : '−'}${fmt(Math.abs(c.mean))}</span></div>`).join('')}
      </div>`;
      wrap.innerHTML = html;
    }
  }

  const submitBtn = wrap.querySelector('#btn-submit-scores');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      const ok = await relaySubmitScores(tableCode(), state.participantId, myName, myScores());
      if (!ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit my scores';
        toast('Could not submit — check your connection');
        return;
      }
      state.submittedAt = Date.now();
      save();
      toast('Scores submitted');
      refreshLiveTable();
    };
  }
}

/* ============================================================
   PRESENT SCREEN
   The leader's half of the ceremony. Samples are cupped blind and
   coded, and identities and scores are revealed afterwards — so
   this walks the lineup in order, opening each coffee's identity
   first and the table's scores second.
   ============================================================ */

let presentData = null;   // last roster read from the relay
let presentStage = [];    // 0 sealed · 1 identity shown · 2 scores shown

function isTableLeader() {
  return Boolean(state && state.liveCode && state.liveToken);
}

async function openPresent() {
  presentData = null;
  presentStage = state.coffees.map(() => 0);
  showScreen('#screen-present');
  buildPresent();

  const code = tableCode();
  if (!code) return;

  // the leader is a cupper too, and their sheet is finished by the time they
  // are presenting — make sure it is in the panel average
  if (state.participantId) {
    const ok = await relaySubmitScores(code, state.participantId, getCupperName() || 'Host', myScores());
    if (ok) { state.submittedAt = Date.now(); save(); }
  }

  presentData = await relayListParticipants(code);
  if (presentData) { state.revealed = presentData.revealed; save(); }
  buildPresent();
}

// Panel averages per coffee, or null while the scores are still sealed.
function presentPanel() {
  if (!presentData || !presentData.revealed) return null;
  const all = presentData.participants.filter(p => Array.isArray(p.scores));
  if (!all.length) return null;
  return state.coffees.map((c, i) => {
    const cuppers = all
      .map(p => ({ name: p.name, score: p.scores[i] }))
      .filter(v => typeof v.score === 'number');
    const avg = cuppers.reduce((a, v) => a + v.score, 0) / (cuppers.length || 1);
    return { avg, cuppers: cuppers.sort((a, b) => b.score - a.score) };
  });
}

// Opening the scores is one irreversible act for the whole table, so it is
// asked for once and then applies to every coffee.
async function ensureRevealed() {
  if (state.revealed) return true;
  if (!isTableLeader()) { toast('Only the cupping leader can reveal the table'); return false; }
  if (!confirm('Open every cupper’s scores? The standard asks cuppers to score independently first — this ends that and cannot be undone.')) return false;

  const ok = await relayReveal(state.liveCode, state.liveToken);
  if (!ok) { toast('Could not reveal — check your connection'); return false; }
  state.revealed = true;
  // identities are on the table now, so guests' devices get them too
  state.shareDetails = true;
  save();
  relayUpdateSession(state.liveCode, state.liveToken, buildSessionPayload());
  presentData = await relayListParticipants(state.liveCode);
  return true;
}

function buildPresent() {
  const list = $('#present-list');
  const intro = $('#present-intro');
  const panel = presentPanel();
  const solo = !tableCode();

  intro.textContent = solo
    ? 'No live table — this walks your own scores coffee by coffee.'
    : state.revealed
      ? 'Scores are open. Reveal each coffee in order: what it was, then how the table scored it.'
      : 'Reveal each coffee in order. Identities first; the scores stay sealed until you open them, which you can do from any card.';

  list.innerHTML = '';
  state.coffees.forEach((coffee, i) => {
    const stage = presentStage[i] || 0;
    const card = el('div', 'present-card ' + ['sealed', 'named', 'scored'][stage]);
    card.style.animationDelay = `${Math.min(i, 8) * 0.04}s`;

    const meta = metaSummary(coffee.meta);
    const row = panel ? panel[i] : null;
    const mine = coffeeScore(coffee);
    const shown = row ? row.avg : mine;

    card.innerHTML = `
      <div class="present-top">
        <span class="present-num">${i + 1}</span>
        <div class="present-id">
          <div class="present-name">${stage ? escapeHTML(coffeeName(coffee, i)) : `Coffee ${i + 1}`}</div>
          ${stage && meta ? `<div class="present-meta">${escapeHTML(meta)}</div>` : ''}
          ${stage && !meta ? '<div class="present-meta">no details recorded</div>' : ''}
        </div>
        ${stage === 2 ? `<div class="present-score">
          <span class="present-avg">${fmt(shown)}</span>
          <span class="present-grade">${row ? `panel · ${row.cuppers.length}` : 'your score'}</span>
        </div>` : ''}
      </div>
      ${stage === 2 && row ? `<div class="present-cuppers">${row.cuppers.map(c => {
        const d = c.score - row.avg;
        return `<span class="present-cupper">${escapeHTML(c.name)} <strong>${fmt(c.score)}</strong> <em>${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</em></span>`;
      }).join('')}</div>` : ''}
    `;

    if (stage < 2) {
      const action = el('button', 'present-action',
        stage === 0 ? 'Reveal the coffee' : 'Show the table’s scores');
      action.type = 'button';
      action.onclick = async () => {
        haptic();
        if (stage === 1 && !solo && !state.revealed) {
          if (!(await ensureRevealed())) return;
        }
        presentStage[i] = stage + 1;
        buildPresent();
      };
      card.appendChild(action);
    }

    list.appendChild(card);
  });

  buildPresentFinal(panel);
}

// The ranking lands only once every coffee has been walked through — the
// point of the screen is that it arrives last.
function buildPresentFinal(panel) {
  const wrap = $('#present-final');
  const done = state.coffees.every((c, i) => presentStage[i] === 2);
  wrap.classList.toggle('hidden', !done);
  if (!done) return;

  const rows = state.coffees
    .map((c, i) => ({ name: coffeeName(c, i), score: panel ? panel[i].avg : coffeeScore(c) }))
    .sort((a, b) => b.score - a.score);
  const n = panel ? Math.max(...panel.map(p => p.cuppers.length)) : 0;

  wrap.innerHTML = `
    <h3>The table’s ranking</h3>
    <p class="team-sub">${panel
      ? `Panel scores — the average of ${n} independent cupper${n > 1 ? 's' : ''}, as the standard prescribes.`
      : 'Your own scores — no other cuppers have submitted.'}</p>
    ${rows.map((r, pos) => `
      <div class="present-final-row">
        <span class="present-final-pos">${pos + 1}</span>
        <span class="present-final-name">${escapeHTML(r.name)}</span>
        <span class="present-final-score">${fmt(r.score)}</span>
      </div>`).join('')}
  `;
}

async function revealAllPresent() {
  if (tableCode() && !state.revealed && !(await ensureRevealed())) return;
  presentStage = state.coffees.map(() => 2);
  haptic();
  buildPresent();
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
  { key: 'flavor', label: 'Flavor' },
  { key: 'process', label: 'Process' },
  { key: 'variety', label: 'Variety' },
  { key: 'roast', label: 'Roast' },
  { key: 'country', label: 'Origin' },
  { key: 'farm', label: 'Farm' },
  { key: 'producer', label: 'Producer' },
  { key: 'altitude', label: 'Altitude' },
];

let activeDim = 'flavor';
let historyQuery = '';

// Free-text search across everything recorded about a coffee.
function matchesQuery(c, q) {
  if (!q) return true;
  const hay = [
    c.name,
    c.notes,
    ...(c.descriptors || []),
    ...Object.values(c.meta || {}),
  ].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(term => hay.includes(term));
}

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
  return archive.flatMap(s => s.coffees.map(c => ({
    ...c,
    date: s.date,
    sessionId: s.id,
    form: s.form || 'legacy',
    descriptors: c.descriptors || [],
  })));
}

function aggregateBy(coffees, dimKey) {
  const groups = new Map();
  const add = (value, score) => {
    const norm = value.toLowerCase();
    if (!groups.has(norm)) groups.set(norm, { name: value, scores: [] });
    groups.get(norm).scores.push(score);
  };
  coffees.forEach(c => {
    if (dimKey === 'flavor') {
      // a coffee counts once per descriptor it showed
      (c.descriptors || []).forEach(d => add(d, c.score));
      return;
    }
    let value = (c.meta && c.meta[dimKey] || '').trim();
    if (dimKey === 'altitude') value = altitudeBucket(value) || '';
    if (!value) return;
    add(value, c.score);
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

  const allCoffees = flatCoffees(archive);
  const coffees = allCoffees.filter(c => matchesQuery(c, historyQuery));
  const allScores = coffees.map(c => c.score);
  const avg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const sessionCount = historyQuery
    ? new Set(coffees.map(c => c.sessionId)).size
    : archive.length;

  // stat tiles
  $('#stats-row').innerHTML = `
    <div class="stat-tile"><div class="stat-value">${sessionCount}</div><div class="stat-label">Cuppings</div></div>
    <div class="stat-tile"><div class="stat-value">${coffees.length}</div><div class="stat-label">Coffees</div></div>
    <div class="stat-tile"><div class="stat-value">${fmt(avg)}</div><div class="stat-label">Avg score</div></div>
  `;

  // search
  const search = $('#history-search');
  if (search.value !== historyQuery) search.value = historyQuery;
  search.oninput = () => {
    historyQuery = search.value.trim();
    clearTimeout(search._t);
    search._t = setTimeout(buildHistory, 200);
  };
  $('#history-hits').textContent = historyQuery
    ? `${coffees.length} of ${allCoffees.length} coffees match`
    : '';

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
      const tags = (c.descriptors || []).slice(0, 4);
      item.innerHTML = `
        <div class="hist-item-info">
          <div class="hist-item-name">${escapeHTML(c.name)}<span class="form-tag">${c.form === 'legacy' ? '2004' : 'CVA'}</span></div>
          ${meta ? `<div class="hist-item-meta">${escapeHTML(meta)}</div>` : ''}
          ${tags.length ? `<div class="hist-item-tags">${tags.map(t => `<span class="rank-tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
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
    wrap.appendChild(el('div', 'group-empty', activeDim === 'flavor'
      ? 'No flavor descriptors yet — check them on the Describe card while cupping.'
      : `No ${escapeHTML(dimLabel)} data yet — fill in coffee details while cupping.`));
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
   EXPORT — CSV and a printable scoresheet
   ============================================================ */

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function historyCSV() {
  const archive = loadArchive().sort((a, b) => b.date - a.date);
  const head = [
    'date', 'form', 'cups per coffee', 'coffee', 'score', 'grade',
    'variety', 'process', 'roast profile', 'altitude', 'origin', 'farm', 'producer',
    'descriptors', 'notes',
  ];
  const rows = [head];
  archive.forEach(session => {
    session.coffees.forEach(c => {
      const m = c.meta || {};
      rows.push([
        new Date(session.date).toISOString().slice(0, 10),
        (session.form || 'legacy') === 'cva' ? 'CVA (SCA 104-2024)' : 'Legacy 2004',
        session.cupsPerCoffee,
        c.name,
        fmt(c.score),
        gradeFor(c.score),
        m.variety, m.process, m.roast, m.altitude, m.country, m.farm, m.producer,
        (c.descriptors || []).join('; '),
        c.notes,
      ]);
    });
  });
  return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

async function downloadFile(name, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  // iOS Safari handles a share sheet far better than a download attribute
  const file = new File([blob], name, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Exported');
}

function exportHistoryCSV() {
  const archive = loadArchive();
  if (!archive.length) { toast('No cuppings to export yet'); return; }
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`cupping-history-${stamp}.csv`, historyCSV(), 'text/csv');
}

// A clean printed scoresheet — Safari's print dialog saves it as a PDF.
function printResults() {
  const ranked = state.coffees
    .map((c, i) => ({ coffee: c, index: i, score: coffeeScore(c) }))
    .sort((a, b) => b.score - a.score);

  const sheet = document.createElement('div');
  sheet.id = 'print-sheet';
  const when = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const formName = usingCVA() ? 'Coffee Value Assessment · SCA 104-2024' : 'SCA cupping form (2004)';

  sheet.innerHTML = `
    <div class="p-head">
      <div>
        <h1>Cupping results</h1>
        <p>${escapeHTML(formName)} · ${escapeHTML(when)}${getCupperName() ? ` · ${escapeHTML(getCupperName())}` : ''}</p>
      </div>
      <div class="p-mark">lento.cafe</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Coffee</th><th>Origin details</th><th>Descriptors</th><th class="num">Score</th></tr></thead>
      <tbody>
        ${ranked.map((r, pos) => {
          const d = usingCVA() && r.coffee.desc
            ? [...new Set([...r.coffee.desc.cata.aroma, ...r.coffee.desc.cata.flavor])].join(', ')
            : '';
          return `<tr>
            <td>${pos + 1}</td>
            <td><strong>${escapeHTML(coffeeName(r.coffee, r.index))}</strong>
              ${r.coffee.notes.trim() ? `<div class="p-notes">${escapeHTML(r.coffee.notes.trim())}</div>` : ''}</td>
            <td>${escapeHTML(metaSummary(r.coffee.meta))}</td>
            <td>${escapeHTML(d)}</td>
            <td class="num"><strong>${fmt(r.score)}</strong><div class="p-grade">${gradeFor(r.score)}</div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <p class="p-foot">Scores recorded with lento.cafe/cupping</p>
  `;

  document.body.appendChild(sheet);
  const cleanup = () => { sheet.remove(); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 80);
  setTimeout(cleanup, 60000); // belt and braces if afterprint never fires
}

/* ============================================================
   WIRING
   ============================================================ */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  // Deliberately no reload on controllerchange: the worker claims the page
  // on its first install, and reloading there discarded the sign-in token
  // arriving in the URL. Navigations are network-first, so a new version
  // is picked up on the next load anyway.
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
}

function watchConnection() {
  const badge = $('#offline-badge');
  const sync = () => badge.classList.toggle('hidden', navigator.onLine);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
}

// Offered whenever a session exists, not only at page load — leaving the
// cupping screen used to hide the only route back to it.
function refreshResumeButton() {
  const btn = $('#btn-resume');
  const n = state && state.coffees ? state.coffees.length : 0;
  btn.classList.toggle('hidden', !n);
  if (!n) return;
  const p = sessionProgress();
  btn.textContent = p.complete
    ? `Resume · ${n} coffee${n > 1 ? 's' : ''} scored`
    : `Resume · ${n} coffee${n > 1 ? 's' : ''}`;
}

function startCupping() {
  buildCuppingUI();
  showScreen('#screen-cupping');
  // names and details may have changed on the lineup screen; the table is
  // looking at whatever the relay last heard
  if (isTableLeader()) relayUpdateSession(state.liveCode, state.liveToken, buildSessionPayload());
  requestAnimationFrame(() => scrollToPanel(state.activeIndex, false));
}

document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  watchConnection();
  applyGuided();
  initFormPicker();

  const guided = $('#toggle-guided');
  guided.checked = guidedOn();
  guided.addEventListener('change', () => {
    setGuided(guided.checked);
    haptic();
    toast(guided.checked ? 'Guided mode on' : 'Guided mode off');
    if (state && $('#screen-cupping').classList.contains('active')) buildCuppingUI();
  });

  initStepper('#stepper-coffees', '#value-coffees', 'coffees', 'coffees');
  initStepper('#stepper-cups', '#value-cups', 'cups', 'cups');
  renderCupsPreview();

  // resume?
  const saved = load();
  if (saved) state = saved;
  $('#btn-resume').addEventListener('click', () => { if (state) startCupping(); });
  refreshResumeButton();

  $('#btn-start').addEventListener('click', () => {
    // starting over replaces the session in progress, so say so first
    if (state && state.coffees.length) {
      const p = sessionProgress();
      const scored = state.coffees.length - p.untouched;
      if (scored > 0 && !confirm(`You have a cupping in progress with ${scored} coffee${scored > 1 ? 's' : ''} scored. Starting a new one replaces it. Continue?`)) return;
    }
    newSession(setup.coffees, setup.cups, setup.form);
    refreshResumeButton();
    openLineup();
  });

  // setup → lineup → cupping, so backing out of the sheet lands where the
  // coffees are named rather than dumping you at the start
  $('#btn-back-setup').addEventListener('click', () => {
    refreshResumeButton();
    if (state && state.coffees.length) openLineup();
    else showScreen('#screen-setup');
  });

  $('#btn-lineup-back').addEventListener('click', () => {
    refreshResumeButton();
    showScreen('#screen-setup');
  });
  $('#btn-lineup-add').addEventListener('click', addLineupCoffee);
  $('#btn-lineup-paste').addEventListener('click', openLineupPaste);
  $('#btn-lineup-invite').addEventListener('click', openInviteSheet);
  $('#btn-lineup-start').addEventListener('click', startCupping);

  $('#btn-present-back').addEventListener('click', () => showScreen('#screen-results'));
  $('#btn-present-all').addEventListener('click', revealAllPresent);

  $('#btn-join').addEventListener('click', openJoinSheet);

  $('#btn-share-session').addEventListener('click', openInviteSheet);
  $('#btn-wheel').addEventListener('click', openFlavorWheel);

  // account: OAuth return, profile button, quiet background sync
  $('#btn-account').addEventListener('click', openAccountSheet);
  handleAuthRedirect().then(() => renderAccountButton());
  renderAccountButton();
  if (loadAuth()) cloudSyncAll();

  // auto-join when opened from a scanned QR / shared link
  const codeMatch = ENTRY_HASH.match(/[#&]code=(\d{4,6})/);      // …#code=4821
  const joinMatch = ENTRY_HASH.match(/[#&]join=([^&]+)/);         // …#join=CUPG.xxx
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
    // scoring is what gets archived and shared, so say something before
    // an unfinished sheet becomes a record
    const p = sessionProgress();
    if (!p.complete) {
      const parts = [];
      if (p.untouched) parts.push(`${p.untouched} coffee${p.untouched > 1 ? 's have' : ' has'} not been scored at all`);
      if (p.partial) parts.push(`${p.partial} ${p.partial > 1 ? 'are' : 'is'} part-scored`);
      if (!confirm(`${parts.join(', ')}. Unrated sections count as 5 (neither high nor low). See results anyway?`)) return;
    }
    buildResults();
    showScreen('#screen-results');
  });

  $('#btn-back-cupping').addEventListener('click', () => {
    showScreen('#screen-cupping');
    requestAnimationFrame(() => scrollToPanel(state.activeIndex, false));
  });

  $('#btn-share').addEventListener('click', shareResults);
  $('#btn-print').addEventListener('click', printResults);
  $('#btn-export-csv').addEventListener('click', exportHistoryCSV);

  $('#btn-new-session').addEventListener('click', () => {
    if (!confirm('Start a new session? This cupping is already saved to History.')) return;
    clearSession();
    refreshResumeButton();
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
