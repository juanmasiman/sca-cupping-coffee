# Dialling in espresso

**What this document is.** The method the espresso tool gives advice from. Every
instruction the app prints should be traceable to a line in here, and where the
app departs from the method it says so and why. `DESIGN.md` governs how the app
looks and what it is allowed to claim; this governs what it knows about coffee.

**Where it comes from.** James Hoffmann's six-part *Understanding Espresso*
series — the closest thing to a primary text on the subject — and the first three
*How I Dial-In Espresso* episodes, which show the same method applied to real
coffees and are where several of the practical rules below come from. Both are
worked from transcripts directly rather than through summaries. Lance Hedrick's
taste-first material is still second-hand except where noted.

**How confident to be, by claim.** Three tiers, and the document says which:

- **Unmarked** — from the *Understanding Espresso* transcripts. Load-bearing.
- **[hedrick]** — from Hedrick's written Meticulous onboarding, his own words in
  text, or from third-party write-ups of his videos. Weaker, and said so.
- **[assembled]** — this document's own arrangement or numbers, not any
  source's. To be treated as a starting suggestion and nothing more.

An earlier draft of this page was written entirely from summaries and got the
temperature ranges wrong by 2–3°C, in a consistent direction, in a table the app
acted on. That is what **[assembled]** is warning about.

---

## The one-sentence version

Set the dose to the basket and leave it, pick a ratio and leave it, use grind to
get the flow about right, then taste — and make the small corrections with dose
and yield rather than with the grinder.

The order matters more than any individual number, because each step is only
measurable once the ones above it are settled.

---

## Time is not a variable

Worth stating before the variables, because it changes what the whole exercise
is. Hoffmann does not count brew time among the things you adjust — it is an
**output**, a consequence of the things you do adjust. Hedrick's phrasing for the
same idea is that time is a flow meter rather than a goal. **[hedrick]**

What the clock actually tells you is **how much resistance the puck offered**,
and nothing more. Resistance comes from two things: how much coffee is in the
basket, and how finely it is ground.

So a shot landing in 25–30 seconds is not thereby a good shot. The window is
useful because the grind size that produces it, at a normal dose, happens to
expose roughly the right surface area — not because coffee and water need that
long together.

**Brew time means button to button**, the whole duration including pre-infusion.
Timing from first drip is a defensible alternative and some scales do it, but it
is a different quantity and the two cannot be mixed in one log. *(See Open
questions — the app does not currently say which it means, and its grinder
calibration silently assumes they are the same.)*

---

## Step 0 — The kit decides which advice is legal

Advice that names a variable somebody does not have is worse than no advice.

| Question | Why it changes the advice |
|---|---|
| Can you set brew temperature? | If not, temperature leaves the sheet and the ratio carries the work. |
| Can you see or change pressure/flow? | A gauge you can read is diagnosis; a paddle you can change is a variable. |
| Does the grinder count clicks or read a number? | Only so the app uses the brewer's own words. It never suggests a *setting* — those mean nothing across machines — only a direction and a distance. |
| **Spouted or bottomless portafilter?** | This decides whether channelling is visible at all, and what it looks like. See step 2. |

**A machine list is a shortcut to these answers, never a substitute.** A Gaggia
Classic has no PID *unless somebody fitted one*, and plenty have. The list
prefills; the person corrects; the app reasons from the capability and never
from the name.

**Match the pressure to the equipment, not to the spec sheet.** Nine bars is the
default because it is roughly where flow peaks (see step 6), but it is also the
pressure most likely to find a channel. Hoffmann's framing is that nine bars is
playing on hard mode, and that brewing lower is a compromise that suits a clumpy
grinder or unpractised puck prep — and will often taste better for it.

---

## Step 1 — Dose to the basket, and then leave it alone

**The basket decides the dose, more than anything else does.** Modern baskets
are printed with a reference — give or take about a gram is the working range.

**That printed figure is an upper limit. There is no lower limit.** This is
worth stating plainly because the internet says otherwise and this document used
to as well: brewing 14g in an 18g basket is *perfectly fine for quality*. What
you get is a mess — the space above the coffee means that when the pressure
dissipates at the end of the shot, the puck gets blown apart into a soupy
ruin that tells you nothing and is annoying to clean. That is an irritation, not
a fault in the cup.

