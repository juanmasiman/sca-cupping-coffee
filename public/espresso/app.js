/* ============================================================
   lento — espresso dial-in

   A dial-in is a controlled experiment. You change one thing, pull
   again, and read the difference. Software for it is therefore not a
   calculator and not a notes app: it is a record of what changed,
   with the arithmetic that falls out of three numbers.

   The three numbers are dose in, beverage out, and seconds. Ratio and
   flow are read out of them and never typed, because a typed ratio is
   a claim rather than a measurement. Everything else on the screen —
   whether the shot landed in the window, what moved since the last
   one, what to try next — is built from those three and the target.

   The rule this app inherits from the cupping sheet is the same one:
   a number is only evidence for what was actually measured. A shot
   missing its yield has no ratio, and says so with a dash. Extraction
   yield needs a refractometer reading and appears only when there is
   one — there is no estimate, because an estimated extraction yield
   is indistinguishable on the page from a measured one, and only one
   of them is a fact.
   ============================================================ */

/* ---------- storage ---------- */

const STORE = 'lento-espresso-v1';
const PREF = 'lento-espresso-prefs-v1';

let state = null;
let prefs = { tds: false, theme: 'auto', seenHelp: false };

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) state = migrate(JSON.parse(raw));
  } catch (e) { /* private mode, or a shape this build cannot read */ }
  if (!state || !Array.isArray(state.coffees)) state = { v: 1, coffees: [], activeId: null };
  if (!state.kit) state.kit = defaultKit();
  try {
    const raw = localStorage.getItem(PREF);
    if (raw) prefs = Object.assign(prefs, JSON.parse(raw));
  } catch (e) { /* defaults are fine */ }
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* quota, private mode */ }
}

function savePrefs() {
  try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) { /* as above */ }
}

// Older shapes get repaired rather than discarded: somebody's shot log is
// the only copy of an afternoon's work.
function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  s.kit = Object.assign(defaultKit(), s.kit || {});
  (s.coffees || []).forEach(c => {
    if (!c.target) c.target = defaultTarget();
    if (typeof c.target.temp === 'undefined') c.target.temp = null;
    if (typeof c.roast !== 'string') c.roast = '';
    if (typeof c.process !== 'string') c.process = '';
    if (typeof c.altitude !== 'string') c.altitude = '';
    if (typeof c.decaf !== 'boolean') c.decaf = false;
    if (typeof c.grindNow !== 'string') c.grindNow = '';
    if (!Array.isArray(c.shots)) c.shots = [];
    c.shots.forEach(sh => {
      if (typeof sh.taste === 'undefined') sh.taste = null;
      if (typeof sh.body === 'undefined') sh.body = null;
      if (typeof sh.intent === 'undefined') sh.intent = null;
      if (typeof sh.run === 'undefined') sh.run = null;
      if (typeof sh.harsh === 'undefined') sh.harsh = false;
    });
  });
  return s;
}

/* ---------- the kit ----------

   Asked once, before the first shot, and then never again.

   A dial-in tool that asks for brew temperature on a machine with one
   temperature is asking somebody to invent a number and then quoting it
   back at them. The advice is worse: "brew temperature is the usual next
   variable, up a degree or two" is not a suggestion to a Bambino Plus owner,
   it is the app admitting it does not know what they are standing in front
   of. Half this product's value is knowing which variables exist.

   What the app needs is not the machine's name. A brand table goes stale
   within a year, misses every import, and is wrong about anything modded —
   and a Gaggia Classic with a PID is a different machine from the one on
   the box. So the app asks what the machine can *change*, in four
   questions, and carries the names purely as the user's own record.
   Nothing is inferred from them.

   The defaults are the commonest home setup — one fixed temperature, no
   pressure control — so skipping the screen leaves somebody with the
   simplest sheet rather than the fullest one. A field you can see and
   cannot change is a field you will eventually fill in with a guess. */

/* ---------- the machines, and what they can actually do ----------

   The kit screen asks three capability questions, and it used to ask them
   cold while also collecting the machine's name in a text field it then
   read nothing out of. That is two taps charged for something the name
   already answered.

   So the name answers them. Picking a machine fills the three questions
   in; picking a grinder fills in what its dial counts in.

   THE LIST IS A SHORTCUT, NEVER A SOURCE OF TRUTH. Every answer it fills
   in stays editable, and "Something else" is always there. A brand table
   is stale within a year and is wrong about every modified machine — a
   Gaggia Classic with a PID fitted is still a Gaggia Classic, and a
   meaningful share of them have one. The app reasons from the
   capability, never from the name, so somebody whose machine is not
   listed or is not stock is never worse off than before the list
   existed. What the list removes is three questions for the majority who
   own something ordinary and unmodified.

   Entries are only here where the stock capability is not in doubt.
   Anything uncertain is left off: an absent machine costs three taps,
   and a wrong one costs trust in every answer that follows. */

const MACHINES = [
  // name, brew temperature, pressure/flow
  { name: 'Breville/Sage Bambino',            temp: 'fixed', pressure: 'fixed' },
  { name: 'Breville/Sage Bambino Plus',       temp: 'fixed', pressure: 'fixed' },
  { name: 'Breville/Sage Barista Express',    temp: 'set',   pressure: 'gauge' },
  { name: 'Breville/Sage Barista Express Impress', temp: 'set', pressure: 'gauge' },
  { name: 'Breville/Sage Barista Pro',        temp: 'set',   pressure: 'gauge' },
  { name: 'Breville/Sage Barista Touch',      temp: 'set',   pressure: 'gauge' },
  { name: 'Breville/Sage Dual Boiler',        temp: 'set',   pressure: 'gauge' },
  { name: 'Breville/Sage Oracle',             temp: 'set',   pressure: 'gauge' },
  { name: 'Gaggia Classic (stock)',           temp: 'fixed', pressure: 'fixed' },
  { name: 'Gaggia Classic Pro (stock)',       temp: 'fixed', pressure: 'fixed' },
  { name: 'Rancilio Silvia (stock)',          temp: 'fixed', pressure: 'fixed' },
  { name: 'Rancilio Silvia Pro X',            temp: 'set',   pressure: 'gauge' },
  { name: 'Rocket Appartamento',              temp: 'fixed', pressure: 'gauge' },
  { name: 'Lelit Elizabeth',                  temp: 'set',   pressure: 'gauge' },
  { name: 'Lelit Bianca',                     temp: 'set',   pressure: 'profile' },
  { name: 'Profitec Pro 500',                 temp: 'set',   pressure: 'gauge' },
  { name: 'Profitec Pro 600',                 temp: 'set',   pressure: 'gauge' },
  { name: 'ECM Synchronika',                  temp: 'set',   pressure: 'gauge' },
  { name: 'La Marzocco Linea Mini',           temp: 'set',   pressure: 'gauge' },
  { name: 'Decent DE1',                       temp: 'set',   pressure: 'profile' },
  { name: 'Meticulous',                       temp: 'set',   pressure: 'profile' },
  // On a manual lever the kettle is the temperature control and the arm is
  // the pressure profile, so both answers are "you".
  { name: 'Flair 58',                         temp: 'set',   pressure: 'profile' },
  { name: 'Flair (Classic, Pro, NEO)',        temp: 'set',   pressure: 'profile' },
  { name: 'Cafelat Robot',                    temp: 'set',   pressure: 'profile' },
  { name: 'La Pavoni (lever)',                temp: 'set',   pressure: 'profile' },
];

const GRINDERS = [
  { name: 'Niche Zero',                steps: 'stepless', retains: false },
  { name: 'DF64 / DF64 Gen 2',         steps: 'stepless', retains: false },
  { name: 'DF54',                      steps: 'stepless', retains: false },
  { name: 'Turin DF83',                steps: 'stepless', retains: false },
  { name: 'Eureka Mignon',             steps: 'stepless', retains: true },
  { name: 'Mazzer Mini',               steps: 'stepless', retains: true },
  { name: 'Option-O Lagom P64',        steps: 'stepless', retains: false },
  { name: 'Weber Key / EG-1',          steps: 'stepless', retains: false },
  { name: 'Fellow Ode Gen 2',          steps: 'stepped',  retains: false },
  { name: 'Baratza Encore / Encore ESP', steps: 'stepped', retains: true },
  { name: 'Baratza Sette 270',         steps: 'stepped',  retains: false },
  { name: 'Breville/Sage Smart Grinder Pro', steps: 'stepped', retains: true },
  { name: 'Breville/Sage built-in grinder',  steps: 'stepped', retains: true },
  { name: '1Zpresso (J, JX, K, ZP6)',  steps: 'stepped',  retains: false },
  { name: 'Comandante C40',            steps: 'stepped',  retains: false },
  { name: 'Timemore (C2, C3, 078)',    steps: 'stepped',  retains: false },
  { name: 'Kingrinder (K4, K6)',       steps: 'stepped',  retains: false },
];

const machineEntry = name => MACHINES.find(m => m.name === name) || null;
const grinderEntry = name => GRINDERS.find(g => g.name === name) || null;

function defaultKit() {
  return {
    machine: '',
    grinder: '',
    basket: '',
    // what the machine can do, in the app's terms
    temp: 'fixed',       // 'fixed' — one temperature | 'set' — you choose it
    pressure: 'fixed',   // 'fixed' | 'gauge' — you can see it | 'profile' — you can change it
    steps: 'stepless',   // 'stepped' — clicks | 'stepless' — a number on a dial
    /* Whether the grinder holds grounds between settings. The whole "use
       grind for the big moves and dose or yield for the small ones" rule
       exists because a grind change costs a purge; on a single-doser it
       costs nothing and the rule relaxes. */
    retains: true,       // true — needs a purge | false — single dose
    /* Which portafilter, because it decides whether channelling is
       visible at all and what it looks like. Sprays are a bottomless
       observation; with spouts the tell is a late surge in flow. */
    portafilter: 'spouted',  // 'spouted' | 'bottomless'
    /* Two doses, because they are two different facts and conflating
       them was the worst bug a first-run test ever found.

       basketDose is the number printed on the basket — 18g on a stock
       Breville double. It is hardware, it is a ceiling, and nothing the
       app does ever changes it.

       doseFits is what the coin test proved actually fits this coffee
       with headroom to swell into, which can be either side of the
       printed figure because grind and roast change how grounds settle.
       Null until the test has been run.

       They used to be one field. The coin test wrote 19 into it, and the
       board then said "that is under the 19g on the basket" to somebody
       whose basket says 18 — the app arguing against its own advice and
       blaming the hardware for it. */
    basketDose: 18,
    doseFits: null,
    // When the dose was last checked against the basket by volume. The
    // weight is only half the answer — see openDoseCheck.
    doseChecked: null,
    asked: false,        // has anybody answered or skipped this screen
  };
}

const kit = () => (state && state.kit) || defaultKit();
// The machine holds one temperature, so there is no temperature to record
// and none to suggest moving.
const canSetTemp = () => kit().temp === 'set';
const canSetPressure = () => kit().pressure === 'profile';
const seesPressure = () => kit().pressure !== 'fixed';
// A stepped grinder counts clicks; a stepless one reads a number off a
// dial. Neither number means anything to anyone else, which is why the app
// only ever suggests a direction.
const grindUnit = () => (kit().steps === 'stepped' ? 'clicks' : 'setting');
// A grinder that holds grounds makes every grind change cost a purge.
const retains = () => kit().retains !== false;
const bottomless = () => kit().portafilter === 'bottomless';
/* What this basket actually holds, which is the coin test's answer where
   there is one and the printed figure otherwise. Everything that reasons
   about how full the basket is uses this; only prose that says the words
   "on the basket" uses basketDose. */
const basketCap = () => {
  const fits = num(kit().doseFits);
  return fits === null ? num(kit().basketDose) : fits;
};

/* ---------- the model ---------- */

function uid() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* The window a shot is judged against.

   1:2 in 25–30 seconds is where most modern espresso recipes start, and
   it is a starting point rather than a rule — which is why it is a field
   on the coffee and not a constant in here. A shot is only fast or slow
   against something, and this app refuses to call one fast without
   saying what it was measured against. */
function defaultTarget() {
  // The basket decides the dose more than anything else does, and the kit
  // already knows which basket is in the machine.
  return { dose: basketCap() || 18, ratio: 2, timeLo: 25, timeHi: 30, temp: null };
}

/* A starting point from the bag.

   Roast level moves espresso extraction more than anything else printed on
   a bag: a light roast is denser and less soluble, so it takes more heat
   and usually a longer ratio to give up the same amount; a dark roast is
   friable and soluble, so it gives up too much at the same settings.

   Tools in this category typically build a baseline from four bag fields —
   roast, process, elevation and origin — and the strongest of those, by
   their own account, is roast. The other three are real but weak, and
   averaging a weak signal into a strong one does not make the answer more
   reliable, it makes the confidence harder to read. So this is one
   variable, the numbers are a place to start rather than a prediction, and
   the screen says which it is.

   Ranges are the conventional ones; the single figure is the middle of the
   range this app will actually put in the field. */
/* Temperatures are from DIALIN.md step 5, which takes them from the
   Understanding Espresso series: dark 85–90, medium 88–92, light 90–95.
   The five levels here interpolate between those three bands, keeping
   their outer edges.

   They used to run 2–3°C hotter across the board — the old dark band
   started where this one ends — because they were assembled from general
   guidance rather than taken from a source. That is the whole argument
   for writing the method down before writing the advice.

   The ratios are NOT from the same place and are marked as assembled in
   DIALIN.md step 3: the series gives no roast-to-ratio mapping at all,
   and starts around 1:2–1:2.2 regardless. The mild slope kept here — a
   longer ratio for a lighter roast — follows Hedrick's "ratio over grind
   size" rather than Hoffmann, and is offered as a starting point only. */
/* The window moves with the roast too, and it used to be 25–30s for
   everything.

   That default is traditional-espresso shaped, and for a light roast it
   is actively misleading. Hedrick pulls Nordic-style coffees at 16 to 22
   seconds on purpose — coarse, low pressure, long ratio — and says he
   never really goes over 20 or 22 with them. An app holding every coffee
   to 25–30 would call every one of those shots badly under-extracted and
   send somebody finer, which is the one direction he argues against for
   those coffees.

   These are not his numbers: a window of 16–22 would impose one man's
   style on everybody, and he is the first to say it is a modern style
   rather than the only one. What they do is widen and shift earlier as
   the roast gets lighter, so a fast light-roast shot stops being flagged
   as a fault. The window is a field on the coffee and the person can
   move it wherever they like; this only decides where it starts. */
const ROASTS = [
  { key: 'light',  label: 'Light',        temp: 93, lo: 90, hi: 95, ratio: 2.4, dose: -1.5, timeLo: 20, timeHi: 28, tempRange: '90–95°', ratioRange: '1:2.2–1:2.5' },
  { key: 'mlight', label: 'Medium-light', temp: 92, lo: 90, hi: 94, ratio: 2.2, dose: -1,   timeLo: 22, timeHi: 29, tempRange: '90–94°', ratioRange: '1:2.1–1:2.3' },
  { key: 'medium', label: 'Medium',       temp: 90, lo: 88, hi: 92, ratio: 2.0, dose: -0.5, timeLo: 25, timeHi: 30, tempRange: '88–92°', ratioRange: '1:1.9–1:2.1' },
  { key: 'mdark',  label: 'Medium-dark',  temp: 89, lo: 87, hi: 91, ratio: 1.9, dose: 0,    timeLo: 25, timeHi: 31, tempRange: '87–91°', ratioRange: '1:1.8–1:2.0' },
  { key: 'dark',   label: 'Dark',         temp: 87, lo: 85, hi: 90, ratio: 1.8, dose: 0,    timeLo: 25, timeHi: 32, tempRange: '85–90°', ratioRange: '1:1.7–1:1.9' },
];

/* Where to start the dose, given the roast and the basket.

   Extraction is work, and more coffee is more of it. A light roast is
   already hard to extract, so starting it with a full basket sets an
   impossible amount of work and the cup comes out sour and thin however
   it is dialled. A dark roast gives up its solubles easily and can sit
   at the basket's figure.

   Expressed as an offset from the basket's own rating rather than as a
   number, because the basket decides the dose and this only decides
   where in its range to sit. Never above it: that figure is a ceiling. */
function doseStart(c) {
  const basket = basketCap();
  if (basket === null) return null;
  const e = c ? roastEntry(c.roast) : null;
  const off = e ? e.dose : 0;
  return Math.max(1, Math.round((basket + off) * 2) / 2);
}

/* ---------- how soluble the coffee is ----------

   THIS REVERSES A DECISION THIS FILE USED TO DOCUMENT.

   The roast-level block below used to say that process, origin and
   elevation were "real and much weaker", and that folding them in would
   make the answer's confidence harder to read rather than making it
   better. That was a fair call on the evidence then: the sources said
   those things mattered without saying what to do about them, and a
   vague factor mixed into a sharp one does blur it.

   Two things changed it. One source frames the whole problem as
   solubility — how readily a coffee gives up what is in it — with roast
   as the largest input but not the only one, and gives directions for
   each of the others. The second arrives at the same place from the
   other side, by category: heavily processed coffees behave one way,
   ultra-lights another, old coffees another. Those are specific enough
   to act on, which "real but weaker" never was.

   The shift below is a modifier around the roast baseline, not a
   replacement for it. Negative means harder to extract than the roast
   alone suggests — push a little harder. Positive means easier — ease
   off. Roast itself is not in the sum, because it is already in ROASTS
   and counting it twice would double its weight.

   Two of the factors are not scalars at all and are carried as flags,
   because what they change is which advice is allowed rather than how
   far a number moves. See solubility(). */

const PROCESSES = [
  { key: 'washed',    label: 'Washed',         shift: -0.5 },
  { key: 'honey',     label: 'Honey',          shift: 0 },
  { key: 'natural',   label: 'Natural',        shift: 0.5 },
  { key: 'fermented', label: 'Anaerobic / co-ferment', shift: 1 },
];

const ALTITUDES = [
  { key: 'high', label: 'High, 1800m+',   shift: -0.5 },
  { key: 'mid',  label: 'Mid',            shift: 0 },
  { key: 'low',  label: 'Low, under 1200m', shift: 0.5 },
];

const processEntry = k => PROCESSES.find(x => x.key === k) || null;
const altitudeEntry = k => ALTITUDES.find(x => x.key === k) || null;

/* The starting point, roast plus everything else the bag said.

   Roast sets the baseline; the solubility shift moves it. Two rules
   about which way each number is allowed to move:

   The ratio carries most of the adjustment, because yield is the
   reliable way to change extraction and the one all three sources
   agree on.

   The temperature only ever comes DOWN. Raising it is the contested
   move — two of the three argue that heat buys bitterness faster than
   it buys sweetness — so a coffee that is hard to extract gets a longer
   ratio rather than a hotter machine, while one that gives up too
   easily gets cooled. */
function startingPoint(c) {
  const e = c ? roastEntry(c.roast) : null;
  if (!e) return null;
  const sol = solubility(c);
  const s = sol.shift;

  /* Rounded to a tenth, which is the grain the ratio field steps in.

     This used to round to 0.05, so the button said "Start at 1:2.55",
     the toast said 1:2.55, and the stepper underneath — a one-decimal
     field — showed 2.6. The app disagreeing with itself two inches
     apart. A twentieth of a ratio is under a gram of yield on a normal
     dose and nobody dials to it; a tenth is a real step and it is the
     one the field can hold. */
  let ratio = e.ratio - s * 0.15;
  ratio = Math.max(1.4, Math.min(3.2, Math.round(ratio * 10) / 10));

  let temp = e.temp;
  if (s >= 1.4) temp -= 2;
  else if (s >= 0.5) temp -= 1;
  temp = Math.max(e.lo, Math.min(e.hi, temp));

  /* The two that are not a number on a slider. Decaf pulls both ways at
     once and has to be said in words; a heavily processed lot is a
     warning about which direction to move when it disappoints. */
  const extra = [];
  if (sol.flags.decaf) extra.push('Decaf pulls both ways: it extracts more readily, so the ratio comes in, but it also flows faster, so expect to grind finer than the same coffee with its caffeine.');
  if (sol.flags.processed) extra.push('With a lot this heavily processed, the flavour you paid for is the one the process put there, and pushing extraction burns it off. If it comes out sour, going coarser is as likely to fix it as going finer.');
  if (sol.flags.aged) extra.push('This bag has lost the gas that gave the puck much of its resistance, so it will run fast and will not build pressure. That is the bag, not the grinder — chasing it finer mostly makes it bitter.');

  return { e, sol, ratio, temp, timeLo: e.timeLo, timeHi: e.timeHi, extra };
}

/* What the bag says about how hard this coffee will be to extract.

   Returns a shift around the roast baseline, the reasons behind it in
   words, and the flags that change which advice is legal:

     processed — a heavily fermented lot. The point of one is the flavour
                 the process put there, and pushing extraction burns it
                 off; sour in one of these is as likely to be uneven
                 extraction from going too fine as it is under-extraction.
     decaf     — decaffeination rearranges the bean. More soluble AND it
                 flows faster, which pull opposite ways: finer grind, but
                 a tighter ratio.
     aged      — past about six weeks the carbon dioxide that gave the
                 puck much of its resistance has gone, so shots run fast
                 and will not build pressure. Chasing that with a finer
                 grind is how a stale bag gets blamed on the grinder. */
function solubility(c) {
  if (!c) return { shift: 0, why: [], flags: {} };
  let shift = 0;
  const why = [];
  const flags = {};

  const pr = processEntry(c.process);
  if (pr) {
    shift += pr.shift;
    if (pr.key === 'fermented') {
      flags.processed = true;
      why.push('a heavily processed lot gives up its flavour early and does not want pushing');
    } else if (pr.key === 'washed') {
      why.push('washed coffees are denser and give up less readily');
    } else if (pr.key === 'natural') {
      why.push('naturals are less dense and come out more easily');
    }
  }

  const al = altitudeEntry(c.altitude);
  if (al) {
    shift += al.shift;
    if (al.key === 'high') why.push('high-grown beans are denser again');
    if (al.key === 'low') why.push('lower-grown beans are softer');
  }

  if (c.decaf) {
    shift += 1.5;
    flags.decaf = true;
    why.push('decaffeination opens the bean up, so it extracts much more readily and flows faster with it');
  }

  const age = daysSinceRoast(c);
  if (age !== null && age >= 42) {
    /* The age moved the prose and not the numbers.

       startingPoint says an aged bag "starts shorter, and cooler, than the
       roast alone would" — and it was setting the plain roast midpoint,
       because the flag was raised without a shift behind it. A tester with
       a seven-week-old dark blend was told the app had adjusted for the
       bag, got 1:1.8 and 87° (dead centre of the dark band, unmoved), and
       spent six shots walking down to the 1:1.6 the sentence had promised.

       A degassed bag has lost the resistance that kept the water honest
       and oxidation has already done part of the extracting, so it gives
       up what is left too easily. That is the same direction as a dark
       roast, which is what "shorter and cooler" means here. See DIALIN.md
       step 0.5 and "which way the numbers are allowed to move". */
    shift += 1;
    flags.aged = true;
    why.push('past six weeks the carbon dioxide that gave the puck its resistance has gone, so it will run fast whatever the grinder says');
  }

  return { shift: Math.round(shift * 100) / 100, why, flags };
}

