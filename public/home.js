/* ============================================================
   lento — the front door

   One account across the four surfaces, and this is the one that had no
   way to reach it. Somebody who signs in inside the cupping sheet is
   signed in everywhere, but the page they actually land on could not say
   so, could not sign them in, and could not sign them out.

   WHAT THIS PAGE IS, NOW THAT THREE THINGS ARE SHARED

   It is not a tool: it logs nothing, measures nothing and gives no
   advice. What it holds is everything that stopped belonging to a tool.

   There are three such records, and until now the front door loaded one
   of them. The account has been here since there was one. The grinders
   (/shared/kit.js) and the coffees (/shared/coffees.js) were extracted
   later, so a bag corrected in the dial-in is corrected in the brew log
   — but there was no screen anywhere that showed you your coffees as
   YOUR coffees. Only the dial-in's view of the shelf, and the brew log's
   view of the shelf, and nothing that was simply the shelf.

   So: who you are, what you own, what is on the shelf, and the four
   instruments in the middle of it.

   WHERE THE LINE IS

   This page writes the shared records and only those. A bag's name,
   roaster, origin and marks are shared, so they are edited here. A
   target dose, a ratio, a grind setting and a log are the instrument's,
   so they are not — the row for them is a link into the instrument that
   owns it, never a second opinion about it. The same line runs through
   the gear: the grinders are shared and editable here, the espresso
   machine and the brewers live in their tools and are shown as facts.

   Cross-app writes are refused for the reason /shared/coffees.js gives:
   an app holds its state in memory and writing into its store from here
   races whatever it is holding. Marking a bag is enough — the tool
   reconciles on its next load, which is work it does anyway.

   The counts in the account row stay raw reads of the three tools'
   stores, because a cupping, a shot and a brew are logs, and no shared
   module owns one. They are read defensively and anything unreadable is
   left out of the sentence, rather than this page having an opinion
   about a shape it does not own.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- the minimum a sheet needs ----------

     The three apps each have a modal layer with their own rules — the
     dial-in stacks sheets and marks the board inert, the cupping sheet
     runs full-screen panels. This page has the small version: show,
     trap, restore focus. The look comes from components.css, same as
     everywhere.

     It stacks now, because the lists moved into sheets: your coffees is
     a sheet and a bag on it is a second one, your gear is a sheet and a
     brewer on it is a second one. A single `lastFocus` held the page's
     button through both, so closing the bag sheet put you back on the
     front door rather than on the list you opened it from. A stack is
     what "back" means when there is more than one way in. */

  var focusStack = [];

  function openModal(sel) {
    var m = $(sel);
    focusStack.push(document.activeElement);
    m.classList.remove('hidden');
    document.documentElement.classList.add('sheet-open');
    if (!m.dataset.trapped) {
      m.dataset.trapped = '1';
      m.addEventListener('keydown', function (e) { trap(m, e); });
      m.addEventListener('click', function (e) { if (e.target === m) closeModal(sel); });
    }
    var first = m.querySelector('input, button, [tabindex]');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 30);
  }

  function closeModal(sel) {
    $(sel).classList.add('hidden');
    if (!document.querySelector('.modal:not(.hidden)')) {
      document.documentElement.classList.remove('sheet-open');
    }
    var back = focusStack.pop();
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  function trap(m, e) {
    if (e.key === 'Escape') { closeModal('#' + m.id); return; }
    if (e.key !== 'Tab') return;
    var items = Array.prototype.filter.call(
      m.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* The same component the apps use, shown the same way: `.toast` is
     always in the page and `hidden` is what moves.

     It carries an undo now, because this page destroys things: a bag can
     come off the shelf here and a grinder can be crossed out. The offer
     lives inside the toast so it cannot outlive what it undoes, and it is
     given eight seconds rather than four — long enough to notice a
     mistake, short enough not to sit over the page. */
  var toastTimer = null;
  var undoSlot = null;
  function toast(msg, undo) {
    var t = $('#toast');
    t.innerHTML = '';
    t.appendChild(document.createTextNode(msg));
    undoSlot = undo || null;
    if (undo) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-undo';
      b.textContent = 'Undo';
      b.addEventListener('click', function () {
        var act = undoSlot;
        undoSlot = null;
        t.classList.add('hidden');
        if (!act) return;
        act.restore();
        toast(act.after || 'Put back');
      });
      t.appendChild(b);
    }
    t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.add('hidden');
      undoSlot = null;
    }, undo ? 8000 : 4000);
  }

  function esc(v) {
    return String(v === null || typeof v === 'undefined' ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid() {
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- what is on this device ---------- */

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function countIn(key, field) {
    var s = readJSON(key);
    if (!s || !Array.isArray(s.coffees)) return null;
    return s.coffees.reduce(function (n, c) {
      return n + (Array.isArray(c[field]) ? c[field].length : 0);
    }, 0);
  }

  function cuppings() {
    var a = readJSON('sca-cupping-history-v1');
    return Array.isArray(a) ? a.length : null;
  }

  // A non-breaking space, so "1 steep" never wraps into "1" and "steep"
  // on two lines. Four counts fit one line on most phones and wrap on
  // some, and where it wraps it should break between the counts — which
  // is what the separator is for — and never inside one.
  function say(n, one, many) {
    return n + '\u00a0' + (n === 1 ? one : many);
  }

  /* WHAT A FILTER BREW IS CALLED, WHICH DEPENDS ON THE BREWER.

     "1 brew" was the launcher's word and "filter" is the section's, and
     neither is what anybody says. What they say is a pour over — except
     when it is a press or an AeroPress, and then it is a steep, and
     calling that a pour over is simply wrong about the thing in their
     hand.

     The brewer is recorded on every brew, so this does not have to
     choose one word for both. Your own answer about your own brewer
     wins over the shipped table, same as everywhere else. */
  function filterCounts() {
    var out = { pour: 0, steep: 0 };
    var v = readJSON('lento-filter-v1');
    if (!v || !Array.isArray(v.coffees)) return out;
    var mine = {};
    var k = v.kit && typeof v.kit === 'object' ? v.kit : null;
    if (k && Array.isArray(k.brewers)) {
      k.brewers.forEach(function (b) { if (b && b.name) mine[b.name] = b.flow; });
    }
    var FLOWS = window.LentoBrewers ? LentoBrewers.FLOWS : [];
    v.coffees.forEach(function (c) {
      (Array.isArray(c.brews) ? c.brews : []).forEach(function (br) {
        var name = br && br.brewer;
        var flow = name && FLOWS.indexOf(mine[name]) >= 0 ? mine[name] : null;
        if (!flow && name && window.LentoBrewers) flow = LentoBrewers.flowOf(name);
        // No brewer named, or one nothing knows: the app's own default,
        // which is also the commonest answer by a distance.
        if (flow === 'immersion') out.steep++;
        else out.pour++;
      });
    });
    return out;
  }

  // Only what is actually there. A front door that says "0 espressos" to
  // somebody who has never opened the dial-in is telling them about a
  // thing they have not used.
  function counts() {
    var bits = [];
    var c = cuppings();
    var e = countIn('lento-espresso-v1', 'shots');
    var f = filterCounts();
    if (c) bits.push(say(c, 'cupping', 'cuppings'));
    if (e) bits.push(say(e, 'espresso', 'espressos'));
    if (f.pour) bits.push(say(f.pour, 'pourover', 'pourovers'));
    if (f.steep) bits.push(say(f.steep, 'steep', 'steeps'));
    return bits;
  }

  // The sentence in the sheet, where there is room for one.
  function deviceLine() {
    var bits = counts();
    if (!bits.length) return 'Your history follows you to any device you sign in on.';
    return bits.join(' · ') + ' on this device.';
  }

  /* ---------- the account row ---------- */

  // The sub-line on the row, where there is not. Signed out it says what
  // signing in is for; signed in the address is already on the line above,
  // so this says what that account is currently holding on this device.
  function rowNote(u) {
    if (!u) return 'Your log on every device';
    var bits = counts();
    return bits.length ? bits.join(' · ') : 'Nothing logged on this device yet';
  }

  function renderAccount() {
    var btn = $('#btn-account');
    if (!window.LentoAccount || !LentoAccount.enabled()) {
      btn.classList.add('hidden');
      return;
    }
    btn.classList.remove('hidden');
    var u = LentoAccount.user();
    // The row reads as what it does, so it needs no aria-label over the
    // top of its own visible text — and a label that disagreed with that
    // text would be the accessible name for a control saying something
    // else, which is the failure the label was meant to prevent.
    /* The name first. It is what somebody calls themselves, and an email
       address on the front door of your own account is the machine's
       word for you, not yours. Signing in by code gives us no name, so
       the address is still the fallback — and it is on the sheet behind
       this row either way, where "which account is this" is the actual
       question. */
    $('#account-name').textContent = u ? (u.name || u.email || 'Your account') : 'Sign in';
    $('#account-note').textContent = rowNote(u);
  }

  /* ---------- the instruments, as data ----------

     The glyphs are the ones drawn on the cards above, not copies of them:
     the same tamper and the same dripper, at 16px, standing for "this is
     what I brew it with" on every row below. A mark that is the
     instrument's own picture needs no word beside it, and on a list of
     twenty bags two words a row is forty words nobody reads. */

  var TAMPER = '<path d="M12 3v6"/><path d="M9.5 3h5"/>'
    + '<rect x="5" y="9" width="14" height="3.4" rx="1.2"/>'
    + '<path d="M6.5 16.5h11"/><path d="M8 20h8"/>';
  var DRIPPER = '<path d="M4 5h16l-6 8h-4z"/><path d="M12 13v1.4"/>'
    + '<path d="M12 22a2.1 2.1 0 0 1-2.1-2.1c0-1.25 2.1-3.15 2.1-3.15s2.1 1.9 2.1 3.15A2.1 2.1 0 0 1 12 22z"/>';

  function glyph(paths, size, weight) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none"'
      + ' stroke="currentColor" stroke-width="' + (weight || 2) + '"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  var TOOLS = [
    {
      key: 'espresso',
      title: 'Espresso dial-in',
      there: 'the dial-in',
      href: '/espresso/',
      store: 'lento-espresso-v1',
      log: 'shots',
      paths: TAMPER,
    },
    {
      key: 'filter',
      title: 'Filter brew log',
      there: 'the brew log',
      href: '/filter/',
      store: 'lento-filter-v1',
      log: 'brews',
      paths: DRIPPER,
    },
  ];

  /* The roast levels, by the key both apps store. They are five words and
     they are not this page's to invent: the same key has to mean the same
     roast in the dial-in's temperature table and the brew log's, so if
     either list moves this one moves with it. */
  var ROASTS = [
    { key: 'light', label: 'Light' },
    { key: 'mlight', label: 'Medium-light' },
    { key: 'medium', label: 'Medium' },
    { key: 'mdark', label: 'Medium-dark' },
    { key: 'dark', label: 'Dark' },
  ];

  // An app's kit, read the way everything else from an app's store is
  // read here: defensively, and absent rather than guessed at.
  function toolKit(store) {
    var v = readJSON(store);
    return v && v.kit && typeof v.kit === 'object' ? v.kit : null;
  }

  /* ---------- what is on the shelf ---------- */

  function nameOf(c) { return (c.name || '').trim() || 'Unnamed'; }

  function bagSub(c) {
    return [c.roaster, c.origin, c.process, c.decaf ? 'decaf' : '']
      .map(function (x) { return (x || '').trim(); })
      .filter(Boolean)
      .join(' · ');
  }

  function marksHTML(use) {
    var out = '';
    TOOLS.forEach(function (t) { if (use && use[t.key]) out += glyph(t.paths, 16); });
    return out ? '<span class="stock-marks">' + out + '</span>' : '';
  }

  // The same fact in words, for the row's accessible name. The glyphs are
  // aria-hidden: a picture of a tamper is not a label.
  function marksWords(use) {
    var on = TOOLS.filter(function (t) { return use && use[t.key]; })
      .map(function (t) { return t.there; });
    if (!on.length) return 'not marked for either tool';
    return 'for ' + on.join(' and ');
  }

  var CHEVRON = '<path d="M9 6l6 6-6 6"/>';
  var PLUS = '<path d="M12 5v14M5 12h14"/>';

  function stockRow(opts) {
    var row = document.createElement(opts.href ? 'a' : 'button');
    row.className = 'stock-row';
    if (opts.href) row.href = opts.href;
    else row.type = 'button';
    row.innerHTML = '<span class="stock-text">'
      + '<span class="stock-name">' + esc(opts.name) + '</span>'
      + (opts.sub ? '<span class="stock-sub">' + esc(opts.sub) + '</span>' : '')
      + '</span>'
      + marksHTML(opts.use)
      + (opts.href ? '<span class="stock-go">' + glyph(CHEVRON, 18, 2.5) + '</span>' : '');
    if (opts.label) row.setAttribute('aria-label', opts.label);
    if (opts.onPick) row.addEventListener('click', opts.onPick);
    return row;
  }

  function addRow(text, onPick) {
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'stock-row stock-add';
    row.innerHTML = '<span class="stock-plus">' + glyph(PLUS, 18) + '</span>'
      + '<span class="stock-text"><span class="stock-name">' + esc(text) + '</span></span>';
    row.addEventListener('click', onPick);
    return row;
  }

  function byName(a, b) {
    return nameOf(a).toLowerCase().localeCompare(nameOf(b).toLowerCase());
  }

  function renderShelf() {
    var btn = $('#btn-shelf');
    var list = $('#shelf-list');
    var bags = window.LentoCoffees ? LentoCoffees.all().slice().sort(byName) : [];
    if (!bags.length) { btn.classList.add('hidden'); return; }
    btn.classList.remove('hidden');
    $('#shelf-count').textContent = say(bags.length, 'bag', 'bags');
    list.innerHTML = '';
    bags.forEach(function (c) {
      list.appendChild(stockRow({
        name: nameOf(c),
        sub: bagSub(c),
        use: c.use,
        label: nameOf(c) + ' — ' + marksWords(c.use),
        onPick: function () { openBag(c, false); },
      }));
    });
    list.appendChild(addRow('Add a bag', function () { openBag(blankBag(), true); }));
  }

  /* ---------- what you own ----------

     The grinders are shared and are edited here. The machine, the
     brewers and the kettle are the instruments' own records — writing
     into an app's store from this page would race whatever that app is
     holding in memory — so they are not edited here at all. Two of them
     have something worth saying anyway, and say it in a sheet: what the
     brewer does to the water, what the machine can change, and what you
     last made with either.

     The kettle has nothing of the kind. Its row keeps the chevron, which
     is the only distinction the list needs: a row with one takes you
     somewhere, a row without it opens here. */
  function gear() {
    var out = [];

    if (window.LentoKit) {
      LentoKit.known().forEach(function (g) {
        out.push({
          kind: 'grinder',
          name: g.name,
          sub: g.steps === 'stepped' ? 'stepped' : 'stepless',
          use: g.use,
          label: g.name + ' — ' + marksWords(g.use),
          onPick: function () { openGrinder(g); },
        });
      });
    }

    var e = toolKit('lento-espresso-v1');
    if (e && typeof e.machine === 'string' && e.machine.trim()) {
      var machine = { kind: 'machine', name: e.machine.trim(), kit: e };
      machine.sub = machineSub(e);
      machine.use = { espresso: true };
      machine.label = machine.name + ' — what it can change, and your last shot';
      machine.onPick = function () { openGearItem(machine); };
      out.push(machine);
    }

    var f = toolKit('lento-filter-v1');
    if (f) {
      (Array.isArray(f.brewers) ? f.brewers : []).forEach(function (b) {
        if (!b || typeof b.name !== 'string' || !b.name.trim()) return;
        var brewer = { kind: 'brewer', name: b.name.trim(), flow: b.flow };
        brewer.sub = flowWord(b.flow, brewer.name);
        brewer.use = { filter: true };
        brewer.label = brewer.name + ' — what it does to the water, and your last brew';
        brewer.onPick = function () { openGearItem(brewer); };
        out.push(brewer);
      });
      if (typeof f.kettle === 'string' && f.kettle.trim()) {
        out.push({
          kind: 'kettle',
          name: f.kettle.trim(),
          sub: 'kettle',
          use: { filter: true },
          href: '/filter/',
          label: f.kettle.trim() + ' — open the brew log',
        });
      }
    }

    return out;
  }

  function machineSub(k) {
    var bits = [];
    var dose = Number(k.basketDose);
    if (dose) bits.push(dose + ' g basket');
    if (k.portafilter === 'bottomless') bits.push('bottomless');
    return bits.join(' · ');
  }

  // The person's own answer about their own brewer, then the shipped
  // table, then the app's default — the same order every other reader of
  // this fact uses.
  function flowWord(flow, name) {
    var B = window.LentoBrewers;
    if (!B) return 'pour over';
    if (B.FLOWS.indexOf(flow) < 0) flow = B.flowOf(name) || 'percolation';
    return B.flowWord(flow);
  }

  /* A count, not a breakdown.

     "3 grinders · 2 brewers" was the first answer and it is the better
     sentence, and it does not fit: measured, it needs 118px and a
     360px-wide phone gives this button 110. Truncating it to
     "3 grinders · 2 …" says less than the plain total does, on the
     commonest Android width there is. The kinds are one tap away, named
     and in full.

     "Things" because the list holds four of them — grinders, a machine,
     brewers, a kettle — and there is no word that covers those and is
     not a costume. */
  function gearCount(rows) {
    return say(rows.length, 'thing', 'things');
  }

  function renderGear() {
    var btn = $('#btn-gear');
    var list = $('#gear-list');
    var rows = gear();
    if (!rows.length) { btn.classList.add('hidden'); return; }
    btn.classList.remove('hidden');
    $('#gear-count').textContent = gearCount(rows);
    list.innerHTML = '';
    rows.forEach(function (it) { list.appendChild(stockRow(it)); });
  }

  function renderAll() {
    renderAccount();
    renderShelf();
    renderGear();
    /* The pair, and whether there is a pair. Each button hides itself
       when it has nothing behind it, so the row has to answer for both
       of them — otherwise a first visit gets 12px of empty flexbox under
       the account row and no way to tell what it was for. */
    var any = !$('#btn-shelf').classList.contains('hidden')
      || !$('#btn-gear').classList.contains('hidden');
    $('#vault').classList.toggle('hidden', !any);
  }

  /* ---------- the bag sheet ----------

     Nine fields, a switch and two marks, and every one of them is a field
     /shared/coffees.js owns. Nothing about brewing it is here: the target
     dose, the ratio, the grind and the log belong to the instrument, and
     a form that offered both would be offering the dial-in's answer and
     the brew log's in the same box. */

  function blankBag() {
    var c = { id: uid(), decaf: false, use: { espresso: false, filter: false }, updated: 0 };
    LentoCoffees.BAG.forEach(function (f) { c[f] = ''; });
    return c;
  }

  function textField(id, label, value, placeholder) {
    return '<div class="field">'
      + '<label class="field-label" for="' + id + '">' + esc(label) + '</label>'
      + '<input class="field-input" id="' + id + '" type="text" value="' + esc(value) + '"'
      + ' autocapitalize="words"'
      + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '>'
      + '</div>';
  }

  function switchRow(id, title, sub, on, off) {
    return '<label class="switch-row" for="' + id + '">'
      + '<span class="switch-text">'
      + '<span class="switch-title">' + esc(title) + '</span>'
      + (sub ? '<span class="switch-sub">' + esc(sub) + '</span>' : '')
      + '</span>'
      + '<span class="switch"><input type="checkbox" id="' + id + '"'
      + (on ? ' checked' : '') + (off ? ' disabled' : '')
      + '><span class="switch-track"><span class="switch-knob"></span></span></span>'
      + '</label>';
  }

  function openBag(c, adding) {
    var body = $('#bag-body');
    var roast = c.roast || '';
    $('#bag-title').textContent = adding ? 'A new bag' : 'The bag';

    /* Name, then what you brew it with, then everything the bag itself
       says. The marks began at the foot of the sheet, in the order a
       label is read, and on a 390px phone that put the one answer this
       page owns 155px below the fold with a red "Take off the shelf"
       sitting where the form appeared to end. They are the second
       question because they are the reason the bag is on this shelf at
       all, and no instrument records them. */
    body.innerHTML = textField('bag-name', 'Name', c.name, 'Kochere')
      + '<div class="bag-group">'
      + '<span class="field-label">Brewed with</span>'
      + switchRow('bag-espresso', 'Espresso dial-in', '', c.use.espresso, false)
      + switchRow('bag-filter', 'Filter brew log', '', c.use.filter, false)
      + '</div>'
      + '<div class="bag-pair">'
      + textField('bag-roaster', 'Roaster', c.roaster, '')
      + '<div class="field">'
      + '<label class="field-label" for="bag-date">Roast date</label>'
      + '<input class="field-input" id="bag-date" type="date" value="' + esc(c.roastDate) + '">'
      + '</div></div>'
      + '<div class="field">'
      + '<span class="field-label" id="bag-roast-label">Roast</span>'
      + '<div class="chips" id="bag-roast" role="group" aria-labelledby="bag-roast-label"></div>'
      + '</div>'
      + '<div class="bag-pair">'
      + textField('bag-origin', 'Origin', c.origin, 'Ethiopia')
      + textField('bag-variety', 'Variety', c.variety, 'Heirloom')
      + '</div>'
      + '<div class="bag-pair">'
      + textField('bag-process', 'Process', c.process, 'Washed')
      + textField('bag-altitude', 'Altitude', c.altitude, '1,900 m')
      + '</div>'
      + '<div class="notes-block">'
      + '<label class="field-label" for="bag-notes">What the bag says</label>'
      + '<textarea class="notes-input" id="bag-notes" rows="2"'
      + ' placeholder="peach, jasmine, black tea">' + esc(c.bagNotes) + '</textarea>'
      + '</div>'
      + '<div class="bag-group">'
      + switchRow('bag-decaf', 'Decaf', '', c.decaf, false)
      + '</div>';

    var chips = body.querySelector('#bag-roast');
    function paintRoast() {
      chips.innerHTML = '';
      ROASTS.forEach(function (r) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (roast === r.key ? ' on' : '');
        b.textContent = r.label;
        b.setAttribute('aria-pressed', roast === r.key ? 'true' : 'false');
        // Tapping the one that is on clears it. A roast nobody knows is a
        // real answer, and a chip row with no way back is a trap.
        b.addEventListener('click', function () {
          roast = roast === r.key ? '' : r.key;
          paintRoast();
        });
        chips.appendChild(b);
      });
    }
    paintRoast();

    var remove = $('#bag-remove');
    remove.classList.toggle('hidden', Boolean(adding));
    remove.onclick = function () { removeBag(c); };

    $('#bag-save').onclick = function () {
      var next = { id: c.id };
      next.name = body.querySelector('#bag-name').value.trim();
      next.roaster = body.querySelector('#bag-roaster').value.trim();
      next.roastDate = body.querySelector('#bag-date').value;
      next.roast = roast;
      next.origin = body.querySelector('#bag-origin').value.trim();
      next.variety = body.querySelector('#bag-variety').value.trim();
      next.process = body.querySelector('#bag-process').value.trim();
      next.altitude = body.querySelector('#bag-altitude').value.trim();
      next.bagNotes = body.querySelector('#bag-notes').value.trim();
      next.decaf = body.querySelector('#bag-decaf').checked;
      next.use = {
        espresso: body.querySelector('#bag-espresso').checked,
        filter: body.querySelector('#bag-filter').checked,
      };

      if (!next.name) {
        toast('A bag needs a name.');
        body.querySelector('#bag-name').focus();
        return;
      }
      /* Unmarking both is how a bag leaves the shelf in the library, and
         a save is not the place to find that out. Taking it off is a
         button of its own, three inches down, and it says so. */
      if (!next.use.espresso && !next.use.filter) {
        toast('Mark it for at least one tool.');
        return;
      }

      LentoCoffees.put(next);
      closeModal('#bag-modal');
      renderAll();
      syncSoon();
      if (adding) toast('On the shelf');
    };

    openModal('#bag-modal');
  }

  /* What goes with a bag, counted from the instruments' own stores. It is
     not "nothing" — each app keeps its log against the bag's id — but the
     rows stop being offered, which is the same thing from where you are
     standing, so the toast says the number. */
  function loggedWith(id) {
    var bits = [];
    TOOLS.forEach(function (t) {
      var v = readJSON(t.store);
      if (!v || !Array.isArray(v.coffees)) return;
      var n = 0;
      v.coffees.forEach(function (c) {
        if (c && c.id === id && Array.isArray(c[t.log])) n = c[t.log].length;
      });
      if (n) bits.push(n + ' ' + (n === 1 ? t.log.slice(0, -1) : t.log));
    });
    return bits.join(' and ');
  }

  function removeBag(c) {
    var was = LentoCoffees.get(c.id);
    var went = loggedWith(c.id);
    LentoCoffees.remove(c.id);
    closeModal('#bag-modal');
    renderAll();
    syncSoon();
    toast(went ? 'Off the shelf — ' + went + (/^1 \w+$/.test(went) ? ' goes' : ' go') + ' with it' : 'Off the shelf', {
      after: nameOf(c) + ' is back',
      restore: function () {
        if (was) LentoCoffees.put(was);
        renderAll();
        syncSoon();
      },
    });
  }

  /* ---------- the grinder sheet ----------

     Two marks and a way out, which is the whole of what /shared/kit.js
     holds that an instrument does not. Stepped or stepless is absent on
     purpose: each app's own kit is the authority for that app, so editing
     it here would move the prefill and leave the advice where it was. */
  function openGrinder(g) {
    var body = $('#grinder-body');
    $('#grinder-title').textContent = g.name;

    /* An app that is set to this grinder writes the mark back on its next
       boot, so a switch that took it off would flip itself on again, and
       forgetting it would undo itself. Both are shown as the facts they
       are instead. */
    var set = [];
    var using = {};
    TOOLS.forEach(function (t) {
      var k = toolKit(t.store);
      using[t.key] = Boolean(k && k.grinder === g.name);
      if (using[t.key]) set.push(t.there);
    });

    body.innerHTML = '<div class="bag-group">'
      + TOOLS.map(function (t) {
        return switchRow('grinder-' + t.key, t.title,
          using[t.key] ? 'Set to it now' : '',
          g.use[t.key] || using[t.key], using[t.key]);
      }).join('')
      + '</div>'
      + (set.length
        ? '<p class="sheet-note">Still set in ' + esc(set.join(' and '))
          + ' — change it there to let this one go.</p>'
        : '');

    TOOLS.forEach(function (t) {
      if (using[t.key]) return;
      var input = body.querySelector('#grinder-' + t.key);
      input.addEventListener('change', function () {
        LentoKit.setUse(g.name, t.key, input.checked);
        renderAll();
        syncSoon();
      });
    });

    var forget = $('#grinder-forget');
    forget.classList.toggle('hidden', set.length > 0);
    forget.onclick = function () {
      var was = g;
      LentoKit.forget(g.name);
      closeModal('#grinder-modal');
      renderAll();
      syncSoon();
      toast('Gone from your gear', {
        after: was.name + ' is back',
        restore: function () {
          LentoKit.put(was);
          renderAll();
          syncSoon();
        },
      });
    };

    openModal('#grinder-modal');
  }

  /* ---------- a piece of gear, described ----------

     Tapping the dripper on your own shelf used to navigate to the brew
     log, which answers a question nobody asked. What you are asking is
     what the thing is and what you last made with it.

     Both answers are cheap and neither is invented. How the water leaves
     a brewer is the one fact about it that does not go stale, and it is
     already shipped in /shared/brewers.js because the brew log shapes
     its whole sheet around it. What the machine can change is the
     dial-in's own kit, in the dial-in's own terms. And the last brew or
     shot is sitting in that app's store, where this page already reads
     defensively for the counts.

     Nothing here is editable. These records belong to the instruments,
     and the way in is at the foot of the sheet. */

  function num(v) {
    // Empty is not zero, and Number('') is. Every reader of a free-text
    // field in this project has had to learn that separately.
    if (v === '' || v === null || typeof v === 'undefined') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function grams(v) {
    var n = num(v);
    return n === null ? null : (Math.round(n * 10) / 10) + ' g';
  }

  function secs(v) {
    var n = num(v);
    if (n === null || n <= 0) return null;
    if (n < 60) return Math.round(n) + 's';
    var m = Math.floor(n / 60);
    var r = Math.round(n % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  // Calendar days, not elapsed hours: a brew at eleven last night was
  // yesterday at nine this morning, whatever the arithmetic says.
  function ago(at) {
    var n = num(at);
    if (n === null) return '';
    var then = new Date(n);
    var now = new Date();
    var days = Math.round(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate())
        - new Date(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 14) return days + ' days ago';
    if (days < 60) return Math.round(days / 7) + ' weeks ago';
    return Math.round(days / 30) + ' months ago';
  }

  function latest(store, field, match) {
    var v = readJSON(store);
    if (!v || !Array.isArray(v.coffees)) return null;
    var best = null;
    v.coffees.forEach(function (c) {
      (c && Array.isArray(c[field]) ? c[field] : []).forEach(function (r) {
        if (!r || (match && !match(r))) return;
        if (!best || (num(r.at) || 0) > (num(best.at) || 0)) best = r;
      });
    });
    return best;
  }

  function lastLine(bits, at) {
    var said = bits.filter(Boolean).join(' · ');
    if (!said) return '';
    return '<p class="gear-last">' + esc(said)
      + '<span class="gear-ago">' + esc(ago(at)) + '</span></p>';
  }

  function lastBlock(label, html) {
    if (!html) return '';
    return '<div><span class="field-label">' + esc(label) + '</span>' + html + '</div>';
  }

  var CAN_TEMP = { set: 'You set it', fixed: 'One temperature' };
  var CAN_PRESSURE = { profile: 'You can change it', gauge: 'You can see it', fixed: 'Fixed' };

  function canRow(label, value) {
    if (!value) return '';
    return '<div class="gear-can-row"><span class="gear-can-label">' + esc(label)
      + '</span><span class="gear-can-value">' + esc(value) + '</span></div>';
  }

  function openGearItem(item) {
    var body = $('#gear-item-body');
    var go = $('#gear-item-go');
    $('#gear-item-title').textContent = item.name;

    if (item.kind === 'machine') {
      var k = item.kit || {};
      var dose = num(k.basketDose);
      body.innerHTML = '<div class="gear-can">'
        + canRow('Temperature', CAN_TEMP[k.temp] || CAN_TEMP.fixed)
        + canRow('Pressure', CAN_PRESSURE[k.pressure] || CAN_PRESSURE.fixed)
        + canRow('Basket', [dose ? dose + ' g' : '', k.portafilter === 'bottomless' ? 'bottomless' : '']
          .filter(Boolean).join(', '))
        + '</div>'
        + lastBlock('Your last shot', shotLine());
      go.textContent = 'Open the dial-in';
      go.href = '/espresso/';
    } else {
      var B = window.LentoBrewers;
      var d = B ? B.describe({ name: item.name, flow: item.flow }) : null;
      body.innerHTML = '<div>'
        + '<p class="gear-flow">' + esc(B ? B.flowLine(d && d.flow) : '') + '</p>'
        + (d && d.note ? '<p class="gear-note">' + esc(d.note) + '</p>' : '')
        + '</div>'
        + lastBlock('Your last brew', brewLine(item.name));
      go.textContent = 'Open the brew log';
      go.href = '/filter/';
    }

    openModal('#gear-item-modal');
  }

  function shotLine() {
    var sh = latest('lento-espresso-v1', 'shots', null);
    if (!sh) return '';
    var dose = grams(sh.dose);
    var out = grams(sh.yield);
    return lastLine([
      dose && out ? dose + ' → ' + out : (dose || out),
      secs(sh.time),
    ], sh.at);
  }

  function brewLine(name) {
    var br = latest('lento-filter-v1', 'brews', function (r) { return r.brewer === name; });
    if (!br) return '';
    var dose = grams(br.dose);
    var water = grams(br.water);
    var t = num(br.temp);
    return lastLine([
      dose && water ? dose + ' → ' + water : (dose || water),
      t === null ? null : t + '°',
      secs(br.time),
    ], br.at);
  }

  /* ---------- the cloud ----------

     The front door syncs now, which it never did: it had nothing of its
     own to send. Two shared records later, signing in here and waiting
     for an instrument to be opened before your shelf arrives is a page
     withholding the thing it is showing you.

     Debounced, because a marks switch is a tap somebody makes three times
     in a row. */
  var syncTimer = null;

  function signedIn() {
    return Boolean(window.LentoAccount && LentoAccount.enabled() && LentoAccount.user());
  }

  function syncSoon() {
    if (!signedIn()) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncMine(); }, 1200);
  }

  function syncMine() {
    if (!signedIn()) return Promise.resolve(false);
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
    var jobs = [];
    if (window.LentoKit) jobs.push(LentoKit.sync());
    if (window.LentoCoffees) jobs.push(LentoCoffees.sync());
    return Promise.all(jobs.map(function (job) {
      return Promise.resolve(job).then(function () { return true; }, function () { return false; });
    })).then(function (results) {
      renderAll();
      // Half a sync is not a sync: the sheet's "synced" line has to mean
      // both records went over.
      return results.length > 0 && results.every(Boolean);
    });
  }

  /* A DEAD BUTTON IS THE WORST FAILURE THIS PAGE HAS.

     Somebody reported that tapping sign-in here did nothing — no panel, no
     message, no way to tell whether the tap had registered. That is not
     reproducible on any browser reachable from where this was written, and
     a phone has no console to read, so the page had no way to say what had
     gone wrong and the person had no way to find out.

     Three things follow. The button is wired before anything that could
     throw, so a failure further down cannot take the control with it. The
     tap says what happened instead of nothing. And an error anywhere in
     the boot reaches the toast, because a message a person can read to me
     is worth more than a silence that is tidier. */
  function fail(what, e) {
    var why = (e && (e.message || e.name)) || 'no reason given';
    try { toast(what + ' — ' + why); } catch (ignored) {}
  }

  function boot() {
    var btn = $('#btn-account');

    /* First, and outside the try: whatever else fails, the tap is answered.
       Nothing below this line can leave the button dead. */
    btn.addEventListener('click', function () {
      if (!window.LentoAccountSheet) { fail('Sign-in did not load', null); return; }
      try { LentoAccountSheet.open(); } catch (e) { fail('Sign-in could not open', e); }
    });

    /* The shelf and the gear before the account layer, and outside its
       check: they are localStorage and they work with no project
       configured, no network and nobody signed in. A page that hid what
       is on this device because a sign-in script did not arrive would be
       hiding it for the one reason that has nothing to do with it. */
    ['shelf', 'gear', 'gear-item', 'bag', 'grinder'].forEach(function (id) {
      $('#' + id + '-close').addEventListener('click', function () {
        closeModal('#' + id + '-modal');
      });
    });
    $('#btn-shelf').addEventListener('click', function () { openModal('#shelf-modal'); });
    $('#btn-gear').addEventListener('click', function () { openModal('#gear-modal'); });
    // A way out of a sheet that leaves the page is still a way out of the
    // sheet: without this the stack keeps a frame for a modal nobody will
    // close, and the next Escape restores focus to the wrong control.
    $('#gear-item-go').addEventListener('click', function () { closeModal('#gear-item-modal'); });
    renderShelf();
    renderGear();
    $('#vault').classList.toggle('hidden',
      $('#btn-shelf').classList.contains('hidden') && $('#btn-gear').classList.contains('hidden'));

    if (!window.LentoAccountSheet || !window.LentoAccount) {
      /* No account layer at all. The row stays hidden, as it does on a
         deploy with no Supabase project — but that is a deploy-time
         decision, and this is a script that did not arrive. */
      return;
    }

    LentoAccountSheet.install({
      open: openModal,
      close: closeModal,
      toast: toast,
      refresh: renderAll,
      /* There is a Sync now here at last. The launcher had no records of
         its own for as long as it was a list of links; it holds two
         shared ones now — your grinders and your shelf — and they are
         exactly the two that are worth having before you open a tool on
         a phone you have just signed in on. */
      sync: syncMine,
      status: function () { return deviceLine(); },
      // Not "your log": the front door is not a log. What follows you is
      // whatever the three tools have recorded.
      signedOutNote: 'Your cuppings, shots and brews then follow you to any device — and every tool still works with no signal.',
      signOutNote: 'Signing out leaves everything on this device.',
      signedInToast: 'Signed in — your tools will follow you',
    });

    LentoAccount.onChange(function () { renderAll(); syncMine(); });
    renderAll();
    // Whatever is already on this device is drawn above; this fills in
    // what the cloud has and redraws. Failure is silent by design — the
    // page is complete without it.
    syncMine();

    /* An OAuth return lands here as a fragment when sign-in started here.
       `https://lento.cafe/` has to be in the project's Redirect URLs for
       that to come back to this page rather than the site URL — see
       DEPLOY.md. */
    LentoAccount.adoptRedirect()
      .then(function (arrived) {
        if (arrived) toast('Signed in — your tools will follow you');
      })
      .catch(function () {});
  }

  /* The front door works offline too, now that it is a door somebody comes
     back to from an instrument that does. See sw.js for why this worker
     does not take the apps over. */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  function start() {
    try { boot(); } catch (e) { fail('Sign-in could not start', e); }
  }

  /* The last net. A script that throws while it is parsing never reaches
     boot at all, and on a phone that is completely silent. */
  window.addEventListener('error', function (e) {
    if (!e || !e.message) return;
    fail('Something on this page broke', { message: e.message });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