> **Where this document changed its mind.** The previous draft had underdosing
> as a first-order fault that caused channelling and outranked everything else,
> sourced from a retailer's article on headspace. Hoffmann's account is that the
> cost is a destroyed puck rather than a bad shot. The app has been corrected to
> match, and the coin test demoted from a fault to a tidiness check.

**On an old classic Italian machine, start around 14–15g.** Those machines were
not built for the high doses that became fashionable, and the fashion itself came
from a practice — hand-filling baskets when grinders could not grind to order —
that no longer applies. Higher doses are not better.

**More coffee is more work.** Extraction is work, and 18g needs roughly 20% more
of it than 15g. Two things follow:

- **Lighter roasts want a lower dose.** A light roast is already hard to extract;
  start it with a big dose and the work is impossible, and the result is sour,
  thin and harsh however you dial it.
- **Darker roasts tolerate a higher dose**, being easier to give up their solubles.
- Better grinders and better machines extend how much work you can do, which is
  the real reason equipment quality shows up in the cup.

The old rule of thumb — dense, high-grown, washed coffees are harder to extract
than lower-grown ones — still roughly holds, but it is a rule of thumb.

**Keep the dose constant.** It is the last variable to change, not the first.

**The exception, and it is the most useful practical rule in the whole method:**
when a shot is nearly right, nudge the dose half a gram instead of moving the
grinder. More coffee is more resistance, which buys a few seconds — in one
episode exactly this took a shot from 25 seconds to 28 or 29 — and it costs
nothing, where a grind change costs five to ten grams of purge.

Two conditions, both his:

- **Only in the neighbourhood of good.** A long way out, leave the dose alone and
  fix the grind.
- **Going up needs room under the basket's figure.** He notes he could do it
  because he was nowhere near the top of the range. Coming down has no such
  limit, and brings the bonus that there is less to extract.

**Dropping the dose is also the last refinement for a light roast.** In the first
dial-in episode the final move — after grind had found the window and yield had
been pushed out for extraction — was 18g down to 17g with the yield held, going
finer at the same time. Less coffee is less work, so it can take a finer grind
and a longer ratio, and that combination is what made the shot balanced.

**Caffeine is a real constraint on a hobby.** A bigger dose is a bigger dose of
caffeine. Lower doses mean more shots in a day, which is most of why the Italian
14g double is a more sensible thing than it was ever given credit for.

---

## Step 2 — Channelling, which is what usually went wrong

Most bad espresso at home is water finding a path through part of the bed rather
than flowing evenly through all of it.

### What it tastes like

Sour **and** bitter at the same time, with a harsh, biting aftertaste — and
**weaker and more hollow than the strength would lead you to expect**.

The mechanism is worth understanding, because it corrects a piece of received
wisdom. What gets called "over-extraction from grinding too fine" is usually not
over-extraction at all. The puck *as a whole* may well be **under**-extracted —
measured on a refractometer, very fine grinding makes total extraction go *down*
— while the coffee immediately around the channels is extracted far past where
anyone would want it. That localised excess is where the bitterness comes from.
So it is **uneven extraction wearing over-extraction's clothes**.

The practical instruction is unchanged — go coarser — but the reason matters,
because it explains why grinding finer to "fix" a sour shot can make it sour
*and* bitter rather than fixing anything.

**A shot can hit every number and still be channelling.** In the third dial-in
episode the brew ratio and the time were both right and the cup still was not,
and the tell was the flow chart: a sudden uptick in flow late in the shot, even
as pressure was declining. The clock cannot see this. Only the eye or the mouth
can, which is the whole reason the app asks how the shot ran rather than
inferring it.

### What it looks like, and this depends on your portafilter

- **Bottomless:** uneven flow across the basket, most visible in the last third
  of the shot; sprays and jets.
- **Spouted:** you cannot see the bed at all. What you get instead is a **sudden
  increase in flow rate late in the shot** — coffee gushing from the spouts in
  the last third, or the last half when it has gone badly wrong.

### What prevents it

1. **Break up the clumps.** Grinding into a separate container, shaking out the
   clumps and dosing from there works; so does WDT. Cheaper grinders clump more,
   and clumps encourage channelling.
2. **Distribute evenly**, then level.
3. **Tamp flat.** Level matters more than force.
4. **Don't go too fine.** Past a point the puck channels regardless of how well
   it was prepared, because the resistance is simply too high for the pressure.
5. Keep the rim clean and the shower screen clear.

Hedrick's written material prefers a shaker and careful dumping over elaborate
tamping technique, and his testing of distribution tools reportedly found they
converge — the gain being in distributing at all rather than in which tool does
it. **[hedrick]**

