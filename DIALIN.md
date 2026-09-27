# Dialling in espresso

**What this document is.** The method the espresso tool gives advice from. Every
instruction the app prints should be traceable to a line in here, and where the
app departs from the method it says so and why. `DESIGN.md` governs how the app
looks and what it is allowed to claim; this governs what it knows about coffee.

**Where it comes from.** James Hoffmann's dial-in sequence, Lance Hedrick's
taste-first protocol, and the community guides that agree with both
(Espresso Aficionados, Clive Coffee on headspace). Sources at the end.

**A caveat about the sourcing.** Much of the primary material is video, which I
cannot watch. This is assembled from written analyses, published recipes,
transcript-derived summaries and written guides. Where the two authorities are
reported as disagreeing, or where a claim rests on a single second-hand summary,
it is flagged as such rather than stated flatly. Anything marked **[thin]**
should be checked against the source video before the app leans on it harder
than it currently does.

---

## The one-sentence version

Lock the variables that are not about taste — kit, dose, puck — then use grind
to put the shot in a time window, then use taste to finish, and change one thing
at a time.

The order matters more than any individual number, because each step is only
measurable once the ones above it are settled. A shot whose dose does not fit
the basket cannot tell you anything about grind; a shot that channelled cannot
tell you anything about anything.

---

## Step 0 — The kit decides which advice is legal

Before anything: what can this machine and grinder actually change?

Advice that names a lever somebody does not have is worse than no advice. A
fixed-temperature machine told to "come up a degree" has been told to do
nothing, and the person believes the app knows something it does not.

Three questions matter:

| Question | Why it changes the advice |
|---|---|
| Can you set brew temperature? | If not, temperature leaves the sheet and the ratio becomes the lever after grind. |
| Can you see or change pressure/flow? | A gauge you can read is diagnosis; a paddle you can move is a lever. They are not the same and should not be offered as the same. |
| Does the grinder count clicks, or read a number? | Only so the app uses the brewer's own words. It never suggests a *setting* — those mean nothing across machines — only a direction and a distance. |

**A machine list is a shortcut to these answers, never a substitute for them.**
Knowing somebody owns a Gaggia Classic tells you it has no PID *unless they
fitted one*, and a meaningful share of them have. So the list prefills the three
answers and the person can correct any of them; the capability, not the name, is
what the app reasons from. A brand table is stale within a year and wrong about
every modified machine, and the app must never be in a position where the only
way to get correct advice is to own an unmodified machine that made the list.

---

## Step 1 — Dose to the basket, by weight *and* by volume

**Weight first.** Every basket is built for a dose and has roughly a gram and a
half of give either side. Stay inside it. This is the number the app already
asks for.

**Then verify by volume, because the weight is not the whole story.** Two coffees
at the same 18g occupy different volumes — a light roast is denser than a dark
one, and a coarser grind settles differently — so the same number on the scale
can leave the right gap under the shower screen with one bag and no gap at all
with the next.

That gap is **headspace**: the distance between the tamped puck and the shower
screen. The working target is about **2mm**, or about **3mm if you use a puck
screen**, counting its thickness.

**The coin test** is how you measure it without tools:

1. Dose and tamp as usual.
2. Lay a coin flat on the puck.
3. Lock the portafilter in, then take it straight back out.
4. Look at the coin and the puck.

- **The coin is pressed into the coffee, or there is a screw imprint on the
  puck** → too little headspace. The puck is meeting the screen before the pump
  does. Come down a gram and test again.
- **The coin is untouched and sitting loose** → probably too much headspace, if
  the dose is also under the basket's rating. Water hits a dry bed with room to
  move it around, and the bed breaks. Come up a gram.
- **The coin is just kissed — marked but not buried** → that is the gap.

**Why this is step 1 and not a footnote.** Both failure modes cause channelling,
and channelling makes every later measurement meaningless. You cannot grind your
way out of a dose that does not fit the basket, and a person who does not know
this will spend a bag trying.

---

## Step 2 — Puck preparation, before any number is believed

Most bad espresso made at home is not a grind setting. It is water finding a
crack and going round the bed instead of through it.

When that happens the clock runs quick — part of the bed offered no resistance —
and the cup is **sour and harsh at the same time**, because one part of the puck
over-extracted while the rest barely brewed. Both authorities and every guide
agree on the tell: **sour *and* bitter together is channelling, not a grind
problem.** Grinding finer tightens the bed and makes the crack worse.

The prep that prevents it, in order of how much it pays:

1. **WDT** — stir the dry grounds with something thin to break up clumps. A
   dedicated tool, or a needle, or a straightened paperclip. This one motion
   does most of the work.
2. **Level the bed** before tamping.
3. **Tamp flat**, hard enough that the bed does not move afterwards. Level
   matters more than force.
