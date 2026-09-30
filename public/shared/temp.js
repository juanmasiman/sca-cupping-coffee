/* ============================================================
   lento — water temperature, in the unit your kettle reads

   WHAT WAS WRONG

   /shared/gear.js has asked every kettle owner whether theirs reads in
   °C or °F since the gear catalogue arrived, and stored the answer on
   the record. Nothing read it. The brew log printed a bare `°`, offered
   a slider that ran 70 to 100, and told a light roast to sit at 96 —
   numbers that are correct in Celsius and meaningless to somebody
   standing in front of a Stagg EKG displaying 201.

   ONE UNIT IN THE RECORD, THE OTHER AT THE GLASS

   Every temperature this project stores is Celsius and always will be,
   whatever the kettle says. A brew logged in 2024 has to mean the same
   thing in 2027, and it would not if the number's unit were a property
   of a kettle the person has since replaced. Conversion happens at the
   two edges — what is drawn, and what is typed — and nowhere in
   between, so nothing downstream has to know which unit anybody reads.

   A DIFFERENCE IS NOT A READING

   The one arithmetic that catches people out: 94 °C is 201 °F, but a
   change of 1 °C is a change of 1.8 °F, not 33.8. `delta` exists so that
   the "+2°" under a brew and the "+3.6°" it becomes are the same fact
   and neither is the freezing point of water. They are separate
   functions for the same reason `null` and `0` are separate values.

   WHY THE STORE GAINS A DECIMAL

   In Fahrenheit the person types whole degrees, and a whole °F is not a
   whole °C. 201 °F is 93.888…, which is stored to one decimal as 93.9
   and drawn back as 201. Round it to 94 instead and the number they
   typed reads back as 201.2 — or, rounded, as 201 that they can never
   nudge to 202 because 202 rounds to the same 94. A Celsius kitchen
   still stores and sees whole numbers, exactly as before.
   ============================================================ */

(function (root) {
  'use strict';

  var UNITS = ['c', 'f'];

  // What the record holds, always, whatever anybody reads.
  var STORED = 'c';

  /* The unit a kettle reads in. `null` on the record means nobody has
     been asked, and Celsius is the answer this project has always given
     — so an unanswered kettle behaves exactly as every kettle did
     before this file existed. */
  function unitOf(kettleName) {
    if (!kettleName || !root.LentoGear) return STORED;
    var d = root.LentoGear.describe('kettle', kettleName);
    var u = d && d.units;
    return UNITS.indexOf(u) >= 0 ? u : STORED;
  }

  function isF(unit) { return unit === 'f'; }

  // A stored Celsius reading, in the unit somebody reads.
  function show(c, unit) {
    if (c === null || typeof c === 'undefined' || c === '') return null;
    var n = Number(c);
    if (!isFinite(n)) return null;
    return isF(unit) ? n * 9 / 5 + 32 : n;
  }

  // And back. One decimal, for the reason at the top of this file.
  function store(shown, unit) {
    if (shown === null || typeof shown === 'undefined' || shown === '') return null;
    var n = Number(shown);
    if (!isFinite(n)) return null;
    return isF(unit) ? Math.round(((n - 32) * 5 / 9) * 10) / 10 : n;
  }

  /* A DIFFERENCE, not a reading: scaled by the ratio alone, with no
     offset. See the note at the top — this is the whole reason the two
     are not one function. */
  function delta(dC, unit) {
    if (dC === null || typeof dC === 'undefined' || dC === '') return null;
    var n = Number(dC);
    if (!isFinite(n)) return null;
    return isF(unit) ? n * 9 / 5 : n;
  }

  /* The number as it is drawn. Whole degrees in both units: a tenth of a
     degree is below what a kettle displays and below what anybody can
     hold, and printing one would be the app claiming a precision the
     kitchen does not have. The decimal lives in the store, where it is
     doing arithmetic, not in the sentence. */
  function fmt(c, unit, opts) {
    var v = show(c, unit);
    if (v === null) return '';
    var o = opts || {};
    return Math.round(v) + (o.bare ? '' : '°' + (isF(unit) ? 'F' : 'C'));
  }

  // "95–97°C". Used for the bands a roast level sits in.
  function band(loC, hiC, unit) {
    var lo = show(loC, unit), hi = show(hiC, unit);
    if (lo === null || hi === null) return '';
    return Math.round(lo) + '–' + Math.round(hi) + '°' + (isF(unit) ? 'F' : 'C');
  }

  /* What the input should allow. The Celsius floor and ceiling have
     always been 70 and 100 — below boiling and above anything worth
     brewing with — and the Fahrenheit pair is the same two temperatures,
     rounded outward so neither end of the real range is unreachable. */
  function bounds(unit) {
    return isF(unit)
      ? { min: 158, max: 212, step: 1, digits: 0 }
      : { min: 70, max: 100, step: 1, digits: 0 };
  }

  /* How far "a degree or two" is in the unit in hand. A Fahrenheit
     degree is a little over half a Celsius one, so the same physical
     nudge is a different sentence — and advice that says "up a degree"
     to somebody whose kettle steps in °F is advice to move half as far
     as it means. */
  function nudgeWords(unit) {
    return isF(unit) ? 'two or three degrees' : 'a degree or two';
  }

  // The word itself, for a label or a heading.
  function unitWord(unit) { return isF(unit) ? '°F' : '°C'; }

  root.LentoTemp = {
    UNITS: UNITS,
    STORED: STORED,
    unitOf: unitOf,
    show: show,
    store: store,
    delta: delta,
    fmt: fmt,
    band: band,
    bounds: bounds,
    nudgeWords: nudgeWords,
    unitWord: unitWord,
  };
}(window));