**The ordering of that list is [assembled].** All five are supported; their rank
is not.

---

## Step 3 — Ratio: pick one, then mostly leave it

**Weigh the liquid out. Never measure it by volume.** Crema is largely CO2, so a
fresher coffee produces more foam and less liquid for the same volume. Two shots
that look identical in the cup can be different recipes. This is also why pulling
by eye at altitude is close to impossible — lower ambient pressure makes crema
bigger and less stable.

**The ratio bands that name the drink:**

| | |
|---|---|
| Ristretto | about 1:1 to 1:1.5 |
| Espresso | about 1:1.5 to 1:2.5 |
| Lungo | above roughly 1:2.5 |

Hoffmann starts around **1:2 to 1:2.2** and holds it fixed while dialling. That
is stated as personal preference, not as a function of roast level.

**More water extracts more — and costs strength.** Ratio is one control moving
two outputs: push more liquid through and you raise extraction while losing body,
texture and the richness that makes espresso espresso. Push far enough and you
can get a balanced drink out of very coarse coffee — it just will not be espresso
any more.

**2–3g of yield is a real change**, and a small one to make. Going from 36g to
39g can take a shot from a slight harsh sourness to something clean and balanced.

**Past 2–3g you are changing the drink, not dialling it.** Beyond that the
dilution starts costing the texture you were aiming for, and the right move is
dose or grind instead. This is the ceiling the app was missing.

**Roast level and ratio.** Hedrick's position is *ratio over grind size* for
light roasts — reach for a longer ratio before grinding finer when a light roast
will not give up enough. **[hedrick]** Hoffmann gives no roast-to-ratio mapping
in the series at all; the app's ratio-by-roast table is **[assembled]** and
should be read as a starting point.

---

## Step 4 — Grind: the big moves, and only the big moves

Finer exposes more surface area, which is what makes extraction possible in the
small amount of water espresso uses. But finer also packs the bed tighter, which
slows the flow and lengthens contact. One change, two consequences — which is
what makes grind the most frustrating variable of the set.

**Go as fine as you can before the puck starts to channel.** That is the target,
and the ceiling is set by your puck prep, your pressure and your grinder.

### Use grind to get close, and other variables to finish

Grind gets the flow into the ballpark. Once there, the small corrections come
from **dose and yield**, not from the grinder. The reason is practical rather
than theoretical: most grinders retain grounds from the previous setting, so
every grind change costs a purge, and purged coffee is coffee you never drink.

- **Purge 5–10g after a grind change**, depending on the grinder. Better to waste
  five grams than to pull a whole shot at a setting that was still half the old
  one.
- If a shot is still a long way from good — dominantly sour, say — go finer
  again, **even if that takes the time outside the window**. The window is a
  guide, not a constraint on fixing something badly wrong.
- **On a stepped grinder with coarse steps, take the finer of the two**, even if
  that means dropping the dose a little. A slightly-too-fine shot is a better
  place to be stuck than a slightly-too-coarse one.

### One flow-related variable at a time

Grind and dose both change how hard it is for water to get through. Change both
in one shot and neither result means anything.

**This is the discipline for getting started, not a universal law.** In the
second dial-in episode he moves three things at once — temperature down two
degrees, yield in by two grams, grind slightly finer — and explains the finer
grind as compensating for the extraction the other two give up, then checks the
clock afterwards to confirm the net came out where he expected. That is a
coordinated move with a prediction attached, which is a different thing from
changing two things and hoping. Until you can state the prediction, change one.

### The purge cost is conditional, and the rule above depends on it

"Use grind for big moves only" exists *because* most grinders retain grounds. A
single-dosing grinder that holds almost nothing removes the reason: in the second
dial-in episode he notes he does not really need to purge, and dials a coffee in
using 60g out of a 250g bag. On that kind of grinder, moving the grind is cheap
and there is much less reason to reach for dose and yield instead.

**A new grinder is a confounder.** Unseasoned burrs are noted as not being on his
side — a grinder that has not settled in will not behave consistently yet.

---

## Step 5 — Temperature: a tweak, and a late one

Hotter extracts more. That is the whole mechanism.

| Roast | Brew temperature |
|---|---|
| Dark / more developed | 85–90°C |
| Medium | 88–92°C |
| Light | 90–95°C |

> These replace the ranges an earlier draft of this page carried, which ran 2–3°C
> hot across the board and started the dark band where this one ends.

