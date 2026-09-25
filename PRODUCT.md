# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a **mixed cupping table**: a lead cupper fluent in the SCA protocol running a session with participants who are not.

This is a single audience, not two. The lead knows CVA cold and needs speed, precision and trustworthy math — every tap between "I have an impression" and "it's recorded" is friction at a table where the coffee is cooling. The participants are working the protocol out as they go and need the scaffolding (guided mode, the flavor wheel, plain explanations of what to smell and how the score is computed) without it slowing the people who don't need it.

Design has to serve expert speed and novice scaffolding *simultaneously*, on the same screen, in the same session. Solving for either one alone is a failure.

## Product Purpose

Run SCA cupping sessions on a phone held over the table — scoring, descriptive assessment, results, and shared panel calibration.

Two scoresheets are supported and chosen at session start: **CVA** (Affective Assessment, SCA Standard 104-2024, which replaced the 2004 form in November 2024) and **Legacy** (the retired 2004 form, still in wide use).

**lento is now three instruments, not one.** The cupping sheet is the first and the most demanding; beside it are an **espresso dial-in** (`public/espresso/`) and a **filter brew log** (`public/filter/`), each a board per coffee that records what you did, works out what it can from that, and says what to change next. They share a palette, a component layer and one rule — *the app will not print a number it cannot account for* — and nothing else: separate shells, separate service workers, no shared runtime.

**Whether that is one audience or two is an open question this document does not yet answer.** The cupping table is a scheduled, social, protocol-bound event; a dial-in is a solo act performed at seven in the morning with one wet hand. The same person may well do both, and the design has so far assumed so. That assumption has not been tested and should not harden into a decision by default.

lento is a **product meant to grow**. A real user base is the goal, with possible monetization later. Acquisition, first-run onboarding, and retention are therefore legitimate design concerns, not premature ones — this is not a personal tool published as a courtesy.

## Positioning

**Social cupping that needs no account and no backend to start.** The leader taps share and the app generates a session code that itself carries the coffee lineup (JSON → gzip → base64url, typically ~100–500 characters). Participants join by QR, a 4-digit live code, or pasted text, and the coffees load ready to score.

Scores then follow the protocol rather than the convenience of the software: each cupper scores independently, submissions stay sealed server-side, and no one — leader included — can read another cupper's numbers until the leader reveals. After the reveal every device shows the same panel score (the average of independent scores, per SCA practice), each cupper's deviation from it, and a calibration summary of who runs high or low.

A neighboring product could copy the scoresheet. The parts that are harder to copy truthfully are the zero-friction join, the sealed-until-revealed integrity, and the fact that the whole app works with no network at all.

## Operating Context

A physical cupping table. Phone in one hand, spoon in the other, wet and moving between cups on a timer. The session is social and time-boxed; people are talking, and the scoring happens between slurps rather than in a quiet review afterward.

The session shape:

1. **Setup** — scoresheet, number of coffees, cups per coffee (SCA standard is 5).
2. **Cupping** — swipe between coffees and score. CVA rates eight sections 1–9 plus non-uniform (−2) and defective (−4) cup counts; Legacy scores seven attributes 6.00–10.00 in 0.25 steps with per-cup Uniformity, Clean Cup and Sweetness, taints (−2) and faults (−4). Descriptive Assessment (SCA 103-2024) mirrors the printed form: roast level, 0–15 intensities, the nine-category olfactory CATA list (up to five), main tastes (up to two), mouthfeel (up to two), and freely elicited notes.
3. **Results** — winner podium, ranking with score bars, overlaid sensory radar. Each cupper submits, then the leader reveals.
4. **Calibration** — the panel discusses who ran high or low.

The leader is a cupper too and submits like everyone else, so the panel average is identical on every phone.

## Capabilities and Constraints

**Confirmed functionality:** CVA and Legacy scoresheets; Descriptive Assessment; interactive flavor wheel built from the SCA/WCR/UC Davis Coffee Taster's Flavor Wheel (inner category ticks the CATA box, outer descriptor drops the word into tasting notes); guided mode (on by default); live total with SCA quality grade; results podium, ranking and radar; session history; CSV export; print/save-as-PDF scoresheet; `localStorage` autosave and resume; home-screen install; Supabase auth and sync; Cloudflare Worker relay for 4-digit live codes.

**Binding — iPhone-first and safe-area aware.** Designed for a phone held over a cupping table. Touch targets, thumb reach and iOS standalone behavior come first; desktop is secondary.

**Binding — full offline capability.** The service worker caches the whole app; scoring, history and the flavor wheel must work with no network. Live join codes are the only network-dependent feature and must fail softly, hiding the live-code UI while QR and long-code sharing continue to work.

