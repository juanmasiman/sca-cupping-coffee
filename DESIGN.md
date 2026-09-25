---
name: lento cupping — Anchored Scale
description: Sensory-science notation for a scoresheet held over a cupping table in unpredictable light.
colors:
  paper: "#fbfaf7"
  panel: "#ffffff"
  ink: "#16181c"
  ink-dim: "#565b63"
  ink-faint: "#6a6f75"
  line: "#d9dad4"
  rail: "#8c8d89"
  data: "#1d4f73"
  data-soft: "rgba(29, 79, 115, 0.10)"
  alert: "#9a3412"
  paper-dark: "#0f1113"
  panel-dark: "#171a1d"
  ink-dark: "#e9ecef"
  ink-dim-dark: "#98a0a8"
  ink-faint-dark: "#848a91"
  line-dark: "#2a2e33"
  rail-dark: "#6a6d70"
  data-dark: "#6fb6de"
  data-soft-dark: "rgba(111, 182, 222, 0.14)"
  alert-dark: "#f0a077"
  wheel-floral: "#e87fa8"
  wheel-fruity: "#e0464b"
  wheel-sour-fermented: "#e5c650"
  wheel-green-vegetative: "#5fa855"
  wheel-other: "#9aa3ab"
  wheel-roasted: "#8a4a2b"
  wheel-spices: "#b8452f"
  wheel-nutty-cocoa: "#c08a4e"
  wheel-sweet: "#e8963f"
  print-ink: "#000000"
  print-ink-dim: "#444444"
  print-ink-faint: "#555555"
  print-foot: "#666666"
  print-rule: "#999999"
  print-rule-light: "#dddddd"
typography:
  score:
    fontFamily: "Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  value:
    fontFamily: "Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
  engraved:
    fontFamily: "Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.05em"
  tick:
    fontFamily: "Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "9px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  ui:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  title:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  reading:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  display-lg:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  display:
    fontFamily: "Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
rounded:
  none: "0px"
  sm: "3px"
  md: "4px"
  pill: "999px"
  knob: "50%"
type-ramp: ["9px", "11px", "13px", "15px", "17px", "20px", "24px", "30px", "40px"]
spacing:
  space-1: "2px"
  space-2: "4px"
  space-3: "8px"
  space-4: "12px"
  space-5: "16px"
  space-6: "20px"
  space-7: "24px"
  space-8: "32px"
components:
  scale-track:
    height: "48px"
    backgroundColor: "{colors.paper}"
  scale-knob:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.data}"
    rounded: "{rounded.knob}"
    size: "32px"
    typography: "{typography.value}"
  scale-knob-empty:
    backgroundColor: "transparent"
    textColor: "transparent"
    rounded: "{rounded.knob}"
    size: "32px"
  section-clear:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.knob}"
    size: "24px"
  score-readout:
    textColor: "{colors.ink}"
    typography: "{typography.score}"
  score-readout-provisional:
    textColor: "{colors.ink-dim}"
    typography: "{typography.score}"
---

## Overview

A cupping score is not a button you press. It is a **position on a scale with anchors at both ends and at the middle**, and SCA 104-2024 says so explicitly. This world takes the notation sensory science already uses for exactly that — the anchored line scale, the reference standard, the intensity ruler — and makes it the interface rather than a decoration on top of one.

The consequence that matters: because meaning is carried by *position*, colour is freed to do exactly one job. It encodes value. Nothing else on the surface is coloured. A page where only the data is coloured reads instantly in bad light, because everything competing for attention has been removed rather than balanced.

This **replaces** the previous cream-and-copper world. That world was the first idea the category has — dark-roast brown on cream, a gradient wordmark, a trophy on the results screen — and it read as a café brand rather than the instrument a grader uses to make a claim about a lot. The old look is evidence of what this product is, not authority over what it becomes. Product truth, content, terminology and every SCA constraint carry over untouched; only the visual world is replaced.

The surface this world was designed against is the scoresheet mid-session: eight sections, a thumb on glass, coffee cooling on a timer. Anything that cannot survive that scene does not belong here.

## More than one app

lento.cafe carries a cupping sheet, an espresso dial-in and a filter brew log. They are separate instruments with separate shells — a cupper at a table and a barista on a bar are not running the same software, and neither should wait for the other's code to load — but they are one product and this is one law.

What a browser can read lives in two files under **`public/shared/`**.

**`tokens.css`** is the palette for both themes, the two faces, the spacing scale, radius and easing. All three apps link it first and precache it. A second copy of the palette is a second palette inside a month, and the figures in this document were measured once.

**`components.css`** is the parts the two instruments are built from — the board, the sheet, the number field, the two-ended scale, the buttons, the modal, the switch, the segmented control, the toast. The espresso dial-in and the filter brew log link it and between them add almost nothing: the dial-in has no stylesheet of its own at all, and the brew log's holds only its pour schedule.

**Where the line falls was measured, not assumed.** The previous edit of this document said the component layer should cover all three apps. That was wrong, and comparing them says so: of the 190 rules the two instruments share, every one is byte-identical; of the 27 selectors the cupping sheet has in common with them, **27 have different bodies**. Cupping's `.screen` is position-fixed because it is a full-screen instrument you live inside for an hour with swipeable panels, where these two scroll like documents. Its scale knob is 32px and hollow because it carries the number inside it; theirs is 28px and solid because it does not. Its sheets are 440px on a card ground; theirs are 560px on the page ground. Its `.btn-danger` is filled red; theirs is outlined. Folding it in would mean changing how one of them renders — and a refactor that changes rendering is not a refactor. **Two surfaces that are genuinely different are allowed to be different. What is not allowed is two copies of the same one.**