**One degree is the smallest change worth making** — about two Fahrenheit. From
92, the move is to 93 at the very least and more likely to 94. Machines that
offer tenths of a degree are offering a precision that will not solve a
temperature problem.

**It is not the next thing to reach for.** On a single sour shot, ratio comes
first. Hoffmann is explicit that he rarely changes brew temperature to improve a
shot, because ratio and dose have a bigger impact.

**But there is a second trigger, and the dial-in episodes show it twice.**
Temperature matters most when it is simply *set wrong for the coffee* — a
setting left behind by the last bag rather than chosen for this one. Once at
95°C on a medium roast, caught on the first shot; once at 88°C on a blend that
wanted 93, where the five-degree correction was described as transformative.

That is arithmetic rather than tasting: the roast gives a band, the machine gives
the setting, and a setting outside the band is worth saying before anything is
read into the cup. **When it is wrong, correct the whole way — a degree at a time
is not what fixed either of those shots.**

So there are two paths to a temperature change and they are different:

| Trigger | Evidence needed | Size of move |
|---|---|---|
| Setting is outside the roast's band | The numbers alone, first shot | All the way to the band |
| Setting is in band, cup keeps tasting the same way | The same wall on more than one shot, after ratio and dose | One degree |

**Neither path fires on one in-band sour cup.** Too much else varies between two
shots of the same bag.

**And the band is a starting point, not a verdict.** One roaster's medium is not
another's — he inspects the beans rather than trusting the label — so a coffee
that is marked medium and wants light-roast temperatures is a normal thing, not a
contradiction. That is what the taste path is for.

**What too hot tastes like:** bitter up front, harsh and aggressive, rough-edged,
lacking clarity. Distinguishable from the lingering burnt bitterness of a dirty
machine.

**Start from the roaster's recommendation** where there is one. It outranks any
table, this one included.

**Consistency beats flatness.** A machine with a temperature curve is fine as
long as it is the *same* curve every time. The flat-profile orthodoxy of the PID
era delivered consistency, which was the real win; it did not deliver the step
change in quality it promised.

---

## Step 6 — Pressure and flow, last

**Nine bars is where flow peaks.** Raise pressure and more liquid passes through
the puck in a fixed time — up to about nine bars, past which the water begins
compacting the bed and flow falls again. Nine bars therefore lets you grind the
finest for a given flow rate, which is why it became the standard.

**But it is also the pressure most likely to channel.** Brewing nearer six bars
means grinding coarser, which you would expect to lower extraction — and yet the
improvement in *evenness* can leave you with a better-tasting shot and a higher
extraction than nine bars gave. Match the pressure to the grinder and the puck
prep rather than to the number on the spec sheet.

**Declining pressure through the shot reduces channelling**, because the puck
gets more fragile as it washes away and meeting that with less force keeps it
intact. This is why spring levers work as well as they do. If you can drop to a
lower-pressure phase when you see channelling start, do; on a manual lever seeing
a spritz, ease off rather than pulling harder.

**Pre-infusion** runs from water entering the basket until the machine reaches
full brewing pressure; the point is to wet the bed evenly before full force
arrives. On a normal nine-bar machine with some pre-infusion, **expect six to
eight seconds before liquid appears**. Longer pre-infusion lets you grind finer —
partly because the swollen puck traps fines before they can migrate and sandbag
the basket, and partly because 8–10% of the extraction has already happened
before full pressure hits.

**Flow is an output; pressure is an input.** Watching flow rise mid-shot at
constant pressure *is* watching a channel open — which is what machines with flow
readouts gave people that a bottomless portafilter and good eyes did not.

**Large pressure variations make espresso different rather than better.** The
reliable wins are small: enough pre-infusion to saturate the bed, and enough flow
control to avoid channelling.

### Where the two authorities are consistent, having looked like they were not

Hoffmann found that dropping pressure in the back half of a shot lengthened
contact time without raising extraction — so contact time is not itself an
extraction variable; extraction is set by dose, water and surface area. Hedrick
advocates lower-pressure, higher-flow approaches for light roasts. **[hedrick]**
These read as a conflict and are not: both locate pressure's value in *evenness
and channelling*, not in buying extraction through longer contact.

---

## The things that are not the grinder

- **The dose does not fit the basket.** Step 1 — more than a gram or so over the
  printed figure, where the puck starts meeting the shower screen.
