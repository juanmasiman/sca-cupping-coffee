/* ---------- the anchored scale, shared ----------

   The house notation on both brew sheets: taste is a position between two
   named ends, not one of seven buttons. Anchors at both ends and the
   middle, the value under your thumb, and a track that carries the detents.

   Filter and espresso each had a copy of this, line for line apart from
   the middle word and a snap, and a fix to one (the scroll that recorded a
   taste) had to be made twice to land once. One copy now.

   Untouched is not a value. The knob sits at centre until somebody moves
   it, drawn hollow, and the block reads "not tasted" rather than
   "neither" — a default and a judgement are the same pixel otherwise.

   opts: value (number|null), onChange(v), words(v), low, high, mid?,
         labelledBy, empty, min = -3, max = 3 */
function anchoredScale(opts) {
  const { value, onChange, words, low, high, labelledBy, empty } = opts;
  const MIN = opts.min !== undefined ? opts.min : -3;
  const MAX = opts.max !== undefined ? opts.max : 3;
  const MID = Math.round((MIN + MAX) / 2);
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* not everywhere */ } };

  const wrap = document.createElement('div');
  wrap.className = 'scale';
  wrap.innerHTML = `
    <div class="scale-track" tabindex="0" role="slider"
         aria-valuemin="${MIN}" aria-valuemax="${MAX}"
         aria-labelledby="${labelledBy}">
      <div class="scale-rail"></div>
      <div class="scale-mid"></div>
      <div class="scale-knob"></div>
    </div>
    <div class="scale-anchors">
      <span>${low}</span><span class="scale-anchor-mid">${opts.mid || 'neither'}</span><span>${high}</span>
    </div>
    <div class="scale-readout"></div>
  `;
  const track = wrap.querySelector('.scale-track');
  const knob = wrap.querySelector('.scale-knob');
  const readout = wrap.querySelector('.scale-readout');
  let v = typeof value === 'number' ? value : null;

  const render = () => {
    const shown = v === null ? MID : v;
    const pct = ((shown - MIN) / (MAX - MIN)) * 100;
    knob.style.left = `${pct}%`;
    knob.classList.toggle('untouched', v === null);
    track.setAttribute('aria-valuenow', shown);
    track.setAttribute('aria-valuetext', tr(v === null ? empty : words(v)));
    readout.textContent = v === null ? empty : words(v);
    readout.classList.toggle('untouched', v === null);
  };

  const setFromX = clientX => {
    const r = track.getBoundingClientRect();
    let frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    /* A detent at the middle. The middle is the answer a dial-in ends on,
       and getting back to it took a tester three attempts, landing one
       step off each time. A few per cent either side snaps to it. */
    if (Math.abs(frac - 0.5) < 0.045) frac = 0.5;
    const next = Math.round(MIN + frac * (MAX - MIN));
    if (next !== v) { v = next; buzz(); render(); onChange(v); }
    else if (v === null) { v = next; render(); onChange(v); }
  };

  /* A TOUCH DECIDES WHAT IT IS BEFORE IT WRITES ANYTHING.

     The track sits in the sheet's scroll path, and it used to take every
     touch: `touch-action: none` and a value written on pointerdown, so a
     thumb scrolling down the sheet that happened to start on a track
     recorded a taste nobody gave. The page keeps vertical gestures
     (`pan-y`), and a touch writes only once it has shown itself to be
     horizontal, or when it lifts as a tap. A mouse has no scroll to steal
     from and still sets on press. A second finger is ignored, not
     followed. */
  const SLOP = 8;
  let dragging = false;
  let start = null;
  track.addEventListener('pointerdown', e => {
    if (dragging || start) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      dragging = true;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      track.setPointerCapture(e.pointerId);
      setFromX(e.clientX);
      return;
    }
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  track.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    if (dragging) { setFromX(e.clientX); return; }
    const dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
    if (dx > SLOP && dx > dy) {
      dragging = true;
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
      setFromX(e.clientX);
    } else if (dy > SLOP) {
      start = null; // a scroll; the browser has it
    }
  });
  const end = e => {
    if (!start || e.pointerId !== start.id) return;
    if (!dragging && e.type === 'pointerup') setFromX(start.x); // a tap
    dragging = false;
    start = null;
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  track.addEventListener('lostpointercapture', end);

  track.addEventListener('keydown', e => {
    let next = null;
    // the first arrow on an untouched scale lands where its hollow knob
    // already sits, rather than one step past it
    const first = v === null && /^Arrow/.test(e.key);
    const from = v === null ? MID : v;
    if (first) next = MID;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = from - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = from + 1;
    else if (e.key === 'Home') next = MIN;
    else if (e.key === 'End') next = MAX;
    else return;
    e.preventDefault();
    v = Math.max(MIN, Math.min(MAX, next));
    buzz();
    render();
    onChange(v);
  });

  render();
  return wrap;
}