**A component named after the drink is a component you will write twice.** The dial-in called its record card `.shot-card` and the brew log called the identical thing `.brew-card`, with twenty-eight rules each that differed only in a noun — which is how a shared layer hides from you. They are one object: a logged event with a headline number, a time, a line of what changed, taste pips and a next move. It is `.log-card` now, in one place.

**The proof that an extraction changed nothing is a picture, not an argument.** Seventy-two surfaces — every screen and sheet of all three apps, both themes, at 390px and 360px — were screenshotted before and after and compared pixel by pixel, with the clock frozen so the harness could not report the time of day as a regression. Identical. Anything less and "it looks the same to me" is doing the work that a diff should.

**The rule that travels between them is the one about evidence.** On the cupping sheet: a score is evidence only for the sections somebody rated, and a cup score is defined as a sum over all of them, so an unfinished sheet has no score at all. On the dial-in it is the same sentence about a different measurement:

- **No refractometer reading, no extraction yield.** Ratio is not extraction, time is not extraction, and a shot that tastes right is not a measurement. Other tools estimate it. This one returns nothing, because an estimate and a reading are the same pixels once they are set in the same type, and only one of them is a fact.
- **A shot missing its yield has no ratio**, and the card says which measurement is absent and what could not be built from it rather than printing a dash and leaving the reader to work it out.
- **Nothing is fast or slow until the window is stated.** The window is a field on the coffee, not a constant in the code.

**A suggestion from the bag is one variable, and says so.** Roast level moves espresso extraction more than anything else printed on a bag — light is dense and less soluble and wants more heat and a longer ratio; dark gives up too much at the same settings. Tools in this category build a starting point from roast, process, elevation and origin together. The other three are real and much weaker, and folding a weak signal into a strong one does not make the answer more reliable, it makes its confidence harder to read. So the dial-in offers a starting temperature and ratio from roast alone, states the range it came from, never writes to the target on its own, and says in the same breath that the grinder, machine, water and palate finish the job.

**The recipe is not rewritten as the coffee ages.** Beans degas; a shot dialled in on day five runs faster on day fourteen at the same setting. The move is small and it belongs on the grinder, so the dialled-in figure stays exactly as it was found and where the grinder is sitting today is recorded beside it, as a distance from it. Overwriting the recipe to match loses the thing you spent four shots finding, and with it any reference for the next bag of the same coffee.

**What you meant to change is checked against what moved.** The commonest failure in a dial-in is not a bad guess — it is moving two things at once, or believing you moved one when you did not. The app already computes the difference between a shot and the one before it; recording the intention beside it is what lets software catch that class of mistake at all. It speaks only on disagreement, names the field, and says nothing when they agree. An empty field is not a zero: a grind nobody recorded reads as absent, not as a grind of 0, or "finer" against a blank previous shot becomes a confident accusation built on a field nobody filled in.

**Advice says which kind of advice it is.** The dial-in suggests a next move, and espresso has one dominant variable — grind — which is dominant in two of the four corners, not all of them. Sour and fast, or bitter and slow, and grind fixes both at once: those get an instruction and a rule in the data ink. Sour and *slow*, or bitter and *fast*, do not point at grind at all, and going finer on a shot that is already slow makes it worse: those get a list of what to look at, no pick, and a rule in the instrument grey. The difference is carried by the words and the rule, never by colour alone. This is the same line the calibration block takes on the cupping side — direction is a habit, not a verdict.

**Two walls, not one, and they are asked separately because they are answered separately.** Sour and bitter are what extraction does, and grind is the lever, because grind moves time. Watery and muddy are what *concentration* does, and grind is not the lever at all: a shot can be extracted perfectly and still be thin, because thin is about how much coffee ended up in the cup. That is ratio and dose. Asking "how was it" as one question is what makes espresso advice feel like guesswork — the drinker says "bad" and the tool picks an axis on their behalf. So there are two scales on the sheet and each has its own named ends.

**Read together they disagree about nothing, and the pair outranks either wall alone.** Advised separately the two axes can point opposite ways about the same lever: a sour, thin shot got "let it run longer" from one scale and "stop it shorter" from the other, stacked, both about the ratio. Two instructions for one shot is not advice, and a dial-in moves one thing at a time. Each corner of the pair has exactly one answer:

| | watery | muddy |
|---|---|---|
| **sour** | under-extracted → **grind finer** | the ratio is too short → **let it run longer** |
| **bitter** | the ratio is too long → **stop it shorter** | over-extracted → **grind coarser** |

The diagonal is the pair every barista learns first: one change moves both walls. The anti-diagonal is where people get stuck, because the wall they notice sends them to the grinder and the grinder is not what is wrong. The clock still outranks the cup on the two grind answers — finer is the wrong move on a shot that is already slow however it tastes — and the app says so rather than repeating itself louder. Exactly one move is printed per shot, on every surface.