- **The puck channelled.** Step 2.
- **The coffee is too fresh.** Under about four days it is still gassing: shots
  run fast and the setting moves under you daily. Roughly 5–10 days is the
  commonly cited window **[assembled]**, and by six weeks no setting recovers
  what has gone.
- **The grinder is not answering.** Three moves the same way with the clock
  unmoved means old grounds are still coming through — purge 5–10g — or the move
  was too small to detect. A change the clock cannot see teaches nothing.
- **The basket is blocked or the screen is caked.**

---

## The method actually applied

From the first dial-in episode — a light single origin, an 18g basket — because
the order in which he reaches for things is the clearest statement of the method
anywhere in the material.

| Shot | Change | Result |
|---|---|---|
| 1 | 18g → 40g, as the grinder sat | 34s. Slow, harsh, intensely sour |
| 2 | Coarser | 25s. Overshot — now under-extracted |
| 3 | Finer, a smaller move | 27s. Better, not there |
| 4 | Finer again | 29s at 38–39g. Good, wants more extraction |
| 5 | **Yield only**, 38 → 42g | Good clarity, traded texture for extraction |
| 6 | **Dose 18 → 17g**, finer, same 42g out | Sweet, clean, balanced |

Three things to take from it. **Grind found the window, then stopped being the
tool** — the last two moves were yield and dose. **He overshot on the second
shot and halved the next correction**, which is why the app's calibration halves
large moves rather than extrapolating them. And **a light roast will taste
acidic**: he notes the finished shot sits on the acidic end and that this is the
raw material rather than a fault left to chase.

**A shot a long way out is not worth tasting.** At 23 seconds in the third
episode he does not bother — the flow is wrong, fix that first. Taste is the
instrument once the clock is roughly right.

---

## What the app does with all this

| Method point | App behaviour | State |
|---|---|---|
| Kit decides legal advice | Asks temperature / pressure / grind-dial capability, suppresses advice naming absent variables | **built** |
| Machine list prefills capability | 25 machines, 17 grinders, all answers editable | **built** |
| Portafilter type decides the channelling question | Asked in the kit; the run options follow from it | **built** |
| Dose to basket, ±1g | `basketFault` | **built** |
| Underdosing is mess, not a fault | A note that says the shot is fine; no longer outranks the grinder | **built** |
| Lighter roast wants a lower dose | `doseStart` — offset from the basket's rating by roast, never above it | **built** |
| Half-gram nudge instead of a purge | `doseNudge` — offered when close to the window, and only with headroom under the basket | **built** |
| A shot can hit the numbers and still channel | `runFault` and `harshFault` ask rather than infer | **built** |
| Channelling looks different on a spouted portafilter | Bottomless offers "sprayed"; spouted offers "gushed near the end", with its own diagnosis | **built** |
| Ratio 2–4g at a time, with a ceiling | Both in the yield advice | **built** |
| Ratio bands that name the drink | `ratioBand` — the readout says ristretto or lungo when the shot leaves the espresso band, and stays quiet inside it | **built** |
| Grind for big moves, dose/yield for small | `grindIsFor` states it on a correction over 5s; `doseNudge` offers the alternative under it; the help says it plainly | **built** |
| Purge 5–10g | `stuckNote` | **built** |
| Purge cost depends on grinder retention | Asked in the kit and prefilled by the grinder list; the purge advice and the half-gram pitch both change on a single-doser | **built** |
| Round to the finer step on a coarse stepped grinder | `grindMove` | **built** |
| One flow variable at a time | `twoVariables` — names both moves and says the next clock reading cannot attribute either | **built** |
| Time is an output, not a target | In-window shots get "the clock is right, now taste it" | **built** |
| A shot far out is not worth tasting | Said on the start card only | **partial** |
| How far to move the grinder | Measured from the log, in the user's own units, halved when large | **built, beyond the method** |
| Temperature ranges by roast | `ROASTS`, with explicit bands | **built** |
| Temperature after ratio when in band | `suggest()` | **built** |
| Temperature set outside the roast's band | `tempFault` — caught on the first shot, corrects the whole way | **built** |
| Roast age | Appended to whichever move wins | **built** |
| A light roast will taste acidic, and that is the coffee | `roastNote` — on a sour light roast with the clock already right | **built** |

## Open questions

**The app does not define what "time" means.** Hoffmann means button to button.
Somebody timing from first drip, or using a scale that does, is recording a
different quantity — and the grinder calibration treats both as the same one,
which makes its seconds-per-click figure wrong for anyone in the second group.
This is a correctness problem in code, not a wording problem.

