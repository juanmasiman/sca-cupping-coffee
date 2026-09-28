/* ============================================================
   lento — the flavour wheel

   The SCA/WCR/UC Davis Coffee Taster's Flavor Wheel: nine categories,
   sixty-eight descriptors, drawn rather than pictured so it can be
   tapped, zoomed, read by a screen reader and coloured by the page's
   own theme.

   WHY IT MOVED OUT OF THE CUPPING SHEET

   It was written there because that is where it was needed, and it was
   right to be there while it was the only place anybody hunted for the
   word for what they were smelling. Then the brew log needed the same
   question — *did the bag's notes turn up in the cup, and what else
   did?* — and the answer is not "a bit like the cupping wheel". It is
   the same wheel. It is a published standard: the categories, the
   descriptors, the nine hues and which word sits next to which are not
   this project's to vary between two of its own screens.

   This is the measurement DESIGN.md asks for before an extraction. The
   taxonomy is identical by definition. The drawing is identical — one
   SVG, the same radii, the same arithmetic. The zoom and the keyboard
   grid are behaviour of that drawing and nothing else. What is NOT the
   same is what a tap MEANS: in the cupping sheet an inner wedge ticks a
   CATA box with a cap of five that the standard sets, and in the brew
   log there is no CATA and a category is simply a coarser word for what
   you tasted. So the meaning stays with each app, as a host, and only
   the wheel comes here.

   WHAT THIS MODULE REFUSES TO KNOW

   It has no opinion about where the words go. It does not save, it does
   not read a coffee, and it never reaches for an element by id — the
   host passes its own holder and its own zoom controls in. A shared
   component that knows the shape of one app's DOM is that app's
   component with a longer path.
   ============================================================ */

