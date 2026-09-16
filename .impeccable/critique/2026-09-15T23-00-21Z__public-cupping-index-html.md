---
target: public/cupping
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/user/sca-cupping-coffee/public/cupping/index.html"
target_fingerprint: "sha256:049d6a37eea53930a8e561fb88280db0ae0ed1fb9f14efd070cc323db8e652bc"
target_path: /home/user/sca-cupping-coffee/public/cupping/index.html
timestamp: 2026-09-15T23-00-21Z
slug: public-cupping-index-html
---
Method: dual-agent (A: design review, isolated · B: detector + browser, isolated).
Re-run after the Anchored Scale rebuild (commits ffe92a9…0125664).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Provisional scorebar and rail fill are good; guests are never told the table was revealed (pollCuppingRoster gated on isTableLeader, app.js:1240) |
| 2 | Match System / Real World | 3 | Domain language near-exemplary; Results still opens on "Highest score on the table", print claims SCA 104-2024 with no section scores |
| 3 | User Control and Freedom | 2 | Eight window.confirm() inside nine bespoke sheets; zero Escape handlers, no focus trap, no role=dialog |
| 4 | Consistency and Standards | 2 | Two rating grammars on one panel — anchored scale beside the pre-rebuild .slider |
| 5 | Error Prevention | 2 | touched is enforced as display on 2 of 6 surfaces and as math on none; cvaScore sums untouched sections as 5 |
| 6 | Recognition Rather Than Recall | 3 | Guided mode and help marks are strong; the 4-digit live code exists only inside the invite sheet |
| 7 | Flexibility and Efficiency | 2 | Real accelerators on the scale only; no Esc, no coffee-to-coffee shortcut, no copy-descriptors, lead cupper has no mode |
| 8 | Aesthetic and Minimalist | 3 | Hairline sheet and 9-step ramp landed; Describe card is 2573px with 58 chips + 7 sliders |
| 9 | Error Recovery | 2 | Join-sheet errors are inline and named; everything else is a 1800ms pointer-events:none toast |
| 10 | Help and Documentation | 3 | Guided mode is the second-best thing in the product; nothing explains the reveal or how the panel average is computed |
| **Total** | | **25/40** | **Acceptable** (20–27) |

Movement is essentially flat (26 → 25) and that is the finding. The rebuild raised the
ceiling on the surfaces it touched (H2, H8, H1) and left the untouched ones to cancel the
gain (H4 got worse in kind, H5 dragged down by the panel-average gap, H3 untouched).

## Cognitive load

5 of 8 fail → HIGH. Disclosure is handled well; quantity is not. Once a group opens it
dumps everything it has: 24 olfactory chips at one decision point, 58 chips per Describe
card, 8 CVA sections flat under one head.

FAIL: single focus, chunking, one-thing-at-a-time, minimal choices, working memory.
PASS: grouping, visual hierarchy, progressive disclosure.

## Deterministic scan

16 raw hits -> 16 distinct (baseline on disk: 53 raw -> 28 distinct). No double-counting
this run. bounce-easing fires 9x from ONE token, styles.css:71 --spring (y1=1.1, 10%
overshoot) — against DESIGN.md:270 "should feel precise, not springy". Same token is used
in 23 transition: declarations, none flagged; the rule is animation-scoped.
layout-transition 3x (progress-bar width fills). design-system-font-size 2x = the
flavour-wheel SVG labels, documented exemption at DESIGN.md:245. cramped-padding 1x on
.modal-sheet is a confirmed false positive — calc(env()) is unresolvable statically;
live computed padding is 22/20/20/20. all-caps-body 1x = p.subtitle, 37 chars, setup hero.

## Browser evidence (Chromium 141, iPhone 390x844 @3x + desktop 1440x900, both themes)

Contrast, every visible text node vs its resolved background, gradient-aware and
pixel-verified from the PNGs: exactly ONE pair below 4.5:1, failing in both themes —
.podium-label "HIGHEST SCORE ON THE TABLE" at 4.39–4.43:1 (light) / 4.32–4.43:1 (dark).
Cause is .podium's radial-gradient tint over --bg-card; on plain card it would be
4.93 / 5.20. Per-state minima otherwise 4.52–6.55 (light) / 4.78–7.14 (dark).

NOT covered by that sweep: non-text graphics. RADAR_COLORS (app.js:179) measure ~1.44:1
and ~1.82:1 on the light ground against a 3:1 requirement (WCAG 1.4.11), are hardcoded,
and have no dark variant. .wheel-cat-label fill #ffffff on #e5c650 is ~1.8:1.