function roastEntry(key) {
  return ROASTS.find(r => r.key === key) || null;
}

// Days since the bag was roasted, or null when nobody said.
function daysSinceRoast(c) {
  if (!c || !c.roastDate) return null;
  const d = new Date(c.roastDate + 'T00:00:00');
  if (isNaN(d)) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  return days >= 0 ? days : null;
}

function newCoffee(name) {
  return {
    id: uid(),
    name: (name || '').trim(),
    roaster: '',
    roastDate: '',
    roast: '',
    // What else the bag says about how hard this will be to extract.
    // See solubility(). All optional — an unanswered one simply does not
    // contribute, rather than defaulting to a guess.
    process: '',
    altitude: '',
    decaf: false,
    // How far the grinder has moved from the dialled-in recipe. The recipe
    // itself is never rewritten; see the keeper card.
    grindNow: '',
    target: defaultTarget(),
    shots: [],
  };
}

function activeCoffee() {
  if (!state.coffees.length) return null;
  return state.coffees.find(c => c.id === state.activeId) || state.coffees[0];
}

function coffeeLabel(c) {
  if (!c) return 'No coffee yet';
  return c.name.trim() || 'Unnamed coffee';
}

// Newest first on screen, because the shot you are thinking about is the
// one you just pulled. The array itself stays in the order they happened.
function shotsNewestFirst(c) {
  return c.shots.slice().reverse();
}

/* ---------- the arithmetic ----------

   Four functions, each returning null rather than a number when the
   measurement it needs is missing. Every caller has to handle the null,
   which is the point: there is no path through this file that prints a
   figure nobody measured. */

const num = v => (typeof v === 'number' && isFinite(v) ? v : null);

// Brew ratio, as the 2 in 1:2. Needs what went in and what came out.
function ratioOf(shot) {
  const d = num(shot.dose), y = num(shot.yield);
  if (!d || d <= 0 || y === null || y < 0) return null;
  return y / d;
}

// Grams of beverage a second. The number that says whether the puck is
// choking or gushing, and the one that moves first when grind moves.
function flowOf(shot) {
  const y = num(shot.yield), t = num(shot.time);
  if (y === null || t === null || t <= 0) return null;
  return y / t;
}

/* Extraction yield — the percentage of the dry coffee that ended up
   dissolved in the cup.

   For espresso it is (beverage mass × TDS) ÷ dose. It needs a
   refractometer, and without one there is no way to get at it: ratio is
   not extraction, time is not extraction, and a shot that tastes right
   is not a measurement. Some tools print an estimate here. This one
   returns null, because an estimate and a reading look identical once
   they are set in the same type, and only one of them is a fact. */
function extractionOf(shot) {
  const d = num(shot.dose), y = num(shot.yield), tds = num(shot.tds);
  if (!d || d <= 0 || y === null || tds === null || tds <= 0) return null;
  return (y * tds) / d;
}

// A shot the arithmetic can work on at all.
function isComplete(shot) {
  return num(shot.dose) !== null && num(shot.yield) !== null && num(shot.time) !== null;
}

function missingFields(shot) {
  const out = [];
  if (num(shot.dose) === null) out.push('dose');
  if (num(shot.yield) === null) out.push('yield');
  if (num(shot.time) === null) out.push('time');
  return out;
}

/* Where the shot landed against the window.

   Returns one of 'fast', 'in', 'slow' for time, and how far the ratio sat
   from target. Null when there is nothing to judge — a shot with no time
   is not a fast shot. */
function placeOf(shot, target) {
  const t = num(shot.time);
  const r = ratioOf(shot);
  return {
    time: t === null ? null : (t < target.timeLo ? 'fast' : t > target.timeHi ? 'slow' : 'in'),
    ratio: r,
    ratioOff: r === null ? null : r - target.ratio,
  };
}

/* ---------- how the shot ran ----------

   The thing every dial-in guide puts first and no dial-in app asks.

   Most bad espresso at home is not a grind setting. It is water finding
   a crack and going round the puck instead of through it, and when that
   happens the clock and the cup are both readings of an accident: the
   shot runs quick because part of the bed offered no resistance, and it
   tastes sour and harsh at once because one part over-extracted while
   the rest barely brewed. Grinding finer — the answer the clock alone
   would give — tightens the bed and makes the crack worse.

   The app used to infer this from the two corners where the clock and
   the cup disagree. That catches some of it, and it is a guess. Asking
   costs one tap and turns the guess into a reading.

   Four answers, chosen because you can tell them apart across the bar
   without thinking about it:

     even    one or two steady dark streams that join and stay joined
     spray   jets sideways off the basket, or a stream that splits
     blonde  went pale long before the end
     stall   dripped, hesitated, then rushed

   The last three are all the same fault wearing different clothes. */

/* The options depend on which portafilter is on the machine, because the
   two show channelling completely differently and the old list only
   described one of them.

   Through a bottomless you watch the bed: the flow goes uneven across
   the basket, and it jets or splits. With spouts you cannot see the bed
   at all — what reaches you is a sudden surge in flow late in the shot,
   coffee gushing from the spouts in the last third or the last half.
   Asking a spouted user whether it sprayed is asking about something
   they physically cannot observe, which is how the most diagnostic
   question in the app became unanswerable for most of its users. */
const RUNS = [
  { key: 'even',   label: 'Ran even',      sub: 'steady and dark', both: true },
  { key: 'spray',  label: 'Sprayed',       sub: 'jets, or the stream split', naked: true },
  { key: 'surge',  label: 'Gushed near the end', sub: 'the flow jumped in the last third', spouted: true },
  { key: 'blonde', label: 'Blonded early', sub: 'pale well before the end', both: true },
  { key: 'stall',  label: 'Dripped, then rushed', sub: 'it hesitated', both: true },
];

// What to show, given the portafilter. Every key stays in RUNS so a shot
// logged on one portafilter still reads correctly after a kit change.
function runOptions() {
  return RUNS.filter(r => r.both || (bottomless() ? r.naked : r.spouted));
}

const runEntry = key => RUNS.find(r => r.key === key) || null;
const channelled = shot => shot && ['spray', 'surge', 'stall', 'blonde'].includes(shot.run);

/* "Ran even" is evidence through a bottomless and an opinion through spouts.

   Four branches of the advice reach for channelling when the clock and the
   taste disagree, because that disagreement usually is a channel. But a
   tester with a bottomless portafilter ticked "Ran even" — the one
   observation that rules a channel out, made on the one portafilter where
   you can actually make it — and got "look at distribution and tamp
   before anything else" three shots running, in identical words, roughly
   200px below the lit chip. Three shots thrown away because the app
   ignored the only thing it had asked for.

   Through spouts the bed is invisible, so "ran even" there means the
   stream looked steady, which is genuinely weak evidence. The app says so
   rather than either ignoring the answer or pretending it settles it. */
const sawEven = shot => Boolean(shot) && shot.run === 'even';
const evenSeen = shot => sawEven(shot) && bottomless();

/* Where to look when the puck has been ruled out.

   The clock and the taste disagreeing means the coffee gave up more, or
   less, than its time suggests. With the bed exonerated, what is left is
   how soluble the coffee is and how hot the water is — and the ratio is
   the variable that carries an adjustment, with temperature only ever
   coming down. See DIALIN.md, "which way the numbers are allowed to move". */
function notThePuck(shot, target, c, over) {
  const sol = solubility(c);
  const bag = [];
  if (sol.flags.aged) bag.push('the bag is past six weeks and degassed');
  if (sol.flags.processed) bag.push('a heavily processed lot gives up its solubles readily');
  const e = c ? roastEntry(c.roast) : null;
  if (e && over && e.dose >= 0) bag.push(`a ${e.label.toLowerCase()} roast is friable and extracts easily`);
  if (e && !over && e.dose < 0) bag.push(`a ${e.label.toLowerCase()} roast is dense and hard to extract`);
  const because = bag.length ? ` — ${bag.join(', and ')}` : '';

  if (over) {
    return canSetTemp()
      ? ` This is a coffee giving up more than its time suggests${because}. Take a degree off the brew temperature, and if that is not enough, stop the shot 2 to 3g shorter. Leave the grinder where it is: coarser would only make it faster.`
      : ` This is a coffee giving up more than its time suggests${because}. Stop the shot 2 to 3g shorter — less water through the same puck takes less of the harsh end with it. Leave the grinder where it is: coarser would only make it faster.`;
  }
  return ` This is a coffee giving up less than its time suggests${because}. Let it run 2 to 3g longer — more water takes more with it, and yield is the reliable way to move extraction. Leave the grinder where it is: finer would only make it slower.${
    canSetTemp() ? ' Hotter would also extract more, but that is the contested move and it brings bitterness on faster than sweetness; try the yield first.' : ''}`;
}

/* The channelling guess, with the reader's own observation in it.

   `over` is true for the too-much-came-out corner. */
function puckOrNot(shot, target, c, over) {
  if (evenSeen(shot)) return notThePuck(shot, target, c, over);
  if (sawEven(shot)) {
    return ` You said it ran even, though through spouts the bed is out of sight and a steady stream can still be going round part of it. Check distribution and tamp on the next one; if it happens again with the puck prepped carefully,${
      notThePuck(shot, target, c, over).replace(/^ This is a coffee/, ' it is a coffee')}`;
  }
  return over
    ? ' This pattern usually means the water found a channel, so look at distribution and tamp before anything else.'
    : ' This pattern usually means the water went round the puck rather than through it, so look at distribution and tamp before anything else.';
}

/* Sour and bitter in the same sip.

   DIALIN.md step 2, and the tell both authorities and every guide agree
   on: it is channelling rather than a grind problem. One part of the bed
   over-extracted while the rest barely brewed, and the cup carries both
   at once. Grinding either way makes one half worse — finer tightens the
   bed around the crack, coarser under-extracts what was already weak.

   It outranks the clock for the same reason a sprayed shot does: the
   time is a reading of an accident. The difference is only where the
   evidence came from — the eye or the mouth — so the advice is the same
   advice. */
function harshFault(shot) {
  if (!shot || !shot.harsh) return null;
  return { sure: true, act: 'dose', move: 'Fix the puck, not the grinder.',
    why: 'Sharp and harsh in the same sip is not a point between sour and bitter — it is two different extractions in one cup. Water went round part of the bed and sat in the rest, so one half gave up too much and the other hardly brewed. No grind setting fixes that, and both directions make one half worse. Distribute the grounds before you tamp — stir the bed or tap the basket level — then tamp flat and hard enough that it does not move. Check the dose fits the basket while you are there, because a puck with nowhere to swell into channels however carefully it was prepared.' };
}

/* The puck, when the puck is the answer.

   This outranks everything else the app has to say, including a clock
   that is a long way out, because until the shot runs even the clock is
   not measuring the grind and the cup is not measuring the recipe. It is
   also the one piece of advice here that names a technique rather than a
   number, and it says so. */
function runFault(shot, target) {
  if (!channelled(shot)) return null;
  const place = placeOf(shot, target);
  const fast = place.time === 'fast';

  const common = ' Distribute the grounds before you tamp — stir the bed or tap the basket level — then tamp flat and hard enough that it does not move, and check nothing is caked on the shower screen. One of those usually does it.';

  if (shot.run === 'surge') {
    return { sure: true, act: 'dose', move: 'Fix the puck, not the grinder.',
      why: `Flow that jumps in the last third of the shot is the tell you get through spouts: the bed has given way somewhere and the water is going round it rather than through it. Everything else on this shot is a reading of that — the clock ran on a puck that stopped resisting partway, and the cup will be sour and harsh at once and thinner than its strength suggests. Grinding finer tightens the bed and makes the crack worse, so leave the grinder where it is and pull another.${common}` };
  }
  if (shot.run === 'spray') {
    return { sure: true, act: 'dose', move: 'Fix the puck, not the grinder.',
      why: `It sprayed, which means water found a crack and went round the bed rather than through it. Everything else on this shot is a reading of that: the clock is quick because part of the puck offered no resistance, and the cup is sour and harsh at once because one part over-extracted while the rest hardly brewed. Grinding finer tightens the bed and makes the crack worse, so leave the grinder exactly where it is and pull another.${common}` };
  }
  if (shot.run === 'stall') {
    return { sure: true, act: 'dose', move: 'Fix the puck, not the grinder.',
      why: `It hesitated and then rushed, which is a bed that resisted until the water found a way through and then gave up all at once. That is channelling, and it makes the clock meaningless — the seconds at the start and the seconds after the break are not measuring the same shot. Leave the grinder where it is and pull another.${common}` };
  }
  return { sure: false, move: 'It blonded early — pull another with the grinder untouched.',
    why: `Going pale well before the end means the puck was spent early, in part of the bed at least.${
      fast ? ' With a quick clock on top of it, that is water running round the bed rather than through it.' : ''} Leave the dial alone for one shot and prepare the puck carefully instead:${common.replace(' One of those usually does it.', '')} If it comes out even, the last one was the prep. If it blondes again the same way, it is the grind or the dose and the board will say which.` };
}

/* ---------- what the grinder is worth, in seconds ----------

   The measurement lives in /shared/grind.js, because it is the same
   measurement of the same machine whether a basket or a cone sits
   downstream of it, and somebody who uses both of these apps owns one
   grinder. What stays here is the part that is espresso's: where the
   numbers are read from, and how many seconds a given shot is trying
   to buy.

   Espresso always qualifies for it. The water's time in the puck is a
   consequence of how fine the coffee is, so seconds-per-step is a real
   quantity — unlike an immersion brewer, where the clock is a decision
   somebody made and the same arithmetic would be measuring that. */

const GRIND = makeGrind({
  /* The shot on the open sheet counts as evidence, because it is.

     The calibration read only saved shots, so the shot sheet and the board
     gave two different answers to the same question a second apart. One
     tester watched the modal say "How far, it cannot say yet" over a shot
     whose grind and time were both typed in, pressed Save, and had the
     board immediately answer "about 3 clicks, up to 51" from that same
     shot. Another got "1.1 on the dial, down to 29.9" in the sheet and
     "1.3 on the dial, down to 29.7" on the board. Both were right about
     their own inputs and the reader saw an app changing its mind.

     A grind and a time that have been entered are a measurement whether or
     not a button has been pressed. Included once both are there, and only
     for a new sheet — an existing shot is already in the log below and
     would otherwise be counted twice. */
  logs: () => {
    const rows = ((state && state.coffees) || []).map(c => (c.shots || []).slice());
    if (editing && editingIsNew && num(editing.time) !== null
        && editing.grind !== '' && num(Number(editing.grind)) !== null) {
      const active = (state && state.coffees || []).findIndex(c => c.id === (state && state.activeId));
      if (active >= 0) rows[active] = rows[active].concat([editing]);
    }
    return rows;
  },
  stepped: () => kit().steps === 'stepped',
  /* 'step' was wrong on a stepless dial in the one place it mattered
     most — the sentence that promises to replace "a step" with a number.
     A numeric collar has no clicks, and the sensitivity figure is seconds
     per whole number on that collar — so that is what it is called. Not
     "a tenth": moves are quoted in tenths, but 2.0s is what a whole point
     is worth, and naming the smaller unit would understate the grinder
     tenfold in the one sentence the reader checks the estimate against. */
  unitWord: () => (grindUnit() === 'clicks' ? 'click' : 'point on your dial'),
  itemWord: () => 'shot',
  timeOf: sh => num(sh.time),
  grindOf: sh => (sh.grind === '' ? null : num(Number(sh.grind))),
  doseOf: sh => num(sh.dose),
  waterOf: sh => num(sh.yield),
  waterSlack: 3,
  noiseFloor: 1.5,
});

const grindPairs = () => GRIND.pairs();
const grindSensitivity = () => GRIND.sensitivity();

// The instruction and the reasoning for a grind move. Two strings rather
// than one sentence: see /shared/grind.js for why.
function grindMoveParts(shot, target, finer) {
  return GRIND.parts({
    wantSeconds: secondsWanted(shot, target, finer),
    currentGrind: shot ? shot.grind : null,
    currentTime: num(shot && shot.time),
    lo: target.timeLo, hi: target.timeHi,
  });
}


/* What you meant to change, checked against what changed.

   A dial-in is a controlled experiment and its commonest failure is not a
   bad guess — it is moving two things at once, or believing you moved one
   when you did not. The app already computes the difference between this
   shot and the last. Recording the intention beside it lets the two be
   compared, which is the only way software can catch that class of
   mistake: it knows what the numbers did, and now it knows what you meant
   them to do.

   Optional throughout. A shot with no intention recorded is not wrong. */
const INTENTS = [
  { key: 'finer',    label: 'Finer',        field: 'grind', dir: -1 },
  { key: 'coarser',  label: 'Coarser',      field: 'grind', dir: 1 },
  { key: 'hotter',   label: 'Hotter',       field: 'temp',  dir: 1 },
  { key: 'cooler',   label: 'Cooler',       field: 'temp',  dir: -1 },
  { key: 'longer',   label: 'Longer ratio', field: 'yield', dir: 1 },
  { key: 'shorter',  label: 'Shorter ratio', field: 'yield', dir: -1 },
  { key: 'same',     label: 'Same again',   field: null,    dir: 0 },
];

function intentEntry(key) {
  return INTENTS.find(i => i.key === key) || null;
}

/* Did the shot do what it was told?

   Returns null when there is nothing to check — no intention, or no
   previous shot to have changed from. Otherwise a sentence about the
   disagreement, and nothing at all when they agree, because a dial-in that
   is going to plan does not need narrating. */
/* Two flow variables moved at once, so neither result means anything.

   His third rule for grind, and the one most often broken: grind and
   dose both change how hard it is for water to get through the puck.
   Move both in the same shot and the clock cannot tell you which did
   what — the shot is not a measurement of either.

   The app already catches the stated intention disagreeing with what
   moved. It did not catch this, which is the more common mistake,
   because both changes can be perfectly deliberate and still leave you
   with an uninterpretable result.

   A dose change under a third of a gram is not counted: that is scale
   drift rather than a decision, and half the point of the half-gram
   nudge is that dose moves on its own terms. */
function twoVariables(shot, prev) {
  if (!shot || !prev) return null;
  const n = (o, f) => {
    const raw = o[f];
    if (raw === '' || raw === null || typeof raw === 'undefined') return null;
    const v = Number(raw);
    return isFinite(v) ? v : null;
  };
  const g0 = n(prev, 'grind'), g1 = n(shot, 'grind');
  const d0 = n(prev, 'dose'), d1 = n(shot, 'dose');
  if (g0 === null || g1 === null || d0 === null || d1 === null) return null;
  const dg = g1 - g0, dd = d1 - d0;
  if (dg === 0 || Math.abs(dd) < 0.3) return null;
  return `The grind and the dose both moved since the last shot — ${
    dg > 0 ? 'grind up' : 'grind down'} ${Math.abs(dg) % 1 === 0 ? Math.abs(dg) : Math.abs(dg).toFixed(1)}, dose ${
    dd > 0 ? 'up' : 'down'} ${fmtDose(Math.abs(dd))}g. Both of those change how hard it is for the water to get through, so whatever the clock says next, it cannot tell you which one did it. Move one at a time and the shot becomes a measurement instead of a guess.`;
}

function intentCheck(shot, prev) {
  const intent = intentEntry(shot.intent);
  if (!intent || !prev) return null;
  /* Empty is not zero.

     Grind and temperature are free-text on the sheet, so they arrive as
     strings, and Number('') is 0 — which is finite, which made a shot with
     no grind recorded read as a grind of zero. "Finer" against a blank
     previous shot was then reported as having moved the other way: a
     confident accusation built on a field nobody filled in. */
  const read = (o, f) => {
    const raw = o[f];
    if (raw === '' || raw === null || typeof raw === 'undefined') return null;
    const v = Number(raw);
    return isFinite(v) ? v : null;
  };

  if (!intent.field) {
    // "same again" — anything that moved is the thing to point at
    const moved = ['grind', 'temp', 'dose', 'yield']
      .filter(f => { const a = read(shot, f), b = read(prev, f); return a !== null && b !== null && a !== b; });
    return moved.length
      ? `Marked “same again”, but ${moved.length > 1
          ? `${moved.slice(0, -1).join(', ')} and ${moved[moved.length - 1]}`
          : moved[0]} changed since the last shot.`
      : null;
  }

  const now = read(shot, intent.field), was = read(prev, intent.field);
  if (now === null || was === null) {
    return `Marked “${intent.label.toLowerCase()}”, but no ${intent.field} is recorded on both shots, so there is nothing to compare.`;
  }
  const delta = now - was;
  if (delta === 0) return `Marked “${intent.label.toLowerCase()}”, but the ${intent.field} is the same as the last shot.`;
  if (Math.sign(delta) !== intent.dir) {
    return `Marked “${intent.label.toLowerCase()}”, but the ${intent.field} moved the other way.`;
  }
  return null;
}

const TASTE_MIN = -3, TASTE_MAX = 3;

// The taste axis, named. Sour and bitter are the two walls a dial-in runs
// into, and the middle is not "good" — it is "neither", which is where a
// shot has to be before anything else about it is worth discussing.
const TASTE_WORDS = {
  '-3': 'sharp, sour',
  '-2': 'sour',
  '-1': 'a little sour',
  '0': 'neither',
  '1': 'a little bitter',
  '2': 'bitter',
  '3': 'harsh, drying',
};

function tasteWord(v) {
  return TASTE_WORDS[String(v)] || '';
}

function tasteSide(v) {
  if (v === null || typeof v !== 'number') return null;
  if (v <= -1) return 'sour';
  if (v >= 1) return 'bitter';
  return 'neither';
}

/* The other wall.

   Sour and bitter are what extraction does. Watery and muddy are what
   concentration does, and they move on different variables: grind changes how
   much comes out of the puck, ratio and dose change how much of it is in
   the cup. A tool that answers "grind finer" to a thin shot is answering
   the wrong question — a shot can be extracted perfectly and still be
   watery, because there is not enough coffee in it.

   Two walls, two questions, two answers. Asking them together as one
   "how was it" is what makes espresso advice feel like guesswork: the
   person says "bad" and the tool picks an axis for them. */
const BODY_WORDS = {
  '-3': 'thin, watery',
  '-2': 'watery',
  '-1': 'a little thin',
  '0': 'neither',
  '1': 'a little heavy',
  '2': 'heavy, muddy',
  '3': 'thick, sludgy',
};

function bodyWord(v) {
  return BODY_WORDS[String(v)] || '';
}

function bodySide(v) {
  if (v === null || typeof v !== 'number') return null;
  if (v <= -1) return 'watery';
  if (v >= 1) return 'muddy';
  return 'neither';
}

/* What the clock alone is worth, before anybody has tasted anything.

   The app used to say nothing at all here. It would print "6s under the
   window" and stop — the single most actionable number in espresso, held
   back behind a taste rating the user had not given. Three shots into a
   first session it had offered exactly one piece of guidance, and that
   piece was "tap this shot and say how it tasted to get a next move":
   the app asking for work before it would help, while sitting on the
   answer.

   Time is a measurement, not a guess. A shot that came in short of the
   window got through the puck too quickly, and grind is the variable that
   changes that — you do not need to taste it to know which way to turn
   the grinder. So the clock gets its own advice, and taste upgrades it
   rather than unlocking it.

   The one case the clock cannot see is named rather than hidden: fast
   *and bitter* is channelling, not a coarse grind, and going finer will
   not fix it. That is exactly what the taste scale adds, and saying so
   is a better argument for using it than withholding the whole answer
   was. */