**The sheet asks for what your machine can change, and the advice never names a lever you do not have.** A brew-temperature field on a machine that holds one temperature is an invitation to write down a number you did not set, which the app then quotes back at you as though it were a decision. "Brew temperature is the usual next lever, up a degree or two" is not a suggestion to somebody standing at a Bambino Plus; it is the app admitting it does not know what they are in front of. So the kit is asked once, before the first shot: whether the temperature is settable, whether pressure can be seen or moved, whether the grinder counts clicks or reads a number, and which basket. The answers remove fields from every shot sheet and rewrite the advice — on a fixed-temperature machine the in-the-window-and-still-sour case points at the ratio instead, which is a real lever and one they have.

What the app asks for is what the machine can *change*, never its name. A brand table goes stale within a year, misses every import, and is wrong about anything modded — a Gaggia Classic with a PID is a different machine from the one on the box. The names are carried as the user's own record and nothing is read out of them. The defaults are the commonest home setup, so skipping the screen leaves somebody with the simplest sheet rather than the fullest one.

**Grind is one of the numbers, not one of the details.** It sat in a collapsed "and the rest" drawer with the basket and the notes, and never appeared on a shot card at all — only its delta did, which tells you the grinder moved 0.6 and not what it moved to. A barista testing the app could not answer "where was the grinder when that one was good?" from the board it exists to answer that from. It is a stepper beside dose, yield and time, because the gesture it records is "one click finer", and it prints on the card. The unit comes from the kit; the app never suggests a value, because your numbers mean nothing on anyone else's grinder, only a direction.

**A field never holds a number nobody typed.** Type a yield, select it, type "xyz", and the parse fails — and the old handler returned early and left the previous number sitting in the variable. The readout went on printing a ratio above a field reading "xyz", and Save wrote the deleted number to the log. Out-of-range was the same failure wearing a politer coat: a typed 999 was clamped to 200 on every keystroke, so the field said one thing and the arithmetic another, and blur rewrote the field without a word. Text that is not a number in range means **there is no value**: the record goes empty, everything derived from it goes back to dashes, and a line under the field says which of the two it is. Nothing is guessed on the reader's behalf and nothing is silently corrected — the text stays exactly as typed, because it is their typo to see.

## The brew log, and what a third instrument settles

The filter log is not the dial-in with different words, and the two places it differs are the two places the law needed extending.

**A schedule is a record, not a note.** An espresso is one event: you start it and you stop it. A pour-over is five or six, spread over three minutes, and which five is the thing a brewer changes between one morning and the next. "Bloom, then three pours" in a notes field loses the times, and the times *are* the recipe — so the pours are fields with their own arithmetic, they ride on the card and in the pinned recipe, and the app says so when the schedule and the water figure disagree rather than quietly preferring one of them.

The schedule is also what forced a second form of the number field. Five pairs of stepper-flanked inputs came to 450px with the steppers wrapping inside each field and clipping "0:00" to "0:0". **Steppers earn their place on a number you take one at a time with a kettle in the other hand; they do not earn it on a field that repeats.** The compact form drops them and keeps every part that makes the control trustworthy — the parse, the range check, the refusal to hold a value nobody typed.

**"Filter brewer" names two machines, and the same advice cannot be right for both.** Where the water passes through a bed, grind sets the flow rate, so a long brew and a bitter cup are one fact and the clock is a symptom you can read. Where the coffee steeps, the time is whatever the timer was set to, so grind changes extraction with the clock held still — and telling somebody their four-minute press "ran long" is telling them about their own decision. The kit asks which, and it changes what the app is allowed to say: in immersion the pour block leaves the sheet, "different pours" leaves the intents, and the grind answers stop carrying "and it will bring the time back into the window".

**Filter extraction yield needs the cup on a scale as well as the refractometer.** The bed keeps roughly twice its own weight, so the water you poured is not the drink you got. Every tool that computes filter yield from dose and water alone is estimating that retention and printing the result as a reading. Two measurements or nothing.

**No scale, no ratio — anywhere.** A great many people brew by eye, and a ratio built from a scoop is not a ratio. Answering that question with "by eye" removes the dose, the water and every ratio in the app, and leaves grind, time and taste, which is still a useful log and an honest one.

**The two walls hold, with filter's own second lever.** Sour and bitter are extraction and grind is the lever; thin and strong are concentration and the *amount of water* is the lever. Read together each corner has one move — grind finer, grind coarser, more water, less water — and the diagonal is the pair every brewer learns first. Where the dial-in says "run longer", the brew log says "more water", and they are the same sentence about the same physics. The vocabulary is the act, not the arithmetic: "less water" and "tighten the ratio" are one instruction, and an app that uses both makes a reader wonder whether they are two.

## Colors

Two complete palettes, not one palette with a dark variant bolted on. `PRODUCT.md` records the operating light as **highly variable** — a sunlit counter one week, a dim cellar the next — so both must be first-class, and the app must be able to switch between them.

There are **four** grounds a token can land on, not two, and the ratios below are the worst case across all four: the page, the raised chrome band, a card, and the Describe card. This section previously said "worst case across both surfaces — ground and raised" and then printed the *ground* figure for every row, which made every number in the table optimistic by a quarter to a full point. Secondary ink was published at 6.55:1 and is 6.16:1 where it actually sits worst. These are measured, and they are the real worst case.

