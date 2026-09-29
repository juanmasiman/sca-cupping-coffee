/* ============================================================
   lento — what is known about the gear itself

   WHAT BELONGS IN A TABLE AND WHAT DOES NOT

   This project refuses brand tables, and it is right about what it was
   refusing: a grind setting read out of a model name is stale within a
   year, wrong about every modified machine, and wrong about the bag in
   your hand. Nothing in this file is a setting, a ratio or a recipe.

   What is here is hardware. A Comandante has conical burrs and counts
   clicks. A V60 has a hole in it and takes a cone filter. A Bambino has
   a 54mm portafilter. Next year's will too. These are the facts that do
   not move, and they are exactly the facts the apps need in order to
   stop asking for them: a dial-in that knows the portafilter is 54mm
   does not ask, and one that knows the grinder counts clicks stops
   offering tenths of a setting.

   WHAT YOU SAID ABOUT YOUR OWN GEAR ALWAYS WINS

   Every row here seeds editable answers once. Somebody who has swapped
   the burrs in their DF64, PID'd their Gaggia, or only ever uses their
   Switch open has said something truer about their kitchen than a table
   can, and their answer is what every reader takes.

   NULL IS AN ANSWER, AND IT IS THE HONEST ONE

   A field left null here means nobody has established it, and the app
   asks. That is deliberate and it is the rule this file is held to: a
   wrong attribute is worse than an absent one, because an absent one
   costs a tap and a wrong one quietly changes advice. Where a name
   covers several machines that differ — "Eureka Mignon" is a family,
   and the burr size is not the same across it — the field is null
   rather than the most likely guess.

   LEGACY NAMES

   A row marked `legacy` still resolves, so somebody whose kit already
   names it keeps their answers, but it is not offered when adding gear.
   It is how a compound entry gets split without orphaning anybody.
   ============================================================ */

