/* ============================================================
   lento — what a bag tells you, and which part of it is a number

   WHAT THIS FILE IS FOR

   Two instruments were reasoning from a bag and disagreeing about how.
   The dial-in had a solubility model — process and altitude in bands,
   plus decaf and age — that moved its starting ratio and temperature.
   The brew log had four free-text fields and a note in its source
   saying, correctly, that folding weak signals in behind roast level
   "would make the answer's confidence harder to read rather than the
   answer better".

   That objection was right about the risk and wrong about the
   conclusion. The fix is not to ignore the fields; it is to make every
   factor state its own contribution, so a reader can see what moved the
   number and by how much. `solubility` returns its reasons, one clause
   per factor, and the surfaces print them.

   THE LINE THIS FILE DRAWS, AND WHY IT IS WHERE IT IS

   Some of what a bag says is a MECHANISM and some of it is an
   EXPECTATION, and only the first kind is allowed to move a number.

     mechanism    process, altitude, roast level, days off roast, decaf
     expectation  origin, variety

   The temptation is to let origin move the numbers too — a Kenyan is
   dense, so shift it. The trouble is that almost everything which makes
   a Kenyan dense is ALREADY COUNTED: it is washed, and it is grown
   above 1700m, and those are two bands this model already reads off the
   same bag. Add an origin shift on top and the same physical fact is
   counted three times; the starting point drifts, and the confidence
   the original objection was protecting is exactly what you lose.

   So origin and variety do the thing they are genuinely good at, which
   is telling you WHAT TO EXPECT IN THE CUP and WHICH WAY TO GO WHEN IT
   DISAPPOINTS. "Kenyan acidity sharpens when it is under-extracted, so
   if it screeches rather than sweetens, go finer before you go hotter"
   is worth more than a tenth of a ratio, and it cannot double-count
   anything because it is not arithmetic.

   ONE SHIFT, TWO CONSUMERS

   Solubility is a property of the bean, not of the brewer, so there is
   one number. How far it moves a recipe is a property of the method, so
   each instrument scales it: nine bar through a 20g puck punishes a
   half-point of solubility far more than four minutes at atmospheric
   pressure does. The espresso side moves the ratio by 0.15 per point;
   the filter side moves it by less, and says so where it does it.
   ============================================================ */