4. **Clean the basket rim** so the portafilter seats properly.
5. **Check the shower screen** is not caked.

Hedrick's testing of distribution *tools* found they largely converge — the
gain is in doing the distribution at all, not in which gadget does it. **[thin]**

---

## Step 3 — Set the ratio. Do not chase it.

The baseline both authorities start from: **18g in, 36g out, 1:2, around 93°C,
in roughly 25–30 seconds.**

Ratio is a decision about the kind of drink you want, not a dial you tune every
shot. Set it and leave it while you work on grind.

Roast level moves the starting point more than anything else printed on the bag,
because a light roast is dense and less soluble and a dark one gives up too much
at the same settings:

| Roast | Ratio | Temperature |
|---|---|---|
| Light | 1:2.2 – 1:2.5, sometimes longer | 93–95°C |
| Medium | 1:1.9 – 1:2.1 | 92–93°C |
| Dark | 1:1.7 – 1:1.9 | 88–91°C |

Hedrick goes considerably further than this for light roasts — published recipes
at 1:3 and beyond, coarser grinds and high flow rates ("turbo" and "soup"
shots). That is a legitimate and different style rather than a correction to the
above, and the app should not quietly push somebody into it. It is worth
offering as a named alternative once somebody is stuck on a light roast that
will not stop being sour. **[thin]**

---

## Step 4 — Grind is the only lever for time

Finer is slower; coarser is faster. Nothing else on the machine moves the clock
nearly as much.

**Time is a flow meter, not a goal.** This is Hedrick's line and it is the most
useful sentence in the whole method. The 25–30 second window is not a verdict on
the coffee — it tells you whether water is moving through the bed at a sane
rate. Once you are inside it, time has told you everything it can and taste
takes over.

The corollary is that **chasing seconds after you are already in the window is
wasted work**, and an app that keeps talking about the clock there is giving
busywork instead of advice.

**How far to move** is the question every guide dodges, because a grinder's
numbers mean nothing on any other grinder. The app answers it from the person's
own log: two shots differing only in grind are a measurement of *that* grinder,
so it can say "about three clicks" in their own units instead of "a small
step". See `DESIGN.md`. This is the one place the app goes beyond the published
method, and it does so by measuring rather than by asserting.

---

## Step 5 — Taste decides, and the two walls are separate questions

Once the shot is in the window, the cup is the instrument.

Two axes, asked separately, because they have different levers:

- **Sour ↔ bitter** is *extraction*. The lever is grind.
- **Watery ↔ muddy** is *concentration*. The lever is the ratio.

Read together, each corner has exactly one move:

| | | |
|---|---|---|
| sour + watery | under-extracted | grind finer |
| bitter + muddy | over-extracted | grind coarser |
| sour + muddy | ratio too short | let it run longer |
| bitter + watery | ratio too long | stop it shorter |

The first two are the pair every barista learns, because one change moves both.
The other two are where people get stuck, because the wall you notice sends you
to the grinder and the grinder is not what is wrong.

**In the window and still on a wall.** Grind has done its job. The next lever is
temperature if the machine has one — up for sour, down for bitter — and the
ratio if it does not. Longer for sour, shorter for bitter, 2–4g at a time.

**Sour and bitter *at once* is not on this axis.** It is channelling, and it
belongs to step 2. A single sour-to-bitter slider cannot express it, so the
sheet carries a separate "sour and bitter at once" chip beside the scale — a
statement that the axis does not apply rather than a position on it.

---

## Step 6 — Temperature and pressure, last and only if you have them

Temperature is a genuine lever and a small one: a degree or two, in the
direction the taste says. Up extracts more, down extracts less.

Pressure and flow are the last thing to touch and the first thing marketing
talks about. Lower flow and lower pre-infusion suit darker roasts; lighter
roasts generally want more of either. **[thin]**

Neither should be offered to somebody whose machine does not have them, which is
what step 0 is for.

---

## The things that are not the grinder

Kept together because each one can eat a whole bag while somebody turns a dial:

- **The dose does not fit the basket.** Step 1.
- **The puck channelled.** Step 2.
- **The coffee is too fresh.** Under about four days off roast it is still
  gassing: shots run fast, pucks break, and the setting moves under you every
  day. The commonly cited sweet spot is roughly **5–10 days**, and by six weeks
  the coffee has lost what made it worth dialling and no setting brings it back.
- **The grinder is not answering.** Three moves the same way with the clock
  unmoved means the burrs are holding grounds from the last setting — purge a
  couple of grams — or the move was too small to see. A change the clock cannot
  detect teaches nothing; go two or three times further.
- **The basket is blocked or the screen is caked.**

---

## What the app does with all this

