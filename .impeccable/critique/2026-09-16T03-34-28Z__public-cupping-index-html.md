---
target: public/cupping/index.html
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/sca-cupping-coffee/public/cupping/index.html"
target_fingerprint: "sha256:497c3a57e3e145cb531e6e8a25926f56d27d8eb565945f3a85f4600de7e85fa4"
target_path: /home/user/sca-cupping-coffee/public/cupping/index.html
timestamp: 2026-09-16T03-34-28Z
slug: public-cupping-index-html
---
Method: dual-agent (A: design review · B: detector + browser), run as isolated sub-agents. Not degraded.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | `#cupping-position` "1 of 3" and `#scorebar-grade` "0 of 8 rated" measure 4.44:1, in the one band that never scrolls away |
| 2 | Match System / Real World | 4 | Excellent; only gap is that "Sensory profile" never says it plots 7 of the 8 sections |
| 3 | User Control and Freedom | 3 | Clearing a rating is one 22px tap with no confirm, toast or undo; the theme cannot be switched |
| 4 | Consistency and Standards | 3 | (was 2) The part-scored treatment DESIGN.md calls "one treatment, everywhere" reaches Results and History but not the Present ceremony |
| 5 | Error Prevention | 3 | Confirm sheets are outstanding, but `#btn-finish` fires on an empty sheet and reaching Results archives the session |
| 6 | Recognition Rather Than Recall | 3 | `#dim-seg` on History: 8 options, 630px of content in a 356px box, clipped mid-word |
| 7 | Flexibility and Efficiency | 3 | Guided-off saves 221px of 1796 (12%); Legacy's 17 detents give an 18.2px pitch on a 292px track with no fine-adjust |
| 8 | Aesthetic and Minimalist | 3 | "DESCRIBE" sits 8px above a card labelled "Describe" — same word twice, only the second tappable |
| 9 | Error Recovery | 3 | Offline share copy is a model of the genre; thinly exercised beyond that |
| 10 | Help and Documentation | 4 | 42 marks with real substance; the guided toggle rides inside the help modal so a QR-joiner can reach it |
| **Total** | | **32/40** | **Good** |

Trend 26 -> 25 -> 29 -> 29 -> 32. Heuristic 4 moved 2 -> 3 on the consistency work
(one scale one container, the mono/sans split finished, one permission per field);
the rest of the gain is heuristics 2 and 10 reaching 4.

## Design Specificity Verdict

Authored for cupping, and not portable. The control IS the SCA anchored line scale:
double-height midpoint tick because the neutral anchor is structurally different, a
dashed empty knob visibly not a 5, the anchor phrase read while dragging. Legacy
switches the same object to 17 quarter-point detents and says "outstanding" at 10.00;
its Uniformity/Clean Cup/Sweetness render as five cup glyphs starting at 10.00 — the
paper form's deduct-from-perfect logic as objects. The radar omits Overall, because
plotting a holistic judgement beside its own constituents would double-count. The one
screen that could travel unchanged is setup, and that is the screen the design is
weakest on.

Deterministic scan: 2 findings, 0 primary, both advisory, both false positives —
`design-system-font-size` at styles.css:1220 (7px) and :1231 (5.4px), the flavour
wheel's labels, which DESIGN.md grants an argued exemption at lines 280-282 and 303.
Rendered sizes measured 5.50 / 7.12px against the document's stated 5.53 / 7. All 79
wheel labels measured for contrast: minimum 5.15:1 light, 5.08:1 dark, zero below 4.5.

No visual overlay: injection was not attempted, so there is no user-visible overlay.

## What's Working

1. The `touched` discipline, enforced end to end. An unrated section shows a dashed
   empty knob, the value reads "–", the header reads an em dash, and a wholly-unrated
   sheet does not enter a panel average. A default 5 and a chosen 5 are never the same
   object. 45 `role="slider"` with working Arrow/Home/End/PageUp/PageDown,
   `aria-valuetext` reading "7, moderately high", `aria-valuenow` deliberately absent
   while unrated.
2. Colour restraint that survives measurement. Across ~450 text nodes per screen,
   deduplicated there are four distinct failing pairs and two are exempt (disabled
   steppers). Ten radar series carry stroke-dasharray as well as hue.
3. Offline copy written by someone who has been in the basement: "No signal for a live
   code. The QR and link still carry the whole lineup." Names what broke, what still
   works, and the exact alternative path.

Verified clean: zero console errors across nine stops in five contexts; no native
confirm/alert ever fired; exactly the four declared keyframes live in the CSSOM, with
nothing running at rest or 2s in on any screen and zero animations under `reduce`; no
`user-scalable=no`; documentElement.scrollWidth === clientWidth at 390, 320 and 1280 on
every screen.

## Priority Issues

**[P1] The Present ceremony shows a part-scored number as a finished one.**
Coffee 3 rated 3 of 8 renders 88.75 in full ink with no qualifier, identical to two
complete sheets. Results and History do it correctly. This is the surface where a
leader reads a number out loud, and the previous screen promises "A part-scored sheet
is marked wherever its number appears."
Fix: in the stage===2 block (app.js:4681), when `row` is null, read scoreProgress() and
apply the ranking card's two-part treatment — --text-dim on .present-avg plus
ratedNote(). Add the count to the #present-final ranking rows.

**[P1] A part-scored sheet outranks two complete ones.**
The ranking sort only demotes wholly unrated sheets, so 3-of-8 sits at #1 with 88.75,
above complete sheets at 83.50 and 78.25, and inside Range and Median. The comment
above myRated() already diagnoses this and fixes it for shared submissions; the local
ranking never got it.
Fix: sort part-scored below complete, so incompleteness is carried by position — this
design system's own grammar; and exclude part-scored from Range/Median/"at or above 80".

