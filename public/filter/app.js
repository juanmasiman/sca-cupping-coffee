/* ============================================================
   lento — filter brew log

   The third instrument on lento.cafe, and it is built on the same
   argument as the other two: the app will not print a number it
   cannot account for.

   What makes filter different from espresso is not the water, it is
   the schedule. An espresso is one event — you start it and you stop
   it. A pour-over is five or six, spread over three minutes, and the
   thing a brewer iterates on is when they happened and how much went
   in each time. So the pour schedule is a first-class record here,
   not a note.

   The other difference is that "filter brewer" describes two
   machines. In percolation the water passes through the bed, so grind
   changes the contact time and the clock is a symptom you can read.
   In immersion the coffee steeps for as long as you say it does, so
   grind changes extraction and the clock is a decision you made. The
   same advice cannot be right for both, and the kit says which one is
   on the counter.
   ============================================================ */

const STORE = 'lento-filter-v1';
const PREF = 'lento-filter-prefs-v1';

let state = null;
let prefs = { tds: false, theme: 'auto' };

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) state = migrate(JSON.parse(raw));
  } catch (e) { /* private mode, or a shape this build cannot read */ }
  if (!state || !Array.isArray(state.coffees)) {
    state = { v: 1, coffees: [], activeId: null, pourTotals: true, dead: {}, kitUpdated: 0 };
  }
  if (!state.kit) state.kit = defaultKit();
  /* Before anything can save. Every save stamps what changed since the
     last one, and "the last one" has to mean what is on disk — prime this
     after the first save and a phone that merely opened the app would
     claim every record on it was edited this second. */
  primeStamps();
  /* Write the migration back at once, so the converted schedules and the
     flag that says they are converted land together. Left in memory until
     the next brew was saved, the stored copy kept the old shape while the
     screen showed the new one — which is the sort of gap that turns into a
     double conversion the first time anything reads the store without
     going through here. */
  if (migrated) { save(); migrated = false; }
  /* This app's grinder goes on the person's list, so the dial-in can
     offer it instead of asking again. Nothing comes back the other way on
     its own: a DF64 on the espresso machine and a hand grinder for filter
     is the normal case, and this app does not ask about retention at all
     — so copying its kit into the dial-in was telling the dial-in to
     purge a grinder that holds nothing. `false` says as much: record the
     grind steps, which this app does ask about, and stay quiet on the
     question it never puts. */
  LentoKit.remember(state.kit, false);
  try {
    const raw = localStorage.getItem(PREF);
    if (raw) prefs = Object.assign(prefs, JSON.parse(raw));
  } catch (e) { /* defaults are fine */ }
}

function save() {
  stamp();
  writeState();
  queueSync();
}

/* Written without stamping, for the one caller that must not stamp: a
   sync has just merged records whose timestamps came from another device,
   and giving them this second's clock would make a pulled brew look
   locally edited and then beat the device it came from. */
function writeState() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* quota, private mode */ }
}

/* ---------- when each record last changed ----------

   Sync is last-write-wins per brew, so every brew needs an honest
   `updated` and so does every coffee. Stamping it at the dozen places
   that mutate them is how you get a stale timestamp: the site somebody
   adds next year is the one that forgets, and a forgotten stamp does not
   look like a bug — it looks like the other device winning.

   So it is done here, once, against the only thing that cannot lie: the
   content. Every save compares each record with what was written last
   time and gives the clock to the ones that actually changed. This is the
   dial-in's mechanism, in the same shape, for the same reason. */

let lastSaved = new Map();

// `updated` is excluded from its own fingerprint, or stamping a record
// would make it differ again at the next save, for ever.
function fingerprint(o) {
  return JSON.stringify(o, (k, v) => (k === 'updated' ? undefined : v));
}

// A coffee without its brews: they carry their own stamps, and a coffee
// whose name is unchanged should not look edited because a brew was added.
function coffeeShell(c) {
  const shell = Object.assign({}, c);
  delete shell.brews;
  return shell;
}

function stampAll(fn) {
  const next = new Map();
  (state.coffees || []).forEach(c => {
    (c.brews || []).forEach(b => {
      if (!b.id) b.id = uid();
      fn('b:' + b.id, fingerprint(b), b, next);
    });
    fn('c:' + c.id, fingerprint(coffeeShell(c)), c, next);
  });
  fn('k:kit', fingerprint(state.kit || {}), state, next);
  lastSaved = next;
}

function stamp() {
  const now = Date.now();
  stampAll((key, fp, rec, next) => {
    next.set(key, fp);
    if (lastSaved.get(key) !== fp) {
      if (key === 'k:kit') state.kitUpdated = now;
      else rec.updated = now;
    }
  });
}

/* Primed from what was on disk, so the first save of a session stamps
   nothing. Without this, opening the app on a second device would tell
   the cloud that every record there is brand new, and a phone that merely
   launched would overwrite a phone that was used. */
function primeStamps() {
  stampAll((key, fp, rec, next) => next.set(key, fp));
}

// What a record's timestamp is, for deciding a conflict. A coffee is as
// new as its newest brew: the brews are the thing being edited.
function coffeeUpdated(c) {
  let t = c.updated || 0;
  (c.brews || []).forEach(b => { if ((b.updated || 0) > t) t = b.updated; });
  return t;
}

function savePrefs() {
  try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) { /* as above */ }
}

// Older shapes get repaired rather than discarded: somebody's brew log is
// the only copy of a month of mornings.
// Set when migrate() actually changed something, so load() knows to persist.
let migrated = false;

const TOMB_DAYS = 180;

function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  s.kit = Object.assign(defaultKit(), s.kit || {});
  /* THE ONE BREWER BECOMES THE FIRST ONE ON THE SHELF.

     A kit written before the shelf existed holds `brewer` and `flow` as
     two loose fields. They are the same pair the shelf stores, so the
     answer somebody already gave is carried over rather than asked
     again — and every brew in the log is stamped with the brewer that
     made it, because it did. Leave them unstamped and the day a second
     brewer arrives, every past brew silently starts reporting itself as
     having been made in it. */
  /* An empty shelf beside a named brewer is the pre-shelf shape, because
     nothing else produces it: taking the last brewer off the shelf clears
     the name with it. (`defaultKit` supplies `brewers: []`, so testing
     whether the field exists would never fire — the merge has already put
     one there.) */
  if (!Array.isArray(s.kit.brewers)) s.kit.brewers = [];
  if (!s.kit.brewers.length && s.kit.brewer) {
    s.kit.brewers = [{ name: s.kit.brewer, flow: s.kit.flow || 'percolation' }];
  }
  s.kit.brewers = s.kit.brewers.filter(b => b && typeof b.name === 'string' && b.name.trim());
  /* What was deleted, and when.

     Last-write-wins has no opinion about absence: a brew you removed on
     this phone is simply missing here and present in the cloud, so the
     next sync puts it back and the delete looks like it did not take. So
     a delete writes down that it happened, and a record whose tombstone
     is newer than the copy on offer stays deleted.

     They are pruned after half a year, which is the one case this gets
     wrong: a device offline for longer than that, still holding the brew,
     will bring it back. Keeping them for ever to close that is a log that
     only grows. */
  if (!s.dead || typeof s.dead !== 'object') s.dead = {};
  const stale = Date.now() - TOMB_DAYS * 86400000;
  Object.keys(s.dead).forEach(k => { if ((s.dead[k] || 0) < stale) delete s.dead[k]; });
  /* The kit has one stamp for all of it, because it is one answer about
     one kitchen rather than a list. A kit somebody filled in counts as
     current; an untouched default counts as never answered, so the device
     that knows wins against the device that was only opened. */
  if (typeof s.kitUpdated !== 'number') s.kitUpdated = s.kit.asked ? Date.now() : 0;
  (s.coffees || []).forEach(c => {
    if (!c.dead || typeof c.dead !== 'object') c.dead = {};
    Object.keys(c.dead).forEach(k => { if ((c.dead[k] || 0) < stale) delete c.dead[k]; });
    if (!c.target) c.target = defaultTarget();
    if (typeof c.target.temp === 'undefined') c.target.temp = null;
    if (typeof c.roast !== 'string') c.roast = '';
    ['origin', 'variety', 'process', 'altitude', 'bagNotes'].forEach(f => {
      if (typeof c[f] !== 'string') c[f] = '';
    });
    if (typeof c.grindNow !== 'string') c.grindNow = '';
    if (!Array.isArray(c.brews)) c.brews = [];
    c.brews.forEach(b => {
      // See the note in the kit migration above: a brew with no brewer on
      // it was made in the only one there was.
      if (typeof b.brewer !== 'string') b.brewer = s.kit.brewer || '';
      if (!Array.isArray(b.flavours)) b.flavours = [];
      if (typeof b.taste === 'undefined') b.taste = null;
      if (typeof b.body === 'undefined') b.body = null;
      if (typeof b.intent === 'undefined') b.intent = null;
      if (!Array.isArray(b.pours)) b.pours = [];
      if (!b.id) b.id = uid();
      // Brews written before sync existed: the time they were brewed is
      // the truest thing available, and it is older than anything the
      // cloud can hold for them, which is the safe direction to be wrong.
      if (typeof b.updated !== 'number') b.updated = b.at || Date.now();
    });
    if (typeof c.updated !== 'number') c.updated = coffeeUpdated(c) || Date.now();
  });
  /* The pour schedule used to hold the weight of each pour; it now holds
     the running total on the scale (see buildPours). Incremental converts
     to cumulative by a running sum, which is exactly what those schedules
     already meant — so this reads somebody's existing log rather than
     guessing at it, and it runs once. */
  if (!s.pourTotals) {
    (s.coffees || []).forEach(c => (c.brews || []).forEach(b => {
      let run = 0;
      (b.pours || []).forEach(p => {
        const w = num(p.water);
        if (w === null) return;
        run += w;
        p.water = run;
      });
    }));
    s.pourTotals = true;
    migrated = true;
  }
  return s;
}

/* ---------- the kit ----------

   Asked once, before the first brew, for the same reason the dial-in
   asks: a field you can see and cannot change is a field you will end up
   filling in with a guess, and advice that names a variable you do not have
   is worse than no advice at all.

   A shelf and three questions, and the shelf is the one that changes
   what the app is allowed to say:

   - **What do you brew in?** Plural. In a V60 the grind sets the flow
     rate, so a slow brew and a bitter cup are the same fact and
     "coarser" fixes both. In a French press the steep time is whatever
     the timer said, so grind changes extraction with the clock held
     still, and telling somebody their four-minute press ran long is
     telling them about their own decision. A switch brewer does both, in
     that order. That difference used to be asked as a question about
     "the water", once, for the whole kitchen. It is a property of the
     brewer, most brewers are on a list, and a person owns more than one —
     so it is a shelf, the list answers it, and the brew records which
     brewer made it.

   - **Can you set the kettle temperature?** Most kettles cannot, and
     "up two degrees" to somebody holding a stovetop kettle is the app
     admitting it does not know what is in the room. Without one the
     temperature field leaves the sheet and the advice talks about how
     long off the boil instead.

   - **Do you brew by weight?** A great many people do not, and a ratio
     built from a scoop is not a ratio. Without a scale there is no dose
     in grams, no water in grams and no ratio anywhere in the app —
     which leaves grind, time and taste, and those are enough to keep a
     useful log. Printing "1:16.0" over a guess would not be.

   - **Does the grinder count clicks or read a number?** Only so the app
     uses the brewer's own words. It never suggests a setting, because
     your numbers mean nothing on anybody else's grinder.

   The names of the things are carried as the user's own record. Nothing
   is read out of them: a brand table goes stale within a year and is
   wrong about every hybrid on the shelf.                              */

function defaultKit() {
  return {
    /* A SHELF, NOT A BREWER.

       This was one text field, on the assumption that a person owns a
       brewer. A person owns brewers: a V60 on a Saturday and a press on
       a weekday morning is the ordinary kitchen, and the app was asking
       which one of them you are, once, for ever.

       `brewers` is what is on the shelf. `brewer` is the one you reached
       for last, which is only ever the default on a fresh sheet — the
       brew itself records which one made it, so switching today does not
       rewrite what last week was brewed in. */
    brewer: '',
    brewers: [],          // [{ name, flow }]
    /* The fallback for a brewer with no entry, and the answer every kit
       written before the shelf existed already carries. */
    flow: 'percolation',  // 'percolation' | 'immersion' | 'switch'
    kettle: '',
    grinder: '',
    temp: 'fixed',        // 'fixed' — off the boil | 'set' — you choose it
    steps: 'stepless',    // 'stepped' — clicks | 'stepless' — a number
    scale: true,          // brewing by weight
    asked: false,
  };
}

/* WHAT THE APP IS ALLOWED TO KNOW FROM A BRAND NAME.

   This file's kit comment refuses brand tables, and it is right about
   what it was refusing: a grind setting read out of a model name goes
   stale within a year and is wrong about every hybrid on the shelf.

   Whether the water drains out of the bottom is not that kind of fact. A
   V60 has a hole in it. A press does not. Next year's V60 will still have
   a hole, and the hybrids — the ones that steep and then open — are not a
   gap in the table, they are the third answer it already had a word for.

   So the table seeds one editable answer once, and everything else about
   the name stays the person's own record. What you said about your own
   brewer always wins: see brewerEntry. */
const BREWERS = [
  { name: 'Hario V60', flow: 'percolation' },
  { name: 'Kalita Wave', flow: 'percolation' },
  { name: 'Chemex', flow: 'percolation' },
  { name: 'Origami', flow: 'percolation' },
  { name: 'Orea', flow: 'percolation' },
  { name: 'April', flow: 'percolation' },
  { name: 'Fellow Stagg [X]', flow: 'percolation' },
  { name: 'Melitta', flow: 'percolation' },
  { name: 'Tricolate', flow: 'percolation' },
  { name: 'Clever Dripper', flow: 'switch' },
  { name: 'Hario Switch', flow: 'switch' },
  { name: 'French press', flow: 'immersion' },
  /* The press at the end of an AeroPress is quick and the extraction has
     already happened in the chamber, so it is logged as a steep. Anybody
     who disagrees can say so on their own entry, which is the point of
     the entry. */
  { name: 'AeroPress', flow: 'immersion' },
  { name: 'Cupping bowl', flow: 'immersion' },
];

const kit = () => (state && state.kit) || defaultKit();
// Whether the shelf holds more than one, which is the only condition
// under which naming the brewer on a card tells anybody anything.
const multiBrewer = () => ((kit().brewers || []).length > 1);

/* Yours over the shipped list, always. Somebody who has told this app
   that their Switch is only ever used open has said something truer about
   their mornings than a table can. */
function brewerEntry(name) {
  if (!name) return null;
  const mine = (kit().brewers || []).find(b => b && b.name === name);
  if (mine) return mine;
  return BREWERS.find(b => b.name === name) || null;
}

/* Water through a bed, or coffee in water. Everything the app is willing
   to say about the clock turns on this — and it turns on it per brew now,
   not per kitchen, because the answer is a property of the thing in your
   hand this morning. Given a brew, that brew's brewer; given nothing, the
   one you reached for last. */
function waterFlow(b) {
  const e = brewerEntry((b && b.brewer) || kit().brewer);
  return (e && e.flow) || kit().flow || 'percolation';
}
const percolates = b => waterFlow(b) !== 'immersion';
const steeps = b => waterFlow(b) !== 'percolation';
const canSetTemp = () => kit().temp === 'set';
const byWeight = () => kit().scale !== false;
const grindUnit = () => (kit().steps === 'stepped' ? 'clicks' : 'setting');

const FLOWS = {
  percolation: {
    label: 'It drains as you pour',
    short: 'drains through',
    eg: 'V60, Chemex, Kalita',
    lo: 150, hi: 210,
  },
  immersion: {
    label: 'It sits until you decide',
    short: 'steeps',
    eg: 'press, AeroPress',
    lo: 210, hi: 270,
  },
  switch: {
    label: 'It steeps, then you open it',
    short: 'steeps, then drains',
    eg: 'Clever, Hario Switch',
    lo: 180, hi: 240,
  },
};
const flowEntry = b => FLOWS[waterFlow(b)] || FLOWS.percolation;

/* ---------- the model ---------- */

function uid() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* The window a brew is judged against.

   1:16 in two and a half to three and a half minutes is where most
   pour-over recipes start; immersion runs longer because nothing is
   draining. It is a field on the coffee rather than a constant in here
   for the same reason the dial-in's is: a brew is only fast or slow
   against something, and this app will not call one slow until somebody
   has said what slow means. */
function defaultTarget() {
  const f = flowEntry();
  return { dose: 15, ratio: 16, timeLo: f.lo, timeHi: f.hi, temp: null };
}

/* A starting point from the bag.

   Roast level moves extraction more than anything else printed on a bag:
   a light roast is dense and less soluble, so it takes more heat and
   usually a wider ratio to give up the same amount; a dark roast is
   friable and gives up too much at the same settings. The dial-in takes
   the same line and for the same reason — one variable, stated, rather
   than four averaged into a number whose confidence nobody can read.

   Filter temperatures run hotter than espresso's because the contact is
   longer and the pressure is atmospheric. */
