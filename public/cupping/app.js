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

/* The three domains the anchored scale is asked to draw.

   Each says how many detents it has, how a position maps onto the number
   the sheet stores, which positions carry a numeral, and what to call the
   place a cupper has landed on. Everything else about the control — the
   gesture, the settle, the empty knob — is the same for all three. */

// CVA 104-2024: nine integer positions, an anchor phrase on every one, and
// a structural midpoint, because "neither high nor low" is a different kind
// of answer from the eight around it rather than just a smaller number.
const CVA_SCALE = {
  words: CVA_LABELS,
  lowWord: 'low',
  highWord: 'high',
};

// The 2004 form: 6.00 to 10.00 in quarter points. Seventeen detents, a
// numeral on the five whole points, and the form's own quality bands as the
// phrase — a 7.75 is still "very good", which is what the cupper is deciding.
const LEGACY_QUALITY = ['good', 'very good', 'excellent', 'outstanding'];
const LEGACY_SCALE = {
  steps: 17,
  valueAt: i => 6 + (i - 1) * 0.25,
  positionOf: v => Math.round((v - 6) / 0.25) + 1,
  numeralAt: i => ((i - 1) % 4 === 0 ? String(6 + (i - 1) / 4) : ''),
  wordAt: i => LEGACY_QUALITY[Math.min(3, Math.floor((i - 1) / 4))],
  format: v => fmt(v),
  midAt: 0,
  lowWord: '6.00',
  highWord: '10.00',
};

// SCA 103-2024 descriptive intensities: 0 to 15, sixteen detents, numerals
// every fifth. No phrases and no midpoint — this scale records how much of
// something is there, not how good it is, so there is no "neither" to mark.
const INTENSITY_SCALE = {
  steps: 16,
  valueAt: i => i - 1,
  positionOf: v => v + 1,
  numeralAt: i => ((i - 1) % 5 === 0 ? String(i - 1) : ''),
  wordAt: () => '',
  midAt: 0,
  lowWord: 'none',
  highWord: 'very high',
};

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
/* Which ink a label needs to be legible on a given wedge.

   The wheel's nine hues are the Coffee Taster's Flavor Wheel's own and are
   not up for redesign, but the label ink was a flat #ffffff on all nine —
   2.61:1 on the pink, 1.68:1 on the yellow, against the 4.5:1 that 7px text
   needs. Choosing the ink per hue instead of the hue per ink fixes it
   without moving a single colour: worst case 5.15:1. */
function inkOn(hex) {
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const n = parseInt(hex.slice(1), 16);
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // contrast against black is (L+0.05)/0.05; against white it is 1.05/(L+0.05)
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? 'dark' : 'light';
}

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

// The series palette lives in CSS as --series-1..10 so it can differ by
// theme and be measured like every other colour in the system. These were
// hardcoded hex, tuned against a dark ground and shipped onto a near-white
// page, where they ran 1.47:1 to 2.95:1 against a 3:1 requirement — and
// because they were not tokens, the "62 contrast failures to 0" sweep never
// looked at them.
const SERIES_COUNT = 10;
const seriesVar = index => `var(--series-${(index % SERIES_COUNT) + 1})`;

// Ten coffees told apart by hue alone is ten coffees a colour-blind cupper
// cannot tell apart at all. Each series carries a stroke pattern as well,
// and the legend shows the same line rather than a coloured dot, so the
// chart survives with the colour taken out of it.
const RADAR_DASHES = ['0', '7 4', '2 3', '11 3 2 3', '15 4', '1 4', '9 3 1 3 1 3', '5 3 1 3', '3 2 9 2', '13 3 3 3'];

// The SCA standard is five cups per sample, which is what the stepper opens
// on and what the caption names. It is not a ceiling: labs that cup six or
// eight could not record what they had actually done.
const LIMITS = { coffees: [1, 10], cups: [1, 8] };

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
  tableCounts = null;
  seenCuppers = null;
  identitiesAdopted = false;
  save();
}

function usingCVA() {
  return !state || state.form !== 'legacy';
}

/* ---------- guided mode ---------- */

/* Has this device ever run or joined a cupping? Used to decide whether a
   first-time joiner gets the orientation they would otherwise never be
   offered. Existing history counts, so someone who has been using the app
   is never shown it. */
const CUPPED_KEY = 'sca-cupping-cupped-before-v1';
function hasCuppedBefore() {
  try {
    if (localStorage.getItem(CUPPED_KEY)) return true;
    return loadArchive().length > 0;
  } catch (e) { return true; }   // can't tell: don't interrupt
}
function markCuppedBefore() {
  try { localStorage.setItem(CUPPED_KEY, '1'); } catch (e) {}
}

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
  syncStaticHelp();
  // The marks are decided when a panel is built — helpBtn() returns null with
  // guidance off — so the sheet on screen has to be rebuilt or it keeps the
  // ones it was born with. That rebuild used to live in the switch's change
  // listener instead of here, which made it true only for the one caller that
  // remembered it; the sub-labels hid on the class alone, so any other route
  // into this function left the sheet half-converted. The setting enforces
  // itself now.
  if (typeof state !== 'undefined' && state && $('#screen-cupping').classList.contains('active')) {
    buildCuppingUI();
  }
}

// Two help marks live in the markup rather than in a panel that gets rebuilt:
// what a cupping is, on setup, and what a score out of 100 means, on the bar
// that shows one. A panel gets its marks when it is built; these outlive every
// rebuild, so they are synced here instead, in both directions.
// The mark goes on .scorebar-score and not on #scorebar-grade because the
// grade's textContent is rewritten on every rating and would delete it.
function syncStaticHelp() {
  // "How a cupping works" needs to be reachable from the cupping screen as
  // well as from setup: someone who arrived by QR never passes setup, and a
  // one-time prompt on joining is no use to them an hour later.
  [['.subtitle', 'intro'], ['.cupping-title-row', 'intro'], ['.scorebar-sub', 'score']].forEach(([selector, id]) => {
    const host = document.querySelector(selector);
    if (!host) return;
    const existing = host.querySelector(':scope > .help-btn');
    if (existing) existing.remove();
    addHelp(host, id);
  });
}

// Small "?" button; returns null when guided mode is off so callers can
// append unconditionally.
function helpBtn(id) {
  // The intro mark is the one permanent door. Guided mode off removes every
  // other explanation in the product — including, before this, the only way
  // back to the sheet that carries the switch, so turning guidance off was a
  // one-way trip for the person least able to reason their way out of it.
  if (!HELP[id]) return null;
  if (!guidedOn() && id !== 'intro') return null;
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

/* ============================================================
   SHEET DISCIPLINE

   Nine modal sheets, and until now not one of them was a dialog.
   No Escape handler anywhere in the file. No focus trap: tab out
   of the join sheet and you were silently inside the setup screen
   behind it, operating controls you could not see. No role, no
   aria-modal, nothing marking the page underneath as unavailable.

   One manager, so a sheet cannot be opened without getting all of
   it. Sheets stack, because the flavour wheel can open help.
   ============================================================ */

const sheetStack = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]),'
  + ' select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function sheetFocusable(modal) {
  return [...modal.querySelectorAll(FOCUSABLE)].filter(e => e.offsetParent !== null);
}

// Everything that is not the open sheet stops being reachable — by tab, by
// screen reader, by anything. `inert` does all three in one attribute; the
// trap below is the floor for engines that have not shipped it.
function setBackgroundInert(on) {
  const top = sheetStack.length ? sheetStack[sheetStack.length - 1].modal : null;
  document.querySelectorAll('.screen, .modal').forEach(el => {
    if (el === top) { el.inert = false; return; }
    el.inert = on;
  });
}

function openSheet(modal, dismiss) {
  if (sheetStack.some(s => s.modal === modal)) return;
  const opener = document.activeElement;
  modal.classList.remove('hidden');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  const heading = modal.querySelector('h2, h3');
  if (heading) {
    if (!heading.id) heading.id = `sheet-title-${modal.id || sheetStack.length}`;
    modal.setAttribute('aria-labelledby', heading.id);
  }
  sheetStack.push({ modal, dismiss, opener });
  setBackgroundInert(true);
  // The first control, not the sheet itself: a reader landing on a dialog
  // wants to know what it can do. Sheets that want their input focused
  // still do that themselves, after this.
  const first = sheetFocusable(modal)[0];
  if (first) first.focus({ preventScroll: true });
}

function closeSheet(modal) {
  modal.classList.add('hidden');
  modal.inert = false;
  const i = sheetStack.findIndex(s => s.modal === modal);
  if (i < 0) return;
  const [entry] = sheetStack.splice(i, 1);
  setBackgroundInert(sheetStack.length > 0);
  // back where they were, so a cupper who opened help mid-section lands on
  // the help mark rather than at the top of the sheet
  if (entry.opener && document.contains(entry.opener)) {
    entry.opener.focus({ preventScroll: true });
  }
}

document.addEventListener('keydown', e => {
  if (!sheetStack.length) return;
  const top = sheetStack[sheetStack.length - 1];
  if (e.key === 'Escape') {
    e.preventDefault();
    if (top.dismiss) top.dismiss();
    else closeSheet(top.modal);
    return;
  }
  if (e.key !== 'Tab') return;
  const items = sheetFocusable(top.modal);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const here = document.activeElement;
  if (e.shiftKey && (here === first || !top.modal.contains(here))) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && (here === last || !top.modal.contains(here))) {
    e.preventDefault(); first.focus();
  }
}, true);

function openHelp(id) {
  const entry = HELP[id];
  if (!entry) return;
  haptic();
  const modal = $('#help-modal');
  const sw = $('#toggle-guided-help');
  if (sw) sw.checked = guidedOn();
  $('#help-title').textContent = entry.title;
  $('#help-body').textContent = entry.body;
  openSheet(modal, () => close());
  const close = () => { closeSheet(modal); modal.onclick = null; };
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

    // Repair a device that hit the guest-minted-code bug: opening the invite
    // sheet after joining someone else's table created a second session and
    // made this phone its leader, which split the room across two codes and
    // pointed the cupper's seat at a table they were not sitting at — every
    // submission after that failed. Having joined always wins.
    if (s.joinedCode && s.liveCode) {
      delete s.liveCode;
      delete s.liveToken;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
    }
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
        // the old card had no way to record an intensity as unrated, but it
        // also had no way to change one except by dragging it — so anything
        // that is not still sitting on the parking 5 was put there on purpose
        if (!c.desc.touched) {
          c.desc.touched = {};
          DESC_ATTRS.forEach(a => {
            if (c.desc.intensity[a.key] !== 5) c.desc.touched[a.key] = true;
          });
        }
        c.desc.notes = Object.assign(base.notes, c.desc.notes || {});
        c.desc.cata = Object.assign(base.cata, c.desc.cata);
      }
    });
    return s;
  } catch (e) { return null; }
}

