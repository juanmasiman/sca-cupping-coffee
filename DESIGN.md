---
name: lento cupping — Anchored Scale
description: Sensory-science notation for a scoresheet held over a cupping table in unpredictable light.
colors:
  paper: "#fbfaf7"
  panel: "#ffffff"
  ink: "#16181c"
  ink-dim: "#565b63"
  line: "#d9dad4"
  data: "#1d4f73"
  data-soft: "#e7eef3"
  alert: "#9a3412"
  paper-dark: "#0f1113"
  panel-dark: "#171a1d"
  ink-dark: "#e9ecef"
  ink-dim-dark: "#98a0a8"
  line-dark: "#2a2e33"
  data-dark: "#6fb6de"
  data-soft-dark: "#16262f"
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
  xs: "5px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
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

## Colors

Two complete palettes, not one palette with a dark variant bolted on. `PRODUCT.md` records the operating light as **highly variable** — a sunlit counter one week, a dim cellar the next — so both must be first-class, and the app must be able to switch between them.

Ratios below are measured, and each is the **worst case across both surfaces** — ground and raised — so no usage of a token falls below its stated figure.

| Role | Light | Dark | Light ratio | Dark ratio |
|---|---|---|---|---|
| Ground | `#fbfaf7` | `#0f1113` | — | — |
| Raised surface | `#ffffff` | `#171a1d` | — | — |
| Ink | `#16181c` | `#e9ecef` | 17.03:1 | 14.73:1 |
| Secondary ink | `#565b63` | `#98a0a8` | 6.55:1 | 6.60:1 |
| Rule | `#d9dad4` | `#2a2e33` | structural only, never text | |
| Data ink | `#1d4f73` | `#6fb6de` | 8.32:1 | 7.84:1 |
| Data wash | `#e4efec` | `#16302b` | fills only, never text | |
| Alert | `#9a3412` | `#f0a077` | 7.00:1 | 8.32:1 |

**Every text pair clears 4.5:1 with room to spare.** That is not a nicety here: the audit measured 62 failing pairs in the outgoing world, including the *selected score value* at 3.45:1 — the single most important piece of state feedback in the app.

There is **one** data ink and it has one meaning: this is a value a cupper set. It is never used for emphasis, never for a heading, never for a decorative accent, and never for a brand moment. If something needs to stand out and is not a value, it earns that with weight, size, or position instead.

This rule was written here and then not kept: the token was called `--accent` and it was on **86 declarations** — icon colour, ghost-button text, section heads, stat values, the toast ground, the coach mark, the wheel hub, the form tag. On the scoresheet the score competed with two section heads, a pill, four help marks and two buttons for the same colour. It is enforced now, and the tokens say which is which: `--data` is the one ink, `--chrome` is the page's ink for everything else. The complete list of things allowed to be coloured is:

- **the score** — the figure the screen exists to produce
- **the scale** — its fill, its knob, and the anchor phrase under your thumb
- **progress fills** — the rail, the ranking bars, the range on Results: how much of something there is
- **scores shown to a second person** — the ranking, the panel average, History
- **the ten radar series and the flavour wheel**, which are categorical data and separately measured

Two things sit outside that list on purpose. **Focus rings** take the data ink because they are an affordance, not decoration — a ring in the same ink as the page is not a ring. **Alert red** was never the accent and keeps its own job on destructive controls.

A **part-scored** figure loses the ink and takes secondary ink instead: it is not a number anyone should rely on, and that distinction outranks being a value.

**On the hue itself.** It was a teal-green for most of this project's life, and it got there by being the opposite of the cream-and-copper world it replaced rather than by being chosen against anything. The argument that moved it is specific to this product: the app draws the Coffee Taster's Flavor Wheel, on which green is the *Green/Vegetative* family — under-ripe, peapod, hay-like, the defect-adjacent wedge — and then used green to mean "this is a good score". It was the one candidate whose hue already meant something else inside the product. Slate carries no flavour meaning, sits closer in temperature to the warm greys than a true blue does, and measures better in the light theme than the green it replaced. Oxblood was the more interesting answer and lost only because alert red is already spoken for.

