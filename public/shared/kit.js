/* ============================================================
   lento — the grinder, which is one grinder

   THE ARGUMENT THIS FILE SETTLES

   grind.js already opens by explaining why the calibration is shared
   between the dial-in and the brew log: "it is the same measurement of
   the same machine. A brewer who uses both owns one grinder, and it
   behaves the same way whichever basket or cone is downstream of it."

   And then the two apps asked for that grinder separately. The dial-in
   offered a seventeen-entry list that fills in whether it counts clicks
   and whether it holds grounds; the brew log offered a bare text box. Two
   questions, two answers, two localStorage keys — so the app shared its
   reasoning about your grinder and not the fact of it, and the second
   tool you opened asked you something you had already told the first one.

   THE DISAGREEMENT, STATED RATHER THAN STEAMROLLED

   The brew log's kit comment takes a position: "The names of the things
   are carried as the user's own record. Nothing is read out of them: a
   brand table goes stale within a year and is wrong about every hybrid on
   the shelf." That is a real objection and it is right about brand
   tables.

   The dial-in's answer is the one that survives it: the list seeds two
   answers ONCE, both stay editable, and the sheet says so — "correct any
   that are wrong, because a machine you have modified beats any list."
   Nothing is read out of the name at the moment advice is given; the name
   is a convenience on the way to two booleans the user owns. A tester on
   a hand grinder had "single dose, almost none" filled in correctly
   without being asked, and that is worth more than the risk of a stale
   row somebody can overwrite in one tap.

   WHAT IS SHARED, AND WHAT IS NOT

   Only the grinder. A portafilter and a basket mean nothing to a cone; a
   brewer and a kettle mean nothing to an espresso machine. The shared
   record is exactly the subset grind.js reasons about — the name, whether
   it counts clicks, and whether it holds grounds between settings — and
   each app keeps the rest of its own kit to itself.

   The three apps are same-origin under lento.cafe, so this is shared by
   construction: no account, no network, no sync. Signing in is a separate
   question and this works without it.
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

  function entry(name) {
    for (var i = 0; i < GRINDERS.length; i++) {
      if (GRINDERS[i].name === name) return GRINDERS[i];
    }
    return null;
  }

  function read() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return null;
      var v = JSON.parse(raw);
      return v && typeof v === 'object' && typeof v.grinder === 'string' ? v : null;
    } catch (e) { return null; }
  }

  /* Written whenever somebody answers the question in either app, so the
     last place you told it is the place that is right. On one person's
     one device that is simply "the truth"; where two devices disagree it
     is the same last-write-wins the rest of the sync uses. */
  function write(kit) {
    if (!kit) return null;
    var rec = {
      grinder: String(kit.grinder || ''),
      steps: kit.steps === 'stepped' ? 'stepped' : 'stepless',
      retains: kit.retains !== false,
      updated: Date.now(),
    };
    try { localStorage.setItem(STORE, JSON.stringify(rec)); } catch (e) { /* quota, private mode */ }
    return rec;
  }

  /* Copy the shared record onto an app's own kit object. Returns true when
     something actually moved, so the caller knows whether to save and
     re-render rather than doing both unconditionally on every boot. */
  function adopt(kit) {
    var rec = read();
    if (!rec || !kit) return false;
    var changed = false;
    if (kit.grinder !== rec.grinder) { kit.grinder = rec.grinder; changed = true; }
    if (kit.steps !== rec.steps) { kit.steps = rec.steps; changed = true; }
    if (kit.retains !== rec.retains) { kit.retains = rec.retains; changed = true; }
    return changed;
  }

  /* Seed the shared record from an app that already has an answer, so
     somebody who has been using one tool for months does not get asked
     again by the other one. Only when there is nothing shared yet, and
     only when the app in hand actually knows something. */
  function seed(kit) {
    if (read() || !kit || !kit.grinder) return false;
    write(kit);
    return true;
  }

  root.LentoKit = {
    STORE: STORE,
    GRINDERS: GRINDERS,
    grinderEntry: entry,
    read: read,
    write: write,
    adopt: adopt,
    seed: seed,
  };
}(window));