| Role | Token | Light | Dark | Light worst | Dark worst |
|---|---|---|---|---|---|
| Ground | `--bg` | `#fbfaf7` | `#0f1113` | — | — |
| Raised chrome | `--bg-raise` | `#f4f3ef` | `#14171a` | — | — |
| Card | `--bg-card` | `#ffffff` | `#171a1d` | — | — |
| Describe card | `--bg-card-2` | `#f2f6f4` | `#1b2320` | — | — |
| Ink | `--text` | `#16181c` | `#e9ecef` | 16.01:1 | 13.54:1 |
| Secondary ink | `--text-dim` | `#565b63` | `#98a0a8` | 6.16:1 | 6.06:1 |
| Tertiary ink | `--text-faint` | `#6a6f75` | `#848a91` | 4.56:1 | 4.61:1 |
| Data ink | `--data` | `#1d4f73` | `#6fb6de` | 7.82:1 | 7.20:1 |
| Alert | `--red` | `#9a3412` | `#f0a077` | 6.58:1 | 7.65:1 |
| Rule | `--line` | `#d9dad4` | `#2a2e33` | 1.27:1 — structural only, never text and never a control | |
| Scale track | `--rail` | `#8c8d89` | `#6a6d70` | 3.01:1 | 3.08:1 |
| Data wash | `--data-soft` | `--data` at 10% | `--data` at 14% | fills only, never text | |

**Tertiary ink was a third grey nobody wrote down.** It carries the sub-labels, the placeholder text, the anchor phrases and the two status lines in the cupping header, and at `#6b7178` it measured **4.44:1** on the raised band — the app's only real text failure, in the one band that never scrolls away. The values above are the lightest that clear 4.5:1 on all four grounds.

**The data wash is an alpha, not a hex.** It was listed here twice with two different green-tinted values left over from before the data ink went slate — `#e7eef3` in the frontmatter and `#e4efec` in this table — and neither could have been right, because a 10% ink composites to a different colour on each of the four grounds (`#e5e9ea` on the page, `#e8edf1` on a card). It is stated as what it is.

**Every text pair clears 4.5:1**, and that is not a nicety here: the audit measured 62 failing pairs in the outgoing world, including the *selected score value* at 3.45:1 — the single most important piece of state feedback in the app. The phrase "with room to spare" used to follow, and it was doing no work except making the claim harder to check.

There is **one** data ink and it has one meaning: this is a value a cupper set. It is never used for emphasis, never for a heading, never for a decorative accent, and never for a brand moment. If something needs to stand out and is not a value, it earns that with weight, size, or position instead.

This rule was written here and then not kept: the token was called `--accent` and it was on **86 declarations** — icon colour, ghost-button text, section heads, stat values, the toast ground, the coach mark, the wheel hub, the form tag. On the scoresheet the score competed with two section heads, a pill, four help marks and two buttons for the same colour. It is enforced now, and the tokens say which is which: `--data` is the one ink, `--chrome` is the page's ink for everything else. The complete list of things allowed to be coloured is:

- **the score** — the figure the screen exists to produce
- **the scale** — its fill, its knob, and the anchor phrase under your thumb
- **progress fills** — the rail, the ranking bars, the range on Results: how much of something there is
- **scores shown to a second person** — the ranking, the panel average, History
- **the ten radar series and the flavour wheel**, which are categorical data and separately measured

Two things sit outside that list on purpose. **Focus rings** take the data ink because they are an affordance, not decoration — a ring in the same ink as the page is not a ring. **Alert red** was never the accent and keeps its own job on destructive controls.

An **unfinished sheet** has no figure to set. Where a score would go there is an em dash in secondary ink and the count of rated sections beside it; the data ink is for values a cupper actually set.

**On the hue itself.** It was a teal-green for most of this project's life, and it got there by being the opposite of the cream-and-copper world it replaced rather than by being chosen against anything. The argument that moved it is specific to this product: the app draws the Coffee Taster's Flavor Wheel, on which green is the *Green/Vegetative* family — under-ripe, peapod, hay-like, the defect-adjacent wedge — and then used green to mean "this is a good score". It was the one candidate whose hue already meant something else inside the product. Slate carries no flavour meaning, sits closer in temperature to the warm greys than a true blue does, and measures better in the light theme than the green it replaced. Oxblood was the more interesting answer and lost only because alert red is already spoken for.

The greys are warm in light and cool in dark, each biased a few degrees toward its own ground so neither reads as a stock neutral dropped in.

## Typography

**IBM Plex Sans** for language, **IBM Plex Mono** for anything measured. One superfamily, two jobs, drawn for technical documentation — which is what a scoresheet is.

The split is semantic and absolute: if a reader could compare it to another number, it is Mono with `font-variant-numeric: tabular-nums`. Scores, scale values, the anchor phrase, counts, coffee positions. If it is a name or a sentence, it is Sans. This is why a column of scores lines up on the decimal without any layout work — the numerals are the same width by construction.

**The ramp is eight steps and everything sits on one of them:** 11, 13, 15, 17, 20, 24, 30, 40, with a single 9px tick below it for the scale numbers. It carried a 46px step for a while, declared and rendered nowhere, left over from when the score was display-sized and before it moved into the header. The sheet used to carry **twenty-eight** different sizes — 11.5 next to 12 next to 12.5 next to 13 — which is not a hierarchy, it is an accumulation. Collapsing it moved eighty declarations by at most 2px each, so the system arrived without the app being redrawn.