The greys are warm in light and cool in dark, each biased a few degrees toward its own ground so neither reads as a stock neutral dropped in.

## Typography

**IBM Plex Sans** for language, **IBM Plex Mono** for anything measured. One superfamily, two jobs, drawn for technical documentation — which is what a scoresheet is.

The split is semantic and absolute: if a reader could compare it to another number, it is Mono with `font-variant-numeric: tabular-nums`. Scores, scale values, the anchor phrase, counts, coffee positions. If it is a name or a sentence, it is Sans. This is why a column of scores lines up on the decimal without any layout work — the numerals are the same width by construction.

**The ramp is nine steps and everything sits on one of them:** 11, 13, 15, 17, 20, 24, 30, 40, 46, with a single 9px tick below it for the scale numbers. The sheet used to carry **twenty-eight** different sizes — 11.5 next to 12 next to 12.5 next to 13 — which is not a hierarchy, it is an accumulation. Collapsing it moved eighty declarations by at most 2px each, so the system arrived without the app being redrawn.

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

## Part-scored sheets

A score built from sections nobody rated is not the same kind of number as a score built from eight judgements, and anywhere the first is shown to somebody else it has to say so. One treatment, everywhere: the figure drops to secondary ink and the count that qualifies it — "3 of 8" — sits beside it in mono. A sheet with nothing rated shows no number at all, an em dash, and does not enter a panel average. Greying is the whole signal; a part-scored sheet is incomplete, not wrong, so it never takes the alert colour.

This reaches the live team card, the Present ceremony, the Results podium and ranking, History, the printed sheet, the share text and the CSV. If a surface can show a score to a second person, it can show this.

## Layout

One column, always. The sheet is a vertical run of sections separated by hairline rules — not cards, not panels, not tiles. A rule says "next section" more quietly than a border does, and eight bordered cards stacked on a phone reads as eight objects competing rather than one instrument.

Three fixed bands, and three is the count:

- **The header, carrying the score.** The coffee's name, its position in the lineup, the live table code when there is one — and, right-aligned, the number with its grade or its progress under it. The score never scrolls away, because it is the reason the screen exists, but it does not get a band to itself: a strip reading "Coffee 1 / 3 of 8 rated" above a number repeats two lines that are already two lines higher. What it uniquely holds is the figure. On a 390×844 phone the fold is worth about 70px of sheet, which is a whole section.
- **The sheet, scrolling between them.** 16–18px side padding; content never touches the edge even when the app runs full-bleed.
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

**The flavour wheel is the one drawing the type floor cannot govern, and it keeps its exemption.** Sixty-eight descriptors around one circle render at 5.53px fit to a phone. That is too small to read a word or land a thumb — and it is also the only view that answers the question a first-timer actually has, which is *which words exist at all*. Shrinking the wheel's job to fix its type would trade the thing it is for.

So the reader sets the scale instead of the layout setting it for them. It opens whole, and two steps enlarge it inside a scrolling viewport: **Readable** (2.05×, descriptors at 11.3px, clearing the floor) and **Close** (2.8×, 15.4px). The wheel itself is never redrawn — same geometry, same colours, same two-level meaning. The first zoom scrolls to the top of the wheel rather than holding centre, because the centre is the hub and the hub has nothing to read.

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
- No motion beyond the knob settle and the score's own state change. This is an instrument; it should feel precise, not springy. One easing token, `--settle`, an ease-out-quint at `cubic-bezier(0.22, 1, 0.36, 1)`: decisive deceleration, zero overshoot. It was called `--spring` while it had some, and on a detented scale even a 10% overshoot means briefly showing a number the cupper did not choose.
- Nothing loops. An attract animation runs a fixed number of times and then leaves the cupper alone.