const ROASTS = [
  { key: 'light', label: 'Light', temp: 96, ratio: 16.7, tempRange: '95–97°', ratioRange: '1:16–1:17' },
  { key: 'mlight', label: 'Medium-light', temp: 94, ratio: 16.0, tempRange: '93–95°', ratioRange: '1:15.5–1:16.5' },
  { key: 'medium', label: 'Medium', temp: 93, ratio: 15.5, tempRange: '92–94°', ratioRange: '1:15–1:16' },
  { key: 'mdark', label: 'Medium-dark', temp: 91, ratio: 15.0, tempRange: '90–92°', ratioRange: '1:14.5–1:15.5' },
  { key: 'dark', label: 'Dark', temp: 89, ratio: 14.5, tempRange: '88–90°', ratioRange: '1:14–1:15' },
];

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
    /* WHAT ELSE IS ON THE BAG.

       Asked because a bag says it and somebody wants it written down
       beside the brews — not because this app reasons from any of it. It
       does not: the starting point comes from roast level alone, which is
       the strongest thing a bag tells you about extraction and the only
       one used, and folding four weak signals in behind it would make the
       answer's confidence harder to read rather than the answer better.
       That argument is in DESIGN.md and these fields do not touch it.

       Free text, all of them, including altitude. The dial-in asks for
       altitude as bands because a band is what its solubility model
       consumes; here nothing consumes it, so the honest field is the one
       that takes what the bag actually printed — "1,900–2,100 masl" and
       all. A control that looks like it feeds something, and does not,
       is a promise this app has not made. */
    origin: '',
    variety: '',
    process: '',
    altitude: '',
    // What the roaster says it tastes like, which is a different claim
    // from what you found — yours goes on each brew.
    bagNotes: '',
    // How far the grinder has moved from the recipe you settled on. The
    // recipe itself is never rewritten; see the keeper card.
    grindNow: '',
    target: defaultTarget(),
    brews: [],
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

function brewsNewestFirst(c) {
  return c ? [...c.brews].reverse() : [];
}

/* ---------- what the numbers say ---------- */

const num = v => (typeof v === 'number' && isFinite(v) ? v : null);

/* A ratio, or nothing.

   No scale, no ratio: a brew measured in scoops has no ratio and the app
   does not print one from a guess. With a scale, a brew missing either
   number has no ratio either — it is not 1:0 and it is not zero, there
   simply is not one, and the slot says so. */
function ratioOf(brew) {
  if (!byWeight()) return null;
  const d = num(brew.dose), w = num(brew.water);
  if (d === null || w === null || d <= 0) return null;
  return w / d;
}

// The bloom, as a multiple of the dose. Two to three times is the usual
// rule; the number matters more than the millilitres because it scales.
function bloomOf(brew) {
  if (!byWeight()) return null;
  const d = num(brew.dose);
  const first = brew.pours && brew.pours[0];
  const w = first ? num(first.water) : null;
  if (d === null || w === null || d <= 0) return null;
  return w / d;
}

/* Drawdown: the time between the last pour landing and the bed running
   dry. It is the diagnostic a pour-over has and a shot does not — a bed
   that takes ninety seconds to clear after the final pour is telling you
   about the grind, or about fines, long before the taste does.

   Only percolation has one. In immersion there is nothing draining until
   you decide there is. */
function drawdownOf(brew) {
  if (!percolates(brew)) return null;
  const t = num(brew.time);
  const pours = (brew.pours || []).filter(p => num(p.at) !== null);
  if (t === null || !pours.length) return null;
  const last = Math.max(...pours.map(p => num(p.at)));
  const d = t - last;
  return d >= 0 ? d : null;
}

/* Where the scale ends up, which should agree with the water figure — and
   when it does not, the card says so rather than silently preferring one.

   The schedule is kept as running totals rather than the weight of each
   pour, so this is the last of them and not their sum. See buildPours for
   why: it is what the scale reads and how every recipe is written, and
   summing pours that were entered as totals is how this app used to
   accuse a correctly-logged brew of adding up to 390g. */
function pouredTotal(brew) {
  const pours = (brew.pours || []).map(p => num(p.water)).filter(v => v !== null);
  return pours.length ? Math.max(...pours) : null;
}

/* A schedule whose totals go down is a typo, not a brew: you cannot take
   water back out of the bed. Named so the sheet can say which pour, since
   "the schedule is wrong" sends somebody hunting through five rows. */
function pourBacktrack(brew) {
  const pours = brew.pours || [];
  let high = null, highIdx = 0;
  for (let i = 0; i < pours.length; i++) {
    const w = num(pours[i].water);
    if (w === null) continue;
    if (high !== null && w < high) {
      return { at: i, label: i === 0 ? 'The bloom' : `Pour ${i}`, value: w,
               prev: high, prevLabel: highIdx === 0 ? 'the bloom' : `pour ${highIdx}` };
    }
    high = w; highIdx = i;
  }
  return null;
}

// What this pour added, for a reader who wants the weight of the pour and
// not the total. Derived, never typed — the subtraction is the app's job.
function pourAdded(brew, i) {
  const pours = brew.pours || [];
  const w = num((pours[i] || {}).water);
  if (w === null) return null;
  for (let k = i - 1; k >= 0; k--) {
    const before = num(pours[k].water);
    if (before !== null) return w - before;
  }
  return w;
}

/* Extraction yield needs a refractometer AND a weighed cup.

   Ratio is not extraction, time is not extraction, and a brew that
   tastes right is not a measurement. Filter has one extra trap the
   dial-in does not: the beverage is not the water, because the bed keeps
   roughly twice its own weight. Every tool that "computes" filter EY
   from dose and water alone is estimating that retention and printing
   the result as a reading. This one asks for the cup on the scale, or
   returns nothing. */
function extractionOf(brew) {
  if (!prefs.tds || !byWeight()) return null;
  const tds = num(brew.tds), bev = num(brew.beverage), dose = num(brew.dose);
  if (tds === null || bev === null || dose === null || dose <= 0) return null;
  return (bev * tds) / dose;
}

function isComplete(brew) {
  return missingFields(brew).length === 0;
}

// Which of the numbers a brew needs are not on it.
function missingFields(brew) {
  const out = [];
  if (byWeight()) {
    if (num(brew.dose) === null) out.push('dose');
    if (num(brew.water) === null) out.push('water');
  }
  if (num(brew.time) === null) out.push('time');
  return out;
}

/* Where this brew sits against the window on the coffee.

   Returns null for time when there is no time on the brew — the app does
   not call a brew fast without one, and it does not call it fast without
   a window either. */
function placeOf(brew, target) {
  const t = num(brew.time);
  let time = null;
  if (t !== null && target) {
    if (t < target.timeLo) time = 'fast';
    else if (t > target.timeHi) time = 'slow';
    else time = 'in';
  }
  const r = ratioOf(brew);
  let ratio = null;
  if (r !== null && target && target.ratio) {
    if (r < target.ratio - 0.5) ratio = 'tight';
    else if (r > target.ratio + 0.5) ratio = 'wide';
    else ratio = 'in';
  }
  return { time, ratio };
}

/* ---------- what you meant to change ---------- */

const INTENTS = [
  { key: 'finer', label: 'Finer', field: 'grind', dir: -1 },
  { key: 'coarser', label: 'Coarser', field: 'grind', dir: 1 },
  { key: 'hotter', label: 'Hotter', field: 'temp', dir: 1 },
  { key: 'cooler', label: 'Cooler', field: 'temp', dir: -1 },
  { key: 'more', label: 'More water', field: 'water', dir: 1 },
  { key: 'less', label: 'Less water', field: 'water', dir: -1 },
  { key: 'pours', label: 'Different pours', field: null, dir: 0 },
  { key: 'same', label: 'Same again', field: null, dir: 0 },
];

function intentEntry(key) {
  return INTENTS.find(i => i.key === key) || null;
}

// The intents this kit can actually carry out. "Hotter" is not an
// intention on a kettle with one setting, and offering it invites
// somebody to record a change they did not make.
function liveIntents(brew) {
  return INTENTS.filter(i => {
    if (i.field === 'temp' && !canSetTemp()) return false;
    if (i.field === 'water' && !byWeight()) return false;
    if (i.key === 'pours' && !percolates(brew)) return false;
    return true;
  });
}

/* Did the brew do what it was told?

   Null when there is nothing to check — no intention, or no previous
   brew to have changed from. Otherwise a sentence about the
   disagreement, and nothing at all when they agree, because a morning
   that is going to plan does not need narrating.

   Empty is not zero. These fields arrive as strings from text inputs,
   and Number('') is 0 — which is finite, and which would make "finer"
   against a brew with no grind recorded read as a grind of nought. */
function intentCheck(brew, prev) {
  const intent = intentEntry(brew.intent);
  if (!intent || !prev) return null;
  const read = (o, f) => {
    const raw = o[f];
    if (raw === '' || raw === null || typeof raw === 'undefined') return null;
    const v = Number(raw);
    return isFinite(v) ? v : null;
  };

  if (intent.key === 'pours') {
    const a = JSON.stringify((brew.pours || []).map(p => [num(p.at), num(p.water)]));
    const b = JSON.stringify((prev.pours || []).map(p => [num(p.at), num(p.water)]));
    return a === b && a !== '[]'
      ? 'Marked “different pours”, but the schedule is the same as the last brew.'
      : null;
  }
  if (!intent.field) {
    const moved = ['grind', 'temp', 'dose', 'water']
      .filter(f => { const a = read(brew, f), b = read(prev, f); return a !== null && b !== null && a !== b; });
    return moved.length
      ? `Marked “same again”, but ${moved.length > 1
          ? `${moved.slice(0, -1).join(', ')} and ${moved[moved.length - 1]}`
          : moved[0]} changed since the last brew.`
      : null;
  }

  const now = read(brew, intent.field), was = read(prev, intent.field);
  if (now === null || was === null) {
    return `Marked “${intent.label.toLowerCase()}”, but no ${intent.field} is recorded on both brews, so there is nothing to compare.`;
  }
  const delta = now - was;
  if (delta === 0) return `Marked “${intent.label.toLowerCase()}”, but the ${intent.field} is the same as the last brew.`;
  if (Math.sign(delta) !== intent.dir) {
    return `Marked “${intent.label.toLowerCase()}”, but the ${intent.field} moved the other way.`;
  }
  return null;
}

/* ---------- what the grinder is worth, in seconds ----------

   The measurement lives in /shared/grind.js, shared with the dial-in,
   because it is the same measurement of the same machine: somebody who
   pulls shots and makes pour-over owns one grinder, and it does not
   behave differently depending on what is downstream of it.

   What is here is the part that is this app's, and it is a refusal.
   This only works where grind sets the flow. In a percolating brewer
   the water's time in the bed is a consequence of how fine the coffee
   is, so seconds-per-step is a real quantity. In an immersion brewer
   the time is whatever the timer was set to — grinding finer does not
   lengthen a four-minute press — so a "seconds per click" figure there
   would be measuring the brewer's own decisions and presenting them as
   a property of the grinder. Immersion gets the honest "one step"
   instead, which is the same answer every other tool gives and the only
   one that is true there. */

const GRIND = makeGrind({
  /* ONLY THE BREWS WHERE THE GRIND SET THE CLOCK.

     The estimate this feeds is seconds per step, and it is refused
     outright on a brewer that steeps because there the clock is a number
     somebody chose — see the comment on `enabled` below and the long one
     further down. With one brewer per kitchen that refusal was enough.
     With a shelf it is not: a press brew sitting in the same log would
     be handing the arithmetic a four-minute timer setting as though it
     were a drawdown, and the figure would come out of a V60's estimate
     looking like evidence.

     (Still coarse in one way: a V60 and a Chemex are averaged together.
     Both percolate, so grind moves the clock in both, and that is the
     relationship being measured — but they are not the same brewer and a
     per-brewer figure would be truer. Written down rather than hidden.) */
  logs: () => ((state && state.coffees) || [])
    .map(c => (c.brews || []).filter(b => percolates(b))),
  stepped: () => kit().steps === 'stepped',
  /* 'step' was wrong on a stepless dial in the one place it mattered
     most — the sentence that promises to replace "a step" with a number.
     A numeric collar has no clicks, and the sensitivity figure is seconds
     per whole number on that collar — so that is what it is called. Not
     "a tenth": moves are quoted in tenths, but 2.0s is what a whole point
     is worth, and naming the smaller unit would understate the grinder
     tenfold in the one sentence the reader checks the estimate against. */
  unitWord: () => (grindUnit() === 'clicks' ? 'click' : 'point on your dial'),
  itemWord: () => 'brew',
  /* WHICH BREWER THIS ANSWER IS ABOUT.

     `enabled` gates the seconds-per-step figure and the promise to learn
     one, and it takes no argument — the shared model was written when a
     kitchen had one brewer and the answer could not vary within a
     session. With a shelf it varies per brew, and reading the default
     brewer here put a real sentence on a real screen that this app's own
     rules forbid: a press brew was told "your grinder has been worth
     about 3.0s a click, so expect around 3:30", which is a clock
     prediction about a timer the person sets themselves.

     So `grindMoveParts` says which brew it is asking about, and this
     reads it. Ambient state, which is not free — but the alternative is
     a signature change in a module the dial-in also depends on, for a
     distinction only this app has. It is set and cleared around the one
     call, and there is exactly one. */
  enabled: () => percolates(advising),
  fmtTime: v => fmtTime(v),
  timeOf: b => num(b.time),
  grindOf: b => (b.grind === '' ? null : num(Number(b.grind))),
  doseOf: b => num(b.dose),
  waterOf: b => num(b.water),
  waterSlack: 20,
  noiseFloor: 6,
});

/* How many seconds the next brew should move, signed.

   Outside the window, aim at the middle of it. Inside it and still
   tasting of a wall, aim at the end the move is heading for — finer
   buys extraction, so it goes toward the slow end — because "grind
   finer" on a brew already where it should be still has to mean some
   particular distance. */
function secondsWanted(brew, target, finer) {
  const t = num(brew.time);
  if (t === null) return null;
  const place = placeOf(brew, target);
  if (place.time === 'in') {
    const aim = finer ? target.timeHi : target.timeLo;
    const d = aim - t;
    return Math.abs(d) < 2 ? (finer ? 3 : -3) : d;
  }
  return (target.timeLo + target.timeHi) / 2 - t;
}

// The brew the grind model is reasoning about, for the length of one
// call. Null outside it, which falls back to the brewer you reached for
// last — the right answer for anything asking in general.
let advising = null;

function grindMoveParts(brew, target, finer) {
  advising = brew || null;
  try {
    return GRIND.parts({
      wantSeconds: secondsWanted(brew, target, finer),
      currentGrind: brew ? brew.grind : null,
      currentTime: num(brew && brew.time),
      lo: target.timeLo, hi: target.timeHi,
    });
  } finally {
    advising = null;
  }
}

const grindMoveLine = (brew, target, finer) => grindMoveParts(brew, target, finer).move;
const grindWhyLine = (brew, target, finer) => grindMoveParts(brew, target, finer).why;

/* ---------- the two walls ---------- */

const TASTE_MIN = -3, TASTE_MAX = 3;

// Extraction. The same axis the dial-in uses, because it is the same
// fact about the same bean: sour is water that did not take enough,
// bitter is water that took too much.
const TASTE_WORDS = {
  '-3': 'sharp, sour', '-2': 'sour', '-1': 'a little sour',
  '0': 'neither',
  '1': 'a little bitter', '2': 'bitter', '3': 'harsh, drying',
};

// Strength. Filter's second wall is not "muddy" — nothing in a paper
// filter is muddy — it is thin against heavy, and it is moved by how
// much water went through the same dose.
const BODY_WORDS = {
  // "thin" throughout: the field asks thin or strong and the scale is
  // anchored thin↔strong, so a card that came back saying "weak" was the
  // app using a word its own axis does not have.
  '-3': 'thin, watery', '-2': 'thin', '-1': 'a little thin',
  '0': 'neither',
  '1': 'a little strong', '2': 'strong', '3': 'thick, syrupy',
};

const tasteWord = v => TASTE_WORDS[String(v)] || '';
const bodyWord = v => BODY_WORDS[String(v)] || '';

function tasteSide(v) {
  if (v === null || typeof v !== 'number') return null;
  if (v <= -1) return 'sour';
  if (v >= 1) return 'bitter';
  return 'neither';
}

function bodySide(v) {
  if (v === null || typeof v !== 'number') return null;
  if (v <= -1) return 'weak';
  if (v >= 1) return 'strong';
  return 'neither';
}

/* Both walls at once, which is one fault rather than two.

   Filter is the cleanest case this product has for asking the two axes
   separately, because in a brewer the two variables barely touch: grind
   decides how much comes out of the bed, and the amount of water decides
   how much of the cup it is. A tool that answers "grind finer" to a weak
   cup is sending somebody to the wrong machine.

   Read together, each corner has exactly one move:

     sour + thin      under-extracted          grind finer
     bitter + strong  over-extracted           grind coarser
     sour + strong    the ratio is too tight   more water
     bitter + thin    the ratio is too wide    less water

   The diagonal is the pair every brewer learns first: one change moves
   both walls. The anti-diagonal is where people get stuck, because the
   wall you notice sends you to the grinder and the grinder is not what
   is wrong.

   On the two grind answers the clock still outranks the cup — but only
   where the clock is a symptom. In a percolating brewer grind sets the
   flow, so a brew that is already slow cannot be answered with "finer".
   In immersion the clock is a number somebody chose, and grinding finer
   does not lengthen it, so the same caution would be nonsense. */
/* A move worth making, in grams you would actually pour.

   Roughly one and a half times the dose is a step big enough to taste and
   small enough to still be the same brew — but "pour 23g more" is a
   number off a calculator. Rounded to the nearest 5, it is an
   instruction. */
function pourStep(brew) {
  const d = num(brew.dose) || 15;
  return Math.max(5, Math.round((d * 1.5) / 5) * 5);
}