**Open decision — the implementation stack.** Today it is vanilla HTML/CSS/JS with no build step and no dependencies. This is an engineering choice, not a commitment: a build step or framework is acceptable if it earns its place, provided offline capability survives. Future work must not treat "no build step" as a rule, nor change the stack casually.

**Terminology:** cupping, cupper, the table, CVA, CATA, panel score, calibration, taint, fault, uniformity, clean cup, fragrance/aroma/flavor/aftertaste.

## Brand Commitments

**The name `lento` and the line "coffee, taken slowly" are durable**, and the product lives at `lento.cafe`. Three tools live under that name — cupping, espresso dial-in, filter brew log. A roasting log is named on the landing page as not built yet, and it does not exist.

**The visual identity has moved, and it is still open.** This document previously described a cream ground (`#f5efe6`), a copper accent (`#b5793a`) and a gradient wordmark. That was accurate when it was written and is no longer: the apps run on a warm off-white ground (`#fbfaf7`, and `#0f1113` in dark), one slate data ink (`#1d4f73`), near-black chrome, and IBM Plex Sans with Plex Mono for figures. The wordmark is set in the ink, not a gradient. The authority for all of it is `public/shared/tokens.css`; `DESIGN.md` records why each value is what it is and the contrast figures behind it.

The landing page kept the old palette inline for some time after the apps had left it, so the front door and the tool one tap behind it were visibly different products. It has been brought onto the shared tokens. **This was the same failure at two scales** — a second copy of the palette, and later a second copy of the component layer — and the rule that catches both is in `DESIGN.md`: nothing declares a colour, a face, a spacing step or a radius of its own.

The identity remains **open rather than pinned**. It moved once on the strength of an argument (green is the *Green/Vegetative* wedge on the flavour wheel, so it could not also mean "this scored well"), and it can move again on the strength of another. Both themes are first-class and every figure in `DESIGN.md` is measured, so a change means re-measuring rather than re-deciding by taste.

## Evidence on Hand

- Three complete, working applications: `public/cupping/`, `public/espresso/` and `public/filter/`, each with its own `index.html`, `app.js` and service worker.
- A shared design layer in `public/shared/`: `tokens.css` (palette, faces, spacing, radius, easing), `components.css` (the parts the two instruments are built from) and the three woff2 faces. The cupping sheet takes the tokens and keeps its own components, deliberately — see `DESIGN.md` for the measurement behind that line.
- Root landing page `public/index.html`, relay in `worker/index.js`, schema in `server/supabase-schema.sql`.
- Product documentation in `README.md`, design law in `DESIGN.md`, deployment notes in `DEPLOY.md`.
- Real protocol grounding: SCA Standard 104-2024, SCA 103-2024, the 2004 legacy form, and the SCA/WCR/UC Davis flavor wheel.

**Absent — future work must not fabricate these:** there are no testimonials, no named customers, no user counts, no press coverage, no benchmarks, no pricing, and no case studies. The roasting log does not exist. No claim about adoption or reception is currently supportable.

**Tested, and by whom.** The cupping sheet has been through a four-person simulated table and the espresso dial-in through a simulated head barista; both found defects that inspection had missed, and both sets are fixed. **The filter brew log has been tested only by its author.** That is a real gap and it should not be described as though it were not.

## Product Principles

1. **The table sets the pace, not the app.** Coffee cools on a timer. Anything that adds a tap, a wait, or a decision between impression and record is a cost paid at the worst moment.
2. **Scaffolding must be free for those who skip it.** Guided mode, the wheel and the explanations serve the novice without ever slowing the lead cupper. Help that taxes the expert has failed both.
3. **Protocol integrity is a feature, not a constraint.** Independent scoring, sealed submissions, and honest panel math are the reason to trust the result. Never trade them for convenience.
4. **Offline is the default state, not the fallback.** The app assumes no network and treats connectivity as a bonus that degrades gracefully.
5. **Earn the second session.** A product meant to grow is judged on whether the table opens it again next week, not on whether it opened once.

## Accessibility & Inclusion

**Undecided — no required standard has been established.** Recorded as an open decision rather than assumed.

One factual finding for whoever decides it: the mechanical detector currently reports WCAG AA contrast failures in the shipped implementation, including copper `#b5793a` on `#fffdf8` at 3.6:1 and faint `#ab9a81` on `#f5efe6` at 2.4:1, against a 4.5:1 body-text requirement. The operating context — a phone under variable, often dim roastery or lab lighting, held at arm's length over a table — makes legibility a usability concern independent of any standard adopted.
