/* ============================================================
   lento — the coffees, once

   WHAT A BAG IS, AND WHOSE IT IS

   The dial-in kept its coffees and the brew log kept its coffees, and the
   same bag on the same shelf was two records that knew nothing about each
   other. Type the name, the roaster, the roast, the origin and the
   variety into one; type all of it again into the other. Correct a typo
   in one and the other keeps the typo.

   A bag is not the dial-in's and not the brew log's. It is a thing on a
   shelf, and which tools you brew it with is a fact ABOUT it — a fact
   worth recording, because plenty of bags are only ever espresso, plenty
   are only ever filter, and the good ones are both.

   WHAT IS HERE AND WHAT IS NOT

   Here: what the bag says. Name, roaster, roast date, roast level,
   origin, variety, process, altitude, what it claims to taste like,
   whether it is decaf — and `use`, which tools you brew it with.

   Not here: anything about brewing it. The target dose, the ratio, the
   time window and the log belong to the tool, because 1:2 in 28 seconds
   and 1:16 in three minutes are not two values of one setting — they are
   two different instruments' answers, and a shared record holding both
   would be a record holding neither.

   So each tool keeps its own row per bag — a target, a grinder setting,
   a log — joined to this one by id. This is the bag; that is the brewing.

   HOW A BAG REACHES THE OTHER TOOL

   By being marked, and then by that tool noticing on its next load. This
   file never writes into another app's store: cross-app writes race
   whatever that app is holding in memory, and the reconcile each tool has
   to do on load anyway is the same work done safely.
   ============================================================ */

