---
target: espresso dial-in
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/user/sca-cupping-coffee/public/espresso/index.html"
target_fingerprint: "sha256:abbf5f685681929dfed792a852ab2f971c9ebb4134377928c33b11077ddb666e"
target_path: /home/user/sca-cupping-coffee/public/espresso/index.html
timestamp: 2026-09-28T01-03-42Z
slug: public-espresso-index-html
---
Method: dual-agent (two isolated sub-agents, parallel). Target: espresso dial-in, `public/espresso/index.html`. Mode: Operate.

## Design Health Score — 28/40 (Good)

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Replacing the recipe reports itself as "Shot updated" while the pinned numbers silently change. |
| 2 | Match System / Real World | 4 | Excellent. Blemishes: `12:42 AM` / `mm/dd/yyyy` locale in British prose; "Off" for "not drinkable". |
| 3 | User Control and Freedom | 1 | Escape and backdrop tap discard a typed shot with no confirm, while the X asks. No undo anywhere. |
| 4 | Consistency and Standards | 2 | Three exits from the shot sheet, three behaviours. Two `<details>` grammars. Coin-test rows act; pinch-test rows are inert prose. 24 WCAG AA contrast failures on `--data-soft`. |
| 5 | Error Prevention | 3 | Strong in the large; undone by a confirm that fires on an untouched sheet every time. |
| 6 | Recognition Rather Than Recall | 3 | "Keep it?" has three answers; only `keeper` ever renders again. |
| 7 | Flexibility and Efficiency | 2 | `.log-card` is a bare div — no shot record is keyboard-reachable. No export. |
| 8 | Aesthetic and Minimalist Design | 3 | `1:2.42` is the 30px headline on every card — the loudest repeated element is the number that never changed. Card-in-card twice. |
| 9 | Error Recovery | 3 | `.num-note` copy is a model. Nothing recovers a discarded shot; all dialogs are native `confirm()`. |
| 10 | Help and Documentation | 4 | Help sits at the decision, not in a manual. Best-in-class. Target is 109x28. |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

Authored for this product, decisively. Structural, not decorative: the kit sheet asks what a machine can change and never its name; the taste question splits into two scales with the middle named; advice is graded by confidence in two channels. Strip the copy and it would still not be mistakable for anything else.

Deterministic scan: `impeccable detect` returned 0 findings, exit 0, on all three targets (verified not suppressed: no ignoreRules, `--no-config` also clean, no inline disables). In-page injection across 5 views found 8 flags; 5 are false positives (see below). No user-visible overlay is available — this harness exposes no browser-presentation surface, so the overlay ran headless.

## Priority Issues

**[P0] No shot record is reachable without a pointer.** `.log-card` is `el('div', 'log-card')` — no tabindex, no role, no label. The board has zero headings (`h1`/`h2` count: 0; the 9 `h3`s are all in hidden sheets) and no `<main>`. `#next-card`, which carries the answer and rewrites after every save, has no `aria-live`. Editing or deleting a mis-logged shot is pointer-only.
Fix: make `.log-card` a `<button>` with an `aria-label`; `<h1>` on the coffee name, `<h2>` on the recipe/phase/target; `aria-live="polite"` on `#next-card`.

**[P1] Escape and the backdrop destroy a typed shot silently.** `app.js:4530` and `:4533` call `closeModal()` directly, bypassing `closeShotSheet()` — the function that owns the dirty check and the snapshot restore. The X asks; the other two exits do not.
Fix: route all three through `closeShotSheet()`, then add undo to the toast.

**[P1] The "nothing on this sheet" confirm fires on every untouched sheet.** `shotHasContent()` tests `!== null && !== '' && !== undefined` over a list including `harsh` and `bright`, both initialised to `false` — which passes all three tests. The comment directly above it describes this exact failure as fixed.
Fix: treat the two booleans as content only when true.

**[P1] 24 WCAG AA contrast failures, all on the keeper card.** `--text-faint` on `--data-soft`: 4.15 light, 4.32 dark, against 4.5. Independently recomputed from tokens. The token passes on every plain surface; only the 10-14% tint drops it — and that tint is the pinned recipe and the keeper row, the thing you read at 7am.
Fix: use `--text-dim` (6.5:1+) on tinted surfaces, or darken `--text-faint`.

**[P2] The log card's hierarchy inverts.** Every card leads with the ratio at 30px in data ink — identical across a fixed-ratio dial-in — while grind sits at 13px in `--text-dim` on line two.
Fix: lead with `27s · grind 3`; demote ratio to line two.

**[P2] The advice never reads the verdict.** Line 1376 tests `verdict === 'keeper'` only. "This is the one." prints over a shot the user just marked "Drinkable — not there yet". `off` and `ok` render nowhere on the board.

## Persona Red Flags

- **7am barista, one wet hand:** ~135px of exposed backdrop above the shot sheet discards a typed shot on contact. `#taste-help` is 109x28; `summary.tip-more` is 73x32. `.toast` is pinned at `bottom: sab+88px` and covered both the grinder prefill and the coin-test result.
- **Power user:** no shot record keyboard-reachable; redundant confirm every time; no export; Escape closes the bottom modal not the top (`querySelector` takes DOM order).
- **Screen reader:** zero headings, no `<main>`, unlabelled div records, silent `#next-card`. Countervailing and real: correct `role`/`aria-checked` on every chip, `aria-disabled` with the reason, `role="slider"` with `aria-valuetext`, working focus trap, 2px focus ring on all 39 stops.
- **First machine, three weeks in:** two filled-black primaries on the first screen; pinch-test rows look identical to the coin-test rows that act; `<details>` markers invisible on `.more`; kit defaults indistinguishable from given answers under copy saying "correct any that are wrong".

## Detector False Positives (source read before each call)

`cramped-padding` x6 — `.seg` and `.tip-act` get their inset from `min-height: 44px` + flex centering, not padding; measured 12.8-15.4px above/below text. `text-occlusion` — the `<details>` is closed and `checkVisibility()` is false; stale rect. `dark-glow` — `#ffba00` is the overlay's own colour, detector detecting itself. `input#t-tds` 48x28 — wrapped by a full-row `<label for>`.

## Minor

320px only: `.log-time` and `.log-when` collide by 13.2px inside `.log-headline` (`min-width: 0`, no truncation). Locale seam. "Off" as a label. Data ink on three non-values. Card-in-card twice. Stale source comment at `app.js:3850`. Coin test opens with ~90 words before step 1. Native `confirm()` in an iOS PWA shows the origin. No export, no reset.

Verified clean: zero console/page errors across both walkthroughs; no horizontal overflow at 320/390/430; reduced-motion fully honoured (0 animating elements); every visible input has an accessible name; focus visible on all 39 stops.
