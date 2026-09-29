/* ============================================================
   lento — the gear you own

   WHY THIS EXISTS

   Your grinders lived in /shared/kit.js. Your brewers and your kettle
   lived inside the brew log's own kit. Your espresso machine lived
   inside the dial-in's. Three stores, three shapes, and no screen
   anywhere that could add a dripper or cross out a kettle — the front
   door could list them and that was all.

   That fragmentation was not an oversight either; each one arrived when
   a tool needed it. But a person owns gear, and which tool they happen
   to use it with is a fact ABOUT it, exactly as it is for a bag of
   coffee. So this file is the same shape as /shared/coffees.js and for
   the same reason: one record per thing, marked with what you brew on
   it, and each tool keeps its own row for the part that is genuinely
   the tool's.

   WHAT IS HERE AND WHAT IS NOT

   Here: what the thing IS. Conical or flat burrs, clicks or a dial,
   what filter the cone takes, whether the kettle can hold 93°, which
   portafilter the machine has.

   Not here: which one you are using this morning. That is the tool's —
   `kit.grinder` in both apps, `kit.brewer` in the brew log — and this
   file never writes into an app's store, because a cross-app write
   races whatever that app is holding in memory. Marking is the whole
   mechanism; the tool reconciles on its next load, which is work it
   does anyway.

   THE CATALOGUE IS A PREFILL, NEVER AN AUTHORITY

   /shared/gear-db.js knows that a Comandante counts clicks. It seeds
   the answers once. After that your record is the answer, because you
   are the one who swapped the burrs.
   ============================================================ */

