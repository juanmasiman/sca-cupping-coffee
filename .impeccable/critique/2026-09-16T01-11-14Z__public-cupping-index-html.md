---
target: public/cupping
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 5
target_identity: "file:/home/user/sca-cupping-coffee/public/cupping/index.html"
target_fingerprint: "sha256:1fb38801e3578e0b7bc7e54f72e4d509fd3304329b3722969af1184e3e43382e"
target_path: /home/user/sca-cupping-coffee/public/cupping/index.html
timestamp: 2026-09-16T01-11-14Z
slug: public-cupping-index-html
---
Method: dual-agent (A: design review, isolated · B: detector + browser, isolated).
Third run. Commit a67ff34.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Rail progress, "3 of 8 rated" and a three-state connection badge are strong; the running score has no aria-live and nothing tells a joined cupper their sheet is unsubmitted |
| 2 | Match System / Real World | 3 | Domain voice outstanding (8.25 g/150 mL, 93±3 °C, break the crust); "orthonasal"/"retronasal" dropped on a first-timer with no gloss anywhere in HELP |
| 3 | User Control and Freedom | 3 | Escape, focus trap, backdrop dismiss and opener-restore on every sheet; per-section clear. A guest's coffee names are silently overwritten at the reveal |
| 4 | Consistency and Standards | 2 | Mono/sans split half-applied; the same scale ships as a rule-separated .attr-card and a bordered .desc-row; coffee name read-only on lineup, editable on the sheet |
| 5 | Error Prevention | 3 | touched discipline, effect-listed confirms with Cancel focused, capped CATA, decode ceiling. "Reveal all" wears the identical chrome as the "Results" nav button |
| 6 | Recognition Rather Than Recall | 3 | 16 contextual help marks, live anchor phrase, the live code carried in the header. Guided mode off deletes every explanation at once, from a screen a QR joiner never sees |
| 7 | Flexibility and Efficiency | 3 | Full arrow/Page/Home/End on the scale, paste-a-lineup, Enter walks the lineup, swipe between coffees. No keyboard path between coffees; ~220px of preamble per coffee |
| 8 | Aesthetic and Minimalist | 3 | The sheet is disciplined and rule-separated; the surround is not — animated steam, gradient CTA, a Results screen carrying five blocks |
| 9 | Error Recovery | 3 | Best-in-class relay taxonomy: 404 vs status 0 vs refusal, each a different true sentence; the submit button restores itself. Every decode failure collapses to one generic string |
| 10 | Help and Documentation | 3 | 18 task-focused entries in the practitioner's voice, delivered where the question arises. No index, no search, and one toggle turns all of it off |
| **Total** | | **29/40** | **Good** |

Trend 26 -> 25 -> 29. The 25 was flat because the rebuild had fixed half the terms of
an average; this run reflects the untouched surfaces being finished.

## Cognitive load

3 of 8 fail -> moderate, at the top of that band. Intrinsic load is high by nature
(eight sections, a timer, wet hands) and the app manages it. The three failures are
extraneous: 24 CATA chips in one box rendered twice per coffee; a hierarchy where the
score (24px/800) is the same size as each section value (24px/800, and coloured); and
menus past the working-memory line (History offers 8 dimensions, Results carries 7
actions plus 10 legend toggles).

PASS: single focus, grouping, one-thing-at-a-time, working memory, progressive disclosure.

## Deterministic scan

3 raw -> 3 distinct, unchanged from the previous run. One is a confirmed false positive
(cramped-padding on .modal-sheet: the detector cannot evaluate calc(var(--sab) + 20px);
live computed padding is 22/20/20/20). Two are the flavour wheel's documented type
exemption, and the rendered sizes match the written spec exactly — 5.5px at Whole wheel,
11.27px at Readable, 15.39px at Close.

## Browser evidence (Chromium, 19 states x 8 configs = 152 state-measurements)

Horizontal overflow at 390px: ZERO in every state and configuration. Five real inner
scrollers, four intentional and one a deliberate ellipsis clip.

Text contrast, composited through ancestor opacity and every gradient stop: ONE failure
app-wide — .present-card.sealed .present-name at 4.44:1 against a 4.5 requirement, light
scheme only (dark measures 5.36). A miss of 0.06 on a deliberately muted sealed card.

Non-text graphics at 3:1: every radar series stroke and legend swatch passes (worst 3.46
light, 4.80 dark), and every series carries a distinct dash so no meaning rests on hue.
The radar grid scaffold is below 3:1 and carries no meaning.

Flavour wheel labels: 0 below 4.5:1 in either scheme across all 79 labels, minimum 5.15
light / 4.73 dark, picked wedges included.

Type: every rendered and every declared screen font-size is on the 9/11/13/15/17/20/24/
30/40 ramp. The only off-ramp values are the two exempted wheel labels. Print renders
exactly three sizes (18/9/7pt).