**Portafilter type is not asked, and it decides the most diagnostic question in
the app.** "It sprayed" is unobservable with spouts; "it gushed at the end" is
what those users see instead. The run options currently assume a bottomless.

**Turbo and long-ratio light-roast shots are a style, not a fix.** **[hedrick]**
A real answer for somebody stuck on a light roast, but a different destination
rather than a correction — so it belongs as a named alternative offered after the
ordinary route fails, not as a change to the default.

**Hedrick is still second-hand** except for the Meticulous page. The same
treatment given to Hoffmann here would settle the **[hedrick]** claims.

**A third source is in hand and not yet folded in.** A written dial-in
walkthrough from Daddy Got Coffee, which independently confirms the grind-then-
ratio division above — "get in the right ballpark with grind size" because it
overcorrects easily, then fine-tune with ratio because it is "a lot more
forgiving". What it adds that nothing here covers:

- **Extraction runs in a fixed order**: sour compounds first, balanced and sweet
  in the middle, bitter last. This is the mechanism behind the ratio advice —
  extending a shot adds more of the bitter tail, which is *why* it tempers
  sourness, and shortening one leaves that tail in the puck.
- **The salami shot**, which is a training exercise rather than a diagnostic:
  split one shot into three glasses and taste each third to learn what the sour
  and bitter ends actually taste like. The app asks people to judge sour against
  bitter and has never taught them the difference.
- **Solubility as the unifying model.** How much extraction a coffee needs is set
  by how soluble it is, and roast level is only the largest of several inputs.
  Washed and high-grown are denser and less soluble, so they want more; natural
  and fermented are more soluble, so less; **decaf is markedly more soluble and
  also flows faster**, wanting a finer grind but a tighter ratio. That is a
  bigger model than roast alone and the app asks for none of it.
- Tamping force is close to irrelevant once the bed is compressed — level matters
  and pressure does not, so the 30lb rule can go. Spin levellers are singled out
  as the weak option because they do not reach the bottom of the bed.
- Some machines display a temperature that is not the one they brew at.

**Variables this document still does not cover.** Water chemistry, which is real
and large. Basket type beyond its dose rating. Whether the shot is going into
milk, which changes the ratio somebody should want and is never asked.

---

## Sources

### Primary — transcripts worked from directly

James Hoffmann, *Understanding Espresso* and *How I Dial-In Espresso*:

| Episode | ID |
|---|---|
| Dose (#1) | `aTFsBqhpLes` |
| Ratio (#2) | `F4wrUP4c5P4` |
| Brew Time (#3) | `hQaV3w_XNiw` |
| Grind Size (#4) | `er2voEn8ZDU` |
| Brew Temperature (#5) | `QAzE-_ocf1U` |
| Pressure (#6) | `po3oGIicu-8` |
| How I Dial-In Espresso #1 — light single origin | `lFwJF-_SUr0` |
| How I Dial-In Espresso #2 — medium, barrel-aged | `1eK0eidOA_U` |
| How I Dial-In Espresso #3 — blend on a Decent | `aQOKa61YBYc` |

### Written, by Hedrick

- [Meticulous × Lance Hedrick espresso onboarding](https://meticuloushome.com/pages/meticulous-x-lance-hedrick-espresso-onboarding) — ratio over grind size on light roasts; lower temperature for a fine-ground dark roast; deeper baskets for dark roasts; fast flow for light roasts; taste over hitting the profile

### Hedrick video, not yet worked from

`EPF1_15KZvM` (Dialing in Espresso, 44 min) · `DFB6E_7W2c0` (Dialing In By
Taste) · `hrCQKAXJr7s` (Light Roast) · `aZ-NsZjf888` (Using the Bag) ·
`j-Hu4hF5PTM` (Understanding Variables)

### Community guides

- [Dialling In Basics — Espresso Aficionados](https://espressoaf.com/guides/beginner.html)
- [How to Dial In Espresso at Home — Espresso Atlas](https://espressoatlas.com/articles/how-to-dial-in-espresso)
- [How to Dial In Espresso (20-Minute Protocol) — Bean Box](https://beanbox.com/blog/dial-in-espresso)
- [Espresso Headspace — Clive Coffee](https://clivecoffee.com/blogs/learn/headspace-espressos-invisible-enemy) — *the source of the underdosing claim this document has since corrected; retained so the correction is checkable*
