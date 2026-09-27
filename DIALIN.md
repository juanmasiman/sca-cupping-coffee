# Dialling in espresso

**What this document is.** The method the espresso tool gives advice from. Every
instruction the app prints should be traceable to a line in here, and where the
app departs from the method it says so and why. `DESIGN.md` governs how the app
looks and what it is allowed to claim; this governs what it knows about coffee.

**Where it comes from.** James Hoffmann's dial-in sequence, Lance Hedrick's
taste-first protocol, and the community guides that document the consensus
between them. Sources at the end, graded by how close to the source they are.

**A caveat about the sourcing, and it is a real one.** Much of the primary
material is video, which I cannot watch. Fetching the captions was attempted and
failed: YouTube blocks this environment's address outright, and both a caption
downloader and a transcript library were refused. So nothing here is sourced from
watching or reading the videos themselves.

What it *is* sourced from, in descending order of how much weight it should
carry: written material authored by the two of them (Hedrick's Meticulous
onboarding); written community guides that document the consensus method
(Espresso Aficionados, Clive Coffee on headspace); and written analyses and
summaries of the videos by third parties. Where a claim rests only on that last
category it is marked **[thin]**, and where this document's own arrangement goes
beyond what a source says, it says so. Anything **[thin]** should be checked
against the source video before the app leans on it harder than it currently
does.

The video list worth checking against is in *Sources*, with IDs.

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

Advice that names a variable somebody does not have is worse than no advice. A
fixed-temperature machine told to "come up a degree" has been told to do
nothing, and the person believes the app knows something it does not.

Three questions matter:

| Question | Why it changes the advice |
|---|---|
| Can you set brew temperature? | If not, temperature leaves the sheet and the ratio becomes the variable after grind. |
| Can you see or change pressure/flow? | A gauge you can read is diagnosis; a paddle you can move is a variable. They are not the same and should not be offered as the same. |
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

The prep that prevents it:

1. **Break up the clumps.** WDT — stirring the dry grounds with something thin,
   a dedicated tool or a needle or a straightened paperclip — is the common
   form. This is the step that does most of the work.
2. **Level the bed** before tamping.
3. **Tamp flat**, hard enough that the bed does not move afterwards. Level
   matters more than force.
4. **Clean the basket rim** so the portafilter seats properly.
5. **Check the shower screen** is not caked.

**The ordering above is this document's, not an authority's**, and one of them
would arrange it differently. Hedrick's written onboarding describes preferring a
shaker and careful dumping to reduce channelling over elaborate tamping
technique, and his testing of distribution *tools* reportedly found they largely
converge — the gain being in distributing at all rather than in which gadget
does it. Both point the same way as step 1 and away from fussing over step 3,
which is why the list is ordered as it is; but "WDT first" is an inference from
that, not a quotation of it.

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

**The numbers in that table are this document's weakest link.** They are
assembled from general guidance rather than taken from either authority, and the
temperature column in particular — dark at 88–91°C — should be treated as a
starting suggestion and not a finding. The app acts on them, so they are worth
checking before anything else here is.

What *is* better sourced is the direction, and specifically for light roasts:
Hedrick's written onboarding states the principle as **ratio over grind size** —
that reaching for a longer ratio beats grinding finer when a light roast will not
give up enough. It also has lowering temperature as the way to tame bitterness in
a dark roast, particularly when grinding fine, and recommends deeper baskets for
dark roasts so the grind can stay coarser while pressure holds.

He goes considerably further than the table for light roasts — published recipes
at 1:3 and beyond, coarser grinds and high flow rates, the "turbo" and "soup"
approaches. That is a legitimate and different style rather than a correction,
and the app should not quietly push anybody into it. It is worth offering as a
named alternative once somebody is stuck on a light roast that will not stop
being sour. **[thin]** on the specifics; the principle behind it is not.

---

## Step 4 — Grind is the only variable for time

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

Two axes, asked separately, because they have different variables:

- **Sour ↔ bitter** is *extraction*. The variable is grind.
- **Watery ↔ muddy** is *concentration*. The variable is the ratio.

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

**In the window and still on a wall.** Grind has done its job. The next variable is
temperature if the machine has one — up for sour, down for bitter — and the
ratio if it does not. Longer for sour, shorter for bitter, 2–4g at a time.

**Sour and bitter *at once* is not on this axis.** It is channelling, and it
belongs to step 2. A single sour-to-bitter slider cannot express it, so the
sheet carries a separate "sour and bitter at once" chip beside the scale — a
statement that the axis does not apply rather than a position on it.

---

## Step 6 — Temperature and pressure, last and only if you have them

Temperature is a genuine variable and a small one: a degree or two, in the
direction the taste says. Up extracts more, down extracts less.