Keyboard: 30 tab stops on the CVA sheet and 43 on Legacy, no trap, zero stops driven
off-screen, and a visible focus ring on every single stop in both forms. The anchored
scale is reachable and driven by Arrow/Home/End/PageUp/PageDown with aria-valuenow and
aria-valuetext updating. Modal sheets: Escape closes, 30 consecutive Tabs produce zero
escapes, focus returns to the opener, and the background carries a real inert attribute
making 336 background tabbables unreachable.

Zero uncaught exceptions on any user-reachable path across all eight walks.

Verified claims: the printed sheet carries per-section scores, deductions and unrated
dashes for BOTH forms; no window.confirm/alert/prompt is reachable (306 clicks across
six screens, zero native dialogs); a coffee with zero rated sections is excluded from
every score, range, median and average; the Present ceremony's stage survives a reload.

B corrected five of its own measurements mid-run rather than reporting the first reading.

## Priority issues

**[P0] A participant can score a whole session and never enter the panel average.**
Submission exists in exactly one place — inside #team-card, third down the Results
scroll, past a radar chart (index.html:212, app.js:4030) — reached through a nav button
labelled "Results" (index.html:178). Nothing on the scoring screen mentions submitting.
The leader auto-submits on entering Present (app.js:4213); nobody else does. PRODUCT.md
builds the positioning on "each cupper scores independently, submissions stay sealed";
a panel score computed from whoever scrolled far enough is not that. Fix: the nav band's
right-hand button becomes Submit at a live table with a complete sheet, hoist the
live-table block above the radar, and carry submitted/not-submitted in the header.

**[P1] Toggle state is invisible to assistive technology across every multi-select.**
grep for aria-pressed returns nothing. CATA chips (app.js:3080), per-cup pass/fail
(app.js:3615), radar legend (app.js:4516) and both segmented controls are buttons whose
selected state is a CSS class and a colour. The cup buttons' accessible name is the bare
digit, so a reader announces "button, 1" whether the cup passed or failed — and on the
legacy form those fifteen controls carry 30 of the 100 points.

**[P1] The flavour wheel is pointer-only.** 68 descriptors, no role, no tabindex, one
delegated click handler (app.js:2906). B confirms: svg.querySelectorAll('[tabindex],
[role]').length === 0, and inside the open sheet the tab cycle never touches a wedge.
DESIGN.md:263 defends the wheel's type exemption on the grounds that it is the only view
answering what a first-timer actually asks — which words exist at all. That view is
unavailable to an entire class of first-timer.

**[P1] The score is not the display element; the wordmark is.** DESIGN.md:191 declares
the score at 46px as the only display-sized element. 46px appears nowhere in the CSS.
The score is 24px sans — the same size as each section value, which is additionally
coloured — and smaller than the 40px wordmark on a screen seen once.

**[P1] Meaning-carrying text below the 11px floor.** .scale-knob.wide is 9px, which
applies to every knob on the Legacy form since every legacy value is four characters.
The "3 of 8" qualifier — the entire part-scored signal DESIGN.md:213 mandates — is 9px.
DESIGN.md:285 permits exactly one sub-11px exception and reasons that it is tick
furniture; neither of these is furniture.

**[P1] The expert scrolls ~220px of preamble on every coffee.** Name field, Details
card, two section heads and the Describe card sit above Fragrance on every panel, and
the name was already entered on the lineup screen.

**[P2] An unrated sheet still shows a number on two surfaces.** app.js:3720 prints
79.00 in the header with "0 of 8 rated" beneath it; app.js:4767 does the same in History.
Results, print and CSV all obey the em-dash rule. Two surfaces do not.

**[P2] The radar draws a coffee nobody rated.** buildRadar has no prog.done filter, so
an untouched coffee draws a regular octagon from eight default 5s and appears in the
legend. Every other surface excludes it.

**[P2] A guest can rename the leader's coffees, then lose the names silently.**
lineupLocked() is consulted on the lineup screen and not on the scoring panel;
adoptRevealedLineup overwrites at the reveal.

**[P2] The radar floors at 3, so a 1 and a 2 plot identically.** The case where a radar
is most diagnostic is the one it flattens.

**[P2] #btn-finish is 37px tall in a bottom bar DESIGN.md:225 says is 44.** The rail
segments and the wheel button both measure 44; this one does not.

## Strengths

1. The touched discipline carried to every surface without exception — seeded at
   app.js:281, the dashed empty knob at styles.css:1213, kept out of the panel average
   at app.js:1047, a dash in print, a blank CSV cell rather than a fabricated one, and
   History saying "Avg of 5 finished". An invariant held across five outputs including
   the two nobody inspects.
2. One control, three standards (app.js:3230-3388). The component knows only how many
   detents exist and what to call where you landed; CVA, the 2004 form and the 0-15
   intensities are three descriptor objects. A participant learns one gesture and gets
   three forms free.
3. The reveal confirmation (app.js:1632). It names a consequence that lives 2,600 lines
   away — that revealing also flips shareDetails and pushes origin details to every
   guest — names how many have not submitted, and ends on irreversibility, with Cancel
   taking focus by construction.