(function (root) {
  'use strict';

  var STORE = 'lento-gear-v1';
  var TOOLS = ['espresso', 'filter'];
  // The same half-year everything else here prunes a tombstone after.
  var TOMB_DAYS = 180;

  var DB = function () { return root.LentoGearDB; };

  /* The fields each kind carries, beyond name and marks. Kept as one
     table because every reader — clean, put, the sheets, the migration
     — has to agree about them, and four copies of a field list is four
     chances for one of them to be a field short. */
  var FIELDS = {
    grinder: ['drive', 'burr', 'burrSize', 'adjust', 'retains'],
    brewer: ['flow', 'filter', 'filterSize', 'body', 'bypass'],
    kettle: ['power', 'spout', 'control', 'hold', 'units'],
    machine: ['drive', 'boiler', 'temp', 'pressure', 'pf', 'paddle', 'portafilter', 'basketDose'],
  };

  /* The type of each field, and it is keyed by KIND and field rather
     than field alone, because the first version was keyed by field and
     that is a bug with a name: a brewer's `flow` is how the water
     leaves it and a machine's was whether it has a flow-control paddle.
     One table saw "flow" and made both booleans, so every brewer came
     out of a migration with a null flow and the brew log lost the one
     fact it shapes its whole sheet around.

     The machine's field is `paddle` now, because two concepts sharing a
     word is what caused it — but the table is keyed properly as well,
     so the next collision is a no-op rather than a silent data loss. */
  var NUMBERS = { 'grinder.burrSize': 1, 'machine.pf': 1, 'machine.basketDose': 1 };
  var YESNO = { 'grinder.retains': 1, 'brewer.bypass': 1, 'kettle.hold': 1, 'machine.paddle': 1 };

  function kinds() { return DB() ? DB().KINDS : ['grinder', 'brewer', 'kettle', 'machine']; }

  /* `dead` is by id, for sync. `buried` is by kind and name, for the
     apps' own mirrors.

     The brew log's `kit.brewers` is a copy of this list, and it
     reconciles against it on every load. That copy has to be allowed to
     ADD — a brewer added on another device arrives inside that app's
     synced kit, and a reconcile that only mirrored would delete it — and
     it must not add back something deliberately taken off here. The two
     are the same thing from the app's side: a name this list does not
     have. `buried` is what tells them apart. */
  function empty() { return { gear: [], dead: {}, buried: {}, adopted: {}, updated: 0 }; }

  function key(kind, name) { return kind + '\u0000' + name; }

  function uid() {
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clean(g) {
    if (!g || typeof g !== 'object' || !g.id || kinds().indexOf(g.kind) < 0) return null;
    var out = { id: String(g.id), kind: g.kind, name: typeof g.name === 'string' ? g.name : '' };
    FIELDS[g.kind].forEach(function (f) {
      var v = g[f];
      var key = g.kind + '.' + f;
      if (YESNO[key]) { out[f] = v === true ? true : (v === false ? false : null); return; }
      if (NUMBERS[key]) {
        // A blank is a blank. Only a real number is a number.
        out[f] = (v === '' || v === null || typeof v === 'undefined' || !isFinite(Number(v)))
          ? null : Number(v);
        return;
      }
      out[f] = typeof v === 'string' && v ? v : null;
    });
    var u = g.use && typeof g.use === 'object' ? g.use : {};
    out.use = { espresso: u.espresso === true, filter: u.filter === true };
    out.updated = typeof g.updated === 'number' ? g.updated : 0;
    return out;
  }

  function read() {
    var raw;
    try { raw = localStorage.getItem(STORE); } catch (e) { return empty(); }
    if (!raw) return empty();
    var v;
    try { v = JSON.parse(raw); } catch (e) { return empty(); }
    if (!v || typeof v !== 'object' || !Array.isArray(v.gear)) return empty();
    var dead = v.dead && typeof v.dead === 'object' ? v.dead : {};
    var buried = v.buried && typeof v.buried === 'object' ? v.buried : {};
    var stale = Date.now() - TOMB_DAYS * 86400000;
    Object.keys(dead).forEach(function (k) { if ((dead[k] || 0) < stale) delete dead[k]; });
    Object.keys(buried).forEach(function (k) { if ((buried[k] || 0) < stale) delete buried[k]; });
    return {
      gear: v.gear.map(clean).filter(Boolean),
      dead: dead,
      buried: buried,
      adopted: v.adopted && typeof v.adopted === 'object' ? v.adopted : {},
      updated: v.updated || 0,
    };
  }

  function store(rec) {
    try { localStorage.setItem(STORE, JSON.stringify(rec)); } catch (e) { /* quota, private mode */ }
    return rec;
  }

  function all() { migrate(); return read().gear; }

  function ofKind(kind) {
    return all().filter(function (g) { return g.kind === kind; });
  }

  function get(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* By name within a kind, which is how the tools refer to gear: the
     dial-in stores `kit.grinder` as a string and always has. An id
     would be a better key and is not one anybody can migrate to without
     writing into two other apps' stores. */
  // Was this name deliberately taken off the list? For an app whose own
  // kit still carries it and is about to offer it back.
  function buried(kind, name) {
    return Boolean(read().buried[key(kind, name)]);
  }

  function named(kind, name) {
    if (!name) return null;
    var list = ofKind(kind);
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  /* The gear a tool uses. An unmarked thing belongs to whoever is
     asking: it was written before the marks existed, or by a build that
     did not set them, and hiding somebody's kettle behind a field they
     never saw is the worst thing this file could do. */
  function forTool(kind, tool) {
    return ofKind(kind).filter(function (g) {
      return g.use[tool] || (!g.use.espresso && !g.use.filter);
    });
  }

  /* What is true about a piece of gear: your answer over the
     catalogue's, field by field. Somebody who corrected one field has
     not thereby discarded the rest. */
  function describe(kind, name) {
    var mine = named(kind, name);
    var base = DB() ? DB().entry(kind, name) : null;
    if (!mine && !base) return null;
    var out = { kind: kind, name: name, known: Boolean(base), id: mine ? mine.id : null };
    FIELDS[kind].forEach(function (f) {
      var v = mine ? mine[f] : null;
      out[f] = v === null || typeof v === 'undefined'
        ? (base && typeof base[f] !== 'undefined' ? base[f] : null)
        : v;
    });
    out.use = mine ? mine.use : { espresso: false, filter: false };
    // The catalogue's sentence, for the kinds that have one.
    out.note = base && base.note ? base.note : '';
    out.sizes = base && base.sizes ? base.sizes : null;
    return out;
  }

  /* A record with nothing answered. This is what an app's boot creates
     when it notices a grinder it has not seen: the catalogue knows that
     a Kingrinder does not retain, and `describe` will say so, but the
     RECORD must not claim it — because then a person's answer and a
     shipped fact become the same thing, and correcting the catalogue
     later cannot reach anybody who already owns one.

     The distinction is the one this project has always drawn: an
     unanswered question is better than an answer nobody gave. */
  function bare(kind, name) {
    var g = { id: uid(), kind: kind, name: name || '', updated: 0, use: { espresso: false, filter: false } };
    FIELDS[kind].forEach(function (f) { g[f] = null; });
    return g;
  }

  /* A blank record of a kind, seeded from the catalogue when the name
     is one it knows. This one is for a sheet somebody opened: what it
     shows, they have looked at, and saving is them saying so. Nothing
     is stored until `put`. */
  function blank(kind, name) {
    var base = DB() ? DB().entry(kind, name) : null;
    var g = { id: uid(), kind: kind, name: name || '', updated: 0, use: { espresso: false, filter: false } };
    FIELDS[kind].forEach(function (f) {
      g[f] = base && typeof base[f] !== 'undefined' ? base[f] : null;
    });
    // The dial-in has always defaulted a stock double, and a machine
    // with no basket figure at all makes its dose advice guess. Only on
    // the sheet, where somebody is looking at the number.
    if (kind === 'machine' && g.basketDose === null) g.basketDose = 18;
    return g;
  }

  /* Write a piece of gear. Only a real change stamps it: this is called
     from every sheet's commit, which runs on every way out, and
     restamping an untouched record means pushing it to the cloud and
     beating a device that had actually changed something. */
  function put(rec) {
    migrate();
    var next = clean(rec);
    if (!next) return null;
    var lib = read();
    var found = null;
    lib.gear.forEach(function (g) { if (g.id === next.id) found = g; });
    if (found) {
      var same = found.name === next.name
        && FIELDS[next.kind].every(function (f) { return found[f] === next[f]; })
        && found.use.espresso === next.use.espresso
        && found.use.filter === next.use.filter;
      if (same) return lib;
      next.updated = Date.now();
      lib.gear = lib.gear.map(function (g) { return g.id === next.id ? next : g; });
    } else {
      next.updated = Date.now();
      lib.gear.push(next);
    }
    lib.updated = Date.now();
    delete lib.dead[next.id];
    // Adding it back deliberately lifts the bar on the apps' mirrors.
    delete lib.buried[key(next.kind, next.name)];
    return store(lib);
  }

  /* Gone. A deletion is a write and is compared against the record's
     own timestamp like any other, so it is stamped later than the thing
     it removes — see the deletions section of /shared/account.js. */
  function remove(id) {
    migrate();
    var lib = read();
    var was = 0;
    lib.gear.forEach(function (g) { if (g.id === id) was = g.updated || 0; });
    var gone = null;
    lib.gear.forEach(function (g) { if (g.id === id) gone = g; });
    var before = lib.gear.length;
    lib.gear = lib.gear.filter(function (g) { return g.id !== id; });
    if (lib.gear.length === before) return lib;
    lib.dead[id] = Math.max(Date.now(), was + 1);
    if (gone) lib.buried[key(gone.kind, gone.name)] = lib.dead[id];
    lib.updated = Date.now();
    store(lib);
    var A = root.LentoAccount;
    if (A && A.bury) A.bury('gear', id, lib.dead[id]);
    return lib;
  }

  /* Which tools a thing is used with. Unlike a bag of coffee, unmarking
     everything does NOT take it off the shelf: a grinder you have not
     assigned to either app is still a grinder you own, and this is the
     only screen that lists it. Getting rid of it is `remove`, which
     says so. */
  function setUse(id, tool, on) {
    if (TOOLS.indexOf(tool) < 0) return read();
    var g = get(id);
    if (!g || g.use[tool] === Boolean(on)) return read();
    var next = {};
    Object.keys(g).forEach(function (k) { next[k] = g[k]; });
    next.use = { espresso: g.use.espresso, filter: g.use.filter };
    next.use[tool] = Boolean(on);
    return put(next);
  }

  /* An app saving its own kit says "this is what I am using", which is
     worth recording so the other tools can offer it rather than ask
     again. Marks only ever go ON here: the dial-in naming its grinder
     is not the brew log saying it is not, and plenty of people run one
     grinder for both. Deliberate unmarking is `setUse`. */
  function remember(kind, name, fields, tool) {
    if (!name || kinds().indexOf(kind) < 0) return read();
    migrate();
    var mark = TOOLS.indexOf(tool) >= 0 ? tool : null;
    var mine = named(kind, name);
    if (!mine) {
      var g = bare(kind, name);
      FIELDS[kind].forEach(function (f) {
        if (fields && typeof fields[f] !== 'undefined' && fields[f] !== null) g[f] = fields[f];
      });
      if (mark) g.use[mark] = true;
      return put(g);
    }
    var next = {};
    Object.keys(mine).forEach(function (k) { next[k] = mine[k]; });
    next.use = { espresso: mine.use.espresso, filter: mine.use.filter };
    if (mark) next.use[mark] = mine.use[mark] || true;
    /* An answer from an app that does not ask must not erase one
       another app already got. Only a real value fills a blank. */
    FIELDS[kind].forEach(function (f) {
      if (next[f] !== null && typeof next[f] !== 'undefined') return;
      if (fields && typeof fields[f] !== 'undefined' && fields[f] !== null) next[f] = fields[f];
    });
    return put(next);
  }

  /* ---------- migration ----------

     Each store hands over what it holds, once, flagged per source so a
     thing crossed out here does not walk back on at the next boot. It
     reads the two apps' stores and writes to neither: a read is safe
     from anywhere, and the write that would race them is the one this
     file refuses to make.

     Two records with the same name stay one record, unlike the coffee
     shelf where they stay two — because a bag bought twice is two bags
     and a grinder named twice is one grinder. */

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function has(lib, kind, name) {
    for (var i = 0; i < lib.gear.length; i++) {
      if (lib.gear[i].kind === kind && lib.gear[i].name === name) return true;
    }
    return false;
  }

  function adopt(lib, kind, name, fields, use) {
    if (!name || has(lib, kind, name)) return false;
    // Bare, not seeded: a migration is not somebody answering. What the
    // catalogue knows stays the catalogue's, and `describe` layers it.
    var g = bare(kind, name);
    FIELDS[kind].forEach(function (f) {
      if (fields && typeof fields[f] !== 'undefined' && fields[f] !== null) g[f] = fields[f];
    });
    g.use = { espresso: use.espresso === true, filter: use.filter === true };
    g.updated = Date.now();
    lib.gear.push(clean(g));
    return true;
  }

  /* Memoised for the life of the page, not for ever: every reload gets
     one more chance to find a source that was not there last time. */
  var migrated = false;
  function migrate() {
    if (migrated) return;
    migrated = true;
    var lib = read();
    var did = false;

    // 1. The grinders, from the list that used to be the whole of this.
    if (!lib.adopted.kit) {
      var kit = readJSON('lento-kit-v1');
      var list = kit && Array.isArray(kit.grinders) ? kit.grinders : [];
      /* THE SHAPE BEFORE THE LIST, WHICH HELD ONE GRINDER.

         `{ grinder: 'Comandante C40', steps, retains }` is what this
         store looked like before a person was allowed to own more than
         one, and the file that replaced it upgraded the shape on every
         read. Reading it once, here, is the only chance left — so
         missing this case is not a tidier migration, it is somebody
         opening the app after an upgrade and being told they own no
         grinder at all.

         `retains` is deliberately dropped. The old record wrote `true`
         whenever the app that saved it had no opinion, which was every
         save from the brew log, so it is not an answer — it is a
         default wearing one. Unanswered, and the catalogue fills it in
         for a name it knows. */
      if (!list.length && kit && typeof kit.grinder === 'string' && kit.grinder) {
        list = [{ name: kit.grinder, steps: kit.steps, retains: null,
          use: { espresso: false, filter: false } }];
      }
      list.forEach(function (g) {
        if (!g || typeof g.name !== 'string' || !g.name) return;
        var u = g.use && typeof g.use === 'object' ? g.use : {};
        // `steps` was the whole of what the old list knew about how a
        // grinder adjusts, and it could not tell a numbered dial from a
        // collar of clicks. The catalogue fills that in where it knows
        // the name; where it does not, the sheet asks.
        var base = DB() ? DB().entry('grinder', g.name) : null;
        var adjust = base && base.adjust ? base.adjust
          : (g.steps === 'stepped' ? 'stepped' : 'stepless');
        if (adopt(lib, 'grinder', g.name, {
          adjust: adjust,
          retains: typeof g.retains === 'boolean' ? g.retains : null,
        }, u)) did = true;
      });
      /* Only once the source actually exists. Flagging it adopted when
         `lento-kit-v1` is not there yet marks a migration that never
         ran: the front door is often the first page somebody opens on a
         device, and it loads this file before either instrument has
         written a thing. The flag would then be set against an empty
         store and the grinders, when they arrived, would never be
         taken. Absent means try again. */
      if (kit) { lib.adopted.kit = Date.now(); did = true; }
    }

    // 2. The brew log's shelf: its brewers, and its kettle.
    if (!lib.adopted.filter) {
      var f = readJSON('lento-filter-v1');
      var fk = f && f.kit && typeof f.kit === 'object' ? f.kit : null;
      if (fk) {
        (Array.isArray(fk.brewers) ? fk.brewers : []).forEach(function (b) {
          if (!b || typeof b.name !== 'string' || !b.name.trim()) return;
          if (adopt(lib, 'brewer', b.name.trim(), { flow: b.flow || null },
            { filter: true })) did = true;
        });
        if (typeof fk.kettle === 'string' && fk.kettle.trim()) {
          // `temp` was the brew log's word for what the kettle can do,
          // and it is the same question this asks as `control`.
          if (adopt(lib, 'kettle', fk.kettle.trim(),
            { control: fk.temp === 'set' ? 'variable' : null },
            { filter: true })) did = true;
        }
      }
      if (fk) { lib.adopted.filter = Date.now(); did = true; }
    }

    // 3. The dial-in's machine.
    if (!lib.adopted.espresso) {
      var e = readJSON('lento-espresso-v1');
      var ek = e && e.kit && typeof e.kit === 'object' ? e.kit : null;
      if (ek && typeof ek.machine === 'string' && ek.machine.trim()) {
        if (adopt(lib, 'machine', ek.machine.trim(), {
          temp: ek.temp === 'set' ? 'set' : 'fixed',
          pressure: ek.pressure === 'profile' || ek.pressure === 'gauge' ? ek.pressure : 'fixed',
          portafilter: ek.portafilter === 'bottomless' ? 'bottomless' : 'spouted',
          basketDose: typeof ek.basketDose === 'number' ? ek.basketDose : null,
        }, { espresso: true })) did = true;
      }
      if (ek) { lib.adopted.espresso = Date.now(); did = true; }
    }

    if (did) { lib.updated = Date.now(); store(lib); }
  }

  /* ---------- sync ----------

     One row per thing, not one row for the list. The grinder list used
     to be a single row because it was four names nobody edited; it is
     a shelf of records with a dozen fields each now, and last-write-
     wins over the whole of it would lose a kettle added on a phone to a
     burr size corrected on a laptop.

     Deletions travel as tombstones under `gear-gone` and expire after
     the same half-year — see /shared/account.js. */
  async function sync() {
    var A = root.LentoAccount;
    if (!A || !A.enabled() || !A.user()) return false;
    migrate();
    var rows = await A.pull('gear');
    if (!rows) return false;
    var gone = A.graves ? await A.graves('gear') : {};
    if (!gone) return false;

    var now = Date.now();
    var lib = read();

    /* THE GRINDERS THAT ARE STILL IN THE CLOUD UNDER THE OLD KEY.

       The list used to sync as one row, `kit/grinders`. A device that
       already has it locally is covered by the migration above; a
       device signing in fresh is not — it would pull `gear`, find
       nothing, and the person would be told they own no grinders on a
       phone where they own four.

       So the old row is read once, flagged like every other adoption.
       It is never written back: a device still on the previous build
       keeps its own copy, and two writers on one last-write-wins row
       is how you lose the thing you were trying to preserve. */
    if (!lib.adopted.cloudKit) {
      var old = await A.pull('kit');
      if (old) {
        var row = null;
        old.forEach(function (r) { if (r.id === 'grinders') row = r; });
        var list = row && row.data && Array.isArray(row.data.grinders) ? row.data.grinders : [];
        var took = false;
        list.forEach(function (g) {
          if (!g || typeof g.name !== 'string' || !g.name) return;
          var u = g.use && typeof g.use === 'object' ? g.use : {};
          if (adopt(lib, 'grinder', g.name, {
            adjust: g.steps === 'stepped' ? 'stepped' : 'stepless',
            retains: typeof g.retains === 'boolean' ? g.retains : null,
          }, u)) took = true;
        });
        lib.adopted.cloudKit = Date.now();
        if (took) lib.updated = Date.now();
        store(lib);
        lib = read();
      }
    }
    var mine = {};
    lib.gear.forEach(function (g) { mine[g.id] = g; });
    var changed = false;

    // Crossed out on another device.
    Object.keys(gone).forEach(function (id) {
      if ((lib.dead[id] || 0) < gone[id]) { lib.dead[id] = gone[id]; changed = true; }
      var ours = mine[id];
      if (!ours) return;
      if ((ours.updated || 0) > gone[id]) return;
      // The name as well as the id: this device's brew log still has
      // the brewer in its own kit and would otherwise hand it back.
      lib.buried[key(ours.kind, ours.name)] = gone[id];
      delete mine[id];
      changed = true;
    });

    rows.forEach(function (row) {
      var theirs = clean(row.data);
      if (!theirs) return;
      var at = row.updated || theirs.updated || 0;
      if ((lib.dead[theirs.id] || 0) >= at) return;
      var ours = mine[theirs.id];
      if (!ours || at > (ours.updated || 0)) {
        theirs.updated = at;
        mine[theirs.id] = theirs;
        if (lib.dead[theirs.id]) delete lib.dead[theirs.id];
        changed = true;
      }
    });

    /* THE SAME THING TWICE, WHICH PER-RECORD SYNC CANNOT PREVENT.

       Two devices that each adopted their own kit before either had
       synced produce two records for one grinder, with different ids
       and the same name. Nothing upstream can stop that — the ids are
       made locally — so it is settled here: same kind and same name is
       one thing, the older record wins because it is the one other
       devices are likelier to have seen, and the marks are OR'd so
       neither device loses a tool it had assigned. */
    var byName = {};
    Object.keys(mine).forEach(function (id) {
      var g = mine[id];
      var key = g.kind + '\u0000' + g.name;
      var seen = byName[key];
      if (!seen) { byName[key] = g; return; }
      var keep = (seen.updated || 0) <= (g.updated || 0) ? seen : g;
      var drop = keep === seen ? g : seen;
      keep.use = {
        espresso: keep.use.espresso || drop.use.espresso,
        filter: keep.use.filter || drop.use.filter,
      };
      // Anything the winner has not answered, the other one may have.
      FIELDS[keep.kind].forEach(function (f) {
        if (keep[f] === null && drop[f] !== null) keep[f] = drop[f];
      });
      delete mine[drop.id];
      lib.dead[drop.id] = Math.max(now, (drop.updated || 0) + 1);
      byName[key] = keep;
      changed = true;
    });

    var merged = Object.keys(mine).map(function (k) { return mine[k]; });
    if (changed) { lib.gear = merged; store(lib); }

    var seen = {};
    rows.forEach(function (row) { seen[row.id] = row.updated || 0; });
    for (var i = 0; i < merged.length; i++) {
      var g = merged[i];
      if (!g.name) continue;
      if ((gone[g.id] || 0) >= (g.updated || 0)) continue;
      if (!(g.id in seen) || (g.updated || 0) > seen[g.id]) {
        await A.push('gear', g.id, g, g.updated || Date.now());
      }
    }
    var deadIds = Object.keys(lib.dead);
    for (var j = 0; j < deadIds.length; j++) {
      var id = deadIds[j];
      var at = lib.dead[id] || 0;
      if (!at || now - at > TOMB_DAYS * 86400000) continue;
      if ((gone[id] || 0) >= at) continue;
      if ((seen[id] || 0) > at) continue;
      await A.bury('gear', id, at);
    }
    return changed;
  }

  root.LentoGear = {
    STORE: STORE,
    FIELDS: FIELDS,
    kinds: kinds,
    all: all,
    ofKind: ofKind,
    forTool: forTool,
    get: get,
    named: named,
    buried: buried,
    describe: describe,
    blank: blank,
    bare: bare,
    put: put,
    remove: remove,
    setUse: setUse,
    remember: remember,
    read: read,
    sync: sync,
  };
}(window));
