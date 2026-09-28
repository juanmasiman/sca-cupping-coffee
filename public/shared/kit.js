/* ============================================================
   lento — the grinders you own

   WHAT THIS IS, AND WHAT IT USED TO BE

   This file used to hold "the grinder", singular: one record, copied
   into whichever app opened next. That was wrong, and wrong in a way
   that changed advice rather than just annoying somebody. A person with
   a DF64 on the espresso machine and a Kingrinder K6 for filter is the
   normal case, not the edge — and the record carried `steps` and
   `retains`, which is what grind.js reasons with. Setting the hand
   grinder in the brew log told the dial-in that the DF64 held grounds
   between settings, so the dial-in started telling them to purge five to
   ten grams before every move. Wrong machine, wrong advice, and nothing
   on screen to show where it had come from.

   Worse, the brew log never asks about retention at all, so what it
   wrote was not even its own answer — it was the default.

   So: a person owns grinders, plural, and each tool names the one it is
   using. This file is the list. It is a convenience and nothing else —
   somewhere to look somebody up rather than make them fill the same two
   questions in twice. Each app's own kit stays the authority for that
   app, and nothing is copied anywhere without somebody picking it.

   WHY A LIST AND NOT JUST "THE OTHER APP'S ONE"

   Because two is not the limit either. A Comandante for travel, a K6 at
   home, a DF64 on the machine; the list costs the same as the pair and
   stops being wrong the moment somebody owns three.
   ============================================================ */

