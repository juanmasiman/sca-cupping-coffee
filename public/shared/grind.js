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

  /* Seconds of brew time per step of the dial.

     The median of the per-pair slopes rather than a line fitted through
     them: one channelled shot or one bed that clogged would drag a mean
     a long way, and the middle of five honest measurements beats the
     average of four honest ones and a wild one.

     Null when the log cannot honestly say. Two agreeing pairs is the
     floor — one pair is an anecdote — and a grinder whose pairs cannot
     agree on which way it even runs is telling you something real about
     retention or backlash that a confident number would paper over. */
  function sensitivity() {
    if (env.enabled && !env.enabled()) return null;
    const ps = pairs();
    if (ps.length < 2) return null;
    const slopes = ps.map(p => p.dt / p.dg).filter(v => isFinite(v) && v !== 0);
    const up = slopes.filter(v => v > 0).length;
    const down = slopes.length - up;
    const agree = Math.max(up, down);
    /* Two agreeing pairs used to be the entire test, and with noisy
       signs you get two agreeing pairs almost every time. A grinder that
       cannot make two thirds of its measurements point the same way has
       not been measured, it has been guessed at, and the honest answer
       there is "one step" rather than a number whose sign may be
       backwards — which is the one kind of wrong that costs a whole bag. */
    if (agree < 2 || agree / slopes.length < 2 / 3) return null;
    const sign = up > down ? 1 : -1;
    const kept = slopes.filter(v => Math.sign(v) === sign).map(Math.abs).sort((a, b) => a - b);
    const mid = kept.length % 2
      ? kept[(kept.length - 1) / 2]
      : (kept[kept.length / 2 - 1] + kept[kept.length / 2]) / 2;
    if (!isFinite(mid) || mid <= 0) return null;
    return { secPerStep: mid, finerIsUp: sign > 0, n: kept.length, mixed: agree < slopes.length };
  }

  const grain = () => (env.stepped() ? 1 : 0.1);

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
          const v = cur + (dialUp ? steps : -steps);
          return env.stepped() ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
        })();

    return { steps, finer, dialUp, to, halve, words: fmtSteps(steps),
             secPerStep: s.secPerStep, n: s.n, mixed: s.mixed };
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
      return {
        move: ` — one ${unit}, the smallest your grinder makes`,
        why: willLearn
          ? ` How far is the question every tool like this dodges, and this one does too until it has grounds to answer: once two ${env.itemWord ? env.itemWord() : 'brew'}s on this board differ only in grind, it works out what a ${unit} is worth in seconds on your grinder and tells you how many, instead of "a step".`
          : '',
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
      why.push(` That is deliberately half the distance: grind stops behaving in a straight line more than a step or two out, so expect around ${land === null ? 'a partial move' : clock(land)}${
        outside ? ' — still outside the window, but close enough that the next move is measured from nearby' : ''}, and the board re-measures from there.`);
    } else if (land !== null) {
      why.push(` That should land near ${clock(land)}.`);
    }
    return {
      // No direction word: the instruction it attaches to already opens
      // with "Grind finer", and "Grind finer — about 3 clicks finer"
      // says it twice.
      move: ` — about ${m.words}${m.to ? `, ${m.dialUp ? 'up' : 'down'} to ${m.to}` : ''}`,
      why: why.join(''),
    };
  }

  return { pairs, sensitivity, move, parts };
}
