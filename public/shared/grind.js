/* ============================================================
   lento — what the grinder is worth, in seconds

   Shared by the dial-in and the brew log, because it is the same
   measurement of the same machine. A brewer who uses both owns one
   grinder, and it behaves the same way whichever basket or cone is
   downstream of it.

   THE PROBLEM THIS SOLVES

   Every dial-in tool ever written says "go finer" and then stops. It
   has to: the number on your grinder means nothing on anybody else's.
   A click on one is a tenth of a turn on another, half the dials count
   up as the burrs close, and no table of brands survives a year or is
   right about a single modified machine. So the advice everywhere is a
   direction and a shrug — "one small step" — and the person standing at
   the grinder is left to guess how big a step is, which is the actual
   question they had.

   It means nothing on anybody else's grinder. It means something on
   theirs. The log already holds every setting they have used and what
   the clock did each time, and two brews that differ only in grind are
   a measurement of that grinder. A handful are a calibration — in their
   own units, with nothing to look up and no brand named.

   The same measurement answers the question the app would otherwise
   have to ask outright: whether the numbers go up as the burrs close. A
   pair where the dial went up and the shot got longer says higher is
   finer; a pair the other way says higher is coarser. Nobody has to be
   asked. The log says.

   WHERE IT DOES NOT APPLY

   Only where grind sets the flow. In a percolating brewer and in an
   espresso basket the water's time in the bed is a consequence of the
   grind, so seconds per step is a real quantity. In an immersion brewer
   the time is whatever the timer was set to, grinding finer does not
   lengthen it, and a "seconds per click" figure there would be an
   artefact of the brewer's own decisions. The host app says which by
   what it passes in.

   Used via makeGrind(env), where env supplies:
     logs()     → arrays of brews, oldest first, one per coffee
     stepped()  → true when the dial counts clicks rather than a number
     unitWord() → 'click' or 'step', for the prose
     itemWord() → 'shot' or 'brew', for the prose
     fmtTime(s)  → the host's own clock notation, optional
     noiseFloor  → seconds below which a pair carries no signal
     timeOf, grindOf, doseOf, waterOf → readers for one entry
   ============================================================ */