The score is the largest thing on the scoring screen and the only one set in the data ink, which is how it earns being the thing the screen exists to produce. It is 30px rather than the 46px this section first claimed: the score moved into the header when the layout went to three bands, and a 46px figure in a header row costs more height than folding it there saved. What matters is not the absolute size but that nothing competes — the eight section values sit a ramp step below it, in the page's own ink, because the knob already carries each of them in the data ink on the control that produced it.

**Both faces are self-hosted and precached by the service worker** (`fonts/plex-sans-var.woff2`, `fonts/plex-mono-400.woff2`, `fonts/plex-mono-600.woff2` — latin subset, 60 KB for the set; Sans is one variable file covering every weight). Offline capability is binding in `PRODUCT.md`, and a webfont fetched from a CDN is a webfont that disappears in a roastery basement. A font that only loads with signal is a broken font.

**Radius is square by default.** There were fifteen different radii in the sheet — 22, 20, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 5, 2 and the pill — so nothing was shaped deliberately, everything was just rounded. Every literal is now a token: `md` at 4px for panels, `pill` only for chips and segmented controls that are genuinely capsule-shaped, `knob` for the two circular grab targets. The outgoing world stamped 18px on everything, which is what made eight stacked sections read as eight floating objects.

### Printing is a different medium

The printed scoresheet is ink on paper, so it does not use the screen palette and should not: the data ink is a dark teal that prints as a muddy grey, and a paper-coloured ground on paper is nothing at all. Print gets black text, grey rules and point sizes, declared as its own token set (`print-*`) rather than smuggled in as undocumented literals.

## Series colours

The results radar carries up to ten coffees. They are `--series-1` … `--series-10`, a token set like any other, redefined for the dark ground — and they are measured, which is the whole point of them being tokens: the outgoing set was hardcoded hex, tuned against a dark ground and shipped onto a near-white page, where it ran **1.47:1 to 2.95:1**. The legend naming each coffee was the least visible thing on the screen, and because the colours were not tokens, the sweep that took this app's text contrast to zero failures never looked at them.

Every series now clears **3:1** against the card it is drawn on and against that card tinted by its own highlight fill, which is what WCAG 1.4.11 asks of a graphic that carries meaning. Measured in the browser: worst line 3.41:1 light, 3.34:1 dark. Minimum pairwise separation is ΔE76 16.3. Four of the ten are identical in both themes — only the greens, the amber and the teal had to move for the dark ground — so a coffee's colour barely shifts when the light does.

**Colour is never the only channel.** Each series also carries a `stroke-dasharray`, and the legend swatch is the series' own line rather than a coloured dot, so the chart survives with the hue removed entirely. That is what lets the hues be chosen for contrast rather than for maximum separation: ten hues cannot be told apart reliably anyway, and the dash pattern is doing the identifying.

**No area fills when there is more than one series.** Ten translucent polygons stack into mud at the centre, and a palette solved against nine fills underneath it converges on ten near-identical pastels — satisfying the contrast rule by destroying the hue identity it was meant to protect. The fill returns for one series at a time, when the legend solos it and there is nothing under it but the card.

## An unfinished sheet has no score

Both forms score a cup as a sum over every section, and every section sits at a stored default until a cupper moves it — 5 on the CVA form, 7.5 on the 2004 one. Sum a sheet that is three sections in and the other five are not missing from the total; they are in it, at a value nobody chose. Rating Fragrance 7, Flavour 8 and Aftertaste 6 and stopping prints **83.00**, which is `0.65625 × (21 + five invented 5s) + 52.75`.

The app used to print that number in grey with "3 of 8" beside it and call the matter handled. It is not handled, because there is nothing in 83.00 to discount — a reader cannot recover "the real part is 21" from it. It is a whole-cup score built mostly from defaults, and it lands a point under the specialty line from three sniffs.

**So the sum happens once the sheet is whole, and until then there is no number.** `coffeeScore` returns null. Every surface reads the null and prints an em dash with how far along the sheet is: "— · 3 of 8 rated". The scorebar had done this since the day it was written and calibration since a cupper was told his palate ran 2.31 low when what ran low was five sections he had not reached; the rest of the app now agrees with them.

This reaches the live team card, the Present ceremony, the Results summary and ranking, History, the printed sheet, the share text and the CSV. It also crosses the wire: a submission carries `null` for an unfinished sheet and the relay stores it as null rather than coercing it to 0, because a table reading "Ben 0.00" is a worse lie than the one the null exists to stop.

**A seat is not its score.** A cupper two sections in still appears on the table card, in the ceremony and in the share text, with their count — they are at the table. They are simply not in the average. The two facts were one count before: a card printed "the average of 4 independent cuppers" over a row whose own badge said 5, because the headline counted everyone who had touched a sheet and the row counted the seats it drew. There is one question now — is this sheet finished — and three sentences: how many finished sheets are in the panel score, who is still scoring, and who has not started.

**A panel average over unfinished sheets is not a smaller sample, it is a wrong number.** At a live table a Kenya read 88.69 over four cuppers where the two finished sheets averaged 93.38 — 4.69 points light, a price bracket for a buyer — under a footnote on the same screen promising that only finished sheets are measured. One screen, two policies. Now one.

