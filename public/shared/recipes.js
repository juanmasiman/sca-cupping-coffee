/* ============================================================
   lento — a method for each brewer, and the words a method is made of

   WHY THIS IS NOT IN /shared/gear-db.js

   That file's rule is that it ships hardware facts and "never a
   setting, a ratio or a recipe", and the rule is a good one. What it
   was defending against is a SETTING READ OFF A MODEL NAME: a grind
   number that is stale within a year, wrong about every modified
   machine, and specific to a grinder the table has never met.

   A method is a different kind of fact. That a V60 wants a continuous
   pour follows from a 60-degree cone with one large hole and ribs all
   the way down; that a Kalita wants pulses follows from a flat bed and
   three small ones. Those are statements about geometry, they are what
   the makers publish, and they will be as true next year as they are
   now. Nothing here is specific to anybody's kit — there is not a grind
   NUMBER in this file, only a grind CHARACTER, because the number is
   the part that cannot survive leaving the kitchen it was measured in.

   So: its own file, its own rule, stated here. gear-db keeps its
   guarantee, and the two kinds of fact cannot blur into each other by
   sitting in one table.

   A METHOD IS A STARTING POINT AND SAYS SO

   Nothing in here is ever written into somebody's recipe without them
   pressing a button, the same way the roast baseline has always
   behaved. The app's whole argument is that your log beats any table,
   and a table that silently overwrote the thing your log produced
   would be contradicting it.

   WRITTEN TO BE SHARED

   Every method is plain JSON — no functions, no regular expressions, no
   references to anything outside itself — and carries an `id`, a `v`
   and an `origin`. A method somebody writes themselves is the same
   shape with `origin: 'mine'`, so the day recipes travel between people
   there is no second format to invent and no migration to run. `valid`
   is here for that day: it is what you check an incoming method with
   before you let it near a brew.

   WATER IS A FRACTION, NOT A NUMBER

   Every pour is a share of the total, so the same method scales from a
   single cup to a carafe without a second table. `brew(method, dose)`
   turns it into grams and clock times. The bloom is the exception and
   is a MULTIPLE OF THE DOSE, because that is the thing it is actually
   proportional to and the way every brewer says it out loud — two to
   three times the dose, not "twelve percent of the water".
   ============================================================ */

