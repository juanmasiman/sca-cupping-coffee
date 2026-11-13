/* ============================================================
   lento — the extraction chart (TDS against extraction yield)

   The brewing control chart, the one picture a refractometer exists to
   draw: strength up the side, extraction along the bottom, the box where
   the coffee is meant to land, and every shot or brew as a point. Both
   brew tools used to compute extraction and print it as one number per
   card, which answers "how much" and never "compared with what". With a
   refractometer the comparison is the whole point, so this draws it.

   It draws nothing at all without a reading: the board shows it only to
   somebody who owns a refractometer and has a shot with a TDS on it.

   Colour: the points are the data ink, the newest strongest; the target
   box is the data ink's soft tint; axes and gridlines are the rail.
   Numbers on the axes are mono. Built from tokens.css variables only.

   LentoEyChart.render(opts) -> HTML string
     points  [{ ey, tds, n, recipe, latest }]   ey and tds in %
     box     { eyLo, eyHi, tdsLo, tdsHi }        the target
     ratio   optional: draw the line of this brew ratio (espresso)
     x       [lo, hi] extraction axis, y [lo, hi] TDS axis
     yStep   TDS gridline step
     label   what one point is ("shot", "brew")
   ============================================================ */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  function render(o) {
    var yd = o.yStep < 1 ? 2 : 0;
    var W = 340, H = 240, L = yd ? 52 : 40, R = 12, T = 12, B = 34;
    var pw = W - L - R, ph = H - T - B;
    var x0 = o.x[0], x1 = o.x[1], y0 = o.y[0], y1 = o.y[1];
    var X = function (v) { return L + (Math.max(x0, Math.min(x1, v)) - x0) / (x1 - x0) * pw; };
    var Y = function (v) { return T + ph - (Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0) * ph; };
    var s = '';

    // gridlines and axis numbers
    for (var ex = Math.ceil(x0); ex <= x1; ex += 2) {
      s += '<line x1="' + X(ex) + '" y1="' + T + '" x2="' + X(ex) + '" y2="' + (T + ph) + '" class="eyc-grid"/>'
        + '<text x="' + X(ex) + '" y="' + (T + ph + 15) + '" class="eyc-num" text-anchor="middle">' + ex + '</text>';
    }
    for (var ty = y0; ty <= y1 + 1e-9; ty += o.yStep) {
      s += '<line x1="' + L + '" y1="' + Y(ty) + '" x2="' + (L + pw) + '" y2="' + Y(ty) + '" class="eyc-grid"/>'
        + '<text x="' + (L - 6) + '" y="' + (Y(ty) + 4) + '" class="eyc-num" text-anchor="end">' + fmt(ty, yd) + '</text>';
    }
    // the target
    var b = o.box;
    s += '<rect x="' + X(b.eyLo) + '" y="' + Y(b.tdsHi) + '" width="' + (X(b.eyHi) - X(b.eyLo)) + '" height="' + (Y(b.tdsLo) - Y(b.tdsHi)) + '" class="eyc-box"/>';
    // the brew ratio as a line: TDS = EY / ratio
    if (o.ratio) {
      var a = Math.max(x0, y0 * o.ratio), z = Math.min(x1, y1 * o.ratio);
      if (z > a) s += '<line x1="' + X(a) + '" y1="' + Y(a / o.ratio) + '" x2="' + X(z) + '" y2="' + Y(z / o.ratio) + '" class="eyc-ratio"/>';
    }
    // axis titles
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 4) + '" class="eyc-axis" text-anchor="middle">Extraction %</text>'
      + '<text x="11" y="' + (T + ph / 2) + '" class="eyc-axis" text-anchor="middle" transform="rotate(-90 11 ' + (T + ph / 2) + ')">TDS %</text>';
    // points, oldest first so the newest sits on top
    var pts = (o.points || []).slice();
    pts.forEach(function (p, i) {
      var cx = X(p.ey), cy = Y(p.tds);
      var age = pts.length > 1 ? i / (pts.length - 1) : 1;
      var op = (0.35 + 0.65 * age).toFixed(2);
      if (p.recipe) s += '<circle cx="' + cx + '" cy="' + cy + '" r="9" class="eyc-recipe"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="5" class="eyc-pt" style="opacity:' + op + '"/>';
    });
    // Numbers newest first, and only where there is room: shots that land
    // together would otherwise print a stack of digits on one spot.
    // Each number tries four spots around its dot and takes the first that
    // is clear of other numbers, other dots and the recipe's ring.
    var placed = [];
    var dots = pts.map(function (p) { return [X(p.ey), Y(p.tds), p.recipe ? 11 : 7]; });
    var clear = function (lx, ly, self) {
      // the label's box, roughly: 14 wide, 11 tall, left/baseline anchored
      var bx = lx, by = ly - 10, bw = 14, bh = 12;
      if (bx < L || bx + bw > L + pw || by < T || by + bh > T + ph) return false;
      if (placed.some(function (q) { return Math.abs(q[0] - lx) < 14 && Math.abs(q[1] - ly) < 12; })) return false;
      return !dots.some(function (d, j) {
        if (j === self) return false;
        var nx = Math.max(bx, Math.min(d[0], bx + bw)), ny = Math.max(by, Math.min(d[1], by + bh));
        return Math.hypot(nx - d[0], ny - d[1]) < d[2];
      });
    };
    pts.map(function (p, j) { return [p, j]; }).reverse().forEach(function (pj) {
      var p = pj[0], j = pj[1], cx = X(p.ey), cy = Y(p.tds), r = p.recipe ? 12 : 8;
      var spots = [[cx + r, cy - r + 4], [cx - r - 8, cy - r + 4], [cx + r, cy + r + 8], [cx - r - 8, cy + r + 8]];
      for (var k = 0; k < spots.length; k++) {
        if (clear(spots[k][0], spots[k][1], j)) {
          placed.push(spots[k]);
          s += '<text x="' + spots[k][0] + '" y="' + spots[k][1] + '" class="eyc-label">' + esc(p.n) + '</text>';
          return;
        }
      }
    });

    var desc = (o.points || []).map(function (p) {
      return o.label + ' ' + p.n + ': ' + fmt(p.ey, 1) + '% extraction, ' + fmt(p.tds, 2) + '% TDS';
    }).join('; ');
    return '<svg class="eyc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Extraction chart. Target '
      + fmt(b.eyLo, 1) + '–' + fmt(b.eyHi, 1) + '% extraction, ' + fmt(b.tdsLo, yd) + '–' + fmt(b.tdsHi, yd) + '% TDS. '
      + esc(desc) + '">' + s + '</svg>';
  }

  /* Where a point sits against the box, in words the board can print. */
  function verdict(ey, tds, box) {
    var e = ey < box.eyLo ? 'under' : ey > box.eyHi ? 'over' : 'in';
    var t = tds < box.tdsLo ? 'weak' : tds > box.tdsHi ? 'strong' : 'in';
    return { extraction: e, strength: t };
  }

  root.LentoEyChart = { render: render, verdict: verdict };
}(window));