function wallPair(brew, target) {
  const t = tasteSide(brew.taste);
  const b = bodySide(brew.body);
  if (t === null || b === null || t === 'neither' || b === 'neither') return null;
  const place = placeOf(brew, target);
  const r = ratioOf(brew);
  const at = r === null ? '' : ` at 1:${r.toFixed(1)}`;
  const clock = percolates(brew);

  if (t === 'sour' && b === 'weak') {
    if (clock && place.time === 'slow') {
      return { sure: false, move: 'Under-extracted — but not for want of grind.',
        why: 'Sour and thin is the picture of an under-extracted brew and finer is the usual answer, except this one already ran past the window: finer would only slow it further. Water that sits that long and still takes little with it is going round the bed rather than through it — look at how level the bed is and at whether the pours are cutting a channel in it.' };
    }
    return { sure: true, move: `Grind finer${grindMoveLine(brew, target, true)}.`,
      why: `Sour and thin together are one fault, not two — not enough came out of the bed, so the cup is sharp and weak at the same time. Finer is the single change that moves both${
        clock && place.time === 'fast' ? ', and it slows the brew back into the window on the way' : ''}${
        !clock ? ', with the steep time exactly where you set it' : ''}.${grindWhyLine(brew, target, true)}` };
  }
  if (t === 'bitter' && b === 'strong') {
    if (clock && place.time === 'fast') {
      return { sure: false, move: 'Over-extracted — but not for want of grind.',
        why: 'Bitter and strong is the picture of an over-extracted brew and coarser is the usual answer, except this one already came in short of the window: coarser would only make it faster. Water that drains that quickly and still takes too much is running through part of the bed and not the rest — a gentler pour and a flatter bed before anything else.' };
    }
    return { sure: true, move: `Grind coarser${grindMoveLine(brew, target, false)}.`,
      why: `Bitter and strong together are one fault, not two — too much came out of the bed, so the cup is harsh and heavy with it. Coarser is the single change that moves both${
        clock && place.time === 'slow' ? ', and it brings the brew back into the window on the way' : ''}${
        !clock ? ', with the steep time exactly where you set it' : ''}.${grindWhyLine(brew, target, false)}` };
  }
  if (t === 'sour' && b === 'strong') {
    return { sure: true, move: byWeight() ? 'More water.' : 'A bigger cup, same coffee.',
      why: byWeight()
        ? `Sour and strong${at} is the ratio rather than the grind: there was not enough water to finish taking what it came for, and what it did take is packed into a small cup. Pour ${pourStep(brew)}g more onto the same dose and both ends move together. Leave the grinder where it is.`
        : 'Sour and strong is the ratio rather than the grind: too little water for that much coffee, so it is both under-extracted and concentrated. More water on the same scoop, and leave the grinder where it is.' };
  }
  return { sure: true, move: byWeight() ? 'Less water.' : 'Less water, same coffee.',
    why: byWeight()
      ? `Bitter and thin${at} is the ratio rather than the grind: the last of the water was pulling the harsh end out of the bed and diluting what you already had. Stop ${pourStep(brew)}g earlier on the same dose and both ends move together. Leave the grinder where it is.`
      : 'Bitter and thin is the ratio rather than the grind: too much water through too little coffee, so it is over-extracted and dilute at once. Less water on the same scoop, and leave the grinder where it is.' };
}

/* One wall named, and it is the extraction one.

   Crossed with the clock, where the clock means something. */
function tasteNote(brew, target) {
  const side = tasteSide(brew.taste);
  if (side === null) return null;
  const place = placeOf(brew, target);
  const clock = percolates(brew);

  if (side === 'neither') {
    if (place.time === 'in' || !clock) {
      return brew.verdict === 'keeper'
        ? { sure: true, move: 'This is the recipe.',
            why: 'Tasting of neither wall. It is pinned at the top of the board; brew the next one to it and change nothing.' }
        : { sure: true, move: 'This is the one.',
            why: 'Tasting of neither wall, and nothing about the cup is asking to be moved. Mark it as the keeper and the recipe pins to the top of this board.' };
    }
    if (place.time === null) return null;
    return { sure: false, move: 'Taste says nothing is wrong.',
      why: `It ran ${place.time === 'fast' ? 'quicker' : 'longer'} than the window but tastes of neither wall, which is worth more than the window is. Either move the window to fit this coffee, or leave it and watch whether the next one holds.` };
  }

  // In immersion the clock is a decision, not a symptom, so grind is the
  // answer to the taste on its own.
  if (!clock) {
    return { sure: true, move: side === 'sour' ? 'Grind finer.' : 'Grind coarser.',
      why: `It tastes ${side}, and in a brewer that steeps the grind is what changes how much comes out — the clock is where you set it, so it is not in this answer. ${
        side === 'sour' ? 'Finer exposes more of the bean in the same four minutes.' : 'Coarser exposes less.'} One step at a time, and taste again before moving anything else.` };
  }

  if (side === 'sour' && place.time === 'fast') {
    return { sure: true, move: 'Grind finer.',
      why: 'It drained short of the window and tasted sour — the water was through the bed before it had taken enough with it. Grind is the variable that fixes both at once.' };
  }
  if (side === 'bitter' && place.time === 'slow') {
    return { sure: true, move: 'Grind coarser.',
      why: 'It ran past the window and tasted bitter — the water spent too long in the bed. Grind is the variable that fixes both at once.' };
  }
  if (side === 'sour' && place.time === 'slow') {
    return { sure: false, move: 'Not grind, this time.',
      why: `Sour and slow together do not point at grind: going finer would slow it further. That pattern is usually the bed — a channel down one side, or fines choking the base. ${
        canSetTemp() ? 'Look at the water temperature too, and at' : 'Look also at'} how long ago the bag was roasted.` };
  }
  if (side === 'bitter' && place.time === 'fast') {
    return { sure: false, move: 'Not grind, this time.',
      why: 'Bitter and fast together do not point at grind: going coarser would make it faster still. Water that gets through quickly and still over-extracts has found a short path through the bed, so look at how the pours land and how level the bed is before you touch the grinder.' };
  }
  if (place.time === null) {
    return { sure: false, move: `Tastes ${side}.`,
      why: 'Add the brew time and the app can say whether that is the grind or something else — sour and quick is a different problem from sour and slow, and they have opposite answers.' };
  }
  // in the window and still tasting of one of the walls
  return { sure: false, move: 'Grind has done its job.',
    why: canSetTemp()
      ? `The brew is in the window and still tastes ${side}. Grind moves time; this is the part grind does not reach. Water temperature is the usual next variable — ${side === 'sour' ? 'up a degree or two' : 'down a degree or two'} — and after that the ratio.`
      : `The brew is in the window and still tastes ${side}. Grind moves time, and this is the part grind does not reach — and your kettle holds one temperature, so the variables are ${
          side === 'sour' ? 'the pour and the ratio: pour higher and more agitatedly to wet the bed evenly, or give it more water' : 'the pour and the ratio: pour more gently to agitate the bed less, or give it less water'}.` };
}

/* What the clock alone is worth, before anybody has tasted anything.

   The app used to say nothing here: it printed "22s longer than the
   window" and stopped, holding the most actionable number in a pour-over
   behind a taste rating nobody had given. Time is a measurement, not a
   guess, and in a brewer where the water passes through a bed the grind
   is what sets it — you do not need to taste a brew to know which way to
   turn the grinder when it drained in half the time.

   Immersion is the exception, and it is the whole reason the kit asks.
   There the clock is a number somebody chose, so a steep that ran four
   minutes ran four minutes because they said so, and there is nothing for
   the app to read in it. It says that instead of inventing a symptom. */
function clockAdvice(brew, target) {
  const place = placeOf(brew, target);
  if (!percolates(brew)) {
    // The clock is a decision here, so it carries no diagnosis. Taste does.
    // The time only goes in the sentence when there is one. fmtTime
    // returns an em dash for null, and "so the — is the time you set the
    // timer to" is the app showing its seams.
    const t = num(brew.time);
    const said = t === null ? 'the steep' : `the ${fmtTime(t)}`;
    return { sure: false, move: 'Taste it — the clock cannot help here.',
      why: `Your brewer steeps, so ${said} is the time you set the timer to rather than something the coffee did. It tells the app nothing it can act on. Sour or bitter on the sheet is what points at the grind; thin or strong is what points at the ratio.` };
  }
  if (place.time === null) return null;
  const lo = fmtTime(target.timeLo), hi = fmtTime(target.timeHi);
  const t = num(brew.time);

  if (place.time === 'fast') {
    const off = Math.round(target.timeLo - t);
    return { sure: true, move: `Grind finer${grindMoveLine(brew, target, true)}.`,
      why: `It drained ${off}s short of the ${lo}–${hi} window, so the water was through the bed before it had taken much with it. Finer slows the flow, and it is the variable that does.${grindWhyLine(brew, target, true)} Say how it tasted and the app can check the one case this does not fix: a brew that is both quick and bitter has found a channel through the bed, and finer makes that worse.` };
  }
  if (place.time === 'slow') {
    const off = Math.round(t - target.timeHi);
    return { sure: true, move: `Grind coarser${grindMoveLine(brew, target, false)}.`,
      why: `It ran ${off}s past the ${lo}–${hi} window, so the water spent longer in the bed than the recipe asks for. Coarser opens it up.${grindWhyLine(brew, target, false)} Say how it tasted and the app can check the one case this does not fix: a brew that is both slow and sour usually means the bed clogged or the water went round it.` };
  }
  return { sure: false, move: 'The clock is right. Now taste it.',
    why: `${fmtTime(t)} is inside the ${lo}–${hi} window, which is the part the grinder controls and the part this app can measure. Whether it is any good is the other half, and nothing but your mouth answers that. Mark it sour or bitter and the next move gets specific; mark it neither and this is your recipe.` };
}

/* One wall named, and it is the strength one. Grind is not in this
   answer anywhere, and that is the point. */
function bodyNote(brew) {
  const side = bodySide(brew.body);
  if (side === null || side === 'neither') return null;
  const r = ratioOf(brew);
  const at = r === null ? '' : ` at 1:${r.toFixed(1)}`;
  if (!byWeight()) {
    return side === 'weak'
      ? { move: 'More coffee, or less water.', why: 'Thin is about how much coffee is in the cup, not how much came out of the bed. One more scoop, or a smaller cup — one at a time, so you can read which did it.' }
      : { move: 'Less coffee, or more water.', why: 'Strong is about how much coffee is in the cup, not how much came out of the bed. Half a scoop less, or a bigger cup — one at a time, so you can read which did it.' };
  }
  /* The same words the pair advice uses for the same act.

     "Tighten the ratio" and "less water" are one instruction, and a
     brewer who meets both in the same app will reasonably wonder whether
     they are two. The verb is what you do with the kettle; the ratio is
     the explanation behind it. */
  return side === 'weak'
    ? { move: 'Less water.',
        why: `Thin${at} is about how much coffee ended up in the cup rather than how much came out of the bed, so the grinder is not the variable — it is the ratio. Stop ${pourStep(brew)}g earlier on the same dose, or put a gram or two more coffee under the same water.` }
    : { move: 'More water.',
        why: `Strong${at} is about how much coffee ended up in the cup rather than how much came out of the bed, so the grinder is not the variable — it is the ratio. Pour ${pourStep(brew)}g more on the same dose, or put a gram less coffee under the same water.` };
}

/* The bloom, when there is something to say about it.

   Not advice about the cup — a diagnostic about the schedule. Two to
   three times the dose is the working range: much less and part of the
   bed never wets, much more and the bloom is a pour. */
function bloomNote(brew) {
  const b = bloomOf(brew);
  if (b === null || !percolates(brew)) return null;
  if (b < 1.8) {
    return { move: 'The bloom was short.', why: `${b.toFixed(1)}× the dose leaves part of the bed dry through the bloom, and dry grounds do not degas. Two to three times the dose is the usual range — the point is to wet all of it, not to brew any of it yet.` };
  }
  if (b > 3.5) {
    return { move: 'The bloom was long.', why: `${b.toFixed(1)}× the dose is a pour rather than a bloom: enough water to start drawing through before the bed has finished degassing. Two to three times the dose wets everything without brewing it.` };
  }
  return null;
}

/* Everything this app is willing to say about what to do next.

   One move at a time, on every surface, so the sheet and the board
   cannot disagree. The pair outranks either wall alone — that is the
   whole reason the two questions are asked separately and then read
   together. The bloom rides along because it is about the schedule
   rather than the cup, so it does not compete with the move. */
/* The clock standing in for the tongue.

   One wall named — the strength one — and no taste on the sheet. The body
   note alone answers it, and it used to answer it while ignoring the
   clock, which is the same half-answer this app was rightly accused of:
   a brew that drained short of the window and came out thin is not a
   ratio problem, it is the under-extraction picture, and the fix is the
   grinder.

   The clock is evidence about extraction, so where it is decisive it
   takes the place of the taste axis and the four corners resolve exactly
   as they do when somebody has tasted it. The copy says where the
   reading came from: nobody said "sour", the timer did. */
function clockPair(brew, target) {
  const b = bodySide(brew.body);
  if (tasteSide(brew.taste) !== null || b === null || b === 'neither') return null;
    if (!percolates(brew)) return null;
const place = placeOf(brew, target);
  if (place.time !== 'fast' && place.time !== 'slow') return null;
  const quick = place.time === 'fast';
  const light = b === 'weak';

  if (quick && light) {
    return { sure: true, move: `Grind finer${grindMoveLine(brew, target, true)}.`,
      why: `It came in short of the window and you called it thin. Those are one fault: the water was through the bed before it had taken much with it, so there is little in the cup and it is probably sharp with it. Finer moves both, and brings the time up on the way.` };
  }
  if (!quick && !light) {
    return { sure: true, move: `Grind coarser${grindMoveLine(brew, target, false)}.`,
      why: `It ran past the window and you called it strong. Those are one fault: the water sat in the bed taking more than it should, and what it took is all in the cup. Coarser moves both, and brings the time back on the way.` };
  }
  if (quick && !light) {
    return { sure: true, move: 'More water.',
      why: `Short of the window and strong is the ratio rather than the grind: the brew was stopped before the water had finished, and what it did take is packed into a small cup. Leave the grinder where it is and more water.` };
  }
  return { sure: true, move: 'Less water.',
    why: `Past the window and thin is the ratio rather than the grind: the end of it was adding water and harshness and nothing else. Leave the grinder where it is and less water.` };
}

function nextMove(brew, target) {
  const pair = wallPair(brew, target);
  if (pair) return [pair];
  // One wall, and it is the strength one: that note is the whole answer.
  // Body named, taste not, and a clock that is saying something: the
  // clock stands in for the taste axis and the pair resolves properly.
  const cp = clockPair(brew, target);
  if (cp) return [cp];
  const b = bodyNote(brew);
  if (b) return [{ sure: false, move: b.move, why: b.why }];
  const t = tasteNote(brew, target);
  if (t) return [t];
  // No taste on the sheet: the clock still knows which way the grinder goes.
  const clock = clockAdvice(brew, target);
  return clock ? [clock] : [];
}

function tipHTML(tip, cls) {
  return `<div class="${cls} ${tip.sure ? 'sure' : 'open'}">
      <span class="tip-move">${escapeHTML(tip.move)}</span>
      <span class="tip-why">${escapeHTML(tip.why)}</span>
    </div>`;
}

/* ---------- formatting ---------- */

const fmt1 = v => (v === null ? '—' : v.toFixed(1));
// Water is poured to the gram and a scale reads it that way; a decimal
// there is noise on every card. The dose is the one that earns one.
const fmt0 = v => (v === null ? '—' : String(Math.round(v)));
const fmt2 = v => (v === null ? '—' : v.toFixed(2));

function fmtRatio(r) {
  return r === null ? '—' : `1:${r.toFixed(1)}`;
}