**Every panel score carries its denominator, and the denominator is per coffee.** A panel average is the most quotable figure this product makes, and it was printed bare — on the table card, in the ceremony, and in what the share button puts on the clipboard. Worse, the ceremony's closing ranking stated one denominator for the whole lineup, computed as the *maximum* across it, so a table where four people scored the first coffee and two reached the last announced "the average of 4 independent cuppers" over both. Each row states how many finished sheets stand behind it and how many cuppers are still scoring; the caption gives the spread when the coffees disagree. The clipboard leads with the panel when there is one and the device's own sheet follows under its own heading, because a leader sharing "the results" after reading a panel out loud was sharing neither.

**Everything that has a score ranks by it; everything that does not goes to the bottom.** There used to be a three-way tier — complete, part-scored, untouched — to stop a total made of defaults outranking one that was earned. Those totals no longer exist, so neither does the tier, and with it goes the bug it caused when applied to an average: a Kenya at 91.08 over three cuppers fell below a Brazil at 84.25 that one person rated, because one of the Kenya's cuppers had stopped early, while the table card two taps away had them the other way up.

**A seat belongs to the device, not to the session.** Joining rebuilds the scoresheet from the leader's lineup, so anything kept on the session is gone by the time the join finishes — which is why the guard against sitting down twice could never fire, and every reopened join link put another chip on the leader's roster under the same name. The device keeps only the newest id, so the older seat can never be submitted to and never disappears; the leader counts heads against the room and comes up one over. The seat is stored by table code, outside the session, and a name is changed by renaming the seat rather than by submitting a scoresheet to carry it.

**A sentence about a number is a line, not a column.** Layout rules follow from that: a caption sitting in a `flex: none` column beside a name takes the width it wants and the name pays for it. On the ceremony card the name of the coffee was squeezed to literally zero and printed across everything beside it — on the one screen whose job is to be read aloud to a room. Counts and qualifiers go under what they qualify, and a name wraps rather than truncating.

**A radar without a radial scale is a picture of data, not a reading of it.** The rings are numbered, and there are four of them rather than five so every ring lands on a value a cupper can actually set — 3, 5, 7, 9 on the CVA form — which also puts a ring exactly on the 5 the whole scale is built around. Ring labels draw last, because SVG has no z-index and a halo only holds off what is already on the canvas.

**The scores on this device and the scores on the table are labelled as such.** The Results screen stacks three things: a summary and a ranking built from the sheets here, and between them a card built from the panel. Nothing said which was which, and the summary called itself "This cupping" — a claim about the room. A leader who had been pouring rather than scoring got "Nothing scored yet, no section of any coffee has been rated" printed directly above a revealed four-cupper panel. At a live table both are headed **Your sheet**, and the empty case points down at the card that has the answer.

**Started is not finished, wherever a count decides something.** "2 of 4 coffees scored" counted a coffee with three sections of eight, on the one screen whose job is to help somebody decide whether to send. The send line reads `1 of 4 finished · 1 part-scored · 2 not started`.

**Calibration is built from finished sheets only.** It is the one place the app makes a claim about a person rather than a coffee — "you run 2.3 below the table" is a statement about a palate — so it may not be computed from a total that is mostly defaults. An untouched section carries its 5, which pulls a part-scored sheet toward the middle of the scale wherever the cupper's judgement actually sat, and the list then reported that pull as a habit. A cupper is measured over the coffees whose sheets they finished, against the panel score as the table reads it out, with the count beside their name when that is less than the whole lineup. Finish none and the row says so instead of carrying a number.

**The sheet you are working on is the exception, and it is stricter.** Everything above is about a number shown to someone else once cupping is over; the header of a sheet still being filled shows no number at all until the last section lands. Two reasons, and either would be enough. The arithmetic: CVA floors at 52.75 and pays 0.66 a section, so one rated section prints 79.75 and the 2004 form prints 82.50 from nothing at all — the figure starts near the top of the scale and drifts by about a point per section rather than climbing toward anything, which reads as a verdict long before there is one. And the practice: a running total anchors the sections still to come, which is precisely the bias calibration exists to remove. The slot carries `3 of 8 rated` while the sheet is open and the score the moment it is finished. The dash is a mark for the eye only — the header is a live region, so the dash is hidden from assistive technology and the count is what gets announced.

## Layout

One column, always. The sheet is a vertical run of sections separated by hairline rules — not cards, not panels, not tiles. A rule says "next section" more quietly than a border does, and eight bordered cards stacked on a phone reads as eight objects competing rather than one instrument.

Three fixed bands, and three is the count:

- **The header, carrying the score.** The coffee's name, its position in the lineup, the live table code when there is one — and, right-aligned, the number with its grade or its progress under it. The score never scrolls away, because it is the reason the screen exists, but it does not get a band to itself: a strip reading "Coffee 1 / 3 of 8 rated" above a number repeats two lines that are already two lines higher. What it uniquely holds is the figure.

  The line under the name is ordered by what it costs to lose, because on a phone it does not always fit: 156px of room on a 390px screen against 191px of text, cut mid-glyph with no ellipsis. Whether your sheet has reached the table leads — nothing else on the scoring screen says it. The code follows, and the invite button beside it opens the code full size if that is what gets clipped. Position is dropped entirely at a live table, since the rail along the bottom numbers every coffee and marks the one you are on. The line ellipsizes rather than stopping, and fits whole from 360px up. On a 390×844 phone the fold is worth about 70px of sheet, which is a whole section.
