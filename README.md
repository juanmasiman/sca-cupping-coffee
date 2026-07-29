# ☕️ SCA Cupping

A mobile-first web app for running coffee cuppings with the **SCA (Specialty Coffee Association) cupping protocol**. Built for iPhone — vanilla HTML/CSS/JS, no build step, no dependencies.

## Flow

1. **Setup** — choose how many coffees are on the table and how many cups per coffee (SCA standard is 5).
2. **Cupping** — swipe between coffees, score each one on the full SCA scoresheet:
   - **Scale attributes** (6.00–10.00, 0.25 steps): Fragrance/Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Overall
   - **Per-cup attributes**: Uniformity, Clean Cup, Sweetness — tap a cup to fail it; each cup is worth its share of 10 points
   - **Defects**: Taints (−2/cup) and Faults (−4/cup)
   - Free-text tasting notes per coffee
3. **Results** — winner podium, full ranking with score bars, and an overlaid sensory radar chart (tap a legend name to isolate a coffee). Share/copy the results.

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
