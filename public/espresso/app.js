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
    if (typeof c.grindNow !== 'string') c.grindNow = '';
    if (!Array.isArray(c.shots)) c.shots = [];
    c.shots.forEach(sh => {
      if (typeof sh.taste === 'undefined') sh.taste = null;
      if (typeof sh.body === 'undefined') sh.body = null;
      if (typeof sh.intent === 'undefined') sh.intent = null;
    });
  });
  return s;
}

/* ---------- the kit ----------

   Asked once, before the first shot, and then never again.

   A dial-in tool that asks for brew temperature on a machine with one
   temperature is asking somebody to invent a number and then quoting it
   back at them. The advice is worse: "brew temperature is the usual next
   lever, up a degree or two" is not a suggestion to a Bambino Plus owner,
   it is the app admitting it does not know what they are standing in front
   of. Half this product's value is knowing which levers exist.

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

function defaultKit() {
  return {
    machine: '',
    grinder: '',
    basket: '',
    // what the machine can do, in the app's terms
    temp: 'fixed',       // 'fixed' — one temperature | 'set' — you choose it
    pressure: 'fixed',   // 'fixed' | 'gauge' — you can see it | 'profile' — you can change it
    steps: 'stepless',   // 'stepped' — clicks | 'stepless' — a number on a dial
    basketDose: 18,
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
  return { dose: kit().basketDose || 18, ratio: 2, timeLo: 25, timeHi: 30, temp: null };
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
const ROASTS = [
  { key: 'light',  label: 'Light',       temp: 94, ratio: 2.4, tempRange: '93–95°', ratioRange: '1:2.2–1:2.5' },
  { key: 'mlight', label: 'Medium-light', temp: 93, ratio: 2.2, tempRange: '92–94°', ratioRange: '1:2.1–1:2.3' },
  { key: 'medium', label: 'Medium',      temp: 92, ratio: 2.0, tempRange: '92–93°', ratioRange: '1:1.9–1:2.1' },
  { key: 'mdark',  label: 'Medium-dark', temp: 91, ratio: 1.9, tempRange: '90–92°', ratioRange: '1:1.8–1:2.0' },
  { key: 'dark',   label: 'Dark',        temp: 90, ratio: 1.8, tempRange: '88–91°', ratioRange: '1:1.7–1:1.9' },
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
   concentration does, and they move on different levers: grind changes how
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
   window got through the puck too quickly, and grind is the lever that
   changes that — you do not need to taste it to know which way to turn
   the grinder. So the clock gets its own advice, and taste upgrades it
   rather than unlocking it.

   The one case the clock cannot see is named rather than hidden: fast
   *and bitter* is channelling, not a coarse grind, and going finer will
   not fix it. That is exactly what the taste scale adds, and saying so
   is a better argument for using it than withholding the whole answer
   was. */