- **The sheet, scrolling between them.** 16–18px side padding; content never touches the edge even when the app runs full-bleed.
- **The first screen is two doors, and the smaller party gets the console.** At a table of five, one person sets a cupping up and four join one, so joining leads: a full-width card directly under the wordmark, above the fold, naming the three ways a code arrives. The setup that follows — form, coffees, cups — is the leader's console and is introduced as the alternative rather than as the screen's purpose. Joining used to be a ghost button in the last row of that console, sharing it with History, under the button that starts a rival cupping. The card's border is drawn in `--rail` rather than `--line`: its fill sits 1.04:1 from the page, so the border is what says a control is there, and that carries the 3:1 floor.

- **Navigation, pinned at the bottom.** The bottom strip is the only thumb-comfortable band on a phone and it must hold something you can touch. The outgoing world spent it on a read-only number; here it carries movement between coffees — each segment 44px tall and scrolling sideways inside the band rather than shrinking below that when the lineup is long — plus the flavour wheel and the way to Results.

Nothing in the cupping screen floats. Every band is in the flex column, so the sheet clears its own last row instead of guessing how tall something hovering over it is, and the safe-area inset is padding on the band that touches the edge rather than an offset applied to a fixed element.

Below 560px the app runs edge to edge with its chrome removed. On a phone there is no frame, because the phone is the frame.

## Elevation & Depth

Almost none, deliberately. This is a document and an instrument, not a stack of floating objects. Separation comes from rules and space.

Exactly one element is allowed to lift: **the knob while it is being dragged**, which takes `0 3px 12px rgba(0,0,0,.2)` and a 1.22× scale. That shadow is functional — it says *this is in your hand right now* — and it is the only one in the system. No card shadows, no glass, no glow.

The outgoing world's `1px border + 30px shadow blur` card signature does not come across.

## Shapes

Square by default. Radius is spent only where something is genuinely round: the knob and the clear button are circles because they are grabbable objects, not because rounding is the house style.

Rules are 1px hairlines in the line token. The scale rail is 2px. Ticks are 1px and 10px tall, except the midpoint tick, which is 20px because the neutral anchor is structurally different from the other eight positions.

## Components

**The anchored scale** is the system's one signature component, and everything else in the product derives from it.

- Nine positions, 1 to 9, ticked on a 2px rail. The midpoint tick is double height.
- Press anywhere on the 48px track and the knob comes to the finger — never require grabbing the knob itself.
- The knob follows the pointer freely while dragging, then **settles to the exact detent on release** over 220ms on `cubic-bezier(.22,1.1,.36,1)`. Free while held, precise when let go.
- The value changes as detents are crossed, with a haptic tick on each crossing where the platform supports one.
- **An unrated section shows a dashed empty knob parked at the midpoint.** Visibly *not* a 5. This preserves the `touched` discipline already in the codebase, which is the strongest decision in the product: a default 5 and a chosen 5 are the same number and only one is evidence.
- The anchor phrase sits on its own line between the end anchors, fixed height, never wrapping. It is readable *while* dragging — you choose "moderately high", you are not told afterwards.
- Every scale is a real `role="slider"` with `aria-valuenow`, `aria-valuetext` and arrow-key support.

**Clearing** is offered only once there is something to clear, keeps its space when hidden so no row ever changes height, and returns the section to genuinely empty — never to 5. Its 44px target grows upward, never down: a destructive control must not occupy the pixels someone overshoots when aiming at the top of a track.

**The score readout** is grey while provisional and full ink once every section is rated. The number reports its own status; the count beneath it confirms rather than carries the message.

**Touch targets are 44px minimum.** Where a control must stay visually small — the clear, a help mark — the visual stays small and only the hit area grows, via a transparent pseudo-element. Expanded areas must never overlap each other or a neighbouring control.

**One exemption, and it is granted rather than overlooked: the CATA chips at 35px.** This rule was stated as absolute and 174 chips have never met it, which made the rule the thing that was wrong. A chip is a word in a wrapped list, and the two ways to reach 44 both cost more than they buy: growing the chips adds roughly 90px to the longest card in the product, and growing only the hit area makes each chip's target wider than the 5px gutter between it and its neighbour — so a tap near an edge silently records a descriptor the cupper did not choose. On a checklist, a wrong word entered invisibly is a worse failure than a small target. 35px clears the 24×24 of WCAG 2.5.8 AA with room; it does not meet 2.5.5 AAA, and that is the trade being made. Measured real reach: 35.9px.

**Anything that is not text still needs 3:1.** WCAG 1.4.11 covers the parts of a control that say what and where it is, and the parts of a graphic you need in order to read it. On this sheet that means the scale's track, its ticks, the fill that shows how far along the value sits, and the dashed ring of a knob nobody has moved — all of which were drawn in the rule token at 1.18–1.29:1, because a hairline between two blocks and the track of a control had been treated as the same thing. They are not: `--line` separates, `--rail` is part of an instrument, and only the second has a floor. The mid tick is the one tick carrying a meaning of its own, so it sits above the others at 3.29–4.06:1 rather than below them at 2.44:1.