/* ---------- small shared controls ---------- */

/* "Type to find" above a long <select> (46 grinders, 27 machines): a
   native select has no search on a phone. It rebuilds the select's options
   to the ones that match — hiding <option>s is ignored by iOS — keeps the
   current choice and any "Other…" entry, and picks the only match when one
   is left so the sheet's own change handler fills in the rest. */
function lentoSelectFinder(select, placeholder, opts) {
  const autopick = !(opts && opts.autopick === false);
  if (!select || select.dataset.finder) return;
  select.dataset.finder = '1';
  const all = [...select.options].map(o => ({ value: o.value, text: o.text, disabled: o.disabled }));
  const box = document.createElement('input');
  box.type = 'search';
  box.className = 'field-input select-finder';
  box.placeholder = placeholder || 'Type to find yours';
  /* The box went in before the select inside the same <label>, and a
     label names its first control: the select was left with no name at
     all (critique). Both are named from the label's text now. */
  const lab = select.closest('label');
  const labText = (lab && lab.querySelector('.field-label') ? lab.querySelector('.field-label').textContent : '').trim();
  if (labText && !select.getAttribute('aria-label')) select.setAttribute('aria-label', labText);
  box.setAttribute('aria-label', placeholder || (labText ? tr('Find {what}', { what: labText.toLowerCase() }) : 'Find in the list'));
  box.autocomplete = 'off';
  select.parentNode.insertBefore(box, select);
  box.addEventListener('input', () => {
    const q = box.value.trim().toLowerCase();
    const cur = select.value;
    const keep = o => !q || !o.value || o.value === '__other' || o.value === cur || o.text.toLowerCase().includes(q);
    const shown = all.filter(keep);
    select.innerHTML = shown.map(o => `<option value="${String(o.value).replace(/"/g, '&quot;')}"${o.disabled ? ' disabled' : ''}>${o.text.replace(/</g, '&lt;')}</option>`).join('');
    select.value = cur;
    const real = shown.filter(o => o.value && o.value !== '__other' && !o.disabled);
    if (autopick && q && real.length === 1 && real[0].value !== cur) {
      select.value = real[0].value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

/* Arrow keys in a row of radio chips. The chips are buttons with
   role="radio" inside role="radiogroup", and a screen-reader or keyboard
   user expects the arrows to move between them (a critique found focus
   stuck on "Ran even"). One handler for every such group on the page. */
document.addEventListener('keydown', e => {
  const r = e.target && e.target.closest && e.target.closest('[role="radio"]');
  if (!r) return;
  const group = r.closest('[role="radiogroup"]');
  if (!group) return;
  /* Space and Enter choose by clicking, and the click rebuilds the group:
     focus fell to the page and the next Tab started again from the top
     (critique). Put it back on the same chip once the group is redrawn. */
  if (e.key === ' ' || e.key === 'Enter') {
    const at = [...group.querySelectorAll('[role="radio"]')].indexOf(r);
    const gid = group.id;
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      const g = group.isConnected ? group : (gid && document.getElementById(gid));
      if (!g) return;
      const again = [...g.querySelectorAll('[role="radio"]')][at];
      if (again) again.focus();
    }, 0);
    return;
  }
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(e.key in keys) && e.key !== 'Home' && e.key !== 'End') return;
  const radios = [...group.querySelectorAll('[role="radio"]')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!radios.length) return;
  let i = radios.indexOf(r);
  if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = radios.length - 1;
  else i = (i + keys[e.key] + radios.length) % radios.length;
  e.preventDefault();
  const next = radios[i];
  next.focus();
  if (next.getAttribute('aria-checked') !== 'true') next.click();
  // the group may have been rebuilt by the click: put focus back on the same chip
  setTimeout(() => {
    if (document.activeElement && document.activeElement !== document.body) return;
    const again = [...group.querySelectorAll('[role="radio"]')][i];
    if (again) again.focus();
  }, 0);
});