// Brew times are minutes and seconds to everybody who brews. 195 is a
// number; 3:15 is the thing on the timer.
function fmtTime(sec) {
  const s = num(sec);
  if (s === null) return '—';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function parseTime(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (raw.includes(':')) {
    const [m, s] = raw.split(':');
    const mm = Number(m), ss = Number(s);
    if (!isFinite(mm) || !isFinite(ss)) return NaN;
    return mm * 60 + ss;
  }
  const v = Number(raw);
  return isFinite(v) ? v : NaN;
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

   A stepper you can also type into, one measurement to a row. The
   buttons are 44px because a kitchen bench is not a desk.

   What it holds when the text is not a number is the part that matters:
   nothing. The dial-in shipped a version that kept the previous value
   when a parse failed, so deleting a figure and typing over it badly
   saved the figure you deleted. A field never holds a number nobody
   typed, and out of range is not silently corrected either — the text
   stays exactly as typed, with a line underneath saying which of the two
   it is, because it is the brewer's typo to see.                      */
function numField(opts) {
  /* Compact drops the steppers.

     They earn their place on the numbers you take one at a time with a
     kettle in the other hand. A pour schedule is not that: it is five or
     six pairs typed in one sitting, and at full size three pours came to
     450px with the steppers wrapping onto a second line inside each
     field. The parsing, the range check and the refusal to hold a number
     nobody typed are the same in both forms, because those are the
     point of this control and not its ornament. */
  const compact = Boolean(opts.compact);
  const wrap = el('div', 'num-field' + (compact ? ' compact' : ''));
  const id = 'nf-' + Math.random().toString(36).slice(2, 8);
  const isTime = Boolean(opts.time);
  wrap.innerHTML = `
    <label class="num-label" for="${id}">${escapeHTML(opts.label)}</label>
    <span class="num-value-wrap">
      <input class="num-value" id="${id}" type="text"
             inputmode="${isTime ? 'numeric' : 'decimal'}"
             autocomplete="off" enterkeyhint="done"
             aria-describedby="${id}-unit">
      <span class="num-unit" id="${id}-unit">${escapeHTML(opts.unit || '')}</span>
    </span>
    ${compact ? '' : `<span class="num-steps">
      <button type="button" class="num-step" data-dir="-1" aria-label="Less ${escapeHTML(opts.label)}">−</button>
      <button type="button" class="num-step" data-dir="1" aria-label="More ${escapeHTML(opts.label)}">+</button>
    </span>`}
    <span class="num-note" id="${id}-note" role="status"></span>
  `;
  const input = wrap.querySelector('.num-value');
  const note = wrap.querySelector('.num-note');
  let value = opts.value === null || opts.value === undefined ? null : opts.value;

  const round = v => {
    const p = Math.pow(10, opts.digits || 0);
    return Math.round(v * p) / p;
  };
  const show = v => (isTime ? fmtTime(v) : String(round(v)));
  const render = () => {
    input.value = value === null ? '' : show(value);
    input.placeholder = opts.placeholder || (isTime ? '0:00' : '—');
    wrap.classList.toggle('empty', value === null);
  };
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
  const commit = v => {
    value = v === null ? null : Math.max(opts.min, Math.min(opts.max, round(v)));
    render();
    setNote('');
    if (opts.onChange) opts.onChange(value);
  };

  wrap.querySelectorAll('.num-step').forEach(b => {
    b.addEventListener('click', () => {
      const dir = Number(b.dataset.dir);
      // Stepping an empty field starts from where the last brew was rather
      // than from zero — a 0.1g dose is not a thing anyone meant.
      const from = value === null
        ? (opts.startAt !== undefined ? opts.startAt : opts.min)
        : value + dir * opts.step;
      haptic();
      commit(from);
    });
  });

  input.addEventListener('input', () => {
    const typed = input.value.trim();
    if (typed === '') return take(null, '');
    const v = isTime ? parseTime(typed) : Number(typed.replace(',', '.'));
    if (v === null || !isFinite(v)) {
      return take(null, `“${typed}” is not a ${isTime ? 'time' : 'number'}, so nothing is recorded here.`);
    }
    if (v < opts.min || v > opts.max) {
      const lo = isTime ? fmtTime(opts.min) : opts.min;
      const hi = isTime ? fmtTime(opts.max) : opts.max;
      return take(null, `${opts.label} takes ${lo} to ${hi}${opts.unit && !isTime ? ' ' + opts.unit : ''}. Nothing is recorded until it is one of those.`);
    }
    take(round(v), '');
  });
  // Tidy the formatting of a number that is real; leave text that is not
  // exactly where it was typed, with its note.
  input.addEventListener('blur', () => { if (value !== null) commit(value); });

  render();
  wrap.setValue = v => { value = v; render(); };
  wrap.getValue = () => value;
  return wrap;
}

/* ---------- the anchored scale ----------

   The house notation, and it is right here for the same reason it is
   right on a cupping sheet: taste is a position between two named ends,
   not one of seven buttons.

   Untouched is not a value. The knob sits at centre until somebody moves
   it, drawn hollow, and the block reads "not tasted" rather than
   "neither" — a default and a judgement are the same pixel otherwise. */
function wordScale(opts) {
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
    ? `${c.brews.length} brew${c.brews.length === 1 ? '' : 's'}${c.roaster ? ` · ${c.roaster}` : ''}`
    : 'tap to add one';

  // No dead control on the front door: the button does the next thing
  // rather than greying out the one thing a first visit has to do.
  const logBtn = $('#btn-log');
  logBtn.textContent = c ? 'Log a brew' : 'Add a coffee';
  logBtn.disabled = false;

  renderKeeper(c);
  renderNext(c);
  renderTarget(c);
  renderBrews(c);
}

/* The answer, where an answer belongs.

   The next move used to be the last line of the newest brew card, under
   the numbers, the schedule, the window and the taste pips — a footnote
   on a record, in a product whose reason to exist is telling you what to
   change. It goes at the top of the board in its own card, and it is not
   repeated below: one answer, one place. */
function renderNext(c) {
  const wrap = $('#next-card');
  if (!c) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  const newest = brewsNewestFirst(c)[0];

  /* Before the first brew, the guidance is where to start — including the
     schedule, which is the part a beginner has no way to guess and the
     part every recipe on the internet states differently. */
  if (!newest) {
    const t = c.target;
    const water = Math.round(t.dose * t.ratio);
    const bloom = Math.round(t.dose * 2);
    wrap.className = 'next-card';
    wrap.innerHTML = `
      <span class="next-label">Where to start</span>
      <div class="tip open">
        <span class="tip-move">${byWeight()
          ? `${fmt1(t.dose)}g coffee, ${water}g water, in ${fmtTime(t.timeLo)}–${fmtTime(t.timeHi)}.`
          : `Aim for ${fmtTime(t.timeLo)}–${fmtTime(t.timeHi)} from first pour to last drip.`}</span>
        <span class="tip-why">${percolates()
          ? `${byWeight() ? `Bloom with about ${bloom}g — twice the dose — and give it thirty to forty-five seconds, then pour the rest in two or three goes. ` : 'Wet all the grounds first and give them thirty to forty-five seconds, then pour the rest in two or three goes. '}Set the grinder wherever it is and brew one. If it drains in ninety seconds, go finer; if it is still dripping past four minutes, go coarser. Nobody can tell you the number — it is different on every grinder — but the window tells you which way.`
          : `Stir once when the water is in, leave it, and press or decant at the time you set. Grind is what changes the strength of the extraction here, not the clock: coarser if it comes out harsh, finer if it comes out sharp.`}</span>
      </div>`;
    return;
  }

  const tips = nextMove(newest, c.target);
  if (!tips.length) {
    wrap.className = 'next-card';
    wrap.innerHTML = `
      <span class="next-label">Next</span>
      <div class="tip open">
        <span class="tip-move">Add the time to that brew.</span>
        <span class="tip-why">How long it ran is the number this app reasons from: it is what the grind changes in a brewer that drains, and it decides whether “finer” or “coarser” is the right answer. Tap the brew above and put it in.</span>
      </div>`;
    return;
  }
  /* The bloom note is about the schedule rather than the cup, so it rides
     along under the move instead of competing with it. */
  const bloom = bloomNote(newest);
  wrap.className = 'next-card';
  wrap.innerHTML = `<span class="next-label">Next</span>`
    + tips.map(t => tipHTML(t, 'tip')).join('')
    + (bloom ? tipHTML({ sure: false, move: bloom.move, why: bloom.why }, 'tip') : '');
}

/* The recipe you settled on, pinned.

   And the grinder as it stands today beside it, as a distance from the
   recipe rather than instead of it. Beans degas: a brew dialled on day
   five runs quicker on day fourteen at the same setting. The move is
   small and it belongs on the grinder, so the figure you spent four
   brews finding stays exactly as you found it and today's sits next to
   it. Overwriting the recipe to match loses the thing the board is for,
   and with it the reference for the next bag of the same coffee. */
function renderKeeper(c) {
  const wrap = $('#keeper');
  const keeper = c ? c.brews.filter(b => b.verdict === 'keeper').slice(-1)[0] : null;
  wrap.classList.toggle('hidden', !keeper);
  if (!keeper) { wrap.innerHTML = ''; return; }

  const r = ratioOf(keeper);
  const ey = extractionOf(keeper);
  const age = daysSinceRoast(c);
  const offset = (() => {
    const was = Number(keeper.grind), now = Number(c.grindNow);
    if (!isFinite(was) || !isFinite(now) || !c.grindNow || keeper.grind === '') return null;
    const d = now - was;
    return d === 0 ? null : d;
  })();

  wrap.innerHTML = `
    <span class="keeper-label">The recipe</span>
    <div class="keeper-line">
      ${byWeight() ? `<span class="keeper-big">${fmt1(num(keeper.dose))}<small>g coffee</small></span>
      <span class="keeper-arrow" aria-hidden="true">→</span>
      <span class="keeper-big">${fmt0(num(keeper.water))}<small>g water</small></span>` : ''}
      <span class="keeper-big">${fmtTime(keeper.time)}<small>total</small></span>
    </div>
    <div class="keeper-meta">${byWeight() ? `${fmtRatio(r)} · ` : ''}${
      keeper.grind !== '' && keeper.grind !== null ? `grind ${escapeHTML(String(keeper.grind))}` : 'no grind recorded'}${
      canSetTemp() && keeper.temp ? ` · ${escapeHTML(String(keeper.temp))}°` : ''}${
      ey !== null ? ` · ${fmt1(ey)}% extraction` : ''}</div>
    ${(keeper.pours || []).length ? `<div class="keeper-pours">${pourLine(keeper)}</div>` : ''}
    ${/* The recipe is not rewritten as the coffee ages. Beans degas, the
          same setting starts running quicker, and the answer is a small
          move on the grinder — not a new recipe. So the figure above stays
          exactly as it was found, and where the grinder is sitting today is
          recorded beside it, as a distance from it. */ ''}
    <button class="keeper-now" id="btn-grind-now" type="button">
      <span class="keeper-now-label">Grinder today</span>
      <span class="keeper-now-value">${c.grindNow
        ? `${escapeHTML(String(c.grindNow))}${offset !== null ? ` · ${offset > 0 ? '+' : '−'}${Math.abs(offset).toFixed(1)} from the recipe` : ' · on the recipe'}`
        : 'same as the recipe'}</span>
    </button>
    ${age !== null ? `<div class="keeper-age">${age === 0 ? 'Roasted today' : age === 1 ? 'One day off roast' : `${age} days off roast`}${
      age > 0 && age < 4 ? ' — still degassing, so expect it to move.' : ''}</div>` : ''}
  `;
  const btn = wrap.querySelector('#btn-grind-now');
  if (btn) btn.addEventListener('click', () => openGrindNow(c, keeper));
}

// The pour schedule as one line: "0:00 45g · 0:45 100g · 1:30 105g".
function pourLine(brew) {
  return (brew.pours || [])
    .map(p => `<span class="pour-chip"><i>${fmtTime(p.at)}</i>${
      num(p.water) === null ? '' : ` ${fmt0(num(p.water))}g`}</span>`)
    .join('');
}

function renderTarget(c) {
  const wrap = $('#target-card');
  wrap.classList.toggle('hidden', !c);
  if (!c) { wrap.innerHTML = ''; return; }
  const t = c.target;
  const bits = [];
  if (byWeight()) bits.push(`1:${t.ratio}`);
  bits.push(`${fmtTime(t.timeLo)}–${fmtTime(t.timeHi)}`);
  if (byWeight()) bits.push(`${fmt1(t.dose)}g`);
  if (t.temp && canSetTemp()) bits.push(`${t.temp}°`);
  wrap.innerHTML = `
    <button class="target-btn" id="btn-target">
      <span class="target-label">Aiming at</span>
      <span class="target-value">${escapeHTML(bits.join(' · '))}</span>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;
  wrap.querySelector('#btn-target').addEventListener('click', () => openCoffee(c));
}

function renderBrews(c) {
  const list = $('#brews');
  list.innerHTML = '';
  const has = c && c.brews.length;
  const empty = $('#empty');
  empty.classList.toggle('hidden', Boolean(has));
  if (!has) {
    /* Three different empty screens, because they are three different
       problems: nobody has said what they are brewing on, there is no bag
       on the shelf, there is a bag and no brews. The kit comes first
       because it decides what the brew sheet asks for, and answering it
       after four brews means four sheets asked the wrong questions. */
    if (!kit().asked) {
      empty.innerHTML = `
        <div class="empty-title">What are you brewing on?</div>
        <p class="empty-body">What you brew in, and a few things about the kettle and grinder, once. The sheet is built from the answers: there is no point in a temperature field on a kettle with one setting, and no point in a ratio if you are not brewing by weight.</p>
        <button type="button" class="btn btn-primary" id="btn-kit-start">Set up my kit</button>
        <button type="button" class="btn btn-ghost" id="btn-kit-later">Skip — a cone, a plain kettle, a scale</button>
        <p class="empty-foot">Works with no signal and no account. Sign in only to carry your log between devices.</p>`;
      empty.querySelector('#btn-kit-start').addEventListener('click', openKit);
      empty.querySelector('#btn-kit-later').addEventListener('click', () => {
        state.kit = Object.assign(defaultKit(), { asked: true });
        save();
        renderBoard();
      });
      return;
    }
    /* A coffee with no brews needs no empty state: the "Where to start"
       card at the top of the board already says what to do, with the dose,
       the window and the schedule in it. */
    if (c) { empty.classList.add('hidden'); empty.innerHTML = ''; return; }
    empty.innerHTML = `<div class="empty-title">Nothing on the shelf</div>
         <p class="empty-body">Add the bag you are brewing and this becomes its board — every brew, what changed between them, and the recipe you settle on.</p>
         <p class="empty-foot">Works with no signal and no account. Sign in only to carry your log between devices.</p>`;
    return;
  }

  const rows = brewsNewestFirst(c);
  rows.forEach((brew, i) => {
    // the brew before this one in time, which is what "changed" means
    const prev = rows[i + 1] || null;
    // The advice is not on these cards at all — it is one card, at the top
    // of the board, about the next brew. See renderNext.
    list.appendChild(brewCard(brew, prev, c, rows.length - i));
  });
}

function brewCard(brew, prev, c, n) {
  /* A RECORD YOU CAN REACH WITHOUT A POINTER.

     It was a bare <div> with a click handler, so the board's brew cards
     took no tab stop at all: editing or deleting a mis-logged brew was
     pointer-only, and a screen reader got an unstructured run of numbers
     with nothing to land on. The dial-in fixed the same bug on the same
     kind of card; this is the same fix. The label carries what a brewer
     needs to recognise the brew before opening it, which is exactly what
     the sighted version of this card says at a glance. */
  const card = el('button', 'log-card');
  card.type = 'button';
  const dd = drawdownOf(brew);
  const ey = extractionOf(brew);
  const place = placeOf(brew, c.target);
  const missing = missingFields(brew);
  const water = num(brew.water);

  card.setAttribute('aria-label', (() => {
    const bits = [`Brew ${n}`];
    if (num(brew.time) !== null) bits.push(fmtTime(brew.time));
    if (byWeight() && num(brew.dose) !== null && water !== null) {
      bits.push(`${fmt1(num(brew.dose))} grams to ${fmt0(water)}`);
    }
    if (brew.grind !== '' && brew.grind !== null && brew.grind !== undefined) {
      bits.push(`grind ${brew.grind}${grindUnit() === 'clicks' ? ' clicks' : ''}`);
    }
    if (multiBrewer() && brew.brewer) bits.push(brew.brewer);
    if (brew.verdict === 'keeper') bits.push('the recipe');
    return `${bits.join(', ')}. Edit.`;
  })());

  if (brew.verdict === 'keeper') card.classList.add('is-keeper');
  if (missing.length) card.classList.add('is-partial');

  /* What moved since the last brew. This line is the reason the app is a
     log rather than a list: a column of numbers makes you do the
     subtraction in your head at seven in the morning, and the
     subtraction is the finding.

     EMPTY IS NOT ZERO. Grind and temperature are free text, so a field
     nobody filled in arrives as '' and Number('') is 0 — which is finite,
     and which made a brew with no grind recorded read as a grind of
     nought against the one before it. The dial-in had the same trap in
     the same line; intentCheck below has guarded against it here since a
     tester was accused of moving a grinder they had not touched. */
  const diffs = [];
  if (prev) {
    const read = (o, f) => {
      const raw = o[f];
      if (raw === '' || raw === null || typeof raw === 'undefined') return null;
      const v = Number(raw);
      return isFinite(v) ? v : null;
    };
    const d = f => {
      const a = read(brew, f), b = read(prev, f);
      return a !== null && b !== null ? a - b : null;
    };
    const dGrind = d('grind');
    // Clicks are whole. "grind −5.0" on a grinder that only stops at whole
    // numbers is the app inventing a precision the kit does not have.
    const stepped = kit().steps === 'stepped';
    if (dGrind) diffs.push(`grind ${fmtDelta(dGrind, stepped ? ' clicks' : '', stepped ? 0 : 1)}`);
    if (byWeight()) {
      const dDose = d('dose');
      if (dDose) diffs.push(`${fmtDelta(dDose, 'g coffee')}`);
      const dWater = d('water');
      if (dWater) diffs.push(`${fmtDelta(dWater, 'g water')}`);
    }
    const dTime = d('time');
    if (dTime) diffs.push(`${fmtDelta(dTime, 's', 0)}`);
    if (canSetTemp()) {
      const dTemp = d('temp');
      if (dTemp) diffs.push(`${fmtDelta(dTemp, '°', 0)}`);
    }
  }

  const timeClass = place.time === 'in' ? 'in' : place.time === null ? '' : 'out';
  const timeNote = place.time === null ? ''
    : place.time === 'in' ? 'in the window'
    : place.time === 'fast' ? `${Math.round(c.target.timeLo - brew.time)}s quick`
    : `${Math.round(brew.time - c.target.timeHi)}s long`;

  // The poured total and the water figure should agree. When they do not
  // the card says so rather than quietly preferring one of them.
  const poured = pouredTotal(brew);
  const back = byWeight() ? pourBacktrack(brew) : null;
  const mismatch = byWeight() && poured !== null && water !== null && Math.abs(poured - water) > 1
    ? `The schedule ends at ${fmt0(poured)}g, and the water says ${fmt0(water)}g.`
    : null;

  /* THE SETTINGS THIS BREW WAS MADE AT, AND THE ONE READING THAT IS NOT
     ON THE CARD ALREADY.

     The ratio has come off. It led this card at 30px, and across a dial-in
     it is the same figure repeated down the board — 1:16.7, 1:16.7,
     1:16.7 — in the loudest face on screen, computed from two numbers
     sitting right underneath it. The dial-in learned the same thing about
     its own ratio. What a brewer says out loud is "eighteen grams, three
     hundred of water, three fifteen", so that is the headline, and the
     ratio is on the sheet where one brew gets read.

     Drawdown stays. It is not derivable from anything on this line — it
     is the clock minus the last pour, and the last pour is a chip in a
     row — and a drawdown that has crept from 1:20 to 2:10 across four
     brews is the bed clogging, which is the finding this app exists to
     hand somebody. */
  const set = [];
  if (num(Number(brew.grind)) !== null && brew.grind !== '') {
    set.push(`<span class="is-set">grind ${escapeHTML(String(brew.grind))}${
      grindUnit() === 'clicks' ? '<small> clicks</small>' : ''}</span>`);
  }
  /* Temperature is not here, and the dial-in's card does not carry it
     either. Three things plus a window verdict wrapped this line at 390px,
     and of the three it is the one that is nearly always the same figure
     down the whole board — a kettle gets set once. Where it does move, the
     change line under the rule says "+2°", which is the moment it matters,
     and the sheet has it whenever you open the brew. */
  if (dd !== null) set.push(`${fmtTime(dd)}<small> drawdown</small>`);
  if (ey !== null) set.push(`${fmt1(ey)}<small>% EY</small>`);

  // How it tasted, in the words. The seven-pip runs came off for the
  // reason they came off the dial-in's card: position is the meaning
  // where position is the control, and on a record the word is complete.
  const flavour = [];
  if (brew.taste !== null && typeof brew.taste === 'number') flavour.push(tasteWord(brew.taste));
  if (brew.body !== null && typeof brew.body === 'number') flavour.push(bodyWord(brew.body));

  /* Everything under the hairline. Collected rather than written inline
     so the rule appears exactly when there is something beneath it. */
  const read = [];
  if (diffs.length) read.push(`<div class="log-change">${escapeHTML(diffs.join(' · '))}</div>`);
  if (flavour.length) read.push(`<div class="log-flavour">${escapeHTML(flavour.join(' · '))}</div>`);
  if ((brew.flavours || []).length) {
    /* What you tasted, in words, with anything the bag promised marked.
       The two scales say what to change; this is the only line that
       answers "was it any good" — the question somebody scrolling a board
       six weeks later is actually asking. */
    read.push(`<div class="brew-flavours">${
      brew.flavours.map(w => `<span class="brew-flavour${
        hasFlavour(bagWords(c), w) ? ' from-bag' : ''}">${escapeHTML(w)}</span>`).join('')
    }</div>`);
  }
  [back && `${back.label} says ${fmt0(back.value)}g, below ${back.prevLabel} at ${fmt0(back.prev)}g — the schedule is a running total.`,
   mismatch,
   intentCheck(brew, prev)].filter(Boolean)
    .forEach(x => read.push(`<div class="log-mismatch">${escapeHTML(x)}</div>`));
  if (brew.notes) read.push(`<div class="log-notes">${escapeHTML(brew.notes)}</div>`);

  /* THREE BANDS AND THE SCHEDULE, AND THE SAME SHAPE ON EVERY CARD.

     There were fourteen, each appearing on its own terms, so no two cards
     in a column had the same outline and the eye re-found the structure
     on every one. What this brew was, what it was set to and where the
     clock landed, the schedule that made it — and under one hairline, the
     reading of it.

     The schedule stays above the rule because it is not a reading, it is
     the recipe: an espresso is one event and a pour-over is five, and
     which five is the thing a brewer changes between one morning and the
     next. It is the record that makes this a brew log rather than a
     dial-in with different words.

     "aim: Finer" has gone from the top. It sat two rows above
     "grind −5 clicks", which is the same fact twice — one the intention,
     one the measurement, and the measurement is the true one. Where they
     disagree the note under the rule still says so, and quotes the aim. */
  card.innerHTML = `
    <div class="log-meta">
      <span>${n}<span class="log-dot">·</span>${
        multiBrewer() && brew.brewer ? `${escapeHTML(brew.brewer)}<span class="log-dot">·</span>` : ''
      }${fmtDate(brew.at)}</span>
      ${brew.verdict === 'keeper' ? '<span class="log-flag">the recipe</span>' : ''}
    </div>

    <div class="log-shot">
      <span class="log-inout">${byWeight()
        ? `${num(brew.dose) === null ? '—' : fmt1(num(brew.dose))}<span class="log-arrow" aria-hidden="true">→</span>${
            water === null ? '—' : fmt0(water)}<small>g</small>`
        : '<span class="brew-noscale">no scale</span>'}</span>
      <span class="log-secs ${timeClass}">${fmtTime(brew.time)}</span>
    </div>

    ${(set.length || timeNote) ? `<div class="log-set">
      <span class="log-grind">${set.join(' · ')}</span>
      ${timeNote ? `<span class="log-place ${timeClass}">${timeNote}</span>` : ''}
    </div>` : ''}
    ${(brew.pours || []).length ? `<div class="brew-pours">${pourLine(brew)}</div>` : ''}
    ${missing.length ? `<div class="log-missing">${escapeHTML(missingLine(missing))}</div>` : ''}

    ${read.length ? `<div class="log-read">${read.join('')}</div>` : ''}
  `;
  card.addEventListener('click', () => openBrew(brew));
  return card;
}

/* Which measurement is absent, and what that costs. A dash on its own
   makes the reader work out why; this names the missing measurement and
   the figure that could not be built from it, because the fix is one tap
   away and the reader is the person who can make it. */
function missingLine(missing) {
  if (missing.length === (byWeight() ? 3 : 1)) return 'Nothing recorded on this brew yet.';
  const lost = [];
  if (missing.includes('dose') || missing.includes('water')) lost.push('ratio');
  if (missing.includes('time')) lost.push('drawdown');
  const names = missing.length > 1
    ? `${missing.slice(0, -1).join(', ')} and no ${missing[missing.length - 1]}`
    : missing[0];
  return lost.length
    ? `No ${names} recorded, so this brew has no ${lost.join(' and no ')}.`
    : `No ${names} recorded.`;
}

/* The next move used to render here, as the last line of the newest brew
   card. It has its own card at the top of the board now — see renderNext.
   A footnote on a record is not where a brew log puts its answer. */

/* ============================================================
   THE BREW SHEET
   ============================================================ */

let editing = null;      // the brew being edited, or a fresh one
let editingIsNew = false;
// The schedule as it was when the sheet opened, so an edit to it can be
// told from the copy that was carried over. See brewHasContent.
let pourSeed = '[]';

/* Where the grinder is, as far as this app knows.

   Two sources of truth could answer it: the board's "grinder today",
   which is where somebody said they had moved it to, and the last
   brew's grind. The one stated most recently wins. */
function grindStart(c) {
  const now = num(Number(c.grindNow));
  if (c.grindNow !== '' && now !== null) return now;
  const last = brewsNewestFirst(c)[0];
  const prev = last ? num(Number(last.grind)) : null;
  return prev === null ? undefined : prev;
}

function openBrew(brew) {
  const c = activeCoffee();
  if (!c) return;
  const last = c.brews[c.brews.length - 1] || null;

  editingIsNew = !brew;
  editing = brew || {
    id: uid(),
    at: Date.now(),
    /* The dose carries over and the rest starts empty. A brew holds the
       coffee still and moves one other thing, so the dose is a setting;
       water and time are measurements you take at the end, and
       prefilling those would be putting the last brew's reading under
       this brew's heading. The schedule carries over because it is the
       recipe you are repeating — that is the whole point of writing it
       down — and it is the thing you change deliberately. */
    dose: last ? num(last.dose) : c.target.dose,
    /* Which brewer this is. The last one used on this coffee is the best
       guess — somebody dialling a bag in tends to stay with one — and the
       one reached for last anywhere is the fallback. It is recorded on
       the brew rather than read from the kit at display time, so the log
       stays true when the shelf changes. */
    brewer: (last && last.brewer) || kit().brewer || '',
    /* What you tasted, in words. Not carried over from the last brew:
       the whole question is whether THIS one came out the way the bag
       said, and prefilling it would answer that with last week's cup. */
    flavours: [],
    water: null,
    time: null,
    taste: null,
    body: null,
    verdict: null,
    intent: null,
    grind: grindStart(c),
    temp: last ? last.temp : '',
    pours: last && Array.isArray(last.pours) ? last.pours.map(p => ({ ...p })) : [],
    notes: '',
    tds: null,
    beverage: null,
  };
  if (editing.grind === undefined) editing.grind = '';
  pourSeed = pourSchedule(editing.pours);

  $('#brew-title').textContent = editingIsNew ? 'This brew' : `Brew ${c.brews.indexOf(brew) + 1}`;

  // Only on a brew that exists — there is nothing to remove from a sheet
  // nobody has saved. A mis-logged brew is not a small problem in a log
  // whose whole point is "what changed since the last one": it sits in
  // the history for ever and skews the next card's arithmetic.
  const del = $('#brew-delete');
  del.classList.toggle('hidden', editingIsNew);
  del.onclick = () => {
    const i = c.brews.indexOf(brew);
    if (i < 0) return;
    if (!confirm(`Remove brew ${i + 1}? It goes out of the log and out of the comparison with the brews either side of it. There is no undo.`)) return;
    const gone = c.brews[i];
    c.brews.splice(i, 1);
    // Written down, so a sync does not hand it back. See migrate().
    if (gone && gone.id) c.dead[gone.id] = Date.now();
    save();
    closeModal('#brew-modal');
    renderBoard();
    toast('Brew removed');
  };

  buildBrewSheet(c);
  openModal('#brew-modal');
}

// Has anything been put on this sheet? Used to decide whether closing it
// costs the person anything.
function brewHasContent() {
  if (!editing) return false;
  const typed = ['water', 'time', 'taste', 'body', 'verdict', 'intent', 'notes', 'tds']
    .some(k => editing[k] !== null && editing[k] !== '' && editing[k] !== undefined);
  /* The schedule counts too, and only when it has been changed.
     It arrives carried over from the last brew, so its mere presence is
     not somebody's work — but editing it is, and this app calls the
     schedule the recipe. Closing the sheet used to drop a reworked
     schedule without asking, while it would stop and ask over a
     half-typed note. */
  return typed || pourSchedule(editing.pours) !== pourSeed;
}

// The schedule as one comparable string, so "has it been touched?" is not
// five nullable comparisons at every keystroke.
function pourSchedule(pours) {
  return JSON.stringify((pours || []).map(p => [num(p.at), num(p.water)]));
}

function closeBrewSheet() {
  if (editingIsNew && brewHasContent()
      && !confirm('Close without saving? What you have put on this sheet goes with it.')) return;
  closeModal('#brew-modal');
}

function buildBrewSheet(c) {
  buildBrewerPick(c);
  const row = $('#num-row');
  row.innerHTML = '';
  const refresh = () => renderReadout(c);

  if (byWeight()) {
    row.appendChild(numField({
      label: 'Coffee', unit: 'g', value: num(editing.dose), min: 0, max: 200, step: 0.5, digits: 1,
      startAt: c.target.dose, onChange: v => { editing.dose = v; refresh(); },
    }));
    row.appendChild(numField({
      label: 'Water', unit: 'g', value: num(editing.water), min: 0, max: 2000, step: 10, digits: 0,
      startAt: Math.round(c.target.dose * c.target.ratio), onChange: v => { editing.water = v; refresh(); },
    }));
  }
  row.appendChild(numField({
    label: 'Time', unit: '', time: true, value: num(editing.time), min: 0, max: 1800, step: 5, digits: 0,
    startAt: c.target.timeLo, onChange: v => { editing.time = v; refresh(); },
  }));
  // Grind is one of the numbers, not one of the details: it is the thing
  // a brew is usually about, and a board that cannot answer "where was
  // the grinder when that one was good?" is not a board.
  const stepped = kit().steps === 'stepped';
  row.appendChild(numField({
    // No unit in the slot — a grind setting has none, and "clicks" does
    // not fit the gutter. The word belongs in the prose.
    label: 'Grind', unit: '', value: num(editing.grind),
    min: 0, max: 100, step: stepped ? 1 : 0.1, digits: stepped ? 0 : 1,
    startAt: grindStart(c), onChange: v => { editing.grind = v; refresh(); },
  }));
  if (canSetTemp()) {
    row.appendChild(numField({
      label: 'Temp', unit: '°', value: num(Number(editing.temp)), min: 70, max: 100, step: 1, digits: 0,
      startAt: c.target.temp || 94, onChange: v => { editing.temp = v; refresh(); },
    }));
  }

  buildPours(c);

  const taste = $('#taste-scale');
  taste.innerHTML = '';
  taste.appendChild(wordScale({
    value: editing.taste, words: tasteWord, low: 'sour', high: 'bitter',
    labelledBy: 'taste-label', empty: 'not tasted yet',
    onChange: v => { editing.taste = v; refresh(); },
  }));
  const body = $('#body-scale');
  body.innerHTML = '';
  body.appendChild(wordScale({
    value: editing.body, words: bodyWord, low: 'thin', high: 'strong',
    labelledBy: 'body-label', empty: 'not said yet',
    onChange: v => { editing.body = v; refresh(); },
  }));

  buildBagNote(c);
  buildIntent(c);
  buildVerdict(c);
  buildMore(c);
  renderReadout(c);
}

/* ============================================================
   WHAT DID YOU TASTE
   ============================================================

   The two scales above this are the extraction and the strength: sour or
   bitter, thin or strong. They are diagnostic — they say what to change.
   Neither of them can say whether the cup was any good, or whether the
   peach the roaster printed on the bag is in there.

   That question has an answer worth recording, and the vocabulary for it
   already exists twice over. The bag supplies three or four words that
   are the likeliest right answers by a distance, so they are offered as
   taps rather than typed. Everything else comes off the SCA flavour wheel
   — the same drawing the cupping sheet has always had, now in
   /shared/wheel.js because it is one published standard and not two
   similar ideas.

   A flat list of words, not two lists. "Did you get what the bag said"
   and "what did you get instead" are the same question asked twice, and
   the answer to the first is just an intersection. Storing them apart
   would mean deciding, at tap time, which kind of word "honey" is when
   the bag says honey — and the answer is that it does not matter. */

// Case-insensitive, because the bag prints "Peach" and the wheel says
// "Peach" and somebody typing their own would write "peach".
function hasFlavour(list, word) {
  const w = String(word).toLowerCase();
  return (list || []).some(x => String(x).toLowerCase() === w);
}

function dropFlavour(list, word) {
  const w = String(word).toLowerCase();
  return (list || []).filter(x => String(x).toLowerCase() !== w);
}

// The bag's own words, as a list. Comma-separated is how they are typed
// and how the wheel writes, so it is how they are read.
function bagWords(c) {
  return LentoWheel.noteItems(c.bagNotes || '');
}

function buildBagNote(c) {
  const note = $('#bag-claim');
  const chips = $('#flavour-chips');
  if (!note || !chips) return;

  const said = bagWords(c);
  const got = said.filter(w => hasFlavour(editing.flavours, w));
  /* The line above the chips changes job once you have answered. Before:
     what the bag claims. After: how the claim did. Neither is a sentence
     worth two lines. */
  if (!said.length) {
    note.classList.add('hidden');
    note.textContent = '';
  } else {
    note.classList.remove('hidden');
    note.textContent = got.length
      ? `${got.length} of ${said.length} from the bag.`
      : `The bag says ${said.join(', ')} — tap the ones you got.`;
  }

  chips.innerHTML = '';
  // The bag's words first and always, in the order the bag prints them,
  // whether or not they have been taken. Then anything else, which by
  // definition has been.
  const extra = (editing.flavours || []).filter(w => !hasFlavour(said, w));
  said.forEach(w => chips.appendChild(flavourChip(c, w, hasFlavour(editing.flavours, w), true)));
  extra.forEach(w => chips.appendChild(flavourChip(c, w, true, false)));
}

/* A bag word is a toggle: it is a claim you are agreeing or not agreeing
   with, and it stays on the sheet either way so the claim is still
   visible. A word from the wheel is one you put there, so the only thing
   to do to it is take it off — and it says so with a ×. */
function flavourChip(c, word, on, fromBag) {
  const b = el('button', 'chip' + (on ? ' on' : '') + (fromBag ? ' chip-bag' : ''));
  b.type = 'button';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.innerHTML = escapeHTML(word) + (fromBag ? '' : ' <b aria-hidden="true">×</b>');
  b.setAttribute('aria-label', fromBag
    ? `${word}, from the bag${on ? ' — tasted' : ''}`
    : `${word} — remove`);
  b.addEventListener('click', () => {
    haptic();
    editing.flavours = on
      ? dropFlavour(editing.flavours, word)
      : (editing.flavours || []).concat([word]);
    buildBagNote(c);
    renderReadout(c);
  });
  return b;
}

/* The wheel, as this app uses it.

   The cupping sheet's inner ring ticks a CATA box and stops at five,
   because the standard says five. There is no CATA form here and no cap:
   a category is simply the coarse version of the same answer, and on
   plenty of mornings "fruity" is the honest one. So both rings write to
   the same list, and the only difference between them is how specific
   the word is. */
function openWheel(c) {
  const holder = $('#wheel-holder');
  const picked = $('#wheel-picked');
  const status = $('#wheel-status');

  LentoWheel.mount({
    holder: holder,
    toggle: $('#wheel-zoom-toggle'),
    level: $('#wheel-zoom-level'),
    haptic: haptic,
    categoryHint: 'a whole family, if that is as far as it got',
    wordHint: 'writes the word down',
  });

  const sync = message => {
    LentoWheel.paint(holder,
      name => hasFlavour(editing.flavours, name),
      word => hasFlavour(editing.flavours, word));

    picked.innerHTML = '';
    (editing.flavours || []).forEach(word => {
      const chip = el('button', 'wheel-pick note');
      chip.type = 'button';
      chip.innerHTML = `${escapeHTML(word)} <b aria-hidden="true">×</b>`;
      chip.setAttribute('aria-label', `${word} — remove`);
      chip.onclick = () => {
        haptic();
        editing.flavours = dropFlavour(editing.flavours, word);
        sync(`“${word}” removed`);
      };
      picked.appendChild(chip);
    });

    const said = bagWords(c);
    const got = said.filter(w => hasFlavour(editing.flavours, w));
    const n = (editing.flavours || []).length;
    status.textContent = message
      || (n
        ? `${n} word${n > 1 ? 's' : ''} down${said.length ? ` · ${got.length} of ${said.length} from the bag` : ''}`
        : 'Tap a wedge to write it down');
    // the sheet behind this one carries the same list
    buildBagNote(c);
    renderReadout(c);
  };

  holder.onclick = e => {
    const seg = e.target.closest && e.target.closest('.wheel-seg');
    if (!seg) return;
    /* One word out of sixty-eight, ten pixels wide: bring it closer
       rather than write down whichever of its neighbours the thumb
       actually met. */
    if (seg.classList.contains('wheel-child') && holder.dataset.zoom === 'whole'
        && holder.zoomToRead && holder.zoomToRead(seg)) {
      haptic();
      sync(`Zoomed in — tap “${seg.dataset.desc}” again to write it down`);
      return;
    }
    haptic();
    const word = seg.dataset.desc || seg.dataset.cat;
    if (hasFlavour(editing.flavours, word)) {
      editing.flavours = dropFlavour(editing.flavours, word);
      sync(`“${word}” removed`);
    } else {
      editing.flavours = (editing.flavours || []).concat([word]);
      sync(`“${word}” written down`);
    }
  };

  sync();
  openModal('#wheel-modal');
}

/* WHICH BREWER, WHEN THERE IS MORE THAN ONE.

   Hidden on a one-brewer shelf, because a choice with one answer is not
   a choice — it is a row of the sheet spent telling you what you already
   know. Above the numbers, because it changes what the numbers mean:
   switching to something that steeps takes the pour schedule off this
   sheet, takes the drawdown out of the readout, and changes what the
   advice underneath is willing to say about the clock. So the whole
   sheet is rebuilt when it changes, rather than left half describing the
   brewer you were using a moment ago. */
function buildBrewerPick(c) {
  const wrap = $('#brewer-pick');
  if (!wrap) return;
  const shelf = (kit().brewers || []);
  if (shelf.length < 2) { wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = '<span class="field-label">Brewed in</span>'
    + '<div class="chips" role="radiogroup" aria-label="Brewed in"></div>';
  const chips = wrap.querySelector('.chips');
  shelf.forEach(b => {
    const on = editing.brewer === b.name;
    const btn = el('button', 'chip' + (on ? ' on' : ''), escapeHTML(b.name));
    btn.type = 'button';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.addEventListener('click', () => {
      if (editing.brewer === b.name) return;
      editing.brewer = b.name;
      haptic();
      buildBrewSheet(c);
    });
    chips.appendChild(btn);
  });
}

/* The pour schedule.

   The distinctive record in this app and the reason it is not a dial-in
   with different words. An espresso is one event; a pour-over is five,
   and which five is the thing a brewer changes between one morning and
   the next. Writing "bloom, then three pours" in a notes field loses the
   times, and the times are the recipe.

   The water column is the running total on the scale — "to 150g" — and
   not the weight of that pour. Both are defensible in the abstract; only
   one is what the brewer is looking at. The scale on the counter reads
   cumulative, every published recipe is written cumulatively ("pour to
   150g by 0:45"), and asking for increments means doing subtraction at
   seven in the morning, which is the thing this app says elsewhere it
   will not make anybody do. It cost a real bug to find out: entering a
   V60 recipe the way it is written got the brew accused of adding up to
   390g against a 240g figure, and a warning that fires on correct data
   is worse than no warning, because it teaches the reader to ignore the
   one that matters. So the column says which number it wants, and the
   increment is derived and shown rather than asked for.

   Immersion gets one addition and a steep, so the block says that
   instead of drawing an empty timeline nobody will fill in. */
function buildPours(c) {
  const wrap = $('#pours');
  const block = $('#pour-block');
  if (!percolates(editing)) {
    block.classList.add('hidden');
    return;
  }
  block.classList.remove('hidden');
  wrap.innerHTML = '';

  (editing.pours || []).forEach((p, i) => {
    const line = el('div', 'pour-row');
    const label = i === 0 ? 'Bloom' : `Pour ${i}`;
    line.innerHTML = `<span class="pour-label">${label}</span>`;
    const at = numField({
      label: 'At', unit: '', time: true, compact: true,
      value: num(p.at), min: 0, max: 1800, step: 5, digits: 0,
      onChange: v => { p.at = v; renderReadout(c); },
    });
    at.classList.add('pour-field');
    line.appendChild(at);
    if (byWeight()) {
      const w = numField({
        // "To", because it is where the scale should read when this pour
        // finishes, not what this pour weighs.
        label: 'To', unit: 'g', compact: true,
        value: num(p.water), min: 0, max: 2000, step: 10, digits: 0,
        onChange: v => { p.water = v; buildPours(c); renderReadout(c); },
      });
      w.classList.add('pour-field');
      line.appendChild(w);
    }
    const rm = el('button', 'pour-remove', '−');
    rm.type = 'button';
    rm.setAttribute('aria-label', `Remove ${label.toLowerCase()}`);
    rm.addEventListener('click', () => {
      editing.pours.splice(i, 1);
      haptic();
      buildPours(c);
      renderReadout(c);
    });
    line.appendChild(rm);
    wrap.appendChild(line);

    /* What the pour itself weighed. Derived from the totals either side of
       it so the reader gets both readings and types only the one the scale
       gives them. Absent on the bloom, where the total and the pour are
       the same number and saying "+30g" twice explains nothing. */
    if (byWeight() && i > 0) {
      const added = pourAdded(editing, i);
      if (added !== null) {
        // Nothing signed on the way down: the readout names both figures,
        // and "−30g in this pour" describes water leaving the bed.
        wrap.appendChild(el('span', 'pour-added' + (added < 0 ? ' bad' : ''),
          added > 0 ? `+${fmt0(added)}g in this pour`
          : added === 0 ? 'nothing added in this pour'
          : 'below the total before it'));
      }
    }
  });

  const add = el('button', 'btn btn-ghost pour-add',
    editing.pours.length ? '＋ Another pour' : '＋ Start with the bloom');
  add.type = 'button';
  add.addEventListener('click', () => {
    const prev = editing.pours[editing.pours.length - 1];
    const at = prev && num(prev.at) !== null ? num(prev.at) + 45 : 0;
    // The bloom opens at twice the dose, which is the bottom of the
    // usual range — a suggestion sized from the coffee rather than a
    // number out of the air, and one tap from being changed.
    const dose = num(editing.dose);
    const water = editing.pours.length === 0 && dose !== null ? Math.round(dose * 2) : null;
    editing.pours.push({ at, water });
    haptic();
    buildPours(c);
    renderReadout(c);
  });
  wrap.appendChild(add);
}

/* Stated before the numbers, because that is when you know it. */
/* The brew this one is being compared against — the previous one for this
   coffee, or null when there is not one yet. Both the intent block and the
   readout need the same answer, and they used to work it out separately. */
function prevBrewOf(c) {
  const rows = brewsNewestFirst(c);
  return editingIsNew ? (rows[0] || null) : (rows[rows.indexOf(editing) + 1] || null);
}

function buildIntent(c) {
  const wrap = $('#intent');
  if (!wrap) return;
  wrap.innerHTML = '';

  /* "What are you changing?" needs something to be changing from. On the
     first brew of a coffee every answer on this row is unanswerable —
     finer than what? — and "Same again" is a claim about a brew that does
     not exist. The block leaves the sheet until there is a brew behind
     this one, and the card's own check already stays silent in that case,
     so nothing downstream is waiting on it. */
  const block = wrap.closest('.intent-block');
  const prev = prevBrewOf(c);
  if (block) block.classList.toggle('hidden', !prev);
  if (!prev) { editing.intent = null; return; }
  liveIntents(editing).forEach(i => {
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

const VERDICTS = [
  { key: 'off', label: 'Off', sub: 'not drinkable' },
  { key: 'ok', label: 'Drinkable', sub: 'not there yet' },
  { key: 'keeper', label: 'The one', sub: 'this is the recipe' },
];

function buildVerdict(c) {
  const wrap = $('#verdict');
  wrap.innerHTML = '';
  VERDICTS.forEach(v => {
    const b = el('button', 'verdict-btn' + (editing.verdict === v.key ? ' on' : ''),
      `<span class="verdict-label">${v.label}</span><span class="verdict-sub">${v.sub}</span>`);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', editing.verdict === v.key ? 'true' : 'false');
    b.addEventListener('click', () => {
      // tapping the chosen one again clears it: a verdict you did not
      // give is not "off"
      editing.verdict = editing.verdict === v.key ? null : v.key;
      haptic();
      buildVerdict(c);
      renderReadout(c);
    });
    wrap.appendChild(b);
  });
}

/* The drawer holds what your kit can change, and nothing else. */
function buildMore(c) {
  const body = $('#more-body');
  const summary = $('#more > summary');
  if (summary) summary.textContent = prefs.tds ? 'Refractometer, notes and the rest' : 'Notes and the rest';
  body.innerHTML = `
    ${prefs.tds ? `<div class="more-grid">
      <label class="field"><span class="field-label">TDS %</span>
        <input class="field-input" id="f-tds" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 1.38"></label>
      <label class="field"><span class="field-label">In the cup</span>
        <input class="field-input" id="f-bev" type="text" inputmode="decimal" autocomplete="off" placeholder="g on the scale"></label>
    </div>
    <p class="sheet-note">Extraction yield needs both: the bed keeps roughly twice its own weight, so the water you poured is not the drink you got. Weigh the cup.</p>` : ''}
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
  bind('#f-tds', 'tds', true);
  bind('#f-bev', 'beverage', true);
  bind('#f-notes', 'notes', false);

  const more = $('#more');
  more.open = Boolean(editing.notes || editing.tds || editing.beverage);
}

/* Everything read out of the numbers, and nothing typed.

   The dashes here are load-bearing: a ratio with no water behind it is
   not zero and not 1:0 — there is no ratio, and the slot says so. */
function renderReadout(c) {
  const wrap = $('#readout');
  const r = ratioOf(editing);
  const dd = drawdownOf(editing);
  const bloom = bloomOf(editing);
  const ey = extractionOf(editing);
  const place = placeOf(editing, c.target);
  const tips = nextMove(editing, c.target);
  const bloomTip = bloomNote(editing);

  // Live, because the one moment this can be acted on is while the sheet
  // is open and the grinder is two steps away.
  const mismatch = intentCheck(editing, prevBrewOf(c));
  const back = pourBacktrack(editing);

  const timeClass = place.time === 'in' ? 'in' : place.time === null ? '' : 'out';
  const windowNote = place.time === null
    ? `window ${fmtTime(c.target.timeLo)}–${fmtTime(c.target.timeHi)}`
    : place.time === 'in' ? `in the ${fmtTime(c.target.timeLo)}–${fmtTime(c.target.timeHi)} window`
    : place.time === 'fast' ? `${Math.round(c.target.timeLo - editing.time)}s quicker than the window`
    : `${Math.round(editing.time - c.target.timeHi)}s longer than the window`;

  const cells = [];
  if (byWeight()) {
    cells.push(`<div class="readout-cell">
      <span class="readout-value">${fmtRatio(r)}</span>
      <span class="readout-label">ratio${r !== null ? ` · aiming 1:${c.target.ratio}` : ''}</span>
    </div>`);
  }
  if (percolates(editing)) {
    cells.push(`<div class="readout-cell">
      <span class="readout-value">${fmtTime(dd)}</span>
      <span class="readout-label">drawdown</span>
    </div>`);
  }
  if (byWeight() && percolates(editing)) {
    cells.push(`<div class="readout-cell">
      <span class="readout-value">${bloom === null ? '—' : `${bloom.toFixed(1)}×`}</span>
      <span class="readout-label">bloom</span>
    </div>`);
  }
  if (prefs.tds) {
    cells.push(`<div class="readout-cell">
      <span class="readout-value">${ey === null ? '—' : fmt1(ey) + '%'}</span>
      <span class="readout-label">${ey === null ? 'extraction · needs TDS and the cup weighed' : 'extraction yield'}</span>
    </div>`);
  }

  wrap.innerHTML = `
    ${cells.length ? `<div class="readout-row">${cells.join('')}</div>` : ''}
    <div class="readout-window ${timeClass}">${windowNote}</div>
    ${tips.map(t => tipHTML(t, 'tip')).join('')}
    ${bloomTip ? tipHTML({ sure: false, move: bloomTip.move, why: bloomTip.why }, 'tip') : ''}
    ${back ? `<div class="log-mismatch">${escapeHTML(
      `${back.label} says ${fmt0(back.value)}g, which is below ${back.prevLabel} at ${fmt0(back.prev)}g. The column is the running total, so it only goes up.`)}</div>` : ''}
    ${mismatch ? `<div class="log-mismatch">${escapeHTML(mismatch)}</div>` : ''}
  `;
}

function saveBrew() {
  const c = activeCoffee();
  if (!c) return;
  const wasNew = editingIsNew;
  if (!isComplete(editing) && wasNew) {
    const missing = missingFields(editing);
    // Saving a half-recorded brew is allowed — a morning is a morning,
    // and a brew you only timed is still evidence. It is marked, not
    // refused.
    toast(`Saved without ${missing.join(' or ')}`);
  }
  if (wasNew) c.brews.push(editing);
  // The default for the next sheet is whatever you actually just used.
  if (editing.brewer && state.kit.brewer !== editing.brewer) state.kit.brewer = editing.brewer;
  save();
  closeModal('#brew-modal');
  renderBoard();
  if (wasNew) {
    const first = $('#brews') && $('#brews').firstElementChild;
    if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } else {
    toast('Brew updated');
  }
}

/* ============================================================
   COFFEES, THE KIT, SETTINGS
   ============================================================ */

/* Where the grinder is sitting today, as a number of its own.

   Borrowed shell, destructive control hidden: this sheet edits one
   field, and the recipe it sits beside is never touched by it. */
function openGrindNow(c, keeper) {
  const body = $('#edit-body');
  $('#edit-delete').classList.add('hidden');
  $('#edit-title').textContent = 'Grinder today';
  body.innerHTML = `
    <p class="sheet-note">Where the grinder is sitting now, which is not the same thing as the recipe. Beans degas, so a brew dialled on day five runs quicker on day fourteen at the same setting — the move belongs on the grinder, and the recipe stays where you found it${
      keeper && keeper.grind !== '' ? `: <strong>${escapeHTML(String(keeper.grind))}</strong>` : ''}.</p>
    <div class="target-grid" id="grind-grid"></div>
  `;
  const stepped = kit().steps === 'stepped';
  const start = keeper && num(Number(keeper.grind)) !== null ? num(Number(keeper.grind)) : undefined;
  let pending = c.grindNow === '' ? null : num(Number(c.grindNow));
  body.querySelector('#grind-grid').appendChild(numField({
    label: 'Grind', unit: '', value: pending, min: 0, max: 100,
    step: stepped ? 1 : 0.1, digits: stepped ? 0 : 1, startAt: start,
    onChange: v => { pending = v; },
  }));
  $('#edit-save').onclick = () => {
    c.grindNow = pending === null ? '' : String(pending);
    save();
    closeModal('#edit-modal');
    renderBoard();
  };
  openModal('#edit-modal');
}

function openCoffees() {
  const list = $('#coffee-list');
  list.innerHTML = '';
  if (!state.coffees.length) {
    list.appendChild(el('p', 'sheet-note', 'Nothing on the shelf yet. Add the bag you are brewing and the board is yours.'));
  }
  state.coffees.forEach(c => {
    const keeper = c.brews.filter(b => b.verdict === 'keeper').slice(-1)[0];
    const row = el('button', 'coffee-row' + (c.id === state.activeId ? ' on' : ''), `
      <span class="coffee-row-text">
        <span class="coffee-row-name">${escapeHTML(coffeeLabel(c))}</span>
        <span class="coffee-row-sub">${c.brews.length} brew${c.brews.length === 1 ? '' : 's'}${
          keeper && ratioOf(keeper) !== null ? ` · dialled at ${fmtRatio(ratioOf(keeper))}` : ''}</span>
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

/* A coffee arrives when it has a name, not when the button is pressed,
   so backing out of the sheet does not leave a ghost bag on the shelf. */
function addCoffee() {
  const c = newCoffee('');
  closeModal('#coffee-modal');
  openCoffee(c, { adding: true });
}

function openCoffee(c, opts) {
  const adding = Boolean(opts && opts.adding);
  const body = $('#edit-body');
  const t = c.target;
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
        <p class="sheet-note">All optional, and none of it moves the advice — that comes from roast level alone. This is the bag, kept beside the brews.</p>
        <label class="field"><span class="field-label">Origin</span>
          <input class="field-input" id="e-origin" type="text" maxlength="60" placeholder="e.g. Ethiopia, Guji"></label>
        <label class="field"><span class="field-label">Variety</span>
          <input class="field-input" id="e-variety" type="text" maxlength="60" placeholder="e.g. Heirloom, Gesha"></label>
        <label class="field"><span class="field-label">Process</span>
          <input class="field-input" id="e-process" type="text" maxlength="40" placeholder="e.g. Washed"></label>
        <label class="field"><span class="field-label">Grown at</span>
          <input class="field-input" id="e-altitude" type="text" maxlength="40" placeholder="whatever the bag prints, or nothing"></label>
        <label class="field"><span class="field-label">It says it tastes like</span>
          <input class="field-input" id="e-bagnotes" type="text" maxlength="120" placeholder="e.g. peach, jasmine, honey"></label>
      </div>
    </details>

    <div id="e-baseline"></div>

    <span class="field-label section">What you are aiming at</span>
    <p class="sheet-note">A brew is only quick or long against a window, so this app will not call one long until you have said what the window is. ${
      byWeight() ? '1:16 in ' : ''}${fmtTime(t.timeLo)}–${fmtTime(t.timeHi)} is where most ${
      percolates() ? 'pour-over' : 'immersion'} recipes start, not where they have to stay.</p>
    <div class="target-grid" id="target-grid"></div>
  `;
  body.querySelector('#e-name').value = c.name;
  body.querySelector('#e-roaster').value = c.roaster || '';
  body.querySelector('#e-roast').value = c.roastDate || '';
  const BAG = { origin: 'e-origin', variety: 'e-variety', process: 'e-process',
                altitude: 'e-altitude', bagNotes: 'e-bagnotes' };
  Object.keys(BAG).forEach(f => { body.querySelector('#' + BAG[f]).value = c[f] || ''; });
  /* Open if there is anything in it. A drawer that hides what somebody
     already typed teaches them it was not kept. */
  if (Object.keys(BAG).some(f => c[f])) body.querySelector('#e-more').open = true;

  /* One variable, and it says so.

     Roast level moves extraction more than anything else on a bag.
     Process, origin and elevation are real and much weaker, and folding
     them in would not make the answer better — it would make its
     confidence harder to read. It never writes to the target on its
     own: it offers, the button applies, and the sentence beside it says
     which it is. */
  const roastWrap = body.querySelector('#e-roastlevel');
  const baseWrap = body.querySelector('#e-baseline');
  const renderRoast = () => {
    roastWrap.innerHTML = '';
    ROASTS.forEach(r => {
      const on = c.roast === r.key;
      const b = el('button', 'chip' + (on ? ' on' : ''), escapeHTML(r.label));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.addEventListener('click', () => { c.roast = on ? '' : r.key; haptic(); renderRoast(); });
      roastWrap.appendChild(b);
    });
    const e = roastEntry(c.roast);
    const withTemp = canSetTemp();
    const withRatio = byWeight();
    baseWrap.innerHTML = e
      ? `<div class="baseline">
           <span class="baseline-head">A place to start</span>
           <p class="baseline-body">${escapeHTML(e.label)} roasts usually take <strong>${e.tempRange}</strong> and <strong>${e.ratioRange}</strong>. That is the roast alone — the strongest thing a bag tells you about extraction, and the only one this uses. Your grinder, water and palate finish the job.${
             withTemp ? '' : ' Your kettle holds one temperature, so the ratio is the part of this you can take.'}${
             withRatio ? '' : ' You are not brewing by weight, so the temperature is the part you can take.'}</p>
           ${withTemp || withRatio
             ? `<button class="btn btn-ghost" type="button" id="btn-apply-baseline">Start at ${
                 [withTemp ? `${e.temp}°` : '', withRatio ? `1:${e.ratio}` : ''].filter(Boolean).join(' and ')}</button>`
             : ''}
         </div>`
      : '';
    const apply = baseWrap.querySelector('#btn-apply-baseline');
    if (apply) apply.addEventListener('click', () => {
      if (withRatio) t.ratio = e.ratio;
      if (withTemp) t.temp = e.temp;
      commit();
      if (!adding) save();
      haptic();
      // Applying a starting point is one field changing, not the end of
      // the conversation: the sheet stays open and the grid redraws, so
      // the evidence it worked is the number and not a toast.
      buildTargetGrid();
      renderBoard();
      toast('Starting point applied');
    });
  };
  renderRoast();

  const grid = body.querySelector('#target-grid');
  const buildTargetGrid = () => {
    grid.innerHTML = '';
    if (byWeight()) {
      grid.appendChild(numField({ label: 'Coffee', unit: 'g', value: t.dose, min: 5, max: 120, step: 0.5, digits: 1,
        onChange: v => { t.dose = v === null ? 15 : v; } }));
      grid.appendChild(numField({ label: 'Ratio 1:', unit: '', value: t.ratio, min: 8, max: 25, step: 0.5, digits: 1,
        onChange: v => { t.ratio = v === null ? 16 : v; } }));
    }
    grid.appendChild(numField({ label: 'From', unit: '', time: true, value: t.timeLo, min: 30, max: 1800, step: 15, digits: 0,
      onChange: v => { t.timeLo = v === null ? flowEntry().lo : v; } }));
    grid.appendChild(numField({ label: 'To', unit: '', time: true, value: t.timeHi, min: 30, max: 1800, step: 15, digits: 0,
      onChange: v => { t.timeHi = v === null ? flowEntry().hi : v; } }));
    if (canSetTemp()) {
      grid.appendChild(numField({ label: 'Temp', unit: '°', value: t.temp, min: 70, max: 100, step: 1, digits: 0,
        onChange: v => { t.temp = v; } }));
    }
  };
  buildTargetGrid();

  /* Every way out of this sheet commits the same fields. The text inputs
     used to be read only by Save, so applying a starting point threw
     away the name and roast date typed above it — the very fields the
     starting point is derived from. */
  const commit = () => {
    c.name = body.querySelector('#e-name').value;
    c.roaster = body.querySelector('#e-roaster').value;
    c.roastDate = body.querySelector('#e-roast').value;
    Object.keys(BAG).forEach(f => { c[f] = body.querySelector('#' + BAG[f]).value.trim(); });
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
    const n = c.brews.length;
    if (n && !confirm(`Remove ${coffeeLabel(c)}? Its ${n} brew${n === 1 ? '' : 's'} go with it, and there is no undo.`)) return;
    state.coffees = state.coffees.filter(x => x.id !== c.id);
    state.dead[c.id] = Date.now();
    if (state.activeId === c.id) state.activeId = state.coffees.length ? state.coffees[0].id : null;
    save();
    closeModal('#edit-modal');
    renderBoard();
    toast('Removed');
  };
  openModal('#edit-modal');
}

/* A segmented row: a label, a sentence of why it matters, and the
   answers. The "why" is not padding — somebody being asked whether the
   water passes through or the coffee steeps deserves to know that the
   answer changes what the app is allowed to say about the clock. */
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

/* Grinders you have already told lento about, above the shipped list.

   A second grinder is the normal case, not the edge, so the dial-in's
   answer belongs here as an offer — named, one tap, and never applied on
   your behalf. Anything already on your list is left out of the long list
   below it, because the same name twice in a select is a puzzle. */
function grinderOptions(cur) {
  const mine = LentoKit.known();
  const mineNames = mine.map(g => g.name);
  const rest = LentoKit.GRINDERS.filter(g => mineNames.indexOf(g.name) < 0);
  const known = mineNames.indexOf(cur) >= 0 || LentoKit.GRINDERS.some(g => g.name === cur);
  const opt = name => `<option value="${escapeHTML(name)}"${
    name === cur ? ' selected' : ''}>${escapeHTML(name)}</option>`;
  return `<option value=""${!cur ? ' selected' : ''}>Choose…</option>`
    + `<option value="__other"${cur && !known ? ' selected' : ''}>Something else</option>`
    + (mine.length
      ? `<optgroup label="Yours">${mine.map(g => opt(g.name)).join('')}</optgroup>`
        + `<optgroup label="All grinders">${rest.map(g => opt(g.name)).join('')}</optgroup>`
      : rest.map(g => opt(g.name)).join(''));
}

/* Brewers you already own, above the shipped list — the same shape the
   grinder picker has, for the same reason: a second one is the normal
   case and not the edge. Anything already on your shelf is left out of
   the long list below it, because the same name twice in a select is a
   puzzle rather than a choice. */
function brewerOptions() { return brewerOptionsFor(kit()); }
function brewerOptionsFor(k) {
  const mine = ((k && k.brewers) || []).map(b => b.name);
  const rest = BREWERS.filter(b => mine.indexOf(b.name) < 0);
  return '<option value="" selected>Add a brewer…</option>'
    + '<option value="__other">Something else</option>'
    + rest.map(b => `<option value="${escapeHTML(b.name)}">${escapeHTML(b.name)}</option>`).join('');
}

/* HOW THE WATER LEAVES, ASKED THE WAY SOMEBODY WOULD ANSWER IT.

   This was one segmented row headed "The water", offering "Passes
   through / Steeps / Both" under forty-six words about what the app is
   allowed to say about the clock. Three things were wrong with it and a
   brewer said so: "i dont understand what we're asking about the water".

   "The water" is the single most discussed subject in filter coffee and
   none of it is this — somebody reading that heading is braced for a
   question about minerals. "Passes through" and "Steeps" are the app's
   vocabulary for its own reasoning, not words anybody uses about the
   thing in their hand. And the explanation argued the app's case before
   the person had understood the question.

   So: it is a question about the brewer, it is asked in the shape you
   would watch it happen, each answer names brewers you can recognise
   yourself in, and the reason it is being asked comes after — one line,
   not a paragraph. Most people never see it at all now, because picking
   "Hario V60" off the list answers it. */
function flowRow(current, onPick) {
  const wrap = el('div', 'kit-row');
  wrap.innerHTML = `
    <span class="field-label">When the water goes in, does it drain out?</span>
    <div class="seg seg-stack" role="radiogroup" aria-label="Does the water drain out"></div>
    <span class="kit-sub">It decides what this app may say about the clock. Draining, the grind sets how long it takes. Steeping, the time is whatever you set the timer to.</span>
  `;
  const seg = wrap.querySelector('.seg');
  ['percolation', 'immersion', 'switch'].forEach(key => {
    const f = FLOWS[key];
    const on = current === key;
    const b = el('button', 'seg-btn' + (on ? ' on' : ''));
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.innerHTML = `<span class="seg-main">${escapeHTML(f.label)}</span>`
      + `<span class="seg-eg">${escapeHTML(f.eg)}</span>`;
    b.addEventListener('click', () => { haptic(); onPick(key); });
    seg.appendChild(b);
  });
  return wrap;
}

function openKit() {
  const k = Object.assign(defaultKit(), state.kit);
  const body = $('#kit-body');
  body.innerHTML = `
    <p class="sheet-note">Asked once. The brew sheet then offers only what you can actually change, and nothing here suggests a variable your kit does not have.</p>

    <span class="field-label section">What you brew in</span>
    <p class="sheet-note">Add every one you use. You pick which on the brew sheet, and each brew keeps the one that made it — so a press this evening does not rewrite what the V60 did this morning.</p>
    <div id="k-brewers"></div>
    <label class="field"><span class="field-label sr-only">Add a brewer</span>
      <select class="field-input" id="k-brewer-pick">${brewerOptions()}</select></label>
    <div id="k-brewer-new" class="hidden">
      <label class="field"><span class="field-label">What do you call it</span>
        <input class="field-input" id="k-brewer-name" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Flower Dripper"></label>
      <div id="k-brewer-flow"></div>
      <button type="button" class="btn btn-ghost" id="k-brewer-add">Add it</button>
    </div>

    <span class="field-label section">The rest of the counter</span>
    <label class="field"><span class="field-label">Kettle</span>
      <input class="field-input" id="k-kettle" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Fellow Stagg EKG"></label>
    <div id="k-temp"></div>
    ${/* The same list the dial-in offers, because it is the same grinder.
          The objection in this file's own kit comment — that a brand table
          goes stale and is wrong about every hybrid — is answered the way
          the dial-in answers it: the row seeds two editable answers once,
          the text field is still there for anything not on it, and nothing
          is read out of the name when advice is given. */ ''}
    <label class="field"><span class="field-label">Grinder</span>
      <select class="field-input" id="k-grinder-pick">${grinderOptions(k.grinder)}</select></label>
    <label class="field hidden" id="k-grinder-other"><span class="field-label">Which one</span>
      <input class="field-input" id="k-grinder" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Comandante C40"></label>
    <div id="k-steps"></div>
    <div id="k-scale"></div>
  `;
  body.querySelector('#k-kettle').value = k.kettle;

  /* THE SHELF.

     A row per brewer with what it does in its own words, because the
     answer is the reason the brew sheet looks the way it does and a
     person should be able to check it without remembering which button
     they pressed. Tapping a row opens the question again for that one;
     the × takes it off the shelf. Removing a brewer never touches the
     brews it made — those keep its name, and the log stays true about
     kit that has been given away. */
  let openFlow = null;
  const newFlow = { value: 'percolation' };
  const shelf = body.querySelector('#k-brewers');
  const pick = body.querySelector('#k-brewer-pick');
  const adding = body.querySelector('#k-brewer-new');

  const drawShelf = () => {
    shelf.innerHTML = '';
    if (!k.brewers.length) {
      shelf.innerHTML = '<p class="sheet-note empty-note">Nothing on the shelf yet.</p>';
    }
    k.brewers.forEach((b, i) => {
      const row = el('div', 'shelf-row');
      const open = openFlow === i;
      const head = el('button', 'shelf-name');
      head.type = 'button';
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      head.innerHTML = `<span class="shelf-title">${escapeHTML(b.name)}</span>`
        + `<span class="shelf-flow">${escapeHTML((FLOWS[b.flow] || FLOWS.percolation).short)}</span>`;
      head.addEventListener('click', () => { openFlow = open ? null : i; drawShelf(); });
      const kill = el('button', 'icon-btn shelf-kill');
      kill.type = 'button';
      kill.setAttribute('aria-label', `Remove ${b.name}`);
      kill.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
      kill.addEventListener('click', () => {
        k.brewers = k.brewers.filter((_, j) => j !== i);
        if (k.brewer === b.name) k.brewer = k.brewers.length ? k.brewers[0].name : '';
        openFlow = null;
        pick.innerHTML = brewerOptionsFor(k);
        drawShelf();
      });
      row.appendChild(head);
      row.appendChild(kill);
      shelf.appendChild(row);
      if (open) {
        shelf.appendChild(flowRow(b.flow, key => { b.flow = key; drawShelf(); }));
      }
    });
  };

  const resetAdd = () => {
    adding.classList.add('hidden');
    pick.value = '';
    newFlow.value = 'percolation';
    body.querySelector('#k-brewer-name').value = '';
  };

  const add = (name, flow) => {
    const clean = (name || '').trim();
    if (!clean) return false;
    if (k.brewers.some(b => b.name.toLowerCase() === clean.toLowerCase())) {
      toast('Already on the shelf');
      return false;
    }
    k.brewers.push({ name: clean, flow: flow || 'percolation' });
    if (!k.brewer) k.brewer = clean;
    pick.innerHTML = brewerOptionsFor(k);
    drawShelf();
    return true;
  };

  pick.addEventListener('change', () => {
    if (pick.value === '__other') {
      adding.classList.remove('hidden');
      drawNewFlow();
      body.querySelector('#k-brewer-name').focus();
      return;
    }
    if (!pick.value) return;
    const e = BREWERS.find(b => b.name === pick.value);
    // Off the list, so the question never gets asked — a V60 has a hole
    // in it and next year's will too.
    if (e && add(e.name, e.flow)) toast(`${e.name} added`);
    resetAdd();
  });

  const drawNewFlow = () => {
    const n = body.querySelector('#k-brewer-flow');
    n.innerHTML = '';
    n.appendChild(flowRow(newFlow.value, key => { newFlow.value = key; drawNewFlow(); }));
  };

  body.querySelector('#k-brewer-add').addEventListener('click', () => {
    const name = body.querySelector('#k-brewer-name').value;
    if (!name.trim()) { body.querySelector('#k-brewer-name').focus(); return; }
    if (add(name, newFlow.value)) { toast(`${name.trim()} added`); resetAdd(); }
  });

  drawShelf();
  body.querySelector('#k-grinder').value = k.grinder;
  /* Prefill, and an escape hatch that says so. A grinder somebody has
     modified beats any list, which is why both answers stay editable
     underneath and the list only ever seeds them. */
  const gPick = body.querySelector('#k-grinder-pick');
  const gOther = body.querySelector('#k-grinder-other');
  const syncGrinder = () => gOther.classList.toggle('hidden', gPick.value !== '__other');
  if (k.grinder && !LentoKit.entryFor(k.grinder)) gPick.value = '__other';
  syncGrinder();
  gPick.addEventListener('change', () => {
    syncGrinder();
    // What you have said about this grinder, over what the shipped list
    // says. Only the grind steps are taken: whether it holds grounds
    // matters to a dial-in and not to a pour over, so this app neither
    // asks it nor pretends to know.
    const e = LentoKit.entryFor(gPick.value);
    if (e) {
      k.grinder = e.name;
      k.steps = e.steps;
      redraw();
      toast('Filled in from your grinder');
    } else if (gPick.value === '__other') {
      body.querySelector('#k-grinder').focus();
    }
  });

  const redraw = () => {
    const put = (sel, row) => { const n = body.querySelector(sel); n.innerHTML = ''; n.appendChild(row); };
    put('#k-temp', segRow('Kettle temperature',
      'Most kettles have one setting. Say so and the temperature field leaves the brew sheet, and nothing here tells you to raise it.',
      [['fixed', 'Off the boil'], ['set', 'I set it']], k.temp,
      key => { k.temp = key; redraw(); }));

    put('#k-steps', segRow('The grind dial',
      'Only so the app uses your words for it. It never suggests a setting, only a direction — your numbers mean nothing on anyone else’s grinder.',
      [['stepless', 'A number'], ['stepped', 'Clicks']], k.steps,
      key => { k.steps = key; redraw(); }));

    put('#k-scale', segRow('Brewing by weight',
      'A ratio built from a scoop is not a ratio. Without a scale this app records grind, time and taste and prints no ratio anywhere — which is still a useful log, and an honest one.',
      [['yes', 'On a scale'], ['no', 'By eye']], k.scale ? 'yes' : 'no',
      key => { k.scale = key === 'yes'; redraw(); }));
  };
  redraw();

  const finish = () => {
    k.kettle = body.querySelector('#k-kettle').value.trim();
    const gv = body.querySelector('#k-grinder-pick').value;
    k.grinder = (gv && gv !== '__other') ? gv : body.querySelector('#k-grinder').value.trim();
    /* The one you reach for by default. It follows the shelf: an empty
       shelf has none, and a brewer that has been removed cannot go on
       being the default. */
    if (k.brewers.length && !k.brewers.some(b => b.name === k.brewer)) k.brewer = k.brewers[0].name;
    if (!k.brewers.length) k.brewer = '';
    k.asked = true;
    const before = waterFlow();
    state.kit = k;
    // Shared with the dial-in — see public/shared/kit.js.
    LentoKit.remember(k, false);
    /* Changing how the water moves changes what a sensible window is, so
       a coffee nobody has moved off the defaults follows. One somebody
       has set by hand is left exactly alone — it is their window, and
       this is not the screen to overwrite it from. */
    if (waterFlow() !== before) {
      const f = flowEntry();
      state.coffees.forEach(c => {
        const untouched = Object.values(FLOWS).some(o => c.target.timeLo === o.lo && c.target.timeHi === o.hi);
        if (untouched) { c.target.timeLo = f.lo; c.target.timeHi = f.hi; }
      });
    }
    save();
    closeModal('#kit-modal');
    renderBoard();
  };

  $('#kit-save').onclick = () => { finish(); toast('Setup saved'); };
  // Skipping is answering: the defaults are the commonest home setup — a
  // cone, a plain kettle, a scale — so a skip leaves the simplest sheet
  // rather than the fullest one. It is not asked again, and it lives in
  // Settings for ever.
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
  const n = (k.brewers || []).length;
  // One brewer is named; several are counted, because four names in a
  // settings row is a paragraph in a slot that holds a phrase.
  const brewers = n > 1 ? `${n} brewers` : (k.brewers[0] && k.brewers[0].name) || '';
  const bits = [brewers, k.kettle, k.grinder].filter(Boolean);
  if (!bits.length) return 'Not set — the sheet is using the defaults';
  return bits.join(' · ');
}

function openSettings() {
  const body = $('#settings-body');
  body.innerHTML = `
    ${cloudOn() ? `<button class="btn btn-ghost kit-btn" id="btn-account">
      <span class="kit-btn-title">${cloudUser() ? 'Your account' : 'Sign in'}</span>
      <span class="kit-btn-sub">${escapeHTML(LentoAccountSheet.line())}</span>
    </button>` : ''}

    <button class="btn btn-ghost kit-btn" id="btn-kit">
      <span class="kit-btn-title">Your setup</span>
      <span class="kit-btn-sub">${escapeHTML(kitLine())}</span>
    </button>

    <label class="switch-row" for="t-tds">
      <span class="switch-text">
        <span class="switch-title">Refractometer</span>
        <span class="switch-sub">Adds a TDS field and a place for the weight of the cup, and shows extraction yield. Off, the app works on coffee, water and time — which is what most kitchens have.</span>
      </span>
      <span class="switch"><input type="checkbox" id="t-tds"><span class="switch-track"><span class="switch-knob"></span></span></span>
    </label>

    <span class="field-label section">Appearance</span>
    <div class="seg" id="theme-seg" role="radiogroup" aria-label="Appearance"></div>

    <button class="btn btn-ghost" id="btn-help">What the numbers mean</button>
  `;
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

  const acc = body.querySelector('#btn-account');
  if (acc) acc.addEventListener('click', () => { closeModal('#settings-modal'); LentoAccountSheet.open(); });
  body.querySelector('#btn-kit').addEventListener('click', () => { closeModal('#settings-modal'); openKit(); });
  body.querySelector('#btn-help').addEventListener('click', () => { helpFrom = 'settings'; closeModal('#settings-modal'); openHelp(); });
  openModal('#settings-modal');
}

// Where Help was opened from, so closing it goes back there rather than
// dumping somebody on the board halfway through what they were doing.
let helpFrom = null;

function openHelp() {
  $('#help-body').innerHTML = `
    <p><strong>Ratio</strong> is water divided by coffee. 15g and 250g is 1:16.7. It describes the brew; it is not a measure of how much was taken out of the bed.</p>
    <p><strong>Drawdown</strong> is the time between your last pour landing and the bed running dry. It is the number that moves first when the grind moves, and a bed that takes ninety seconds to clear is telling you something the taste will not say for another minute.</p>
    <p><strong>The pours</strong> are kept as the running total on the scale, the way a recipe is written: a bloom to 30g, then to 150g, then to 240g. Not the weight of each pour — that is the number the app works out and shows you, because the scale on your counter is already doing the adding.</p>
    <p><strong>The bloom</strong> is the first pour, and what matters is its size against the dose — two to three times is the working range. Less and part of the bed never wets; more and you are brewing before the coffee has finished degassing.</p>
    <p><strong>Extraction yield</strong> is the share of the dry coffee that ended up dissolved in the cup. It needs a refractometer <em>and</em> the cup on a scale: the bed keeps roughly twice its own weight, so the water you poured is not the drink you got. Every tool that computes filter yield from coffee and water alone is estimating that retention and printing it as a reading. This one returns nothing without both.</p>
    <p><strong>How far to move the grinder</strong> is the question most brewing advice dodges, because the number on your grinder means nothing on anybody else's. It means something on yours: two brews that differ only in grind are a measurement of it, and once this board has a couple it tells you how many clicks rather than "a step", and what the clock should read afterwards. It only does this where the water passes through the bed — in a brewer that steeps, the time is what you set the timer to, so there is no seconds-per-click to find and the app does not invent one.</p>
    <p><strong>The window</strong> is yours, per coffee. Nothing here calls a brew quick or long until you have said what it is being measured against.</p>
    <p><strong>Sour, bitter, thin, strong</strong> are two questions, not four, and the app asks them separately because they are answered separately.</p>
    <p><strong>Sour and bitter</strong> are the extraction walls. Sour is water that did not take enough out of the bed; bitter is water that took too much. Grind is the variable.</p>
    <p><strong>Thin and strong</strong> are the concentration walls, and grind is not the variable. A brew can be extracted perfectly and still be thin, because thin is about how much coffee ended up in the cup: that is the ratio. Thin means less water or more coffee; strong means the other way.</p>
    <p>A cup can sit on one wall, both, or neither, which is why they get a scale each rather than one word for the whole brew.</p>
    <p><strong>Your setup</strong> decides what this app asks you for. Say the coffee steeps rather than drains and the app stops treating the clock as a symptom — in an immersion brewer the time is a decision you made, so grinding finer does not lengthen it. Say your kettle holds one temperature and the temperature field leaves the sheet. Change it any time in Settings.</p>
    <p class="sheet-note">Everything is stored on this device and works with no signal. An account is optional, and all it does is copy the log to the other devices you sign in on.</p>
  `;
  openModal('#help-modal');
}

/* ---------- modals ---------- */

let lastFocus = null;

function focusables(m) {
  return [...m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(n => !n.disabled && n.offsetParent !== null);
}

function trapTab(m, e) {
  if (e.key !== 'Tab') return;
  const items = focusables(m);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openModal(sel) {
  const m = $(sel);
  lastFocus = document.activeElement;
  m.classList.remove('hidden');
  m.dataset.trapped = '1';
  m._trap = e => trapTab(m, e);
  m.addEventListener('keydown', m._trap);
  const items = focusables(m);
  if (items.length) items[0].focus();
}

function closeModal(sel) {
  const m = $(sel);
  m.classList.add('hidden');
  if (m._trap) m.removeEventListener('keydown', m._trap);
  delete m.dataset.trapped;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function applyTheme() {
  const root = document.documentElement;
  if (prefs.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', prefs.theme);
}

/* ============================================================
   WIRING
   ============================================================ */

/* ============================================================
   ACCOUNT AND CLOUD COPY (optional)

   The brew log works with no account and no signal, for ever. That is the
   product, not a limitation being worked around, and this section is only
   allowed to add to it.

   What it adds is one thing: the log follows you. The same person had a
   cupping history that followed them, a shot log that followed them, and
   a month of mornings that lived in one browser. This is the same account
   reaching the same project through /shared/account.js — see the long
   note at the top of that file for what it refuses to do.

   Newest wins, per brew. Two devices logging brews on the same bag give a
   union, which is lossless. The same brew edited in two places while both
   are offline costs the earlier edit, silently. Deliberate, and written
   down where anyone changing it will read it.
   ============================================================ */

function cloudOn() { return Boolean(window.LentoAccount && LentoAccount.enabled()); }
function cloudUser() { return cloudOn() ? LentoAccount.user() : null; }

/* One recipe to a coffee, still true after a merge. Two devices can each
   mark a keeper offline, and the union holds both; the board answers
   "what is the recipe" with one set of numbers, so the merge picks the
   newest and puts the rest back to ok rather than hoping. */
function oneKeeper(brews) {
  const keepers = brews.filter(b => b.verdict === 'keeper');
  if (keepers.length < 2) return brews;
  let best = keepers[0];
  keepers.forEach(b => { if ((b.updated || 0) > (best.updated || 0)) best = b; });
  keepers.forEach(b => { if (b !== best) b.verdict = 'ok'; });
  return brews;
}

function mergeCoffee(local, remote) {
  // Both sides' deletions, each at its latest time. A tombstone travels
  // inside the coffee record, which is how a delete on one device reaches
  // the other at all.
  const dead = Object.assign({}, local.dead || {});
  Object.keys(remote.dead || {}).forEach(k => {
    if ((remote.dead[k] || 0) > (dead[k] || 0)) dead[k] = remote.dead[k];
  });

  const byId = new Map();
  const take = b => {
    if (!b || !b.id) return;
    const mine = byId.get(b.id);
    if (!mine || (b.updated || 0) > (mine.updated || 0)) byId.set(b.id, b);
  };
  (local.brews || []).forEach(take);
  (remote.brews || []).forEach(take);

  const brews = oneKeeper(
    Array.from(byId.values())
      // A brew deleted after the copy on offer was written stays deleted.
      .filter(b => !((dead[b.id] || 0) > (b.updated || 0)))
      .sort((a, b) => (a.at || 0) - (b.at || 0))
  );

  const base = (remote.updated || 0) > (local.updated || 0) ? remote : local;
  const merged = Object.assign({}, base, { brews: brews, dead: dead });
  // Returned unchanged when nothing moved, so a sync that found nothing
  // does not rewrite the log and does not look like an edit.
  return JSON.stringify(merged) === JSON.stringify(local) ? local : merged;
}

/* This app's own kit, under its own record id. The dial-in has a kit too
   and it is not this one — a basket is not a brewer — so a shared id would
   have the two overwriting each other's setup every few seconds. What they
   do share is the grinder, and that has its own record, owned and synced
   by /shared/kit.js. */
async function syncKit() {
  const rows = await LentoAccount.pull('kit');
  if (!rows) return false;
  const row = rows.filter(r => r.id === 'filter')[0];
  const mine = state.kitUpdated || 0;
  if (row && (row.updated || 0) > mine) {
    state.kit = Object.assign(defaultKit(), row.data);
    state.kitUpdated = row.updated;
    primeStamps();
    writeState();
  } else if (mine && (!row || mine > (row.updated || 0))) {
    await LentoAccount.push('kit', 'filter', state.kit, mine);
  }
  /* The list of grinders this person owns, which belongs to neither app.
     It is only ever offered in the kit sheet, so a newer list from another
     device changes nothing on screen here and nothing about the advice. */
  await LentoKit.sync();
  return true;
}

let syncing = false;
let syncTimer = null;

async function syncNow() {
  if (!cloudUser() || syncing) return false;
  syncing = true;
  try {
    // Deletions first. A row left in the cloud comes back on the next
    // pull, so a delete that is only local undoes itself on the other
    // device.
    for (const id of Object.keys(state.dead || {})) {
      await LentoAccount.remove('filter', id);
    }
    const ok = await LentoAccount.syncTool('filter', {
      load: () => state.coffees,
      save: rows => {
        state.coffees = rows.filter(c => !((state.dead[c.id] || 0) > coffeeUpdated(c)));
        if (!state.coffees.some(c => c.id === state.activeId)) {
          state.activeId = state.coffees.length ? state.coffees[0].id : null;
        }
        // primeStamps before writing: these timestamps are other devices'
        // and must survive. See writeState().
        primeStamps();
        writeState();
      },
      idOf: c => c.id,
      updatedOf: coffeeUpdated,
      merge: mergeCoffee,
    });
    const kitOk = await syncKit();
    renderBoard();
    return Boolean(ok && kitOk);
  } catch (e) {
    return false;
  } finally {
    syncing = false;
  }
}

/* Every save asks for a sync, and the debounce is what stops that being
   one request per keystroke. Signed out, or with nothing configured, this
   costs a boolean and does nothing at all. */
function queueSync() {
  if (!cloudUser()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncTimer = null; syncNow(); }, 4000);
}

/* ---------- account UI ---------- */

function wire() {
  $('#btn-coffee').addEventListener('click', openCoffees);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-log').addEventListener('click', () => (activeCoffee() ? openBrew(null) : addCoffee()));
  $('#brew-close').addEventListener('click', closeBrewSheet);
  $('#brew-save').addEventListener('click', saveBrew);
  $('#coffee-close').addEventListener('click', () => closeModal('#coffee-modal'));
  $('#btn-add-coffee').addEventListener('click', addCoffee);
  $('#edit-close').addEventListener('click', () => closeModal('#edit-modal'));
  $('#kit-close').addEventListener('click', () => closeModal('#kit-modal'));
  /* The wheel opens over the brew sheet rather than replacing it: you are
     in the middle of recording one brew and the wheel is a vocabulary you
     reached for, not a screen you went to. Closing it drops you back where
     you were with the words already on the sheet behind. */
  $('#btn-wheel').addEventListener('click', () => {
    const c = activeCoffee();
    if (c) openWheel(c);
  });
  $('#wheel-close').addEventListener('click', () => closeModal('#wheel-modal'));
  $('#wheel-done').addEventListener('click', () => closeModal('#wheel-modal'));
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
    if (!open) return;
    if (open.id === 'brew-modal') closeBrewSheet();
    else closeModal('#' + open.id);
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target !== m) return;
      if (m.id === 'brew-modal') closeBrewSheet();
      else closeModal('#' + m.id);
    });
  });
}

function boot() {
  load();
  applyTheme();
  /* Before wire(), because the sheet injects its own markup and wire()
     walks `.modal` once to bind the backdrop click. */
  if (window.LentoAccountSheet) {
    LentoAccountSheet.install({
      open: sel => openModal(sel),
      close: sel => closeModal(sel),
      toast: msg => toast(msg),
      refresh: () => renderBoard(),
      sync: () => syncNow(),
      status: phase => {
        const n = (state.coffees || []).reduce((n, c) => n + (c.brews || []).length, 0);
        const word = n === 1 ? 'brew' : 'brews';
        return phase === 'synced'
          ? `Synced · ${n} ${word}`
          : `${n} ${word}, backed up as you log them.`;
      },
      signedOutNote: 'Your log then follows you to any device — and still works with no signal.',
      signOutNote: 'Signing out leaves every brew here.',
      signedInToast: 'Signed in — your log is backing up',
    });
  }
  wire();
  renderBoard();
  /* An OAuth return lands as a fragment on this URL, so it is consumed
     before anything else can rewrite the address bar. Then a sync, which
     is a no-op signed out. */
  if (window.LentoAccount) {
    LentoAccount.onChange(() => renderBoard());
    LentoAccount.adoptRedirect()
      .then(signedIn => {
        if (signedIn) toast('Signed in — your log is backing up');
        if (cloudUser()) return syncNow();
      })
      .catch(() => {});
  }
  /* No protocol test. serviceWorker is only exposed in a secure context
     to begin with, so the check added nothing on the deployed site — and
     it excluded localhost, which is a secure context, meaning this app's
     offline path had never once run anywhere it could be watched. The
     other two apps never had it. */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline is the normal case here anyway */ });
  }
}

boot();