**The flavour wheel is the one drawing the type floor cannot govern, and it keeps its exemption.** Sixty-eight descriptors around one circle render at 5.53px fit to a phone. That is too small to read a word or land a thumb — and it is also the only view that answers the question a first-timer actually has, which is *which words exist at all*. Shrinking the wheel's job to fix its type would trade the thing it is for.

So the reader sets the scale instead of the layout setting it for them, and there are exactly **two** scales because there are exactly two questions. It opens **Whole wheel** (1×, descriptors at 5.53px) — which words exist at all — and one step enlarges it inside a scrolling viewport to **Readable** (2.05×, 11.3px, clearing the floor) — read a word, land a thumb on it. A third rung at 2.8× was shipped and retired: it answered neither question, it was the same word larger. Two states also means the control is a toggle naming the state it goes to, not a `−`/`+` pair with one end permanently disabled. The wheel itself is never redrawn — same geometry, same colours, same two-level meaning. Zooming in scrolls to the top of the wheel rather than holding centre, because the centre is the hub and the hub has nothing to read.

**Whole wheel is a map, not a keypad.** The exemption above is for type, and it does not extend to touch: the two rings are not the same control at the same size. The nine categories share the inner ring at about 37px of arc each and can be tapped in either view. The sixty-eight descriptors share the outer one, which leaves each of them roughly **10px** across where it begins and **15px** where it ends — and a missed tap there was never nothing, it was the neighbouring word written silently into the tasting notes. So in Whole wheel the outer ring is not a target: touching a descriptor zooms to Readable and brings that wedge to the middle of the view, where it is about 26px across and the next tap is the one the thumb meant. The status line says which word it has brought you to. Keyboard activation runs the same path, so Enter on a descriptor zooms first and takes it second.

Category labels read along the radius, and that ring is 56 units deep, so a compound name breaks at its slash into two lines rather than running out of its own wedge. "Green / Vegetative" is 63.8 units on one line and 36.3 on two.

## Do's and Don'ts

**Do**

- Let position carry meaning and keep colour for values alone.
- Preserve the distinction between unrated and 5, everywhere, forever — including in exports, history and print.
- Derive every downstream surface from the scale grammar: the results radar, the printed sheet, and the calibration bar are all the same object at different scales.
- Make the calibration bar **symmetric around zero**. In a calibration exercise only magnitude means anything; direction is a habit, not a verdict. The outgoing world highlighted high runners and greyed out low ones, which told a novice in front of the room that they had scored the wrong way.
- Keep both themes complete and switchable, and never hard-code one.

**Don't**

- No gradient text, anywhere. Gradient-clipped type also has no measurable contrast, which is a real accessibility failure and not only a taste one.
- No trophy, podium, crown, or gold/silver/bronze medal. A cupping grades samples against a standard; it does not crown a winner, and `PRODUCT.md` names calibration as the point.
- No cards inside cards, and no accent stripe on the left edge of a card.
- No colour used decoratively. If it is not a value, it is not the data ink.
- No text below 11px anywhere a cupper needs to read it. **One exception, and it is the only one:** the 1–9 tick numbers under a scale track sit at 9px, because they duplicate the number already inside the knob — they are tick furniture, not something anyone has to read. Anything carrying meaning of its own clears 11px.
- The flavour wheel is the one exemption, and it is granted rather than overlooked: see Components. It carries its own zoom because the reader, not the layout, should decide how large 68 descriptors need to be.
- Never ship `user-scalable=no`. Someone in bad light must be allowed to zoom.
- This is an instrument; it should feel precise, not springy. One easing token, `--settle`, an ease-out-quint at `cubic-bezier(0.22, 1, 0.36, 1)`: decisive deceleration, zero overshoot. It was called `--spring` while it had some, and on a detented scale even a 10% overshoot means briefly showing a number the cupper did not choose.
- **The motion budget is four keyframed animations, and the list is exhaustive.** This section used to say "no motion beyond the knob settle and the score's own state change" while the stylesheet ran nine animations across nineteen declarations — whole screens sliding in, steam rising off the setup cup, cups popping into the lineup preview, a ring pulsing on the flavour-wheel button, and four separate staggered list entrances. The rule was the good one; it was simply not true. The ten decorative declarations are gone, the five keyframes behind them are retired, and what survives is named here so the budget can be checked against the file:
  - `bump` — a **number changing its own value**: the section value, the score in the bar, the score at the reveal, the cup count, the count of cuppers at the table, a digit landing in the PIN. This is the state change the rule always allowed.
  - `sheetUp` and `fadeIn` — a **sheet arriving**. A layer that covers the screen has to say where it came from, or Escape has nowhere to send it back to. These are orientation, not decoration.
  - `shake` — a **wrong PIN**. An error that produces no other visible result.

  Transitions are not on this list because they are not motion of their own: they are the lag on a state the cupper is causing right now — a button taking a press, a row opening, the knob settling to its detent. Nothing animates on arrival, on a timer, or to attract attention.
- Nothing loops, and nothing keyframes on its own initiative. An attract cue is allowed to be a *mark* — the unopened flavour-wheel button wears a standing ring until the wheel is opened once — but it does not move to be noticed.
- Every one of the four is switched off under `prefers-reduced-motion: reduce`, along with the knob's settle and its drag scale.