function makeGrind(env) {
  const n = v => (typeof v === 'number' && isFinite(v) ? v : null);

  /* Every pair of entries in the recent window that differs in grind,
     not only consecutive ones.

     Consecutive-only was the first version and it could not read a fine
     dial. Where one step is worth a quarter of a second, each
     consecutive pair carries a quarter-second of signal under a second
     or more of ordinary shot-to-shot noise, so the slopes came out with
     random signs: in a simulated dial-in the advice sent the brewer
     finer, then coarser, then finer again, and never converged. That is
     worse than saying nothing. Comparing across the window instead
     gives spans whose change in grind is large enough for the real
     effect to clear the noise.

     Pairs are dropped when anything else moved enough to muddy them —
     dose and water push the clock around on their own — and when the
     clock barely moved at all, because a pair that produced no change
     carries no information about what a step is worth, and averaging
     noise in is exactly how the sign gets lost. */
  function pairs() {
    const out = [];
    env.logs().forEach(rows => {
      const win = rows.slice(-8);
      for (let i = 0; i < win.length; i++) {
        for (let j = i + 1; j < win.length; j++) {
          const a = win[i], b = win[j];
          const g0 = env.grindOf(a), g1 = env.grindOf(b);
          const t0 = env.timeOf(a), t1 = env.timeOf(b);
          if (g0 === null || g1 === null || t0 === null || t1 === null) continue;
          const dg = g1 - g0;
          if (dg === 0) continue;
          const d0 = env.doseOf(a), d1 = env.doseOf(b);
          const w0 = env.waterOf(a), w1 = env.waterOf(b);
          if (d0 !== null && d1 !== null && Math.abs(d1 - d0) > 0.35) continue;
          if (w0 !== null && w1 !== null && Math.abs(w1 - w0) > env.waterSlack) continue;
          const dt = t1 - t0;
          if (Math.abs(dt) < (env.noiseFloor || 0)) continue;
          out.push({ dg, dt });
        }
      }
    });
    return out;
  }

  /* How many times the grinder has actually been moved, across the same
     windows the pairs are drawn from.

     This exists because the figure quoted to the reader used to be the
     number of PAIRS, and pairs grow as the square of the log: three moves
     of the grinder reported "over 3 grind changes", then 6, then 11, with
     the count climbing across two shots at an unchanged setting. It is the
     one sentence in the card meant to make the estimate trustworthy, and
     it was the least trustworthy thing on the screen.

     Consecutive differences, which is literally the number of times a hand
     went to the dial. */
  function moves() {
    let count = 0;
    env.logs().forEach(rows => {
      const win = rows.slice(-8);
      let prev = null;
      win.forEach(r => {
        const g = env.grindOf(r);
        if (g === null) return;
        if (prev !== null && g !== prev) count++;
        prev = g;
      });
    });
    return count;
  }

  /* Seconds of brew time per step of the dial.

     The median of the per-pair slopes rather than a line fitted through
     them: one channelled shot or one bed that clogged would drag a mean
     a long way, and the middle of five honest measurements beats the
     average of four honest ones and a wild one.

     Null when the log cannot honestly say. Two agreeing pairs is the
     floor — one pair is an anecdote — and a grinder whose pairs cannot
     agree on which way it even runs is telling you something real about
     retention or backlash that a confident number would paper over. */
  /* Why there is no figure yet, where the honest answer is an instruction
     rather than an apology.

     'small' — there are pairs, and every one of them is a grind move the
     clock barely reacted to. Repeating the generic promise there is worse
     than useless: the reader has done exactly what it asked and is being
     told to wait. What they need is "move it further", which is also the
     method — a dial-in takes nine shots when the moves are timid. */
  function stall() {
    if (env.enabled && !env.enabled()) return null;
    const ps = pairs();
    const floor = env.noiseFloor || 0;
    if (!ps.length || !floor) return null;
    return ps.every(pr => Math.abs(pr.dt) < 2 * floor) ? 'small' : null;
  }

  function sensitivity() {
    if (env.enabled && !env.enabled()) return null;
    const ps = pairs();
    if (!ps.length) return null;
    /* One pair used to be refused outright as an anecdote, and the card
       above it promised a number "once two brews differ only in grind" —
       so the app watched its own condition come true and repeated the
       promise instead of keeping it, for one more brew.

       The thing the refusal was protecting against is a backwards sign,
       which costs a whole bag. A pair clear of the noise floor — twice it,
       not the one time a pair needs to be counted at all — is not ambiguous
       about which way the clock moved. Below that, two pairs and the
       agreement rule still stand.

       Twice and not three times because three was refusing real work: a
       two-point move on a grinder worth 1.8s a point shifts the clock 3.6
       seconds, which is a measurement by any reading, and the board was
       telling the person who made it that their moves were too small. */
    if (ps.length < 2) {
      const floor = env.noiseFloor || 0;
      if (!(Math.abs(ps[0].dt) >= 2 * floor)) return null;
    }
    const slopes = ps.map(p => p.dt / p.dg).filter(v => isFinite(v) && v !== 0);
    const up = slopes.filter(v => v > 0).length;
    const down = slopes.length - up;
    const agree = Math.max(up, down);
    /* Two agreeing pairs used to be the entire test, and with noisy
       signs you get two agreeing pairs almost every time. A grinder that
       cannot make two thirds of its measurements point the same way has
       not been measured, it has been guessed at, and the honest answer
       there is "one step" rather than a number whose sign may be
       backwards — which is the one kind of wrong that costs a whole bag.

       The floor is one where there is only one pair to have, because that
       pair has already been through the size test above and a lone pair
       cannot fail an agreement test with itself. Leaving the floor at two
       here quietly re-imposed the three-shot wait the size test was added
       to remove — the promise kept firing a shot late for a second
       reason after the first was fixed. */
    if (agree < Math.min(2, slopes.length) || agree / slopes.length < 2 / 3) return null;
    const sign = up > down ? 1 : -1;
    const kept = slopes.filter(v => Math.sign(v) === sign).map(Math.abs).sort((a, b) => a - b);
    const mid = kept.length % 2
      ? kept[(kept.length - 1) / 2]
      : (kept[kept.length / 2 - 1] + kept[kept.length / 2]) / 2;
    if (!isFinite(mid) || mid <= 0) return null;
    /* n is the number of times the grinder moved, not the number of pairs
       compared. The reader is being told what the estimate rests on, and
       what it rests on is their own hand on the dial. */
    return { secPerStep: mid, finerIsUp: sign > 0, n: moves(),
             pairsUsed: kept.length, mixed: agree < slopes.length };
  }

  /* The smallest move worth naming.

     A tenth was false precision on every stepless grinder the app met: a
     DF64 collar is marked in whole numbers and a Barista Express dial has
     thirty detents, and two testers independently reported being told to
     go "down to 29.9" and "down to 11.1" on hardware that cannot express
     it. Half a unit is a move a hand can actually make and find again. */
  const grain = () => (env.stepped() ? 1 : 0.5);

  const fmtSteps = v => (env.stepped()
    ? `${v} ${v === 1 ? 'click' : 'clicks'}`
    : `${v.toFixed(1)} on the dial`);

  /* How far to move the grinder to buy a given number of seconds, in the
     units the hand on the dial is actually turning.

     Big moves come in halves. Grind response is nothing like linear more
     than a step or two from where you are, so a calibration that says
     "six clicks" is extrapolating far past anything it measured. Past a
     threshold it says so and sends you half way, which is what a person
     who knows what they are doing does anyway. */
  function move(deltaSeconds, currentGrind) {
    const s = sensitivity();
    if (!s || !deltaSeconds) return null;
    const raw = Math.abs(deltaSeconds) / s.secPerStep;
    if (!isFinite(raw) || raw <= 0) return null;

    const finer = deltaSeconds > 0;
    const halve = raw > (env.stepped() ? 3 : 0.6);
    const use = halve ? raw / 2 : raw;
    const g = grain();

    /* A stepped dial lands on the finer of the two clicks either side of
       the answer, rather than on the nearer one.

       This is Hoffmann's rule for grinders whose steps are coarse: take
       the finer setting, even if it means dropping the dose a little,
       because a shot that is slightly too fine is a better place to be
       stuck than one that is slightly too coarse. Going finer means a
       bigger move, going coarser means a smaller one — in both cases the
       resulting grind is the finer of the two candidates. A stepless dial
       has no such gap to fall into, so it still rounds to nearest. */
    let steps;
    if (env.stepped()) {
      steps = Math.max(1, finer ? Math.ceil(use) : Math.floor(use));
    } else {
      steps = Math.round(Math.max(g, Math.round(use / g) * g) * 10) / 10;
    }

    const dialUp = finer === s.finerIsUp;
    const cur = n(Number(currentGrind));
    const to = (currentGrind === '' || currentGrind === null || currentGrind === undefined || cur === null)
      ? null
      : (() => {
          /* Landed on the same grain as the move. "About 1.5 on the dial,
             down to 30.5" is a pair of numbers a hand can carry out; the
             old tenths gave "1.1, down to 29.9" on a collar with no 29.9
             on it. */
          const v = cur + (dialUp ? steps : -steps);
          if (env.stepped()) return String(Math.round(v));
          return String(Math.round(v / g) * g);
        })();

    return { steps, finer, dialUp, to, halve, words: fmtSteps(steps),
             secPerStep: s.secPerStep, n: s.n, pairsUsed: s.pairsUsed, mixed: s.mixed };
  }

  /* The two halves of the instruction, because they belong in two
     different places. The distance goes in the bold line — somebody
     reads one line and walks to the grinder, and "about 3 clicks, down
     to 29" is that line. The reasoning goes in the paragraph, where a
     reader who wants to know why the app thinks a click is worth 1.6
     seconds can find out. Putting the number in the paragraph, which is
     where this started, buried the one actionable thing in the card
     under sixty words of physics. */
  function parts(opts) {
    const { wantSeconds, currentGrind, currentTime, lo, hi } = opts;
    const unit = env.unitWord();
    if (wantSeconds === null || wantSeconds === undefined) return { move: '', why: '' };

    const m = move(wantSeconds, currentGrind);
    if (!m) {
      /* No promise where none can be kept. Where grind does not set the
         flow there will never be a seconds-per-step figure, so saying
         "the board will work it out once you log two more" would be an
         undertaking this cannot honour. The instruction is still the
         true one; it just arrives without a prospectus. */
      const willLearn = !env.enabled || env.enabled();
      const small = stall() === 'small';
      const item = env.itemWord ? env.itemWord() : 'brew';
      /* A stepless dial has no smallest move, and telling somebody with a
         numeric collar to make "one step, the smallest your grinder makes"
         hands them back the guess this whole file exists to remove. What is
         true on a stepless dial is that the move wants to be small and
         findable again — you move it until you can see you moved it, and
         you can get back. On a clicked grinder the click IS the answer. */
      /* The opening move has to be big enough to measure, on every grinder.

         "One click, the smallest your grinder makes" was written with a
         coarse stepped grinder in mind, where one click is a real move. On
         a 1Zpresso a click is worth about half a second — under the
         shot-to-shot noise — so a tester who followed it literally made
         three null moves in a row while the card underneath promised a
         number "once the clock moves several seconds with it". The
         instruction and the condition were asking for opposite things: it
         prescribed a move too small to produce the measurement it wanted.

         The method's own answer is a decisive move, so that is what it
         asks for. It does not name a distance, because naming one is
         exactly the guess this file exists to remove — but it says what
         the move has to achieve, which is a thing the reader can judge. */
      return {
        move: env.stepped()
          ? ` — a few clicks, enough to show in the clock; one is usually too small to measure`
          : ` — far enough to show in the clock, and note where the dial is now so you can get back`,
        /* Cut from sixty words to thirty-five, and the condition made
           honest: it used to promise a number "once two brews differ only
           in grind" without the clause that actually gates it — the clock
           has to have moved enough to read — so a reader could watch the
           condition come true, on the same screen, and still be told "a
           step". It was also the longest sentence in the app, on three
           separate screens.

           Where the pairs exist but every move was too small to read, it is
           not a promise at all. Repeating "once two differ only in grind"
           to somebody who has just done that twice is the same bug wearing
           a different hat. There the true line is a reason and a request. */
        why: !willLearn
          ? ''
          : small
            ? ` The grind moves on this board so far are too small for the clock to tell from ordinary ${item}-to-${item} variation, so there is nothing to measure yet. Make this one decisive enough to show in the time and the board can say what a ${unit} is worth on your grinder from here on.`
            : ` How far, it cannot say yet. Once two ${item}s differ only in grind and the clock moves several seconds with it, the board works out what a ${unit} is worth on your grinder and tells you how many.`,
      };
    }

    const t = n(currentTime);
    const land = t === null ? null : Math.round(t + (m.finer ? 1 : -1) * m.steps * m.secPerStep);
    const outside = land !== null && lo !== undefined && (land < lo || land > hi);
    /* In the host's own notation. A brew log that says 2:30-3:30
       everywhere else should not predict "219s", and a dial-in that
       counts in seconds should not be given "0:27". */
    const clock = v => (env.fmtTime ? env.fmtTime(v) : `${v}s`);
    const why = [` Your grinder has been worth about ${m.secPerStep.toFixed(1)}s a ${unit} over ${m.n} grind ${m.n === 1 ? 'change' : 'changes'}${
      m.mixed ? ', though it has not been consistent about it' : ''}.`];
    if (m.halve) {
      why.push(` That is deliberately half the distance: grind stops behaving in a straight line far from where you are, so expect around ${land === null ? 'a partial move' : clock(land)}${
        outside ? ' — still outside the window, but close enough that the next move is measured from nearby' : ''}, and the board re-measures from there.`);
    } else if (land !== null) {
      /* A predicted landing outside the window it is aiming at is worth a
         word. The board told a tester to go coarser and predicted 24s with
         "AIMING AT 25–32s" printed directly underneath — a move it expected
         to miss, presented as the move. Where the grinder cannot get there
         in one honest step, that is information, not an error. */
      why.push(outside
        ? ` That should land near ${clock(land)} — outside the ${clock(lo)}–${clock(hi)} window, which is as close as one grind move gets from here; the rest comes off the yield.`
        : ` That should land near ${clock(land)}.`);
    }
    return {
      // No direction word: the instruction it attaches to already opens
      // with "Grind finer", and "Grind finer — about 3 clicks finer"
      // says it twice.
      move: ` — about ${m.words}${m.to ? `, ${m.dialUp ? 'up' : 'down'} to ${m.to}` : ''}`,
      why: why.join(''),
    };
  }

  return { pairs, moves, stall, sensitivity, move, parts };
}