/* How many seconds the next shot should move, signed.

   Outside the window, aim at the middle of it. Inside it and still
   tasting of a wall, aim at the end of the window the move is heading
   for — finer buys extraction, so it goes toward the slow end — because
   "grind finer" on a shot that is already where it should be still has
   to mean some particular distance. Already at that end, it is the
   smallest move the dial makes rather than none. */
function secondsWanted(shot, target, finer) {
  const t = num(shot.time);
  if (t === null) return null;
  const place = placeOf(shot, target);
  if (place.time === 'in') {
    const aim = finer ? target.timeHi : target.timeLo;
    const d = aim - t;
    return Math.abs(d) < 1 ? (finer ? 1.5 : -1.5) : d;
  }
  return (target.timeLo + target.timeHi) / 2 - t;
}

/* The rule the app had been following without ever saying.

   Grind gets the flow into the ballpark; dose and yield make the small
   corrections after that. It is stated where it applies rather than in
   the abstract — on a big correction, so somebody learns what the
   grinder is for at the moment they are reaching for it.

   Deliberately the complement of doseNudge: that offers the half-gram
   when the shot is within five seconds of the window, this names the
   principle when it is further out, and they never both fire. */
function grindIsFor(shot, target) {
  const t = num(shot && shot.time);
  if (t === null) return '';
  const place = placeOf(shot, target);
  if (place.time !== 'fast' && place.time !== 'slow') return '';
  const off = place.time === 'fast' ? target.timeLo - t : t - target.timeHi;
  if (off <= 5) return '';
  /* Said while it is still being learned, not on every card for ever.

     This is the principle behind the whole method and it was firing on
     every far-out shot, which is how a NEXT card reached a hundred and
     fifty words. Once the board can name a number of clicks it has
     demonstrated the principle rather than asserting it, and the sentence
     has done its job. */
  if (GRIND.sensitivity()) return '';
  /* One sentence, not three. The rest of it — that the small moves come
     from dose and yield once the shot is close — is advice about a
     situation the reader is not in yet, and doseNudge says it at the
     moment they are. Two sentences of it were riding on a card that had
     reached a hundred and sixty-seven words. */
  return ` A correction this size is what the grinder is for.`;
}

/* The half-gram instead of the purge.

   Straight out of the dial-in episodes, twice. A shot that is nearly
   right does not need the grinder: half a gram more coffee adds a little
   resistance, slows the shot a few seconds, and costs nothing — where
   changing the grind costs five to ten grams of purge on most grinders,
   which is coffee nobody drinks. In one episode exactly this move took a
   shot from 25 seconds to 28 or 29.

   Two conditions, both his. It only applies when already in the
   neighbourhood of good — a long way out, leave the dose alone and fix
   the grind. And going up needs room under the basket's figure, which is
   a ceiling: he notes he could do it because he was nowhere near the top
   of the range. Coming down has no such limit.

   Offered as an alternative, never as the instruction. The grinder is
   still the variable that moves time; this is the way to avoid paying
   for it. */
function doseNudge(shot, target) {
  /* The whole argument for this is that a grind change costs a purge.
     On a single-doser it does not, and offering it anyway produced a
     sentence that talked itself out of its own suggestion — "a cheaper
     option than the grinder ... though moving the grind costs you no
     coffee either". If there is no purge to avoid, there is nothing
     here worth saying. */
  if (!retains()) return '';
  const t = num(shot && shot.time);
  if (t === null) return '';
  const place = placeOf(shot, target);
  if (place.time !== 'fast' && place.time !== 'slow') return '';
  const off = place.time === 'fast' ? target.timeLo - t : t - target.timeHi;
  if (off > 5) return '';                       // not in the neighbourhood yet

  const dose = num(shot.dose);
  if (dose === null) return '';
  const ceiling = basketCap();

  if (place.time === 'fast') {
    // More coffee, more resistance — but only if the basket has room.
    if (ceiling !== null && dose + 0.5 > ceiling + 0.1) return '';
    return ` This one is close enough that you have a cheaper option than the grinder: half a gram more coffee, ${fmtDose(dose + 0.5)}g instead of ${fmtDose(dose)}g, adds enough resistance to buy a few seconds${ceiling !== null ? ' and still sits inside the basket' : ''} — and it costs nothing, where a grind change costs a purge.`;
  }
  return ` This one is close enough that you have a cheaper option than the grinder: half a gram less coffee, ${fmtDose(dose - 0.5)}g instead of ${fmtDose(dose)}g, takes out enough resistance to lose a few seconds — and there is less to extract, so it should still come out well. It costs nothing, where a grind change costs a purge.`;
}

/* What the bag says about the instruction the app is about to give.

   "Sour means grind finer" is the first rule anybody learns and there
   are coffees it is wrong about. On a heavily processed lot, sour is as
   likely to be uneven extraction from a bed that is already too tight:
   one source works exactly this case on camera, finds nine bar on a
   light heavily-processed coffee, reasons that parts of the bed must be
   over-extracting while the rest barely brews, goes COARSER at the same
   yield and fixes it. An app that only knows "sour, therefore finer"
   sends that person the wrong way for a whole bag.

   Attached to the finer instruction rather than replacing it, because
   finer is still the better first guess. What it buys is the second
   guess being right. */
function finerCaveat(c) {
  if (!c) return '';
  const sol = solubility(c);
  const bits = [];
  if (sol.flags.processed) {
    bits.push(' One caution from the bag: on a lot this heavily processed, sour is as often uneven extraction as it is under-extraction. Too fine and part of the bed gives up everything while the rest hardly brews, which tastes sour and harsh at once. If finer does not fix it, try coarser at the same yield before going finer again.');
  }
  if (sol.flags.aged) {
    bits.push(' This bag has also lost the gas that gave the puck much of its resistance, which is most of why it runs fast. Grinding finer to hit a time on a stale bag mostly buys bitterness.');
  }
  if (sol.flags.decaf) {
    bits.push(' Decaf flows faster than the same coffee with its caffeine, so it will want a finer setting than you are used to — that part is expected.');
  }
  return bits.join('');
}

// Shorthands, so each advice site reads as one sentence with a hole in it.
const grindMoveLine = (shot, target, finer) => grindMoveParts(shot, target, finer).move;
const grindWhyLine = (shot, target, finer) => grindMoveParts(shot, target, finer).why;

function clockAdvice(shot, target, c) {
  const place = placeOf(shot, target);
  if (place.time === null) return null;
  const lo = Math.round(target.timeLo), hi = Math.round(target.timeHi);
  const t = num(shot.time);

  if (place.time === 'fast') {
    const off = Math.round(lo - t);
    return { sure: true, move: `Grind finer${grindMoveLine(shot, target, true)}.`,
      why: `It came in ${off}s short of the ${lo}–${hi}s window, so the water got through the puck before it had taken much with it. Finer slows it down, and it is the only variable that does.${grindWhyLine(shot, target, true)}${grindIsFor(shot, target)}${doseNudge(shot, target)}${finerCaveat(c)} Say how it tasted too: quick and bitter at once is a channel rather than a coarse grind, and finer makes it worse.` };
  }
  if (place.time === 'slow') {
    const off = Math.round(t - hi);
    return { sure: true, move: `Grind coarser${grindMoveLine(shot, target, false)}.`,
      why: `It ran ${off}s past the ${lo}–${hi}s window, so the water spent longer in the puck than the recipe asks for. Coarser speeds it up.${grindWhyLine(shot, target, false)}${grindIsFor(shot, target)}${doseNudge(shot, target)} Say how it tasted too: slow and sour at once usually means the water went round the puck rather than through it.` };
  }
  /* In the window, and nobody has said how it tastes.

     This is not a nag, it is the honest state of the board: the clock is
     the half grind controls and it is where it should be. What is left is
     the half only a mouth can answer, and it is the half that decides
     whether this is the recipe. */
  return { sure: false, move: 'The clock is right. Now taste it.',
    why: `${Math.round(t)}s is inside the ${lo}–${hi}s window, which is the part the grinder controls and the part this app can measure. Whether it is any good is the other half, and nothing but your mouth answers that. Mark it sour or bitter on the sheet and the next move gets specific; mark it neither and this is your recipe.` };
}

/* What to try next.

   Espresso has one dominant variable and it is grind, but it is dominant
   in two of the four corners, not all of them. A tool that answers
   "finer" to every sour shot is wrong half the time and confident about
   it — a sour shot that ran long is not under-extracted for want of
   grind, and telling someone to grind finer will make it worse.

   So: two corners get an instruction, two get a list and no pick, and
   the app says which kind of answer it is giving. It takes the cupping
   sheet's line on this — direction is a habit, not a verdict. */
// The shot logged immediately before this one, chronologically.
function shotBefore(c, shot) {
  const rows = (c && c.shots) || [];
  const i = rows.indexOf(shot);
  return i > 0 ? rows[i - 1] : null;
}

/* Did they already take the app's advice, and did it not work?

   The most important thing a dial-in tool can notice, and this one did
   not. Walking a whole session found it: the board said "let it run 2 to
   4g further", the yield went from 42g to 46g, the shot still tasted
   sour — and the board said "let it run 2 to 4g further" again, word for
   word, with the evidence of its own failed suggestion sitting in the
   log above it.

   The grinder calibration closes this loop for grind. Nothing closed it
   for yield. Returns the move that was made when the yield went the way
   the app asked and the wall did not shift, so the next answer can start
   by admitting the last one did not land.

   Ratio rather than grams, because the dose may have moved too and
   0.08 of a ratio is about a gram and a half on a normal dose. */
function yieldTried(c, shot, side) {
  const prev = shotBefore(c, shot);
  if (!prev || !side || side === 'neither') return null;
  if (tasteSide(prev.taste) !== side) return null;
  const r0 = ratioOf(prev), r1 = ratioOf(shot);
  if (r0 === null || r1 === null) return null;
  const want = side === 'sour' ? 1 : -1;
  if ((r1 - r0) * want < 0.08) return null;
  const g0 = num(prev.yield), g1 = num(shot.yield);
  return { from: r0, to: r1, grams: (g0 !== null && g1 !== null) ? Math.abs(g1 - g0) : null };
}

/* Has this wall shown up before, or is this one cup?

   Temperature earns a change only when a fault persists: the same slight
   acidity shot after shot, after ratio and dose have failed to shift it.
   One sour cup is not evidence about temperature, because too much else
   varies between two shots of the same coffee — the grind, the prep, the
   beans themselves. See DIALIN.md step 5. */
function wallPersists(c, side) {
  if (!c || !side || side === 'neither') return false;
  const seen = (c.shots || [])
    .filter(sh => tasteSide(sh.taste) === side)
    .length;
  return seen >= 2;
}

function suggest(shot, target, c) {
  const place = placeOf(shot, target);
  const side = tasteSide(shot.taste);
  if (side === null || place.time === null) return null;

  if (side === 'sour' && place.time === 'fast') {
    return { sure: true, move: `Grind finer${grindMoveLine(shot, target, true)}.`,
      why: `It ran short of the window and tasted sour — water moved through the puck too fast to take enough with it. Grind is the variable that fixes both at once.${grindWhyLine(shot, target, true)}${finerCaveat(c)}` };
  }
  if (side === 'bitter' && place.time === 'slow') {
    return { sure: true, move: `Grind coarser${grindMoveLine(shot, target, false)}.`,
      why: `It ran past the window and tasted bitter — water spent too long in the puck. Grind is the variable that fixes both at once.${grindWhyLine(shot, target, false)}` };
  }
  if (side === 'sour' && place.time === 'slow') {
    return { sure: false, move: 'Not grind, this time.',
      noGrind: true,
      why: `Sour and slow together do not point at grind: going finer would make it slower still.${puckOrNot(shot, target, c, false)}` };
  }
  if (side === 'bitter' && place.time === 'fast') {
    return { sure: false, noGrind: true, move: 'Not grind, this time.',
      why: `Bitter and fast together do not point at grind: going coarser would make it faster still.${puckOrNot(shot, target, c, true)}` };
  }
  // "This is the one" over a cup somebody has just called muddy is the app
  // not reading its own sheet. Both walls have to be quiet for this.
  if (side === 'neither' && place.time === 'in' && bodySide(shot.body) !== 'muddy' && bodySide(shot.body) !== 'watery') {
    // Once it has been marked, saying "mark it" is the app not reading its
    // own screen — the keeper card is pinned six inches above this line.
    return shot.verdict === 'keeper'
      ? { sure: true, move: 'Dialled in.',
          why: 'In the window and tasting of neither wall. This is the recipe at the top of the board; pull the next one to it and change nothing.' }
      : { sure: true, move: 'This is the one.',
          why: 'In the window and tasting of neither wall. Mark it as the keeper and the recipe pins to the top of this board.' };
  }
  if (side === 'neither') {
    return { sure: false, move: 'Taste says nothing is wrong.',
      why: `It is ${place.time === 'fast' ? 'faster' : 'slower'} than the window but tastes of neither wall, which is worth more than the window is. Either move the window to fit the coffee, or change the ratio and see whether the cup follows.` };
  }
  /* In the window, and still tasting of one of the walls.

     The ordering here was wrong and is now the other way round. The app
     used to tell anyone with a PID that brew temperature was the next
     variable and ratio came after it. The series says the reverse: on a
     single sour shot, reach for ratio first, and temperature is rarely
     what gets changed at all, because ratio and dose have a bigger
     effect. Temperature is for a fault that keeps coming back after
     those have failed — so it is offered on the second sighting, not the
     first, and even then as a degree at minimum rather than a nudge. */
  const persists = wallPersists(c, side);
  const yieldMove = side === 'sour'
    ? 'Let it run 2 to 4g further on the same dose: more water through the same puck takes more with it.'
    : 'Stop it 2 to 4g shorter and the harsh end of the extraction stays in the puck.';
  const ceiling = side === 'sour'
    ? ' Past about 4g you are diluting it into a different drink rather than dialling it, and the move is a lower dose instead — which is also what a light roast wants, having less to extract.'
    : ' If that leaves the cup thin, drop the dose half a gram rather than pushing the ratio further.';

  /* Temperature is not symmetric, and the app used to treat it as if it
     were — "a degree hotter" for sour, "a degree cooler" for bitter.

     Cooler is agreed on by everyone: darker roasts, heavily processed
     coffees and old coffees all want less heat, and dropping it is how
     you take harshness out. Hotter is contested. Two of the three
     sources argue against reaching for it — the view is that heat buys
     bitterness more readily than it buys the extraction you wanted, and
     that the extraction should come from yield instead. Hedrick puts it
     bluntly: yield is the number one way to increase extraction.

     So bitter and persistent gets the instruction; sour and persistent
     gets the yield, with temperature named as the second thing to try
     and the disagreement stated rather than hidden. */
  /* The yield was already moved the way the app asked, and the wall is
     still there. Saying the same thing again is the app not reading its
     own log — so this admits the last suggestion did not land, and moves
     on to the next variable rather than round the same one. */
  const tried = yieldTried(c, shot, side);
  if (tried) {
    const took = tried.grams ? `${fmtDose(tried.grams)}g` : `from 1:${tried.from.toFixed(1)} to 1:${tried.to.toFixed(1)}`;
    const e = roastEntry(c && c.roast);
    const lighter = e && e.dose <= -1;
    const next = side === 'sour'
      ? (lighter
          ? `Drop the dose half a gram instead, keeping the yield where it is now. Less coffee is less to extract, which is the same direction a lighter roast wants anyway, and it gets there without diluting the cup further.`
          : `Drop the dose half a gram instead, keeping the yield where it is now — less coffee is less to extract, and it gets there without watering the shot down any more.`)
      : `Bring the dose up half a gram instead, keeping the yield where it is. More coffee under the same water is less extraction per gram, and it does not cost you any more of the cup.`;
    const heat = canSetTemp()
      ? ` Your machine can also move ${side === 'sour' ? 'hotter' : 'cooler'} by a degree, and with the yield already spent this is the point where that is worth trying.`
      : '';
    return { sure: false, move: 'That did not land — try the dose instead.',
      // No light-roast note here: roastNote already appends one to
      // whatever move wins, and saying it twice in one card was the two
      // halves of the app talking over each other.
      why: `You already took the yield ${took} and it still tastes ${side}, so the ratio is not the answer here. ${next}${heat}` };
  }

  /* The documented exception to "ratio first, temperature on the second
     sighting".

     That ordering is right for an ordinary coffee and it was applied to
     every coffee. A tester on a seven-week-old dark Italian blend, on a
     machine that had told the app "I set it", got four rounds of ratio and
     puck advice before temperature was mentioned at all — and cooler was
     the answer. DIALIN.md is explicit that a coffee which gives up its
     solubles too easily gets cooled, and dark, aged, heavily processed and
     decaf are exactly the coffees the bag can say that about in advance.
     Where the bag has already said it, heat is not a last resort. */
  const soluble = solubility(c).shift >= 1;
  if (canSetTemp() && side === 'bitter' && soluble && !persists) {
    const sol = solubility(c);
    return { sure: false, move: 'Try it a degree cooler.',
      why: `Bitter in the window is usually a ratio question, but not on this bag: ${sol.why.join('; ')}. A coffee that gives up its solubles that readily is the one case where heat comes first, and cooler is the direction everyone agrees on. Move a whole degree; half a degree will not answer anything. ${yieldMove}${ceiling}` };
  }

  if (canSetTemp() && persists && side === 'bitter') {
    return { sure: false, move: 'Try it a degree cooler.',
      why: `That is the ${nth(countSide(c, side, shot))} shot of this coffee to taste bitter, which makes it a temperature question rather than a one-off. Cooler extracts less, and it is the reliable direction — darker roasts, heavily processed coffees and older bags all want less heat than the dial probably has. Move a whole degree; half a degree will not answer anything. ${yieldMove}${ceiling}` };
  }
  if (canSetTemp() && persists) {
    return { sure: false, move: 'More yield before more heat.',
      why: `That is the ${nth(countSide(c, side, shot))} shot of this coffee to taste sour, so it is worth doing something about rather than putting down to one cup. ${yieldMove}${ceiling} Your machine can go hotter and that will extract more, but it is the contested move: the argument against it is that heat brings bitterness on faster than it brings the sweetness you were after, and that yield is the more reliable way to get the extraction up. Try the yield first, and the temperature only if that runs out of room.` };
  }
  return { sure: false, move: 'Grind has done its job — move the yield.',
    why: `The shot is in the window and still tastes ${side}. Grind moves time, and this is the part grind does not reach, so the next variable is how much you let into the cup. ${yieldMove}${ceiling}${
      canSetTemp()
        ? ' Brew temperature comes after this, not before it: it is worth changing when a coffee tastes the same way shot after shot, and this is the first one.'
        : ' Your machine holds one temperature, so the ratio is where the work happens.'}` };
}

/* How many shots of this coffee have tasted this way, for the prose.

   Including the one being judged, which is the whole point of the
   sentence — "that is the 5th shot of this coffee to taste bitter" was
   said over the sixth, because the shot on the open sheet is not in
   c.shots until it is saved. Passed in rather than assumed, and only
   counted when it is not already in the log. */
function countSide(c, side, shot) {
  const rows = (c && c.shots) || [];
  let n = rows.filter(sh => tasteSide(sh.taste) === side).length;
  if (shot && rows.indexOf(shot) < 0 && tasteSide(shot.taste) === side) n += 1;
  return n;
}
const nth = n => (n === 2 ? 'second' : n === 3 ? 'third' : n === 4 ? 'fourth' : `${n}th`);

/* Both walls at once, which is one fault rather than two.

   Advised separately the two axes can disagree about the same variable: a
   sour, thin shot got "let it run longer" from the taste scale and "stop
   it shorter" from the body scale, stacked, both about the ratio. Two
   instructions for one shot is not advice, and a dial-in moves one thing
   at a time anyway.

   Taken together they disagree about nothing, and each pair has exactly
   one variable — a better read than either wall alone gives:

     sour + thin      under-extracted        grind finer
     bitter + heavy   over-extracted         grind coarser
     sour + heavy     the ratio is too short let it run longer
     bitter + thin    the ratio is too long  stop it shorter

   The first two move both walls with one change, which is why they are
   the corners every barista learns first. The other two are the corners
   that get people stuck, because the wall you notice sends you to the
   grinder and the grinder is not what is wrong.

   The clock still outranks the cup on the two grind answers. Finer is the
   wrong move on a shot that is already slow however it tastes, and the
   pair says so rather than repeating itself louder. */
function wallPair(shot, target, c) {
  const t = tasteSide(shot.taste);
  const b = bodySide(shot.body);
  if (t === null || b === null || t === 'neither' || b === 'neither') return null;
  const place = placeOf(shot, target);
  const r = ratioOf(shot);
  const at = r === null ? '' : ` at 1:${r.toFixed(1)}`;

  if (t === 'sour' && b === 'watery') {
    if (place.time === 'slow') {
      return { sure: false, noGrind: true, move: 'Under-extracted — but not for want of grind.',
        why: `Sour and thin is the picture of an under-extracted shot and finer is the usual answer, except this one is already past the window: finer would only make it slower.${puckOrNot(shot, target, c, false)}` };
    }
    return { sure: true, move: `Grind finer${grindMoveLine(shot, target, true)}.`,
      why: `Sour and thin together are one fault, not two — not enough came out of the puck, so the cup is sharp and weak at the same time. Finer is the single change that moves both${place.time === 'fast' ? ', and it brings the time up into the window on the way' : ''}.${grindWhyLine(shot, target, true)}${finerCaveat(c)}` };
  }
  if (t === 'bitter' && b === 'muddy') {
    if (place.time === 'fast') {
      return { sure: false, noGrind: true, move: 'Over-extracted — but not for want of grind.',
        why: `Bitter and heavy is the picture of an over-extracted shot and coarser is the usual answer, except this one is already short of the window: coarser would only make it faster.${puckOrNot(shot, target, c, true)}` };
    }
    return { sure: true, move: `Grind coarser${grindMoveLine(shot, target, false)}.`,
      why: `Bitter and heavy together are one fault, not two — too much came out of the puck, so the cup is harsh and thick with it. Coarser is the single change that moves both${place.time === 'slow' ? ', and it brings the time back into the window on the way' : ''}.${grindWhyLine(shot, target, false)}` };
  }
  /* The two ratio answers move the clock as a side effect, and on a shot
     already outside the window that reads as the app contradicting the
     line above it. It is not a contradiction — a longer ratio is meant to
     take longer — but the window has to follow, and only the person who
     set it can move it. */
  if (t === 'sour' && b === 'muddy') {
    return { sure: true, move: 'Let it run longer.',
      why: `Sour and heavy${at} is the ratio rather than the grind: the shot was stopped before the water had finished taking what it came for, so the cup is concentrated and under-extracted at once. Take the next one further — same dose, more in the cup — and both ends move together. Leave the grinder where it is.${
        place.time === 'slow' ? ' It will run longer still than the window you set, which is the window needing to move rather than the shot.' : ''}` };
  }
  return { sure: true, move: 'Stop it shorter.',
    why: `Bitter and thin${at} is the ratio rather than the grind: the last of the shot was adding water and harshness and nothing else. Stop the next one earlier — same dose, less in the cup — and both ends move together. Leave the grinder where it is.${
      place.time === 'fast' ? ' It will come in faster still than the window you set, which is the window needing to move rather than the shot.' : ''}` };
}

