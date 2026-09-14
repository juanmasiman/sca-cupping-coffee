---
target: public/cupping
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/user/sca-cupping-coffee/public/cupping/index.html"
target_fingerprint: "sha256:13568975cc7294bd6ffedf114c99ef9979bef8b1d58208c5ae06990fce90c1a9"
target_path: /home/user/sca-cupping-coffee/public/cupping/index.html
timestamp: 2026-09-14T15-45-44Z
slug: public-cupping-index-html
---
Method: dual-agent (A: design review, isolated · B: detector + browser, isolated).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Rail progress and scorebar excellent; invite sheet reads "Getting code…" forever on relay failure |
| 2 | Match System / Real World | 3 | Domain language near-perfect; trophy podium frames calibration as a contest |
| 3 | User Control and Freedom | 3 | No Esc closes any of 9 modals; backdrop-tap silently joins as "Cupper" |
| 4 | Consistency and Standards | 2 | Eight native confirm() dialogs inside a custom sheet language |
| 5 | Error Prevention | 3 | touched tracking good; part-scored sheet archives with unrated = 5, unmarked |
| 6 | Recognition Rather Than Recall | 2 | 1-9 ships as bare digits; anchor words render only after choosing, 10.5px / 2.69:1 |
| 7 | Flexibility and Efficiency | 2 | No shortcuts, no copy-previous, no jump-to-next-unrated; 48 taps for six coffees |
| 8 | Aesthetic and Minimalist Design | 3 | Calm card rhythm; right 44% of each score card is cramped |
| 9 | Error Recovery | 2 | Humane copy, but toast() is the only channel and vanishes in 1.8s |
| 10 | Help and Documentation | 3 | 20 accurate entries; the four most important are orphaned |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

Authored for coffee cupping in substance; category-interchangeable in surface. The protocol is the IA (Present screen app.js:3465; touched map app.js:213). Above that layer it is a generic iOS app kit.

Deterministic scan: 53 raw hits -> 28 distinct. bounce-easing fires 11x from ONE token (styles.css:33). side-tab and gradient-text double-counted (CSS read directly and via linking HTML).

False positives: cramped-padding on .modal-sheet (calc(env()) unresolvable statically; measured 20px live). dark-glow fired against the :root DARK theme — unreachable, because index.html:2 hardcodes data-theme="crema" and app.js writes data-theme zero times. Three palettes plus a dark theme ship and can never render.

Visual overlays: NOT AVAILABLE. Headless container, no human-visible tab; injection flow not run. Fallback: 35 screenshots at 390x844@3x and 1440x900 plus computed measurements.

## What's Working

1. touched — refusal to fabricate data (app.js:213, 782, 2698, 3038, 4176).
2. The coffee rail as one object doing three jobs (styles.css:423).
3. Engineering hygiene: 0 console errors/warnings/exceptions/failed requests; no horizontal scroll at 390; logical tab order, no traps.

## Priority Issues

### [P0] Offline, the leader cannot invite anyone — and is never told
app.js:1517-1530, 1636-1663. Verified in source. shareUrl starts null; setShareUrl(null) disables the button as "Getting code…". On relay failure the else branch hides pinWrap and returns WITHOUT calling setShareUrl. Button stays disabled permanently, no error, no QR.
The waiting state is deliberate (code comment: a premature link "would split the room"), but the failure path was never written.
PRODUCT.md marks offline BINDING; README.md:47 promises QR/link still work. They do not. buildSessionCode() is pure local gzip; the guest branch already calls it.
Fix: in the else, setShareUrl(joinURL(await buildSessionCode())) + "No signal — the QR and link still carry the whole lineup."
Command: /impeccable harden

### [P1] Core scoring gesture is a 31.5px target, hit 72 times per coffee
styles.css:966, app.js:2724. Computed 31.8px, MEASURED 31.5x31.5 rendered. No ::before/::after hit expansion — rendered box is hit box. .help-btn 19x19 (12/screen); .cva-clear 22x22 (recovery smaller than the error). Apple minimum 44x44. Wet hands, spoon in the other.
Fix: rows of 5 and 4 (~60px), or drag-to-select.
Command: /impeccable adapt

### [P1] 62 failing contrast pairs — including the chosen score itself
--text-faint #ab9a81 2.40-2.69:1; --accent #b5793a 2.80-3.59:1; --on-accent on accent 3.45:1.
.cva-btn.selected = 3.45:1 (WHICH VALUE YOU CHOSE). #btn-finish "Results" = 2.80:1. .rank-medal.m1 = 1.83:1, worst in app. index.html:5 sets user-scalable=no so nobody can pinch out.
--text-dim already passes at 4.57:1 — the app ships a passing token and uses the failing one.
Wheel descriptors render at 5.53px across 68 tappable labels.
Command: /impeccable audit

### [P1] Four help entries the novice half most needs are orphaned
Verified: of 19 entries, exactly 4 never reach addHelp/openHelp — intro, cvaScale, score, legacyDefects. Those are: what a cupping is, what 1-9 means, what /100 means, Legacy defects. PRODUCT.md's user is a MIXED TABLE; these are exactly what the novice half lacks. Lead cupper must say it aloud — the tax Principle 2 forbids.
Command: /impeccable onboard

### [P2] Calibration block editorialises against the low runner
app.js:3331, styles.css:1962. .calib-val.high in --accent; .low muted. Public on every phone, with names. Only magnitude matters in calibration. Nothing says ±1.5 is normal.
Fix: symmetric diverging bar centred on zero + "Direction is a habit, not a verdict."
Command: /impeccable clarify

## Persona Red Flags

Jordan: nine unlabelled digits; anchors render only after choosing at 10.5px/2.69:1; the ? is 19x19 and HELP.cvaScale is unwired; "Fragrance" appears twice asking incompatible questions.
Sam: CORRECTION — buttons DO get the UA outline ring. Real defect: styles.css:2191 .lineup-name:focus{outline:none} with NO replacement (measured outline none, border 0px, box-shadow none); four more inputs swap the ring for a 1px border colour. Both sliders are pointerdown-only divs, no role=slider, no arrow keys — Legacy sheet and all 7 Describe intensities keyboard-unreachable.
Casey: bottom bar inert while Results/Invite/back sit top-of-screen; rail segments 32px.
Marta (lead cupper): no host/cupper mode — roster poll haptics and toasts interrupt mid-section, unmutable. Reveal reachable from 3 places, 3 copy treatments. No timer.
Tom (first-time participant): lands on cupping screen with zero orientation; backdrop-tap joins silently as "Cupper"; duplicate names break the p.name === myName identity check (app.js:3303).

## Minor Observations

- "Average score by Roast" cannot work — roast is free text, every group count 1.
- Every Results visit re-archives (app.js:3109); partial sheets enter history unmarked with unrated = 5.
- Scorebar shows /100 for a scale flooring at 58; HELP.score explains this and is orphaned.
- Three orphaned themes plus unreachable dark mode ship uncompressed.
- .seg overflow has no affordance; scrollbars suppressed, no edge fade.

## Questions to Consider

1. Why is there a trophy? Replace the podium with panel agreement?
2. What if the bottom bar were the scoring control instead of a read-out?
3. Where is the timer? Could the sheet reveal itself in protocol order?
4. Does a novice need nine numbers, or lower/about right/higher refined after?
5. If the identity is genuinely open, why is it brown? Lab instrument vs café menu.