(function (root) {
  'use strict';

  /* ---------- grinders ----------

     drive    electric | manual
     burr     conical | flat
     burrSize across the burrs, in mm
     adjust   stepless | stepped | clicks
                stepped is a numbered dial with detents; clicks is a
                collar counted from zero, which is what hand grinders
                and a few electrics do. Both are discrete — the
                difference is what the number means to the person.
     retains  does it hold grounds between settings? The whole "grind
              for the big moves, dose for the small ones" rule exists
              because a grind change costs a purge, and on a single
              doser it costs nothing. */

  var GRINDERS = [
    // --- electric, flat ---
    { name: 'DF64 / DF64 Gen 2', drive: 'electric', burr: 'flat', burrSize: 64, adjust: 'stepless', retains: false },
    { name: 'DF54', drive: 'electric', burr: 'flat', burrSize: 54, adjust: 'stepless', retains: false },
    { name: 'Turin DF83', drive: 'electric', burr: 'flat', burrSize: 83, adjust: 'stepless', retains: false },
    { name: 'Option-O Lagom P64', drive: 'electric', burr: 'flat', burrSize: 64, adjust: 'stepless', retains: false },
    { name: 'Option-O Lagom P100', drive: 'electric', burr: 'flat', burrSize: 98, adjust: 'stepless', retains: false },
    // Two different machines under one name, so no burr size: the Key
    // and the EG-1 do not share one.
    { name: 'Weber Key / EG-1', drive: 'electric', burr: 'flat', burrSize: null, adjust: 'stepless', retains: false },
    { name: 'Mahlkönig EK43', drive: 'electric', burr: 'flat', burrSize: 98, adjust: 'stepless', retains: true },
    { name: 'Mazzer Mini', drive: 'electric', burr: 'flat', burrSize: 64, adjust: 'stepless', retains: true },
    { name: 'Mazzer Super Jolly', drive: 'electric', burr: 'flat', burrSize: 64, adjust: 'stepless', retains: true },
    // A family spanning several burr sizes, so the size is asked.
    { name: 'Eureka Mignon', drive: 'electric', burr: 'flat', burrSize: null, adjust: 'stepless', retains: true },
    { name: 'Eureka Atom', drive: 'electric', burr: 'flat', burrSize: null, adjust: 'stepless', retains: true },
    { name: 'Fellow Ode Gen 2', drive: 'electric', burr: 'flat', burrSize: 64, adjust: 'stepped', retains: false },
    { name: 'Fellow Ode (Gen 1)', drive: 'electric', burr: 'flat', burrSize: 64, adjust: 'stepped', retains: false },
    { name: 'Niche Duo', drive: 'electric', burr: 'flat', burrSize: 83, adjust: 'stepless', retains: false },

    // --- electric, conical ---
    { name: 'Niche Zero', drive: 'electric', burr: 'conical', burrSize: 63, adjust: 'stepless', retains: false },
    { name: 'Baratza Encore / Encore ESP', drive: 'electric', burr: 'conical', burrSize: 40, adjust: 'stepped', retains: true },
    { name: 'Baratza Virtuoso+', drive: 'electric', burr: 'conical', burrSize: 40, adjust: 'stepped', retains: true },
    { name: 'Baratza Sette 270', drive: 'electric', burr: 'conical', burrSize: 40, adjust: 'stepped', retains: false },
    { name: 'Fellow Opus', drive: 'electric', burr: 'conical', burrSize: 40, adjust: 'stepped', retains: null },
    { name: 'Breville/Sage Smart Grinder Pro', drive: 'electric', burr: 'conical', burrSize: null, adjust: 'stepped', retains: true },
    { name: 'Breville/Sage built-in grinder', drive: 'electric', burr: 'conical', burrSize: null, adjust: 'stepped', retains: true },

    // --- hand grinders ---
    { name: 'Comandante C40', drive: 'manual', burr: 'conical', burrSize: 39, adjust: 'clicks', retains: false },
    { name: '1Zpresso (J, JX, K, ZP6)', drive: 'manual', burr: 'conical', burrSize: null, adjust: 'clicks', retains: false },
    { name: '1Zpresso Q2 / Q Air', drive: 'manual', burr: 'conical', burrSize: null, adjust: 'clicks', retains: false },
    { name: 'Kingrinder (K4, K6)', drive: 'manual', burr: 'conical', burrSize: null, adjust: 'clicks', retains: false },
    { name: 'Kinu M47', drive: 'manual', burr: 'conical', burrSize: 47, adjust: 'stepless', retains: false },
    { name: 'Timemore C2 / C3', drive: 'manual', burr: 'conical', burrSize: null, adjust: 'clicks', retains: false },

    /* Split, not renamed. The C2 and C3 are hand grinders and the 078 is
       not, so one row could not answer "electric or manual" without
       being wrong for somebody. Anybody whose kit already names this
       keeps it, and the sheet asks them the two questions it cannot
       answer. */
    { name: 'Timemore (C2, C3, 078)', legacy: true, drive: null, burr: null, burrSize: null, adjust: null, retains: false },
  ];

  /* ---------- brewers ----------

     flow    percolation | immersion | switch
     filter  cone | flat | basket | mesh | cloth | proprietary | none
     sizes   the filter sizes it takes, as they are printed on the box
     body    what it is made of, where the name means one thing. Most
             drippers ship in several materials and this is null for
             them, because a ceramic V60 and a plastic one hold heat
             differently and the app should ask rather than assume.
     bypass  false where no water can get round the bed. It is the
             thing that changes the grind most, and there is no other
             field it belongs in. */

  var BREWERS = [
    // --- cones ---
    {
      name: 'Hario V60', flow: 'percolation', filter: 'cone', sizes: ['01', '02', '03'],
      body: null, bypass: true,
      note: 'One big hole and spiral ribs, so the grind and your pour set the flow. Rewards a steady stream, punishes a rushed one.',
    },
    {
      name: 'Origami', flow: 'percolation', filter: 'cone', sizes: ['S', 'M'],
      body: null, bypass: true,
      note: 'Ribbed cone that takes either a cone or a flat filter, so it can be pulled either way.',
    },
    {
      name: 'Chemex', flow: 'percolation', filter: 'cone', sizes: ['3 cup', '6 cup', '8 cup', '10 cup'],
      body: 'glass', bypass: true,
      note: 'Thick bonded paper. Slow, and very clean in the cup — most recipes go coarser than a V60 to get the time back.',
    },
    {
      name: 'Melitta', flow: 'percolation', filter: 'cone', sizes: ['#2', '#4'],
      body: null, bypass: true,
      note: 'A cone with small holes, so the brewer holds back some of the flow rather than leaving all of it to the grind.',
    },
    {
      name: 'Bee House', flow: 'percolation', filter: 'cone', sizes: ['#2', '#4'],
      body: 'ceramic', bypass: true,
      note: 'Two small holes in a cone. Flow is largely the brewer’s, which makes it forgiving of an uneven pour.',
    },
    {
      name: 'Cafec Flower Dripper', flow: 'percolation', filter: 'cone', sizes: ['01', '02'],
      body: null, bypass: true,
      note: 'Tall ribs hold the paper off the wall, so the bed drains faster than a plain cone at the same grind.',
    },
    {
      name: 'Hario Mugen', flow: 'percolation', filter: 'cone', sizes: ['02'],
      body: null, bypass: true,
      note: 'A cone with no ribs, drawn for one continuous pour rather than a schedule.',
    },
    {
      name: 'Timemore Crystal Eye', flow: 'percolation', filter: 'cone', sizes: ['01', '02'],
      body: null, bypass: true,
      note: 'A cone you can see the bed through, which makes the drawdown easy to read.',
    },

    // --- flat beds ---
    {
      name: 'Kalita Wave', flow: 'percolation', filter: 'flat', sizes: ['155', '185'],
      body: null, bypass: true,
      note: 'Flat bed, three small holes. The brewer holds the flow, so pour technique matters less here than in a cone.',
    },
    {
      name: 'Fellow Stagg [X]', flow: 'percolation', filter: 'flat', sizes: ['Stagg [X]'],
      body: null, bypass: true,
      note: 'Flat bed with a single large hole, so the grind does most of the work of setting the time.',
    },
    {
      name: 'Orea', flow: 'percolation', filter: 'flat', sizes: ['flat-bottom', 'V60 02'],
      body: null, bypass: true,
      note: 'Flat bed with a wide open base. Very fast, so it takes a finer grind than most flat brewers.',
    },
    {
      name: 'April', flow: 'percolation', filter: 'flat', sizes: ['April', 'Kalita 155'],
      body: null, bypass: true,
      note: 'Flat bed, open base. Quick drawdown, and an even one if the bed is level.',
    },
    {
      name: 'Blue Bottle Dripper', flow: 'percolation', filter: 'flat', sizes: null,
      body: 'ceramic', bypass: true,
      note: 'A single small hole under a shallow bed, which keeps the flow steady without much help.',
    },
    {
      name: 'Tricolate', flow: 'percolation', filter: 'proprietary', sizes: null,
      body: null, bypass: false,
      note: 'No bypass — every drop goes through the bed, so the whole pour is extraction. Expect a much finer grind and a long brew.',
    },
    {
      name: 'Next Level Pulsar', flow: 'percolation', filter: 'flat', sizes: null,
      body: null, bypass: false,
      note: 'No bypass, flat bed. Like the Tricolate, the water cannot go round the coffee.',
    },

    // --- valves ---
    {
      name: 'Hario Switch', flow: 'switch', filter: 'cone', sizes: ['02', '03'],
      body: 'glass', bypass: true,
      note: 'A V60 with a valve. Closed it steeps, open it drains — so a recipe here is a sequence of opens and closes, and the log records them.',
    },
    {
      name: 'Clever Dripper', flow: 'switch', filter: 'cone', sizes: ['#4'],
      body: 'plastic', bypass: true,
      note: 'Flat bed with a valve that opens when you set it on a cup. Steep for as long as you like, then let it go.',
    },

    // --- immersion ---
    {
      name: 'French press', flow: 'immersion', filter: 'mesh', sizes: null,
      body: null, bypass: false,
      note: 'Metal mesh, full immersion. Time is whatever you set it to, so grind changes extraction with the clock held still.',
    },
    {
      name: 'Espro Press', flow: 'immersion', filter: 'mesh', sizes: null,
      body: null, bypass: false,
      note: 'A press with a fine double filter, so the cup comes out closer to paper-filtered than mesh.',
    },
    {
      /* The press at the end of an AeroPress is quick and the extraction
         has already happened in the chamber, so it is logged as a steep.
         Anybody who disagrees can say so on their own entry, which is the
         point of the entry. */
      name: 'AeroPress', flow: 'immersion', filter: 'proprietary', sizes: ['AeroPress'],
      body: 'plastic', bypass: false,
      note: 'A sealed chamber, then a short push through paper. The steep is where the extraction happens; the plunge is just getting it out.',
    },
    {
      name: 'Siphon', flow: 'immersion', filter: 'cloth', sizes: null,
      body: 'glass', bypass: false,
      note: 'Immersion over a flame, with the draw down happening when the heat comes off. The temperature stays high throughout.',
    },
    {
      name: 'Cupping bowl', flow: 'immersion', filter: 'none', sizes: null,
      body: null, bypass: false,
      note: 'The protocol steep: grounds, water, crust, break. No filter at all.',
    },
  ];

  /* ---------- kettles ----------

     power    electric | stovetop
     spout    gooseneck | wide
     control  variable — you set a temperature | boil — it boils
     hold     does it hold the temperature once it gets there
     units    NOT here. Whether a kettle's dial reads in Celsius or
              Fahrenheit is a matter of which one you bought and where,
              not of the model, so it is asked rather than assumed. */

  var KETTLES = [
    { name: 'Fellow Stagg EKG', power: 'electric', spout: 'gooseneck', control: 'variable', hold: true },
    { name: 'Fellow Stagg EKG Pro', power: 'electric', spout: 'gooseneck', control: 'variable', hold: true },
    { name: 'Fellow Stagg pour-over kettle', power: 'stovetop', spout: 'gooseneck', control: 'boil', hold: false },
    { name: 'Brewista Artisan', power: 'electric', spout: 'gooseneck', control: 'variable', hold: true },
    { name: 'Bonavita Variable Temperature', power: 'electric', spout: 'gooseneck', control: 'variable', hold: true },
    { name: 'OXO Brew Adjustable Temperature', power: 'electric', spout: 'gooseneck', control: 'variable', hold: true },
    { name: 'Timemore Fish Smart', power: 'electric', spout: 'gooseneck', control: 'variable', hold: true },
    { name: 'Balmuda The Pot', power: 'electric', spout: 'gooseneck', control: 'boil', hold: false },
    { name: 'Hario V60 Buono', power: 'stovetop', spout: 'gooseneck', control: 'boil', hold: false },
    { name: 'Timemore Fish', power: 'stovetop', spout: 'gooseneck', control: 'boil', hold: false },
    { name: 'Kalita Wave Pot', power: 'stovetop', spout: 'gooseneck', control: 'boil', hold: false },
    { name: 'Cafec Tsubame', power: 'stovetop', spout: 'gooseneck', control: 'boil', hold: false },
  ];

  /* ---------- espresso machines ----------

     drive    pump | lever | press
                A press is a Flair or a Robot: you are the pump. A lever
                is a La Pavoni or a spring group, where the arm is.
     boiler   thermoblock | single | hx | dual
     temp     fixed — one temperature | set — you choose it
     pressure fixed | gauge — you can see it | profile — you can change it
     pf       portafilter, across the basket, in mm
     paddle   a flow-control paddle, where it is part of the machine

     temp and pressure are the two the dial-in reasons from, and they
     were the whole of this table before. They are the app's terms for a
     capability, never read from the name at brew time: a PID'd Gaggia
     is a different machine from the one on the box, which is why every
     one of these is an editable answer and not a lookup. */

  var MACHINES = [
    { name: 'Breville/Sage Bambino', drive: 'pump', boiler: 'thermoblock', temp: 'fixed', pressure: 'fixed', pf: 54, paddle: false },
    { name: 'Breville/Sage Bambino Plus', drive: 'pump', boiler: 'thermoblock', temp: 'fixed', pressure: 'fixed', pf: 54, paddle: false },
    { name: 'Breville/Sage Barista Express', drive: 'pump', boiler: 'thermoblock', temp: 'set', pressure: 'gauge', pf: 54, paddle: false },
    { name: 'Breville/Sage Barista Express Impress', drive: 'pump', boiler: 'thermoblock', temp: 'set', pressure: 'gauge', pf: 54, paddle: false },
    { name: 'Breville/Sage Barista Pro', drive: 'pump', boiler: 'thermoblock', temp: 'set', pressure: 'gauge', pf: 54, paddle: false },
    { name: 'Breville/Sage Barista Touch', drive: 'pump', boiler: 'thermoblock', temp: 'set', pressure: 'gauge', pf: 54, paddle: false },
    { name: 'Breville/Sage Dual Boiler', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Breville/Sage Oracle', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Gaggia Classic (stock)', drive: 'pump', boiler: 'single', temp: 'fixed', pressure: 'fixed', pf: 58, paddle: false },
    { name: 'Gaggia Classic Pro (stock)', drive: 'pump', boiler: 'single', temp: 'fixed', pressure: 'fixed', pf: 58, paddle: false },
    { name: 'Rancilio Silvia (stock)', drive: 'pump', boiler: 'single', temp: 'fixed', pressure: 'fixed', pf: 58, paddle: false },
    { name: 'Rancilio Silvia Pro X', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Rocket Appartamento', drive: 'pump', boiler: 'hx', temp: 'fixed', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Lelit Elizabeth', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Lelit Bianca', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'profile', pf: 58, paddle: true },
    { name: 'Profitec Pro 500', drive: 'pump', boiler: 'hx', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Profitec Pro 600', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'ECM Synchronika', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'La Marzocco Linea Mini', drive: 'pump', boiler: 'dual', temp: 'set', pressure: 'gauge', pf: 58, paddle: false },
    { name: 'Decent DE1', drive: 'pump', boiler: 'thermoblock', temp: 'set', pressure: 'profile', pf: 58, paddle: true },
    { name: 'Meticulous', drive: 'pump', boiler: null, temp: 'set', pressure: 'profile', pf: 58, paddle: true },
    // On a press or a manual lever the kettle is the temperature control
    // and your arm is the pressure profile, so both answers are "you".
    { name: 'Flair 58', drive: 'press', boiler: null, temp: 'set', pressure: 'profile', pf: 58, paddle: false },
    { name: 'Flair (Classic, Pro, NEO)', drive: 'press', boiler: null, temp: 'set', pressure: 'profile', pf: null, paddle: false },
    { name: 'Cafelat Robot', drive: 'press', boiler: null, temp: 'set', pressure: 'profile', pf: 58, paddle: false },
    { name: 'La Pavoni (lever)', drive: 'lever', boiler: 'single', temp: 'set', pressure: 'profile', pf: 51, paddle: false },
  ];

  var TABLES = {
    grinder: GRINDERS,
    brewer: BREWERS,
    kettle: KETTLES,
    machine: MACHINES,
  };

  var KINDS = ['grinder', 'brewer', 'kettle', 'machine'];

  // One noun per kind, since four sheets and a picker all need it.
  var NOUNS = {
    grinder: { one: 'grinder', many: 'grinders', add: 'Add a grinder' },
    brewer: { one: 'brewer', many: 'brewers', add: 'Add a brewer' },
    kettle: { one: 'kettle', many: 'kettles', add: 'Add a kettle' },
    machine: { one: 'espresso machine', many: 'espresso machines', add: 'Add a machine' },
  };

  function entry(kind, name) {
    var table = TABLES[kind];
    if (!table || !name) return null;
    for (var i = 0; i < table.length; i++) if (table[i].name === name) return table[i];
    return null;
  }

  // What the picker offers: everything but the split-up compounds.
  function catalogue(kind) {
    return (TABLES[kind] || []).filter(function (e) { return !e.legacy; });
  }

  root.LentoGearDB = {
    KINDS: KINDS,
    NOUNS: NOUNS,
    TABLES: TABLES,
    GRINDERS: GRINDERS,
    BREWERS: BREWERS,
    KETTLES: KETTLES,
    MACHINES: MACHINES,
    entry: entry,
    catalogue: catalogue,
  };
}(window));