/* The second wall, advised on its own variables.

   Grind is not in this answer anywhere, and that is the point. A watery
   shot is not under-extracted by definition — it can be perfectly
   extracted and still thin, because thin is about how much coffee is in
   the cup, which is ratio and dose. Telling somebody to grind finer for it
   sends them to the wrong machine.

   Returns null when the cup said nothing about body, and when it said
   "neither", because a dial-in that is going to plan does not need
   narrating. */
function bodyNote(shot) {
  const side = bodySide(shot.body);
  if (side === null || side === 'neither') return null;
  const r = ratioOf(shot);
  const long = r !== null && r >= 2.4;
  const short = r !== null && r <= 1.8;

  if (side === 'watery') {
    if (long) {
      return { move: 'Stop it shorter.',
        why: `Thin at 1:${r.toFixed(1)} is a lot of water for that dose. Take the next one to 1:2 and the same coffee arrives in a smaller cup, which is most of what "more body" means.` };
    }
    if (short) {
      return { move: 'Not the ratio — the dose.',
        why: `It is already short at 1:${r.toFixed(1)} and still thin, so there is not enough coffee going in. A gram more in the basket, if the basket takes it, before anything else.` };
    }
    return { move: 'Shorter, or more in the basket.',
      why: 'Thin is about how much coffee is in the cup rather than how much came out of the puck. Stop the shot a few grams earlier, or put a gram more in — one at a time, so you can read which did it.' };
  }
  if (long) {
    return { move: 'Not the ratio — the dose.',
      why: `It is already long at 1:${r.toFixed(1)} and still heavy, which usually means more coffee in the basket than the basket wants. Drop a gram and see whether the cup opens up.` };
  }
  return { move: 'Let it run longer.',
    why: `Heavy and muddy is a concentrated cup${short ? ` — 1:${r.toFixed(1)} is a short one` : ''}. Take the next one further, a few grams more in the cup, and the same shot thins out without touching the grind.` };
}

/* What to do next, as this app is willing to say it.

   One list, so the sheet and the board cannot disagree, and at most one
   entry when the cup named both walls — that is the whole point of asking
   them separately and then reading them together. */
/* The clock standing in for the tongue.

   One wall named — the strength one — and no taste on the sheet. The body
   note alone answers it, and it used to answer it while ignoring the
   clock, which is the same half-answer this app was rightly accused of:
   a shot that drained short of the window and came out thin is not a
   ratio problem, it is the under-extraction picture, and the fix is the
   grinder.

   The clock is evidence about extraction, so where it is decisive it
   takes the place of the taste axis and the four corners resolve exactly
   as they do when somebody has tasted it. The copy says where the
   reading came from: nobody said "sour", the timer did. */
function clockPair(shot, target, c) {
  const b = bodySide(shot.body);
  if (tasteSide(shot.taste) !== null || b === null || b === 'neither') return null;
  const place = placeOf(shot, target);
  if (place.time !== 'fast' && place.time !== 'slow') return null;
  const quick = place.time === 'fast';
  const light = b === 'watery';

  if (quick && light) {
    return { sure: true, move: `Grind finer${grindMoveLine(shot, target, true)}.`,
      why: `It came in short of the window and you called it thin. Those are one fault: the water was through the puck before it had taken much with it, so there is little in the cup and it is probably sharp with it. Finer moves both, and brings the time up on the way.${grindWhyLine(shot, target, true)}${finerCaveat(c)}` };
  }
  if (!quick && !light) {
    return { sure: true, move: `Grind coarser${grindMoveLine(shot, target, false)}.`,
      why: `It ran past the window and you called it heavy. Those are one fault: the water sat in the puck taking more than it should, and what it took is all in the cup. Coarser moves both, and brings the time back on the way.${grindWhyLine(shot, target, false)}` };
  }
  if (quick && !light) {
    return { sure: true, move: 'Let it run longer.',
      why: `Short of the window and heavy is the ratio rather than the grind: the shot was stopped before the water had finished, and what it did take is packed into a small cup. Leave the grinder where it is and let it run longer.` };
  }
  return { sure: true, move: 'Stop it shorter.',
    why: `Past the window and thin is the ratio rather than the grind: the end of it was adding water and harshness and nothing else. Leave the grinder where it is and stop it shorter.` };
}

/* The dose against the basket it is going into.

   A basket is built for a weight and has perhaps a gram and a half of
   give either side. Two grams over and the puck hits the screen before
   the pump does, which channels whatever you do at the grinder; two
   under and there is space above the bed for the water to move it
   around, which channels too. Either way the grinder is the wrong
   machine to be standing at, and the app knows the basket because it
   asked once and the dose because it is on the sheet. */
// A target dose is "18g"; a measurement off a scale keeps its decimal.
const fmtDose = v => (v === null ? '—' : (Math.round(v * 10) % 10 === 0 ? String(Math.round(v)) : v.toFixed(1)));

function basketFault(shot) {
  /* Against what the basket actually holds, not what is stamped on it.
     Where the coin test has found the real figure that is the one a dose
     can be over, and the prose says which it is measuring against so the
     reader is never told their 18g basket is built for 19. */
  const want = basketCap();
  const got = num(shot && shot.dose);
  if (want === null || got === null || want <= 0) return null;
  const off = got - want;
  const basket = (kit().basket || '').trim();
  const measured = num(kit().doseFits) !== null;
  const named = basket ? `your ${basket}` : `a ${fmtDose(want)}g basket`;
  // Where the coin test found the figure, it is the authority, and saying
  // so is the difference between the app citing the hardware and the app
  // citing the reader's own measurement.
  const ceilingSaid = measured
    ? `over the ${fmtDose(want)}g you found fits${basket ? ` ${basket}` : ' it'}`
    : `over what ${named} is built for`;

  /* Over the basket's figure is a real fault and it outranks the grinder:
     the puck meets the shower screen before the pump gets going and
     channels around the edge whatever the grind is. About a gram is the
     working tolerance — this used to allow 1.6g, which was looser than
     the source it claimed. */
  if (off > 1.1) {
    return { sure: true, act: 'dose', move: `Drop the dose to about ${fmtDose(want)}g.`,
      why: `${fmtDose(got)}g is ${fmtDose(off)}g ${ceilingSaid}, and that figure is an upper limit. Overfilled, the puck meets the shower screen before the pump gets going and channels around the edge however the grinder is set, which makes the clock and the cup both untrustworthy. This one is worth fixing before anything else.` };
  }

  /* Under the basket's figure used to return a note here, and that was
     wrong twice over — found by walking a whole dial-in rather than by
     testing this function.

     basketFault is in the outranking tier, so a note returned from here
     suppressed every other piece of advice on the board. Seven shots
     into a dial-in the app had said nothing about the clock even once,
     because it was busy repeating that the dose was fine.

     Worse, it was arguing with itself: doseStart recommends going under
     the basket's figure for a lighter roast, so the app recommended
     16.5g in an 18g basket and then flagged 16.5g as underdosed. One
     half was answering the other.

     Underdosing is not a fault — the printed figure is a ceiling, and a
     low dose tastes fine — so it was never a move. It is expectation
     setting, and it belongs with the recommendation that causes it, said
     once on the start card. See renderNext. */
  return null;
}

/* The temperature is simply set wrong for the coffee.

   This is a different thing from "the shot tastes sour, try a degree
   hotter", and the dial-in episodes make the difference plain. Twice the
   fault was not a fault at all but a setting left over from the last
   coffee: 95°C carried onto a medium roast, and 88°C left on a blend
   that wanted 93. Both were caught on the first shot, and the fix in the
   second case was a five-degree jump described as transformative.

   So the trigger is not a taste that keeps coming back. It is arithmetic
   the app can do before anything is tasted: the roast level gives a
   band, the sheet gives the setting, and a setting outside the band is
   worth saying on shot one. The advice is a correction to the band's
   edge and not a nudge — the same episodes are explicit that a small
   temperature tweak is rarely the answer, and that these worked because
   they were large.

   A machine with one temperature cannot act on any of this, so it is
   never told. */
function tempFault(shot, c) {
  if (!canSetTemp() || !shot || !c) return null;
  const e = roastEntry(c.roast);
  if (!e) return null;
  const t = num(Number(shot.temp));
  if (shot.temp === '' || t === null) return null;
  if (t >= e.lo && t <= e.hi) return null;

  const hot = t > e.hi;
  const aim = hot ? e.hi : e.lo;
  const gap = Math.abs(t - aim);
  return { sure: true,
    move: `Bring the temperature ${hot ? 'down' : 'up'} to about ${Math.round(aim)}°.`,
    why: `You are brewing at ${Math.round(t)}° and a ${e.label.toLowerCase()} roast sits in ${e.tempRange}. That is ${gap < 1.5 ? 'just outside' : `${Math.round(gap)}° outside`} the band, which is the kind of thing that gets left behind by the last bag rather than chosen for this one — and it is worth fixing before reading anything else into the cup, because ${hot
      ? 'too hot extracts more than the roast wants and puts a rough, aggressive bitterness up front'
      : 'too cool cannot reach what is in the bean, and no grind setting makes up for it'}. Move the whole way, not a degree: a small temperature tweak rarely answers anything, and a correction this size can change the shot completely.` };
}

/* Turning the grinder and getting nowhere.

   The failure that wastes a whole bag: three moves in the same direction
   and the clock has barely noticed. At that point the grinder is not the
   thing in the way — the burrs are holding grounds between shots, the
   dose is wrong for the basket, or the coffee is too fresh to behave —
   and telling somebody to go finer a fourth time is the app not reading
   its own log. */
function stuckNote(c) {
  const rows = (c.shots || []).filter(x => num(x.time) !== null && x.grind !== '' && num(Number(x.grind)) !== null);
  if (rows.length < 4) return null;
  const last = rows.slice(-4);
  const steps = [];
  for (let i = 1; i < last.length; i++) {
    steps.push({ dg: Number(last[i].grind) - Number(last[i - 1].grind), dt: num(last[i].time) - num(last[i - 1].time) });
  }
  if (steps.some(x => x.dg === 0)) return null;
  const sign = Math.sign(steps[0].dg);
  if (!steps.every(x => Math.sign(x.dg) === sign)) return null;
  const moved = Math.abs(num(last[last.length - 1].time) - num(last[0].time));
  if (moved > 2.5) return null;
  const dist = Math.abs(Number(last[last.length - 1].grind) - Number(last[0].grind));
  return { sure: false, move: 'Three moves and the clock has not answered.',
    why: `The grinder has gone the same way three times, a total of ${dist % 1 === 0 ? dist : dist.toFixed(1)} on the dial, and the shot time has moved ${moved < 1 ? 'barely at all' : `${moved.toFixed(0)}s`}. Take a bigger step. A move the clock cannot see is a move that teaches you nothing, and three careful ones cost three shots and tell you less than a single decisive one: go two or three times as far as you have been going, and read what happens. If a real move still does nothing, ${retains() ? 'the burrs are probably still holding grounds from the last setting — purge five to ten grams and throw them away, then pull again' : 'your grinder holds almost nothing between settings, so it is not stale grounds — which makes it more likely the move itself was too small, or that the burrs are new and have not settled in'} — and after that, check the dose against the basket and how long ago the bag was roasted.` };
}

/* What the calendar is doing to the shot.

   Not advice on its own — a sentence appended to whatever the move is,
   because roast age does not change what to do so much as how much to
   trust what you are seeing. Fresh coffee is full of gas and runs fast
   and channels; old coffee has lost what made it worth dialling. The
   board already knows the date and said nothing about it where the
   advice is. */
function ageNote(c) {
  const age = daysSinceRoast(c);
  if (age === null) return '';
  if (age <= 3) return ` The bag is ${age === 0 ? 'roasted today' : age === 1 ? 'one day off roast' : `${age} days off roast`} and still full of gas, which runs shots fast and breaks pucks — expect it to keep moving for a few days yet, and do not chase it far with the grinder.`;
  if (age >= 45) return ` The bag is ${age} days off roast. Past about six weeks the shot goes quick and flat and no grind setting brings back what has gone; if this one is fighting you, it may be the coffee rather than the dial.`;
  return '';
}

/* One move, and the order that decides which one.

   A dial-in changes one thing at a time, so this returns one instruction
   and never a list to choose from. The order is not arbitrary — it is
   what has to be true before the next thing can be measured:

     1. the dose fits the basket        or the puck channels regardless
     2. the shot ran even, and did not  or the clock and the cup are
        taste of both walls at once      both readings of an accident
     3. the grinder is actually moving  or "finer" is the fourth wrong
                                        answer in a row
     4. the walls, the clock, the cup   the ordinary dial-in

   Each of the first three has to be settled before the readings under it
   mean anything, which is exactly why they come first. Roast age rides
   on the end of whichever move wins, because it does not change what to
   do — it changes how much to believe what you are looking at. */
function nextMove(shot, target, c) {
  const first = basketFault(shot) || runFault(shot, target) || harshFault(shot)
    || tempFault(shot, c) || (c ? stuckNote(c) : null);
  if (first) return [withAge(first, c, shot, target)];

  const pair = wallPair(shot, target, c);
  if (pair) return [withAge(pair, c, shot, target)];
  /* One wall named, and it is the body one.

     The body note is then the whole answer. Printing "Taste says nothing
     is wrong" above "the cup is thin, stop it shorter" is the app arguing
     with itself about which half of the cup counts, and the first line is
     not even true: something is wrong, it is just not on the axis grind
     works on. */
  // Body named, taste not, and a clock that is saying something: the
  // clock stands in for the taste axis and the pair resolves properly.
  const cp = clockPair(shot, target, c);
  if (cp) return [withAge(cp, c, shot, target)];
  const b = bodyNote(shot);
  if (b) return [withAge({ sure: false, move: b.move, why: b.why }, c, shot, target)];
  const t = suggest(shot, target, c);
  if (t) return [withAge(halfAnswered(t, shot), c, shot, target)];
  // No taste on the sheet: the clock still knows which way the grinder goes.
  const clock = clockAdvice(shot, target, c);
  return clock ? [withAge(clock, c, shot, target)] : [];
}

/* An answer given on half the evidence should say so.

   With one wall named and the other blank, wallPair cannot run and the
   single-axis advice takes over — and delivers a settled-looking verdict.
   A tester marked a shot sour, read "Grind has done its job — move the
   yield", then dragged the second slider to "a little thin" and watched
   the same panel become "Grind finer". The second answer is the right one
   and the reversal is honest, but the first arrived looking final, and
   somebody in a hurry acts on what they read first.

   This is the same fault as the run chips sitting below the advice they
   change, one axis down, and the same remedy: the card names the question
   that could change it. It does not hedge the instruction — the advice is
   the best available on what has been said — it says what is missing. */
function halfAnswered(tip, shot) {
  if (!tip) return tip;
  const t = tasteSide(shot && shot.taste);
  const b = bodySide(shot && shot.body);
  if (t === null || t === 'neither' || b !== null) return tip;
  /* Not where the clock has already ruled the grinder out. On a shot that
     is bitter AND fast, "coarser would make it faster still" and "the
     answer is the grinder — coarser" are the same card contradicting
     itself two sentences apart. */
  if (tip.noGrind) return tip;
  const other = t === 'sour' ? 'thin' : 'heavy';
  const instead = t === 'sour' ? 'finer' : 'coarser';
  return Object.assign({}, tip, {
    why: `${tip.why} Watery or muddy is still blank, and it is the half that decides this: if the cup is ${other} as well as ${t}, both come from the same fault and the answer is the grinder — ${instead} — rather than the yield.`,
  });
}

/* What a light roast is always going to taste like, when the complaint
   is that it tastes like that.

   The dial-in episode that finishes on a light single origin ends with
   the shot on the acidic end and says so plainly: that is the raw
   material, and the expectation of how much acidity a balanced shot will
   carry has to be realistic for the coffee. Without this the app happily
   sends somebody finer, longer and hotter for ever, chasing an acidity
   that was never going to leave.

   Only on the lighter roasts, only when the complaint is sourness, and
   only once the clock is where it should be — while the shot is still
   running fast there is a real fault to fix first. */
function roastNote(c, shot, target) {
  if (!c || !shot) return '';
  const e = roastEntry(c.roast);
  if (!e || e.dose > -1) return '';
  if (tasteSide(shot.taste) !== 'sour') return '';
  if (placeOf(shot, target).time !== 'in') return '';
  return ` And a word about the coffee: a ${e.label.toLowerCase()} roast lands on the acidic end even when it is dialled in well. Some of what you are tasting is the bean rather than the extraction, so if the next change gets it clean and sweet but still bright, that is the shot — not a step on the way to somewhere else.`;
}

// The qualifiers that ride on the end of whatever the move turned out to
// be. Neither changes what to do; both change how much to read into it.
function withAge(tip, c, shot, target) {
  let note = (c ? ageNote(c) : '') + (shot && target ? roastNote(c, shot, target) : '');
  /* Not twice in one card. The age tail is thirty words and it was landing
     on every advice state a tester saw — eleven of them, verbatim — which
     is how a reader learns to skip the last third of every card, including
     the times it is the new part. Where the advice has already reached for
     the bag's age in its own reasoning, the tail has nothing to add. */
  if (note && /six weeks/.test(tip.why)) note = note.replace(ageNote(c) || '\u0000', '');
  return note ? { ...tip, why: tip.why + note } : tip;
}

/* A tip may carry one action, and it is rendered as a button rather than
   as a sentence telling somebody to go and find a screen. Advice you can
   act on where you are reading it is the difference between a tool and a
   pamphlet; "check the dose with a coin, in Settings" is the pamphlet. */
function tipHTML(tip, cls) {
  return `<div class="${cls} ${tip.sure ? 'sure' : 'open'}">
      <span class="tip-move">${escapeHTML(tip.move)}</span>
      <span class="tip-why">${escapeHTML(tip.why)}</span>
      ${tip.act === 'dose' ? '<button type="button" class="tip-act" data-act="dose">Check the dose with a coin</button>' : ''}
      ${tip.act === 'pinch' ? '<button type="button" class="tip-act" data-act="pinch">Find a starting grind</button>' : ''}
    </div>`;
}

// Bind whatever actions the tips in a container asked for.
function bindTipActions(wrap) {
  wrap.querySelectorAll('.tip-act[data-act="dose"]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); openDoseCheck(); });
  });
  wrap.querySelectorAll('.tip-act[data-act="pinch"]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); openPinchTest(); });
  });
}

/* ---------- formatting ---------- */

const fmt1 = v => (v === null ? '—' : v.toFixed(1));
const fmt2 = v => (v === null ? '—' : v.toFixed(2));

/* What the ratio makes it. The bands are roughly agreed rather than
   defined — ristretto up to about 1:1.5, espresso through about 1:2.5,
   lungo beyond — but they are the frame the yield ceiling makes sense
   inside: past 2 to 4 grams of adjustment you are not dialling the shot
   any more, you are ordering a different drink. Null inside the espresso
   band, because naming that one on every card would be noise.

   Named against the target, not against the scale alone. The word exists
   to catch somebody who has quietly stopped dialling and started ordering
   a different drink, and that is a question about where they meant to be.
   A light roast starts around 1:2.6 in this app, which is over the lungo
   line by the bands above — so the board recommended a ratio and then
   labelled hitting it "lungo" on every card, which tells the reader
   nothing except that the app has not been introduced to itself. Where
   the shot and the target are in the same band there is nothing to say;
   where they differ, the word is the whole point. */
function ratioBand(r) {
  if (r === null || !isFinite(r)) return null;
  if (r < 1.5) return 'ristretto';
  if (r > 2.5) return 'lungo';
  return 'espresso';
}

/* The band word, but only where it is news: the shot has left the band the
   target sits in. Inside it — including a target that is itself a lungo —
   there is nothing to report. */
function bandDrift(r, targetRatio) {
  const band = ratioBand(r);
  if (band === null) return null;
  const aim = ratioBand(num(Number(targetRatio)));
  if (aim !== null && aim === band) return null;
  return band === 'espresso' ? null : band;
}

function fmtRatio(r) {
  return r === null ? '—' : `1:${r.toFixed(2)}`;
}

function fmtDelta(v, unit, digits) {
  if (v === null || v === 0) return null;
  const s = Math.abs(v).toFixed(digits === undefined ? 1 : digits);
  return `${v > 0 ? '+' : '−'}${s}${unit}`;
}

function fmtDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${time}`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- dom helpers ---------- */

const $ = sel => document.querySelector(sel);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
}

function haptic() {
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* not everywhere */ }
}

/* ---------- the number field ----------

   A stepper you can also type into. The steppers are for the common case,
   which is nudging a dose by a tenth with one wet hand; the field is for
   the case the steppers are bad at, which is 36.4 from 18. Both write to
   the same value, and the field is a real number input so the phone
   brings up a number pad.

   The buttons are 44px because a bar is not a desk. */
function numField(opts) {
  const wrap = el('div', 'num-field');
  const id = 'nf-' + Math.random().toString(36).slice(2, 8);
  /* One measurement to a row.

     These were three columns across the sheet, on the theory that the
     three numbers belong together. They do, but they do not fit: at
     390px each column came to 114px, two 44px steppers ate 88 of it, and
     the input measured *zero pixels wide* — the dose could not be typed
     on the phone this was drawn for. A row each is also how they arrive,
     one at a time off the scale and the timer. */
  wrap.innerHTML = `
    <label class="num-label" for="${id}">${escapeHTML(opts.label)}</label>
    <span class="num-value-wrap">
      <input class="num-value" id="${id}" type="text" inputmode="decimal"
             autocomplete="off" enterkeyhint="done"
             aria-describedby="${id}-unit">
      <span class="num-unit" id="${id}-unit">${escapeHTML(opts.unit)}</span>
    </span>
    <span class="num-steps">
      <button type="button" class="num-step" data-dir="-1" aria-label="Less ${escapeHTML(opts.label)}">−</button>
      <button type="button" class="num-step" data-dir="1" aria-label="More ${escapeHTML(opts.label)}">+</button>
    </span>
    <span class="num-note" id="${id}-note" role="status"></span>
  `;
  const input = wrap.querySelector('.num-value');
  let value = opts.value === null || opts.value === undefined ? null : opts.value;

  const render = () => {
    input.value = value === null ? '' : String(round(value));
    input.placeholder = opts.placeholder || '—';
    wrap.classList.toggle('empty', value === null);
  };
  const round = v => {
    const p = Math.pow(10, opts.digits || 0);
    return Math.round(v * p) / p;
  };
  const commit = v => {
    value = v === null ? null : Math.max(opts.min, Math.min(opts.max, round(v)));
    render();
    const nt = wrap.querySelector('.num-note');
    if (nt) { nt.textContent = ''; wrap.classList.remove('bad'); }
    if (opts.onChange) opts.onChange(value);
  };

  wrap.querySelectorAll('.num-step').forEach(b => {
    b.addEventListener('click', () => {
      const dir = Number(b.dataset.dir);
      // Stepping an empty field starts from where the last shot was rather
      // than from zero — a dose of 0.1g is not a thing anyone meant.
      const from = value === null ? (opts.startAt !== undefined ? opts.startAt : opts.min) : value + dir * opts.step;
      haptic();
      commit(from);
    });
  });
  /* What the field holds when the text is not a number.

     It used to hold whatever it held last. Type 43.2, select all, type
     "xyz", and `Number('xyz')` is NaN, so the handler returned early and
     left 43.2 sitting in the variable — the readout went on printing
     1:2.40 above a field reading "xyz", and Save wrote 43.2 to the log. A
     barista testing this app deleted a yield and the app recorded it
     anyway. In a product whose whole argument is that it will not print a
     number it cannot account for, that is the one bug that cannot stand.

     Out of range was the same failure wearing a politer coat: a typed 999
     was clamped to 200 on every keystroke, so the field said 999 and the
     maths said 200, and blur rewrote the field without a word.

     So: text that is not a number in range means there is no value, the
     field says which of the two it is, and the readout above goes back to
     dashes. Nothing is guessed on the reader's behalf and nothing is
     silently corrected — the text stays as typed until the person fixes
     it, because it is their typo to see. */
  const note = wrap.querySelector('.num-note');
  const setNote = msg => {
    note.textContent = msg || '';
    wrap.classList.toggle('bad', Boolean(msg));
  };
  const take = (v, msg) => {
    value = v;
    wrap.classList.toggle('empty', v === null);
    setNote(msg);
    if (opts.onChange) opts.onChange(value);
  };
  input.addEventListener('input', () => {
    const typed = input.value.trim();
    const raw = typed.replace(',', '.');
    if (raw === '') return take(null, '');
    const v = Number(raw);
    if (!isFinite(v)) {
      return take(null, `“${typed}” is not a number, so nothing is recorded here.`);
    }
    if (v < opts.min || v > opts.max) {
      return take(null, `${opts.label} takes ${opts.min} to ${opts.max}${opts.unit ? ' ' + opts.unit : ''}. Nothing is recorded until it is one of those.`);
    }
    take(round(v), '');
  });
  // Tidy up the formatting of a number that is real; leave text that is not
  // exactly where it was typed, with its note, so the typo stays visible.
  input.addEventListener('blur', () => { if (value !== null) commit(value); });

  render();
  wrap.setValue = v => { value = v; render(); };
  wrap.getValue = () => value;
  return wrap;
}

/* ---------- the anchored scale ----------

   The house notation, and it is the right one here for the same reason it
   is right on a cupping sheet: taste is a position between two named
   ends, not one of seven buttons. Anchors at both ends and the middle,
   the value under your thumb, and a track that carries the detents.

   Untouched is not a value. The knob sits at centre until somebody moves
   it, drawn hollow, and the block reads "not tasted" rather than
   "neither" — a default and a judgement are the same pixel otherwise. */
function tasteScale(opts) {
  const { value, onChange, words, low, high, labelledBy, empty } = opts;
  const wrap = el('div', 'scale');
  wrap.innerHTML = `
    <div class="scale-track" tabindex="0" role="slider"
         aria-valuemin="${TASTE_MIN}" aria-valuemax="${TASTE_MAX}"
         aria-labelledby="${labelledBy}">
      <div class="scale-rail"></div>
      <div class="scale-mid"></div>
      <div class="scale-knob"></div>
    </div>
    <div class="scale-anchors">
      <span>${low}</span><span class="scale-anchor-mid">neither</span><span>${high}</span>
    </div>
    <div class="scale-readout"></div>
  `;
  const track = wrap.querySelector('.scale-track');
  const knob = wrap.querySelector('.scale-knob');
  const readout = wrap.querySelector('.scale-readout');
  let v = typeof value === 'number' ? value : null;

  const render = () => {
    const shown = v === null ? 0 : v;
    const pct = ((shown - TASTE_MIN) / (TASTE_MAX - TASTE_MIN)) * 100;
    knob.style.left = `${pct}%`;
    knob.classList.toggle('untouched', v === null);
    track.setAttribute('aria-valuenow', shown);
    track.setAttribute('aria-valuetext', v === null ? empty : words(v));
    readout.textContent = v === null ? empty : words(v);
    readout.classList.toggle('untouched', v === null);
  };

  const setFromX = clientX => {
    const r = track.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const next = Math.round(TASTE_MIN + frac * (TASTE_MAX - TASTE_MIN));
    if (next !== v) { v = next; haptic(); render(); onChange(v); }
    else if (v === null) { v = next; render(); onChange(v); }
  };

  let dragging = false;
  track.addEventListener('pointerdown', e => {
    dragging = true;
    track.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  });
  track.addEventListener('pointermove', e => { if (dragging) setFromX(e.clientX); });
  track.addEventListener('pointerup', () => { dragging = false; });
  track.addEventListener('pointercancel', () => { dragging = false; });

  track.addEventListener('keydown', e => {
    let next = null;
    const from = v === null ? 0 : v;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = from - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = from + 1;
    else if (e.key === 'Home') next = TASTE_MIN;
    else if (e.key === 'End') next = TASTE_MAX;
    else return;
    e.preventDefault();
    v = Math.max(TASTE_MIN, Math.min(TASTE_MAX, next));
    render();
    onChange(v);
  });

  render();
  return wrap;
}

/* ============================================================
   THE BOARD
   ============================================================ */

function renderBoard() {
  const c = activeCoffee();
  $('#coffee-name').textContent = coffeeLabel(c);
  $('#coffee-sub').textContent = c
    ? `${c.shots.length} shot${c.shots.length === 1 ? '' : 's'}${c.roaster ? ` · ${c.roaster}` : ''}`
    : 'tap to add one';

  /* No dead control on the front door.

     This button was disabled until a coffee existed, which made the one
     thing a first-time visitor has to do the one thing the screen greys
     out — and a 45%-opacity label is under 4.5:1 in both themes, carried
     only by WCAG's exemption for inactive components. A button that does
     the next thing needs no exemption. */
  const logBtn = $('#btn-log');
  logBtn.textContent = c ? 'Log a shot' : 'Add a coffee';
  logBtn.disabled = false;

  renderKeeper(c);
  renderNext(c);
  renderTarget(c);
  renderShots(c);
}

/* The answer, where an answer belongs.

   The next move used to be the last line of the newest shot card, under
   the numbers, the window, the deltas and the taste pips — a footnote on
   a record, in a product whose entire reason to exist is telling you what
   to change. A dial-in is a question ("what do I do now?") and this is the
   app's answer to it, so it goes at the top of the board in its own card.

   It is not duplicated on the card below. One answer, one place.

   When a recipe is pinned the keeper card above is the answer, and this
   one only speaks if the newest shot has drifted off it. */
function renderNext(c) {
  const wrap = $('#next-card');
  if (!c) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }

  const newest = shotsNewestFirst(c)[0];

  /* Before the first shot, the guidance is where to start.

     The board said "pull one and put four numbers in", which tells a
     beginner what to type and nothing about what to do at the machine.
     The dose comes from the basket they told us about, the ratio from the
     roast if they picked one, and the grind gets the only honest
     instruction there is: your grinder's numbers mean nothing to anyone
     else, so aim at the window and move from there. */
  if (!newest) {
    const t = c.target;
    /* The dose comes from the basket and the roast together, because
       extraction is work and a light roast cannot do as much of it. The
       basket's figure is the ceiling; this decides where inside its range
       to start. */
    /* The target is the authority here, not a second opinion beside it.

       This used to read doseStart(c) ?? t.dose, which meant the bold line
       recommended one dose while the AIMING AT row directly beneath it
       showed another and the shot sheet pre-filled a third. The roast now
       sets the target dose in the coffee sheet, where the change is
       visible and can be overridden, and every surface reads that one
       number. */
    const start = num(t.dose) ?? doseStart(c) ?? basketCap();
    const out = Math.round(start * t.ratio);
    const e = roastEntry(c.roast);
    const cap = basketCap();
    const measured = num(kit().doseFits) !== null;
    const under = cap !== null && start !== null && start < cap - 0.2;
    /* The sentence has to name the roast it is actually talking about.
       It was written for light roasts and fired for medium ones too,
       which had the card telling somebody with a medium roast about what
       a light roast does in a full basket. */
    /* Kept short on purpose. This had reached 216 words and 533px —
       nearly two thirds of the screen — because four separate commits
       each added one more true and useful sentence to it. Every one of
       them was worth saying and the paragraph was no longer worth
       reading. The detail lives in the pinch-test sheet and the help;
       this is the instruction. */
    const why = under && e && e.dose < 0
      ? ` That is under the ${fmtDose(cap)}g ${measured ? 'you found fits the basket' : 'on the basket'} because a ${e.label.toLowerCase()} roast is harder to extract, and less coffee is less work. Expect the puck to blow apart at the end — messy, harmless.`
      : '';
    wrap.className = 'next-card';
    wrap.innerHTML = `
      <span class="next-label">Where to start</span>
      <div class="tip open">
        <span class="tip-move">${fmtDose(start)}g in, about ${out}g out, in ${Math.round(t.timeLo)}–${Math.round(t.timeHi)} seconds.</span>
        <span class="tip-why">Start on the coarse side and come finer — a coarse bed flows more evenly, so the shot teaches you more than a choked one does. Then let the clock tell you which way to move.${why} If it gushes out in ten seconds, do not bother tasting it; fix the flow first.</span>
        <button type="button" class="tip-act" data-act="pinch">Find a starting grind</button>
      </div>`;
    bindTipActions(wrap);
    return;
  }

  const tips = nextMove(newest, c.target, c);
  if (!tips.length) {
    // Nothing to say is still worth saying, when what is missing is one tap
    // away. The clock covers most of this now; this is the case with no
    // time on the sheet at all.
    wrap.className = 'next-card';
    wrap.innerHTML = `
      <span class="next-label">Next</span>
      <div class="tip open">
        <span class="tip-move">Add the time to that shot.</span>
        <span class="tip-why">How long it ran is the number this app reasons from: it is what the grinder changes, and it is what decides whether "finer" or "coarser" is the right answer. Tap the shot above and put it in.</span>
      </div>`;
    return;
  }

  wrap.className = 'next-card';
  wrap.innerHTML = `<span class="next-label">Next</span>`
    + tips.map(t => tipHTML(t, 'tip')).join('');
  bindTipActions(wrap);
}

/* The keeper.

   A dial-in ends when one shot is worth repeating, and that shot is the
   only output the whole board has. It pins to the top so the next person
   on the bar reads it without scrolling a log they were not there for. */
function renderKeeper(c) {
  const wrap = $('#keeper');
  const keeper = c && c.shots.filter(s => s.verdict === 'keeper').slice(-1)[0];
  wrap.classList.toggle('hidden', !keeper);
  if (!keeper) return;
  const r = ratioOf(keeper);
  const ey = extractionOf(keeper);
  const age = daysSinceRoast(c);
  const offset = (() => {
    const was = Number(keeper.grind), now = Number(c.grindNow);
    if (!isFinite(was) || !isFinite(now) || !c.grindNow || !keeper.grind) return null;
    const d = now - was;
    return d === 0 ? null : d;
  })();

  wrap.innerHTML = `
    <span class="keeper-label">The recipe</span>
    <div class="keeper-line">
      <span class="keeper-big">${fmt1(num(keeper.dose))}<small>g in</small></span>
      <span class="keeper-arrow" aria-hidden="true">→</span>
      <span class="keeper-big">${fmt1(num(keeper.yield))}<small>g out</small></span>
      <span class="keeper-big">${keeper.time === null ? '—' : Math.round(keeper.time)}<small>sec</small></span>
    </div>
    <div class="keeper-meta">${fmtRatio(r)}${keeper.grind ? ` · grind ${escapeHTML(String(keeper.grind))}` : ''}${
      keeper.temp ? ` · ${escapeHTML(String(keeper.temp))}°` : ''}${
      ey !== null ? ` · ${fmt1(ey)}% extraction` : ''}</div>
    ${/* The recipe is not rewritten as the coffee ages. Beans degas, the
          same setting starts running faster, and the answer is a small
          move on the grinder — not a new recipe. So the dialled-in figure
          above stays exactly as it was found, and where the grinder is
          sitting today is recorded beside it, as a distance from it. */ ''}
    <button class="keeper-now" id="btn-grind-now" type="button">
      <span class="keeper-now-label">Grinder today</span>
      <span class="keeper-now-value">${c.grindNow
        ? `${escapeHTML(String(c.grindNow))}${offset !== null ? ` · ${offset > 0 ? '+' : '−'}${Math.abs(offset).toFixed(1)} from the recipe` : ' · on the recipe'}`
        : 'same as the recipe'}</span>
    </button>
    ${age !== null ? `<div class="keeper-age">${age === 0 ? 'Roasted today' : age === 1 ? 'One day off roast' : `${age} days off roast`}${
      age > 0 && age < 4 ? ' — still degassing, so expect it to move.' : ''}</div>` : ''}
  `;
  const nowBtn = wrap.querySelector('#btn-grind-now');
  if (nowBtn) nowBtn.addEventListener('click', () => openGrindNow(c, keeper));
}

/* Whether the target still describes something other than the recipe.

   A board that has declared a keeper and still says "aiming at 1:2.6 ·
   19.0g" is showing two answers to one question, and a first-run test read
   it as the app failing to notice what it had just concluded. The target is
   not wrong — it is where you were aiming, and you landed a little past it
   — but once there is a recipe, the aim is a loose end rather than a plan,
   and the reader should be able to close it in one tap. */
function targetDrift(c) {
  const keeper = c && c.shots.filter(s => s.verdict === 'keeper').slice(-1)[0];
  if (!keeper) return null;
  const r = ratioOf(keeper), d = num(keeper.dose), t = num(keeper.time);
  if (r === null || d === null) return null;
  const ratio = Math.round(r * 10) / 10;
  const off = Math.abs(ratio - num(c.target.ratio)) >= 0.05
    || Math.abs(d - num(c.target.dose)) >= 0.05
    || (t !== null && (t < c.target.timeLo || t > c.target.timeHi));
  if (!off) return null;
  return { keeper, ratio, dose: d, time: t };
}

function renderTarget(c) {
  const wrap = $('#target-card');
  wrap.classList.toggle('hidden', !c);
  if (!c) { wrap.innerHTML = ''; return; }
  const t = c.target;
  const drift = targetDrift(c);
  wrap.innerHTML = `
    <button class="target-btn" id="btn-target">
      <span class="target-label">Aiming at</span>
      <span class="target-value">1:${t.ratio} · ${t.timeLo}–${t.timeHi}s · ${fmt1(t.dose)}g${t.temp && canSetTemp() ? ` · ${t.temp}°` : ''}</span>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    ${drift ? `<button class="target-adopt" id="btn-adopt" type="button">Aim at the recipe instead — ${fmtDose(drift.dose)}g, 1:${drift.ratio}${
      drift.time === null ? '' : `, ${Math.round(drift.time)}s`}</button>` : ''}
  `;
  wrap.querySelector('#btn-target').addEventListener('click', () => openEdit(c));
  const adopt = wrap.querySelector('#btn-adopt');
  if (adopt) adopt.addEventListener('click', () => {
    /* The window around the keeper's own time rather than the keeper's time
       exactly: a target of "22s" is a target nobody hits twice, and the
       board judges every later shot against this. Three seconds either
       side is about the spread of a well-behaved machine. */
    c.target.dose = drift.dose;
    c.target.ratio = drift.ratio;
    if (drift.time !== null) {
      c.target.timeLo = Math.max(5, Math.round(drift.time) - 3);
      c.target.timeHi = Math.round(drift.time) + 3;
    }
    save();
    haptic();
    renderBoard();
    toast('The recipe is the target now');
  });
}

function renderShots(c) {
  const list = $('#shots');
  list.innerHTML = '';
  const has = c && c.shots.length;
  const empty = $('#empty');
  empty.classList.toggle('hidden', Boolean(has));
  if (!has) {
    /* Three different empty screens, because they are three different
       problems. Nobody has said what they are standing in front of; there
       is no bag on the shelf; there is a bag and no shots. The card used
       to give one answer to all of them.

       The kit comes first because it changes what the shot sheet asks for,
       and answering it after four shots means four sheets asked for the
       wrong things. */
    if (!kit().asked) {
      empty.innerHTML = `
        <div class="empty-title">What are you pulling on?</div>
        <p class="empty-body">A handful of questions about your machine and grinder, once. The shot sheet is built from the answers: there is no point in a temperature field on a machine with one temperature, and no point in advice that tells you to raise it.</p>
        <button type="button" class="btn btn-primary" id="btn-kit-start">Set up my kit</button>
        <button type="button" class="btn btn-ghost" id="btn-kit-later">Skip — most machines are the default</button>
        <p class="empty-foot">Everything stays on this device. No account, no upload, works with no signal.</p>`;
      empty.querySelector('#btn-kit-start').addEventListener('click', openKit);
      empty.querySelector('#btn-kit-later').addEventListener('click', () => {
        state.kit = Object.assign(defaultKit(), { asked: true });
        save();
        renderBoard();
      });
      return;
    }
    /* A coffee with no shots needs no empty state.

       The "Where to start" card at the top of the board already says what
       to do, with the dose and the window in it; "pull one and put four
       numbers in" underneath was a weaker version of the same sentence
       taking half a screen. The other two cases are genuinely different
       situations and keep theirs. */
    if (c) { empty.classList.add('hidden'); empty.innerHTML = ''; return; }
    empty.innerHTML = `<div class="empty-title">Nothing on the shelf</div>
         <p class="empty-body">Add the bag you are dialling in and this becomes its board — every shot, what changed between them, and the recipe you settle on.</p>
         <p class="empty-foot">Everything stays on this device. No account, no upload, works with no signal.</p>`;
    return;
  }

  const rows = shotsNewestFirst(c);
  rows.forEach((shot, i) => {
    // the shot before this one in time, which is what "changed" means
    const prev = rows[i + 1] || null;
    // The advice is not on these cards at all — it is one card, at the top
    // of the board, about the next shot. See renderNext.
    list.appendChild(shotCard(shot, prev, c, rows.length - i));
  });
}

function shotCard(shot, prev, c, n) {
  const card = el('div', 'log-card');
  const r = ratioOf(shot);
  const flow = flowOf(shot);
  const ey = extractionOf(shot);
  const place = placeOf(shot, c.target);
  const missing = missingFields(shot);

  if (shot.verdict === 'keeper') card.classList.add('is-keeper');
  if (missing.length) card.classList.add('is-partial');

  /* What moved since the last shot.

     This line is the reason the app is a log rather than a list. A column
     of numbers makes you do the subtraction in your head between one wet
     hand and a cooling shot; the subtraction is the finding. */
  const diffs = [];
  if (prev) {
    const g = (a, b) => (num(a) !== null && num(b) !== null ? a - b : null);
    const dGrind = g(Number(shot.grind), Number(prev.grind));
    if (dGrind !== null && dGrind !== 0) diffs.push(`grind ${fmtDelta(dGrind, '', 1)}`);
    const dDose = g(shot.dose, prev.dose);
    if (dDose) diffs.push(`${fmtDelta(dDose, 'g in')}`);
    const dYield = g(shot.yield, prev.yield);
    if (dYield) diffs.push(`${fmtDelta(dYield, 'g out')}`);
    const dTime = g(shot.time, prev.time);
    if (dTime) diffs.push(`${fmtDelta(dTime, 's', 0)}`);
    const dTemp = g(Number(shot.temp), Number(prev.temp));
    if (dTemp) diffs.push(`${fmtDelta(dTemp, '°', 0)}`);
  }

  const timeClass = place.time === 'in' ? 'in' : place.time === null ? '' : 'out';
  const timeNote = place.time === null ? ''
    : place.time === 'in' ? 'in the window'
    : place.time === 'fast' ? `${Math.round(c.target.timeLo - shot.time)}s fast`
    : `${Math.round(shot.time - c.target.timeHi)}s slow`;

  card.innerHTML = `
    <div class="log-top">
      <span class="log-n">${n}</span>
      <span class="log-headline">
        <span class="log-ratio">${fmtRatio(r)}</span>
        <span class="log-time ${timeClass}">${shot.time === null ? '—' : Math.round(shot.time) + 's'}</span>
      </span>
      <span class="log-when">${fmtDate(shot.at)}</span>
    </div>
    <div class="log-numbers">
      ${num(shot.dose) === null ? '—' : `${fmt1(num(shot.dose))}<small>g</small>`} <span aria-hidden="true">→</span> ${
        num(shot.yield) === null ? '—' : `${fmt1(num(shot.yield))}<small>g</small>`}
      ${flow !== null ? ` · ${fmt2(flow)}<small>g/s</small>` : ''}
      ${ey !== null ? ` · ${fmt1(ey)}<small>% EY</small>` : ''}
      ${num(Number(shot.grind)) !== null && shot.grind !== '' ? ` · grind ${escapeHTML(String(shot.grind))}<small>${escapeHTML(grindUnit() === 'clicks' ? ' clicks' : '')}</small>` : ''}
    </div>
    ${missing.length ? `<div class="log-missing">${escapeHTML(missingLine(missing))}</div>` : ''}
    ${timeNote ? `<div class="log-place ${timeClass}">${timeNote}</div>` : ''}
    ${diffs.length ? `<div class="log-diff">${escapeHTML(diffs.join(' · '))}</div>` : ''}
    ${shot.harsh ? '<div class="log-run">Sour and bitter at once</div>' : ''}
    ${shot.run && shot.run !== 'even' ? `<div class="log-run">${escapeHTML((runEntry(shot.run) || {}).label || '')}</div>` : ''}
    ${shot.intent ? `<div class="log-intent">aim: ${escapeHTML((intentEntry(shot.intent) || {}).label || '')}</div>` : ''}
    ${twoVariables(shot, prev) ? `<div class="log-mismatch">${escapeHTML(twoVariables(shot, prev))}</div>` : ''}
    ${intentCheck(shot, prev) ? `<div class="log-mismatch">${escapeHTML(intentCheck(shot, prev))}</div>` : ''}
    ${shot.taste !== null ? `<div class="log-taste">${tasteMarks(shot.taste)}<span>${escapeHTML(tasteWord(shot.taste))}</span></div>` : ''}
    ${shot.body !== null && typeof shot.body === 'number' ? `<div class="log-taste">${tasteMarks(shot.body)}<span>${escapeHTML(bodyWord(shot.body))}</span></div>` : ''}
    ${shot.notes ? `<div class="log-notes">${escapeHTML(shot.notes)}</div>` : ''}
    ${shot.verdict === 'keeper' ? '<div class="log-keeper-flag">the keeper</div>' : ''}
  `;
  card.addEventListener('click', () => openShot(shot));
  return card;
}

/* Which measurement is absent, and what that costs.

   A dash on its own makes the reader work out why. This names the missing
   measurement and the figure that could not be built from it, because the
   fix is one tap away and the reader is the person who can make it. */
function missingLine(missing) {
  const lost = [];
  if (missing.includes('dose') || missing.includes('yield')) lost.push('ratio');
  if (missing.includes('yield') || missing.includes('time')) lost.push('flow');
  if (missing.length === 3) return 'Nothing recorded on this shot yet.';
  const names = missing.length === 2 ? `${missing[0]} and no ${missing[1]}` : missing[0];
  const cost = lost.length === 2 ? 'ratio and no flow' : lost[0];
  return `No ${names} recorded, so this shot has no ${cost}.`;
}

/* The next move used to render here, as the last line of the newest shot
   card. It has its own card at the top of the board now — see renderNext.
   A footnote on a record is not where a dial-in puts its answer. */

// A seven-step run of pips with the taken one filled — the position is the
// meaning, exactly as on the scale that produced it.
function tasteMarks(v) {
  let out = '<span class="taste-marks" aria-hidden="true">';
  for (let i = TASTE_MIN; i <= TASTE_MAX; i++) {
    out += `<i class="${i === v ? 'on' : ''}${i === 0 ? ' mid' : ''}"></i>`;
  }
  return out + '</span>';
}

/* ============================================================
   THE SHOT SHEET
   ============================================================ */

let editing = null;      // the shot being edited, or a fresh one
let editingIsNew = false;
/* The settings as they were carried onto a fresh sheet, so a change to
   one can be told from the copy that arrived by itself. See
   shotHasContent. */
let carriedSeed = '';

function openShot(shot) {
  const c = activeCoffee();
  if (!c) return;
  const last = c.shots[c.shots.length - 1] || null;

  editingIsNew = !shot;
  editing = shot || {
    id: uid(),
    at: Date.now(),
    // A dial-in holds the dose still and moves the grind, so the dose
    // carries over and the two numbers you actually read off the bar
    // start empty. Prefilling those would be putting the last shot's
    // measurement under this shot's heading.
    dose: last ? num(last.dose) : c.target.dose,
    yield: null,
    time: null,
    taste: null,
    body: null,
    verdict: null,
    intent: null,
    // How it looked coming out. Not carried over: it is an observation of
    // one shot, and the last shot's is not evidence about this one.
    run: null,
    // Sour and bitter in the same sip, which is not a point on the
    // sour-to-bitter axis but a statement that the axis does not apply.
    harsh: false,
    // where the grinder is as far as anyone has said, which is the board's
    // "grinder today" when it is set and the last shot otherwise
    grind: grindStart(c),
    temp: last ? last.temp : '',
    press: last ? last.press : '',
    basket: last ? last.basket : (kit().basket || ''),
    notes: '',
    tds: null,
  };
  if (editing.grind === undefined) editing.grind = '';
  carriedSeed = carriedOf(editing);

  $('#shot-title').textContent = editingIsNew ? 'This shot' : `Shot ${c.shots.indexOf(shot) + 1}`;
  /* Remove this shot.

     There was no way to. A mis-logged shot is not a small problem in a
     log whose whole purpose is the line "what changed since the last
     one": it sits in the history for ever and skews the next card's
     arithmetic. It only appears on a shot that exists — there is nothing
     to delete on a sheet nobody has saved yet. */
  const del = $('#shot-delete');
  del.classList.toggle('hidden', editingIsNew);
  del.onclick = () => {
    const i = c.shots.indexOf(shot);
    if (i < 0) return;
    if (!confirm(`Remove shot ${i + 1}? It goes out of the log and out of the comparison with the shots either side of it. There is no undo.`)) return;
    c.shots.splice(i, 1);
    save();
    closeModal('#shot-modal');
    renderBoard();
    toast('Shot removed');
  };
  buildShotSheet(c);
  openModal('#shot-modal');
}

/* Has anything been put on this sheet?

   Used to decide whether closing it costs the person anything. The X used
   to throw away a fully typed shot without a word. */
/* Carried over rather than typed: these arrive on a fresh sheet from the
   last shot, because a dial-in holds them still and moves one thing. So
   their presence is not somebody's work — but a change to one is. */
const CARRIED = ['dose', 'grind', 'temp', 'press', 'basket'];
const carriedOf = sh => JSON.stringify(CARRIED.map(k => (sh ? sh[k] : null)));

function shotHasContent() {
  if (!editing) return false;
  /* Dose used to be counted as content outright. It is prefilled on every
     new sheet, so every new sheet claimed to have something on it, and
     closing one you had not touched asked whether you wanted to throw
     away work that did not exist — which is how a confirm dialog gets
     trained out of a person before the one that matters arrives. */
  const typed = ['yield', 'time', 'taste', 'body', 'verdict', 'intent', 'run', 'harsh', 'notes', 'tds']
    .some(k => editing[k] !== null && editing[k] !== '' && editing[k] !== undefined);
  return typed || carriedOf(editing) !== carriedSeed;
}

function closeShotSheet() {
  if (editingIsNew && shotHasContent()
      && !confirm('Close without saving? What you have put on this sheet goes with it.')) return;
  closeModal('#shot-modal');
}

function buildShotSheet(c) {
  const row = $('#num-row');
  row.innerHTML = '';
  /* The numbers feed the verdict row as well as the readout: the keeper
     chip unblocks the moment a yield is typed, without a save and reopen. */
  const refresh = () => { buildVerdict(c); renderReadout(c); };

  row.appendChild(numField({
    label: 'In', unit: 'g', value: editing.dose, min: 0, max: 60, step: 0.1, digits: 1,
    startAt: c.target.dose, onChange: v => { editing.dose = v; refresh(); },
  }));
  row.appendChild(numField({
    label: 'Out', unit: 'g', value: editing.yield, min: 0, max: 200, step: 0.5, digits: 1,
    startAt: Math.round(c.target.dose * c.target.ratio), onChange: v => { editing.yield = v; refresh(); },
  }));
  row.appendChild(numField({
    label: 'Time', unit: 's', value: editing.time, min: 0, max: 180, step: 1, digits: 0,
    startAt: c.target.timeLo, onChange: v => { editing.time = v; refresh(); },
  }));
  /* Grind belongs here, not behind a disclosure.

     It was in the "and the rest" drawer with basket and notes, which is
     the wrong shelf for the one number a dial-in is about: a barista
     testing this could not answer "where was the grinder when that one was
     good?" from the board, because the setting was collapsed on the sheet
     and never printed on the card — only the delta was, which tells you it
     moved 0.6 and not what it moved to.

     It is a stepper rather than a text field because the gesture it
     records is "one click finer", and because the deltas on the cards were
     already doing arithmetic on it. The unit comes from the kit: clicks on
     a stepped grinder, a dial reading on a stepless one. Neither number
     means anything to anybody else, which is why the app only ever suggests
     a direction and never a value. */
  const stepped = kit().steps === 'stepped';
  row.appendChild(numField({
    // No unit in the slot: a grind setting has none, and "clicks" does not
    // fit a 16px gutter — it overlapped the stepper it sat beside. The word
    // belongs in the prose, where it is doing work.
    label: 'Grind', unit: '', value: num(editing.grind),
    min: 0, max: 100, step: stepped ? 1 : 0.1, digits: stepped ? 0 : 1,
    startAt: grindStart(c), onChange: v => { editing.grind = v; refresh(); },
  }));

  // Two walls, two questions. Asked separately because they are answered
  // separately: grind for one, ratio and dose for the other.
  buildTaste(c);
  const body = $('#body-scale');
  body.innerHTML = '';
  body.appendChild(tasteScale({
    value: editing.body, words: bodyWord, low: 'watery', high: 'muddy',
    labelledBy: 'body-label', empty: 'not said yet',
    onChange: v => { editing.body = v; renderReadout(c); },
  }));

  buildIntent(c);
  buildHarsh(c);
  buildRun(c);
  buildVerdict(c);
  buildMore(c);
  renderReadout(c);
}

/* Where the grinder is, as far as this app knows.

   Two sources of truth used to answer this: the board's "grinder today",
   which is where somebody said they had moved it to, and the last shot's
   grind. A new sheet prefilled from the second and ignored the first, so
   a barista who had just told the app the grinder was at 5.0 was offered
   4.2. The one somebody stated most recently wins. */
function grindStart(c) {
  const now = num(Number(c.grindNow));
  if (c.grindNow !== '' && now !== null) return now;
  const last = shotsNewestFirst(c)[0];
  const prev = last ? num(Number(last.grind)) : null;
  return prev === null ? undefined : prev;
}

/* Stated before the numbers, because that is when you know it. */
/* The shot this one is being compared against, or null when there is not
   one yet. The intent row and the readout need the same answer. */
function prevShotOf(c) {
  const rows = shotsNewestFirst(c);
  return editingIsNew ? (rows[0] || null) : (rows[rows.indexOf(editing) + 1] || null);
}

function buildIntent(c) {
  const wrap = $('#intent');
  if (!wrap) return;
  wrap.innerHTML = '';

  /* "What are you changing?" needs something to be changing from. On the
     first shot of a coffee every answer here is unanswerable — finer than
     what? — and "Same again" is a claim about a shot that does not exist.
     The row leaves the sheet until there is a shot behind this one. */
  const block = wrap.closest('.intent-block');
  const prev = prevShotOf(c);
  if (block) block.classList.toggle('hidden', !prev);
  if (!prev) { editing.intent = null; return; }

  // "Hotter" is not an intention on a machine with one temperature, and
  // offering it invites somebody to record a change they did not make.
  INTENTS.filter(i => i.field !== 'temp' || canSetTemp()).forEach(i => {
    const on = editing.intent === i.key;
    const b = el('button', 'chip' + (on ? ' on' : ''), escapeHTML(i.label));
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.addEventListener('click', () => {
      editing.intent = on ? null : i.key;
      haptic();
      buildIntent(c);
      renderReadout(c);
    });
    wrap.appendChild(b);
  });
}

/* The sour–bitter scale.

   Its own function because the chip underneath it can supersede it, and
   the screen has to say so. With "sour and bitter at once" set, the scale
   read "not tasted yet" directly above a chip the reader had just turned
   black — the app telling them they had not tasted a shot they had just
   described. The finding is recorded either way; it looked broken. */
function buildTaste(c) {
  const taste = $('#taste-scale');
  if (!taste) return;
  const both = Boolean(editing.harsh);
  taste.innerHTML = '';
  taste.classList.toggle('scale-superseded', both && editing.taste === null);
  taste.appendChild(tasteScale({
    value: editing.taste, words: tasteWord, low: 'sour', high: 'bitter',
    labelledBy: 'taste-label',
    empty: both ? 'both at once — this scale does not apply' : 'not tasted yet',
    onChange: v => { editing.taste = v; renderReadout(c); },
  }));
}

/* The "both at once" chip.

   Not a point on the scale above it — a statement that the scale does
   not apply. A shot that is sharp and harsh in the same sip has not
   landed somewhere between sour and bitter; part of the bed gave up too
   much while the rest gave up almost nothing, and averaging that into a
   position on one axis throws away the finding. */
function buildHarsh(c) {
  const wrap = $('#harsh');
  if (!wrap) return;
  wrap.innerHTML = '';
  const on = Boolean(editing.harsh);
  const b = el('button', 'chip' + (on ? ' on' : ''), 'Sour and bitter at once');
  b.type = 'button';
  b.setAttribute('role', 'checkbox');
  b.setAttribute('aria-checked', on ? 'true' : 'false');
  b.addEventListener('click', () => {
    editing.harsh = !on;
    haptic();
    buildHarsh(c);
    // The scale above has to agree with the chip below it.
    buildTaste(c);
    renderReadout(c);
  });
  wrap.appendChild(b);
}

/* The run chips. Tapping the chosen one again clears it, because an
   observation nobody made is not "it ran even". */
function buildRun(c) {
  const wrap = $('#run');
  if (!wrap) return;
  wrap.innerHTML = '';
  runOptions().forEach(r => {
    const on = editing.run === r.key;
    const b = el('button', 'chip' + (on ? ' on' : ''), escapeHTML(r.label));
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.title = r.sub;
    b.addEventListener('click', () => {
      editing.run = on ? null : r.key;
      haptic();
      buildRun(c);
      renderReadout(c);
    });
    wrap.appendChild(b);
  });
}

const VERDICTS = [
  { key: 'off', label: 'Off', sub: 'not drinkable' },
  { key: 'ok', label: 'Drinkable', sub: 'not there yet' },
  { key: 'keeper', label: 'The one', sub: 'this is the recipe' },
];

/* What a shot is missing before it can be called the recipe.

   A recipe is a thing you hand to somebody so they can repeat it, and you
   cannot repeat "18g in, — out". A first-run test saved a shot with no
   yield, watched the log say so in as many words — "No yield recorded, so
   this shot has no ratio and no flow" — and then marked it The one. The
   board printed THE RECIPE: 18.0g in → —g out, under the heading
   "Dialled in. Pull the next one to it and change nothing." Pull it to
   what? The app knew the shot was incomplete in one place and promoted it
   in another. */
function keeperMissing(shot) {
  const want = [];
  if (num(shot && shot.dose) === null) want.push('a dose');
  if (num(shot && shot.yield) === null) want.push('a yield');
  if (num(shot && shot.time) === null) want.push('a time');
  return want;
}

function buildVerdict(c) {
  const wrap = $('#verdict');
  wrap.innerHTML = '';
  const missing = keeperMissing(editing);
  VERDICTS.forEach(v => {
    const blocked = v.key === 'keeper' && missing.length > 0;
    /* Not hidden, and not silently inert. A control that is there and does
       nothing is the same lie as the pinch-test cards were: it says what
       it needs and comes back the moment it has it. */
    const sub = blocked ? `needs ${listWords(missing)}` : v.sub;
    const b = el('button', 'verdict-btn' + (editing.verdict === v.key ? ' on' : '') + (blocked ? ' is-blocked' : ''),
      `<span class="verdict-label">${v.label}</span><span class="verdict-sub">${escapeHTML(sub)}</span>`);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', editing.verdict === v.key ? 'true' : 'false');
    if (blocked) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', () => {
      if (blocked) {
        haptic();
        toast(`A recipe needs ${listWords(missing)} — fill ${missing.length === 1 ? 'it' : 'them'} in and this comes back`);
        return;
      }
      // tapping the chosen one again clears it: a verdict you did not give
      // is not "off"
      editing.verdict = editing.verdict === v.key ? null : v.key;
      haptic();
      buildVerdict(c);
      renderReadout(c);
    });
    wrap.appendChild(b);
  });
}

// "a yield", "a yield and a time", "a dose, a yield and a time"
function listWords(xs) {
  if (xs.length <= 1) return xs[0] || '';
  return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
}

/* The drawer holds what your machine can change, and nothing else.

   A brew temperature field on a machine with one brew temperature is an
   invitation to write down a number you did not set, and the app then
   quotes it back at you as though it were a decision. Same for pressure.
   The kit says which of these exist; see defaultKit. */
function buildMore(c) {
  const body = $('#more-body');
  const summary = $('#more > summary');
  if (summary) {
    const bits = [];
    if (canSetTemp()) bits.push('temperature');
    if (canSetPressure()) bits.push('pressure');
    summary.textContent = bits.length
      ? `${bits.join(', ').replace(/^./, ch => ch.toUpperCase())} and the rest`
      : 'Basket, notes and the rest';
  }
  body.innerHTML = `
    <div class="more-grid">
      ${canSetTemp() ? `<label class="field"><span class="field-label">Brew temp</span>
        <input class="field-input" id="f-temp" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 93"></label>` : ''}
      ${canSetPressure() ? `<label class="field"><span class="field-label">Pressure / flow</span>
        <input class="field-input" id="f-press" type="text" autocomplete="off" placeholder="e.g. 6 bar, 2ml/s"></label>` : ''}
      ${prefs.tds ? `<label class="field"><span class="field-label">TDS %</span>
        <input class="field-input" id="f-tds" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 9.4"></label>` : ''}
    </div>
    <!-- Out of the two-column grid, because it holds a name rather than a
         number. On a machine with one temperature and no pressure gauge it
         was the grid's only child, so it sat in the left column at half
         width with nothing beside it and "18g stock Breville double" ran
         off the end of the box. -->
    <label class="field"><span class="field-label">Basket</span>
      <input class="field-input" id="f-basket" type="text" autocomplete="off" placeholder="${escapeHTML(kit().basket || 'e.g. 18g IMS')}"></label>
    <label class="field"><span class="field-label">Notes</span>
      <input class="field-input" id="f-notes" type="text" maxlength="120" autocomplete="off" placeholder="what you noticed"></label>
  `;
  const bind = (sel, key, asNumber) => {
    const input = body.querySelector(sel);
    if (!input) return;
    input.value = editing[key] === null || editing[key] === undefined ? '' : editing[key];
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      if (asNumber) {
        const v = Number(raw.replace(',', '.'));
        editing[key] = raw === '' || !isFinite(v) ? null : v;
      } else {
        editing[key] = input.value;
      }
      renderReadout(c);
    });
  };
  bind('#f-temp', 'temp', false);
  bind('#f-press', 'press', false);
  bind('#f-basket', 'basket', false);
  bind('#f-tds', 'tds', true);
  bind('#f-notes', 'notes', false);

  // Open it and it stays open — whatever is in here, somebody who filled it
  // in on the last shot is filling it in on this one.
  const more = $('#more');
  more.open = Boolean(editing.temp || editing.press || editing.basket || editing.notes || editing.tds);
}

/* Everything read out of the three numbers, and nothing typed.

   The dashes here are load-bearing. A ratio with no yield behind it is
   not zero and not "1:0" — there is no ratio, and the slot says so. */
function renderReadout(c) {
  const wrap = $('#readout');
  const r = ratioOf(editing);
  const flow = flowOf(editing);
  const ey = extractionOf(editing);
  const place = placeOf(editing, c.target);
  const tips = nextMove(editing, c.target, c);
  /* The "you said finer and the grinder has not moved" check, live.

     It only ran on the saved card, which is to say it arrived after the
     one moment it could be acted on: while the sheet is open you are two
     steps from the grinder, and once it is saved you are reading history.
     The prior shot is the one before this one in the log — the last one
     for a new sheet, the one before it for an edit. */
  const mismatch = intentCheck(editing, prevShotOf(c));
  const twoVars = twoVariables(editing, prevShotOf(c));

  const timeClass = place.time === 'in' ? 'in' : place.time === null ? '' : 'out';
  const windowNote = place.time === null
    ? `window ${c.target.timeLo}–${c.target.timeHi}s`
    : place.time === 'in' ? `in the ${c.target.timeLo}–${c.target.timeHi}s window`
    : place.time === 'fast' ? `${Math.round(c.target.timeLo - editing.time)}s under the window`
    : `${Math.round(editing.time - c.target.timeHi)}s over the window`;

  wrap.innerHTML = `
    <div class="readout-row">
      <div class="readout-cell">
        <span class="readout-value">${fmtRatio(r)}</span>
        <span class="readout-label">${bandDrift(r, c.target.ratio) ? `${bandDrift(r, c.target.ratio)} · ` : ''}ratio${r !== null ? ` · aiming 1:${c.target.ratio}` : ''}</span>
      </div>
      <div class="readout-cell">
        <span class="readout-value">${fmt2(flow)}</span>
        <span class="readout-label">g per second</span>
      </div>
      ${prefs.tds ? `<div class="readout-cell">
        <span class="readout-value">${ey === null ? '—' : fmt1(ey) + '%'}</span>
        <span class="readout-label">${ey === null ? 'extraction · needs a TDS reading' : 'extraction yield'}</span>
      </div>` : ''}
    </div>
    <div class="readout-window ${timeClass}">${windowNote}</div>
  `;

  /* The advice goes in its own block further down the sheet, after the
     chips that can change it. See the comment on #live-advice. */
  const live = $('#live-advice');
  if (live) {
    live.innerHTML = `
      ${tips.map(t => tipHTML(t, 'tip')).join('')}
      ${twoVars ? `<div class="log-mismatch">${escapeHTML(twoVars)}</div>` : ''}
      ${mismatch ? `<div class="log-mismatch">${escapeHTML(mismatch)}</div>` : ''}
    `;
    // The sheet's own copy of the advice carries the same action, and a
    // button that does nothing is worse than no button.
    bindTipActions(live);
  }
}

function saveShot() {
  const c = activeCoffee();
  if (!c) return;
  if (!isComplete(editing) && editingIsNew) {
    const missing = missingFields(editing);
    // Saving a half-recorded shot is allowed — a bar is a bar, and a shot
    // you only timed is still evidence. It is marked, not refused.
    toast(`Saved without ${missing.join(' or ')}`);
  }
  const wasNew = editingIsNew;
  if (wasNew) c.shots.push(editing);
  /* One recipe to a coffee.

     "The one — this is the recipe" is singular in its own label, and
     marking a second shot used to leave the first one flagged too. Two
     testers independently ended a session looking at a board with three
     cards each headed THE KEEPER while the recipe at the top showed one
     set of numbers — three contradictory answers to the question the
     board exists to answer. It survived a reload, because it was in the
     data rather than the render.

     Demoted to "drinkable" rather than cleared: a shot you once called
     the recipe was, at minimum, drinkable. */
  if (editing.verdict === 'keeper') {
    c.shots.forEach(sh => { if (sh !== editing && sh.verdict === 'keeper') sh.verdict = 'ok'; });
  }
  save();
  closeModal('#shot-modal');
  renderBoard();
  // The card you just made is the one you want to look at, and the board
  // used to leave you wherever you happened to be scrolled.
  if (wasNew) {
    const first = $('#shots') && $('#shots').firstElementChild;
    if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } else {
    toast('Shot updated');
  }
}

/* ============================================================
   COFFEES
   ============================================================ */

/* Where the grinder is sitting today, which is not the recipe.

   A shot dialled in on day 5 runs faster on day 14: the coffee has
   degassed and the same setting no longer resists the water the same way.
   The move is small and it is on the grinder. What must not happen is the
   recipe being quietly rewritten to match, because then the thing you
   found is gone and there is nothing to come back to when you open the
   next bag of the same coffee. */
function openGrindNow(c, keeper) {
  const body = $('#edit-body');
  $('#edit-title').textContent = 'Grinder today';
  body.innerHTML = `
    <p class="sheet-note">The recipe stays where you found it: <strong>${escapeHTML(String(keeper.grind || '—'))}</strong>. This is only where the grinder is sitting now, so the distance between them is visible.</p>
    <div class="target-grid" id="now-grid"></div>
    <p class="sheet-note">Leave it empty and the board shows the recipe alone.</p>
  `;
  const grid = body.querySelector('#now-grid');
  const start = Number(keeper.grind);
  grid.appendChild(numField({
    label: 'Now', unit: '', value: c.grindNow === '' ? null : Number(c.grindNow),
    min: 0, max: 100, step: 0.1, digits: 1,
    startAt: isFinite(start) ? start : 0,
    onChange: v => { c.grindNow = v === null ? '' : String(v); },
  }));
  $('#edit-delete').classList.add('hidden');
  $('#edit-save').onclick = () => { save(); closeModal('#edit-modal'); renderBoard(); };
  openModal('#edit-modal');
}

function openCoffees() {
  const list = $('#coffee-list');
  list.innerHTML = '';
  if (!state.coffees.length) {
    list.appendChild(el('p', 'sheet-note', 'Nothing on the shelf yet. Add the bag you are dialling in and the board is yours.'));
  }
  state.coffees.forEach(c => {
    const keeper = c.shots.filter(s => s.verdict === 'keeper').slice(-1)[0];
    const row = el('button', 'coffee-row' + (c.id === state.activeId ? ' on' : ''), `
      <span class="coffee-row-text">
        <span class="coffee-row-name">${escapeHTML(coffeeLabel(c))}</span>
        <span class="coffee-row-sub">${c.shots.length} shot${c.shots.length === 1 ? '' : 's'}${
          keeper ? ` · dialled at ${fmtRatio(ratioOf(keeper))}` : ''}</span>
      </span>
    `);
    row.type = 'button';
    row.addEventListener('click', () => {
      state.activeId = c.id;
      save();
      closeModal('#coffee-modal');
      renderBoard();
    });
    list.appendChild(row);
  });
  openModal('#coffee-modal');
}

function openEdit(c, opts) {
  const adding = Boolean(opts && opts.adding);
  const body = $('#edit-body');
  const t = c.target;
  /* Which of the target's numbers are still the app's suggestion and which
     are the reader's own.

     The starting point is a consequence of the roast — a light roast can
     do less extraction work, so it wants less coffee, a longer ratio and a
     shorter window — and until somebody moves a field by hand there is no
     reason for it to disagree with the roast they just picked. Picking
     "Light" and then reading a card that recommends 17.5g at 1:2.5 above a
     target that says 19g at 1:2 is the app arguing with itself, which is
     what a first-run test found it doing on four separate surfaces.

     Per field, not one flag for the lot: somebody who sets their own dose
     has not thereby made a decision about the brew window. A coffee that
     already has shots against it has been dialled around its target, so
     every field on it is theirs. */
  const own = { dose: false, ratio: false, time: false, temp: false };
  if (!adding || c.shots.length > 0) { own.dose = own.ratio = own.time = own.temp = true; }
  let gridBuilt = false;
  // the grind-today sheet borrows this shell and hides the destructive
  // control; so does a coffee that is not on the shelf yet
  $('#edit-delete').classList.toggle('hidden', adding);
  $('#edit-title').textContent = c.name.trim() ? coffeeLabel(c) : 'The coffee';
  body.innerHTML = `
    <label class="field"><span class="field-label">Name</span>
      <input class="field-input" id="e-name" type="text" maxlength="48" placeholder="e.g. Ethiopia Guji"></label>
    <label class="field"><span class="field-label">Roaster</span>
      <input class="field-input" id="e-roaster" type="text" maxlength="48" placeholder="optional"></label>
    <label class="field"><span class="field-label">Roast date</span>
      <input class="field-input" id="e-roast" type="date"></label>

    <span class="field-label section">Roast level</span>
    <div class="chips" id="e-roastlevel" role="radiogroup" aria-label="Roast level"></div>

    <details class="more" id="e-more">
      <summary>What else the bag says</summary>
      <div class="more-body">
        <p class="sheet-note">All optional, and each one only narrows the starting point. Roast level does most of the work; these say how hard the coffee will be to extract around it.</p>
        <span class="field-label">Process</span>
        <div class="chips" id="e-process" role="radiogroup" aria-label="Process"></div>
        <span class="field-label">Grown at</span>
        <div class="chips" id="e-altitude" role="radiogroup" aria-label="Altitude"></div>
        <label class="switch-row" for="e-decaf">
          <span class="switch-text">
            <span class="switch-title">Decaf</span>
            <span class="switch-sub">Worth saying: decaffeination opens the bean up, so it extracts far more readily and runs faster with it — which pull in opposite directions.</span>
          </span>
          <span class="switch"><input type="checkbox" id="e-decaf"><span class="switch-track"><span class="switch-knob"></span></span></span>
        </label>
      </div>
    </details>

    <div id="e-baseline"></div>

    <span class="field-label section">What you are aiming at</span>
    <p class="sheet-note">A shot is only fast or slow against a window, so this app will not call one fast until you have said what the window is. 1:2 in 25–30 seconds is where most recipes start, not where they have to stay.</p>
    <div class="target-grid" id="target-grid"></div>
  `;
  body.querySelector('#e-name').value = c.name;
  body.querySelector('#e-roaster').value = c.roaster || '';
  body.querySelector('#e-roast').value = c.roastDate || '';

  /* One variable, and it says so.

     Roast level moves espresso extraction more than anything else on a
     bag: light is dense and less soluble and wants more heat and a longer
     ratio; dark gives up too much at the same settings. Process, origin
     and elevation are real and much weaker, and folding them in would not
     make the answer better — it would make its confidence harder to read.

     It never writes to the target on its own. It offers, the button
     applies, and the sentence beside it says what it is: a place to start,
     finished by taste. */
  const roastWrap = body.querySelector('#e-roastlevel');
  const baseWrap = body.querySelector('#e-baseline');

  /* The rest of what a bag says. Behind a summary because most people
     will answer roast level and stop, and a sheet that wants four
     answers before it will help is a sheet people skip. Each handler
     writes straight to the coffee, which the sheet's commit already
     saves. */
  const chipRow = (wrap, items, current, pick) => {
    wrap.innerHTML = '';
    items.forEach(i => {
      const on = current === i.key;
      const b = el('button', 'chip' + (on ? ' on' : ''), escapeHTML(i.label));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.addEventListener('click', () => { pick(on ? '' : i.key); haptic(); });
      wrap.appendChild(b);
    });
  };
  const renderExtras = () => {
    chipRow(body.querySelector('#e-process'), PROCESSES, c.process,
      k => { c.process = k; applyStart(); renderExtras(); renderRoast(); });
    chipRow(body.querySelector('#e-altitude'), ALTITUDES, c.altitude,
      k => { c.altitude = k; applyStart(); renderExtras(); renderRoast(); });
  };
  /* The roast date has to reach the model while the sheet is open.

     c.roastDate was written only by commit(), which runs on Save — so the
     "A PLACE TO START" panel on the add-a-coffee sheet never knew the bag
     was seven weeks old, while the identical panel on the edit sheet,
     opened later on the same coffee, carried three extra sentences about
     it. Same coffee, same data, two different texts, and the one a new
     bag is entered on was the wrong one. */
  const dateBox = body.querySelector('#e-roast');
  if (dateBox) dateBox.addEventListener('change', () => {
    c.roastDate = dateBox.value;
    applyStart();
    renderRoast();
  });

  const decafBox = body.querySelector('#e-decaf');
  decafBox.checked = Boolean(c.decaf);
  decafBox.addEventListener('change', () => { c.decaf = decafBox.checked; applyStart(); renderRoast(); });
  if (c.process || c.altitude || c.decaf) body.querySelector('#e-more').open = true;
  const renderRoast = () => {
    roastWrap.innerHTML = '';
    ROASTS.forEach(r => {
      const on = c.roast === r.key;
      const b = el('button', 'chip' + (on ? ' on' : ''), escapeHTML(r.label));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.addEventListener('click', () => {
        c.roast = on ? '' : r.key;
        // The target follows the bag until somebody claims a field.
        applyStart();
        haptic();
        renderRoast();
      });
      roastWrap.appendChild(b);
    });
    /* The baseline offers the variables this machine has.

       Quoting a brew temperature at somebody whose machine holds one is
       the same mistake the shot sheet used to make, one screen earlier:
       it reads as a recommendation and it is a number they cannot act on.
       On a fixed-temperature machine the roast still says something — it
       says what ratio to start at — so the sentence keeps the range as
       context and the button applies only the ratio. */
    const sp = startingPoint(c);
    const e = sp && sp.e;
    const spDose = doseStart(c);
    const withTemp = canSetTemp();
    /* The sentence says what moved the numbers and why, because a
       starting point somebody cannot interrogate is a recipe, and this
       app does not hand out recipes. */
    const shifted = sp && sp.sol.why.length
      ? ` Then ${sp.sol.why.join('; ')} — so this starts ${sp.sol.shift < 0
          ? 'a little longer on the ratio than the roast alone would'
          : 'shorter, and cooler, than the roast alone would'}.`
      : '';
    baseWrap.innerHTML = sp
      ? `<div class="baseline">
           <span class="baseline-head">A place to start</span>
           <p class="baseline-body">${escapeHTML(e.label)} roasts usually take <strong>${e.tempRange}</strong>, <strong>${e.ratioRange}</strong> and <strong>${Math.round(e.timeLo)}–${Math.round(e.timeHi)}s</strong>. Roast level is the strongest thing a bag tells you about extraction.${shifted}${
             e.timeLo < 25 ? ' The window starts earlier than the usual 25–30 because a lighter roast is often at its best pulled faster and longer, and it should not be told off for it.' : ''}${
             withTemp ? '' : ' Your machine holds one temperature, so the rest of this is the part you can take.'} Your grinder, water and palate finish the job.</p>
           ${sp.extra.map(x => `<p class="baseline-body">${escapeHTML(x)}</p>`).join('')}
           ${startApplied(sp, spDose)
             ? `<p class="baseline-body"><strong>${spDose === null ? '' : `${fmtDose(spDose)}g, `}1:${sp.ratio}${
                  withTemp ? `, ${sp.temp}°` : ''}, ${Math.round(sp.timeLo)}–${Math.round(sp.timeHi)}s</strong> — that is what the target below is set to. Change any of it and it stays changed.</p>`
             : `<button class="btn btn-ghost" type="button" id="btn-apply-baseline">Start at ${spDose === null ? '' : `${fmtDose(spDose)}g, `}${withTemp ? `${sp.temp}° and ` : ''}1:${sp.ratio}, ${Math.round(sp.timeLo)}–${Math.round(sp.timeHi)}s</button>`}
         </div>`
      : '';
    const apply = baseWrap.querySelector('#btn-apply-baseline');
    if (apply) apply.addEventListener('click', () => {
      // Everything the button names, including fields the reader had
      // already claimed — tapping a button that lists the numbers is a
      // request to have those numbers, and from here they are theirs.
      applyStart(true);
      commit();
      if (!adding) save();
      haptic();
      // Applying a starting point is one field changing, not the end of
      // the conversation. It used to close the whole sheet, which is a
      // bigger act than the button admits to and left people unsure
      // whether the name they had just typed had gone in with it.
      toast(`Aiming at ${spDose === null ? '' : `${fmtDose(spDose)}g, `}1:${sp.ratio}${
        withTemp ? `, ${sp.temp}°` : ''}, ${Math.round(sp.timeLo)}–${Math.round(sp.timeHi)}s`);
      buildTargetGrid();
      renderBoard();
    });
  };
  renderExtras();
  renderRoast();

  /* The window, as fields.

     Built in a function because the roast baseline writes to it and the
     grid then has to show what it wrote — before, the button changed the
     ratio behind the reader's back and closed the sheet, so the only
     evidence it had worked was a toast.

     Temperature is a field here only when the machine has one to set. The
     board advertised "aiming at 94°" with no way to reach it: the number
     could only be set by tapping the roast suggestion, which also
     overwrote the ratio. */
  /* The starting point, applied to whatever the reader has not claimed.

     Called when the roast or anything else on the bag changes, and by the
     button that names the numbers out loud. Rebuilds the grid rather than
     writing behind the reader's back: the fields are on screen and they
     have to show what changed. */
  const applyStart = force => {
    const sp = startingPoint(c);
    const d = doseStart(c);
    if (d !== null && (force || !own.dose)) { t.dose = d; if (force) own.dose = true; }
    if (sp) {
      if (force || !own.ratio) { t.ratio = sp.ratio; if (force) own.ratio = true; }
      if (force || !own.time) { t.timeLo = sp.timeLo; t.timeHi = sp.timeHi; if (force) own.time = true; }
      if (canSetTemp() && (force || !own.temp)) { t.temp = sp.temp; if (force) own.temp = true; }
    }
    if (gridBuilt) buildTargetGrid();
  };

  /* Whether the target already holds the starting point. A button offering
     numbers the fields underneath it already show is a button that does
     nothing, and one a reader will tap to find out. Where they match, the
     sentence says so instead. */
  // A declaration, not a const: renderRoast calls it while building its
  // markup, and that happens before this line is reached.
  function startApplied(sp, spDose) {
    const near = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.051;
    if (!sp) return false;
    if (spDose !== null && !near(num(t.dose), spDose)) return false;
    if (!near(num(t.ratio), sp.ratio)) return false;
    if (Math.round(num(t.timeLo)) !== Math.round(sp.timeLo)) return false;
    if (Math.round(num(t.timeHi)) !== Math.round(sp.timeHi)) return false;
    if (canSetTemp() && !near(num(t.temp), sp.temp)) return false;
    return true;
  }

  const grid = body.querySelector('#target-grid');
  const buildTargetGrid = () => {
    grid.innerHTML = '';
    grid.appendChild(numField({ label: 'Dose', unit: 'g', value: t.dose, min: 5, max: 40, step: 0.5, digits: 1,
      onChange: v => { own.dose = true; t.dose = v === null ? 18 : v; } }));
    grid.appendChild(numField({ label: 'Ratio 1:', unit: '', value: t.ratio, min: 1, max: 6, step: 0.1, digits: 1,
      onChange: v => { own.ratio = true; t.ratio = v === null ? 2 : v; } }));
    grid.appendChild(numField({ label: 'From', unit: 's', value: t.timeLo, min: 5, max: 90, step: 1, digits: 0,
      onChange: v => { own.time = true; t.timeLo = v === null ? 25 : v; } }));
    grid.appendChild(numField({ label: 'To', unit: 's', value: t.timeHi, min: 5, max: 120, step: 1, digits: 0,
      onChange: v => { own.time = true; t.timeHi = v === null ? 30 : v; } }));
    if (canSetTemp()) {
      grid.appendChild(numField({ label: 'Temp', unit: '°', value: t.temp, min: 80, max: 100, step: 1, digits: 0,
        onChange: v => { own.temp = true; t.temp = v; } }));
    }
  };
  buildTargetGrid();
  gridBuilt = true;

  /* Every way out of this sheet commits the same fields.

     The text inputs were read only by Save, and the baseline button closed
     the sheet on its own — so typing a name and a roast date, then tapping
     "Start at 94° and 1:2.4", applied the target and threw both away. Two
     exits, one of them lossy, and the lost fields were the ones the
     baseline is derived from. */
  const commit = () => {
    c.name = body.querySelector('#e-name').value;
    c.roaster = body.querySelector('#e-roaster').value;
    c.roastDate = body.querySelector('#e-roast').value;
    if (c.target.timeHi < c.target.timeLo) {
      const lo = c.target.timeHi; c.target.timeHi = c.target.timeLo; c.target.timeLo = lo;
    }
  };

  $('#edit-save').onclick = () => {
    commit();
    if (adding && !state.coffees.some(x => x.id === c.id)) {
      state.coffees.push(c);
      state.activeId = c.id;
    }
    save();
    closeModal('#edit-modal');
    renderBoard();
  };
  $('#edit-delete').onclick = () => {
    const n = c.shots.length;
    // Always, not only where there are shots to lose: a bag somebody named
    // and described is worth one question, and the control sits in the same
    // bar as Save.
    if (!confirm(n
      ? `Remove ${coffeeLabel(c)}? Its ${n} shot${n === 1 ? '' : 's'} go with it, and there is no undo.`
      : `Remove ${coffeeLabel(c)}? There is no undo.`)) return;
    state.coffees = state.coffees.filter(x => x.id !== c.id);
    if (state.activeId === c.id) state.activeId = state.coffees.length ? state.coffees[0].id : null;
    save();
    closeModal('#edit-modal');
    renderBoard();
    toast('Removed');
  };
  openModal('#edit-modal');
}

/* A coffee arrives when it has a name, not when the button is pressed.

   Tapping "Add a coffee" used to push an "Unnamed coffee · 0 shots" onto
   the shelf before a character had been typed, so backing out of the sheet
   left a ghost bag behind. The record is built here and only joins the
   shelf if the sheet is saved. */
function addCoffee() {
  const c = newCoffee('');
  closeModal('#coffee-modal');
  openEdit(c, { adding: true });
}

/* ============================================================
   SETTINGS, HELP, MODALS
   ============================================================ */

/* A segmented row: a label, a sentence of why it matters, and the answers.

   The "why" is not padding. Somebody being asked whether their machine
   holds one temperature deserves to know that the answer removes a field
   from every shot sheet from here on. */
function segRow(label, sub, options, current, onPick) {
  const wrap = el('div', 'kit-row');
  wrap.innerHTML = `
    <span class="field-label">${escapeHTML(label)}</span>
    ${sub ? `<span class="kit-sub">${escapeHTML(sub)}</span>` : ''}
    <div class="seg" role="radiogroup" aria-label="${escapeHTML(label)}"></div>
  `;
  const seg = wrap.querySelector('.seg');
  options.forEach(([key, text]) => {
    const on = current === key;
    const b = el('button', 'seg-btn' + (on ? ' on' : ''), escapeHTML(text));
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.addEventListener('click', () => { haptic(); onPick(key); });
    seg.appendChild(b);
  });
  return wrap;
}

/* Your kit, asked once.

   See defaultKit for why this screen exists at all. The short version: a
   field you can see and cannot change is a field you will eventually fill
   in with a guess, and advice that names a variable you do not have is worse
   than no advice. */
/* The picker options. "Something else" is not a fallback tucked at the
   bottom of a list somebody has to scroll past — it is the first entry
   after the blank, because the list is a convenience for the common case
   and not a claim to be exhaustive. */
function pickerOptions(items, current) {
  const known = items.some(i => i.name === current);
  const other = Boolean(current) && !known;
  return `<option value=""${!current ? ' selected' : ''}>Choose…</option>`
    + `<option value="__other"${other ? ' selected' : ''}>Something else</option>`
    + items.map(i => `<option value="${escapeHTML(i.name)}"${
        i.name === current ? ' selected' : ''}>${escapeHTML(i.name)}</option>`).join('');
}
const machineOptions = cur => pickerOptions(MACHINES, cur);
const grinderOptions = cur => pickerOptions(GRINDERS, cur);

function openKit() {
  const k = Object.assign(defaultKit(), state.kit);
  const body = $('#kit-body');
  body.innerHTML = `
    <p class="sheet-note">Asked once. The shot sheet then offers only what you can actually change, and nothing here suggests a variable your machine does not have. Pick yours and the questions below fill themselves in — correct any that are wrong, because a machine you have modified beats any list.</p>
    <label class="field"><span class="field-label">Machine</span>
      <select class="field-input" id="k-machine-pick">${machineOptions(k.machine)}</select></label>
    <label class="field hidden" id="k-machine-other"><span class="field-label">Which one</span>
      <input class="field-input" id="k-machine" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Breville Bambino Plus"></label>
    <div id="k-temp"></div>
    <div id="k-press"></div>
    <label class="field"><span class="field-label">Grinder</span>
      <select class="field-input" id="k-grinder-pick">${grinderOptions(k.grinder)}</select></label>
    <label class="field hidden" id="k-grinder-other"><span class="field-label">Which one</span>
      <input class="field-input" id="k-grinder" type="text" maxlength="60" autocomplete="off" placeholder="e.g. DF64"></label>
    <div id="k-steps"></div>
    <div id="k-retains"></div>
    <div id="k-porta"></div>
    <div class="kit-basket">
      <label class="field"><span class="field-label">Basket</span>
        <input class="field-input" id="k-basket" type="text" maxlength="60" autocomplete="off" placeholder="e.g. IMS Competizione"></label>
      <label class="field field-narrow"><span class="field-label">Its dose</span>
        <input class="field-input" id="k-dose" type="text" inputmode="decimal" autocomplete="off" placeholder="18"></label>
    </div>
    <p class="sheet-note">The number on the side of the basket is a starting point. What settles it is the gap the puck leaves under the shower screen, and that changes with the coffee — so it is worth a minute with a coin before the first shot.</p>
    <!-- The coin test's answer, said out loud. It lives in its own field
         rather than overwriting the printed figure, and a number the app
         keeps to itself is a number the reader cannot argue with: the
         board works from this one, so the board has to show it. -->
    <div id="k-fits"></div>
    <button type="button" class="btn btn-ghost" id="k-dose-check">Check it with a coin</button>
  `;
  body.querySelector('#k-machine').value = k.machine;
  body.querySelector('#k-grinder').value = k.grinder;
  body.querySelector('#k-basket').value = k.basket;

  /* Picking a machine answers the two capability questions below it, and
     picking a grinder answers the one below that. The answers are then
     ordinary editable segments: the list has made a suggestion, not a
     ruling. */
  const mPick = body.querySelector('#k-machine-pick');
  const gPick = body.querySelector('#k-grinder-pick');
  const mOther = body.querySelector('#k-machine-other');
  const gOther = body.querySelector('#k-grinder-other');
  const syncOther = () => {
    mOther.classList.toggle('hidden', mPick.value !== '__other');
    gOther.classList.toggle('hidden', gPick.value !== '__other');
  };
  if (k.machine && !machineEntry(k.machine)) mPick.value = '__other';
  if (k.grinder && !grinderEntry(k.grinder)) gPick.value = '__other';
  syncOther();

  mPick.addEventListener('change', () => {
    syncOther();
    const e = machineEntry(mPick.value);
    if (e) { k.temp = e.temp; k.pressure = e.pressure; k.machine = e.name; redraw(); toast('Filled in from your machine'); }
    else if (mPick.value === '__other') body.querySelector('#k-machine').focus();
  });
  gPick.addEventListener('change', () => {
    syncOther();
    const e = grinderEntry(gPick.value);
    if (e) {
      k.steps = e.steps; k.grinder = e.name;
      if (typeof e.retains === 'boolean') k.retains = e.retains;
      redraw(); toast('Filled in from your grinder');
    }
    else if (gPick.value === '__other') body.querySelector('#k-grinder').focus();
  });
  body.querySelector('#k-dose').value = k.basketDose === null ? '' : k.basketDose;

  const redraw = () => {
    const t = body.querySelector('#k-temp');
    t.innerHTML = '';
    t.appendChild(segRow('Brew temperature',
      'Most home machines hold one. Say so and the temperature field leaves the shot sheet, and nothing here tells you to raise it.',
      [['fixed', 'It has one'], ['set', 'I set it']], k.temp,
      key => { k.temp = key; redraw(); }));

    const pr = body.querySelector('#k-press');
    pr.innerHTML = '';
    pr.appendChild(segRow('Pressure and flow',
      'A gauge you can read is not the same as a variable you can change.',
      [['fixed', 'Neither'], ['gauge', 'I can see it'], ['profile', 'I can change it']], k.pressure,
      key => { k.pressure = key; redraw(); }));

    const rt = body.querySelector('#k-retains');
    rt.innerHTML = '';
    rt.appendChild(segRow('Does it hold on to grounds?',
      'A grinder that keeps some of the last setting has to be purged before a new one means anything, which is why this app sends you to dose and yield for small changes. A single-doser makes grind cheap to move.',
      [['yes', 'It needs a purge'], ['no', 'Single dose, almost none']], k.retains === false ? 'no' : 'yes',
      key => { k.retains = key === 'yes'; redraw(); }));

    const pf = body.querySelector('#k-porta');
    pf.innerHTML = '';
    pf.appendChild(segRow('Portafilter',
      'This decides what channelling looks like. Through a bottomless you see the bed go uneven and spray; with spouts you cannot see it at all, and the tell is a sudden surge of flow late in the shot.',
      [['spouted', 'Spouted'], ['bottomless', 'Bottomless']], k.portafilter === 'bottomless' ? 'bottomless' : 'spouted',
      key => { k.portafilter = key; redraw(); }));

    const st = body.querySelector('#k-steps');
    st.innerHTML = '';
    st.appendChild(segRow('The grind dial',
      'Only so the app uses your words for it. It never suggests a setting, only a direction — your numbers mean nothing on anyone else’s grinder.',
      [['stepless', 'A number'], ['stepped', 'Clicks']], k.steps,
      key => { k.steps = key; redraw(); }));
  };
  /* What the coin found, and a way to disown it. */
  const drawFits = () => {
    const box = body.querySelector('#k-fits');
    if (!box) return;
    const fits = num(k.doseFits);
    box.innerHTML = '';
    if (fits === null) return;
    const printed = num(k.basketDose);
    const same = printed !== null && Math.abs(fits - printed) < 0.05;
    const row = el('div', 'kit-fits');
    row.innerHTML = `<span class="kit-fits-text">The coin says <strong>${fmtDose(fits)}g</strong> fits${
      same ? '' : `, not the ${fmtDose(printed)}g printed on it`}. That is the dose the board works from.</span>`;
    const clear = el('button', 'kit-fits-clear', 'Forget it');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      k.doseFits = null; k.doseChecked = null;
      state.kit = k; save(); haptic(); drawFits();
    });
    row.appendChild(clear);
    box.appendChild(row);
  };

  redraw();
  drawFits();

  /* A different basket is a different measurement. The coin test's answer
     is about one basket and one coffee; typing a new figure on the side of
     a new basket makes the old finding a claim about something that is no
     longer in the machine. */
  /* The two names, from whichever control is holding them. */
  const captureNames = () => {
    const mv = body.querySelector('#k-machine-pick').value;
    const gv = body.querySelector('#k-grinder-pick').value;
    k.machine = (mv && mv !== '__other') ? mv : body.querySelector('#k-machine').value.trim();
    k.grinder = (gv && gv !== '__other') ? gv : body.querySelector('#k-grinder').value.trim();
  };

  const setPrinted = d => {
    if (!(isFinite(d) && d > 0 && d <= 60)) return;
    if (k.basketDose !== d) k.doseFits = null;
    k.basketDose = d;
  };

  /* Saves what is on the screen first, so the check runs against the dose
     just typed rather than the one from before this sheet was opened. */
  body.querySelector('#k-dose-check').addEventListener('click', () => {
    const d = Number(body.querySelector('#k-dose').value.replace(',', '.').trim());
    setPrinted(d);
    k.basket = body.querySelector('#k-basket').value.trim();
    /* Everything Save would have taken, because this is the other way out
       of the sheet and it used to be the lossy one: the free-text machine
       and grinder names were read only by Save, and "asked" was set only by
       Save — so somebody who filled the sheet in and went straight to the
       coin test came back to a board still offering to set their kit up. */
    captureNames();
    k.asked = true;
    state.kit = k;
    save();
    closeModal('#kit-modal');
    openDoseCheck();
  });

  $('#kit-save').onclick = () => {
    captureNames();
    k.basket = body.querySelector('#k-basket').value.trim();
    const d = Number(body.querySelector('#k-dose').value.replace(',', '.').trim());
    if (isFinite(d) && d > 0 && d <= 60) setPrinted(d);
    else { k.basketDose = null; k.doseFits = null; }
    k.asked = true;
    state.kit = k;
    save();
    closeModal('#kit-modal');
    renderBoard();
    toast('Setup saved');
  };
  // Skipping is answering: the defaults are the commonest home machine, and
  // somebody who skips should get the simplest sheet rather than the
  // fullest one. It is not asked again, and it is in Settings for ever.
  $('#kit-skip').onclick = () => {
    state.kit = Object.assign(defaultKit(), { asked: true });
    save();
    closeModal('#kit-modal');
    renderBoard();
  };
  openModal('#kit-modal');
}

function kitLine() {
  const k = kit();
  const bits = [k.machine, k.grinder, k.basket].filter(Boolean);
  return bits.length ? bits.join(' · ') : 'Not set — the sheet is using the defaults';
}

/* The dose, checked by volume.

   The scale gives the weight; the basket cares about the volume, and the
   two only track each other within one bag. A light roast is denser than
   a dark one and a coarser grind settles differently, so 18g that left
   the right gap under the shower screen last week can leave none at all
   with the next coffee — and no gap means the puck meets the screen
   before the pump does, which channels whatever the grinder is set to.

   The gap has a name, headspace, a working target of about 2mm (3mm if a
   puck screen is in there, counting its thickness), and a test that needs
   a coin and nothing else. See DIALIN.md step 1: this is the bottom of
   the stack, because a dose that does not fit the basket makes every
   later measurement a reading of an accident.

   The three outcomes each move the dose by a gram, which is the size of
   step that shows in the gap without being a different recipe. */
function openDoseCheck() {
  const k = kit();
  const dose = basketCap();
  const basket = (k.basket || '').trim();
  const body = $('#dose-body');

  const outcome = (delta, label, sub) => {
    const b = el('button', 'dose-outcome',
      `<span class="dose-outcome-label">${escapeHTML(label)}</span><span class="dose-outcome-sub">${escapeHTML(sub)}</span>`);
    b.type = 'button';
    b.addEventListener('click', () => {
      /* The answer goes into doseFits, never into basketDose. The printed
         figure is a fact about the basket and the app has no business
         rewriting it — that is how the board ended up telling somebody
         with an 18g basket that 17.5g was "under the 19g on the basket".
         Confirming with no move still records the figure, because
         "18g fits" is a measurement too. */
      const cur = basketCap();
      if (cur !== null) {
        state.kit.doseFits = Math.round((cur + delta) * 10) / 10;
      }
      state.kit.doseChecked = Date.now();
      save();
      haptic();
      closeModal('#dose-modal');
      renderBoard();
      toast(delta === 0
        ? `${fmtDose(basketCap())}g fits — that is the figure the board works from`
        : `Dose is now ${fmtDose(basketCap())}g — pull one and check again`);
    });
    return b;
  };

  body.innerHTML = `
    <p class="sheet-note">Your scale gives the weight. The basket cares about the volume, and the two only agree within one bag: a light roast is denser than a dark one, so the same ${dose === null ? 'dose' : fmtDose(dose) + 'g'} can leave the right gap under the shower screen with one coffee and none with the next.</p>
    <p class="sheet-note">That gap is the room the puck needs to swell into — about 2mm, or 3mm if you use a puck screen. Too little and the puck meets the screen before the pump does; too much and the water moves the dry bed around before it is wet. Both channel, and neither is fixable at the grinder.</p>
    <div class="dose-steps">
      <span class="field-label">The coin test</span>
      <ol class="dose-list">
        <li>Dose ${dose === null ? 'as usual' : `${fmtDose(dose)}g`}${basket ? ` into your ${escapeHTML(basket)}` : ''} and tamp as you normally would.</li>
        <li>Lay a coin flat on the puck.</li>
        <li>Lock the portafilter in, then take it straight back out.</li>
        <li>Look at the coin and the surface of the puck.</li>
      </ol>
    </div>
    <span class="field-label">What did you find?</span>
    <div class="dose-outcomes" id="dose-outcomes"></div>
  `;

  const wrap = body.querySelector('#dose-outcomes');
  wrap.appendChild(outcome(0, 'The coin is just marked',
    'Touched but not buried. That is the gap — this dose fits the basket.'));
  wrap.appendChild(outcome(-1, 'The coin is pressed in',
    'Or there is a screw imprint on the puck. Too little room: a gram down.'));
  wrap.appendChild(outcome(1, 'The coin is untouched',
    'It never reached the screen. Too much room: a gram up.'));

  openModal('#dose-modal');
}

// When the dose was last checked against the basket by volume, in words.
function doseCheckLine() {
  const at = kit().doseChecked;
  if (!at) return 'The coin test — never done on this setup';
  const days = Math.floor((Date.now() - at) / 86400000);
  return days <= 0 ? 'The coin test — done today'
    : days === 1 ? 'The coin test — done yesterday'
    : `The coin test — done ${days} days ago`;
}

/* Where to put the grinder before the first shot, without spending one.

   The dial-in sources all start somewhere and none of them can tell you
   where, because a grinder's numbers mean nothing across machines. One
   of them has a way round that which costs no coffee: grind a few beans
   and feel them. Texture is comparable across grinders in a way numbers
   are not.

   It carries the coarse-first principle with it, which is the same
   source's, and the reason is worth having: a coarse bed lets water
   through more evenly, so the shot tells you more, and coming down to
   the right setting beats climbing back out of a choked one. */
function openPinchTest() {
  const body = $('#pinch-body');
  body.innerHTML = `
    <p class="sheet-note">Nobody can tell you a number — every grinder is marked differently and yours moves as the bag ages. But you can feel roughly where you are before spending a shot on it.</p>
    <div class="dose-steps">
      <span class="field-label">The pinch</span>
      <ol class="dose-list">
        <li>Grind a few beans at wherever the dial is sitting.</li>
        <li>Tip them into your palm and pinch them between finger and thumb.</li>
        <li>Look at what your fingers left, and listen to it as you rub.</li>
      </ol>
    </div>
    <div class="dose-outcomes">
      <div class="dose-read"><span class="dose-read-label">Little peaks where your fingers were, and a grainy, sandy sound</span><span class="dose-read-sub">That is the neighbourhood. Pull one and let the clock take over.</span></div>
      <div class="dose-read"><span class="dose-read-label">You can see your fingerprints pressed into it</span><span class="dose-read-sub">Too fine — it is behaving like powder. Come coarser before you pull anything.</span></div>
      <div class="dose-read"><span class="dose-read-label">It clumps into a ball</span><span class="dose-read-sub">That is static and moisture rather than grind size. A drop of water on the beans before grinding settles it.</span></div>
    </div>
    <p class="sheet-note">When in doubt, start coarser than you think and come finer. A coarse bed lets water through more evenly, so the shot teaches you more — and coming down is quicker than climbing out of a puck that has choked the machine.</p>
  `;
  openModal('#pinch-modal');
}

/* The one exercise in the app that records nothing.

   The sheet has asked people to place a cup between sour and bitter
   since the first version, and has never shown them what either end
   tastes like. In a finished shot they arrive mixed, and in a very light
   or very dark roast they are genuinely hard to tell apart.

   Extraction runs in the same order every time — the sour compounds
   come out first, the sweet and balanced ones in the middle, the bitter
   ones last — so catching a shot in three glasses separates them for
   you. It is also the clearest demonstration of why ratio works: the
   last glass is what extending a shot adds more of. */
function openSalami() {
  const body = $('#salami-body');
  body.innerHTML = `
    <p class="sheet-note">This one measures nothing and goes in no log. It is here because the sheet keeps asking you whether a shot is sour or bitter, and in a finished cup the two arrive mixed together.</p>
    <p class="sheet-note">Water pulls things out of coffee in the same order every time: the sour compounds first, the sweet and balanced ones through the middle, the bitter ones last. Catch a shot in three glasses and they come apart.</p>
    <div class="dose-steps">
      <span class="field-label">The three glasses</span>
      <ol class="dose-list">
        <li>Set up a shot exactly as you normally would, with three small glasses to hand.</li>
        <li>Start it, and swap the glass about every third of the way to your usual yield.</li>
        <li>Taste them in order, then go back and forth between the first and the last.</li>
      </ol>
    </div>
    <div class="dose-outcomes">
      <div class="dose-read"><span class="dose-read-label">First glass</span><span class="dose-read-sub">Sharp and sour, and darker than you expect. This is what the app means by sour.</span></div>
      <div class="dose-read"><span class="dose-read-label">Middle glass</span><span class="dose-read-sub">The balanced, sweet part — and usually missing something on its own.</span></div>
      <div class="dose-read"><span class="dose-read-label">Last glass</span><span class="dose-read-sub">Pale, thin and the most bitter of the three. This is what a longer ratio adds more of.</span></div>
    </div>
    <p class="sheet-note">Do it once with a coffee you know and the sour-or-bitter question stops being guesswork. It is worth repeating on a very light and a very dark roast, which are the two where the ends are hardest to tell apart.</p>
  `;
  openModal('#salami-modal');
}

function openSettings() {
  const body = $('#settings-body');
  body.innerHTML = `
    <button class="btn btn-ghost kit-btn" id="btn-kit">
      <span class="kit-btn-title">Your setup</span>
      <span class="kit-btn-sub">${escapeHTML(kitLine())}</span>
    </button>

    <label class="switch-row" for="t-tds">
      <span class="switch-text">
        <span class="switch-title">Refractometer</span>
        <span class="switch-sub">Adds a TDS field and shows extraction yield. Off, the app works on dose, yield and time — which is what most bars have.</span>
      </span>
      <span class="switch"><input type="checkbox" id="t-tds"><span class="switch-track"><span class="switch-knob"></span></span></span>
    </label>

    <span class="field-label section">Appearance</span>
    <div class="seg" id="theme-seg" role="radiogroup" aria-label="Appearance"></div>

    <button class="btn btn-ghost kit-btn" id="btn-pinch">
      <span class="kit-btn-title">Find a starting grind</span>
      <span class="kit-btn-sub">The pinch test — where to set the dial before spending a shot</span>
    </button>

    <button class="btn btn-ghost kit-btn" id="btn-salami">
      <span class="kit-btn-title">Taste sour against bitter</span>
      <span class="kit-btn-sub">One shot into three glasses, so the taste question means something</span>
    </button>

    <button class="btn btn-ghost kit-btn" id="btn-dose-check">
      <span class="kit-btn-title">Check the dose</span>
      <span class="kit-btn-sub">${doseCheckLine()}</span>
    </button>

    <button class="btn btn-ghost" id="btn-help">What the numbers mean</button>
  `;
  body.querySelector('#btn-pinch').addEventListener('click', () => {
    closeModal('#settings-modal');
    openPinchTest();
  });
  body.querySelector('#btn-salami').addEventListener('click', () => {
    closeModal('#settings-modal');
    openSalami();
  });
  body.querySelector('#btn-dose-check').addEventListener('click', () => {
    closeModal('#settings-modal');
    openDoseCheck();
  });
  const tds = body.querySelector('#t-tds');
  tds.checked = prefs.tds;
  tds.addEventListener('change', () => { prefs.tds = tds.checked; savePrefs(); });

  const seg = body.querySelector('#theme-seg');
  [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].forEach(([key, label]) => {
    const b = el('button', 'seg-btn' + (prefs.theme === key ? ' on' : ''), label);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', prefs.theme === key ? 'true' : 'false');
    b.addEventListener('click', () => { prefs.theme = key; savePrefs(); applyTheme(); openSettings(); });
    seg.appendChild(b);
  });

  body.querySelector('#btn-kit').addEventListener('click', () => { closeModal('#settings-modal'); openKit(); });
  body.querySelector('#btn-help').addEventListener('click', () => { helpFrom = 'settings'; closeModal('#settings-modal'); openHelp(); });
  openModal('#settings-modal');
}

// Where Help was opened from, so closing it goes back there. Closing it
// used to land on the board, because Settings had already been closed to
// make room — a tester went in for the refractometer toggle, read the
// help, and had to walk the whole path again.
let helpFrom = null;

function openHelp() {
  $('#help-body').innerHTML = `
    <p><strong>Ratio</strong> is what came out divided by what went in. 18g in and 36g out is 1:2. It is a description of the shot, not a measure of how much was extracted from the coffee.</p>
    <p><strong>Flow</strong> is grams a second. It is the number that moves first when the grind moves, and a fast shot with a coarse-looking puck usually shows up here before it shows up in the taste.</p>
    <p><strong>Extraction yield</strong> is the share of the dry coffee that ended up dissolved in the cup — beverage mass × TDS ÷ dose. It needs a refractometer. This app will not print one without a reading: ratio is not extraction, time is not extraction, and a shot that tastes right is not a measurement. Turn the refractometer setting on if you have one.</p>
    <p><strong>How far to move the grinder</strong> is the question every tool like this dodges, because the number on your grinder means nothing on anybody else's. It means something on yours: two shots that differ only in grind are a measurement of it, and once this board has a couple it tells you how many ${grindUnit() === 'clicks' ? 'clicks' : 'points on your dial'} rather than "a step", along with where that lands on your own dial and what the clock should read. It also works out from the log whether your numbers go up or down as the burrs close, so it never has to ask.</p>
    <p><strong>The dose</strong> is settled by weight and by volume, and the second one is the part most guides skip. Your scale gives grams; the basket cares about the space the grounds take up, and the two only agree within one bag — a light roast is denser than a dark one. The gap the puck leaves under the shower screen is what matters, about 2mm of it, and a coin on the puck will tell you whether you have it. Too little and the puck meets the screen before the pump does; too much and the water moves the dry bed around. Both channel, and neither is fixable at the grinder.</p>
    <p><strong>Sour and bitter at once</strong> is not a point between the two. It is two different extractions in one cup — water round part of the bed and sitting in the rest — and it is the clearest sign in the whole method that the puck, not the grinder, is what needs attention.</p>
    <p><strong>How soluble the coffee is</strong> decides how much extraction it needs, and roast level is the biggest part of that but not all of it. Washed and high-grown beans are denser and give up less readily, so they want more; naturals and heavily fermented lots come out more easily, so they want less. Decaf is the odd one — decaffeination opens the bean up, so it extracts more readily <em>and</em> flows faster, which means a tighter ratio but a finer grind. Tell the app what the bag says and the starting point moves accordingly.</p>
    <p><strong>Heavily processed coffees are the exception to "sour means finer".</strong> The flavour you bought is the one the process put there, and pushing extraction burns it off. Sour in one of these is as often a bed that is already too tight — part of it giving up everything while the rest barely brews — so if finer does not fix it, coarser at the same yield is the next thing to try.</p>
    <p><strong>Grind is for the big moves; dose and yield are for the small ones.</strong> Grind is the only thing that really moves the clock, so it is what gets a shot into the window. After that it is an expensive tool: most grinders hold on to some of the last setting, so every change costs five to ten grams of purge and a shot you cannot read. Once you are close, half a gram of coffee or two of yield will do what you need and cost nothing. If your grinder is a single-doser and holds nothing back, that calculation changes and the app says so.</p>
    <p><strong>One flow variable at a time.</strong> Grind and dose both change how hard it is for the water to get through. Move both in the same shot and the clock cannot tell you which one did it, so the board says so when it sees it happen.</p>
    <p><strong>Ristretto, espresso, lungo</strong> are ratios rather than sizes. Up to about 1:1.5 is a ristretto, roughly 1:1.5 to 1:2.5 is espresso, and beyond that you are into lungo territory. The board names it when a shot leaves the middle band, because that is the difference between dialling a shot in and quietly ordering a different drink.</p>
    <p><strong>Your portafilter decides what you can see.</strong> Through a bottomless you watch the bed itself, and channelling shows as uneven flow and spray. With spouts the bed is hidden, and the tell is a sudden surge of flow in the last third. The sheet asks whichever question you can actually answer.</p>
    <p><strong>How it ran</strong> is the question that outranks the rest. Most bad espresso at home is water finding a crack and going round the puck instead of through it, and when that happens the clock and the cup are both readings of an accident — so the app stops talking about the grinder until the shot runs even. Grinding finer on a puck that channels tightens the bed and makes it worse.</p>
    <p><strong>The window</strong> is yours, per coffee. Nothing here calls a shot fast or slow until you have said what it is being measured against.</p>
    <p><strong>What to try next</strong> is a suggestion and it says which kind it is. Sour and fast, or bitter and slow, and grind is the answer — those two get an instruction. The other two corners do not point at grind at all, and the app says so rather than guessing, because grinding finer on a shot that is already slow makes it worse.</p>
    <p><strong>Sour, bitter, watery, muddy</strong> are two questions, not four, and the app asks them separately because they are answered separately.</p>
    <p><strong>Sour and bitter</strong> are the extraction walls. Sour is water that did not take enough out of the puck; bitter is water that took too much. Grind is the variable, because grind moves time — finer is slower is more extracted.</p>
    <p><strong>Watery and muddy</strong> are the concentration walls, and grind is not the variable. A shot can be extracted perfectly and still be thin, because thin is about how much coffee ended up in the cup: that is ratio and dose. Watery means stop the shot earlier or put more in the basket; muddy means let it run further, or put less in.</p>
    <p>A cup can sit on one wall, both, or neither, which is why they get a scale each rather than one word for the whole shot.</p>
    <p><strong>Your setup</strong> decides what this app asks you for. Say your machine holds one temperature and the temperature field leaves the sheet and stops appearing in the advice — a field you cannot change is a field you will end up filling in with a guess. Change it any time in Settings.</p>
    <p class="sheet-note">Everything is stored on this device. No account, no upload, and it works with no signal.</p>
  `;
  openModal('#help-modal');
}

let lastFocus = null;

/* Everything in a sheet that a Tab can reach, in the order it reaches it. */
function focusables(m) {
  return [...m.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
    .filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
    });
}

/* Tab stays in the sheet.

   These are marked aria-modal, and they were not: tabbing past the last
   control walked out of the sheet and onto the board behind it, where a
   keyboard user could log a second shot without the first one's sheet ever
   closing. A screen reader is told this dialog is modal; the tab ring has
   to agree with it. */
function trapTab(m, e) {
  if (e.key !== 'Tab') return;
  const items = focusables(m);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  const here = document.activeElement;
  if (e.shiftKey && (here === first || !m.contains(here))) {
    e.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!e.shiftKey && (here === last || !m.contains(here))) {
    e.preventDefault();
    first.focus({ preventScroll: true });
  }
}

function openModal(sel) {
  const m = $(sel);
  lastFocus = document.activeElement;
  m.classList.remove('hidden');
  if (!m.dataset.trapped) {
    m.dataset.trapped = '1';
    m.addEventListener('keydown', e => trapTab(m, e));
  }
  const first = m.querySelector('input, button, [tabindex]');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
}

function closeModal(sel) {
  $(sel).classList.add('hidden');
  // Focus goes back where it came from. A sheet that dismisses to the top
  // of the document makes a keyboard user walk the page again.
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

function applyTheme() {
  const root = document.documentElement;
  if (prefs.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', prefs.theme);
}

/* ============================================================
   BOOT
   ============================================================ */

function wire() {
  $('#btn-coffee').addEventListener('click', openCoffees);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-log').addEventListener('click', () => (activeCoffee() ? openShot(null) : addCoffee()));
  $('#shot-close').addEventListener('click', closeShotSheet);
  $('#kit-close').addEventListener('click', () => closeModal('#kit-modal'));
  $('#shot-save').addEventListener('click', saveShot);
  $('#coffee-close').addEventListener('click', () => closeModal('#coffee-modal'));
  $('#btn-add-coffee').addEventListener('click', addCoffee);
  $('#edit-close').addEventListener('click', () => closeModal('#edit-modal'));
  $('#pinch-close').addEventListener('click', () => closeModal('#pinch-modal'));
  $('#pinch-done').addEventListener('click', () => closeModal('#pinch-modal'));
  $('#salami-close').addEventListener('click', () => closeModal('#salami-modal'));
  $('#salami-done').addEventListener('click', () => closeModal('#salami-modal'));
  $('#dose-close').addEventListener('click', () => closeModal('#dose-modal'));
  $('#dose-done').addEventListener('click', () => closeModal('#dose-modal'));
  $('#settings-close').addEventListener('click', () => closeModal('#settings-modal'));
  $('#settings-done').addEventListener('click', () => closeModal('#settings-modal'));
  const closeHelp = () => {
    closeModal('#help-modal');
    if (helpFrom === 'settings') { helpFrom = null; openSettings(); }
  };
  $('#help-close').addEventListener('click', closeHelp);
  $('#help-done').addEventListener('click', closeHelp);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal:not(.hidden)');
    if (open) closeModal('#' + open.id);
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal('#' + m.id); });
  });
}

function boot() {
  load();
  applyTheme();
  wire();
  renderBoard();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

boot();
