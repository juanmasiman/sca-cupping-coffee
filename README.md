# ☕️ SCA Cupping

A mobile-first web app for running coffee cuppings with the **SCA (Specialty Coffee Association)** protocols. Built for iPhone — vanilla HTML/CSS/JS, no build step, no dependencies.

Both scoresheets are supported, chosen when a session starts:

- **CVA** (default) — the Affective Assessment of the Coffee Value Assessment, SCA Standard 104-2024, which replaced the 2004 form in November 2024.
- **Legacy** — the retired 2004 cupping form, still in wide use.

## Flow

1. **Setup** — pick the scoresheet, how many coffees are on the table, and how many cups per coffee (SCA standard is 5).
2. **Cupping** — swipe between coffees and score each one.

   **CVA (SCA 104-2024)** — eight sections rated 1–9 for impression of quality (Fragrance, Aroma, Flavor, Aftertaste, Acidity, Sweetness, Mouthfeel, Overall), plus counts of non-uniform (−2 each) and defective (−4 each) cups. The score is `0.65625 × Σ(sections) + 52.75` minus deductions, rounded to the nearest 0.25 — a 58.00 to 100.00 range.

   **Legacy (2004 form)** — seven attributes from 6.00 to 10.00 in 0.25 steps; Uniformity, Clean Cup and Sweetness scored per cup; taints (−2/cup) and faults (−4/cup).

   Both carry free-text tasting notes and origin details per coffee.
3. **Results** — winner podium, full ranking with score bars, and an overlaid sensory radar chart (tap a legend name to isolate a coffee). Share/copy the results.

## Social cupping (no backend needed)

A cupping leader sets up the table (coffees, names, details) and taps the share icon in the cupping header — the app generates a **session code** that itself carries the coffee lineup (JSON → gzip → base64url, typically ~100–500 characters). Participants tap **Join a cupping** and paste the code; the coffees load ready to score.

After scoring, each cupper shares a **score code** from the Results screen; the leader pastes them into **Team scores** to see per-coffee table averages and each cupper's numbers side by side — a quick calibration view. Everything travels over iMessage/WhatsApp/anything; no server, no accounts.

### Inviting cuppers: QR + live code

The leader taps the share icon while cupping and gets an invite sheet with:

- a **QR code** — participants point their iPhone camera at it and Safari opens the app with the coffees loaded (the QR encodes `lento.cafe/cupping/#join=<code>`, so it works with no backend);
- a **4-digit live code** (Apple-TV style) — participants type it into "Join a cupping". This uses the optional relay in `server/cloudflare-worker.js`; when the relay is unreachable the app hides the live-code UI and QR/link sharing still works;
- a **Share link** button for iMessage/WhatsApp.

See `DEPLOY.md` for putting the app on `lento.cafe/cupping` with Cloudflare Pages and deploying the relay worker.

## Details

- Live total score (max 100) with SCA quality grade in a floating score bar
- Session auto-saves to `localStorage` — resume after a reload or accidental close
- Home-screen installable (web manifest + iOS meta tags), safe-area aware
- Smooth spring animations, custom touch sliders, haptic feedback where supported

## Run it

It's a static site — open `index.html`, or serve the folder:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or your machine's LAN IP from your iPhone).