| Method step | App behaviour | State |
|---|---|---|
| 0. Kit decides legal advice | Asks temp / pressure / grind-dial capability; suppresses advice naming absent levers | **built** |
| 0. Machine list prefills capability | 25 machines and 17 grinders fill in the answers above; every one stays editable and "Something else" is always there | **built** |
| 1. Dose to basket by weight | `basketFault` — flags >1.5g off the basket's rating, outranks everything | **built** |
| 1. Verify by volume (coin test) | `openDoseCheck` — the coin test with three outcomes, each moving the dose a gram; offered from setup, from Settings with the date last done, and from a button on the advice itself | **built** |
| 2. Puck prep gates everything | `runFault` — asks how the shot ran, and channelling outranks grind advice | **built** |
| 3. Ratio from roast, set not chased | Roast table offers a starting ratio and temperature, never writes the target itself | **built** |
| 3. Turbo / long-ratio light-roast style | — | **not built, deliberate** — see Open questions |
| 4. Grind is the only time lever | All clock advice is grind advice | **built** |
| 4. Time is a flow meter | In-window shots get "the clock is right, now taste it" rather than more clock talk | **built** |
| 4. How far to move | Measured from the person's own log, in their units, with a predicted landing time | **built, beyond the method** |
| 5. Two walls, separate questions | Two scales, four corners, one move each | **built** |
| 5. Sour *and* bitter at once | A "sour and bitter at once" chip under the taste scale; diagnosed as channelling and outranks grind | **built** |
| 6. Temperature then pressure, last | Offered only where the kit has them | **built** |
| Roast age | Appended to whichever move wins | **built** |
| Grinder not answering | `stuckNote` — three moves, no clock response, take a bigger step | **built** |

---

## Open questions

**Turbo and long-ratio light-roast shots are a style, not a fix.** Hedrick's
1:3-and-beyond recipes are a real approach and a real answer for somebody stuck
on a light roast, but they are a different destination rather than a correction,
and an app that silently steers people there is making a taste decision on their
behalf. The honest form is a named suggestion offered after the ordinary route
has failed, not a change to the default.

**The sourcing on the two authorities' finer points is second-hand.** Everything
marked **[thin]** rests on written summaries of video. Before the app asserts any
of it more confidently than it does now, it should be checked against the source.

---

## Sources

- [Dialling In Basics — Espresso Aficionados](https://espressoaf.com/guides/beginner.html) — variable lock order, dose-to-basket, ratio vs grind by taste, temperature baseline
- [Analysing James Hoffmann's "How I Dial-In Espresso" — Coffee Forums UK](https://www.coffeeforums.co.uk/threads/analysing-james-hoffmanns-how-i-dial-in-espresso-part-1.54852/) — sequence and method
- [Hoffman Method: James Hoffmann Espresso Technique — Complete Home Barista](https://completehomebarista.com/guides/hoffman-method-james-hoffmann-espresso-technique/) — dose, ratio, time baseline
- [James Hoffmann Espresso Dialing In — Unpacking Coffee](https://unpacking.coffee/recipes/40-james-hoffmann-espresso-dialing-in) — 18g / 36g / 1:2 / ~93°C baseline
- [How to Dial In Espresso at Home — Espresso Atlas](https://espressoatlas.com/articles/how-to-dial-in-espresso) — sour/bitter/both decision tree, puck prep list
- [How to Dial In Espresso (20-Minute Protocol) — Bean Box](https://beanbox.com/blog/dial-in-espresso) — "flow meter, not a goal", freshness window
- [Espresso Headspace: What It Is & Why It Matters — Clive Coffee](https://clivecoffee.com/blogs/learn/headspace-espressos-invisible-enemy) — headspace, the coin test
- [Managing Espresso Basket Headspace — Papel Espresso](https://www.papelespresso.com/how-to-manage-headspace-in-your-espresso-basket-for-better-pucks/) — 2mm target, puck screen allowance
- [Lance Hedrick on distribution tools — Qava](https://qavashop.com/en/academy/Post/surprising-results-from-lance-hedrick-testing-distribution-tools-wdt-autocomb-moonraker-ncd-etc) — distribution tools converge
- [Lance Hedrick — Turbo Shot Espresso](https://www.beanbook.app/recipes/lance-hedrick--turbo-shot-espresso__85fc91af-a0d6-4cac-ab79-a279895d3adc?brewer=espresso) and [Soup Method](https://beanbook.app/recipes/dc-lance-hedrick--soup-method-espresso__77034718-fab7-4e21-be87-f71f64cee3e7) — light-roast long-ratio styles
- [Lance Hedrick's rant on going coarser and flow rate — Home Barista](https://www.home-barista.com/tips/lance-hedricks-rant-on-going-coarser-and-impact-flow-rate-t91621.html) — flow rate and roast level
