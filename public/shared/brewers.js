/* ============================================================
   lento — the brewers, and what each one does to the water

   WHY THIS IS A TABLE AND THE GRIND SETTINGS ARE NOT

   This project refuses brand tables, and is right to. A grind setting
   read out of a model name is stale within a year, wrong about every
   modified machine, and wrong about the bag in your hand.

   How the water leaves the brewer is not that kind of fact. A V60 has a
   hole in it. A press does not. Next year's V60 will still have a hole.
   So the one thing worth shipping about a brewer is the thing that never
   moves — and it happens to be the thing the brew log's whole sheet is
   shaped by: whether there is a pour schedule, whether a drawdown can be
   measured, whether "it ran long" means anything at all.

   The note beside it is the same kind of fact, in a sentence: what the
   brewer asks of you. Not a recipe, not a ratio, not a grind — those are
   the brew log's job and they belong to the coffee, not the cone.

   WHAT YOU SAID ABOUT YOUR OWN BREWER ALWAYS WINS

   Every row here seeds one editable answer once. Somebody who has told
   the app that their Switch is only ever used open has said something
   truer about their mornings than a table can, and `entry` is where that
   precedence lives in each app.

   WHY IT IS SHARED

   The brew log owned this list and needed it to shape a sheet. The front
   door needs it to say what a brewer on your shelf actually is, which is
   the same question answered for a different reason. Two copies of a
   list of facts is two lists within a month.
   ============================================================ */

(function (root) {
  'use strict';

  /* percolation — the water drains through the bed as you pour, so grind
                   sets the flow rate and the clock is a reading.
     immersion   — the coffee sits in the water, so the time is whatever
                   the timer was set to and grind works alone.
     switch      — a valve: it does one, then the other. */

  var ALL = [
    /* ---- cones ---- */
    {
      name: 'Hario V60', flow: 'percolation',
      note: 'One big hole and spiral ribs, so the grind and your pour set the flow. Rewards a steady stream, punishes a rushed one.',
    },
    {
      name: 'Origami', flow: 'percolation',
      note: 'Ribbed cone that takes either a cone or a flat filter, so it can be pulled either way.',
    },
    {
      name: 'Chemex', flow: 'percolation',
      note: 'Thick bonded paper. Slow, and very clean in the cup — most recipes go coarser than a V60 to get the time back.',
    },
    {
      name: 'Melitta', flow: 'percolation',
      note: 'A cone with small holes, so the brewer holds back some of the flow rather than leaving all of it to the grind.',
    },
    {
      name: 'Bee House', flow: 'percolation',
      note: 'Two small holes in a cone. Flow is largely the brewer’s, which makes it forgiving of an uneven pour.',
    },
    {
      name: 'Cafec Flower Dripper', flow: 'percolation',
      note: 'Tall ribs hold the paper off the wall, so the bed drains faster than a plain cone at the same grind.',
    },
    {
      name: 'Hario Mugen', flow: 'percolation',
      note: 'A cone with no ribs, drawn for one continuous pour rather than a schedule.',
    },
    {
      name: 'Timemore Crystal Eye', flow: 'percolation',
      note: 'A cone you can see the bed through, which makes the drawdown easy to read.',
    },

    /* ---- flat beds ---- */
    {
      name: 'Kalita Wave', flow: 'percolation',
      note: 'Flat bed, three small holes. The brewer holds the flow, so pour technique matters less here than in a cone.',
    },
    {
      name: 'Fellow Stagg [X]', flow: 'percolation',
      note: 'Flat bed with a single large hole, so the grind does most of the work of setting the time.',
    },
    {
      name: 'Orea', flow: 'percolation',
      note: 'Flat bed with a wide open base. Very fast, so it takes a finer grind than most flat brewers.',
    },
    {
      name: 'April', flow: 'percolation',
      note: 'Flat bed, open base. Quick drawdown, and an even one if the bed is level.',
    },
    {
      name: 'Blue Bottle Dripper', flow: 'percolation',
      note: 'A single small hole under a shallow bed, which keeps the flow steady without much help.',
    },
    {
      name: 'Tricolate', flow: 'percolation',
      note: 'No bypass — every drop goes through the bed, so the whole pour is extraction. Expect a much finer grind and a long brew.',
    },
    {
      name: 'Next Level Pulsar', flow: 'percolation',
      note: 'No bypass, flat bed. Like the Tricolate, the water cannot go round the coffee.',
    },

    /* ---- valves ---- */
    {
      name: 'Hario Switch', flow: 'switch',
      note: 'A V60 with a valve. Closed it steeps, open it drains — so a recipe here is a sequence of opens and closes, and the log records them.',
    },
    {
      name: 'Clever Dripper', flow: 'switch',
      note: 'Flat bed with a valve that opens when you set it on a cup. Steep for as long as you like, then let it go.',
    },

    /* ---- immersion ---- */
    {
      name: 'French press', flow: 'immersion',
      note: 'Metal mesh, full immersion. Time is whatever you set it to, so grind changes extraction with the clock held still.',
    },
    {
      name: 'Espro Press', flow: 'immersion',
      note: 'A press with a fine double filter, so the cup comes out closer to paper-filtered than mesh.',
    },
    {
      /* The press at the end of an AeroPress is quick and the extraction
         has already happened in the chamber, so it is logged as a steep.
         Anybody who disagrees can say so on their own entry, which is the
         point of the entry. */
      name: 'AeroPress', flow: 'immersion',
      note: 'A sealed chamber, then a short push through paper. The steep is where the extraction happens; the plunge is just getting it out.',
    },
    {
      name: 'Siphon', flow: 'immersion',
      note: 'Immersion over a flame, with the draw down happening when the heat comes off. The temperature stays high throughout.',
    },
    {
      name: 'Cupping bowl', flow: 'immersion',
      note: 'The protocol steep: grounds, water, crust, break. No filter at all.',
    },
  ];

  var FLOWS = ['percolation', 'immersion', 'switch'];

  function byName(name) {
    if (!name) return null;
    for (var i = 0; i < ALL.length; i++) if (ALL[i].name === name) return ALL[i];
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

  /* A brewer the person owns, described. Their own record first — it is
     the only place a corrected answer can live — and the shipped note
     beside it when the name is one this file knows, because correcting
     the flow of your Switch does not make the sentence about valves
     untrue. */
  function describe(mine) {
    if (!mine || !mine.name) return null;
    var base = byName(mine.name);
    var flow = FLOWS.indexOf(mine.flow) >= 0 ? mine.flow : (base ? base.flow : 'percolation');
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
    ALL: ALL,
    FLOWS: FLOWS,
    byName: byName,
    flowOf: flowOf,
    flowLine: flowLine,
    flowWord: flowWord,
    describe: describe,
  };
}(window));