**[P1] The scale fails non-text contrast — the signature control.**
.scale-rail 1.29:1, .scale-fill 2.48:1, unrated knob dashed border 1.29:1, against
WCAG 1.4.11's 3:1. The wheel's focus ring (--text against the nine fixed standard hues)
fails 3:1 on 1 of 9 in light and 6 of 9 in dark.

**[P2] The Present ceremony is unreachable for the cupper it was written for.**
#btn-present renders only `if (leader)` and isTableLeader() requires a live networked
code — but its own intro copy reads "No live table — this walks your own scores coffee
by coffee." A solo cupper, or a leader with no signal (PRODUCT.md's default state), can
never open it.

**[P2] `--text-faint` is an undocumented third grey and the app's only text failure.**
#6b7178 is not in DESIGN.md's palette table, which lists two greys. 4.44:1 verified by
compositing model and by rendered pixels at 4x — they agree exactly. The document claims
"every text pair clears 4.5:1 with room to spare" and that each figure is the worst case
across ground and raised; both are false as shipped. Even the documented secondary ink is
6.55:1 on the ground but 6.16:1 raised.
Fix: darken to ~#646a71, or fold into --text-dim; then document it with
measured-on-raised figures and restate the rule as worst case across ground, raised,
card and card-2.

**[P2] The coach mark covers a scale track, on a timer.**
#wheel-coach is position:fixed z-index:8, fires 1.4s after arrival, stays 9 seconds, has
no dismiss control, and was measured overlaying the Aroma track and its anchors. It
violates the motion rule — "nothing animates on arrival, on a timer, or to attract
attention" — and dodges the keyframe budget only by using a transition.
Fix: delete it. The standing ring on #btn-wheel.unused is the sanctioned form of the cue.

## Persona Red Flags

**The lead cupper, running the table, coffee cooling.** Guided-off removes 42 help marks
but only 12% of the height — still 2.2 screens per coffee. Their one presentation tool is
network-gated. #dim-seg hides half their history dimensions with no affordance. Clearing
a mis-set section is a 22px tap with no undo.

**The novice who joined by QR.** Lands on the sheet cold; the welcome card is the right
rescue but is keyed per-device, so a returning novice at their second cupping never sees
it while still needing it. The "DESCRIBE / Describe" stack is the first thing under the
name field. Opening Describe exposes 174 chips.

**The Legacy cupper.** 17 detents on a 292px track = 18.2px per detent, no nudge, no
long-press fine mode; 8.25 versus 8.50 is two grades apart on that form and a coin flip
with a wet thumb. CVA gives 36.5px. The header reads "0 of 7 rated" while Uniformity,
Clean Cup and Sweetness already contribute 30 points at their defaults.

## Minor Observations

- Two Assessment B findings are wrong and were disproved in the parent context. Focus IS
  restored after Escape on all three modal types (help, wheel, confirm) — B's probe
  grabbed the first .help-btn in DOM order, which lives on the hidden setup screen, so
  focus() was a no-op and the recorded opener was the wordmark. B's "score bar goes
  stale" is a harness gap, correctly self-flagged: updateScorebar() is called by the real
  commit path.
- .cata-chip measures 35.9px real reach — clears WCAG 2.5.8 AA, fails DESIGN.md's
  absolute 44px claim. Both assessments independently concluded: amend the document, not
  the chips, because expanding past the 5px gutter would let a tap silently record the
  wrong descriptor.
- The wheel's zoom ladder works as its stated remedy: 5.50 -> 11.27 -> 15.39px, wedge
  reach 11.8 -> 24.2 -> 33.0px. Zoom 2 clears both the 11px floor and the 24px target.
- `--data-soft` has three different values across the project: DESIGN.md frontmatter
  #e7eef3, DESIGN.md body #e4efec, CSS rgba(29,79,115,.10). Two are green-tinted
  leftovers from the pre-slate world.
- Accessibility gaps B found that A did not: p#wheel-status receives every pick message
  and has no aria-live or role; #cupper-name and #history-search have no accessible name;
  the radar SVG has no role, title, desc or table equivalent, so 3x7 per-attribute values
  exist only as polygon geometry; there is no <main> landmark and no skip link.
- At 320px, h1#cupping-name truncates on the default name "Coffee 1", and the Describe
  summary loses 62% of its width — its row is tighter than its sibling's because of the
  OPTIONAL pill.
- On an empty scale the tick row reads 1 2 3 4 _ 6 7 8 9: the knob hides the 5 and
  carries no numeral when unrated, so information is removed and replaced with nothing.

## Questions to Consider

1. You removed the trophy for the right reason and put a metadata line in its place.
   What is the peak now? The ceremony you designed as the ending is reachable only when
   there is signal.
2. If a part-scored sheet can win the ranking, what does the ranking mean? Is grey ink
   plus a count enough for something in first position, or does incompleteness belong in
   position — this system's own answer to everything else?
3. Guided mode saves 12%. PRODUCT.md says help that taxes the expert has failed both
   audiences. What would a sheet designed expert-first, then padded for the novice, look
   like?
4. Which other binding claims in DESIGN.md have been checked against the running app
   rather than against the intention? Measured this run: the 4.5:1 floor is false, the
   worst-case-across-surfaces methodology is false, "one treatment everywhere" is false
   on Present, the 44px floor is false for 174 chips. The motion budget, the colour rule,
   the keyboard promise and the radius discipline all held exactly.