function clearSession() {
  clearPresentStage();   // the ceremony belongs to the session that is going
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
    // Every visit to Results rewrites this record, including a visit to a
    // sheet that is barely started — so how finished it was travels with
    // it. Inside a session the app is careful never to let an untouched
    // section pass as a chosen 5; the archive used to drop that the moment
    // the record was written, and the history average quietly mixed
    // finished sheets with abandoned ones.
    coffees: state.coffees.map((c, i) => ({
      name: coffeeName(c, i),
      meta: { ...c.meta },
      notes: c.notes,
      score: coffeeScore(c),
      rated: scoreProgress(c).done,
      sections: scoreProgress(c).total,
      complete: scoreProgress(c).complete,
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
    closeSheet(modal);
    pad.detach();
    modal.onclick = null;
  };

  openSheet(modal, () => close());
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
  const close = () => { closeSheet(modal); modal.onclick = null; };

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

  openSheet(modal, () => close());
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

function sectionCount() {
  return (usingCVA() ? CVA_SECTIONS : SCALE_ATTRS).length;
}

/* ---------- honest panel math ----------
   A cupping score is only evidence for the sections someone actually
   rated. cvaScore has to return a number for every coffee, so it adds the
   untouched sections at their 5 — and a sheet that stopped after three
   sections comes out looking exactly like a finished one. That number then
   went into the shared average under the words "the average of N
   independent cuppers, as the standard prescribes", and nobody at the
   table could tell.

   Submissions now carry a parallel `rated` array, so every device can tell
   the two apart: a sheet with nothing rated is not a score and leaves the
   average; a part-scored sheet still counts, but it says so.           */

function myRated() {
  return state.coffees.map(c => scoreProgress(c).done);
}

// The count of rated sections in participant p's sheet for coffee i.
//   n     how much of it is real
//   null  an older submission with no `rated` array. Treated as complete:
//         dropping a cupper who is sitting at the table is worse than
//         trusting a number this build can no longer interrogate.
function ratedAt(p, i) {
  if (!Array.isArray(p.rated)) return null;
  const n = p.rated[i];
  return typeof n === 'number' ? n : null;
}

// The scores that may enter a panel average for coffee i: wholly unrated
// sheets removed, part-scored ones kept and flagged.
function panelEntries(participants, i) {
  const total = sectionCount();
  return participants.map(p => {
    const score = Array.isArray(p.scores) ? p.scores[i] : undefined;
    if (typeof score !== 'number') return null;
    const rated = ratedAt(p, i);
    if (rated === 0) return null;
    return {
      name: p.name,
      score,
      rated,
      total,
      partial: rated !== null && rated < total,
      me: Boolean(p.me),
    };
  }).filter(Boolean);
}

// "2 of 8" for a part-scored sheet, empty for a finished one.
function ratedNote(entry) {
  return entry.partial ? `${entry.rated} of ${entry.total}` : '';
}

// The lineup in score order, each coffee carrying how much of its sheet is
// real. A coffee with nothing rated sorts to the bottom whatever cvaScore
// says about it, because what cvaScore says about it is eight defaults.
//
// A part-scored sheet gets the same reasoning, and used not to. This sort
// demoted only the *wholly* unrated, so three sections out of eight — the
// other five sitting at their default 5 — placed first at 88.75, above two
// finished sheets at 83.50 and 78.25. Grey ink and a "3 of 8" beside it are
// not enough for something standing in first position: this design system
// answers everything else with position, and the number a table reads first
// is the ranking's order, not its typography. Complete sheets rank among
// themselves, part-scored sheets rank below them, nothing rated is last.
function rankedCoffees() {
  const tier = p => (p.done === 0 ? 2 : p.complete ? 0 : 1);
  return state.coffees
    .map((c, i) => ({ coffee: c, index: i, score: coffeeScore(c), prog: scoreProgress(c) }))
    .sort((a, b) => tier(a.prog) - tier(b.prog) || b.score - a.score);
}

function defectPenalty(c) {
  return usingCVA()
    ? c.nonUniform * 2 + c.defective * 4
    : c.taintCups * 2 + c.faultCups * 4;
}

// The grade as the header can carry it: the qualifier that says whether a
// coffee cleared the specialty line needs room this row does not have, and
// it is not news you need mid-drag — it is what Results opens on.
/* One vocabulary, two lengths. The header used to say "Below grade" for the
   coffee Results called "Below cupping quality" — two names for one fact, in
   front of a table. The name is the same everywhere now; only the qualifier
   that says whether it cleared the specialty line is dropped where there is
   no room for it. */
const GRADES = [
  { at: 90, name: 'Outstanding', note: '' },
  { at: 85, name: 'Excellent', note: '' },
  { at: 80, name: 'Very good', note: 'specialty' },
  { at: 70, name: 'Good', note: 'below specialty' },
  { at: -Infinity, name: 'Below cupping quality', note: '' },
];

function gradeEntry(score) {
  return GRADES.find(g => score >= g.at) || GRADES[GRADES.length - 1];
}

function shortGrade(score) {
  return gradeEntry(score).name;
}

function gradeFor(score) {
  const g = gradeEntry(score);
  return g.note ? `${g.name} · ${g.note}` : g.name;
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

/* Two words, not one. A 4ms tick is the instrument answering your finger —
   a detent crossed, a chip taken. It was also what the phone did when a
   stranger joined the table, which meant that mid-drag on Aftertaste the
   feedback channel saying "you crossed a detent" also said "someone
   arrived". Anything that happens at the table rather than under your hand
   gets a pattern your finger cannot mistake for the scale. */
function haptic() {
  if (navigator.vibrate) navigator.vibrate(4);
}

function arrivalHaptic() {
  if (navigator.vibrate) navigator.vibrate([18, 60, 18]);
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
  syncPolling();
}

function activeScreenId() {
  const el = document.querySelector('.screen.active');
  return el ? '#' + el.id : null;
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
    // the table this lineup belongs to, so a long code or share link joins
    // the same table the live code does instead of starting a rival one
    ...(state.liveCode ? { lc: state.liveCode } : {}),
    k: state.coffees.map((c, i) => {
      // Blind means blind: the standard has cuppers work from coded samples,
      // and a name is the identity the leader reveals at the end. Until they
      // share details the table sees Coffee 1, 2, 3.
      const entry = state.shareDetails ? { n: coffeeName(c, i) } : {};
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
  // This sheet belongs to someone else's table. Scores are submitted by
  // position, so it must not be renamed or reordered here even when there is
  // no live code to bind to — an offline long-code join is still a guest.
  state.joinedLineup = true;
  save();
  return true;
}

// Returns the live code the lineup belongs to, if it carried one, so the
// joiner registers at the leader's table rather than becoming a second one.
async function joinSessionFromCode(text) {
  const payload = await decodeCode('CUP', text);
  if (!applySessionPayload(payload)) return null;
  return { code: payload.lc && /^\d{4,6}$/.test(String(payload.lc)) ? String(payload.lc) : null };
}

/* ---------- live-code relay (optional backend) ---------- */

/* Cupping rooms have bad signal, and "check your connection" is a lie when
   the server answered with a refusal. relayFetch keeps the status so callers
   can say something true, and retries only where a repeat is harmless: a
   dropped GET or PUT can be sent again, but a second POST would join the
   table twice or mint a second code. */
async function relayFetch(path, options = {}, opts = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const retries = opts.retries != null ? opts.retries : (method === 'POST' ? 0 : 1);
  const timeout = opts.timeout || 9000;

  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(`${RELAY_URL}${path}`, { ...options, signal: ctrl.signal });
      let data = null;
      try { data = await res.json(); } catch (e) { /* no body, or not JSON */ }
      // a 5xx is worth one more go; a 4xx is an answer, not a hiccup
      if (!res.ok && res.status >= 500 && attempt < retries) { clearTimeout(timer); continue; }
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      if (attempt < retries) { clearTimeout(timer); await new Promise(r => setTimeout(r, 700)); continue; }
      return { ok: false, status: 0, data: null }; // status 0 = never reached the server
    } finally {
      clearTimeout(timer);
    }
  }
}

async function relayRequest(path, options) {
  const res = await relayFetch(path, options);
  return res.ok ? res.data : null;
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

// Returns { ok } or { ok: false, reason } — the caller has to be able to tell
// a dead connection from a seat the table no longer recognises.
async function relaySubmitScores(code, id, name, scores, rated) {
  // no seat yet (the join never landed): take one before submitting
  if (!id) {
    const fresh = await relayJoinSession(code, name);
    if (!fresh) return { ok: false, reason: 'No connection — your scores are saved here, try again' };
    state.participantId = id = fresh;
    save();
  }

  const res = await relayFetch(`/sessions/${encodeURIComponent(code)}/participants/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // `rated` rides alongside the scores so the table can tell a finished
    // sheet from one that stopped early. A relay that drops the field
    // degrades to the old behaviour rather than failing the submission.
    body: JSON.stringify({ name, scores, rated }),
  });
  if (res.ok && res.data && res.data.ok) return { ok: true };

  if (res.status === 0) return { ok: false, reason: 'No connection — your scores are saved here, try again' };
  if (res.status === 404) return { ok: false, reason: 'This table has ended or your seat expired — rejoin with the code' };
  return { ok: false, reason: (res.data && res.data.error) || 'The table refused that — try again' };
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

/* ---------- live polling ----------
   A cupping is a room of people watching each other's phones, so the table
   has to feel live: someone joining, or the leader opening the scores,
   should land in a second or two, not on the next time you happen to
   navigate. One poller runs at a time and belongs to whichever screen is
   open. It starts fast, stretches out while nothing changes, and pauses
   entirely when the tab is hidden — a two-hour session must not spend the
   day's KV reads on a phone sitting in someone's apron.                */

const POLL_DEFAULTS = { fast: 1400, max: 8000, growth: 1.5 };

let poller = null;

// tick() returns a signature string: a change resets the cadence, and
// returning null retires the poller for good.
function startPolling(tick, opts) {
  stopPolling();
  const { fast, max, growth } = { ...POLL_DEFAULTS, ...opts };
  const self = { last: undefined, delay: fast, timer: null, busy: false, dead: false };

  const run = async () => {
    if (self.dead || self.busy) return;
    if (document.hidden) return; // visibilitychange wakes it again
    self.busy = true;
    let sig;
    // A thrown tick used to return the same 'error' string every time, which
    // is a stable signature — so the poller read a dead relay as "nothing is
    // changing" and stretched its interval out to the maximum, exactly when
    // it should have been retrying. Counting the failures keeps the
    // signature moving, and the count is what the badge reads.
    try {
      sig = await tick();
      self.fails = 0;
    } catch (e) {
      self.fails = (self.fails || 0) + 1;
      sig = `error:${self.fails}`;
    }
    setRelayTrouble(self.fails >= 3);
    self.busy = false;
    if (self.dead) return;
    if (sig === null) { self.dead = true; return; }
    if (sig !== self.last) { self.last = sig; self.delay = fast; }
    else self.delay = Math.min(max, Math.round(self.delay * growth));
    self.timer = setTimeout(run, self.delay);
  };

  // back to the front of the queue — used when the tab wakes or the
  // connection returns, where something has almost certainly changed
  self.wake = () => {
    if (self.dead) return;
    self.delay = fast;
    clearTimeout(self.timer);
    run();
  };

  poller = self;
  run();
  return self;
}

function stopPolling() {
  if (poller) {
    poller.dead = true;
    clearTimeout(poller.timer);
  }
  poller = null;
}

// What the table looks like right now, as one comparable string.
function rosterSig(data) {
  if (!data) return 'offline';
  return (data.revealed ? 'R:' : 'S:') + data.participants
    .map(p => `${p.name}${p.submitted ? '+' : '-'}${p.scores ? p.scores.join('.') : ''}${p.rated ? '/' + p.rated.join('.') : ''}`)
    .join('|');
}

// Whichever screen is open owns the poll; the invite sheet takes it over
// while it is up, because that is where the leader is watching people
// arrive, and hands it back on close.
function syncPolling() {
  stopPolling();
  if (!state) return;
  const id = $('#share-modal').classList.contains('hidden') ? activeScreenId() : '#share-modal';
  if (id === '#share-modal' && state.liveCode && pollInvite) startPolling(pollInvite, { fast: 1200, max: 5000 });
  // Everyone at the table polls, not only the leader. A guest still scoring
  // used to learn about the reveal never, and a guest on Results learned
  // about it as a silent redraw up to twelve seconds later. The most
  // important event in the session reached every device except the ones it
  // was about.
  else if (id === '#screen-cupping' && tableCode()) startPolling(pollCuppingRoster, { fast: 2500, max: 12000 });
  else if (id === '#screen-results' && tableCode()) startPolling(pollResults);
  else if (id === '#screen-present' && tableCode()) startPolling(pollPresent);
}

// The leader is scoring, not staring at the roster — so arrivals come to
// them: a count on the invite pill and one toast naming who turned up.
let tableCounts = null;
let seenCuppers = null;
// set by the invite sheet while it is open, so syncPolling can hand it the poll
let pollInvite = null;

async function pollCuppingRoster() {
  const code = tableCode();
  if (!code) return null;
  const data = await relayListParticipants(code);
  if (!data) return 'offline';

  const leader = isTableLeader();
  const names = data.participants.map(p => p.name);
  // arrivals are the leader's business; a guest does not need a buzz every
  // time someone else sits down
  if (leader && seenCuppers) {
    const fresh = names.filter(n => !seenCuppers.includes(n));
    if (fresh.length) {
      arrivalHaptic();
      toast(fresh.length === 1 ? `${fresh[0]} joined` : `${fresh.length} more joined`);
    }
  }
  seenCuppers = names;

  tableCounts = { joined: names.length, submitted: data.participants.filter(p => p.submitted).length };
  // The transition, not the state: this fires once, on the tick where the
  // table went from sealed to open, and only for the people who were not
  // the one who opened it.
  const opened = data.revealed && !state.revealed;
  state.revealed = data.revealed;
  save();
  refreshTabs();
  if (opened && !leader) announceReveal();
  return rosterSig(data);
}

// What the leader sees as a ceremony, a guest used to see as nothing at all.
function announceReveal() {
  arrivalHaptic();
  confirmSheet({
    title: 'The table is open',
    body: 'The cupping leader has opened every cupper’s scores. Yours are in the panel average.',
    effects: ['Origin details for each coffee are on your device now too.'],
    cta: 'See the table',
  }).then(go => {
    if (!go) return;
    buildResults();
    showScreen('#screen-results');
  });
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
    // how much of each sheet is real, so the receiving table can weigh it
    r: myRated(),
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
  // a code from an older build has no `r`; leaving it undefined makes
  // ratedAt return null, which reads as complete rather than as zero
  const rated = Array.isArray(obj.r) && obj.r.length === scores.length
    ? obj.r.map(v => Math.max(0, Number(v) || 0))
    : undefined;
  state.team.push({ name: String(obj.n || 'Cupper').slice(0, 24), scores, rated });
  save();
  return { ok: true };
}

/* ---------- asking before something irreversible ----------

   Every decision in this app is taken in a bespoke sheet except the eight
   that mattered most, which were window.confirm(): the OS font, in the
   middle of the cupping, with "OK" focused by default. Two of the eight
   guarded nothing at all and are gone. The rest come through here, where
   the consequences can be listed rather than crammed into one sentence,
   and where the safe choice is the one under the cursor.                */

/* The reveal is the only irreversible, table-wide act in the product, and
   the reason to trust the result at all. It was a grey OS alert that also
   silently flipped shareDetails, pushing farm, variety, process and
   altitude to every guest device — a leader who chose a blind cupping had
   it un-blinded without either dialog mentioning it.

   Both consequences are named here, next to the count of who has not
   finished, which the button beside it already knew and the dialog taking
   the decision did not. */
async function askToReveal() {
  const counts = tableCounts || { joined: 0, submitted: 0 };
  const waiting = Math.max(0, counts.joined - counts.submitted);
  const effects = [
    'Every cupper at the table sees every score, on their own device.',
  ];
  if (!state.shareDetails) {
    effects.push('Origin details — farm, variety, process, altitude — go out with them. This cupping stops being blind.');
  }
  if (waiting > 0) {
    effects.push(`${waiting} cupper${waiting > 1 ? 's have' : ' has'} not submitted yet. ${waiting > 1 ? 'Their sheets' : 'Their sheet'} can still be added afterwards, but ${waiting > 1 ? 'they' : 'that cupper'} will be scoring with the table’s scores already on screen.`);
  }
  effects.push('It cannot be undone.');
  return confirmSheet({
    title: 'Open the scores to the table?',
    body: 'The standard asks every cupper to score independently first. This ends that.',
    effects,
    cta: 'Open the scores',
    danger: true,
  });
}

function confirmSheet({ title, body, effects, cta, danger }) {
  return new Promise(resolve => {
    const modal = $('#confirm-modal');
    const go = $('#confirm-go');
    $('#confirm-title').textContent = title;
    $('#confirm-body').textContent = body || '';
    $('#confirm-body').classList.toggle('hidden', !body);

    const list = $('#confirm-effects');
    list.innerHTML = '';
    (effects || []).forEach(text => {
      const li = el('li');
      li.textContent = text;
      list.appendChild(li);
    });
    list.classList.toggle('hidden', !(effects && effects.length));

    go.textContent = cta || 'Continue';
    go.classList.toggle('btn-danger', Boolean(danger));
    go.classList.toggle('btn-primary', !danger);

    let done = false;
    const finish = answer => {
      if (done) return;
      done = true;
      closeSheet(modal);
      modal.onclick = null;
      go.onclick = null;
      $('#confirm-cancel').onclick = null;
      resolve(answer);
    };
    const close = () => finish(false);

    $('#confirm-cancel').onclick = close;
    go.onclick = () => finish(true);
    modal.onclick = e => { if (e.target === modal) close(); };
    openSheet(modal, close);
    // Cancel is first in the sheet, so it is what openSheet focuses and what
    // Return takes. The old dialog defaulted to OK on the one action here
    // that cannot be undone.
  });
}

/* ---------- modal ---------- */

function openModal({ title, hint, cta, onSubmit }) {
  const modal = $('#modal');
  const input = $('#modal-input');
  $('#modal-title').textContent = title;
  $('#modal-hint').textContent = hint;
  $('#modal-submit').textContent = cta;
  input.value = '';
  openSheet(modal, () => close());
  setTimeout(() => input.focus(), 60);

  const close = () => {
    closeSheet(modal);
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
    closeSheet(modal);
    pad.detach();
  };

  openSheet(modal, () => close());

  $('#join-cancel').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  $('#pin-alt').onclick = () => {
    close();
    openModal({
      title: 'Paste a cupping link or code',
      hint: 'Paste the message the leader shared — the app will find the code inside it.',
      cta: 'Join',
      onSubmit: async text => {
        const joined = await joinSessionFromCode(text);
        if (!joined) { toast('That doesn’t look like a cupping code'); return false; }
        // the long code names its table when the leader had one, so this
        // joiner takes a seat there rather than starting a rival table
        if (joined.code) await takeSeat(joined.code);
        startCupping();
        toast(`Joined · ${state.coffees.length} coffee${state.coffees.length > 1 ? 's' : ''}`);
        return true;
      },
    });
  };
}

/* ---------- name prompt, then join ---------- */

// Register at a live table. A seat that never arrives used to leave the
// cupper with no way to submit at all; submitting can claim one later, so a
// failure here is survivable — but it should not pass unmentioned.
/* Sitting down twice at the same table.

   Taking a seat cut a new one every time, unconditionally. Opening the join
   link again is not an unusual thing to do — it gets pasted into the group
   chat twice, someone reloads, someone taps it to check they are in the
   right room — and each of those put a second chip with the same name on
   the leader's roster, one of them orphaned: the device keeps only the
   newest id, so the older seat can never be submitted to, and never
   disappears either. The leader counts heads against the room and comes up
   one over, with no way to tell which chip is the ghost.

   So a seat already held at this table is checked and kept. The relay
   answers 403 to a stranger's id, which is how an expired or ended seat is
   told apart from a good one — and a request that never reached the relay
   at all keeps the seat too, because a second chip is a worse answer to a
   dropped connection than a stale one. */
async function takeSeat(code) {
  if (!state || !code) return;
  const held = state.joinedCode === code && state.participantId ? state.participantId : null;
  state.joinedCode = code;
  save();

  if (held) {
    const seat = await relayFetch(
      `/sessions/${encodeURIComponent(code)}/participants?id=${encodeURIComponent(held)}`, { method: 'GET' });
    if (!state) return;
    // 200: the seat is still ours. 0: we never asked, so assume it is.
    if (seat.ok || seat.status === 0) { state.participantId = held; save(); return; }
  }

  const id = await relayJoinSession(code, getCupperName() || 'Cupper');
  if (!state) return;
  if (id) state.participantId = id;
  else toast('Joined, but the table did not confirm your seat — it will retry when you submit');
  save();
}

/* Joining replaces whatever session is on this device, and it used to do
   that without asking. #btn-start guards the identical destruction with a
   confirm sheet; the join path — which is the most travelled entrance in the
   product, and the one most likely to be taken mid-session when somebody
   pastes the link into the group chat again — had no check at all. Worse, a
   device that had ever entered a cupper name skipped even the name modal, so
   a tapped link wiped eight scored coffees between one frame and the next,
   with no undo and no archive.

   Nothing is archived until Results, so there is genuinely nothing to
   recover. It asks now, and it names what is at stake. */
async function joinWouldDestroyWork() {
  if (!state || !state.coffees || !state.coffees.length) return false;
  const p = sessionProgress();
  const scored = state.coffees.length - p.untouched;
  if (scored === 0) return false;
  return !(await confirmSheet({
    title: 'Join this table and leave your cupping?',
    body: `You have ${scored} coffee${scored > 1 ? 's' : ''} scored in a cupping that has not been finished, so it is not in History yet.`,
    effects: ['Joining replaces it. That scoring is discarded.'],
    cta: 'Leave it and join',
    danger: true,
  }));
}

function askNameThenJoin(payload, code) {
  const finish = async name => {
    // register under the name they gave, and keep the roster and the
    // submitted scores agreeing on it
    setCupperName(name || getCupperName() || 'Cupper');
    // All three callers gate on `if (payload)`, which is truthiness, not
    // structure: a relay response that arrives truncated, or a #join= code
    // that decodes to an object with no lineup in it, is truthy and gets
    // here. applySessionPayload refuses it and returns false — and this line
    // ignored the answer, so startCupping() then read state.coffees off null.
    // The cupper was returned to setup with no session, no message and a
    // TypeError in the console. Every other decode failure on this path says
    // something true; this one said nothing.
    if (!applySessionPayload(payload)) {
      toast('That cupping link is missing its lineup — ask for a fresh one');
      return;
    }
    // a link made before the leader's code existed carries the lineup only
    await takeSeat(code || (payload && payload.lc) || null);
    startCupping();
    toast(`Joined · ${state.coffees.length} coffee${state.coffees.length > 1 ? 's' : ''}`);
    // Someone arriving by QR never passes the setup screen, so they land on
    // eight sections of a form they may never have seen, with no idea what a
    // cupping is or why they score alone first. "How a cupping works" was
    // written for exactly this person and had nowhere to appear. Once per
    // device, and only for a device with no history of its own.
    // A modal fired 400ms after landing is the wrong container for
    // orientation someone needs again in ten minutes: it interrupts, it
    // covers the thing it is describing, and it is gone forever once
    // dismissed. The card at the top of the first sheet stays until it is
    // dismissed, sits beside what it explains, and the help mark in the
    // header brings the full method back at any point.
    if (!hasCuppedBefore()) markCuppedBefore();
  };

  const known = getCupperName();
  if (known) {
    joinWouldDestroyWork().then(blocked => { if (!blocked) finish(known); });
    return;
  }

  const modal = $('#name-modal');
  const input = $('#name-input');
  input.value = '';
  openSheet(modal, () => close());
  setTimeout(() => input.focus(), 80);

  const close = () => { closeSheet(modal); modal.onclick = null; };
  const go = async name => {
    close();
    if (await joinWouldDestroyWork()) return;
    finish(name);
  };

  $('#name-submit').onclick = () => go(input.value.trim());
  $('#name-skip').onclick = () => go('');
  input.onkeydown = e => { if (e.key === 'Enter') go(input.value.trim()); };
  // Tapping the backdrop used to join the table silently as "Cupper", so a
  // stray touch seated someone anonymously and the leader's roster filled
  // with names nobody could match to a face. Taking a seat is a decision;
  // it needs one of the two buttons, and "Skip" is there for anyone who
  // would rather not give a name.
}

/* ---------- invite sheet: QR + live code ---------- */

function joinURL(code) {
  return `${APP_URL}#join=${code}`;
}

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

  // A cupper who joined someone else's table is passing on THEIR code, not
  // starting a table of their own. Minting a fresh one here made the guest
  // a leader of an empty session, split the room across two codes, and left
  // their seat pointing at a table they were no longer on — which is what
  // the failed submissions were.
  const guest = !state.liveCode && Boolean(state.joinedCode || state.joinedLineup);

  modal.classList.toggle('guest-view', guest);
  $('#share-title').textContent = guest ? 'Cupping code' : 'Invite cuppers';
  $('#share-hint').textContent = guest
    ? 'Anyone else joining scans this or enters the code in “Join a cupping”. Only the leader can reveal the scores.'
    : 'Cuppers can scan the QR with their camera, enter the live code in “Join a cupping”, or open the link you share.';

  // A link built before the live code exists carries the lineup but names no
  // table, so anyone opening it would start a second one. The share control
  // waits for the code rather than handing out a link that splits the room.
  const link = $('#share-link');
  let shareUrl = guest && state.joinedCode ? `${APP_URL}#code=${state.joinedCode}` : null;
  const setShareUrl = url => {
    shareUrl = url;
    link.disabled = !url;
    link.textContent = url ? 'Share link' : 'Getting code…';
    if (url) renderQR(url);
  };

  if (guest && !state.joinedCode) {
    // an offline join: no table to point at, but the lineup itself travels
    setShareUrl(joinURL(await buildSessionCode()));
  } else {
    setShareUrl(shareUrl);
  }

  toggle.checked = state.shareDetails;
  $('#share-pin-label').textContent = guest ? 'Cupping code' : 'Live code';
  pin.textContent = guest ? (state.joinedCode || '—') : 'Getting live code…';
  pin.classList.toggle('pending', !guest);
  pinWrap.classList.toggle('hidden', guest && !state.joinedCode);
  joinedWrap.classList.add('hidden');
  openSheet(modal, () => close());

  const close = () => {
    closeSheet(modal);
    syncPolling(); // hand the poll back to the screen underneath
    $('#share-close').onclick = null;
    link.onclick = null;
    toggle.onchange = null;
    modal.onclick = null;
  };
  $('#share-close').onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  link.onclick = () => shareUrl && shareText(
    `Join my cupping: ${shareUrl}\n\nOr open ${APP_URL}, tap “Join a cupping” and enter the code.`,
    'Join link copied'
  );

  const refreshJoined = async () => {
    const code = tableCode();
    if (!code) return null;
    const data = await relayListParticipants(code);
    if (!data) return 'offline';
    const people = data.participants;
    const done = people.filter(p => p.submitted).length;

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
        joinedList.appendChild(chip);
      });
    }

    // reveal control: sealed scores are the protocol, so this is deliberate —
    // and it belongs to the leader alone
    revealBtn.classList.toggle('hidden', guest || !people.length);
    if (data.revealed) {
      revealBtn.textContent = 'Scores revealed — see Results';
      revealBtn.disabled = true;
    } else {
      revealBtn.disabled = false;
      revealBtn.textContent = done < people.length
        ? `Reveal scores now (${people.length - done} still cupping)`
        : 'Reveal scores to the table';
    }

    // keep the header pill in step while the sheet is the one polling
    tableCounts = { joined: people.length, submitted: done };
    seenCuppers = people.map(p => p.name);
    state.revealed = data.revealed;
    save();
    return rosterSig(data);
  };
  pollInvite = refreshJoined;

  const revealBtn = $('#btn-reveal');
  revealBtn.onclick = async () => {
    if (!state.liveCode || !state.liveToken) return;
    if (!(await askToReveal())) return;
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

  // A guest's sheet is done: it shows the table's own code and nothing that
  // belongs to the leader. It never reaches the code-minting path below.
  if (guest) {
    syncPolling();
    return;
  }

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
    // point the QR and the link at the code, so joiners are counted, get
    // late lineup updates, and land at this table rather than a new one
    setShareUrl(`${APP_URL}#code=${live.code}`);
    syncPolling(); // the sheet is up, so it takes the poll at its fastest
  } else {
    // No relay reached, so there is no live code still on its way. The reason
    // the link waited — that a lineup-only link would send people to a second
    // table — cannot happen now, so the offline path is the right one to take:
    // the code carries the whole lineup on its own.
    pinWrap.classList.add('hidden');
    setShareUrl(joinURL(await buildSessionCode()));
    $('#share-hint').textContent =
      'No signal for a live code. The QR and link still carry the whole lineup — cuppers scan or open it, score on their own device, then share their scores back to you from their Results screen.';
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
  return Boolean(state && (state.joinedCode || state.joinedLineup));
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
    ? 'This lineup comes from the cupping leader. The samples stay coded until they reveal them at the end.'
    : 'Name the coffees before you invite anyone — the table sees these names. Leave a card blank and it stays <strong>Coffee 1</strong>, <strong>Coffee 2</strong>, and you can fill in the rest later.';

  $('#btn-lineup-add').classList.toggle('hidden', locked);
  $('#btn-lineup-paste').classList.toggle('hidden', locked);
  $('#btn-lineup-add').disabled = state.coffees.length >= LIMITS.coffees[1];
  // a guest cannot change the lineup, but they can still pass the code on
  $('#btn-lineup-invite').textContent = locked ? 'Show the code' : 'Invite cuppers';

  // once there are scores on the sheet this screen is an edit, not a setup
  const scored = state.coffees.length - sessionProgress().untouched;
  $('#btn-lineup-start').textContent = scored > 0 ? 'Back to cupping' : 'Start cupping';
}

function buildLineupRow(coffee, index, locked) {
  const row = el('div', 'lineup-row');
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
  removeBtn.addEventListener('click', async () => {
    if (state.coffees.length <= 1) return;
    const p = scoreProgress(coffee);
    if (p.done > 0 && !(await confirmSheet({
      title: `Remove ${coffeeName(coffee, index)}?`,
      effects: [`${p.done} of its ${p.total} sections ${p.done > 1 ? 'have' : 'has'} been scored. That scoring is discarded.`],
      cta: 'Remove it',
      danger: true,
    }))) return;
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
    onSubmit: async text => {
      const names = String(text || '')
        .split('\n')
        .map(s => s.replace(/^\s*[-–—•*\d.)\]]+\s*/, '').trim())
        .filter(Boolean)
        .slice(0, LIMITS.coffees[1]);
      if (!names.length) { toast('No names found'); return false; }

      const scored = state.coffees.slice(names.length).filter(c => scoreProgress(c).done > 0).length;
      if (scored > 0 && !(await confirmSheet({
        title: 'Shorten the lineup?',
        effects: [`${scored} coffee${scored > 1 ? 's that already have' : ' that already has'} scores would be dropped, and that scoring is discarded.`],
        cta: 'Shorten it',
        danger: true,
      }))) return false;

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
  markScrollEnds(seg);
  const hint = $('#form-hint');
  const hints = {
    cva: 'SCA Coffee Value Assessment · 8 sections rated 1–9',
    legacy: 'Retired 2004 form · 7 attributes from 6.00 to 10.00',
  };
  FORMS.forEach(f => {
    const btn = el('button', 'seg-btn' + (f.id === setup.form ? ' active' : ''), f.name);
    btn.setAttribute('aria-pressed', f.id === setup.form ? 'true' : 'false');
    btn.addEventListener('click', () => {
      setup.form = f.id;
      haptic();
      seg.querySelectorAll('.seg-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
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
  syncActivePanel();
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
      syncActivePanel();
      save();
    });
    rail.appendChild(seg);
  });
  rail.classList.toggle('dense', state.coffees.length > 6);
}

// Only the panel on screen. refreshTabs runs on every detent release, and
// this used to rewrite the innerHTML of all ten panels' submit rows each
// time — including nine nobody was looking at.
function refreshSubmitRows() {
  const panels = $('#panels');
  const active = panels && panels.children[state.activeIndex];
  const row = active && active.querySelector('.submit-row');
  if (row && row.refresh) row.refresh();
}

function refreshTabs() {
  markScrollEnds($('#coffee-rail'));
  const rail = $('#coffee-rail');
  const active = state.coffees[state.activeIndex];
  if (!active) return;

  // once a table is live the button carries the code, so the leader can
  // read it out without opening the sheet
  const invite = $('#btn-share-session');
  // a guest carries the leader's code, not one of their own
  const code = tableCode();
  const live = Boolean(code);
  invite.classList.toggle('live', live);

  // who is at the table, on the button the leader can already see — the
  // roster is polled in the background while they score
  const badge = invite.querySelector('.invite-count');
  const counts = live ? tableCounts : null;
  badge.classList.toggle('hidden', !counts || !counts.joined);
  if (counts && counts.joined) {
    badge.textContent = counts.submitted ? `${counts.submitted}/${counts.joined}` : String(counts.joined);
    badge.classList.toggle('all-in', counts.submitted === counts.joined);
  }

  invite.setAttribute('aria-label', live
    ? `Cupping code ${code.split('').join(' ')}${counts && counts.joined ? `, ${counts.joined} at the table` : ''} — open the code`
    : 'Invite cuppers to this session');

  // The score and the progress moved into the header's own score block, so
  // this line stops repeating them. What it says instead is the thing that
  // used to be the invite button's label and is now nowhere else on the
  // screen: the live code. A latecomer asks for it mid-section, and reading
  // it off the header beats leaving the sheet to open a sheet to read four
  // digits and find your place again.
  /* Three facts, one line, and on a phone the line is not always long
     enough for three. It is 156px wide on a 390px screen and the full run —
     "1 of 3 · code 6375 · not sent" — wants 191, so it was cut mid-glyph,
     with no ellipsis and no warning, and what fell off the end was "not
     sent". The one fact on the line that nobody can recover by tapping
     something was the first one lost.

     So the line is ordered by what it costs to lose. Whether your sheet has
     reached the table leads, because nothing else on this screen says it.
     The code follows, and if that is what gets clipped the invite button
     beside it opens the code full size. The position goes last and is
     dropped entirely at a live table: the rail along the bottom numbers
     every coffee and marks the one you are on, and the coffee's own name is
     the line directly above this one. */
  const parts = [];
  if (code) parts.push(state.submittedAt ? 'sent' : 'not sent');
  if (live) parts.push(`code ${code}`);
  if (!code && state.coffees.length > 1) parts.push(`${state.activeIndex + 1} of ${state.coffees.length}`);
  $('#cupping-name').textContent = coffeeName(active, state.activeIndex);
  $('#cupping-position').textContent = parts.join(' · ');

  refreshSubmitRows();

  state.coffees.forEach((c, i) => {
    const seg = rail.children[i];
    if (!seg) return;
    const p = scoreProgress(c);
    seg.querySelector('.rail-fill').style.transform = `scaleX(${p.done / p.total})`;
    seg.querySelector('.rail-num').textContent = i + 1;
    seg.classList.toggle('active', i === state.activeIndex);
    seg.classList.toggle('done', p.complete);
    seg.setAttribute('aria-label',
      `${coffeeName(c, i)}, ${p.complete ? 'rated' : `${p.done} of ${p.total} rated`}`);
    seg.setAttribute('aria-current', i === state.activeIndex ? 'true' : 'false');
  });
}

let panelScrollWired = false;

function buildPanels() {
  const panels = $('#panels');
  panels.innerHTML = '';
  state.coffees.forEach((c, i) => panels.appendChild(buildPanel(c, i)));

  // Registered once. buildPanels runs on start, on every guided-mode toggle
  // and on reveal-driven rebuilds, and #panels is a persistent element — so
  // each rebuild used to add another listener with its own debounce timer,
  // and after three of them a single swipe fired three save() calls.
  if (panelScrollWired) return;
  panelScrollWired = true;

  // sync active tab with horizontal swipe position
  let scrollTimer = null;
  panels.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const idx = Math.round(panels.scrollLeft / panels.clientWidth);
      if (idx !== state.activeIndex && idx >= 0 && idx < state.coffees.length) {
        state.activeIndex = idx;
        syncActivePanel();
        save();
      }
    }, 80);
  }, { passive: true });
}

function scrollToPanel(i, smooth) {
  const panels = $('#panels');
  panels.scrollTo({ left: i * panels.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}

/* Only the coffee on screen is reachable. All panels live in one scroll
   container, so without this a keyboard or screen-reader user walked ten
   name fields, seventy sliders and 230-odd chips in a flat sequence with
   nothing saying which coffee they were in — and focusing an off-screen
   control scroll-jacked the snap container, which then changed the active
   coffee underneath them. */
function syncPanelInertness() {
  const panels = $('#panels');
  if (!panels) return;
  [...panels.children].forEach((panel, i) => {
    panel.inert = i !== state.activeIndex;
  });
}

function syncActivePanel() {
  syncPanelInertness();
  refreshTabs();
  updateScorebar();
}

/* What a first-timer needs in their first five seconds. Not the whole
   method — three sentences about what is about to happen and why they are
   scoring alone — with the full version one tap away. */
const WELCOME_KEY = 'sca-cupping-welcomed-v1';

function welcomeDismissed() {
  try { return localStorage.getItem(WELCOME_KEY) === '1'; } catch (e) { return true; }
}

function dismissWelcome() {
  try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) {}
  document.querySelectorAll('.welcome-card').forEach(c => c.remove());
}

function buildWelcome() {
  const card = el('div', 'welcome-card');
  card.innerHTML = `
    <h2>You are scoring on your own</h2>
    <p>Taste each coffee and rate the eight sections from 1 to 9 — 5 is “neither high nor low”, which is where an ordinary cup sits. Drag anywhere on a line; the words under your thumb say what each position means.</p>
    <p>Nobody sees your scores until you send them, and nobody sees the table’s until the cupping leader opens them. That is the point: the standard asks every cupper to judge without being influenced by anyone else.</p>
    <div class="welcome-actions">
      <button class="btn btn-ghost" type="button" data-act="method">How a cupping works</button>
      <button class="btn btn-primary" type="button" data-act="go">Start scoring</button>
    </div>`;
  card.querySelector('[data-act="method"]').addEventListener('click', () => openHelp('intro'));
  card.querySelector('[data-act="go"]').addEventListener('click', () => { haptic(); dismissWelcome(); });
  return card;
}

function buildPanel(coffee, index) {
  const panel = el('div', 'panel');
  // The lineup screen already refuses to let a guest edit a name the leader
  // owns; the scoring panel offered the same fields with no such check, and
  // adoptRevealedLineup then overwrote whatever was typed the instant the
  // leader revealed. Same data, two permissions, and the divergence was
  // destroyed silently.
  const locked = lineupLocked();

  // first coffee only: this is orientation, not a per-coffee fixture
  if (index === 0 && !welcomeDismissed()) panel.appendChild(buildWelcome());

  // name
  const name = document.createElement('input');
  name.className = 'name-field';
  name.type = 'text';
  name.placeholder = `Coffee ${index + 1} — name or lot…`;
  name.value = coffee.name;
  name.maxLength = 40;
  // The comment above described this and the fix never landed: `locked` was
  // computed and then not read by anything, so the panel kept accepting a
  // guest's rename that adoptRevealedLineup threw away at the reveal.
  name.readOnly = locked;
  if (locked) name.title = 'The lead cupper names the coffees at this table';
  name.addEventListener('input', () => {
    // readOnly stops a thumb, not a script, and this permission has now been
    // half-applied twice. The guard puts it in the handler that owns the
    // write, where it cannot be lost by someone editing the markup.
    if (name.readOnly) { name.value = coffee.name; return; }
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
    // Describe's mark explains the split; Score's explains the scale itself,
    // which is the question actually being asked below it.
    panel.appendChild(panelHead('Score', 'how good it is · 1–9 each', 'cvaScale'));
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

  panel.appendChild(buildSubmitRow());

  return panel;
}

/* Submission is the participant's terminal act in the protocol, and it used
   to exist in exactly one place: inside the team card, third down the
   Results scroll, past a radar chart — reached through a button labelled
   "Results". Nothing on the screen where a cupper spends the whole session
   mentioned it. The leader auto-submits on entering Present; nobody else
   did, so a cupper could score eight coffees, pocket the phone, and
   contribute nothing to the panel average without ever being told.

   It lives at the end of the sheet now, which is where you are standing
   when you have finished scoring. */
function buildSubmitRow() {
  const row = el('div', 'submit-row');
  const refresh = () => {
    const code = tableCode();
    if (!code) { row.classList.add('hidden'); return; }
    row.classList.remove('hidden');
    const p = sessionProgress();
    const sent = Boolean(state.submittedAt);
    const rated = state.coffees.length - p.untouched;
    row.innerHTML = sent
      ? `<p class="submit-note done">Your scores are with the table. You can keep editing and send them again.</p>
         <button class="btn btn-ghost" type="button">Update my scores</button>`
      : `<p class="submit-note">${rated === 0
            ? 'Nothing rated yet. Your sheet reaches the table when you send it.'
            : `${p.complete
                ? 'Every coffee is scored.'
                : `${rated} of ${state.coffees.length} coffee${state.coffees.length > 1 ? 's' : ''} scored.`} Your sheet is not with the table yet — nobody sees it until you send it, and nobody sees the table's scores until the leader opens them.`}</p>
         <button class="btn btn-primary" type="button"${rated === 0 ? ' disabled' : ''}>Submit my scores</button>`;
    const btn = row.querySelector('button');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const res = await relaySubmitScores(tableCode(), state.participantId,
        getCupperName() || (state.liveCode ? 'Host' : 'Cupper'), myScores(), myRated());
      if (!res.ok) { btn.disabled = false; btn.textContent = 'Try again'; toast(res.reason); return; }
      state.submittedAt = Date.now();
      save();
      arrivalHaptic();
      toast('Sent to the table');
      refreshTabs();
      refresh();
      if (poller) poller.wake();
    });
  };
  row.refresh = refresh;
  refresh();
  return row;
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
    input.readOnly = lineupLocked();
    if (f.list) input.setAttribute('list', f.list);
    if (f.inputmode) input.setAttribute('inputmode', f.inputmode);
    input.addEventListener('input', () => {
      if (input.readOnly) { input.value = coffee.meta[f.key] || ''; return; }
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

    svg += `<path class="wheel-seg wheel-cat ink-${inkOn(cat.color)}" d="${arc(R_IN, R_MID, a0, a1)}" fill="${cat.color}" tabindex="-1" role="button"`
      + ` aria-label="${escapeHTML(cat.name)} — category, checks it on the Describe form" data-cat="${escapeHTML(cat.name)}"/>`;

    // category label, rotated to sit along its wedge
    const lx = C + ((R_IN + R_MID) / 2) * Math.cos(mid);
    const ly = C + ((R_IN + R_MID) / 2) * Math.sin(mid);
    let deg = (mid * 180) / Math.PI;
    if (deg > 90 || deg < -90) deg += 180;
    // The category ring is 56 units deep and the label reads along the
    // radius, so "Green / Vegetative" — 63.8 units on one line — ran out
    // of its own wedge and into the descriptors. The compound names break
    // at their slash instead, which is where they already read as two
    // things: no line exceeds about 40 units.
    const parts = cat.name.split('/');
    const label = parts.length > 1
      ? parts.map((t, i) =>
          `<tspan x="${lx.toFixed(1)}" dy="${i === 0 ? '-0.55em' : '1.1em'}">${escapeHTML(t.trim())}</tspan>`).join('')
      : escapeHTML(cat.name);
    svg += `<text class="wheel-cat-label ink-${inkOn(cat.color)}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${deg.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${label}</text>`;

    cat.children.forEach(child => {
      const cSpan = (1 / total) * Math.PI * 2;
      const c0 = outerAngle, c1 = outerAngle + cSpan;
      const cMid = (c0 + c1) / 2;
      svg += `<path class="wheel-seg wheel-child ink-${inkOn(cat.color)}" d="${arc(R_MID, R_OUT, c0, c1)}" fill="${cat.color}" fill-opacity="0.45" tabindex="-1" role="button"`
        + ` aria-label="${escapeHTML(child)} — ${escapeHTML(cat.name)}, adds the word to your tasting notes" data-desc="${escapeHTML(child)}" data-cat="${escapeHTML(cat.name)}"/>`;
      const tx = C + ((R_MID + R_OUT) / 2 - 2) * Math.cos(cMid);
      const ty = C + ((R_MID + R_OUT) / 2 - 2) * Math.sin(cMid);
      let cDeg = (cMid * 180) / Math.PI;
      if (cDeg > 90 || cDeg < -90) cDeg += 180;
      // A picked descriptor's wedge goes to 95% opacity, so its ground stops
      // being the card and becomes the hue — which took the label with it,
      // to 2.94:1 in light and 1.55:1 in dark. The label carries the ink its
      // own hue needs, and switches to it exactly when the wedge fills.
      svg += `<text class="wheel-child-label ink-${inkOn(cat.color)}" data-desc="${escapeHTML(child)}" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${cDeg.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})">${escapeHTML(child)}</text>`;
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

/* The wheel used to be an unlabelled disc of spokes in the corner, and
   people simply did not know it was there. It is labelled now, it pulses
   until it has been opened once, a coach mark points at it on the first
   cupping, and the Describe card offers the same door where the words are
   actually being hunted for.                                          */

const WHEEL_SEEN_KEY = 'sca-cupping-wheel-seen-v1';
let coachTimer = null;

function wheelSeen() {
  try { return localStorage.getItem(WHEEL_SEEN_KEY) === '1'; } catch (e) { return true; }
}

function markWheelSeen() {
  try { localStorage.setItem(WHEEL_SEEN_KEY, '1'); } catch (e) { /* private mode */ }
  $('#btn-wheel').classList.remove('unused');
  hideWheelCoach();
}

function hideWheelCoach() {
  clearTimeout(coachTimer);
  const coach = $('#wheel-coach');
  if (coach.classList.contains('hidden')) return;
  coach.classList.add('leaving');
  setTimeout(() => { coach.classList.add('hidden'); coach.classList.remove('leaving'); }, 320);
}

function maybeShowWheelCoach() {
  const fab = $('#btn-wheel');
  fab.classList.toggle('unused', !wheelSeen());
  if (wheelSeen()) return;
  const coach = $('#wheel-coach');
  clearTimeout(coachTimer);
  coachTimer = setTimeout(() => {
    if (activeScreenId() !== '#screen-cupping' || wheelSeen()) return;
    coach.classList.remove('hidden');
    coachTimer = setTimeout(hideWheelCoach, 9000);
  }, 1400);
}

/* Zoom for the wheel. Whole-wheel is where it opens and where it belongs
   — a first-timer is looking for which words exist at all, and that is a
   question only the whole vocabulary answers. Past that, reading a word
   and landing a thumb on it need scale, so the reader picks it.

   The steps are labelled by what they are for rather than by a number,
   because "1.8×" tells a cupper nothing and "readable" tells them
   exactly what they are asking for. Zooming keeps the middle of what you
   were looking at in the middle. */
// Two states, not three. "Close" was a third rung that answered no question
// the other two left open: whole-wheel is for finding out which words exist,
// readable is for picking one, and past that you are just looking at the same
// word larger. A ladder is also the wrong control for two states, because one
// end of a stepper is always disabled — so this is a toggle now.
//
// 2.05 is not a round number chosen for tidiness. Descriptors render at
// 5.53px with the wheel fit to a phone and the floor is 11px, so "readable"
// has to clear 2.002x or the label on the button is a lie.
const WHEEL_ZOOMS = [
  { z: 1, label: 'Whole wheel' },
  { z: 2.05, label: 'Readable' },
];

/* The wheel as a keyboard widget.

   Sixty-eight descriptors and nine categories, and every one of them was
   reachable only by pointer: no role, no tabindex, one delegated click
   handler over <path> elements. DESIGN.md defends the wheel's type-size
   exemption on the grounds that it is the only view answering the question a
   first-timer actually has — which words exist at all — and that view was
   unavailable to an entire class of first-timer.

   It is one tab stop, not seventy-seven. Putting every wedge in the tab
   order would make a keyboard user pass all of them to reach "Done", so the
   wheel behaves the way a grid or a menu does: Tab reaches it, arrows move
   inside it, and Enter or Space takes the wedge under the cursor. Left and
   right run along the ring you are on; up and down step between the category
   ring and its own descriptors, which is the relationship the drawing is
   about. */
function wireWheelKeyboard(holder) {
  const svg = holder.querySelector('svg');
  if (!svg) return;
  const cats = [...holder.querySelectorAll('.wheel-cat')];
  const kids = [...holder.querySelectorAll('.wheel-child')];
  if (!cats.length) return;

  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Flavor wheel — arrow keys move between wedges, Enter takes one');

  let current = cats[0];
  const setCurrent = seg => {
    if (!seg) return;
    [...cats, ...kids].forEach(x => x.setAttribute('tabindex', '-1'));
    current = seg;
    seg.setAttribute('tabindex', '0');
  };
  setCurrent(cats[0]);

  const childrenOf = cat => kids.filter(k => k.dataset.cat === cat.dataset.cat);
  const ringOf = seg => (seg.classList.contains('wheel-cat') ? cats : kids);

  const step = (seg, delta) => {
    const ring = ringOf(seg);
    const i = ring.indexOf(seg);
    return ring[(i + delta + ring.length) % ring.length];
  };

  const move = seg => {
    if (!seg) return;
    setCurrent(seg);
    seg.focus({ preventScroll: true });
    // the wheel is a scrolled, zoomed viewport — a wedge the keyboard
    // reaches has to be brought into it
    if (seg.scrollIntoView) seg.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  holder.onkeydown = e => {
    const seg = e.target.closest && e.target.closest('.wheel-seg');
    if (!seg) return;
    const isCat = seg.classList.contains('wheel-cat');
    let next = null;

    if (e.key === 'ArrowRight') next = step(seg, 1);
    else if (e.key === 'ArrowLeft') next = step(seg, -1);
    else if (e.key === 'ArrowDown') next = isCat ? childrenOf(seg)[0] : null;
    else if (e.key === 'ArrowUp') {
      next = isCat ? null : cats.find(c => c.dataset.cat === seg.dataset.cat);
    } else if (e.key === 'Home') next = ringOf(seg)[0];
    else if (e.key === 'End') next = ringOf(seg)[ringOf(seg).length - 1];
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      seg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    } else {
      return;
    }

    if (!next) return;
    e.preventDefault();
    move(next);
  };

  // clicking a wedge makes it the one the keyboard resumes from
  holder.addEventListener('click', e => {
    const seg = e.target.closest && e.target.closest('.wheel-seg');
    if (seg) setCurrent(seg);
  }, true);
}

function wireWheelZoom(holder) {
  const toggle = $('#wheel-zoom-toggle');
  const level = $('#wheel-zoom-level');
  if (!toggle || !level) return;
  let step = 0;

  const apply = (move, fromWhole) => {
    // where was the middle of the view, as a fraction of the whole wheel?
    const fx = holder.scrollWidth ? (holder.scrollLeft + holder.clientWidth / 2) / holder.scrollWidth : 0.5;
    const fy = holder.scrollHeight ? (holder.scrollTop + holder.clientHeight / 2) / holder.scrollHeight : 0.5;
    holder.style.setProperty('--wheel-zoom', WHEEL_ZOOMS[step].z);
    level.textContent = WHEEL_ZOOMS[step].label;
    // The button names where it goes, not where you are — the label beside
    // it already says that, and a control that reads "Readable" while you
    // are reading is a state badge, not an action.
    toggle.textContent = step === 0 ? 'Zoom in to read' : 'Show the whole wheel';
    toggle.setAttribute('aria-pressed', step === 0 ? 'false' : 'true');
    // the click handler needs to know which view it is in: a ring that is
    // readable and a ring that is ten pixels wide are not the same control
    holder.dataset.zoom = step === 0 ? 'whole' : 'read';
    if (!move) return;
    requestAnimationFrame(() => {
      // Zooming about the centre is right once you are exploring, but the
      // first zoom out of whole-wheel would land on the hub — the one part
      // of this drawing with nothing to read. So that step goes to the top
      // of the wheel, where the words are.
      holder.scrollLeft = fx * holder.scrollWidth - holder.clientWidth / 2;
      holder.scrollTop = fromWhole ? 0 : fy * holder.scrollHeight - holder.clientHeight / 2;
    });
  };

  toggle.addEventListener('click', () => {
    const fromWhole = step === 0;
    step = step === 0 ? 1 : 0;
    haptic();
    apply(true, fromWhole);
  });

  /* Zoom in and put one wedge in the middle of the view.

     Reaching for a word in the whole-wheel view is not a tap anyone can
     make: sixty-eight descriptors share one ring, so each is about ten
     screen pixels across where it starts and fifteen where it ends. What
     came of a miss was not nothing — it was the neighbouring word, written
     silently into the tasting notes. So in that view the outer ring stops
     being a control and becomes what it looks like: a map. Touch it and it
     brings you closer instead. */
  holder.zoomToRead = seg => {
    if (step !== 0) return false;
    step = 1;
    apply(false, false);
    requestAnimationFrame(() => {
      if (seg && seg.scrollIntoView) seg.scrollIntoView({ block: 'center', inline: 'center' });
    });
    return true;
  };

  apply(false, false);
}

/* The wheel fills one of the two olfactory CATA lists — the orthonasal one
   under Fragrance & aroma, or the retronasal one under Flavor & aftertaste.
   It used to fill `flavor` whichever one you opened it from, so a cupper
   working through fragrance, on the wheel offered inside that very section,
   had their descriptors filed under flavor: a claim about what the coffee
   tastes like, made from a sniff of dry grounds. The two are different
   evidence and the form asks for them separately.

   Opened from the corner, with no section around it, it still writes to
   flavor — that is the list most of a session is spent in. Which one it is
   writing to is printed at the top either way. */
function openFlavorWheel(listKey) {
  const target = listKey === 'aroma' ? 'aroma' : 'flavor';
  markWheelSeen();
  const modal = $('#wheel-modal');
  const holder = $('#wheel-holder');
  const status = $('#wheel-status');
  const pickedWrap = $('#wheel-picked');
  if (!holder.dataset.built) {
    holder.innerHTML = buildWheelSVG();
    holder.dataset.built = '1';
    wireWheelZoom(holder);
  }

  const coffee = state && state.coffees[state.activeIndex];

  const cataList = () => coffee.desc.cata[target];
  const hint = $('#wheel-hint');
  if (hint) {
    hint.innerHTML = `Inner ring ticks a descriptor under <strong>${target === 'aroma'
      ? 'Fragrance &amp; aroma' : 'Flavor &amp; aftertaste'}</strong> — up to 5, as the standard allows. `
      + 'Outer ring drops the word into your tasting notes. Anything you have picked is outlined on the wheel and listed below it.';
  }
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
    const cata = new Set(cataList());
    const words = notesFromWheel();
    const wordSet = new Set(words.map(w => w.toLowerCase()));

    holder.querySelectorAll('.wheel-cat').forEach(seg => {
      const on = cata.has(wheelCataName(seg.dataset.cat));
      seg.classList.toggle('picked', on);
      seg.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    holder.querySelectorAll('.wheel-child').forEach(seg => {
      const on = wordSet.has(seg.dataset.desc.toLowerCase());
      seg.classList.toggle('picked', on);
      seg.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    holder.querySelectorAll('.wheel-child-label').forEach(t => {
      t.classList.toggle('picked', wordSet.has(t.dataset.desc.toLowerCase()));
    });

    // a running list of what has been taken from the wheel, each one tappable
    // to take it back — the wheel was hard to read as a record on its own
    pickedWrap.innerHTML = '';
    [...cata].forEach(name => {
      const chip = el('button', 'wheel-pick', `${escapeHTML(name)} <b>×</b>`);
      chip.type = 'button';
      chip.onclick = () => {
        haptic();
        const at = cataList().indexOf(name);
        if (at >= 0) cataList().splice(at, 1);
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

    // one word out of sixty-eight, ten pixels wide: bring it closer rather
    // than write down whichever of its neighbours the thumb actually met
    if (seg.classList.contains('wheel-child') && holder.dataset.zoom === 'whole'
        && holder.zoomToRead && holder.zoomToRead(seg)) {
      haptic();
      sync(`Zoomed in — tap “${seg.dataset.desc}” again to add it to your notes`);
      return;
    }

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

  wireWheelKeyboard(holder);

  openSheet(modal, () => close());
  const close = () => {
    closeSheet(modal);
    modal.onclick = null;
    holder.onclick = null;
    holder.onkeydown = null;
  };
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
  // A parking value, not an answer. Every intensity used to start at 5 with
  // nothing to say it had never been touched, so seven sliders sat at a
  // filled, deliberate-looking 5 on every coffee forever and exported that
  // way. `touched` is the same distinction the score sections make, and
  // DESIGN.md asks for it everywhere.
  DESC_ATTRS.forEach(a => { intensity[a.key] = 5; });
  const notes = {};
  DESC_NOTE_FIELDS.forEach(k => { notes[k] = ''; });
  return {
    roast: '',
    intensity,
    touched: {},
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
    // Its sibling, the coffee-details card, names the fields it holds
    // ("variety · process · farm…"). This one explained its own purpose —
    // which the section head two lines above already does, in almost the
    // same words, so the sheet said "Describe / what you taste · no
    // judgement" and then "Describe / what you taste, not how good" within
    // 100px. Same pattern as the sibling: say what is inside.
    summaryEl.textContent = descriptiveSummary(coffee.desc)
      || 'intensity · descriptors · notes';
  };

  const body = card.querySelector('.desc-body');
  const d = coffee.desc;
  // a descriptive block restored from an archive written before this build
  if (!d.touched) d.touched = {};
  // no help button on this row: the "Describe" section head directly above
  // already carries one, and a second widened the label until it sat under
  // the middle of the row, swallowing the tap that should open the card

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

  // The same control, so the same container. This shipped as a bordered,
  // filled .desc-row inside the already-bordered Describe card — a card
  // inside a card, which DESIGN.md forbids outright — while the identical
  // scale on the scoring half shipped as a transparent, rule-separated
  // .attr-card. One scale drawn two ways on one screen is the whole of the
  // "Consistency and Standards" finding. It is .attr-card here too, which
  // also hands the intensity its mono numerals: the old .desc-row-value set
  // no font-family, so a number a reader compares to six others was sans.
  const intensityRow = attr => {
    const row = el('div', 'attr-card');
    row.innerHTML = `
      <div class="attr-head">
        <div class="attr-head-left">
          <div class="attr-title">${attr.label}</div>
          ${attr.sub ? `<div class="attr-sub">${attr.sub}</div>` : ''}
        </div>
        <div class="attr-head-right">
          <div class="attr-value-row">
            <div class="attr-value"></div>
            <button class="cva-clear" type="button" aria-label="Clear the ${attr.label} intensity">×</button>
          </div>
        </div>
      </div>
    `;
    const valueEl = row.querySelector('.attr-value');

    const scale = buildAnchoredScale({
      label: `${attr.label} — intensity, 0 to 15`,
      ...INTENSITY_SCALE,
      read: () => d.intensity[attr.key],
      isSet: () => Boolean(d.touched && d.touched[attr.key]),
      write: v => { d.intensity[attr.key] = v; d.touched[attr.key] = true; },
      onCommit: () => { refresh(); save(); },
    });
    row.appendChild(scale.el);

    const refresh = () => {
      const rated = Boolean(d.touched && d.touched[attr.key]);
      row.classList.toggle('unrated', !rated);
      row.classList.toggle('rated', rated);
      valueEl.textContent = rated ? d.intensity[attr.key] : '–';
      scale.refresh(true);
    };

    row.querySelector('.cva-clear').addEventListener('click', () => {
      if (!d.touched || !d.touched[attr.key]) return;
      delete d.touched[attr.key];
      d.intensity[attr.key] = 5;
      haptic();
      refresh();
      save();
    });

    refresh();
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
        // Same rule as the taste and mouthfeel chips below, which got it and
        // this list did not: selection carried as a CSS class and a colour is
        // nothing to a screen reader, and nothing to a cupper with a
        // colour-vision deficiency in a dim cellar.
        const sync = () => {
          const on = list().includes(name);
          chip.classList.toggle('on', on);
          chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        };
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
      // The selected state was a CSS class and a colour, which is nothing at
      // all to a screen reader — and meaning carried by colour alone is also
      // nothing to a cupper with a colour-vision deficiency in the dim
      // cellar DESIGN.md describes.
      const sync = () => {
        const on = list().includes(name);
        chip.classList.toggle('on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
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

  // The wheel is the vocabulary for exactly these lists, so it is offered
  // right where someone is stuck for a word rather than only in the corner.
  const capRow = (text, listKey) => {
    const row = el('div', 'cata-cap-row');
    row.appendChild(el('span', 'cata-cap', text));
    const link = el('button', 'wheel-link', 'Flavor wheel');
    link.type = 'button';
    link.addEventListener('click', e => { e.stopPropagation(); openFlavorWheel(listKey); });
    row.appendChild(link);
    return row;
  };

  // --- fragrance + aroma share one olfactory CATA box ---
  const fa = section('Fragrance & aroma', 'descIntensity');
  fa.appendChild(intensityRow(DESC_ATTRS[0]));
  fa.appendChild(intensityRow(DESC_ATTRS[1]));
  const aromaTree = olfactoryChips('aroma', 5);
  fa.appendChild(capRow('Orthonasal descriptors · up to 5', 'aroma'));
  fa.appendChild(aromaTree.wrap);
  fa.appendChild(noteField('fragrance', 'freely elicited notes…'));
  body.appendChild(fa);

  // --- flavor + aftertaste: olfactory CATA plus main tastes ---
  const fl = section('Flavor & aftertaste', 'cata');
  fl.appendChild(intensityRow(DESC_ATTRS[2]));
  fl.appendChild(intensityRow(DESC_ATTRS[3]));
  const flavorTree = olfactoryChips('flavor', 5);
  fl.appendChild(capRow('Retronasal descriptors · up to 5', 'flavor'));
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

/* ---------- the anchored scale ----------
   A rating is a position on a scale carrying anchors at its ends — the
   standard says so — so it is drawn as one instead of as a row of buttons.
   Nine 44px targets will not fit across a phone at any gap, and the anchor
   wording belongs where it can be read before the choice rather than after
   it. DESIGN.md owns the rules; this builds them. */

/* The anchored line scale, as SCA 104-2024 draws it.

   It is written against positions rather than against CVA's 1–9, because
   three different sheets in this app ask the same question — where on this
   line does the cup sit — with three different numbers underneath. CVA has
   nine integer detents with an anchor phrase on each. The 2004 form has
   seventeen, 6.00 to 10.00 in quarters, with a quality band every fourth.
   The descriptive intensities have sixteen, 0 to 15, with no phrases at all.

   So the component knows only that there are `steps` detents, how to turn a
   position into the number the sheet stores, and what to draw at each. The
   gesture, the settle, the haptic per crossing, the dashed empty knob and
   the keyboard handling are then the same everywhere, which is the point:
   a cupper who learns the scale on one form has learned it on all of them. */
function buildAnchoredScale(opts) {
  const steps = opts.steps || opts.words.length;
  const valueAt = opts.valueAt || (i => i);
  const positionOf = opts.positionOf || (v => v);
  const wordAt = opts.wordAt || (i => (opts.words ? opts.words[i - 1] : ''));
  const format = opts.format || (v => String(v));
  // a numeral under every one of seventeen detents is unreadable, so each
  // scale says which of its positions are worth labelling
  const numeralAt = opts.numeralAt || (i => format(valueAt(i)));
  // 0 means no structural midpoint: only CVA has a position that is
  // different in kind from its neighbours rather than just further along
  const midAt = opts.midAt === undefined ? Math.ceil(steps / 2) : opts.midAt;
  const pct = i => ((i - 1) / (steps - 1)) * 100;

  const wrap = el('div', 'scale');
  let ticks = '';
  for (let i = 1; i <= steps; i++) {
    const numeral = numeralAt(i);
    ticks += `<i class="scale-tick${i === midAt ? ' mid' : ''}${numeral ? '' : ' minor'}" style="left:${pct(i)}%"></i>`;
    if (numeral) {
      // the numerals at the two ends anchor to their tick rather than
      // centring on it, or half of "10" hangs off the end of the line
      const edge = i === 1 ? ' at-start' : i === steps ? ' at-end' : '';
      ticks += `<span class="scale-num${edge}" data-i="${i}" style="left:${pct(i)}%">${escapeHTML(numeral)}</span>`;
    }
  }
  wrap.innerHTML = `
    <div class="scale-track" tabindex="0" role="slider"
         aria-valuemin="${valueAt(1)}" aria-valuemax="${valueAt(steps)}"
         aria-label="${escapeHTML(opts.label)}">
      <div class="scale-rail"></div><div class="scale-fill"></div>${ticks}
      <div class="scale-knob"></div>
    </div>
    <div class="scale-anchors">
      <span class="scale-end">${escapeHTML(opts.lowWord || 'low')}</span>
      <span class="scale-live"></span>
      <span class="scale-end">${escapeHTML(opts.highWord || 'high')}</span>
    </div>`;

  const track = wrap.querySelector('.scale-track');
  const knob = wrap.querySelector('.scale-knob');
  const fill = wrap.querySelector('.scale-fill');
  const live = wrap.querySelector('.scale-live');

  // The knob sits on top of one numeral at all times. When it is set, that
  // numeral is the number the knob is already carrying; when it is empty, it
  // is a "5" parked under a dashed ring that exists to say no value has been
  // chosen. Either way the numeral underneath is at best a duplicate and at
  // worst a contradiction, so it steps out of the way. Visibility rather
  // than display, so the tick row cannot shift as the knob passes over it.
  const nums = {};
  wrap.querySelectorAll('.scale-num').forEach(n => { nums[n.dataset.i] = n; });
  const cover = i => {
    Object.keys(nums).forEach(k => nums[k].classList.toggle('under', Number(k) === i));
  };

  const say = i => {
    const word = wordAt(i);
    return format(valueAt(i)) + (word ? ` · ${word}` : '');
  };
  const sayAria = i => {
    const word = wordAt(i);
    return format(valueAt(i)) + (word ? `, ${word}` : '');
  };
  const paintKnob = i => {
    const text = format(valueAt(i));
    knob.textContent = text;
    // "7.75" does not fit a 32px knob at the single-digit size, so the knob
    // grows and the track insets further to keep it inside the line
    const wide = text.length > 2;
    knob.classList.toggle('wide', wide);
    track.classList.toggle('wide-knob', wide);
  };

  // settle=true springs the knob home; during a drag it must not animate,
  // or it lags the finger by the length of the transition
  const refresh = settle => {
    const set = opts.isSet();
    const i = set ? positionOf(opts.read()) : Math.ceil(steps / 2);
    knob.classList.toggle('settle', Boolean(settle));
    knob.classList.toggle('empty', !set);
    knob.style.left = pct(i) + '%';
    if (set) {
      paintKnob(i);
    } else {
      knob.textContent = '';
      // keep the wide geometry on an unrated scale whose values would be
      // wide, so the track does not shift the first time one is set
      const wide = format(valueAt(1)).length > 2;
      knob.classList.toggle('wide', wide);
      track.classList.toggle('wide-knob', wide);
    }
    cover(i);
    fill.style.width = set ? pct(i) + '%' : '0';
    live.textContent = set ? say(i) : 'not rated yet';
    live.classList.toggle('none', !set);
    if (set) {
      track.setAttribute('aria-valuenow', String(valueAt(i)));
      track.setAttribute('aria-valuetext', sayAria(i));
    } else {
      track.removeAttribute('aria-valuenow');
      track.setAttribute('aria-valuetext', 'not rated yet');
    }
  };

  let dragging = false;
  let lastI = null;

  const at = e => {
    const r = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };

  const move = e => {
    const ratio = at(e);
    knob.classList.remove('settle', 'empty');
    knob.style.left = ratio * 100 + '%';   // free under the finger
    fill.style.width = ratio * 100 + '%';
    const i = Math.round(ratio * (steps - 1)) + 1;
    if (i !== lastI) {
      lastI = i;
      haptic();
      opts.write(valueAt(i));
      paintKnob(i);
      cover(i);
      live.textContent = say(i);
      live.classList.remove('none');
      track.setAttribute('aria-valuenow', String(valueAt(i)));
      track.setAttribute('aria-valuetext', sayAria(i));
    }
  };

  track.addEventListener('pointerdown', e => {
    dragging = true;
    lastI = null;
    track.setPointerCapture(e.pointerId);
    move(e);
    e.preventDefault();
  });
  track.addEventListener('pointermove', e => { if (dragging) move(e); });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    refresh(true);                          // snap onto the detent
    if (opts.onCommit) opts.onCommit();
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);

  track.addEventListener('keydown', e => {
    const cur = opts.isSet() ? positionOf(opts.read()) : Math.ceil(steps / 2);
    // one detent per arrow press however many there are, and a page jump
    // that is a tenth of the line rather than a fixed four
    const page = Math.max(2, Math.round(steps / 10));
    let i = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') i = Math.min(steps, cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') i = Math.max(1, cur - 1);
    else if (e.key === 'PageUp') i = Math.min(steps, cur + page);
    else if (e.key === 'PageDown') i = Math.max(1, cur - page);
    else if (e.key === 'Home') i = 1;
    else if (e.key === 'End') i = steps;
    if (i === null) return;
    e.preventDefault();
    opts.write(valueAt(i));
    haptic();
    refresh(true);
    if (opts.onCommit) opts.onCommit();
  });

  return { el: wrap, refresh: refresh, track: track };
}

function buildCvaCard(coffee, section) {
  const card = el('div', 'attr-card');
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
      </div>
    </div>
  `;

  const valueEl = card.querySelector('.attr-value');
  addHelp(card.querySelector('.attr-title'), `cva.${section.key}`);

  const commit = () => {
    refresh(false);
    refreshTabs();
    updateScorebar();
    save();
  };

  const scale = buildAnchoredScale({
    label: `${section.label} — impression of quality`,
    ...CVA_SCALE,
    read: () => coffee.cva[section.key],
    isSet: () => Boolean(coffee.touched[section.key]),
    write: v => { coffee.cva[section.key] = v; coffee.touched[section.key] = true; },
    onCommit: commit,
  });
  card.appendChild(scale.el);

  const refresh = popIt => {
    const v = coffee.cva[section.key];
    const rated = Boolean(coffee.touched[section.key]);
    card.classList.toggle('unrated', !rated);
    card.classList.toggle('rated', rated);
    valueEl.textContent = rated ? v : '–';
    scale.refresh(true);
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
      <div class="attr-head-left">
        <div class="attr-title">${attr.label}</div>
        <div class="attr-sub">${attr.sub}</div>
      </div>
      <div class="attr-head-right">
        <div class="attr-value-row">
          <div class="attr-value">${fmt(coffee.scores[attr.key])}</div>
          <button class="cva-clear" type="button" aria-label="Clear the ${attr.label} rating">×</button>
        </div>
      </div>
    </div>
  `;

  const valueEl = card.querySelector('.attr-value');
  addHelp(card.querySelector('.attr-title'), 'legacy.scale');

  const commit = () => {
    refresh(false);
    refreshTabs();
    updateScorebar();
    save();
  };

  const scale = buildAnchoredScale({
    label: `${attr.label} — quality, 6.00 to 10.00`,
    ...LEGACY_SCALE,
    read: () => coffee.scores[attr.key],
    isSet: () => Boolean(coffee.touched[attr.key]),
    write: v => { coffee.scores[attr.key] = v; coffee.touched[attr.key] = true; },
    onCommit: commit,
  });
  card.appendChild(scale.el);

  const refresh = popIt => {
    const rated = Boolean(coffee.touched[attr.key]);
    card.classList.toggle('unrated', !rated);
    card.classList.toggle('rated', rated);
    valueEl.textContent = rated ? fmt(coffee.scores[attr.key]) : '–';
    scale.refresh(true);
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
    }
  };

  card.querySelector('.cva-clear').addEventListener('click', () => {
    if (!coffee.touched[attr.key]) return;
    delete coffee.touched[attr.key];
    coffee.scores[attr.key] = 7.5;
    haptic();
    refresh(false);
    refreshTabs();
    updateScorebar();
    save();
  });

  refresh(false);
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
    [...row.children].forEach((btn, i) => {
      btn.classList.toggle('checked', cups[i]);
      btn.setAttribute('aria-pressed', cups[i] ? 'true' : 'false');
      // its accessible name was the bare digit, so a reader announced
      // "button, 1" whether the cup passed or failed — and on the 2004 form
      // these fifteen controls carry 30 of the 100 points
      btn.setAttribute('aria-label', `Cup ${i + 1} — ${cups[i] ? 'passes' : 'fails'} ${attr.label}`);
    });
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
  addHelp(card.querySelector('.attr-title'), 'legacyDefects');
  return card;
}

/* ---------- score bar ---------- */

function updateScorebar() {
  if (!state) return;
  const c = state.coffees[state.activeIndex];
  if (!c) return;
  const score = coffeeScore(c);
  const progress = scoreProgress(c);
  // an unfinished sheet reports how far along it is rather than a number
  // that looks authoritative but is mostly untouched defaults. The header
  // has room for a short grade only; the qualified one ("Very Good ·
  // Specialty") is what Results and the printed sheet carry.
  $('#scorebar-grade').textContent = progress.complete
    ? shortGrade(score)
    : `${progress.done} of ${progress.total} rated`;
  $('#scorebar').classList.toggle('provisional', !progress.complete);
  /* The number waits for the sheet.

     The em dash used to appear only at 0 of 8, on the grounds that a score
     built from nothing is not a score. One rated section does not change
     that: the CVA formula floors at 52.75 and each section is worth 0.66,
     so rating Fragrance a 6 and nothing else prints 79.75 — a hair under
     specialty, from one sniff. It does not climb toward anything either;
     it starts near the top of the scale and drifts by a point or so per
     section. A cupper watching it read a machine at work on numbers they
     had not given, and a second read it as a verdict on a sheet they knew
     was a quarter finished. The 2004 form does the same from 82.50.

     There is a second reason, older than this app: a running total anchors
     the sections still to come, which is the bias calibration exists to
     remove. You score what is in the cup and the total is whatever it is.

     So the slot carries how far along the sheet is, and the score arrives
     when the last section does. */
  const shown = progress.complete ? fmt(score) : '—';
  const valueEl = $('#scorebar-value');
  // The bar is a live region, and an em dash announced into one is noise at
  // best — "dash, 3 of 8 rated" is not a sentence. The dash is a mark for
  // the eye; the count already carries the whole meaning, so that is what a
  // screen reader gets.
  valueEl.parentElement.setAttribute('aria-hidden', progress.complete ? 'false' : 'true');
  if (valueEl.textContent !== shown) {
    valueEl.textContent = shown;
    const box = valueEl.parentElement;
    box.classList.remove('pulse');
    void box.offsetWidth;
    box.classList.add('pulse');
  }
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */

/* What a cupping actually produced, against the scale it was scored on.

   This replaced a winner card. Removing the trophy, the podium and the
   medals was right and did not go far enough: what was left still opened on
   "Highest score on the table", which is a contest frame wearing a neutral
   label. A cupping grades samples against a standard, so the first thing the
   table sees is where this lineup fell on that standard — every coffee
   placed on the same line, the specialty threshold marked on it, and the
   range stated. Which one came top is a fact about the ranking below, not
   the headline. */
function buildSummary(ranked) {
  const scored = ranked.filter(r => r.prog.done > 0);
  const wrap = $('#summary');

  if (!scored.length) {
    wrap.innerHTML = `
      <div class="summary-head">Nothing scored yet</div>
      <p class="summary-note">No section of any coffee has been rated, so there is nothing to place on the scale.</p>`;
    return;
  }

  // The scale each form actually produces, not 0–100: CVA floors at 58 and
  // the 2004 form at 60 with every cup passing, so a bar drawn from zero
  // spends most of its length on scores that cannot happen.
  const FLOOR = usingCVA() ? 58 : 60;
  const SPECIALTY = 80;
  const pct = v => Math.max(0, Math.min(100, ((v - FLOOR) / (100 - FLOOR)) * 100));

  // Range, median and "at or above 80" describe finished sheets. They used
  // to be computed over every sheet with a single section rated, so a coffee
  // whose remaining seven sections were sitting at their default 5 widened
  // the range and moved the median. A statistic is a claim about a set; this
  // one has to say which set, and the set has to be the reliable one.
  //
  // When nothing is finished there is no reliable set, so rather than print
  // nothing the figures fall back to every scored sheet and the note below
  // says plainly that they rest on part-scored ones.
  const firm = scored.filter(r => r.prog.complete);
  const basis = firm.length ? firm : scored;
  const onlyPartial = !firm.length;

  const values = basis.map(r => r.score).sort((a, b) => a - b);
  const low = values[0];
  const high = values[values.length - 1];
  const mid = values.length % 2
    ? values[(values.length - 1) / 2]
    : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  const above = values.filter(v => v >= SPECIALTY).length;

  const form = usingCVA() ? 'CVA · SCA 104-2024' : 'SCA cupping form (2004)';
  const cups = state.cupsPerCoffee;
  const complete = ranked.filter(r => r.prog.complete).length;

  wrap.innerHTML = `
    <div class="summary-head">This cupping</div>
    <p class="summary-meta">${ranked.length} coffee${ranked.length > 1 ? 's' : ''} · ${cups} cup${cups > 1 ? 's' : ''} each · ${escapeHTML(form)}</p>

    <div class="summary-scale">
      <div class="summary-rail"></div>
      <div class="summary-span" style="left:${pct(low)}%;right:${100 - pct(high)}%"></div>
      <div class="summary-threshold" style="left:${pct(SPECIALTY)}%"></div>
      ${scored.map(r => `<i class="summary-mark${r.prog.complete ? '' : ' partial'}" style="left:${pct(r.score)}%" title="${escapeHTML(coffeeName(r.coffee, r.index))} ${fmt(r.score)}${r.prog.complete ? '' : ` · ${r.prog.done} of ${r.prog.total} rated`}"></i>`).join('')}
      <span class="summary-tick summary-tick-start">${FLOOR}</span>
      <span class="summary-tick summary-tick-spec" style="left:${pct(SPECIALTY)}%">${SPECIALTY}</span>
      <span class="summary-tick summary-tick-end">100</span>
    </div>

    <dl class="summary-facts">
      <div><dt>Range</dt><dd>${values.length > 1 ? `${fmt(low)} – ${fmt(high)}` : fmt(low)}</dd></div>
      <div><dt>Median</dt><dd>${fmt(mid)}</dd></div>
      <div><dt>At or above 80</dt><dd>${above} of ${values.length}</dd></div>
    </dl>
    ${complete < ranked.length
      ? `<p class="summary-note">${onlyPartial
          ? `No sheet is complete, so the figures above rest on part-scored sheets and will move as you finish them.`
          : `${complete} of ${ranked.length} sheet${ranked.length > 1 ? 's' : ''} ${complete === 1 ? 'is' : 'are'} complete, and the figures above describe ${complete === 1 ? 'that one' : 'those'}. A part-scored sheet is marked hollow on the line, ranks below the finished ones, and carries its count wherever its number appears.`}</p>`
      : ''}
  `;
}

function buildResults() {
  const ranked = rankedCoffees();

  buildSummary(ranked);

  // A coffee nobody rated has no sensory profile — it has eight defaults.
  // Every other surface excludes it; this one was drawing it as a regular
  // octagon at the mid ring and naming it in the legend.
  buildRadar(ranked.filter(r => r.prog.done > 0));

  // ranking cards
  const ranking = $('#ranking');
  ranking.innerHTML = '';
  ranked.forEach((r, pos) => {
    const card = el('div', 'rank-card');
    const meta = metaSummary(r.coffee.meta);
    const descriptors = usingCVA() && r.coffee.desc
      ? [...new Set([...r.coffee.desc.cata.aroma, ...r.coffee.desc.cata.flavor])]
      : null;
    card.innerHTML = `
      <div class="rank-top">
        <div class="rank-position">${pos + 1}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHTML(coffeeName(r.coffee, r.index))}</div>
          <div class="rank-grade">${r.prog.done === 0
            ? 'not rated'
            : r.prog.complete
              ? gradeFor(r.score)
              : `${gradeFor(r.score)} · ${r.prog.done} of ${r.prog.total} rated`}</div>
        </div>
        <div class="rank-score${r.prog.complete ? '' : ' partial'}">${r.prog.done === 0 ? '—' : fmt(r.score)}</div>
      </div>
      <div class="rank-bar"><div class="rank-bar-fill"></div></div>
      ${meta ? `<div class="rank-meta">${escapeHTML(meta)}</div>` : ''}
      ${descriptors ? `<div class="rank-tags">${descriptors.map(d => `<span class="rank-tag">${escapeHTML(d)}</span>`).join('')}</div>` : ''}
      ${r.coffee.notes.trim() ? `<div class="rank-notes">${escapeHTML(r.coffee.notes.trim())}</div>` : ''}
    `;
    ranking.appendChild(card);
    requestAnimationFrame(() => {
      // CVA floors at 58, so a raw percentage wastes the left 58% of every
      // bar and compresses the differences that matter into the right third
      const floor = usingCVA() ? 58 : 0;
      const pct = r.prog.done === 0 ? 0
        : Math.max(0, Math.min(100, ((r.score - floor) / (100 - floor)) * 100));
      card.querySelector('.rank-bar-fill').style.transform = `scaleX(${pct / 100})`;
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

  /* The ceremony was reachable only by a leader with a live networked code,
     and its own intro copy reads "No live table — this walks your own scores
     coffee by coffee." That sentence was written for someone who could never
     get to it. PRODUCT.md calls the offline table the default case, so the
     person most likely to want a coffee-by-coffee walk-through — a solo
     cupper, or a leader whose code never came back because there is no
     signal — was the one person locked out of it.

     A guest at someone else's live table is still not offered it: revealing
     is the leader's single irreversible act for the whole table, and
     ensureRevealed() refuses anyone else. So the button appears for the
     leader, or when there is no live table at all and there is something to
     walk through. */
  const scored = state.coffees.filter(c => scoreProgress(c).done > 0).length;
  const canPresent = leader || (!tableCode() && scored > 0);

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
    ${canPresent ? `<button class="btn btn-primary present-cta" id="btn-present">${leader
        ? 'Present to the table'
        : 'Walk the coffees one by one'}</button>` : ''}
    <div class="team-actions${live ? ' hidden' : ''}">
      <button class="btn btn-ghost" id="btn-share-scores">Share my scores</button>
      <button class="btn btn-ghost" id="btn-add-scores">Add cupper’s scores</button>
    </div>
    <div class="team-cuppers-row" id="team-cuppers"></div>
    <div class="team-results" id="team-results"></div>
  `;

  if (canPresent) card.querySelector('#btn-present').addEventListener('click', openPresent);
  // the card is fresh, so the live table has nothing rendered yet — the
  // Results poller fills it in on its first tick, immediately
  liveSig = null;

  const nameInput = card.querySelector('#cupper-name');
  nameInput.value = getCupperName();
  nameInput.addEventListener('input', () => setCupperName(nameInput.value.trim()));

  card.querySelector('#btn-share-scores').addEventListener('click', async () => {
    const code = await buildScoreCode();
    shareText(
      `My cupping scores — in SCA Cupping open Results → “Add cupper’s scores” and paste:\n\n${code}`,
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

// what the table looked like the last time it was drawn
let liveSig = null;

// The Results screen's poller. Redrawing the block on every tick would
// throw away the reveal animation and fight the buttons under a finger,
// so it only rebuilds when something actually moved.
// Now that a blind cupping really is blind, the names only exist on the
// leader's device until they open the table. This folds the revealed lineup
// into a guest's sheet without touching anything they scored.
let identitiesAdopted = false;

async function adoptRevealedLineup(code) {
  const payload = await relayFetchSession(code);
  if (!payload || !Array.isArray(payload.k)) return false;
  let changed = false;
  payload.k.slice(0, state.coffees.length).forEach((k, i) => {
    const name = String((k && k.n) || '').slice(0, 40);
    if (name && name !== state.coffees[i].name) {
      state.coffees[i].name = name;
      changed = true;
    }
    if (k && k.m) {
      const meta = emptyMeta();
      META_FIELDS.forEach(f => {
        const v = k.m[f.key];
        if (typeof v === 'string' || typeof v === 'number') meta[f.key] = String(v).slice(0, 60);
      });
      state.coffees[i].meta = meta;
      changed = true;
    }
  });
  if (changed) save();
  return changed;
}

async function pollResults() {
  const code = tableCode();
  if (!code) return null;
  const data = await relayListParticipants(code);

  // the leader has opened the table: the coffees have names now
  if (data && data.revealed && !identitiesAdopted && !isTableLeader()) {
    identitiesAdopted = true;
    if (await adoptRevealedLineup(code)) {
      buildResults();     // summary, ranking and radar all carry the names
      buildCuppingUI();   // and so does the sheet they came from
      liveSig = null;
    }
  }

  const sig = rosterSig(data);
  if (sig !== liveSig) {
    liveSig = sig;
    refreshLiveTable(data);
  }
  return sig;
}

function refreshLiveTable(data) {
  const code = tableCode();
  const wrap = $('#live-table');
  if (!code || !wrap) return;
  wrap.classList.remove('hidden');

  // No roster came back. That is either a seat this device never got — the
  // join POST dropped — or the table being out of reach. Hiding the block
  // here stranded the cupper completely: no roster meant no submit button,
  // and the submit is what claims a missing seat. So the block stays, says
  // which of the two it is, and keeps the button.
  if (!data) {
    wrap.innerHTML = `
      <div class="live-head"><span class="detail-label">Live table · code ${escapeHTML(code)}</span></div>
      <p class="live-note">${state.participantId
        ? 'Can’t reach the table right now. Your scores are saved on this device — submitting will retry.'
        : 'Your seat at this table was never confirmed. Submitting will claim one.'}</p>
      <button class="btn btn-primary" id="btn-submit-scores">Submit my scores</button>`;
    wireSubmitButton(wrap);
    return;
  }

  state.revealed = data.revealed;
  save();

  const myName = getCupperName() || (state.liveCode ? 'Host' : state.joinedCode ? 'Cupper' : 'You');
  const submittedMine = Boolean(state.submittedAt);

  let html = `<div class="live-head"><span class="detail-label">Live table · code ${escapeHTML(code)}</span></div>`;

  // Someone who joined late, or who never got as far as Results before the
  // leader opened the table, still has to be able to put their scores in —
  // otherwise their sheet silently never counts. The table is open by then,
  // so say what that means rather than pretending it is the same act.
  const lateSubmit = () => {
    return (submittedMine
      ? `<p class="live-note">Your scores are in the panel above.</p>`
      : `<p class="live-note">Your scores are <strong>not in this panel</strong>. The table is already open, so submit only what you scored on your own.</p>`)
      + `<button class="btn btn-ghost" id="btn-submit-scores">${submittedMine ? 'Update my scores' : 'Submit my scores'}</button>`;
  };

  if (!data.revealed) {
    const done = data.participants.filter(p => p.submitted).length;
    html += `<p class="live-note">Scores stay sealed until the leader opens the table — the protocol asks every cupper to score independently first. <strong>${done} of ${data.participants.length}</strong> submitted.</p>`;
    // who is still out, so the leader knows what they are waiting on
    if (data.participants.length) {
      html += `<div class="live-roster">${data.participants
        .map(p => `<span class="joined-chip${p.submitted ? ' done' : ''}">${escapeHTML(p.name)}</span>`)
        .join('')}</div>`;
    }
    // Anyone at a live table can submit: a seat that never arrived is claimed
    // at submit time rather than hiding the button and stranding their scores.
    html += submittedMine
      ? `<p class="live-ok">✓ Your scores are in. You can keep editing and submit again.</p>`
      : '';
    html += `<button class="btn btn-primary" id="btn-submit-scores">${submittedMine ? 'Update my scores' : 'Submit my scores'}</button>`;
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

    // Each coffee is averaged over the cuppers who actually rated it, so a
    // sheet nobody touched cannot lend the table a number made of defaults.
    const perCoffee = state.coffees.map((c, i) => {
      const entries = panelEntries(all, i);
      const avg = entries.reduce((a, e) => a + e.score, 0) / (entries.length || 1);
      return { name: coffeeName(c, i), avg, index: i, entries };
    }).sort((a, b) => b.avg - a.avg);

    const counted = new Set();
    perCoffee.forEach(r => r.entries.forEach(e => counted.add(e.name)));
    const dropped = all.filter(p => !counted.has(p.name));

    if (!counted.size) {
      wrap.innerHTML = html + `<p class="live-note">No scores submitted yet.</p>` + lateSubmit();
    } else {
      html += `<p class="live-note">Panel score is the average of ${counted.size} independent cupper${counted.size > 1 ? 's' : ''}.</p>`;
      if (dropped.length) {
        html += `<p class="live-note">${dropped.map(p => escapeHTML(p.name)).join(', ')} ${dropped.length > 1 ? 'have' : 'has'} not rated any section yet, so ${dropped.length > 1 ? 'their sheets are' : 'their sheet is'} not in the average.</p>`;
      }
      html += perCoffee.map(row => `
        <div class="team-coffee-row">
          <div class="team-coffee-top">
            <span class="team-coffee-name">${escapeHTML(row.name)}</span>
            <span class="team-coffee-avg">${row.entries.length ? fmt(row.avg) : '—'}<small>PANEL</small></span>
          </div>
          <div class="team-coffee-cuppers">${row.entries.map(e => {
            const d = e.score - row.avg;
            const sign = d >= 0 ? '+' : '−';
            const note = ratedNote(e);
            return `<span class="cupper-score${e.me ? ' me' : ''}${e.partial ? ' partial' : ''}">${escapeHTML(e.name)} ${fmt(e.score)}${note ? ` <i>${note}</i>` : ''} <em>${sign}${fmt(Math.abs(d))}</em></span>`;
          }).join('') || '<span class="cupper-score">nobody has rated this one</span>'}</div>
        </div>`).join('');

      /* Calibration: who consistently runs high or low against the table.

         It is a statement about a palate, so it can only be built out of
         sheets that are finished. A part-scored one carries its untouched
         sections at their default 5, which drags its total toward the
         middle of the scale wherever the cupper's real judgement sat — and
         this list then reported that drag as a habit. At a live table a
         cupper who had rated three sections of one coffee was told he runs
         2.31 below the panel, under a caption explaining that direction is
         a habit. It was not his palate. It was five sections he had not
         got to yet, described as character.

         So a cupper is measured on the coffees whose sheets they finished,
         against the panel score as the table reads it out. Finish none and
         there is nothing to measure; the row says that rather than
         inventing a number, and the count rides along wherever somebody is
         being judged on less than the whole lineup. */
      const calibAll = [...counted].map(name => {
        const diffs = perCoffee
          .map(r => {
            const e = r.entries.find(x => x.name === name);
            return e && !e.partial ? e.score - r.avg : null;
          })
          .filter(v => typeof v === 'number' && !isNaN(v));
        const mean = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
        return { name, mean, n: diffs.length, me: name === myName };
      });
      const calib = calibAll.filter(c => c.mean !== null).sort((a, b) => b.mean - a.mean);
      const unmeasured = calibAll.filter(c => c.mean === null).map(c => c.name);

      // Only magnitude means anything in a calibration exercise: running
      // high is not better than running low, and the old list said
      // otherwise by painting one accent and greying the other. The bar is
      // symmetric about zero, both directions carry the same weight, and
      // the band behind it shows the range a calibrated panel usually sits
      // in, so a number can be read against something other than the room.
      const NORMAL = 1.5;
      const span = Math.max(3, Math.ceil(Math.max(...calib.map(c => Math.abs(c.mean)), 0)));
      const bandLeft = 50 - (NORMAL / span) * 50;
      const bandWidth = (NORMAL / span) * 100;

      html += calib.length ? `<div class="calib"><span class="detail-label">Calibration · average difference from the panel</span>
        ${calib.map(c => {
          const frac = Math.max(-1, Math.min(1, c.mean / span));
          const w = Math.abs(frac) * 50;
          const left = c.mean >= 0 ? 50 : 50 - w;
          const over = c.n < perCoffee.length ? ` <i>${c.n} of ${perCoffee.length}</i>` : '';
          return `<div class="calib-row${c.me ? ' me' : ''}">
            <span class="calib-name">${escapeHTML(c.name)}${over}</span>
            <span class="calib-bar">
              <b class="calib-band" style="left:${bandLeft}%;width:${bandWidth}%"></b>
              <i style="left:${left}%;width:${w}%"></i>
            </span>
            <span class="calib-val">${c.mean >= 0 ? '+' : '−'}${fmt(Math.abs(c.mean))}</span>
          </div>`;
        }).join('')}
        <p class="calib-note">Cuppers on a calibrated panel usually sit within ±${NORMAL} of the panel score. Direction is a habit, not a verdict. Only finished sheets are measured — a part-scored one would describe the sheet rather than the palate.${
          unmeasured.length ? ` ${unmeasured.map(escapeHTML).join(', ')} ${unmeasured.length > 1 ? 'have' : 'has'} not finished a sheet in this lineup yet.` : ''}</p>
      </div>` : `<p class="live-note">Nobody has finished a whole sheet yet, so there is nothing to calibrate against. Calibration is measured over finished sheets only.</p>`;
      wrap.innerHTML = html + lateSubmit();
    }
  }

  wireSubmitButton(wrap, myName);
}

// The success path used to leave the button reading "Submitting…" and wait
// for the poller to redraw it — but resubmitting unchanged scores leaves the
// roster signature identical, so no redraw ever came and the button stayed
// dead. It restores itself now, and the redraw is a bonus rather than the
// only way out.
function wireSubmitButton(wrap, name) {
  const btn = wrap.querySelector('#btn-submit-scores');
  if (!btn) return;
  btn.onclick = async () => {
    const myName = name || getCupperName() || (state.liveCode ? 'Host' : state.joinedCode ? 'Cupper' : 'You');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    const res = await relaySubmitScores(tableCode(), state.participantId, myName, myScores(), myRated());
    btn.disabled = false;
    if (!res.ok) {
      btn.textContent = 'Try again';
      toast(res.reason);
      return;
    }
    state.submittedAt = Date.now();
    save();
    btn.textContent = 'Update my scores';
    toast('Scores submitted');
    liveSig = null;           // the block is stale even if the roster is not
    if (poller) poller.wake();
  };
}

/* ============================================================
   PRESENT SCREEN
   The leader's half of the ceremony. Samples are cupped blind and
   coded, and identities and scores are revealed afterwards — so
   this walks the lineup in order, opening each coffee's identity
   first and the table's scores second.
   ============================================================ */

let presentData = null;   // last roster read from the relay
/* 0 sealed · 1 identity shown · 2 scores shown.
   Persisted, because this is the one screen in the app being read aloud to
   a room. It used to be module-level only: refresh mid-ceremony — or let
   iOS reclaim the tab — and every card went back to sealed in front of the
   table while state.revealed stayed true. */
let presentStage = [];

// Keyed on the session id, so a ceremony is not restored onto a different
// lineup, and dropped whenever the session is.
function presentStageKey() {
  return state && state.id ? `lento-present-${state.id}` : null;
}

function savePresentStage() {
  const key = presentStageKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(presentStage)); } catch (e) { /* private mode */ }
}

function loadPresentStage() {
  const key = presentStageKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) && arr.length === state.coffees.length ? arr : null;
  } catch (e) { return null; }
}

function clearPresentStage() {
  const key = presentStageKey();
  if (!key) return;
  try { localStorage.removeItem(key); } catch (e) { /* private mode */ }
}

function isTableLeader() {
  return Boolean(state && state.liveCode && state.liveToken);
}

async function openPresent() {
  presentData = null;
  presentSig = null;
  presentStage = loadPresentStage() || state.coffees.map(() => 0);
  savePresentStage();
  // the sealed cards go up at once; showScreen starts the poller, which
  // fetches the roster in the background
  showScreen('#screen-present');
  buildPresent();

  const code = tableCode();
  if (!code) return;

  /* The leader is a cupper too — when they have actually cupped.

     This used to submit unconditionally, on the assumption that anyone
     reaching the ceremony had finished their own sheet. Leading is a job:
     the person running the table is pouring, timing, and reading the room,
     and often scores least of anyone. Their untouched sheet is eight
     defaults per coffee, and eight defaults is 79.00 — so opening the
     ceremony seated a silent extra cupper who called every coffee 79.00
     and dragged four real ones down with it. Observed at a live table: the
     leader had rated nothing, and every card in the ceremony carried their
     phantom score.

     A sheet with nothing on it is not a score, so it is not sent. One with
     something on it is, and now says how much of it is real. */
  const rated = state.coffees.length - sessionProgress().untouched;
  if (!rated) { if (poller) poller.wake(); return; }

  const res = await relaySubmitScores(code, state.participantId, getCupperName() || 'Host', myScores(), myRated());
  if (res.ok) { state.submittedAt = Date.now(); save(); }
  else toast(res.reason);
  if (poller) poller.wake();
}

// Late submissions land on the screen the leader is presenting from, so a
// coffee opened before someone finished still lands on the right average.
let presentSig = null;

async function pollPresent() {
  const code = tableCode();
  if (!code) return null;
  const data = await relayListParticipants(code);
  const sig = rosterSig(data);
  if (sig !== presentSig) {
    presentSig = sig;
    if (data) {
      presentData = data;
      state.revealed = data.revealed;
      save();
      buildPresent();
    }
  }
  return sig;
}

// Panel averages per coffee, or null while the scores are still sealed.
function presentPanel() {
  if (!presentData || !presentData.revealed) return null;
  const all = presentData.participants.filter(p => Array.isArray(p.scores));
  if (!all.length) return null;
  return state.coffees.map((c, i) => {
    const cuppers = panelEntries(all, i);
    const avg = cuppers.reduce((a, v) => a + v.score, 0) / (cuppers.length || 1);
    return { avg, cuppers: cuppers.sort((a, b) => b.score - a.score) };
  });
}

// Opening the scores is one irreversible act for the whole table, so it is
// asked for once and then applies to every coffee.
async function ensureRevealed() {
  if (state.revealed) return true;
  if (!isTableLeader()) { toast('Only the cupping leader can reveal the table'); return false; }
  if (!(await askToReveal())) return false;

  const ok = await relayReveal(state.liveCode, state.liveToken);
  if (!ok) { toast('Could not reveal — check your connection'); return false; }
  state.revealed = true;
  // identities are on the table now, so guests' devices get them too
  state.shareDetails = true;
  save();
  relayUpdateSession(state.liveCode, state.liveToken, buildSessionPayload());
  presentData = await relayListParticipants(state.liveCode);
  presentSig = rosterSig(presentData);
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

    const meta = metaSummary(coffee.meta);
    const row = panel ? panel[i] : null;
    const mine = coffeeScore(coffee);
    const shown = row ? row.avg : mine;

    // This is the one surface where a number is read out loud, and it was the
    // one surface that showed a part-scored number as a finished one: a sheet
    // rated 3 of 8 printed 88.75 in full ink with no qualifier, beside two
    // complete sheets drawn identically. Results, History, print and the CSV
    // all carry the treatment DESIGN.md calls "one treatment, everywhere",
    // and the Results screen immediately before this one promises in writing
    // that "a part-scored sheet is marked wherever its number appears".
    // The live path already had it via row.cuppers; the solo path — the one a
    // leader without signal is actually on — never got it.
    const own = scoreProgress(coffee);
    const partial = row ? row.cuppers.some(c => c.partial) : !own.complete;
    // "nothing rated · 0 of 8 rated" says it twice; the count only adds
    // something when some of the sheet is real.
    const qualifier = row
      ? (partial ? ' · some part-scored' : '')
      : (own.complete || own.done === 0 ? '' : ` · ${own.done} of ${own.total} rated`);

    card.innerHTML = `
      <div class="present-top">
        <span class="present-num">${i + 1}</span>
        <div class="present-id">
          <div class="present-name">${stage ? escapeHTML(coffeeName(coffee, i)) : `Coffee ${i + 1}`}</div>
          ${stage && meta ? `<div class="present-meta">${escapeHTML(meta)}</div>` : ''}
          ${stage && !meta ? '<div class="present-meta">no details recorded</div>' : ''}
        </div>
        ${stage === 2 ? `<div class="present-score">
          <span class="present-avg${partial ? ' partial' : ''}">${own.done === 0 && !row ? '—' : fmt(shown)}</span>
          <span class="present-grade">${row
            ? `average of ${row.cuppers.length} cupper${row.cuppers.length > 1 ? 's' : ''}`
            : (own.done === 0 ? 'nothing rated' : 'your score')}${qualifier}</span>
        </div>` : ''}
      </div>
      ${stage === 2 && row ? `<div class="present-cuppers">${row.cuppers.map(c => {
        const d = c.score - row.avg;
        const note = ratedNote(c);
        return `<span class="present-cupper${c.partial ? ' partial' : ''}">${escapeHTML(c.name)} <strong>${fmt(c.score)}</strong>${note ? ` <i>${note}</i>` : ''} <em>${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</em></span>`;
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
        savePresentStage();
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

  const own = state.coffees.map(scoreProgress);
  const rows = state.coffees
    .map((c, i) => ({
      name: coffeeName(c, i),
      score: panel ? panel[i].avg : coffeeScore(c),
      // no cupper rated a section of this one, so there is no score to show
      empty: panel ? !panel[i].cuppers.length : own[i].done === 0,
      partial: panel
        ? panel[i].cuppers.some(e => e.partial)
        : own[i].done > 0 && !own[i].complete,
      // The grey ink said "not reliable" and then declined to say how much of
      // the sheet was real. Every other ranking in the product carries the
      // count; this one dropped it.
      note: panel ? '' : (own[i].done > 0 && !own[i].complete ? `${own[i].done} of ${own[i].total}` : ''),
    }))
    // and it is ranked the same way Results is: complete first, part-scored
    // below them, nothing rated last. Position carries it, not just colour.
    .sort((a, b) => (a.empty - b.empty) || (a.partial - b.partial) || (b.score - a.score));
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
        <span class="present-final-score${r.partial ? ' partial' : ''}">${r.empty ? 'not rated' : fmt(r.score)}${r.note ? ` <i>${r.note}</i>` : ''}</span>
      </div>`).join('')}
  `;
}

async function revealAllPresent() {
  if (tableCode() && !state.revealed && !(await ensureRevealed())) return;
  presentStage = state.coffees.map(() => 2);
  savePresentStage();
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

  // My own sheet is a participant like any other here, and it is held to
  // the same rule: rate nothing and it does not get to move the average.
  const mine = { name: myName, scores: myScores(), rated: myRated(), me: true };
  const rows = state.coffees.map((c, i) => {
    const values = panelEntries([mine, ...state.team], i);
    const avg = values.reduce((a, v) => a + v.score, 0) / (values.length || 1);
    return { name: coffeeName(c, i), avg, values };
  }).sort((a, b) => (a.values.length ? 0 : 1) - (b.values.length ? 0 : 1) || b.avg - a.avg);

  rows.forEach(r => {
    const row = el('div', 'team-coffee-row');
    row.innerHTML = `
      <div class="team-coffee-top">
        <span class="team-coffee-name">${escapeHTML(r.name)}</span>
        <span class="team-coffee-avg">${r.values.length ? fmt(r.avg) : '—'}<small>AVG</small></span>
      </div>
      <div class="team-coffee-cuppers">${r.values.length
        ? r.values.map(v => {
            const note = ratedNote(v);
            return `<span class="cupper-score${v.me ? ' me' : ''}${v.partial ? ' partial' : ''}">${escapeHTML(v.name)} ${fmt(v.score)}${note ? ` <i>${note}</i>` : ''}</span>`;
          }).join('')
        : '<span class="cupper-score">nobody has rated this one</span>'}</div>
    `;
    results.appendChild(row);
  });
}

/* ---------- radar chart (SVG) ---------- */

/* Axes for the sensory profile.
   Overall is left off deliberately: it is a holistic judgement of the whole
   cup, not a sensory dimension alongside the others, so it moves with all
   seven at once and pulls the shape toward a circle — it adds a spoke that
   says nothing the rest have not already said. The legacy form's Balance is
   the same kind of summary judgement and goes with it, as do the three
   per-cup checks, which are pass/fail counts rather than intensities and sat
   pinned at 10 on almost every plot. What is left on both forms is what the
   cupper actually judged cup by cup. */
const RADAR_SKIP = ['overall', 'balance', 'uniformity', 'cleanCup', 'sweetness'];

function radarAttrs() {
  const all = usingCVA() ? CVA_SECTIONS : RADAR_ATTRS;
  // sweetness is a real 1–9 section on the CVA form, but a pass/fail cup
  // count on the 2004 one — keep it only where it is scored
  return all.filter(a => !RADAR_SKIP.includes(a.key) || (usingCVA() && a.key === 'sweetness'));
}

// radar floors: enough headroom that differences read, without clipping
/* The full range each form can record. It floored at 3 (CVA) and 5 (2004),
   which cropped the chart to the band most coffees land in — and silently
   flattened the ones that do not: a section rated 1 or 2 plotted at exactly
   the same radius as a 3, so a defective lot drew the same shape as a
   merely weak one. That is the case a sensory profile is most diagnostic
   for, and the only surface in the app that was clipping data rather than
   marking it. */
function radarRange() {
  return usingCVA() ? { min: 1, max: 9 } : { min: 6, max: 10 };
}

/* null where the cupper has not rated the section. Every other surface in
   the product refuses to present an untouched default as data; the radar was
   the hole in that, and the most persuasive surface to have it — a shape
   reads as a measurement, so a coffee rated 3 of 8 drew a complete polygon
   with five vertices sitting on the parking 5. */
function attrValue(coffee, attr) {
  if (usingCVA()) {
    return coffee.touched && coffee.touched[attr.key] ? coffee.cva[attr.key] : null;
  }
  if (attr.key in coffee.scores) {
    return coffee.touched && coffee.touched[attr.key] ? coffee.scores[attr.key] : null;
  }
  // per-cup attributes are always answered: every cup starts passing
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
    const pts = ATTRS.map((attr, i) => {
      const v = Math.max(MIN, attrValue(r.coffee, attr));
      const rr = (R * (v - MIN)) / (MAX - MIN);
      return point(i, rr).map(n => n.toFixed(1)).join(',');
    }).join(' ');
    const dash = RADAR_DASHES[r.index % RADAR_DASHES.length];
    // No area fill by default. Ten translucent fills stack into mud at the
    // centre, and chasing 3:1 against that stack is what forced the old
    // palette to the ends of the luminance range in the first place: the
    // only colours that survive nine fills underneath them are ten
    // near-identical pastels. The fill comes back for one series at a time,
    // when the legend solos it and there is nothing under it but the card.
    svg += `<polygon points="${pts}" class="radar-series" style="--c:${seriesVar(r.index)}"`
      + ` stroke-width="2" stroke-linejoin="round" stroke-dasharray="${dash}" data-coffee="${r.index}"/>`;
  });

  svg += '</svg>';
  $('#radar-wrap').innerHTML = svg;

  // legend with tap-to-highlight
  const legend = $('#radar-legend');
  legend.innerHTML = '';
  ranked.forEach(r => {
    const dash = RADAR_DASHES[r.index % RADAR_DASHES.length];
    const item = el('button', 'legend-item');
    item.setAttribute('aria-pressed', 'false');
    // the swatch is the series' own line, so the legend carries both
    // channels the chart uses rather than only the colour
    item.innerHTML = `<svg class="legend-swatch" viewBox="0 0 24 8" aria-hidden="true">`
      + `<line class="legend-line" x1="1.5" y1="4" x2="22.5" y2="4" style="--c:${seriesVar(r.index)}"`
      + ` stroke-width="2.5" stroke-dasharray="${dash}" stroke-linecap="round"/></svg>`
      + escapeHTML(coffeeName(r.coffee, r.index));
    item.addEventListener('click', () => {
      const muting = !item.classList.contains('solo');
      legend.querySelectorAll('.legend-item').forEach(li => {
        li.classList.remove('solo', 'muted');
        li.setAttribute('aria-pressed', 'false');
      });
      $('#radar-wrap').querySelectorAll('polygon[data-coffee]').forEach(p => {
        p.style.opacity = '';
        p.classList.remove('solo');
      });
      if (muting) {
        item.classList.add('solo');
        item.setAttribute('aria-pressed', 'true');
        legend.querySelectorAll('.legend-item').forEach(li => { if (li !== item) li.classList.add('muted'); });
        $('#radar-wrap').querySelectorAll('polygon[data-coffee]').forEach(p => {
          const mine = p.dataset.coffee === String(r.index);
          p.style.opacity = mine ? '1' : '0.08';
          // only the soloed shape gets a body, and only while it is alone
          p.classList.toggle('solo', mine);
        });
      }
    });
    legend.appendChild(item);
  });
}

/* ---------- share ---------- */

function buildShareText() {
  const ranked = rankedCoffees();

  const lines = [`SCA cupping results — ${usingCVA() ? 'CVA (SCA 2024)' : '2004 form'}`, ''];
  ranked.forEach((r, pos) => {
    lines.push(r.prog.done === 0
      ? `${pos + 1}. ${coffeeName(r.coffee, r.index)} — not rated`
      : `${pos + 1}. ${coffeeName(r.coffee, r.index)} — ${fmt(r.score)} (${gradeFor(r.score)})${r.prog.complete ? '' : ` · ${r.prog.done} of ${r.prog.total} rated`}`);
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

/* "Roast" is a free-text profile: the field's own placeholder suggests
   "Light · 9:30 total · 1:45 dev · drop 203°C", which is unique to one
   coffee. Grouping on the exact string therefore gave every roast a group
   of one, and "average score by roast" averaged a single number every
   time. So the level gets pulled out of whatever was written, the way
   altitude already is. Anything unreadable groups as nothing rather than
   inventing a bucket. */
function roastBucket(raw) {
  const s = String(raw).toLowerCase();
  if (!s.trim()) return null;
  // an Agtron reading is the most precise thing anyone writes here, and
  // on the gourmet scale a higher number is a lighter roast
  // The gourmet scale's levels sit at roughly 75, 65, 55, 45 and 35, so
  // the boundaries belong at the midpoints between them — cutting at the
  // centres instead put 63 in "medium" when it is nearer medium-light.
  const ag = s.match(/agtron\D{0,4}(\d{2,3})/);
  if (ag) {
    const n = parseInt(ag[1], 10);
    if (n >= 70) return 'Light';
    if (n >= 60) return 'Medium-light';
    if (n >= 50) return 'Medium';
    if (n >= 40) return 'Medium-dark';
    return 'Dark';
  }
  // compound levels first, or "medium-dark" matches on "medium"
  if (/medium[\s-]*light|light[\s-]*medium/.test(s)) return 'Medium-light';
  if (/medium[\s-]*dark|dark[\s-]*medium/.test(s)) return 'Medium-dark';
  if (/full[\s-]*city/.test(s)) return 'Medium-dark';
  if (/\bfrench\b|\bitalian\b|\bvienna\b|\bdark\b/.test(s)) return 'Dark';
  if (/\bcity\b|\bmedium\b/.test(s)) return 'Medium';
  if (/\bcinnamon\b|\bblonde\b|\blight\b/.test(s)) return 'Light';
  return null;
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
    if (dimKey === 'roast') value = roastBucket(value) || '';
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
  // An average over part-scored sheets is an average of guesses. Records
  // written before completeness was tracked have no flag, so they are
  // treated as finished rather than silently dropped from the history
  // someone already has.
  const scored = coffees.filter(c => c.complete !== false);
  const partial = coffees.length - scored.length;
  const allScores = scored.map(c => c.score);
  const avg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const sessionCount = historyQuery
    ? new Set(coffees.map(c => c.sessionId)).size
    : archive.length;

  // stat tiles
  $('#stats-row').innerHTML = `
    <div class="stat-tile"><div class="stat-value">${sessionCount}</div><div class="stat-label">Cuppings</div></div>
    <div class="stat-tile"><div class="stat-value">${coffees.length}</div><div class="stat-label">Coffees</div></div>
    <div class="stat-tile"><div class="stat-value">${allScores.length ? fmt(avg) : '–'}</div><div class="stat-label">${
      partial ? `Avg of ${allScores.length} finished` : 'Avg score'
    }</div></div>
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
  markScrollEnds(seg);
  DIMENSIONS.forEach(d => {
    const btn = el('button', 'seg-btn' + (d.key === activeDim ? ' active' : ''), d.label);
    btn.setAttribute('aria-pressed', d.key === activeDim ? 'true' : 'false');
    btn.addEventListener('click', () => {
      activeDim = d.key;
      haptic();
      seg.querySelectorAll('.seg-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
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
          <div class="hist-item-score${c.complete === false ? ' partial' : ''}">${c.rated === 0 ? '—' : fmt(c.score)}</div>
          <div class="hist-item-date">${c.complete === false
            ? `${c.rated} of ${c.sections} rated`
            : date}</div>
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
      row.querySelector('.group-bar-fill').style.transform = `scaleX(${barPct / 100})`;
    });
  });
}

/* ============================================================
   EXPORT — CSV and a printable scoresheet
   ============================================================ */

/* A cupper names a coffee, exports, and opens the file in Excel. A cell
   starting =, +, - or @ is a formula there, not text — so "=HYPERLINK(...)"
   typed into a coffee name would execute on someone else's machine. Prefix
   it with a single quote, which every spreadsheet reads as "this is text"
   and hides, and quote the cell so the prefix cannot be re-interpreted. */
function csvCell(v) {
  const s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) return `"'${s.replace(/"/g, '""')}"`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function historyCSV() {
  const archive = loadArchive().sort((a, b) => b.date - a.date);
  const head = [
    'date', 'form', 'cups per coffee', 'coffee', 'sections rated', 'sections total', 'score', 'grade',
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
        // older archive rows carry no counts; an empty cell is honest about
        // not knowing, where a fabricated "8 of 8" would not be
        typeof c.rated === 'number' ? c.rated : '',
        typeof c.sections === 'number' ? c.sections : '',
        c.complete === false && c.rated === 0 ? '' : fmt(c.score),
        c.complete === false && c.rated === 0 ? '' : gradeFor(c.score),
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
/* The printed scoresheet.

   This is the only artefact that leaves the phone — what a grader hands a
   producer or attaches to a lot, and the one place the app is read by
   somebody who was not at the table. It used to be five columns: rank,
   name, origin, descriptors, total. No section scores, no defects, no cup
   counts, under a header reading "Coffee Value Assessment · SCA 104-2024".
   A ranked list cannot substantiate the number it prints, and this one was
   claiming a standard it did not implement.

   It prints the sheet now: every section as the cupper rated it, the
   deductions, and a dash wherever nothing was rated — so the total can be
   checked against the form it came from.                                 */

// Three-letter column heads. The full section names will not fit ten
// numeric columns across a page, and on a scoresheet the column position is
// what a cupper reads anyway.
function printAbbrev(label) {
  const words = label.split(/[\s/]+/).filter(Boolean);
  if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  return label.replace(/[aeiou]/gi, (m, i) => (i === 0 ? m : '')).slice(0, 3).replace(/^./, c => c.toUpperCase());
}

function printResults() {
  const ranked = rankedCoffees();
  const sections = usingCVA() ? CVA_SECTIONS : SCALE_ATTRS;
  const cupAttrs = usingCVA() ? [] : CUP_ATTRS;
  const cups = state.cupsPerCoffee;

  const sheet = document.createElement('div');
  sheet.id = 'print-sheet';
  const when = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const formName = usingCVA() ? 'Coffee Value Assessment · SCA 104-2024' : 'SCA cupping form (2004)';
  const who = getCupperName();

  // Same rule as the on-screen summary: the range and the count describe
  // finished sheets, because a sheet with one section rated carries seven
  // defaults and would widen both. Falls back to every scored sheet only
  // when nothing is finished, and the caption says which set it used.
  const scoredRows = ranked.filter(r => r.prog.done > 0);
  const firmRows = scoredRows.filter(r => r.prog.complete);
  const basisRows = firmRows.length ? firmRows : scoredRows;
  const scored = basisRows.map(r => r.score).sort((a, b) => a - b);
  const anyPartial = ranked.some(r => !r.prog.complete);

  const sectionValue = (coffee, attr) => {
    if (!coffee.touched || !coffee.touched[attr.key]) return null;
    return usingCVA() ? coffee.cva[attr.key] : coffee.scores[attr.key];
  };

  sheet.innerHTML = `
    <div class="p-head">
      <div>
        <h1>Cupping results</h1>
        <p>${escapeHTML(formName)} · ${escapeHTML(when)} · ${cups} cup${cups > 1 ? 's' : ''} per coffee${who ? ` · ${escapeHTML(who)}` : ''}</p>
      </div>
      <div class="p-mark">lento.cafe</div>
    </div>

    ${scored.length ? `<p class="p-summary">${scoredRows.length} of ${ranked.length} coffee${ranked.length > 1 ? 's' : ''} scored ·
      ${firmRows.length ? `${firmRows.length} complete` : 'none complete'} ·
      range ${fmt(scored[0])}–${fmt(scored[scored.length - 1])} ·
      ${scored.filter(v => v >= 80).length} of ${scored.length} at or above 80
      ${firmRows.length ? '(complete sheets only)' : '(part-scored sheets included — none is complete)'}</p>` : ''}

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Coffee</th>
          ${sections.map(a => `<th class="num" title="${escapeHTML(a.label)}">${escapeHTML(printAbbrev(a.label))}</th>`).join('')}
          ${cupAttrs.map(a => `<th class="num" title="${escapeHTML(a.label)}">${escapeHTML(printAbbrev(a.label))}</th>`).join('')}
          <th class="num">Def</th>
          <th class="num">Score</th>
        </tr>
      </thead>
      <tbody>
        ${ranked.map((r, pos) => {
          const c = r.coffee;
          const d = usingCVA() && c.desc
            ? [...new Set([...c.desc.cata.aroma, ...c.desc.cata.flavor])].join(', ')
            : '';
          const meta = metaSummary(c.meta);
          const deductions = usingCVA()
            ? [c.nonUniform ? `${c.nonUniform}nu` : '', c.defective ? `${c.defective}df` : ''].filter(Boolean).join(' ')
            : [c.taintCups ? `${c.taintCups}t` : '', c.faultCups ? `${c.faultCups}f` : ''].filter(Boolean).join(' ');
          return `<tr>
            <td>${pos + 1}</td>
            <td><strong>${escapeHTML(coffeeName(c, r.index))}</strong>
              ${meta ? `<div class="p-sub">${escapeHTML(meta)}</div>` : ''}
              ${d ? `<div class="p-sub">${escapeHTML(d)}</div>` : ''}
              ${c.notes.trim() ? `<div class="p-sub">${escapeHTML(c.notes.trim())}</div>` : ''}</td>
            ${sections.map(a => {
              const v = sectionValue(c, a);
              // CVA sections are whole numbers 1–9; only the 2004 form's
              // quarter points need the decimals
              const shown = v === null ? '–' : (usingCVA() ? String(v) : fmt(v));
              return `<td class="num${v === null ? ' unrated' : ''}">${shown}</td>`;
            }).join('')}
            ${cupAttrs.map(a => {
              const passed = c.cups[a.key].filter(Boolean).length;
              return `<td class="num">${passed}/${c.cups[a.key].length}</td>`;
            }).join('')}
            <td class="num">${deductions || '–'}</td>
            <td class="num total${r.prog.complete ? '' : ' partial'}">${r.prog.done === 0
              ? '–'
              : `<strong>${fmt(r.score)}</strong>${r.prog.complete ? '' : `<div class="p-sub">${r.prog.done}/${r.prog.total}</div>`}`}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <p class="p-foot">${sections.map(a => `${printAbbrev(a.label)} ${a.label}`).join(' · ')}${
      cupAttrs.length ? ' · ' + cupAttrs.map(a => `${printAbbrev(a.label)} ${a.label}, cups passed`).join(' · ') : ''
    } · Def deductions${usingCVA() ? ' (nu non-uniform, df defective)' : ' (t tainted, f faulty)'}.
    Sections are scored ${usingCVA() ? '1–9' : '6.00–10.00'}.</p>

    ${anyPartial ? `<p class="p-foot">A dash means the section was not rated. A total set in grey comes from a sheet that
      was not finished, and the count beside it says how many of the ${sectionCount()} sections stand behind it.</p>` : ''}

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

/* Three states, not two. The phone can be offline, which navigator.onLine
   knows about; or online with the table's relay unreachable, which it does
   not — and which used to look exactly like a table where nothing was
   happening. A leader waiting for cuppers to submit deserves to know which
   of those they are looking at. */
let relayTrouble = false;

function setRelayTrouble(on) {
  if (relayTrouble === on) return;
  relayTrouble = on;
  syncConnectionBadge();
}

function syncConnectionBadge() {
  const badge = $('#offline-badge');
  if (!badge) return;
  if (!navigator.onLine) {
    badge.textContent = 'Offline — everything still works';
    badge.classList.remove('hidden', 'trouble');
  } else if (relayTrouble) {
    badge.textContent = 'Can’t reach the table — your scores are safe here';
    badge.classList.remove('hidden');
    badge.classList.add('trouble');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('trouble');
  }
}

/* A row that scrolls with its scrollbar suppressed has to say so some other
   way. The fade lifts when there is nothing more to the right — including
   when the row fits, where a permanent fade would be a lie. */
function markScrollEnds(row) {
  if (!row || row.dataset.endWatched) return;
  row.dataset.endWatched = '1';
  const update = () => {
    // A row on a screen that is not showing has clientWidth 0, which reads
    // as "there is more to the right" and paints the fade over a row nobody
    // can see yet. Measuring on layout rather than on a frame means the
    // first honest measurement is the one that lands.
    if (!row.clientWidth) return;
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
    row.dataset.end = atEnd ? '1' : '0';
  };
  row.addEventListener('scroll', update, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(update).observe(row);
  else window.addEventListener('resize', update);
  requestAnimationFrame(update);
  return update;
}

function watchConnection() {
  const sync = syncConnectionBadge;
  window.addEventListener('online', () => { relayTrouble = false; sync(); if (poller) poller.wake(); });
  window.addEventListener('offline', sync);
  sync();

  // A phone that has been in a pocket, or a tab that was in the background,
  // is exactly where the table has moved on without you. Polling pauses
  // while hidden and catches up the moment it is looked at again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && poller) poller.wake();
  });
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
  maybeShowWheelCoach();
}

document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  watchConnection();
  applyGuided();
  initFormPicker();

  // Two switches, one setting: the one on setup and the one that rides with
  // the help sheets, so a cupper who joined by QR can reach it too.
  const guidedSwitches = [$('#toggle-guided'), $('#toggle-guided-help')].filter(Boolean);
  guidedSwitches.forEach(sw => {
    sw.checked = guidedOn();
    sw.addEventListener('change', () => {
      setGuided(sw.checked);
      guidedSwitches.forEach(other => { other.checked = sw.checked; });
      haptic();
      toast(sw.checked ? 'Guided mode on' : 'Guided mode off');
    });
  });

  initStepper('#stepper-coffees', '#value-coffees', 'coffees', 'coffees');
  initStepper('#stepper-cups', '#value-cups', 'cups', 'cups');
  renderCupsPreview();

  // resume?
  const saved = load();
  if (saved) state = saved;
  $('#btn-resume').addEventListener('click', () => { if (state) startCupping(); });
  refreshResumeButton();

  $('#btn-start').addEventListener('click', async () => {
    // starting over replaces the session in progress, so say so first
    if (state && state.coffees.length) {
      const p = sessionProgress();
      const scored = state.coffees.length - p.untouched;
      if (scored > 0 && !(await confirmSheet({
        title: 'Replace the cupping in progress?',
        body: `${scored} coffee${scored > 1 ? 's have' : ' has'} been scored and this cupping has not been finished, so it is not in History yet.`,
        effects: ['Starting a new lineup discards it.'],
        cta: 'Start a new one',
        danger: true,
      }))) return;
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
  $('#btn-wheel').addEventListener('click', () => openFlavorWheel());
  $('#wheel-coach').addEventListener('click', () => { markWheelSeen(); openFlavorWheel(); });
  // scoring means they are busy — the coach mark has said its piece
  $('#panels').addEventListener('pointerdown', hideWheelCoach, { passive: true });

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
      // the lineup names its own table when the leader had one by then, so
      // a share link joins that table instead of starting a second one
      if (payload) askNameThenJoin(payload, null);
      else toast('That cupping link has expired or was not readable');
    });
  }

  $('#btn-finish').addEventListener('click', () => {
    // There used to be a confirm here admitting that unrated sections were
    // being counted as 5. They are not any more — an unrated coffee shows no
    // score at all and a part-scored one says how much of it is real, on
    // Results and everywhere else. There is nothing left to confess, and
    // confessing it as an interruption at the moment someone asks for their
    // results was the worst possible delivery for it.
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
    // No confirm: reaching Results archives the cupping, so this loses
    // nothing. A dialog asking permission for an action with no consequence
    // teaches people to dismiss the ones that have consequences.
    clearSession();
    refreshResumeButton();
    showScreen('#screen-setup');
  });

  $('#btn-history').addEventListener('click', () => {
    buildHistory();
    showScreen('#screen-history');
  });

  $('#btn-back-history').addEventListener('click', () => showScreen('#screen-setup'));

  $('#btn-clear-history').addEventListener('click', async () => {
    const signedIn = Boolean(loadAuth() && loadAuth().user);
    const kept = loadArchive().length;
    const effects = [`${kept} cupping${kept === 1 ? '' : 's'} deleted from this device.`];
    if (signedIn) effects.push('Your cloud backup is deleted too, on every device signed in to this account.');
    effects.push('It cannot be undone.');
    if (!(await confirmSheet({
      title: 'Delete all cupping history?',
      effects,
      cta: 'Delete everything',
      danger: true,
    }))) return;
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