Pressure and flow are the last thing to touch and the first thing marketing
talks about. The direction is that darker roasts suit lower flow and less
pre-infusion, and lighter roasts want more of either — Hedrick's written
onboarding puts it as fast flow suiting light roast, on the grounds that very
light coffees often taste better from a fast, low-contact shot. The same source
has light roasts frequently peaking well below the traditional nine bar, nearer
two to six.

Both are useless to somebody whose machine holds one pressure and one flow, which
is what step 0 is for. They are recorded here because the document should be
complete, not because the app should start saying them.

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
| 0. Kit decides legal advice | Asks temp / pressure / grind-dial capability; suppresses advice naming absent variables | **built** |
| 0. Machine list prefills capability | 25 machines and 17 grinders fill in the answers above; every one stays editable and "Something else" is always there | **built** |
| 1. Dose to basket by weight | `basketFault` — flags >1.5g off the basket's rating, outranks everything | **built** |
| 1. Verify by volume (coin test) | `openDoseCheck` — the coin test with three outcomes, each moving the dose a gram; offered from setup, from Settings with the date last done, and from a button on the advice itself | **built** |
| 2. Puck prep gates everything | `runFault` — asks how the shot ran, and channelling outranks grind advice | **built** |
| 3. Ratio from roast, set not chased | Roast table offers a starting ratio and temperature, never writes the target itself | **built** |
| 3. Turbo / long-ratio light-roast style | — | **not built, deliberate** — see Open questions |
| 4. Grind is the only time variable | All clock advice is grind advice | **built** |
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

**The roast table's temperatures are assembled, not sourced.** See step 3. The
app acts on them, which makes them the highest-value thing on this page to get a
professional's ruling on.

**The videos have not been read, and the captions could not be fetched.** The
environment this was written in is blocked by YouTube — a caption downloader and
a transcript library were both refused at the IP. Everything **[thin]** therefore
rests on third-party written summaries. The episode list is in *Sources* with
IDs; anyone who can open them can close this out, and the highest-value six are
marked.

**Variables this document does not cover at all.** Water chemistry, which is a
real and large one. Pre-infusion as its own step rather than a note under
pressure. Basket type beyond its dose rating. Whether the shot is going into milk
— which changes the ratio somebody should want, and is never asked.

---

## Sources

### Written, by the authorities themselves

Carries the most weight of anything here, because it is their own words in text.

- [Meticulous × Lance Hedrick espresso onboarding](https://meticuloushome.com/pages/meticulous-x-lance-hedrick-espresso-onboarding) — ratio over grind size on light roasts; lower temperature to tame a fine-ground dark roast; deeper baskets for dark roasts; fast flow suiting light roast; light-roast pressure peaks nearer 2–6 bar than 9; taste over hitting the profile

### The videos — unread, and the work still to do

Captions could not be fetched from this environment. The six marked ★ are the
ones that would settle the most, and the `Understanding Espresso` series is the
closest thing to a primary text either author has published on the subject.

| Video | ID | Settles |
|---|---|---|
| ★ Hoffmann — Understanding Espresso: Dose (#1) | `aTFsBqhpLes` | dose-to-basket, tolerance |
| ★ Hoffmann — Understanding Espresso: Ratio (#2) | `F4wrUP4c5P4` | the ratio table |
| ★ Hoffmann — Understanding Espresso: Brew Time (#3) | `hQaV3w_XNiw` | time as symptom vs target |
| ★ Hoffmann — Understanding Espresso: Grind Size (#4) | `er2voEn8ZDU` | grind as the time variable |
| ★ Hoffmann — Understanding Espresso: Brew Temperature (#5) | `QAzE-_ocf1U` | the temperature column |
| Hoffmann — Understanding Espresso: Pressure (#6) | `po3oGIicu-8` | step 6 |
| Hoffmann — A Rant: Espresso Ratios & Recipes | `45Ja8pJU73s` | whether the ratio is chased |
| Hoffmann — A Beginner's Guide To Fixing Bad Espresso | `MbTD42FvMVU` | the fault decision tree |
| Hoffmann — Espresso Machine Baskets Explained | `3oFV88PzEFE` | basket type, step 1 |
| Hoffmann — How I Dial-In Espresso, parts 1–3 | `lFwJF-_SUr0`, `1eK0eidOA_U`, `aQOKa61YBYc` | the sequence in practice |
| ★ Hedrick — Dialing in Espresso: A Very Good Guide | `EPF1_15KZvM` | the whole method, 44 min |
| Hedrick — Dialing In By Taste (pt. 2) | `DFB6E_7W2c0` | step 5 |
| Hedrick — How To Dial In Light Roast Espresso | `hrCQKAXJr7s` | the light-roast style |
| Hedrick — Using Information from the Bag | `aZ-NsZjf888` | roast level as a starting point |
| Hedrick — Understanding Variables to Dial In | `j-Hu4hF5PTM` | the variable order |

### Written, about the authorities or documenting the consensus

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
