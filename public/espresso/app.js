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
  (s.coffees || []).forEach(c => {
    if (!c.target) c.target = defaultTarget();
    if (!Array.isArray(c.shots)) c.shots = [];
    c.shots.forEach(sh => { if (typeof sh.taste === 'undefined') sh.taste = null; });
  });
  return s;
}

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
  return { dose: 18, ratio: 2, timeLo: 25, timeHi: 30 };
}

function newCoffee(name) {
  return {
    id: uid(),
    name: (name || '').trim(),
    roaster: '',
    roastDate: '',
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
      why: 'Sour and slow together do not point at grind: going finer would make it slower still. Look at brew temperature, at whether the puck channelled, and at how long ago it was roasted.' };
  }
  if (side === 'bitter' && place.time === 'fast') {
    return { sure: false, move: 'Not grind, this time.',
      why: 'Bitter and fast together do not point at grind: going coarser would make it faster still. This pattern usually means the water found a channel, so look at distribution and tamp before anything else.' };
  }
  if (side === 'neither' && place.time === 'in') {
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
  // in the window, but tasting of one of the walls
  return { sure: false, move: 'Grind has done its job.',
    why: `The shot is in the window and still tastes ${side}. Grind moves time; this is the part grind does not reach. Brew temperature is the usual next lever — ${side === 'sour' ? 'up a degree or two' : 'down a degree or two'} — and after that the ratio.` };
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
  input.addEventListener('input', () => {
    const raw = input.value.replace(',', '.').trim();
    if (raw === '') { value = null; if (opts.onChange) opts.onChange(null); wrap.classList.add('empty'); return; }
    const v = Number(raw);
    if (!isFinite(v)) return;
    value = Math.max(opts.min, Math.min(opts.max, v));
    wrap.classList.remove('empty');
    if (opts.onChange) opts.onChange(value);
  });
  input.addEventListener('blur', () => commit(value));

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
function tasteScale(value, onChange) {
  const wrap = el('div', 'scale');
  wrap.innerHTML = `
    <div class="scale-track" tabindex="0" role="slider"
         aria-valuemin="${TASTE_MIN}" aria-valuemax="${TASTE_MAX}"
         aria-labelledby="taste-label">
      <div class="scale-rail"></div>
      <div class="scale-mid"></div>
      <div class="scale-knob"></div>
    </div>
    <div class="scale-anchors">
      <span>sour</span><span class="scale-anchor-mid">neither</span><span>bitter</span>
    </div>
    <div class="scale-readout" id="taste-readout"></div>
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
    track.setAttribute('aria-valuetext', v === null ? 'not tasted yet' : tasteWord(v));
    readout.textContent = v === null ? 'not tasted yet' : tasteWord(v);
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
  renderTarget(c);
  renderShots(c);
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
  `;
}

function renderTarget(c) {
  const wrap = $('#target-card');
  wrap.classList.toggle('hidden', !c);
  if (!c) { wrap.innerHTML = ''; return; }
  const t = c.target;
  wrap.innerHTML = `
    <button class="target-btn" id="btn-target">
      <span class="target-label">Aiming at</span>
      <span class="target-value">1:${t.ratio} · ${t.timeLo}–${t.timeHi}s · ${fmt1(t.dose)}g</span>
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
    // Nothing on the shelf and nothing pulled yet are different problems
    // with different next steps, and the card used to give one answer.
    empty.innerHTML = c
      ? `<div class="empty-title">No shots yet</div>
         <p class="empty-body">Pull one and put three numbers in: what went in, what came out, how long it took. Everything else on this screen is built from those.</p>`
      : `<div class="empty-title">Nothing on the shelf</div>
         <p class="empty-body">Add the bag you are dialling in and this becomes its board — every shot, what changed between them, and the recipe you settle on.</p>`;
    return;
  }

  const rows = shotsNewestFirst(c);
  rows.forEach((shot, i) => {
    // the shot before this one in time, which is what "changed" means
    const prev = rows[i + 1] || null;
    // Only the newest carries the suggestion. It is advice about what to
    // pull next, and there is only one next shot — repeating it down a
    // column of history would be four answers to a question with one.
    list.appendChild(shotCard(shot, prev, c, rows.length - i, i === 0));
  });
}

function shotCard(shot, prev, c, n, newest) {
  const card = el('div', 'shot-card');
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
    <div class="shot-top">
      <span class="shot-n">${n}</span>
      <span class="shot-headline">
        <span class="shot-ratio">${fmtRatio(r)}</span>
        <span class="shot-time ${timeClass}">${shot.time === null ? '—' : Math.round(shot.time) + 's'}</span>
      </span>
      <span class="shot-when">${fmtDate(shot.at)}</span>
    </div>
    <div class="shot-numbers">
      ${fmt1(num(shot.dose))}<small>g</small> <span aria-hidden="true">→</span> ${fmt1(num(shot.yield))}<small>g</small>
      ${flow !== null ? ` · ${fmt2(flow)}<small>g/s</small>` : ''}
      ${ey !== null ? ` · ${fmt1(ey)}<small>% EY</small>` : ''}
    </div>
    ${missing.length ? `<div class="shot-missing">${escapeHTML(missingLine(missing))}</div>` : ''}
    ${timeNote ? `<div class="shot-place ${timeClass}">${timeNote}</div>` : ''}
    ${diffs.length ? `<div class="shot-diff">${escapeHTML(diffs.join(' · '))}</div>` : ''}
    ${shot.taste !== null ? `<div class="shot-taste">${tasteMarks(shot.taste)}<span>${escapeHTML(tasteWord(shot.taste))}</span></div>` : ''}
    ${shot.notes ? `<div class="shot-notes">${escapeHTML(shot.notes)}</div>` : ''}
    ${shot.verdict === 'keeper' ? '<div class="shot-keeper-flag">the keeper</div>' : ''}
    ${newestTip(shot, c, newest)}
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

/* The next move, on the shot you just pulled.

   It lived only inside the sheet, which meant it was on screen while you
   were typing the numbers and gone by the time you were standing at the
   grinder deciding what to do. The board is where that decision happens. */
function newestTip(shot, c, newest) {
  if (!newest) return '';
  const tip = suggest(shot, c.target);
  if (!tip) {
    // Say what is missing rather than nothing: a shot with no taste on it
    // cannot be advised, and the reason is one tap away from being fixed.
    const why = shot.taste === null ? 'Tap this shot and say how it tasted to get a next move.'
      : num(shot.time) === null ? 'Tap this shot and add its time to get a next move.'
      : null;
    return why ? `<div class="shot-tip open"><span class="tip-why">${why}</span></div>` : '';
  }
  return `<div class="shot-tip ${tip.sure ? 'sure' : 'open'}">
      <span class="tip-move">${escapeHTML(tip.move)}</span>
      <span class="tip-why">${escapeHTML(tip.why)}</span>
    </div>`;
}

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
    verdict: null,
    grind: last ? last.grind : '',
    temp: last ? last.temp : '',
    basket: last ? last.basket : '',
    notes: '',
    tds: null,
  };

  $('#shot-title').textContent = editingIsNew ? 'This shot' : `Shot ${c.shots.indexOf(shot) + 1}`;
  buildShotSheet(c);
  openModal('#shot-modal');
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

  const taste = $('#taste-scale');
  taste.innerHTML = '';
  taste.appendChild(tasteScale(editing.taste, v => { editing.taste = v; renderReadout(c); }));

  buildVerdict(c);
  buildMore(c);
  renderReadout(c);
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

function buildMore(c) {
  const body = $('#more-body');
  body.innerHTML = `
    <div class="more-grid">
      <label class="field"><span class="field-label">Grind setting</span>
        <input class="field-input" id="f-grind" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 4.2"></label>
      <label class="field"><span class="field-label">Brew temp</span>
        <input class="field-input" id="f-temp" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 93"></label>
      <label class="field"><span class="field-label">Basket</span>
        <input class="field-input" id="f-basket" type="text" autocomplete="off" placeholder="e.g. 18g VST"></label>
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
  bind('#f-grind', 'grind', false);
  bind('#f-temp', 'temp', false);
  bind('#f-basket', 'basket', false);
  bind('#f-tds', 'tds', true);
  bind('#f-notes', 'notes', false);

  // Open it and it stays open — somebody moving the grind every shot should
  // not have to reopen the drawer the grind lives in.
  const more = $('#more');
  more.open = Boolean(editing.grind || editing.temp || editing.basket || editing.notes || editing.tds);
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
  const tip = suggest(editing, c.target);

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
    ${tip ? `<div class="tip ${tip.sure ? 'sure' : 'open'}">
      <span class="tip-move">${escapeHTML(tip.move)}</span>
      <span class="tip-why">${escapeHTML(tip.why)}</span>
    </div>` : ''}
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
  if (editingIsNew) c.shots.push(editing);
  save();
  closeModal('#shot-modal');
  renderBoard();
  if (!editingIsNew) toast('Shot updated');
}

/* ============================================================
   COFFEES
   ============================================================ */

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

function openEdit(c) {
  const body = $('#edit-body');
  const t = c.target;
  $('#edit-title').textContent = c.name.trim() ? coffeeLabel(c) : 'The coffee';
  body.innerHTML = `
    <label class="field"><span class="field-label">Name</span>
      <input class="field-input" id="e-name" type="text" maxlength="48" placeholder="e.g. Ethiopia Guji"></label>
    <label class="field"><span class="field-label">Roaster</span>
      <input class="field-input" id="e-roaster" type="text" maxlength="48" placeholder="optional"></label>
    <label class="field"><span class="field-label">Roast date</span>
      <input class="field-input" id="e-roast" type="date"></label>

    <span class="field-label section">What you are aiming at</span>
    <p class="sheet-note">A shot is only fast or slow against a window, so this app will not call one fast until you have said what the window is. 1:2 in 25–30 seconds is where most recipes start, not where they have to stay.</p>
    <div class="target-grid" id="target-grid"></div>
  `;
  body.querySelector('#e-name').value = c.name;
  body.querySelector('#e-roaster').value = c.roaster || '';
  body.querySelector('#e-roast').value = c.roastDate || '';

  const grid = body.querySelector('#target-grid');
  grid.appendChild(numField({ label: 'Dose', unit: 'g', value: t.dose, min: 5, max: 40, step: 0.5, digits: 1,
    onChange: v => { t.dose = v === null ? 18 : v; } }));
  grid.appendChild(numField({ label: 'Ratio 1:', unit: '', value: t.ratio, min: 1, max: 6, step: 0.1, digits: 1,
    onChange: v => { t.ratio = v === null ? 2 : v; } }));
  grid.appendChild(numField({ label: 'From', unit: 's', value: t.timeLo, min: 5, max: 90, step: 1, digits: 0,
    onChange: v => { t.timeLo = v === null ? 25 : v; } }));
  grid.appendChild(numField({ label: 'To', unit: 's', value: t.timeHi, min: 5, max: 120, step: 1, digits: 0,
    onChange: v => { t.timeHi = v === null ? 30 : v; } }));

  $('#edit-save').onclick = () => {
    c.name = body.querySelector('#e-name').value;
    c.roaster = body.querySelector('#e-roaster').value;
    c.roastDate = body.querySelector('#e-roast').value;
    if (c.target.timeHi < c.target.timeLo) {
      const lo = c.target.timeHi; c.target.timeHi = c.target.timeLo; c.target.timeLo = lo;
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

function addCoffee() {
  const c = newCoffee('');
  state.coffees.push(c);
  state.activeId = c.id;
  save();
  closeModal('#coffee-modal');
  renderBoard();
  openEdit(c);
}

/* ============================================================
   SETTINGS, HELP, MODALS
   ============================================================ */

function openSettings() {
  const body = $('#settings-body');
  body.innerHTML = `
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

  body.querySelector('#btn-help').addEventListener('click', () => { closeModal('#settings-modal'); openHelp(); });
  openModal('#settings-modal');
}

function openHelp() {
  $('#help-body').innerHTML = `
    <p><strong>Ratio</strong> is what came out divided by what went in. 18g in and 36g out is 1:2. It is a description of the shot, not a measure of how much was extracted from the coffee.</p>
    <p><strong>Flow</strong> is grams a second. It is the number that moves first when the grind moves, and a fast shot with a coarse-looking puck usually shows up here before it shows up in the taste.</p>
    <p><strong>Extraction yield</strong> is the share of the dry coffee that ended up dissolved in the cup — beverage mass × TDS ÷ dose. It needs a refractometer. This app will not print one without a reading: ratio is not extraction, time is not extraction, and a shot that tastes right is not a measurement. Turn the refractometer setting on if you have one.</p>
    <p><strong>The window</strong> is yours, per coffee. Nothing here calls a shot fast or slow until you have said what it is being measured against.</p>
    <p><strong>What to try next</strong> is a suggestion and it says which kind it is. Sour and fast, or bitter and slow, and grind is the answer — those two get an instruction. The other two corners do not point at grind at all, and the app says so rather than guessing, because grinding finer on a shot that is already slow makes it worse.</p>
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
  $('#shot-close').addEventListener('click', () => closeModal('#shot-modal'));
  $('#shot-save').addEventListener('click', saveShot);
  $('#coffee-close').addEventListener('click', () => closeModal('#coffee-modal'));
  $('#btn-add-coffee').addEventListener('click', addCoffee);
  $('#edit-close').addEventListener('click', () => closeModal('#edit-modal'));
  $('#settings-close').addEventListener('click', () => closeModal('#settings-modal'));
  $('#settings-done').addEventListener('click', () => closeModal('#settings-modal'));
  $('#help-close').addEventListener('click', () => closeModal('#help-modal'));
  $('#help-done').addEventListener('click', () => closeModal('#help-modal'));

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