(function (root) {
  'use strict';

  /* ---------- the mechanism: things that move the number ----------

     `shift` is "how readily does this give its flavour up", positive
     for readily. The scale is the one the dial-in has used since it
     had a solubility model at all, so nothing it already says moves. */

  var PROCESSES = [
    { key: 'washed', label: 'Washed', shift: -0.5,
      why: 'washed coffees are denser and give up less readily' },
    { key: 'honey', label: 'Honey', shift: 0,
      why: 'a honey lot sits between the two and moves nothing on its own' },
    { key: 'natural', label: 'Natural', shift: 0.5,
      why: 'naturals are less dense and come out more easily' },
    { key: 'fermented', label: 'Anaerobic / co-ferment', shift: 1,
      why: 'a heavily processed lot gives up its flavour early and does not want pushing' },
  ];

  var ALTITUDES = [
    { key: 'high', label: 'High, 1800m+', shift: -0.5,
      why: 'high-grown beans are denser again' },
    { key: 'mid', label: 'Mid', shift: 0, why: '' },
    { key: 'low', label: 'Low, under 1200m', shift: 0.5,
      why: 'lower-grown beans are softer' },
  ];

  /* AGE MOVES THE NUMBERS AND NOT ONLY THE PROSE.

     Past about six weeks the carbon dioxide that gave the bed its
     resistance has gone and oxidation has already done part of the
     extracting, so what is left gives up too easily — the same
     direction as a darker roast.

     The shift is here because it once was not. The dial-in raised an
     `aged` flag with no shift behind it and then printed a sentence
     saying an old bag "starts shorter, and cooler, than the roast alone
     would" — over a ratio and a temperature that were the plain roast
     midpoint, unmoved. A tester with a seven-week-old dark blend was
     told the app had adjusted for the bag, got dead centre of the dark
     band, and spent six shots walking down to the figure the sentence
     had already promised him. A flag that changes the words and not the
     arithmetic is worse than no flag. */
  var AGED_DAYS = 42;
  var AGED_SHIFT = 1;

  // Decaffeination rearranges the bean: more soluble AND faster
  // flowing, which pull opposite ways. The apps say so in words,
  // because a single shift cannot carry two directions.
  var DECAF_SHIFT = 1.5;

  function entry(table, key) {
    for (var i = 0; i < table.length; i++) if (table[i].key === key) return table[i];
    return null;
  }

  var processEntry = function (k) { return entry(PROCESSES, k); };
  var altitudeEntry = function (k) { return entry(ALTITUDES, k); };

  /* ---------- reading a band out of what somebody typed ----------

     The brew log has asked for process and altitude as free text since
     it had them, deliberately, because nothing consumed them and a
     control that looks like it feeds something and does not is a
     promise. Now something consumes them, and the years of "Washed",
     "washed", "Lavado", "1,900–2,100 masl" have to land somewhere.

     Matching is deliberately shy. A string it cannot place returns
     null, which reads as "nobody established it" everywhere downstream
     — the same answer as an empty field. Guessing wrong here is worse
     than not guessing: it moves a number under somebody who never
     answered the question. */

  var PROCESS_WORDS = [
    ['fermented', /anaerob|co-?ferment|carbonic|maceration|yeast|lactic|thermal shock|koji/i],
    ['natural', /natural|dry[- ]process|dry process|seco|unwashed/i],
    ['honey', /honey|pulped natural|miel|semi[- ]washed|semi washed|wet[- ]hulled|giling/i],
    ['washed', /washed|wet[- ]process|fully washed|lavado|lavé/i],
  ];

  function matchProcess(text) {
    var s = String(text || '').trim();
    if (!s) return null;
    if (entry(PROCESSES, s)) return s;
    for (var i = 0; i < PROCESS_WORDS.length; i++) {
      if (PROCESS_WORDS[i][1].test(s)) return PROCESS_WORDS[i][0];
    }
    return null;
  }

  /* Altitude out of whatever a bag prints: "1900", "1,900 masl",
     "1800-2000m", "5,900 ft". The largest number wins when a range is
     given, because the top of a range is what a roaster is boasting
     about and what the lot is sold on.

     Feet are recognised and converted rather than read as metres — a
     bag saying 5900 is not grown in the stratosphere, and treating it
     as metres would put every US-facing bag in the high band. */
  function matchAltitude(text) {
    var s = String(text || '').trim();
    if (!s) return null;
    if (entry(ALTITUDES, s)) return s;
    var feet = /\bft\b|feet|'/i.test(s);
    var nums = s.replace(/,/g, '').match(/\d{3,5}/g);
    if (!nums || !nums.length) return null;
    var top = 0;
    nums.forEach(function (n) { top = Math.max(top, Number(n)); });
    if (feet) top = top * 0.3048;
    if (!top || top < 200 || top > 3500) return null;
    if (top >= 1800) return 'high';
    if (top < 1200) return 'low';
    return 'mid';
  }

  /* ---------- the expectation: things that shape the advice ----------

     None of these carries a shift, and none ever will. See the header.

     `chase` is the useful half: what to do when the cup disappoints, in
     the direction this coffee usually disappoints in. It is written to
     be read at the brewer with a cup in hand, not studied. */

  var ORIGINS = [
    { key: 'kenya', label: 'Kenya', match: /kenya|kenia/i,
      when: 'sour',
      expect: 'blackcurrant and tomato-leaf acidity over a heavy body',
      chase: 'Sharp is more often too little here than too much: this takes more extraction than almost anything before it turns, and the acidity it is bought for gets shrill when the brew comes up short rather than when it runs long.' },
    { key: 'ethiopia', label: 'Ethiopia', match: /ethiopia|yirgacheffe|guji|sidam|harrar|limu|djimmah/i,
      when: 'bitter',
      expect: 'floral and tea-like washed, heavy berry natural',
      chase: 'The floral top end is the first thing to go, and it goes to heat and to time rather than to grind. A cup that has flattened into something merely sweet has usually had too much of both.' },
    { key: 'colombia', label: 'Colombia', match: /colombia|huila|nariñ|narin|tolima|cauca|antioquia/i,
      when: 'bitter',
      expect: 'red fruit and caramel, and a wide range by variety',
      chase: 'Castillo and Colombia are softer than the Caturra and Bourbon they replaced, so a lot that tastes hollow here is more often over-extracted than under.' },
    { key: 'brazil', label: 'Brazil', match: /brazil|brasil|cerrado|mogiana|sul de minas/i,
      when: 'bitter',
      expect: 'nuts, chocolate and low acidity',
      chase: 'Low-grown and soft, and the shortest road to woody of anything on this list. Dry and papery is too much rather than too little.' },
    { key: 'guatemala', label: 'Guatemala', match: /guatemala|antigua|huehue|atitl/i,
      when: 'sour',
      expect: 'cocoa and baking spice with a firm acidity',
      chase: 'Antigua and Huehuetenango are dense and take a full extraction, so thin and sharp usually means it has not had enough.' },
    { key: 'costarica', label: 'Costa Rica', match: /costa rica|tarraz|west valley|naranjo/i,
      when: 'any',
      expect: 'clean and bright, often honey-processed',
      chase: 'Most of what reaches specialty from here is honey or black-honey, so the process line is doing more work than the country line.' },
    { key: 'panama', label: 'Panama', match: /panama|panamá|boquete|volc[aá]n/i,
      when: 'bitter',
      expect: 'floral and delicate, frequently Gesha',
      chase: 'If this is a Gesha it is more fragile than the price suggests, and heat removes the aromatics faster than anything else you can change.' },
    { key: 'elsalvador', label: 'El Salvador', match: /el salvador|salvador/i,
      when: 'any',
      expect: 'soft stone fruit and a syrupy body, often Pacamara or Bourbon',
      chase: 'Pacamara is a very large bean and grinds unevenly on anything small. Sour and bitter at once points at the grinder rather than the recipe.' },
    { key: 'honduras', label: 'Honduras', match: /honduras|marcala|copan|copán|santa b[aá]rbara/i,
      when: 'any',
      expect: 'caramel and mild stone fruit',
      chase: 'Quality swings hard by producer here, so the roast date and the cup are worth more than anything the country name suggests.' },
    { key: 'rwanda', label: 'Rwanda', match: /rwanda|nyamasheke|huye/i,
      when: 'sour',
      expect: 'red fruit and a cola-like sweetness',
      chase: 'Dense and high-grown, and it takes a full extraction. A savoury or vegetal note is usually the lot rather than your brewing.' },
    { key: 'burundi', label: 'Burundi', match: /burundi|kayanza|ngozi/i,
      when: 'strong',
      expect: 'citrus and black tea over a light body',
      chase: 'Light-bodied even when it is extracted well, so body chased with the grinder mostly arrives as bitterness. The ratio is the honest variable for it.' },
    { key: 'indonesia', label: 'Indonesia', match: /indonesia|sumatra|java|sulawesi|bali|flores|mandheling|gayo/i,
      when: 'bitter',
      expect: 'earth, cedar and herbs with very little acidity',
      chase: 'Wet-hulled beans are soft and drink fast, and this is the one origin here where a grind that feels too coarse is usually right. Muddy is too much.' },
    { key: 'peru', label: 'Peru', match: /peru|perú|cajamarca|cusco|amazonas/i,
      when: 'any',
      expect: 'gentle sweetness, nuts and mild fruit',
      chase: 'Soft and forgiving. When it tastes of nothing in particular, that is usually strength rather than extraction.' },
    { key: 'mexico', label: 'Mexico', match: /mexico|méxico|chiapas|oaxaca|veracruz/i,
      when: 'any',
      expect: 'light body, cocoa and a gentle acidity',
      chase: 'Often lower-grown than its neighbours, so treat it as soft unless the bag says otherwise.' },
    { key: 'yemen', label: 'Yemen', match: /yemen/i,
      when: 'any',
      expect: 'wild dried fruit, spice and a fermented edge',
      chase: 'Irregular bean size is normal here and so is a wide grind distribution, so expect a messier cup than the price implies.' },
    { key: 'india', label: 'India', match: /india|karnataka|monsooned|malabar/i,
      when: 'sour',
      expect: 'low acidity and a thick body, spice on the finish',
      chase: 'Monsooned lots are very low in acid by design. There is no brightness in there to extract, so a flat cup may simply be the coffee.' },
    { key: 'china', label: 'China', match: /china|yunnan/i,
      when: 'any',
      expect: 'nutty and gently sweet, improving fast year on year',
      chase: 'Reads like a mid-altitude South American until the cup says otherwise.' },
    { key: 'bolivia', label: 'Bolivia', match: /bolivia|caranavi/i,
      when: 'bitter',
      expect: 'floral sweetness and a clean finish',
      chase: 'Small, high-grown and delicate — closer to an Ethiopian than to its neighbours in how it takes heat.' },
    { key: 'ecuador', label: 'Ecuador', match: /ecuador|loja|pichincha/i,
      when: 'any',
      expect: 'fine aromatics, often experimentally processed',
      chase: 'A lot of what leaves Ecuador is heavily processed, so the process line leads here.' },
    { key: 'tanzania', label: 'Tanzania', match: /tanzania|kilimanjaro|mbeya/i,
      when: 'sour',
      expect: 'blackcurrant and citrus, in the Kenyan direction',
      chase: 'Reads like a gentler Kenya: dense, takes a full extraction, and sharpens when the brew comes up short.' },
  ];

  /* Varieties, for the same job. Present where the variety changes what
     you should expect or how it behaves in a grinder — not a botanical
     index. A variety this table does not know is simply written down. */
  var VARIETIES = [
    { key: 'sl', label: 'SL28 / SL34', match: /\bsl[- ]?28\b|\bsl[- ]?34\b/i,
      when: 'sour',
      expect: 'the blackcurrant acidity Kenya is bought for',
      chase: 'Hard, dense beans that take more extraction than almost anything else before turning bitter.' },
    { key: 'gesha', label: 'Gesha / Geisha', match: /gesha|geisha/i,
      when: 'bitter',
      expect: 'jasmine, bergamot and a tea-like body',
      chase: 'The aromatics are the whole product and heat is what removes them, so this is one to brew below the roast level rather than above it.' },
    { key: 'bourbon', label: 'Bourbon', match: /bourbon|borbon|borbón/i,
      when: 'any',
      expect: 'rounded sweetness and a soft acidity', chase: '' },
    { key: 'typica', label: 'Typica', match: /typica|típica/i,
      when: 'any',
      expect: 'clean and classic, light in body', chase: '' },
    { key: 'caturra', label: 'Caturra / Catuaí', match: /caturra|catua|catuaí/i,
      when: 'any',
      expect: 'balanced and sweet, the workhorse of Latin America', chase: '' },
    { key: 'castillo', label: 'Castillo / Colombia', match: /castillo|\bcolombia variety\b|variedad colombia/i,
      when: 'bitter',
      expect: 'sturdy and sweet, softer in the cup than Caturra',
      chase: 'A softer bean than its neighbours, so it over-extracts sooner than the numbers suggest.' },
    { key: 'pacamara', label: 'Pacamara / Maragogype', match: /pacamara|maragog|maragojipe|elephant bean/i,
      when: 'any',
      expect: 'a huge bean, herbal and syrupy',
      chase: 'Most grinders produce a wide distribution on a bean this large, which tastes like sour and bitter at once. Judge the grinder before the recipe.' },
    { key: 'heirloom', label: 'Ethiopian landrace', match: /heirloom|landrace|74110|74112|74158|kurume|dega|wolisho/i,
      when: 'bitter',
      expect: 'small dense beans with delicate floral aromatics',
      chase: 'Fine to grind and easy to scorch — the top end goes to heat first.' },
    { key: 'pink', label: 'Pink Bourbon', match: /pink bourbon/i,
      when: 'any',
      expect: 'tropical fruit and a dense sweetness', chase: '' },
    { key: 'laurina', label: 'Laurina / Bourbon Pointu', match: /laurina|bourbon pointu/i,
      when: 'any',
      expect: 'low caffeine, delicate and sweet',
      chase: 'Naturally low in caffeine and correspondingly low in bitterness, so the usual over-extraction warnings arrive late. The clock is more reliable than the taste here.' },
    { key: 'sudan', label: 'Sudan Rume', match: /sudan rume/i,
      when: 'any',
      expect: 'dense, complex and slow to give anything up', chase: '' },
    { key: 'robusta', label: 'Robusta / Canephora', match: /robusta|canephora|conilon/i,
      when: 'bitter',
      expect: 'heavy body, low acidity and a rubbery bitterness at the edges',
      chase: 'Far more soluble than arabica and far quicker to turn harsh. Everything about this wants to be shorter.' },
  ];

  function matchIn(table, text) {
    var s = String(text || '').trim();
    if (!s) return null;
    for (var i = 0; i < table.length; i++) {
      if (table[i].key === s) return table[i];
      if (table[i].match.test(s)) return table[i];
    }
    return null;
  }

  function originOf(c) { return c ? matchIn(ORIGINS, c.origin) : null; }
  function varietyOf(c) { return c ? matchIn(VARIETIES, c.variety) : null; }

  /* What to expect from this bag and where to go when it disappoints.

     At most two entries, origin first, and the variety only when it has
     something the origin did not already say — a Kenyan SL28 would
     otherwise print the same paragraph twice under two headings.

     `when` is which fault the chase advice is ABOUT, and it exists
     because the first version did not have it. A Kenyan's advice is for
     a cup that came out sharp — "go finer before you reach for the
     kettle" — and it was being printed under a brew the app had just
     told somebody to grind COARSER for, because the cup was bitter. Two
     instructions pointing opposite ways, two inches apart, on the one
     card that exists to say what to do next.

     `fault` of null asks for everything, which is what the sheet wants;
     a card with a fault in hand passes it and gets only the advice that
     is about that fault. */
  function expect(c, fault) {
    var out = [];
    var o = originOf(c);
    var v = varietyOf(c);
    var fits = function (row) {
      if (!fault) return true;
      if (!row.chase) return false;
      return row.when === 'any' || row.when === fault;
    };
    if (o && fits(o)) out.push({ key: o.key, head: o.label, expect: o.expect, chase: o.chase, when: o.when });
    if (v && fits(v) && (!o || v.chase !== o.chase)) {
      out.push({ key: v.key, head: v.label, expect: v.expect, chase: v.chase, when: v.when });
    }
    return out;
  }

  /* ---------- the model ----------

     Days off roast is passed in rather than computed, because the two
     instruments already have it and disagree about what a future date
     means. `age` of null is "nobody said", which moves nothing. */
  function solubility(c, age) {
    var out = { shift: 0, why: [], flags: {} };
    if (!c) return out;
    var shift = 0;

    var pr = processEntry(c.processKey || matchProcess(c.process));
    if (pr) {
      shift += pr.shift;
      if (pr.why) out.why.push(pr.why);
      if (pr.key === 'fermented') out.flags.processed = true;
    }

    var al = altitudeEntry(c.altKey || matchAltitude(c.altitude));
    if (al) {
      shift += al.shift;
      if (al.why) out.why.push(al.why);
    }

    if (c.decaf) {
      shift += DECAF_SHIFT;
      out.flags.decaf = true;
      out.why.push('decaffeination opens the bean up, so it extracts much more readily and flows faster with it');
    }

    if (typeof age === 'number' && age >= AGED_DAYS) {
      shift += AGED_SHIFT;
      out.flags.aged = true;
      out.why.push('past six weeks the carbon dioxide that gave the bed its resistance has gone, so it will run fast whatever the grinder says');
    }

    out.shift = Math.round(shift * 100) / 100;
    return out;
  }

  root.LentoBeans = {
    PROCESSES: PROCESSES,
    ALTITUDES: ALTITUDES,
    ORIGINS: ORIGINS,
    VARIETIES: VARIETIES,
    AGED_DAYS: AGED_DAYS,
    processEntry: processEntry,
    altitudeEntry: altitudeEntry,
    matchProcess: matchProcess,
    matchAltitude: matchAltitude,
    originOf: originOf,
    varietyOf: varietyOf,
    expect: expect,
    solubility: solubility,
  };
}(window));
