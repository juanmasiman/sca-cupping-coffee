/* ============================================================
   lento — the grinders you own, now a view of the gear you own

   WHAT HAPPENED TO THIS FILE

   It used to be the store. It held "the grinder", then a list of
   grinders, and it was the only place on the site where a thing you own
   was written down. Then the brewers turned up inside the brew log's
   kit, and the kettle beside them, and the espresso machine inside the
   dial-in's — four kinds of gear in three stores, with no screen that
   could add a dripper or cross out a kettle.

   /shared/gear.js is the store now, and it holds all four. This file is
   what the two instruments still call, unchanged: `LentoKit.known()`,
   `entryFor`, `remember`, `knownFor`, `setUse`, `forget`, `sync`. Every
   one of them is a grinder-shaped view of the same records, so neither
   app needed a line changed for the move.

   WHY IT IS NOT JUST DELETED

   Because the two apps are the reason any of this exists, and rewriting
   their kit sheets to speak a new vocabulary in the same change that
   moves the data underneath them is two risks taken at once. The names
   this file exports are the seam. When the apps are ready to ask about
   burrs and filters themselves, the seam is where that happens.

   THE OLD SHAPE, AND WHAT IT COULD NOT SAY

   A grinder here was `{ name, steps, retains, use }`, and `steps` was
   either 'stepped' or 'stepless'. That could not tell a numbered dial
   from a collar of clicks counted up from zero, and it had nothing at
   all to say about conical or flat burrs, their size, or whether the
   thing is electric. `steps` is still what this file reports, derived
   from the fuller answer: clicks and stepped are both discrete, which
   is the only distinction the apps' arithmetic has ever made.
   ============================================================ */

(function (root) {
  'use strict';

  // Kept so anything still reading it gets the right key rather than a
  // stale one. The records moved; see /shared/gear.js.
  var STORE = 'lento-gear-v1';
  var LEGACY_STORE = 'lento-kit-v1';

  function G() { return root.LentoGear; }
  function DB() { return root.LentoGearDB; }

  /* The shipped list, in the shape this file has always handed out. The
     catalogue holds a great deal more about each one now — drive, burr
     geometry, burr size — and the two apps' pickers want the names. */
  function table() {
    var list = DB() ? DB().GRINDERS : [];
    return list.map(function (g) {
      return {
        name: g.name,
        steps: g.adjust === 'stepped' || g.adjust === 'clicks' ? 'stepped' : 'stepless',
        retains: typeof g.retains === 'boolean' ? g.retains : false,
      };
    });
  }

  // Built once: `GRINDERS` is read as a property, and rebuilding an
  // array on every read would defeat every identity check upstream.
  var GRINDERS = null;
  function grinders() {
    if (!GRINDERS) GRINDERS = table();
    return GRINDERS;
  }

  function tableEntry(name) {
    var list = grinders();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  // A gear record, in the old grinder shape.
  function asKit(g) {
    return {
      name: g.name,
      steps: g.adjust === 'stepped' || g.adjust === 'clicks' ? 'stepped' : 'stepless',
      retains: typeof g.retains === 'boolean' ? g.retains : null,
      use: { espresso: g.use.espresso, filter: g.use.filter },
    };
  }

  function known() {
    return G() ? G().ofKind('grinder').map(asKit) : [];
  }

  /* The grinders marked for one tool, with the unmarked ones included:
     a list written before the marks existed, or by a build that did not
     set them, must not read as an empty shelf. */
  function knownFor(tool) {
    return G() ? G().forTool('grinder', tool).map(asKit) : [];
  }

  /* What is true about a grinder by that name: what this person said
     about it, over what the catalogue says. Somebody who corrected the
     table for their own machine has corrected it for good. */
  function entryFor(name) {
    if (!name || !G()) return null;
    var d = G().describe('grinder', name);
    if (!d) return null;
    return {
      name: name,
      steps: d.adjust === 'stepped' || d.adjust === 'clicks' ? 'stepped' : 'stepless',
      retains: typeof d.retains === 'boolean' ? d.retains : null,
    };
  }

  /* Write down what an app's kit says about its own grinder, so the
     other tools can offer it rather than ask again. `retains` is only
     recorded when the app in hand actually asks about it — see
     `asksRetains` — because a default is not an answer. */
  function remember(kit, asksRetains, tool) {
    if (!kit || !kit.grinder || !G()) return null;
    /* `steps` cannot say whether a grinder counts clicks, so it is only
       ever offered as a fallback: the catalogue's answer for a name it
       knows is better, and a person's own answer is better than that.
       `remember` only fills blanks, so passing the coarse version here
       cannot overwrite the fine one. */
    var fields = { adjust: kit.steps === 'stepped' ? 'stepped' : 'stepless' };
    if (asksRetains) fields.retains = kit.retains !== false;
    return G().remember('grinder', String(kit.grinder), fields, tool);
  }

  // Marked by hand, from a setup sheet. `remember` only ever adds a
  // mark, because a tool saving its own kit cannot know that you
  // stopped using that grinder elsewhere. Saying so explicitly can.
  function setUse(name, tool, on) {
    if (!G()) return null;
    var g = G().named('grinder', name);
    if (!g) return null;
    return G().setUse(g.id, tool, on);
  }

  // Crossed off the list entirely.
  function forget(name) {
    if (!G()) return null;
    var g = G().named('grinder', name);
    if (!g) return null;
    return G().remove(g.id);
  }

  // A grinder back exactly as it was, for an undo.
  function put(g) {
    if (!g || !g.name || !G()) return null;
    // Bare, not seeded: putting a grinder back must not hand it
    // catalogue answers it never carried.
    var mine = G().named('grinder', g.name);
    var next = mine || G().bare('grinder', g.name);
    next.adjust = g.steps === 'stepped' ? 'stepped' : 'stepless';
    next.retains = typeof g.retains === 'boolean' ? g.retains : null;
    var u = g.use && typeof g.use === 'object' ? g.use : {};
    next.use = { espresso: u.espresso === true, filter: u.filter === true };
    return G().put(next);
  }

  function read() {
    return { grinders: known(), updated: G() ? (G().read().updated || 0) : 0 };
  }

  function sync() {
    return G() ? G().sync() : Promise.resolve(false);
  }

  root.LentoKit = {
    STORE: STORE,
    LEGACY_STORE: LEGACY_STORE,
    // A getter, so the list is built from the catalogue on first use
    // rather than at load time, when gear-db may not have run yet.
    get GRINDERS() { return grinders(); },
    grinderEntry: tableEntry,
    entryFor: entryFor,
    known: known,
    knownFor: knownFor,
    setUse: setUse,
    put: put,
    forget: forget,
    remember: remember,
    read: read,
    sync: sync,
  };
}(window));