(function (root) {
  'use strict';

  /* ---------- the words ----------

     `do` is what you do. Everything else is how.

       bloom   wet the bed and wait. `x` is a multiple of the dose.
       pour    water in, up to a running total `to` (a fraction of the
               whole). `style` says how it goes in.
       agitate move the bed without adding water.
       close   shut the valve  — Switch, Clever
       open    let it go
       press   plunge          — AeroPress, French press
       wait    nothing happens on purpose: steeping, or the drawdown
       serve   it is done; `at` is what the clock should read

     `at` is seconds from the first drop of water. `null` means "when
     the bed has drained", which is the honest answer for the last
     stages of a slow brewer and for anything after a plunge. */

  var STYLES = {
    centre: 'in the centre',
    spiral: 'out in a spiral and back',
    pulse: 'in one steady pulse',
    wall: 'around the wall',
    gentle: 'gently, low to the bed',
    high: 'from high, to cut into the bed',
  };

  var AGITATE = {
    swirl: 'Swirl the brewer',
    stir: 'Stir once through',
    rao: 'Spin the slurry flat',
    tap: 'Tap it level on the counter',
    crust: 'Break the crust with a spoon',
    skim: 'Skim the foam off',
  };

  var GRINDS = ['fine', 'medium-fine', 'medium', 'medium-coarse', 'coarse'];

  /* ---------- the methods ----------

     One per brewer, keyed by the name gear-db uses, so a brewer on
     somebody's shelf finds its own method without a second lookup
     table. `why` is one or two sentences on what the geometry is doing
     — it is the part that makes the method teachable rather than
     copied, and it is the part a person needs when they want to change
     it on purpose. */

  var METHODS = [
    /* ---- cones ---- */
    {
      id: 'v60-continuous', v: 1, origin: 'built-in', brewer: 'Hario V60',
      title: 'Bloom, then two pours', dose: 15, ratio: 16.7, temp: 96, grind: 'medium-fine',
      why: 'A 60-degree cone with one large hole and ribs to the bottom drains as fast as you pour, so the grind sets the time and the pour keeps the bed moving. Nothing here is holding water back; you are.',
      steps: [
        { at: 0, do: 'bloom', x: 3, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 75, do: 'pour', to: 1, style: 'centre' },
        { at: 105, do: 'agitate', how: 'swirl', say: 'Settle the bed flat' },
        { at: null, do: 'wait', say: 'Let it draw down' },
        { at: 195, do: 'serve' },
      ],
    },
    {
      id: 'origami-cone', v: 1, origin: 'built-in', brewer: 'Origami',
      title: 'Fast cone, three pours', dose: 15, ratio: 16, temp: 94, grind: 'medium-fine',
      why: 'The twenty folds hold the paper off the wall everywhere at once, so it drains faster than a V60 at the same grind. Three pours keep the bed from running dry between them.',
      steps: [
        { at: 0, do: 'bloom', x: 2.5, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 40, do: 'pour', to: 0.5, style: 'spiral' },
        { at: 70, do: 'pour', to: 0.8, style: 'centre' },
        { at: 95, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 180, do: 'serve' },
      ],
    },
    {
      id: 'chemex-slow', v: 1, origin: 'built-in', brewer: 'Chemex',
      title: 'Thick paper, patient pours', dose: 30, ratio: 16, temp: 94, grind: 'medium-coarse',
      why: 'The paper is three times the weight of a cone filter and does most of the restricting, so the grind goes coarser than it looks like it should. Rinse it or you will taste it.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'spiral' },
        { at: 45, do: 'pour', to: 0.4, style: 'spiral' },
        { at: 90, do: 'pour', to: 0.7, style: 'spiral' },
        { at: 135, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait', say: 'The drawdown is long here' },
        { at: 270, do: 'serve' },
      ],
    },
    {
      id: 'cafec-flower', v: 1, origin: 'built-in', brewer: 'Cafec Flower Dripper',
      title: 'Deep ribs, steady pours', dose: 15, ratio: 16, temp: 94, grind: 'medium-fine',
      why: 'The flower ribs keep an air channel open all the way down even when the paper is soaked, so it drains freely and evenly. Treat it as a V60 that is harder to choke.',
      steps: [
        { at: 0, do: 'bloom', x: 2.5, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 80, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 180, do: 'serve' },
      ],
    },
    {
      id: 'mugen-single', v: 1, origin: 'built-in', brewer: 'Hario Mugen',
      title: 'One pour, straight through', dose: 15, ratio: 15, temp: 93, grind: 'medium',
      why: 'No ribs and a single hole: the paper seals to the wall and the flow is deliberately restricted, which is the point — it is built for one continuous pour and nothing else. Pulsing it fights the design.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 30, do: 'pour', to: 1, style: 'spiral', say: 'One continuous pour, no pauses' },
        { at: null, do: 'wait' },
        { at: 180, do: 'serve' },
      ],
    },
    {
      id: 'crystal-eye', v: 1, origin: 'built-in', brewer: 'Timemore Crystal Eye',
      title: 'Cone, two pours', dose: 15, ratio: 16, temp: 94, grind: 'medium-fine',
      why: 'A glass cone with a large single hole, so it behaves like a V60 and loses a little less heat than plastic through the brew.',
      steps: [
        { at: 0, do: 'bloom', x: 2.5, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 80, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 180, do: 'serve' },
      ],
    },
    {
      id: 'melitta-wedge', v: 1, origin: 'built-in', brewer: 'Melitta',
      title: 'Wedge, slow and simple', dose: 15, ratio: 16, temp: 93, grind: 'medium',
      why: 'Small holes in a wedge bottom do the restricting, so the water sits deeper and longer than in a cone. Fewer, bigger pours; do not chase it with the grinder.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'spiral' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 100, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 240, do: 'serve' },
      ],
    },
    {
      id: 'beehouse', v: 1, origin: 'built-in', brewer: 'Bee House',
      title: 'Two holes, two pours', dose: 15, ratio: 16, temp: 93, grind: 'medium',
      why: 'Two small holes hold the water up, which makes it forgiving of a clumsy pour and slow to respond to a grind change. Read the clock, not the stream.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'spiral' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 100, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 225, do: 'serve' },
      ],
    },

    {
      id: 'kono-low-ribs', v: 1, origin: 'built-in', brewer: 'Kono Meimon',
      title: 'Seal high, drain low', dose: 20, ratio: 15, temp: 93, grind: 'medium',
      why: 'Ribs only near the bottom, so once the paper is wet it seals to the wall higher up and the water has nowhere to go but through the bed. That is why it is brewed slowly, from the centre, with almost no agitation.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 60, do: 'pour', to: 0.5, style: 'centre', say: 'Stay in the middle' },
        { at: 120, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 240, do: 'serve' },
      ],
    },
    {
      id: 'december-open', v: 1, origin: 'built-in', brewer: 'December Dripper',
      title: 'Set the hole, then pour once', dose: 18, ratio: 16, temp: 94, grind: 'medium',
      why: 'The flow is a dial here rather than a consequence, so change one thing at a time: pick an opening, leave it, and dial the grind against it. Two variables doing the same job is how a dripper like this gets confusing.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'spiral', say: 'Half open' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 1, style: 'spiral' },
        { at: null, do: 'wait' },
        { at: 195, do: 'serve' },
      ],
    },
    {
      id: 'graycano-big', v: 1, origin: 'built-in', brewer: 'Graycano',
      title: 'Big cone, big dose', dose: 30, ratio: 16, temp: 96, grind: 'medium',
      why: 'Aluminium holds heat through a long brew, which is what a large dose needs. Preheat it or the first pour lands in a cold cone.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.5, style: 'spiral' },
        { at: 90, do: 'pour', to: 0.8, style: 'spiral' },
        { at: 130, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 255, do: 'serve' },
      ],
    },
    {
      id: 'gabi-lid', v: 1, origin: 'built-in', brewer: 'Gabi Master A',
      title: 'Let the lid do the pouring', dose: 15, ratio: 16, temp: 94, grind: 'medium-fine',
      why: 'The perforated lid spreads the stream across the whole bed, so pour technique stops being a variable. Pour into the middle of the lid and let it distribute.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 45, do: 'pour', to: 0.6, style: 'centre' },
        { at: 85, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 195, do: 'serve' },
      ],
    },

    /* ---- flat beds ---- */
    {
      id: 'kalita-pulse', v: 1, origin: 'built-in', brewer: 'Kalita Wave',
      title: 'Flat bed, four pulses', dose: 20, ratio: 16, temp: 93, grind: 'medium',
      why: 'A flat bottom with three small holes and a wavy paper that touches almost nothing: the bed stays level and the flow is restricted by the holes rather than the grind. Pulse to keep it flooded — let it run dry between pours and the bed cracks.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 45, do: 'pour', to: 0.4, style: 'pulse' },
        { at: 75, do: 'pour', to: 0.6, style: 'pulse' },
        { at: 105, do: 'pour', to: 0.8, style: 'pulse' },
        { at: 135, do: 'pour', to: 1, style: 'pulse' },
        { at: null, do: 'wait' },
        { at: 210, do: 'serve' },
      ],
    },
    {
      id: 'stagg-x', v: 1, origin: 'built-in', brewer: 'Fellow Stagg [X]',
      title: 'Flooded flat bed', dose: 20, ratio: 16, temp: 96, grind: 'medium',
      why: 'A flat bed over one large hole, so it wants to be kept full rather than pulsed dry. The double wall holds temperature better than anything else on this list.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 30, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 90, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 210, do: 'serve' },
      ],
    },
    {
      id: 'orea-fast', v: 1, origin: 'built-in', brewer: 'Orea',
      title: 'Flat and fast, ground finer', dose: 15, ratio: 16, temp: 95, grind: 'medium-fine',
      why: 'Very little paper contact and a wide open base, so it drains faster than anything else with a flat bed. The grind goes finer than a Kalita to give the water something to work against.',
      steps: [
        { at: 0, do: 'bloom', x: 2.5, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.5, style: 'spiral' },
        { at: 75, do: 'pour', to: 0.75, style: 'pulse' },
        { at: 100, do: 'pour', to: 1, style: 'pulse' },
        { at: 130, do: 'agitate', how: 'rao' },
        { at: null, do: 'wait' },
        { at: 195, do: 'serve' },
      ],
    },
    {
      id: 'april-pulse', v: 1, origin: 'built-in', brewer: 'April',
      title: 'High extraction, small pulses', dose: 18, ratio: 16.7, temp: 96, grind: 'medium-fine',
      why: 'Built for a high extraction: it drains fast, so the method leans on many small pours and a flat finish rather than on a fine grind.',
      steps: [
        { at: 0, do: 'bloom', x: 2.5, style: 'spiral' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 0.45, style: 'pulse' },
        { at: 70, do: 'pour', to: 0.65, style: 'pulse' },
        { at: 95, do: 'pour', to: 0.85, style: 'pulse' },
        { at: 120, do: 'pour', to: 1, style: 'pulse' },
        { at: 150, do: 'agitate', how: 'rao' },
        { at: null, do: 'wait' },
        { at: 210, do: 'serve' },
      ],
    },
    {
      id: 'bluebottle-one', v: 1, origin: 'built-in', brewer: 'Blue Bottle Dripper',
      title: 'One hole, two pours', dose: 20, ratio: 16, temp: 94, grind: 'medium-coarse',
      why: 'A single small hole under a flat bed makes this one of the slowest drippers here, and the restriction is the dripper rather than the coffee. Grind coarser than instinct says.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 45, do: 'pour', to: 0.6, style: 'spiral' },
        { at: 105, do: 'pour', to: 1, style: 'centre' },
        { at: null, do: 'wait' },
        { at: 240, do: 'serve' },
      ],
    },

    /* ---- no bypass ---- */
    {
      id: 'tricolate-long', v: 1, origin: 'built-in', brewer: 'Tricolate',
      title: 'No bypass, ground fine, left alone', dose: 20, ratio: 16, temp: 99, grind: 'fine',
      why: 'No water can get round the bed, so every drop that reaches the cup has been through the coffee. That is why the grind is espresso-adjacent and the water is near boiling — and why agitating it does more harm than good.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 45, do: 'pour', to: 1, style: 'gentle', say: 'Fill it and leave it alone' },
        { at: null, do: 'wait', say: 'No swirling, no stirring' },
        { at: 420, do: 'serve' },
      ],
    },
    {
      id: 'pulsar-press', v: 1, origin: 'built-in', brewer: 'Next Level Pulsar',
      title: 'No bypass, pressure-driven', dose: 18, ratio: 16, temp: 96, grind: 'fine',
      why: 'The water is pushed through a sealed flat bed rather than falling through it, so the grind is fine and the contact is short. Every drop goes through the coffee.',
      steps: [
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 30, do: 'pour', to: 1, style: 'gentle' },
        { at: null, do: 'wait' },
        { at: 150, do: 'serve' },
      ],
    },

    /* ---- the valve ---- */
    {
      id: 'switch-hybrid', v: 1, origin: 'built-in', brewer: 'Hario Switch',
      title: 'Steep closed, then let it drain', dose: 15, ratio: 16, temp: 94, grind: 'medium',
      why: 'It is a V60 with a valve, so it can be both: steep for the sweetness and the body an immersion gives, then open it and let the bed do the last of the work. Closed, the grind stops setting the time and the clock does.',
      steps: [
        { at: 0, do: 'close' },
        { at: 0, do: 'bloom', x: 2, style: 'centre' },
        { at: 10, do: 'agitate', how: 'swirl' },
        { at: 45, do: 'pour', to: 1, style: 'spiral' },
        { at: 50, do: 'wait', say: 'Steeping with the valve shut' },
        { at: 105, do: 'open', say: 'Open it and let it drain' },
        { at: null, do: 'wait' },
        { at: 195, do: 'serve' },
      ],
    },
    {
      id: 'clever-immersion', v: 1, origin: 'built-in', brewer: 'Clever Dripper',
      title: 'Full immersion, released', dose: 18, ratio: 16, temp: 94, grind: 'medium-coarse',
      why: 'The valve only opens when the dripper sits on a cup, so this is an immersion brew with a paper filter at the end of it: the body of a French press without the silt. Grind sets almost nothing here — the clock does.',
      steps: [
        { at: 0, do: 'close' },
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'All the water at once' },
        { at: 30, do: 'agitate', how: 'stir' },
        { at: 35, do: 'wait', say: 'Steeping' },
        { at: 180, do: 'agitate', how: 'stir' },
        { at: 185, do: 'open', say: 'Set it on the cup to release' },
        { at: null, do: 'wait' },
        { at: 300, do: 'serve' },
      ],
    },

    /* ---- immersion ---- */
    {
      id: 'press-clean', v: 1, origin: 'built-in', brewer: 'French press',
      title: 'Steep, skim, and do not plunge hard', dose: 30, ratio: 16, temp: 95, grind: 'coarse',
      why: 'The grind cannot change the time here — the timer does — so it is set coarse for the screen rather than for the extraction. Breaking and skimming the crust takes most of the silt out before the plunger ever moves.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'All the water at once' },
        { at: 240, do: 'agitate', how: 'crust' },
        { at: 255, do: 'agitate', how: 'skim' },
        { at: 300, do: 'wait', say: 'Let the fines settle' },
        { at: 480, do: 'press', say: 'Press just to the surface, not through' },
        { at: 495, do: 'serve' },
      ],
    },
    {
      id: 'espro-fine', v: 1, origin: 'built-in', brewer: 'Espro Press',
      title: 'Double screen, finer grind', dose: 30, ratio: 16, temp: 95, grind: 'medium-coarse',
      why: 'The double micro-filter catches what a mesh screen does not, so it takes a finer grind and a shorter steep than a French press and still pours clean.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre' },
        { at: 30, do: 'agitate', how: 'stir' },
        { at: 210, do: 'press', say: 'Press all the way down' },
        { at: 225, do: 'serve' },
      ],
    },
    {
      id: 'aeropress-standard', v: 1, origin: 'built-in', brewer: 'AeroPress',
      title: 'Steep, stir, press slowly', dose: 15, ratio: 14, temp: 90, grind: 'medium-fine',
      why: 'A short immersion finished with gentle pressure, and the pressure is the part people rush. Cooler than a pour-over on purpose: the paper and the plunger both push extraction up.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre' },
        { at: 15, do: 'agitate', how: 'stir' },
        { at: 20, do: 'wait', say: 'Steeping' },
        { at: 105, do: 'agitate', how: 'stir' },
        { at: 120, do: 'press', say: 'Thirty seconds of even pressure' },
        { at: 150, do: 'serve' },
      ],
    },
    {
      id: 'siphon-clean', v: 1, origin: 'built-in', brewer: 'Siphon',
      title: 'Full immersion at temperature', dose: 20, ratio: 15, temp: 93, grind: 'medium',
      why: 'The only brewer here that holds its temperature all the way through, because the heat is underneath it. That is the whole reason to own one, and it means the contact time can be short.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'Coffee into the risen water' },
        { at: 10, do: 'agitate', how: 'stir' },
        { at: 15, do: 'wait', say: 'Steeping at temperature' },
        { at: 75, do: 'agitate', how: 'stir' },
        { at: 90, do: 'wait', say: 'Off the heat, let it draw down' },
        { at: 150, do: 'serve' },
      ],
    },
    {
      id: 'delter-push', v: 1, origin: 'built-in', brewer: 'Delter Coffee Press',
      title: 'Push, never pull', dose: 15, ratio: 15, temp: 94, grind: 'medium-fine',
      why: 'The valve stops water being drawn back through the bed on the up-stroke, so the contact time is only what you pushed. Short, clean, and unusually repeatable.',
      steps: [
        { at: 0, do: 'pour', to: 0.3, style: 'gentle', say: 'Wet the bed and let it sit' },
        { at: 30, do: 'pour', to: 1, style: 'gentle' },
        { at: 40, do: 'press', say: 'Slow, even strokes' },
        { at: 90, do: 'serve' },
      ],
    },
    {
      id: 'coldbrew-long', v: 1, origin: 'built-in', brewer: 'Cold brew steeper',
      title: 'The clock is the recipe', dose: 100, ratio: 8, temp: null, grind: 'coarse',
      why: 'Cold water takes almost no acid with it, so the cup is built from time rather than temperature. Brewed as a concentrate at 1:8 and cut to taste, which is what the ratio here means.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'Cold or room-temperature water' },
        { at: 60, do: 'agitate', how: 'stir' },
        { at: null, do: 'wait', say: 'Sixteen to twenty hours, then strain' },
        { at: null, do: 'serve', say: 'Cut the concentrate to taste' },
      ],
    },
    {
      id: 'moka-gentle', v: 1, origin: 'built-in', brewer: 'Moka pot',
      title: 'Hot water in, low heat under', dose: 18, ratio: 9, temp: 99, grind: 'medium-fine',
      why: 'Start with water already hot and keep the flame low: the thing that makes a moka pot taste burnt is the base cooking while the water climbs. Take it off the heat the moment the stream turns pale and gurgles.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'Hot water into the base, to the valve' },
        { at: null, do: 'wait', say: 'Low heat, lid open so you can watch' },
        { at: null, do: 'serve', say: 'Off the heat when the stream goes pale' },
      ],
    },
    {
      id: 'moccamaster-batch', v: 1, origin: 'built-in', brewer: 'Moccamaster',
      title: 'Grind and ratio, nothing else', dose: 60, ratio: 16, temp: 93, grind: 'medium',
      why: 'There is no pour schedule to get wrong, which is the whole appeal: it holds brew temperature and does the same thing every morning. Level the bed before you start and the shower head does the rest.',
      steps: [
        { at: 0, do: 'agitate', how: 'tap', say: 'Level the bed in the basket' },
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'All the water into the reservoir' },
        { at: null, do: 'wait', say: 'It brews on its own' },
        { at: null, do: 'agitate', how: 'stir', say: 'Stir the carafe before pouring' },
        { at: null, do: 'serve' },
      ],
    },
    {
      id: 'wilfa-batch', v: 1, origin: 'built-in', brewer: 'Wilfa Svart / Performance',
      title: 'Batch, with a bloom you control', dose: 60, ratio: 16, temp: 93, grind: 'medium',
      why: 'The one part of a pour schedule that changes the cup is the bloom, and this is a batch brewer that gives it back to you. Use it, especially on a fresh bag.',
      steps: [
        { at: 0, do: 'agitate', how: 'tap', say: 'Level the bed in the basket' },
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'All the water into the reservoir' },
        { at: null, do: 'wait', say: 'Bloom setting on, then it brews' },
        { at: null, do: 'agitate', how: 'stir', say: 'Stir the carafe before pouring' },
        { at: null, do: 'serve' },
      ],
    },
    {
      id: 'phin-drip', v: 1, origin: 'built-in', brewer: 'Phin',
      title: 'Gravity sets the flow', dose: 20, ratio: 6, temp: 96, grind: 'medium-coarse',
      why: 'The press sits on the bed under its own weight and the holes do the restricting, so the grind is read off the clock rather than chosen. Traditionally a small, strong cup rather than a filter-strength one.',
      steps: [
        { at: 0, do: 'bloom', x: 1.5, style: 'centre' },
        { at: 45, do: 'pour', to: 1, style: 'gentle' },
        { at: null, do: 'wait', say: 'It should drip, not run' },
        { at: 300, do: 'serve' },
      ],
    },
    {
      id: 'cezve-three', v: 1, origin: 'built-in', brewer: 'Cezve / ibrik',
      title: 'Up three times, never boiling', dose: 7, ratio: 10, temp: null, grind: 'fine',
      why: 'Ground finer than espresso and never actually boiled: bring the foam up, take it off, let it fall, three times. The grounds go into the cup and settle, which is the tradition rather than a fault.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'Cold water, coffee stirred in' },
        { at: 0, do: 'agitate', how: 'stir', say: 'Stir once, then leave it' },
        { at: null, do: 'wait', say: 'Low heat until the foam rises' },
        { at: null, do: 'wait', say: 'Off the heat, let it fall — three times' },
        { at: null, do: 'serve', say: 'Pour gently and let it settle' },
      ],
    },
    {
      id: 'cupping-protocol', v: 1, origin: 'built-in', brewer: 'Cupping bowl',
      title: 'The protocol, not a recipe', dose: 8.25, ratio: 18.18, temp: 93, grind: 'coarse',
      why: 'This is the SCA cupping protocol rather than a method anybody chose: 8.25g per 150ml, water off the boil, crust broken at four minutes. It is here so the ratio and the clock are the standard ones when you are scoring rather than drinking.',
      steps: [
        { at: 0, do: 'pour', to: 1, style: 'centre', say: 'Pour to the rim' },
        { at: 240, do: 'agitate', how: 'crust', say: 'Break the crust and smell' },
        { at: 255, do: 'agitate', how: 'skim' },
        { at: 480, do: 'serve', say: 'Taste as it cools' },
      ],
    },
  ];

  /* ---------- reading one ---------- */

  /* The method for a brewer somebody owns.

     Exact first. Then the longest catalogue name theirs BEGINS WITH,
     because people name a brewer with its size — "Hario V60 02",
     "Kalita Wave 185" — and a V60 02 is a V60. Longest wins so that a
     name matching two entries takes the more specific one.

     A prefix and not a substring: "not a V60" would match a substring
     test, and a method is the wrong thing to be loose about. A name
     that matches nothing returns null and the surfaces show no method,
     which is the right answer for a brewer this file has never met. */
  function forBrewer(name) {
    if (!name) return null;
    var n = String(name).trim();
    var best = null;
    for (var i = 0; i < METHODS.length; i++) {
      var b = METHODS[i].brewer;
      if (b === n) return METHODS[i];
      if (n.indexOf(b) === 0 && (!best || b.length > best.brewer.length)) best = METHODS[i];
    }
    return best;
  }

  function byId(id) {
    for (var i = 0; i < METHODS.length; i++) if (METHODS[i].id === id) return METHODS[i];
    return null;
  }

  /* ---------- scaling one ----------

     The dose is the only input. Water comes from the ratio, each pour
     from its fraction of that, and the bloom from its multiple of the
     dose — so the same method works at 12g and at 60g without a second
     table and without anybody doing arithmetic at the counter.

     Pours are rounded to whole grams, because that is what a brew scale
     shows and a running total ending in .4 is a number nobody can hit.
     The rounding is applied to the RUNNING TOTAL rather than to each
     pour, so the totals still add up to the water exactly. */
  function brew(method, dose) {
    if (!method) return null;
    var d = Number(dose);
    if (!isFinite(d) || d <= 0) d = method.dose;
    var water = d * method.ratio;
    var out = [];
    var at = 0;

    method.steps.forEach(function (s) {
      var step = { do: s.do, at: s.at, style: s.style || null, how: s.how || null, say: s.say || '' };
      if (s.do === 'bloom') {
        at = Math.round(d * s.x);
        step.water = at;
        step.total = at;
      } else if (s.do === 'pour') {
        var total = Math.round(water * s.to);
        step.water = Math.max(0, total - at);
        step.total = total;
        at = total;
      }
      out.push(step);
    });

    return { method: method, dose: Math.round(d * 10) / 10, water: Math.round(water), steps: out };
  }

  /* One line per step, in the words somebody would use out loud. The
     clock is formatted by the host, because the two instruments do not
     agree on how to write 1:05 and this file should not have an
     opinion. */
  function line(step, fmtTime) {
    var t = typeof fmtTime === 'function' ? fmtTime : function (s) {
      var m = Math.floor(s / 60);
      var r = Math.round(s % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    };
    var when = step.at === null ? '' : t(step.at);
    var what;
    if (step.do === 'bloom') {
      what = 'Bloom with ' + step.water + ' g';
      if (step.style && STYLES[step.style]) what += ', ' + STYLES[step.style];
    } else if (step.do === 'pour') {
      what = 'Pour to ' + step.total + ' g';
      if (step.style && STYLES[step.style]) what += ', ' + STYLES[step.style];
    } else if (step.do === 'agitate') {
      what = AGITATE[step.how] || 'Agitate';
    } else if (step.do === 'close') {
      what = 'Close the valve';
    } else if (step.do === 'open') {
      what = 'Open the valve';
    } else if (step.do === 'press') {
      what = 'Press';
    } else if (step.do === 'wait') {
      what = step.say || 'Wait';
    } else {
      what = 'Done';
    }
    // `say` replaces the generated phrase where a step carries one,
    // except on the two that build a number into it.
    if (step.say && step.do !== 'bloom' && step.do !== 'pour' && step.do !== 'wait') what = step.say;
    else if (step.say && (step.do === 'bloom' || step.do === 'pour')) what += ' — ' + step.say;
    return { when: when, what: what };
  }

  /* The schedule, in the shape the brew log's own pour rows use: a
     running total and the clock time it should be reached at, and a
     valve row where the method opens or closes one.

     The valve rows are not decoration. A Switch brew's drawdown is
     measured from the last Open rather than the last pour — a bed can
     sit full and closed for a minute after the final pour — so a
     schedule written without them would report a two-minute drawdown
     for a bed that drained in forty seconds. */
  function pours(scaled) {
    if (!scaled) return [];
    return scaled.steps
      .filter(function (s) {
        if (s.at === null) return false;
        return s.do === 'bloom' || s.do === 'pour' || s.do === 'open' || s.do === 'close';
      })
      .map(function (s) {
        if (s.do === 'open' || s.do === 'close') return { at: s.at, valve: s.do };
        return { at: s.at, water: s.total };
      });
  }

  /* What the clock should read when it is finished, or null when the
     method does not say.

     THE SERVE STEP, not "the last step that carries a time".

     Some methods genuinely cannot name a finish. A moka pot is done
     when the stream turns pale, a Moccamaster when it stops, a cezve
     after the third rise — all of those are `serve` steps with `at:
     null` on purpose, and every step after their one timed pour is null
     too. Scanning backwards for the last number found that pour's `at:
     0` and reported the brew as finishing at zero seconds, which the
     brew log then turned into a thirty-second window on a brewer that
     takes four minutes.

     Null is the honest answer there, and callers have to handle it —
     which is why this returns one rather than a plausible guess. */
  function totalTime(method) {
    for (var i = method.steps.length - 1; i >= 0; i--) {
      if (method.steps[i].do === 'serve') return method.steps[i].at;
    }
    return null;
  }

  /* ---------- for the day methods travel ----------

     A method that arrives from somewhere else is data, and this is what
     you check it with. It is strict on purpose: a method with a step
     this file cannot draw is a method that would render as a blank
     line at somebody's brewer. */
  var DOES = ['bloom', 'pour', 'agitate', 'close', 'open', 'press', 'wait', 'serve'];

  function valid(m) {
    if (!m || typeof m !== 'object') return 'not an object';
    if (!m.id || typeof m.id !== 'string') return 'no id';
    if (typeof m.v !== 'number') return 'no version';
    if (!m.brewer || typeof m.brewer !== 'string') return 'no brewer';
    if (!(m.ratio > 0)) return 'no ratio';
    if (!(m.dose > 0)) return 'no dose';
    if (m.temp !== null && !(m.temp > 0)) return 'bad temperature';
    if (m.grind && GRINDS.indexOf(m.grind) < 0) return 'unknown grind: ' + m.grind;
    if (!Array.isArray(m.steps) || !m.steps.length) return 'no steps';
    // Every method ends. A schedule with no serve has no last line, and
    // `totalTime` would have nothing to read.
    if (!m.steps.some(function (x) { return x && x.do === 'serve'; })) return 'no serve step';
    var last = -1;
    for (var i = 0; i < m.steps.length; i++) {
      var s = m.steps[i];
      if (!s || DOES.indexOf(s.do) < 0) return 'step ' + i + ': unknown action';
      if (s.at !== null && !(typeof s.at === 'number' && s.at >= 0)) return 'step ' + i + ': bad time';
      // Times must not run backwards, or the schedule cannot be brewed.
      if (typeof s.at === 'number') {
        if (s.at < last) return 'step ' + i + ': the clock goes backwards';
        last = s.at;
      }
      if (s.do === 'bloom' && !(s.x > 0)) return 'step ' + i + ': bloom needs a multiple of the dose';
      if (s.do === 'pour' && !(s.to > 0 && s.to <= 1)) return 'step ' + i + ': a pour is a fraction of the water';
      if (s.do === 'agitate' && !AGITATE[s.how]) return 'step ' + i + ': unknown agitation';
      if (s.style && !STYLES[s.style]) return 'step ' + i + ': unknown pour style';
    }
    return null;
  }

  root.LentoRecipes = {
    STYLES: STYLES,
    AGITATE: AGITATE,
    GRINDS: GRINDS,
    DOES: DOES,
    get ALL() { return METHODS; },
    forBrewer: forBrewer,
    byId: byId,
    brew: brew,
    line: line,
    pours: pours,
    totalTime: totalTime,
    valid: valid,
  };
}(window));