(function (root) {
  'use strict';

  var STORE = 'lento-coffees-v1';
  var TOOLS = ['espresso', 'filter'];
  // The same half-year the apps prune their own tombstones after, for the
  // same reason: a delete has to survive a device that was switched off.
  var TOMB_DAYS = 180;

  var BAG = ['name', 'roaster', 'roastDate', 'roast', 'origin', 'variety',
    'process', 'altitude', 'bagNotes'];

  function empty() { return { coffees: [], dead: {}, updated: 0 }; }

  function clean(c) {
    if (!c || typeof c !== 'object' || !c.id) return null;
    var out = { id: String(c.id) };
    BAG.forEach(function (f) { out[f] = typeof c[f] === 'string' ? c[f] : ''; });
    out.decaf = c.decaf === true;
    var u = c.use && typeof c.use === 'object' ? c.use : {};
    out.use = { espresso: u.espresso === true, filter: u.filter === true };
    out.updated = typeof c.updated === 'number' ? c.updated : 0;
    return out;
  }

  function read() {
    var raw;
    try { raw = localStorage.getItem(STORE); } catch (e) { return empty(); }
    if (!raw) return empty();
    var v;
    try { v = JSON.parse(raw); } catch (e) { return empty(); }
    if (!v || typeof v !== 'object' || !Array.isArray(v.coffees)) return empty();
    var dead = v.dead && typeof v.dead === 'object' ? v.dead : {};
    var stale = Date.now() - TOMB_DAYS * 86400000;
    Object.keys(dead).forEach(function (k) { if ((dead[k] || 0) < stale) delete dead[k]; });
    return {
      coffees: v.coffees.map(clean).filter(Boolean),
      dead: dead,
      updated: v.updated || 0,
    };
  }

  function store(rec) {
    try { localStorage.setItem(STORE, JSON.stringify(rec)); } catch (e) { /* quota, private mode */ }
    return rec;
  }

  function all() { return read().coffees; }

  function get(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* The bags a tool brews. An unmarked bag belongs to whoever is asking:
     it was written before the marks existed, or by a build that did not
     set them, and hiding somebody's shelf behind a field they never saw
     is the worst thing this file could do. */
  function forTool(tool) {
    return all().filter(function (c) {
      return c.use[tool] || (!c.use.espresso && !c.use.filter);
    });
  }

  // Does this bag say anything at all? An id and nine empty strings is a
  // row somebody abandoned, and it should not turn up on another tool's
  // shelf as a nameless coffee.
  function said(c) {
    return BAG.some(function (f) { return (c[f] || '').trim(); }) || c.decaf;
  }

  /* Write a bag. Only a real change stamps it: this is called from every
     coffee sheet's commit, which runs on every way out of that sheet, and
     restamping an untouched record means pushing it to the cloud and
     beating a device that had actually changed something. */
  function put(rec) {
    var next = clean(rec);
    if (!next) return null;
    var lib = read();
    var found = null;
    lib.coffees.forEach(function (c) { if (c.id === next.id) found = c; });
    if (found) {
      var same = BAG.every(function (f) { return found[f] === next[f]; })
        && found.decaf === next.decaf
        && found.use.espresso === next.use.espresso
        && found.use.filter === next.use.filter;
      if (same) return lib;
      next.updated = Date.now();
      lib.coffees = lib.coffees.map(function (c) { return c.id === next.id ? next : c; });
    } else {
      next.updated = Date.now();
      lib.coffees.push(next);
    }
    lib.updated = Date.now();
    delete lib.dead[next.id];
    return store(lib);
  }

  /* Gone from the shelf entirely. A tool removing a coffee from its own
     board does NOT come here — it unmarks itself, and the bag survives as
     long as the other tool still brews it. See `setUse`. */
  function remove(id) {
    var lib = read();
    var was = 0;
    lib.coffees.forEach(function (c) { if (c.id === id) was = c.updated || 0; });
    lib.coffees = lib.coffees.filter(function (c) { return c.id !== id; });
    /* Later than the bag it removes, always. A deletion is a write and is
       compared against the record's own timestamp like any other, so one
       stamped in that record's past — which is what `Date.now()` is, on a
       bag adopted from a device whose clock runs fast — reads on the next
       sync as a bag edited after it was removed, and comes back. */
    lib.dead[id] = Math.max(Date.now(), was + 1);
    lib.updated = Date.now();
    store(lib);
    /* Written down, not deleted. A removed cloud row is invisible to the
       other device — a pull that does not mention a bag is a pull with
       nothing to add — so it kept the bag and pushed it back up. See the
       deletions section of /shared/account.js. */
    var A = root.LentoAccount;
    if (A && A.bury) A.bury('coffee', id, lib.dead[id]);
    return lib;
  }

  /* Which tools brew this bag. Unmarking the last one takes the bag off
     the shelf: a coffee nobody brews is not a coffee, and leaving it
     would grow a list that only ever gets longer. */
  function setUse(id, tool, on) {
    if (TOOLS.indexOf(tool) < 0) return read();
    var c = get(id);
    if (!c) return read();
    if (c.use[tool] === Boolean(on)) return read();
    var use = { espresso: c.use.espresso, filter: c.use.filter };
    use[tool] = Boolean(on);
    if (!use.espresso && !use.filter) return remove(id);
    var next = {};
    Object.keys(c).forEach(function (k) { next[k] = c[k]; });
    next.use = use;
    return put(next);
  }

  /* MIGRATION, AND THE JOIN THIS FILE REFUSES TO GUESS AT.

     Each tool hands over the bags it already holds, and they arrive here
     marked for that tool. Two records with the same name in the two apps
     stay two bags, because they might be two bags: the same roaster's
     Kochere bought in March and again in September is two, and joining
     them would merge two logs' worth of history under one name with no
     way back. Marking one "also for filter" is one tap, and it is the
     person saying it rather than this file guessing.

     Runs once per tool, flagged in the tool's own store, so a bag removed
     from the library does not reappear on the next boot. */
  function adopt(tool, coffees) {
    if (TOOLS.indexOf(tool) < 0 || !Array.isArray(coffees)) return read();
    var lib = read();
    var byId = {};
    lib.coffees.forEach(function (c) { byId[c.id] = c; });
    var added = 0;
    coffees.forEach(function (src) {
      if (!src || !src.id || byId[src.id] || lib.dead[src.id]) return;
      var next = clean(src) || { id: String(src.id) };
      next = clean(next);
      BAG.forEach(function (f) { next[f] = typeof src[f] === 'string' ? src[f] : ''; });
      next.decaf = src.decaf === true;
      next.use = { espresso: tool === 'espresso', filter: tool === 'filter' };
      next.updated = typeof src.updated === 'number' ? src.updated : Date.now();
      lib.coffees.push(next);
      byId[next.id] = next;
      added++;
    });
    if (!added) return lib;
    lib.updated = Date.now();
    return store(lib);
  }

  /* ---------- sync ----------

     One row per bag, not one row for the list. The grinder list is one
     row because it is four names nobody edits; a shelf is twenty bags
     that get corrected, and last-write-wins over a whole shelf would lose
     an addition made on a phone to an edit made on a laptop. Per record,
     the two survive each other — which is the same trade the shots and
     the brews already make.

     Tombstones travel, because last-write-wins has no opinion about
     absence: without them a bag taken off the shelf here is simply
     missing, the next pull hands it straight back, and on the other
     device it never happened at all. They go up under a tool name of
     their own and expire after the same half-year the local ones do —
     see the deletions section of /shared/account.js, which is where the
     two instruments' coffee lists get the same treatment. */
  async function sync() {
    var A = root.LentoAccount;
    if (!A || !A.enabled() || !A.user()) return false;
    var rows = await A.pull('coffee');
    if (!rows) return false;
    // A failed tombstone pull is not a reason to sync without them: that
    // is the run that puts every bag anybody removed back on the shelf.
    var gone = A.graves ? await A.graves('coffee') : {};
    if (!gone) return false;

    var now = Date.now();
    var lib = read();
    var mine = {};
    lib.coffees.forEach(function (c) { mine[c.id] = c; });
    var changed = false;

    // A bag taken off the shelf on another device comes off it here.
    Object.keys(gone).forEach(function (id) {
      if ((lib.dead[id] || 0) < gone[id]) { lib.dead[id] = gone[id]; changed = true; }
      var ours = mine[id];
      if (!ours) return;
      // Corrected here after it was removed there: the correction wins,
      // and it goes back up below.
      if ((ours.updated || 0) > gone[id]) return;
      delete mine[id];
      changed = true;
    });

    rows.forEach(function (row) {
      var theirs = clean(row.data);
      if (!theirs) return;
      var at = row.updated || theirs.updated || 0;
      // A bag this device took off the shelf after that copy was written
      // stays off it.
      if ((lib.dead[theirs.id] || 0) >= at) return;
      var ours = mine[theirs.id];
      if (!ours || at > (ours.updated || 0)) {
        theirs.updated = at;
        mine[theirs.id] = theirs;
        // Removed here and written there since, so it is back, and this
        // device's tombstone is the stale one.
        if (lib.dead[theirs.id]) delete lib.dead[theirs.id];
        changed = true;
      }
    });

    var merged = Object.keys(mine).map(function (k) { return mine[k]; });
    if (changed) {
      lib.coffees = merged;
      store(lib);
    }

    // Anything newer here than there, or not there at all.
    var seen = {};
    rows.forEach(function (row) { seen[row.id] = row.updated || 0; });
    for (var i = 0; i < merged.length; i++) {
      var c = merged[i];
      if (!said(c)) continue;
      if ((gone[c.id] || 0) >= (c.updated || 0)) continue;
      if (!(c.id in seen) || (c.updated || 0) > seen[c.id]) {
        await A.push('coffee', c.id, c, c.updated || Date.now());
      }
    }
    // And a removal this device made that the cloud has not heard about.
    var deadIds = Object.keys(lib.dead);
    for (var j = 0; j < deadIds.length; j++) {
      var id = deadIds[j];
      var at = lib.dead[id] || 0;
      if (!at || now - at > TOMB_DAYS * 86400000) continue;
      if ((gone[id] || 0) >= at) continue;
      // Written there after this device removed it: a resurrection, not
      // a tombstone to push over the top of.
      if ((seen[id] || 0) > at) continue;
      await A.bury('coffee', id, at);
    }
    return changed;
  }

  root.LentoCoffees = {
    STORE: STORE,
    BAG: BAG,
    all: all,
    forTool: forTool,
    get: get,
    put: put,
    remove: remove,
    setUse: setUse,
    adopt: adopt,
    said: said,
    read: read,
    sync: sync,
  };
}(window));