(function (root) {
  'use strict';

  var STORE = 'lento-kit-v1';

  /* Prefill, not authority. Every row here is two editable answers with a
     name attached, and a grinder that is not on it is a text field like
     any other — the list is a shortcut past two questions, never a
     requirement to be on it. */
  var GRINDERS = [
    { name: 'Niche Zero',                      steps: 'stepless', retains: false },
    { name: 'DF64 / DF64 Gen 2',               steps: 'stepless', retains: false },
    { name: 'DF54',                            steps: 'stepless', retains: false },
    { name: 'Turin DF83',                      steps: 'stepless', retains: false },
    { name: 'Eureka Mignon',                   steps: 'stepless', retains: true },
    { name: 'Mazzer Mini',                     steps: 'stepless', retains: true },
    { name: 'Option-O Lagom P64',              steps: 'stepless', retains: false },
    { name: 'Weber Key / EG-1',                steps: 'stepless', retains: false },
    { name: 'Fellow Ode Gen 2',                steps: 'stepped',  retains: false },
    { name: 'Baratza Encore / Encore ESP',     steps: 'stepped',  retains: true },
    { name: 'Baratza Sette 270',               steps: 'stepped',  retains: false },
    { name: 'Breville/Sage Smart Grinder Pro', steps: 'stepped',  retains: true },
    { name: 'Breville/Sage built-in grinder',  steps: 'stepped',  retains: true },
    { name: '1Zpresso (J, JX, K, ZP6)',        steps: 'stepped',  retains: false },
    { name: 'Comandante C40',                  steps: 'stepped',  retains: false },
    { name: 'Timemore (C2, C3, 078)',          steps: 'stepped',  retains: false },
    { name: 'Kingrinder (K4, K6)',             steps: 'stepped',  retains: false },
  ];

  function tableEntry(name) {
    for (var i = 0; i < GRINDERS.length; i++) {
      if (GRINDERS[i].name === name) return GRINDERS[i];
    }
    return null;
  }

  /* ---------- the store ----------

     { grinders: [{ name, steps, retains }], updated }

     `retains` may be null, meaning nobody has been asked. The brew log
     does not ask — retention matters to a dial-in and barely to a pour
     over — so it records what it knows and leaves the rest alone rather
     than writing a default and calling it an answer. */

  function empty() { return { grinders: [], updated: 0 }; }

  function read() {
    var raw;
    try { raw = localStorage.getItem(STORE); } catch (e) { return empty(); }
    if (!raw) return empty();
    var v;
    try { v = JSON.parse(raw); } catch (e) { return empty(); }
    if (!v || typeof v !== 'object') return empty();
    // The single-grinder shape this file used to write. One grinder is a
    // list of one; nobody loses what they told us.
    if (typeof v.grinder === 'string') {
      return {
        grinders: v.grinder ? [{
          name: v.grinder,
          steps: v.steps === 'stepped' ? 'stepped' : 'stepless',
          // Not trusted. The old record wrote `true` whenever the app
          // that saved it had no opinion, which was every save from the
          // brew log. An unanswered question is better than a wrong
          // answer, so this one goes back to unanswered and the built-in
          // table fills it if the name is known.
          retains: null,
        }] : [],
        updated: v.updated || 0,
      };
    }
    if (!Array.isArray(v.grinders)) return empty();
    return { grinders: v.grinders.filter(function (g) {
      return g && typeof g.name === 'string' && g.name;
    }), updated: v.updated || 0 };
  }

  function store(rec) {
    try { localStorage.setItem(STORE, JSON.stringify(rec)); } catch (e) { /* quota, private mode */ }
    return rec;
  }

  function known() { return read().grinders; }

  /* What is true about a grinder by that name: what this person said
     about it, over what the built-in table says. Somebody who corrected
     the table for their own machine has corrected it for good. */
  function entryFor(name) {
    if (!name) return null;
    var mine = null;
    var list = known();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) mine = list[i];
    var base = tableEntry(name);
    if (!mine && !base) return null;
    return {
      name: name,
      steps: (mine && mine.steps) || (base && base.steps) || 'stepless',
      retains: mine && mine.retains !== null && typeof mine.retains !== 'undefined'
        ? mine.retains
        : (base ? base.retains : null),
    };
  }

  /* Write down what an app's kit says about its own grinder, so the other
     tools can offer it rather than ask again. `retains` is only recorded
     when the app in hand actually asks about it — see `asksRetains`. */
  function remember(kit, asksRetains) {
    if (!kit || !kit.grinder) return null;
    var rec = read();
    var next = {
      name: String(kit.grinder),
      steps: kit.steps === 'stepped' ? 'stepped' : 'stepless',
      retains: asksRetains ? kit.retains !== false : null,
    };
    var found = false;
    var changed = false;
    rec.grinders = rec.grinders.map(function (g) {
      if (g.name !== next.name) return g;
      found = true;
      // A null from an app that does not ask must not erase an answer
      // another app already got.
      var merged = {
        name: next.name,
        steps: next.steps,
        retains: next.retains === null && typeof g.retains !== 'undefined' ? g.retains : next.retains,
      };
      if (merged.steps !== g.steps || merged.retains !== g.retains) changed = true;
      return merged;
    });
    if (!found) { rec.grinders.push(next); changed = true; }
    /* Nothing new to say, nothing written. This is called on every boot
       so that somebody who has been using one tool for months turns up in
       the list without being asked again — and a write on every boot
       would restamp the record, which means pushing it to the cloud, and
       beating a device that had actually changed something. */
    if (!changed) return rec;
    rec.updated = Date.now();
    return store(rec);
  }

  /* The list, across devices. Its own record, because it belongs to the
     person rather than to either tool — each tool's own kit, including
     which grinder it is using, syncs with that tool. Last write wins on
     the whole list, which is the same trade the rest of the sync makes
     and is harmless here: the list is append-mostly and nothing reads it
     without somebody picking from it. */
  async function sync() {
    var A = root.LentoAccount;
    if (!A || !A.enabled() || !A.user()) return false;
    var rows = await A.pull('kit');
    if (!rows) return false;
    var row = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === 'grinders') row = rows[i];
    var mine = read();
    var mineAt = mine.updated || 0;
    var theirs = row && row.updated ? row.updated : 0;
    if (row && row.data && theirs > mineAt) { store(row.data); return true; }
    if (mineAt > theirs && mine.grinders.length) await A.push('kit', 'grinders', mine, mineAt);
    return false;
  }

  root.LentoKit = {
    STORE: STORE,
    GRINDERS: GRINDERS,
    // The built-in table alone, for code that wants the shipped defaults.
    grinderEntry: tableEntry,
    // The table corrected by what this person has said. Prefer this.
    entryFor: entryFor,
    known: known,
    remember: remember,
    read: read,
    sync: sync,
  };
}(window));
