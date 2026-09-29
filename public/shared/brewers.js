/* ============================================================
   lento — how the water leaves a brewer, in words

   The list itself moved to /shared/gear-db.js, which holds the four
   catalogues — grinders, brewers, kettles, machines — so that the one
   screen where you add and correct your gear has one place to read
   from. This file is what is left, and it is the part that is not a
   list: the vocabulary three surfaces share for the one fact about a
   brewer that shapes everything else.

   percolation — the water drains through the bed as you pour, so grind
                 sets the flow rate and the clock is a reading.
   immersion   — the coffee sits in the water, so the time is whatever
                 the timer was set to and grind works alone.
   switch      — a valve: it does one, then the other.

   The brew log's whole sheet is shaped by which of the three it is:
   whether there is a pour schedule, whether a drawdown can be
   measured, whether "it ran long" means anything at all.
   ============================================================ */

(function (root) {
  'use strict';

  var FLOWS = ['percolation', 'immersion', 'switch'];

  function table() { return root.LentoGearDB ? root.LentoGearDB.BREWERS : []; }

  function byName(name) {
    if (!name) return null;
    var list = table();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  function flowOf(name) {
    var e = byName(name);
    return e ? e.flow : null;
  }

  // What the flow means, in the words the apps use for it. One clause,
  // because it goes on a line beside the brewer's name.
  function flowLine(flow) {
    if (flow === 'immersion') return 'Immersion — the coffee steeps';
    if (flow === 'switch') return 'Switch — it steeps, then it drains';
    return 'Pour over — the water drains as you pour';
  }

  // The single word, for a row that has no space for the clause.
  function flowWord(flow) {
    if (flow === 'immersion') return 'immersion';
    if (flow === 'switch') return 'switch';
    return 'pour over';
  }

  /* A brewer somebody owns, described. Their own record first — it is
     the only place a corrected answer can live — and the shipped note
     beside it when the name is one the catalogue knows, because
     correcting the flow of your Switch does not make the sentence about
     valves untrue.

     It prefers the gear record over the raw argument where there is
     one, so a brewer corrected on the front door reads correctly
     everywhere without each caller having to know that. */
  function describe(mine) {
    if (!mine || !mine.name) return null;
    var owned = root.LentoGear ? root.LentoGear.describe('brewer', mine.name) : null;
    var base = byName(mine.name);
    var flow = FLOWS.indexOf(mine.flow) >= 0 ? mine.flow
      : (owned && FLOWS.indexOf(owned.flow) >= 0 ? owned.flow : (base ? base.flow : 'percolation'));
    return {
      name: mine.name,
      flow: flow,
      known: Boolean(base),
      // Only where the person has not contradicted it. A note explaining
      // how a valve works, under a brewer its owner has told us never
      // steeps, is the table arguing with the person.
      note: base && base.flow === flow ? base.note : '',
    };
  }

  root.LentoBrewers = {
    // The catalogue, for the brew log's picker. A getter, because
    // gear-db may not have run when this file is evaluated.
    get ALL() { return table(); },
    FLOWS: FLOWS,
    byName: byName,
    flowOf: flowOf,
    flowLine: flowLine,
    flowWord: flowWord,
    describe: describe,
  };
}(window));