Horizontal scroll at 390px: none, any state, either theme. Two intentional contained
scrollers; .seg suppresses its scrollbar in both engines, leaving 3 of 8 History buttons
off-screen unsignalled.

Text below 11px: zero, outside the exempted wheel labels. Every rendered size sits on the
9/11/13/15/17/20/24/30/40/46 ramp except 5.4px and 7.0px, both wheel SVG.

Keyboard: 89 tab stops on the cupping sheet, no trap, every stop inView, every stop ringed.
.scale-track is reachable at stop 15 with role=slider, aria-valuetext, arrows, Home and End
all working. .scale-track hit area verified 358 x 48 by per-pixel row scan.

Touch targets under 44px (height binding): .rail-seg 32, .slider.slim 34, .cata-chip 35
(58 per panel), .seg-btn 35, .finish-btn 37, .wheel-fab 38, .stepper-btn 38x38, .invite-btn
39, .icon-btn 40x40, .detail-field 41, .lineup-icon 32x32, .lineup-name 27, .wheel-link 22,
.wheel-pick 27. Rescued by pseudo expansion: .help-btn 19 -> 45, .cva-clear 22 -> 42.8.

Console exceptions 0, failed requests 0. The 2026-09-14 P0 (offline leader with a dead
Invite button and no message) is no longer reproducible — the relay 501 now renders a full
QR plus an explanation.

New this run: the 32x32 .scale-knob parks at position 5 on every unrated track and covers
the 9px "5" by 5.4 x 7.0 px, on all 24 tracks. #cupping-name clips "Ethiopia Guji Natural"
to 58% at 390px (scrollWidth 166 into clientWidth 96).

## Priority issues

**[P0] Part-scored sheets enter the shared panel average silently.** myScores (app.js:1278)
has no completeness check; cvaScore (app.js:813) sums untouched sections as 5; the leader's
sheet auto-submits on entering Present (app.js:3744). buildPresentFinal then renders it as
"the average of N independent cuppers, as the standard prescribes." touched is enforced on
2 of 6 surfaces. Fix: send {score, rated, total}, exclude rated===0, mark partials on
.podium-score / .rank-score / print .num, refuse a wholly unrated submission.

**[P1] The reveal is a browser alert that does two things and announces one.**
app.js:1665-1676 and 3786-3801. ensureRevealed also sets shareDetails=true (app.js:3795),
pushing farm/variety/process/altitude to every guest — neither dialog mentions it. Guests
are never told at all; pollCuppingRoster is leader-only. Fix: one destructive-styled sheet
naming both consequences and the count still cupping, plus roster polling for guests with
a push to Present on the S: -> R: transition.

**[P1] The new visual world stops at the CVA sheet.** Legacy (app.js:3106) and the seven
Describe intensities (app.js:2612) still run the pre-rebuild .slider — permanent
0 3px 12px shadow plus a 5px glow ring, gradient track — against DESIGN.md's one-lift rule.
emptyDescriptive (app.js:2549) sets intensities to 5 with no touched flag at all, so the
unrated/5 distinction DESIGN.md marks "everywhere, forever" dies on that card and in export.
Fix: port both onto buildAnchoredScale, which its own comment at app.js:2829 anticipates.

**[P1] Radar series colours are near-invisible on the light ground.** app.js:179, used at
4006 and 4025. ~1.44:1 and ~1.82:1 against a 3:1 requirement for non-text graphics; no dark
variant; never measured because they are not tokens, which narrows the "62 -> 0" claim.
The stroke-dasharray encoding already carries identity, so the hues can darken freely.

**[P2] The printed scoresheet is not a scoresheet.** app.js:4375-4418. Five columns, no
section scores, no defects, no intensities, no unrated marking, header reading "Coffee Value
Assessment · SCA 104-2024". styles.css:2208-2249 hardcodes the exact six values DESIGN.md
declares as --print-*; grep "\-\-print" styles.css returns nothing. Eight point sizes on no
ramp. This is the only artefact that leaves the phone.

## Strengths

1. The anchored scale is a real instrument (app.js:2869-2978, styles.css:1045-1130):
   press-anywhere 48px track, free while held, settling to detent over 220ms, haptic per
   crossing, dashed empty knob, and a genuine role=slider underneath. Browser-verified.
2. Guided mode costs the expert nothing — body.plain collapses the layout rather than
   hiding help behind a menu (styles.css:703-713), enforcing PRODUCT.md principle 2 in CSS.
3. The radar refuses to depend on colour — ten stroke-dasharray patterns, legend swatches
   drawn as the series' own line. The encoding decision is right even though the palette is not.