function clockAdvice(shot, target) {
  const place = placeOf(shot, target);
  if (place.time === null) return null;
  const lo = Math.round(target.timeLo), hi = Math.round(target.timeHi);
  const t = num(shot.time);

  if (place.time === 'fast') {
    const off = Math.round(lo - t);
    return { sure: true, move: 'Grind finer.',
      why: `It came in ${off}s short of the ${lo}–${hi}s window, so the water got through the puck before it had taken much with it. Finer slows it down, and it is the only lever that does. Go one small step — you are after a few seconds, not ten. Say how it tasted and the app can check the one case this does not fix: a shot that is both quick and bitter is the water finding a channel, and grinding finer makes that worse.` };
  }
  if (place.time === 'slow') {
    const off = Math.round(t - hi);
    return { sure: true, move: 'Grind coarser.',
      why: `It ran ${off}s past the ${lo}–${hi}s window, so the water spent longer in the puck than the recipe asks for. Coarser speeds it up. One small step. Say how it tasted and the app can check the one case this does not fix: a shot that is both slow and sour usually means the water went round the puck rather than through it.` };
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
function suggest(shot, target) {
  const place = placeOf(shot, target);
  const side = tasteSide(shot.taste);
  if (side === null || place.time === null) return null;

  if (side === 'sour' && place.time === 'fast') {
    return { sure: true, move: 'Grind finer.',
      why: 'It ran short of the window and tasted sour — water moved through the puck too fast to take enough with it. Grind is the lever that fixes both at once.' };
  }
  if (side === 'bitter' && place.time === 'slow') {
    return { sure: true, move: 'Grind coarser.',
      why: 'It ran past the window and tasted bitter — water spent too long in the puck. Grind is the lever that fixes both at once.' };
  }
  if (side === 'sour' && place.time === 'slow') {
    return { sure: false, move: 'Not grind, this time.',
      why: `Sour and slow together do not point at grind: going finer would make it slower still. ${canSetTemp()
        ? 'Look at brew temperature, at whether the puck channelled, and at how long ago it was roasted.'
        : 'Look at whether the puck channelled, and at how long ago it was roasted.'}` };
  }
  if (side === 'bitter' && place.time === 'fast') {
    return { sure: false, move: 'Not grind, this time.',
      why: 'Bitter and fast together do not point at grind: going coarser would make it faster still. This pattern usually means the water found a channel, so look at distribution and tamp before anything else.' };
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

     This is where a kit-blind tool falls over. Brew temperature is the
     textbook next lever and most home machines do not have one, so the
     answer has to be the lever the person in front of it actually has.
     Ratio is that lever, and it is a real one: more water through the same
     puck takes more with it, less takes less. */
  if (canSetTemp()) {
    return { sure: false, move: 'Grind has done its job.',
      why: `The shot is in the window and still tastes ${side}. Grind moves time; this is the part grind does not reach. Brew temperature is the usual next lever — ${side === 'sour' ? 'up a degree or two' : 'down a degree or two'} — and after that the ratio.` };
  }
  return { sure: false, move: 'Grind has done its job.',
    why: side === 'sour'
      ? 'The shot is in the window and still tastes sour. Grind moves time, and this is the part grind does not reach — and your machine holds one temperature, so the lever is the ratio. Let it run longer on the same dose: more water through the same puck takes more with it. Still sour at 1:2.5 and the bag probably wants a few more days off the roast.'
      : 'The shot is in the window and still tastes bitter. Grind moves time, and this is the part grind does not reach — and your machine holds one temperature, so the lever is the ratio. Stop it shorter and the harsh end of the extraction stays in the puck. If that leaves the cup thin, drop the dose half a gram rather than pushing the ratio further.' };
}

/* Both walls at once, which is one fault rather than two.

   Advised separately the two axes can disagree about the same lever: a
   sour, thin shot got "let it run longer" from the taste scale and "stop
   it shorter" from the body scale, stacked, both about the ratio. Two
   instructions for one shot is not advice, and a dial-in moves one thing
   at a time anyway.

   Taken together they disagree about nothing, and each pair has exactly
   one lever — a better read than either wall alone gives:

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
function wallPair(shot, target) {
  const t = tasteSide(shot.taste);
  const b = bodySide(shot.body);
  if (t === null || b === null || t === 'neither' || b === 'neither') return null;
  const place = placeOf(shot, target);
  const r = ratioOf(shot);
  const at = r === null ? '' : ` at 1:${r.toFixed(1)}`;

  if (t === 'sour' && b === 'watery') {
    if (place.time === 'slow') {
      return { sure: false, move: 'Under-extracted — but not for want of grind.',
        why: 'Sour and thin is the picture of an under-extracted shot and finer is the usual answer, except this one is already past the window: finer would only make it slower. Water that runs long and still takes little with it has found a way round the puck rather than through it. Distribution and tamp first.' };
    }
    return { sure: true, move: 'Grind finer.',
      why: `Sour and thin together are one fault, not two — not enough came out of the puck, so the cup is sharp and weak at the same time. Finer is the single change that moves both${place.time === 'fast' ? ', and it brings the time up into the window on the way' : ''}.` };
  }
  if (t === 'bitter' && b === 'muddy') {
    if (place.time === 'fast') {
      return { sure: false, move: 'Over-extracted — but not for want of grind.',
        why: 'Bitter and heavy is the picture of an over-extracted shot and coarser is the usual answer, except this one is already short of the window: coarser would only make it faster. Water that runs quickly and still takes too much is going through part of the puck and not the rest. Distribution and tamp first.' };
    }
    return { sure: true, move: 'Grind coarser.',
      why: `Bitter and heavy together are one fault, not two — too much came out of the puck, so the cup is harsh and thick with it. Coarser is the single change that moves both${place.time === 'slow' ? ', and it brings the time back into the window on the way' : ''}.` };
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

/* The second wall, advised on its own levers.

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
function clockPair(shot, target) {
  const b = bodySide(shot.body);
  if (tasteSide(shot.taste) !== null || b === null || b === 'neither') return null;
  const place = placeOf(shot, target);
  if (place.time !== 'fast' && place.time !== 'slow') return null;
  const quick = place.time === 'fast';
  const light = b === 'watery';

  if (quick && light) {
    return { sure: true, move: 'Grind finer.',
      why: `It came in short of the window and you called it thin. Those are one fault: the water was through the puck before it had taken much with it, so there is little in the cup and it is probably sharp with it. Finer moves both, and brings the time up on the way.` };
  }
  if (!quick && !light) {
    return { sure: true, move: 'Grind coarser.',
      why: `It ran past the window and you called it heavy. Those are one fault: the water sat in the puck taking more than it should, and what it took is all in the cup. Coarser moves both, and brings the time back on the way.` };
  }
  if (quick && !light) {
    return { sure: true, move: 'Let it run longer.',
      why: `Short of the window and heavy is the ratio rather than the grind: the shot was stopped before the water had finished, and what it did take is packed into a small cup. Leave the grinder where it is and let it run longer.` };
  }
  return { sure: true, move: 'Stop it shorter.',
    why: `Past the window and thin is the ratio rather than the grind: the end of it was adding water and harshness and nothing else. Leave the grinder where it is and stop it shorter.` };
}

function nextMove(shot, target) {
  const pair = wallPair(shot, target);
  if (pair) return [pair];
  /* One wall named, and it is the body one.

     The body note is then the whole answer. Printing "Taste says nothing
     is wrong" above "the cup is thin, stop it shorter" is the app arguing
     with itself about which half of the cup counts, and the first line is
     not even true: something is wrong, it is just not on the axis grind
     works on. */
  // Body named, taste not, and a clock that is saying something: the
  // clock stands in for the taste axis and the pair resolves properly.
  const cp = clockPair(shot, target);
  if (cp) return [cp];
  const b = bodyNote(shot);
  if (b) return [{ sure: false, move: b.move, why: b.why }];
  const t = suggest(shot, target);
  if (t) return [t];
  // No taste on the sheet: the clock still knows which way the grinder goes.
  const clock = clockAdvice(shot, target);
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
const fmt2 = v => (v === null ? '—' : v.toFixed(2));

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
    const out = Math.round(t.dose * t.ratio);
    wrap.className = 'next-card';
    wrap.innerHTML = `
      <span class="next-label">Where to start</span>
      <div class="tip open">
        <span class="tip-move">${fmt1(t.dose)}g in, about ${out}g out, in ${Math.round(t.timeLo)}–${Math.round(t.timeHi)} seconds.</span>
        <span class="tip-why">Set the grinder wherever it is and pull one. If it gushes out in ten seconds, go finer; if it drips past forty, go coarser. Nobody can tell you the number — it is different on every grinder and it moves as the bag ages — but the window tells you which way, and this board will keep the one that works.</span>
      </div>`;
    return;
  }

  const tips = nextMove(newest, c.target);
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

function renderTarget(c) {
  const wrap = $('#target-card');
  wrap.classList.toggle('hidden', !c);
  if (!c) { wrap.innerHTML = ''; return; }
  const t = c.target;
  wrap.innerHTML = `
    <button class="target-btn" id="btn-target">
      <span class="target-label">Aiming at</span>
      <span class="target-value">1:${t.ratio} · ${t.timeLo}–${t.timeHi}s · ${fmt1(t.dose)}g${t.temp && canSetTemp() ? ` · ${t.temp}°` : ''}</span>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;
  wrap.querySelector('#btn-target').addEventListener('click', () => openEdit(c));
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
        <p class="empty-body">Four questions about your machine and grinder, once. The shot sheet is built from the answers: there is no point in a temperature field on a machine with one temperature, and no point in advice that tells you to raise it.</p>
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
    ${shot.intent ? `<div class="log-intent">aim: ${escapeHTML((intentEntry(shot.intent) || {}).label || '')}</div>` : ''}
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
function shotHasContent() {
  if (!editing) return false;
  return ['dose', 'yield', 'time', 'taste', 'body', 'verdict', 'intent', 'notes', 'tds']
    .some(k => editing[k] !== null && editing[k] !== '' && editing[k] !== undefined);
}

function closeShotSheet() {
  if (editingIsNew && shotHasContent()
      && !confirm('Close without saving? What you have put on this sheet goes with it.')) return;
  closeModal('#shot-modal');
}

function buildShotSheet(c) {
  const row = $('#num-row');
  row.innerHTML = '';
  const refresh = () => { renderReadout(c); };

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
  const taste = $('#taste-scale');
  taste.innerHTML = '';
  taste.appendChild(tasteScale({
    value: editing.taste, words: tasteWord, low: 'sour', high: 'bitter',
    labelledBy: 'taste-label', empty: 'not tasted yet',
    onChange: v => { editing.taste = v; renderReadout(c); },
  }));
  const body = $('#body-scale');
  body.innerHTML = '';
  body.appendChild(tasteScale({
    value: editing.body, words: bodyWord, low: 'watery', high: 'muddy',
    labelledBy: 'body-label', empty: 'not said yet',
    onChange: v => { editing.body = v; renderReadout(c); },
  }));

  buildIntent(c);
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
      <label class="field"><span class="field-label">Basket</span>
        <input class="field-input" id="f-basket" type="text" autocomplete="off" placeholder="${escapeHTML(kit().basket || 'e.g. 18g IMS')}"></label>
      ${prefs.tds ? `<label class="field"><span class="field-label">TDS %</span>
        <input class="field-input" id="f-tds" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 9.4"></label>` : ''}
    </div>
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
  const tips = nextMove(editing, c.target);
  /* The "you said finer and the grinder has not moved" check, live.

     It only ran on the saved card, which is to say it arrived after the
     one moment it could be acted on: while the sheet is open you are two
     steps from the grinder, and once it is saved you are reading history.
     The prior shot is the one before this one in the log — the last one
     for a new sheet, the one before it for an edit. */
  const mismatch = intentCheck(editing, prevShotOf(c));

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
        <span class="readout-label">ratio${r !== null ? ` · aiming 1:${c.target.ratio}` : ''}</span>
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
    ${tips.map(t => tipHTML(t, 'tip')).join('')}
    ${mismatch ? `<div class="log-mismatch">${escapeHTML(mismatch)}</div>` : ''}
  `;
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
    /* The baseline offers the levers this machine has.

       Quoting a brew temperature at somebody whose machine holds one is
       the same mistake the shot sheet used to make, one screen earlier:
       it reads as a recommendation and it is a number they cannot act on.
       On a fixed-temperature machine the roast still says something — it
       says what ratio to start at — so the sentence keeps the range as
       context and the button applies only the ratio. */
    const e = roastEntry(c.roast);
    const withTemp = canSetTemp();
    baseWrap.innerHTML = e
      ? `<div class="baseline">
           <span class="baseline-head">A place to start</span>
           <p class="baseline-body">${escapeHTML(e.label)} roasts usually take <strong>${e.tempRange}</strong> and <strong>${e.ratioRange}</strong>. That is the roast alone — the strongest thing a bag tells you about extraction, and the only one this uses. Your grinder, machine, water and palate finish the job.${
             withTemp ? '' : ` Your machine holds one temperature, so the ratio is the part of this you can take.`}</p>
           <button class="btn btn-ghost" type="button" id="btn-apply-baseline">Start at ${withTemp ? `${e.temp}° and ` : ''}1:${e.ratio}</button>
         </div>`
      : '';
    const apply = baseWrap.querySelector('#btn-apply-baseline');
    if (apply) apply.addEventListener('click', () => {
      t.ratio = e.ratio;
      if (withTemp) t.temp = e.temp;
      commit();
      if (!adding) save();
      haptic();
      // Applying a starting point is one field changing, not the end of
      // the conversation. It used to close the whole sheet, which is a
      // bigger act than the button admits to and left people unsure
      // whether the name they had just typed had gone in with it.
      toast(withTemp ? `Aiming at 1:${e.ratio}, ${e.temp}°` : `Aiming at 1:${e.ratio}`);
      buildTargetGrid();
      renderBoard();
    });
  };
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
  const grid = body.querySelector('#target-grid');
  const buildTargetGrid = () => {
    grid.innerHTML = '';
    grid.appendChild(numField({ label: 'Dose', unit: 'g', value: t.dose, min: 5, max: 40, step: 0.5, digits: 1,
      onChange: v => { t.dose = v === null ? 18 : v; } }));
    grid.appendChild(numField({ label: 'Ratio 1:', unit: '', value: t.ratio, min: 1, max: 6, step: 0.1, digits: 1,
      onChange: v => { t.ratio = v === null ? 2 : v; } }));
    grid.appendChild(numField({ label: 'From', unit: 's', value: t.timeLo, min: 5, max: 90, step: 1, digits: 0,
      onChange: v => { t.timeLo = v === null ? 25 : v; } }));
    grid.appendChild(numField({ label: 'To', unit: 's', value: t.timeHi, min: 5, max: 120, step: 1, digits: 0,
      onChange: v => { t.timeHi = v === null ? 30 : v; } }));
    if (canSetTemp()) {
      grid.appendChild(numField({ label: 'Temp', unit: '°', value: t.temp, min: 80, max: 100, step: 1, digits: 0,
        onChange: v => { t.temp = v; } }));
    }
  };
  buildTargetGrid();

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
    if (n && !confirm(`Remove ${coffeeLabel(c)}? Its ${n} shot${n === 1 ? '' : 's'} go with it, and there is no undo.`)) return;
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
   in with a guess, and advice that names a lever you do not have is worse
   than no advice. */
function openKit() {
  const k = Object.assign(defaultKit(), state.kit);
  const body = $('#kit-body');
  body.innerHTML = `
    <p class="sheet-note">Asked once. The shot sheet then offers only what you can actually change, and nothing here suggests a lever your machine does not have. The names are your own record — nothing is read out of them.</p>
    <label class="field"><span class="field-label">Machine</span>
      <input class="field-input" id="k-machine" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Breville Bambino Plus"></label>
    <div id="k-temp"></div>
    <div id="k-press"></div>
    <label class="field"><span class="field-label">Grinder</span>
      <input class="field-input" id="k-grinder" type="text" maxlength="60" autocomplete="off" placeholder="e.g. DF64"></label>
    <div id="k-steps"></div>
    <div class="kit-basket">
      <label class="field"><span class="field-label">Basket</span>
        <input class="field-input" id="k-basket" type="text" maxlength="60" autocomplete="off" placeholder="e.g. IMS Competizione"></label>
      <label class="field field-narrow"><span class="field-label">Its dose</span>
        <input class="field-input" id="k-dose" type="text" inputmode="decimal" autocomplete="off" placeholder="18"></label>
    </div>
  `;
  body.querySelector('#k-machine').value = k.machine;
  body.querySelector('#k-grinder').value = k.grinder;
  body.querySelector('#k-basket').value = k.basket;
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
      'A gauge you can read is not the same as a lever you can move.',
      [['fixed', 'Neither'], ['gauge', 'I can see it'], ['profile', 'I can change it']], k.pressure,
      key => { k.pressure = key; redraw(); }));

    const st = body.querySelector('#k-steps');
    st.innerHTML = '';
    st.appendChild(segRow('The grind dial',
      'Only so the app uses your words for it. It never suggests a setting, only a direction — your numbers mean nothing on anyone else’s grinder.',
      [['stepless', 'A number'], ['stepped', 'Clicks']], k.steps,
      key => { k.steps = key; redraw(); }));
  };
  redraw();

  $('#kit-save').onclick = () => {
    k.machine = body.querySelector('#k-machine').value.trim();
    k.grinder = body.querySelector('#k-grinder').value.trim();
    k.basket = body.querySelector('#k-basket').value.trim();
    const d = Number(body.querySelector('#k-dose').value.replace(',', '.').trim());
    k.basketDose = isFinite(d) && d > 0 && d <= 60 ? d : null;
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
    <p><strong>The window</strong> is yours, per coffee. Nothing here calls a shot fast or slow until you have said what it is being measured against.</p>
    <p><strong>What to try next</strong> is a suggestion and it says which kind it is. Sour and fast, or bitter and slow, and grind is the answer — those two get an instruction. The other two corners do not point at grind at all, and the app says so rather than guessing, because grinding finer on a shot that is already slow makes it worse.</p>
    <p><strong>Sour, bitter, watery, muddy</strong> are two questions, not four, and the app asks them separately because they are answered separately.</p>
    <p><strong>Sour and bitter</strong> are the extraction walls. Sour is water that did not take enough out of the puck; bitter is water that took too much. Grind is the lever, because grind moves time — finer is slower is more extracted.</p>
    <p><strong>Watery and muddy</strong> are the concentration walls, and grind is not the lever. A shot can be extracted perfectly and still be thin, because thin is about how much coffee ended up in the cup: that is ratio and dose. Watery means stop the shot earlier or put more in the basket; muddy means let it run further, or put less in.</p>
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