(function (root) {
  'use strict';

  function esc(s) {
    return String(s === null || typeof s === 'undefined' ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* The wheel itself. The hues are the standard's own, which is why they
     are literals here rather than tokens: this drawing does not change
     with the theme, only the page under it does. */
  var CATEGORIES = [
    { name: 'Floral', color: '#e87fa8', children: ['Black Tea', 'Chamomile', 'Rose', 'Jasmine'] },
    { name: 'Fruity', color: '#e0464b', children: ['Berry', 'Dried Fruit', 'Citrus Fruit', 'Blueberry', 'Strawberry', 'Raisin', 'Prune', 'Peach', 'Apple', 'Grape', 'Lemon', 'Orange'] },
    { name: 'Sour/Fermented', color: '#e5c650', children: ['Sour', 'Fermented', 'Citric Acid', 'Malic Acid', 'Winey', 'Whiskey', 'Overripe'] },
    { name: 'Green/Vegetative', color: '#5fa855', children: ['Olive Oil', 'Raw', 'Under-ripe', 'Peapod', 'Fresh', 'Hay-like', 'Herb-like'] },
    { name: 'Other', color: '#9aa3ab', children: ['Chemical', 'Musty/Earthy', 'Woody', 'Papery', 'Petroleum', 'Medicinal', 'Salty', 'Stale'] },
    { name: 'Roasted', color: '#8a4a2b', children: ['Cereal', 'Burnt', 'Tobacco', 'Pipe Tobacco', 'Acrid', 'Ashy', 'Smoky', 'Grain', 'Malt'] },
    { name: 'Spices', color: '#b8452f', children: ['Pungent', 'Pepper', 'Brown Spice', 'Anise', 'Nutmeg', 'Cinnamon', 'Clove'] },
    { name: 'Nutty/Cocoa', color: '#c08a4e', children: ['Nutty', 'Cocoa', 'Peanuts', 'Hazelnut', 'Almond', 'Chocolate', 'Dark Chocolate'] },
    { name: 'Sweet', color: '#e8963f', children: ['Vanilla/Vanillin', 'Brown Sugar', 'Honey', 'Caramelized', 'Maple Syrup', 'Molasses', 'Overall Sweet'] },
  ];

  var WORDS = CATEGORIES.reduce(function (all, c) { return all.concat(c.children); }, []);

  function categoryOf(word) {
    var lower = String(word || '').toLowerCase();
    for (var i = 0; i < CATEGORIES.length; i++) {
      var hit = CATEGORIES[i].children.some(function (c) { return c.toLowerCase() === lower; });
      if (hit) return CATEGORIES[i].name;
    }
    return null;
  }

  /* Which ink a label needs on its own wedge. The nine hues are the
     standard's and a single ink is not legible on all of them — black on
     the yellow, white on the brown. */
  function inkOn(hex) {
    var lin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var n = parseInt(hex.slice(1), 16);
    var L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    // contrast against black is (L+0.05)/0.05; against white it is 1.05/(L+0.05)
    return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? 'dark' : 'light';
  }

  // The wheel writes comma-separated items, so they can be matched and
  // removed exactly rather than by searching the taster's own prose.
  function noteItems(notes) {
    return String(notes || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* The aria-label on a wedge says what taking it will do, and that
     differs between the two apps — the cupping sheet ticks a CATA box,
     the brew log writes a word down. The host supplies both sentences;
     neither is invented here. */
  function buildSVG(opts) {
    opts = opts || {};
    var catDoes = opts.categoryHint || 'category';
    var wordDoes = opts.wordHint || 'descriptor';

    var SIZE = 340, C = SIZE / 2;
    var R_IN = 52, R_MID = 108, R_OUT = 164;
    var total = CATEGORIES.reduce(function (n, c) { return n + c.children.length; }, 0);

    var arc = function (r0, r1, a0, a1) {
      var p = function (r, a) { return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
      var s0 = p(r0, a0), s1 = p(r1, a0), s2 = p(r1, a1), s3 = p(r0, a1);
      var large = a1 - a0 > Math.PI ? 1 : 0;
      return 'M' + s0[0].toFixed(1) + ',' + s0[1].toFixed(1)
        + ' L' + s1[0].toFixed(1) + ',' + s1[1].toFixed(1)
        + ' A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + s2[0].toFixed(1) + ',' + s2[1].toFixed(1)
        + ' L' + s3[0].toFixed(1) + ',' + s3[1].toFixed(1)
        + ' A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + s0[0].toFixed(1) + ',' + s0[1].toFixed(1) + ' Z';
    };

    var svg = '<svg viewBox="0 0 ' + SIZE + ' ' + SIZE + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coffee flavor wheel">';
    var angle = -Math.PI / 2;
    var outerAngle = -Math.PI / 2;

    CATEGORIES.forEach(function (cat) {
      var span = (cat.children.length / total) * Math.PI * 2;
      var a0 = angle, a1 = angle + span;
      var mid = (a0 + a1) / 2;

      svg += '<path class="wheel-seg wheel-cat ink-' + inkOn(cat.color) + '" d="' + arc(R_IN, R_MID, a0, a1) + '" fill="' + cat.color + '" tabindex="-1" role="button"'
        + ' aria-label="' + esc(cat.name) + ' — ' + esc(catDoes) + '" data-cat="' + esc(cat.name) + '"/>';

      // category label, rotated to sit along its wedge
      var lx = C + ((R_IN + R_MID) / 2) * Math.cos(mid);
      var ly = C + ((R_IN + R_MID) / 2) * Math.sin(mid);
      var deg = (mid * 180) / Math.PI;
      if (deg > 90 || deg < -90) deg += 180;
      /* The category ring is 56 units deep and the label reads along the
         radius, so "Green / Vegetative" — 63.8 units on one line — ran out
         of its own wedge and into the descriptors. The compound names break
         at their slash instead, which is where they already read as two
         things: no line exceeds about 40 units. */
      var parts = cat.name.split('/');
      var label = parts.length > 1
        ? parts.map(function (t, i) {
          return '<tspan x="' + lx.toFixed(1) + '" dy="' + (i === 0 ? '-0.55em' : '1.1em') + '">' + esc(t.trim()) + '</tspan>';
        }).join('')
        : esc(cat.name);
      svg += '<text class="wheel-cat-label ink-' + inkOn(cat.color) + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + deg.toFixed(1) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')">' + label + '</text>';

      cat.children.forEach(function (child) {
        var cSpan = (1 / total) * Math.PI * 2;
        var c0 = outerAngle, c1 = outerAngle + cSpan;
        var cMid = (c0 + c1) / 2;
        svg += '<path class="wheel-seg wheel-child ink-' + inkOn(cat.color) + '" d="' + arc(R_MID, R_OUT, c0, c1) + '" fill="' + cat.color + '" fill-opacity="0.45" tabindex="-1" role="button"'
          + ' aria-label="' + esc(child) + ' — ' + esc(cat.name) + ', ' + esc(wordDoes) + '" data-desc="' + esc(child) + '" data-cat="' + esc(cat.name) + '"/>';
        var tx = C + ((R_MID + R_OUT) / 2 - 2) * Math.cos(cMid);
        var ty = C + ((R_MID + R_OUT) / 2 - 2) * Math.sin(cMid);
        var cDeg = (cMid * 180) / Math.PI;
        if (cDeg > 90 || cDeg < -90) cDeg += 180;
        /* A picked descriptor's wedge goes to 95% opacity, so its ground stops
           being the card and becomes the hue — which took the label with it,
           to 2.94:1 in light and 1.55:1 in dark. The label carries the ink its
           own hue needs, and switches to it exactly when the wedge fills. */
        svg += '<text class="wheel-child-label ink-' + inkOn(cat.color) + '" data-desc="' + esc(child) + '" x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + cDeg.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ')">' + esc(child) + '</text>';
        outerAngle = c1;
      });

      angle = a1;
    });

    svg += '<circle cx="' + C + '" cy="' + C + '" r="' + (R_IN - 2) + '" class="wheel-hub"/>';
    svg += '<text x="' + C + '" y="' + (C - 5) + '" text-anchor="middle" class="wheel-hub-label">flavor</text>';
    svg += '<text x="' + C + '" y="' + (C + 11) + '" text-anchor="middle" class="wheel-hub-label">wheel</text>';
    svg += '</svg>';
    return svg;
  }

  /* Zoom. Whole-wheel is where it opens and where it belongs — a
     first-timer is looking for which words exist at all, and that is a
     question only the whole vocabulary answers. Past that, reading a word
     and landing a thumb on it need scale, so the reader picks it.

     Two states, not three. "Close" was a third rung that answered no
     question the other two left open, and a ladder is the wrong control
     for two states because one end of a stepper is always disabled.

     2.05 is not a round number chosen for tidiness. Descriptors render at
     5.53px with the wheel fit to a phone and the floor is 11px, so
     "readable" has to clear 2.002x or the label on the button is a lie. */
  var ZOOMS = [
    { z: 1, label: 'Whole wheel' },
    { z: 2.05, label: 'Readable' },
  ];

  function wireZoom(holder, toggle, level, haptic) {
    if (!toggle || !level) return;
    var step = 0;

    var apply = function (move, fromWhole) {
      // where was the middle of the view, as a fraction of the whole wheel?
      var fx = holder.scrollWidth ? (holder.scrollLeft + holder.clientWidth / 2) / holder.scrollWidth : 0.5;
      var fy = holder.scrollHeight ? (holder.scrollTop + holder.clientHeight / 2) / holder.scrollHeight : 0.5;
      holder.style.setProperty('--wheel-zoom', ZOOMS[step].z);
      level.textContent = ZOOMS[step].label;
      /* The button names where it goes, not where you are — the label
         beside it already says that, and a control that reads "Readable"
         while you are reading is a state badge, not an action. */
      toggle.textContent = step === 0 ? 'Zoom in to read' : 'Show the whole wheel';
      toggle.setAttribute('aria-pressed', step === 0 ? 'false' : 'true');
      /* The click handler needs to know which view it is in: a ring that
         is readable and a ring that is ten pixels wide are not the same
         control. */
      holder.dataset.zoom = step === 0 ? 'whole' : 'read';
      if (!move) return;
      requestAnimationFrame(function () {
        /* Zooming about the centre is right once you are exploring, but
           the first zoom out of whole-wheel would land on the hub — the
           one part of this drawing with nothing to read. So that step
           goes to the top of the wheel, where the words are. */
        holder.scrollLeft = fx * holder.scrollWidth - holder.clientWidth / 2;
        holder.scrollTop = fromWhole ? 0 : fy * holder.scrollHeight - holder.clientHeight / 2;
      });
    };

    toggle.addEventListener('click', function () {
      var fromWhole = step === 0;
      step = step === 0 ? 1 : 0;
      if (haptic) haptic();
      apply(true, fromWhole);
    });

    /* Zoom in and put one wedge in the middle of the view.

       Reaching for a word in the whole-wheel view is not a tap anyone can
       make: sixty-eight descriptors share one ring, so each is about ten
       screen pixels across where it starts and fifteen where it ends. What
       came of a miss was not nothing — it was the neighbouring word,
       written silently into the tasting notes. So in that view the outer
       ring stops being a control and becomes what it looks like: a map.
       Touch it and it brings you closer instead. */
    holder.zoomToRead = function (seg) {
      if (step !== 0) return false;
      step = 1;
      apply(false, false);
      requestAnimationFrame(function () {
        if (seg && seg.scrollIntoView) seg.scrollIntoView({ block: 'center', inline: 'center' });
      });
      return true;
    };

    apply(false, false);
  }

  /* The wheel as a keyboard widget.

     Sixty-eight descriptors and nine categories, and every one of them was
     once reachable only by pointer. It is one tab stop, not seventy-seven:
     putting every wedge in the tab order would make a keyboard user pass
     all of them to reach the way out, so the wheel behaves the way a grid
     or a menu does. Tab reaches it, arrows move inside it, Enter or Space
     takes the wedge under the cursor. Left and right run along the ring
     you are on; up and down step between the category ring and its own
     descriptors, which is the relationship the drawing is about. */
  function wireKeyboard(holder) {
    var svg = holder.querySelector('svg');
    if (!svg) return;
    var cats = Array.prototype.slice.call(holder.querySelectorAll('.wheel-cat'));
    var kids = Array.prototype.slice.call(holder.querySelectorAll('.wheel-child'));
    if (!cats.length) return;

    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Flavor wheel — arrow keys move between wedges, Enter takes one');

    var setCurrent = function (seg) {
      if (!seg) return;
      cats.concat(kids).forEach(function (x) { x.setAttribute('tabindex', '-1'); });
      seg.setAttribute('tabindex', '0');
    };
    setCurrent(cats[0]);

    var childrenOf = function (cat) {
      return kids.filter(function (k) { return k.dataset.cat === cat.dataset.cat; });
    };
    var ringOf = function (seg) { return seg.classList.contains('wheel-cat') ? cats : kids; };

    var step = function (seg, delta) {
      var ring = ringOf(seg);
      var i = ring.indexOf(seg);
      return ring[(i + delta + ring.length) % ring.length];
    };

    var move = function (seg) {
      if (!seg) return;
      setCurrent(seg);
      seg.focus({ preventScroll: true });
      /* The wheel is a scrolled, zoomed viewport — a wedge the keyboard
         reaches has to be brought into it. */
      if (seg.scrollIntoView) seg.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    holder.onkeydown = function (e) {
      var seg = e.target.closest && e.target.closest('.wheel-seg');
      if (!seg) return;
      var isCat = seg.classList.contains('wheel-cat');
      var next = null;

      if (e.key === 'ArrowRight') next = step(seg, 1);
      else if (e.key === 'ArrowLeft') next = step(seg, -1);
      else if (e.key === 'ArrowDown') next = isCat ? childrenOf(seg)[0] : null;
      else if (e.key === 'ArrowUp') {
        next = isCat ? null : cats.filter(function (c) { return c.dataset.cat === seg.dataset.cat; })[0];
      } else if (e.key === 'Home') next = ringOf(seg)[0];
      else if (e.key === 'End') next = ringOf(seg)[ringOf(seg).length - 1];
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        seg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return;
      } else {
        return;
      }

      if (!next) return;
      e.preventDefault();
      move(next);
    };

    // clicking a wedge makes it the one the keyboard resumes from
    holder.addEventListener('click', function (e) {
      var seg = e.target.closest && e.target.closest('.wheel-seg');
      if (seg) setCurrent(seg);
    }, true);
  }

  /* Draw it once and wire it. The holder keeps its own `built` flag
     because redrawing sixty-eight wedges to show a different pick is
     work nobody asked for, and because the zoom and the keyboard state
     live on the elements it would throw away. */
  function mount(opts) {
    var holder = opts.holder;
    if (holder.dataset.built) return;
    holder.innerHTML = buildSVG(opts);
    holder.dataset.built = '1';
    wireZoom(holder, opts.toggle, opts.level, opts.haptic);
    wireKeyboard(holder);
  }

  /* Show what has been taken. The host answers both questions, because
     what counts as "taken" is the one thing about this wheel that is not
     the same in two places. */
  function paint(holder, isCatOn, isWordOn) {
    holder.querySelectorAll('.wheel-cat').forEach(function (seg) {
      var on = Boolean(isCatOn && isCatOn(seg.dataset.cat));
      seg.classList.toggle('picked', on);
      seg.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    holder.querySelectorAll('.wheel-child').forEach(function (seg) {
      var on = Boolean(isWordOn && isWordOn(seg.dataset.desc));
      seg.classList.toggle('picked', on);
      seg.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    holder.querySelectorAll('.wheel-child-label').forEach(function (t) {
      t.classList.toggle('picked', Boolean(isWordOn && isWordOn(t.dataset.desc)));
    });
  }

  root.LentoWheel = {
    CATEGORIES: CATEGORIES,
    WORDS: WORDS,
    categoryOf: categoryOf,
    inkOn: inkOn,
    noteItems: noteItems,
    buildSVG: buildSVG,
    mount: mount,
    paint: paint,
  };
}(window));
