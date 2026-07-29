/* ============================================================
   SCA Cupping — app logic
   Vanilla JS. State lives in one object, persisted to localStorage.
   ============================================================ */

'use strict';

/* ---------- constants ---------- */

const STORAGE_KEY = 'sca-cupping-session-v1';

// Scale attributes: scored 6.00–10.00 in 0.25 steps
const SCALE_ATTRS = [
  { key: 'fragrance', label: 'Fragrance / Aroma', sub: 'dry grounds & wet crust' },
  { key: 'flavor', label: 'Flavor', sub: 'principal taste & aroma character' },
  { key: 'aftertaste', label: 'Aftertaste', sub: 'length of positive flavor' },
  { key: 'acidity', label: 'Acidity', sub: 'brightness & liveliness' },
  { key: 'body', label: 'Body', sub: 'tactile feeling, weight' },
  { key: 'balance', label: 'Balance', sub: 'harmony of the whole' },
  { key: 'overall', label: 'Overall', sub: 'cupper’s holistic rating' },
];

// Per-cup attributes: each checked cup contributes 10/nCups points
const CUP_ATTRS = [
  { key: 'uniformity', label: 'Uniformity', sub: 'consistency across cups' },
  { key: 'cleanCup', label: 'Clean Cup', sub: 'free of negative impressions' },
  { key: 'sweetness', label: 'Sweetness', sub: 'pleasing fullness of flavor' },
];

const RADAR_ATTRS = [...SCALE_ATTRS, ...CUP_ATTRS];

const RADAR_COLORS = ['#e8b06b', '#8fc98a', '#7fb3d5', '#e07a5f', '#c39bd3', '#f4d35e', '#76d7c4', '#f1948a'];

const LIMITS = { coffees: [1, 8], cups: [1, 5] };

/* ---------- state ---------- */

let state = null; // { coffees: [...], cupsPerCoffee, activeIndex }

function newCoffee(nCups) {
  const scores = {};
  SCALE_ATTRS.forEach(a => { scores[a.key] = 7.5; });
  return {
    name: '',
    scores,
    cups: Object.fromEntries(CUP_ATTRS.map(a => [a.key, Array(nCups).fill(true)])),
    taintCups: 0,
    faultCups: 0,
    notes: '',
  };
}

function newSession(nCoffees, nCups) {
  state = { cupsPerCoffee: nCups, activeIndex: 0, coffees: [] };
  for (let i = 0; i < nCoffees; i++) state.coffees.push(newCoffee(nCups));
  save();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.coffees) || !s.coffees.length) return null;
    return s;
  } catch (e) { return null; }
}

function clearSession() {
  state = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

/* ---------- scoring ---------- */

function coffeeScore(c) {
  let total = 0;
  SCALE_ATTRS.forEach(a => { total += c.scores[a.key]; });
  CUP_ATTRS.forEach(a => {
    const cups = c.cups[a.key];
    total += 10 * cups.filter(Boolean).length / cups.length;
  });
  total -= defectPenalty(c);
  return Math.max(0, total);
}

function defectPenalty(c) {
  return c.taintCups * 2 + c.faultCups * 4;
}

function gradeFor(score) {
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Excellent';
  if (score >= 80) return 'Very Good · Specialty';
  if (score >= 70) return 'Good · Below specialty';
  return 'Below cupping quality';
}

function coffeeName(c, i) {
  return c.name.trim() || `Coffee ${i + 1}`;
}

function fmt(n) {
  return n.toFixed(2);
}

/* ---------- tiny helpers ---------- */

const $ = sel => document.querySelector(sel);

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

function haptic() {
  if (navigator.vibrate) navigator.vibrate(4);
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  $('#scorebar').classList.toggle('visible', id === '#screen-cupping');
}

/* ============================================================
   SETUP SCREEN
   ============================================================ */

const setup = { coffees: 3, cups: 5 };

function initStepper(rootId, valueId, key, limitKey) {
  const root = $(rootId);
  const valueEl = $(valueId);
  const [min, max] = LIMITS[limitKey];

  const render = () => {
    valueEl.textContent = setup[key];
    root.querySelector('[data-action="dec"]').disabled = setup[key] <= min;
    root.querySelector('[data-action="inc"]').disabled = setup[key] >= max;
  };

  root.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn || btn.disabled) return;
    setup[key] += btn.dataset.action === 'inc' ? 1 : -1;
    setup[key] = Math.min(max, Math.max(min, setup[key]));
    valueEl.classList.remove('bump');
    void valueEl.offsetWidth; // restart animation
    valueEl.classList.add('bump');
    haptic();
    render();
    renderCupsPreview();
  });

  render();
}

function renderCupsPreview() {
  const wrap = $('#cups-preview');
  wrap.innerHTML = '';
  for (let i = 0; i < setup.coffees; i++) {
    const row = el('div', 'preview-row');
    row.appendChild(el('span', 'preview-coffee-dot'));
    const cups = el('div', 'preview-cups');
    for (let j = 0; j < setup.cups; j++) {
      const cup = el('span', 'preview-cup');
      cup.style.animationDelay = `${i * 0.05 + j * 0.04}s`;
      cups.appendChild(cup);
    }
    row.appendChild(cups);
    wrap.appendChild(row);
  }
}

/* ============================================================
   CUPPING SCREEN
   ============================================================ */

const cupIconSVG = `
  <svg viewBox="0 0 24 24" fill="none">
    <path class="cup-outline" d="M5 8h11v2.2c2.4 0 3.6 1.2 3.6 2.7s-1.2 2.7-3.6 2.7h-.4c-.8 2.2-2.7 3.4-5.1 3.4s-4.3-1.2-5.1-3.4V8z"
      stroke-width="1.7" stroke-linejoin="round"/>
    <path class="cup-outline" d="M16 11.4c1.4 0 2 .7 2 1.5s-.6 1.5-2 1.5" stroke-width="1.7"/>
  </svg>`;

function buildCuppingUI() {
  buildTabs();
  buildPanels();
  syncActivePanel(false);
  updateScorebar();
}

function buildTabs() {
  const tabs = $('#coffee-tabs');
  tabs.innerHTML = '';
  state.coffees.forEach((c, i) => {
    const tab = el('button', 'coffee-tab');
    tab.innerHTML = `<span class="tab-name">${escapeHTML(coffeeName(c, i))}</span><span class="tab-score">${fmt(coffeeScore(c))}</span>`;
    tab.addEventListener('click', () => {
      state.activeIndex = i;
      scrollToPanel(i, true);
      syncActivePanel(true);
      save();
    });
    tabs.appendChild(tab);
  });
}

function refreshTabs() {
  const tabs = $('#coffee-tabs').children;
  state.coffees.forEach((c, i) => {
    const tab = tabs[i];
    if (!tab) return;
    tab.querySelector('.tab-name').textContent = coffeeName(c, i);
    tab.querySelector('.tab-score').textContent = fmt(coffeeScore(c));
    tab.classList.toggle('active', i === state.activeIndex);
  });
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function buildPanels() {
  const panels = $('#panels');
  panels.innerHTML = '';
  state.coffees.forEach((c, i) => panels.appendChild(buildPanel(c, i)));

  // sync active tab with horizontal swipe position
  let scrollTimer = null;
  panels.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const idx = Math.round(panels.scrollLeft / panels.clientWidth);
      if (idx !== state.activeIndex && idx >= 0 && idx < state.coffees.length) {
        state.activeIndex = idx;
        syncActivePanel(true);
        save();
      }
    }, 80);
  }, { passive: true });
}

function scrollToPanel(i, smooth) {
  const panels = $('#panels');
  panels.scrollTo({ left: i * panels.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}

function syncActivePanel(animated) {
  refreshTabs();
  const tabs = $('#coffee-tabs');
  const active = tabs.children[state.activeIndex];
  if (active) active.scrollIntoView({ behavior: animated ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  updateScorebar();
}

function buildPanel(coffee, index) {
  const panel = el('div', 'panel');

  // name
  const name = document.createElement('input');
  name.className = 'name-field';
  name.type = 'text';
  name.placeholder = `Coffee ${index + 1} — name or lot…`;
  name.value = coffee.name;
  name.maxLength = 40;
  name.addEventListener('input', () => {
    coffee.name = name.value;
    refreshTabs();
    updateScorebar();
    save();
  });
  panel.appendChild(name);

  // scale attributes
  SCALE_ATTRS.forEach(attr => panel.appendChild(buildScaleCard(coffee, attr)));

  // per-cup attributes
  CUP_ATTRS.forEach(attr => panel.appendChild(buildCupCard(coffee, attr)));

  // defects
  panel.appendChild(buildDefectsCard(coffee));

  // notes
  const notes = document.createElement('textarea');
  notes.className = 'notes-field';
  notes.placeholder = 'Tasting notes — jasmine, stone fruit, cocoa…';
  notes.value = coffee.notes;
  notes.addEventListener('input', () => { coffee.notes = notes.value; save(); });
  panel.appendChild(notes);

  return panel;
}

/* ---------- scale attribute card with custom slider ---------- */

function buildScaleCard(coffee, attr) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">${attr.label}</div>
        <div class="attr-sub">${attr.sub}</div>
      </div>
      <div class="attr-value">${fmt(coffee.scores[attr.key])}</div>
    </div>
    <div class="slider">
      <div class="slider-track"><div class="slider-fill"></div></div>
      <div class="slider-ticks"></div>
      <div class="slider-thumb"></div>
    </div>
    <div class="slider-labels"><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>
  `;

  const valueEl = card.querySelector('.attr-value');
  const slider = card.querySelector('.slider');
  const fill = card.querySelector('.slider-fill');
  const thumb = card.querySelector('.slider-thumb');
  const ticks = card.querySelector('.slider-ticks');

  // whole-point tick marks
  for (let v = 6; v <= 10; v++) {
    const tick = el('span', 'slider-tick');
    tick.style.left = `${((v - 6) / 4) * 100}%`;
    ticks.appendChild(tick);
  }

  const MIN = 6, MAX = 10, STEP = 0.25;

  const position = () => {
    const pct = ((coffee.scores[attr.key] - MIN) / (MAX - MIN)) * 100;
    fill.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
  };

  const setValue = (v, popIt) => {
    v = Math.round(v / STEP) * STEP;
    v = Math.min(MAX, Math.max(MIN, v));
    if (v === coffee.scores[attr.key]) return;
    coffee.scores[attr.key] = v;
    valueEl.textContent = fmt(v);
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
      haptic();
    }
    position();
    refreshTabs();
    updateScorebar();
    save();
  };

  const valueFromEvent = e => {
    const rect = slider.getBoundingClientRect();
    const x = Math.min(rect.right, Math.max(rect.left, e.clientX));
    return MIN + ((x - rect.left) / rect.width) * (MAX - MIN);
  };

  slider.addEventListener('pointerdown', e => {
    slider.setPointerCapture(e.pointerId);
    slider.classList.add('dragging');
    setValue(valueFromEvent(e), true);
  });
  slider.addEventListener('pointermove', e => {
    if (!slider.classList.contains('dragging')) return;
    setValue(valueFromEvent(e), true);
  });
  const endDrag = () => slider.classList.remove('dragging');
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('pointercancel', endDrag);

  position();
  return card;
}

/* ---------- per-cup attribute card ---------- */

function buildCupCard(coffee, attr) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">${attr.label}</div>
        <div class="attr-sub">${attr.sub} · tap a cup to fail it</div>
      </div>
      <div class="attr-value"></div>
    </div>
    <div class="cups-row"></div>
  `;

  const valueEl = card.querySelector('.attr-value');
  const row = card.querySelector('.cups-row');
  const cups = coffee.cups[attr.key];

  const attrScore = () => 10 * cups.filter(Boolean).length / cups.length;

  const refresh = popIt => {
    valueEl.textContent = fmt(attrScore());
    if (popIt) {
      valueEl.classList.remove('pop');
      void valueEl.offsetWidth;
      valueEl.classList.add('pop');
    }
    [...row.children].forEach((btn, i) => btn.classList.toggle('checked', cups[i]));
  };

  cups.forEach((_, i) => {
    const btn = el('button', 'cup-check');
    btn.innerHTML = `${cupIconSVG}<span class="cup-num">${i + 1}</span>`;
    btn.addEventListener('click', () => {
      cups[i] = !cups[i];
      haptic();
      refresh(true);
      refreshTabs();
      updateScorebar();
      save();
    });
    row.appendChild(btn);
  });

  refresh(false);
  return card;
}

/* ---------- defects card ---------- */

function buildDefectsCard(coffee) {
  const card = el('div', 'attr-card');
  card.innerHTML = `
    <div class="attr-head">
      <div>
        <div class="attr-title">Defects</div>
        <div class="attr-sub">cups affected, subtracted from total</div>
      </div>
    </div>
    <div class="defect-rows">
      <div class="defect-row" data-kind="taintCups">
        <div class="defect-info">
          <span class="defect-name">Taint</span>
          <span class="defect-pts">off-flavor in aroma · −2 pts / cup</span>
        </div>
        <div class="stepper">
          <button class="stepper-btn" data-action="dec">−</button>
          <span class="stepper-value">0</span>
          <button class="stepper-btn" data-action="inc">+</button>
        </div>
      </div>
      <div class="defect-row" data-kind="faultCups">
        <div class="defect-info">
          <span class="defect-name">Fault</span>
          <span class="defect-pts">off-flavor in taste · −4 pts / cup</span>
        </div>
        <div class="stepper">
          <button class="stepper-btn" data-action="dec">−</button>
          <span class="stepper-value">0</span>
          <button class="stepper-btn" data-action="inc">+</button>
        </div>
      </div>
    </div>
    <div class="defect-penalty"></div>
  `;

  const penaltyEl = card.querySelector('.defect-penalty');

  const refresh = () => {
    card.querySelectorAll('.defect-row').forEach(rowEl => {
      const kind = rowEl.dataset.kind;
      rowEl.querySelector('.stepper-value').textContent = coffee[kind];
      rowEl.querySelector('[data-action="dec"]').disabled = coffee[kind] <= 0;
      rowEl.querySelector('[data-action="inc"]').disabled = coffee[kind] >= state.cupsPerCoffee;
    });
    const p = defectPenalty(coffee);
    penaltyEl.textContent = p > 0 ? `−${fmt(p)} points` : '';
  };

  card.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn || btn.disabled) return;
    const rowEl = btn.closest('.defect-row');
    const kind = rowEl.dataset.kind;
    coffee[kind] += btn.dataset.action === 'inc' ? 1 : -1;
    coffee[kind] = Math.min(state.cupsPerCoffee, Math.max(0, coffee[kind]));
    haptic();
    refresh();
    refreshTabs();
    updateScorebar();
    save();
  });

  refresh();
  return card;
}

/* ---------- score bar ---------- */

function updateScorebar() {
  if (!state) return;
  const c = state.coffees[state.activeIndex];
  if (!c) return;
  const score = coffeeScore(c);
  $('#scorebar-name').textContent = coffeeName(c, state.activeIndex);
  $('#scorebar-grade').textContent = gradeFor(score);
  const valueEl = $('#scorebar-value');
  if (valueEl.textContent !== fmt(score)) {
    valueEl.textContent = fmt(score);
    const box = valueEl.parentElement;
    box.classList.remove('pulse');
    void box.offsetWidth;
    box.classList.add('pulse');
  }
}

/* ============================================================
   RESULTS SCREEN
   ============================================================ */

function buildResults() {
  const ranked = state.coffees
    .map((c, i) => ({ coffee: c, index: i, score: coffeeScore(c) }))
    .sort((a, b) => b.score - a.score);

  // podium
  const winner = ranked[0];
  const podium = $('#podium');
  podium.innerHTML = `
    <div class="podium-crown">🏆</div>
    <div class="podium-name">${escapeHTML(coffeeName(winner.coffee, winner.index))}</div>
    <div class="podium-score">${fmt(winner.score)}</div>
    <div class="podium-grade">${gradeFor(winner.score)}</div>
  `;

  buildRadar(ranked);

  // ranking cards
  const ranking = $('#ranking');
  ranking.innerHTML = '';
  ranked.forEach((r, pos) => {
    const card = el('div', 'rank-card');
    card.style.animationDelay = `${pos * 0.07}s`;
    const medalCls = pos < 3 ? ` m${pos + 1}` : '';
    card.innerHTML = `
      <div class="rank-top">
        <div class="rank-medal${medalCls}">${pos + 1}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHTML(coffeeName(r.coffee, r.index))}</div>
          <div class="rank-grade">${gradeFor(r.score)}</div>
        </div>
        <div class="rank-score">${fmt(r.score)}</div>
      </div>
      <div class="rank-bar"><div class="rank-bar-fill"></div></div>
      ${r.coffee.notes.trim() ? `<div class="rank-notes">${escapeHTML(r.coffee.notes.trim())}</div>` : ''}
    `;
    ranking.appendChild(card);
    requestAnimationFrame(() => {
      card.querySelector('.rank-bar-fill').style.width = `${r.score}%`;
    });
  });
}

/* ---------- radar chart (SVG) ---------- */

function attrValue(coffee, attr) {
  if (attr.key in coffee.scores) return coffee.scores[attr.key];
  const cups = coffee.cups[attr.key];
  return 10 * cups.filter(Boolean).length / cups.length;
}

function buildRadar(ranked) {
  const SIZE = 320, CX = SIZE / 2, CY = SIZE / 2, R = 108;
  const N = RADAR_ATTRS.length;
  const MIN = 5, MAX = 10; // radar floor at 5 so differences are visible

  const angle = i => (Math.PI * 2 * i) / N - Math.PI / 2;
  const point = (i, r) => [CX + Math.cos(angle(i)) * r, CY + Math.sin(angle(i)) * r];

  let svg = `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">`;

  // grid rings
  for (let ring = 1; ring <= 5; ring++) {
    const r = (R * ring) / 5;
    const pts = RADAR_ATTRS.map((_, i) => point(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
    svg += `<polygon class="radar-grid" points="${pts}" stroke-width="${ring === 5 ? 1.2 : 0.6}"/>`;
  }

  // spokes + labels
  RADAR_ATTRS.forEach((attr, i) => {
    const [x, y] = point(i, R);
    svg += `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-grid" stroke-width="0.6"/>`;
    const [lx, ly] = point(i, R + 18);
    const short = attr.label.split(' / ')[0].split(' ')[0];
    svg += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" class="radar-axis-label">${short}</text>`;
  });

  // one polygon per coffee (ranked order so winner draws last, on top)
  [...ranked].reverse().forEach(r => {
    const color = RADAR_COLORS[r.index % RADAR_COLORS.length];
    const pts = RADAR_ATTRS.map((attr, i) => {
      const v = Math.max(MIN, attrValue(r.coffee, attr));
      const rr = (R * (v - MIN)) / (MAX - MIN);
      return point(i, rr).map(n => n.toFixed(1)).join(',');
    }).join(' ');
    svg += `<polygon points="${pts}" fill="${color}" fill-opacity="0.13" stroke="${color}" stroke-width="2" stroke-linejoin="round" data-coffee="${r.index}"/>`;
  });

  svg += '</svg>';
  $('#radar-wrap').innerHTML = svg;

  // legend with tap-to-highlight
  const legend = $('#radar-legend');
  legend.innerHTML = '';
  ranked.forEach(r => {
    const color = RADAR_COLORS[r.index % RADAR_COLORS.length];
    const item = el('button', 'legend-item');
    item.innerHTML = `<span class="legend-dot" style="background:${color}"></span>${escapeHTML(coffeeName(r.coffee, r.index))}`;
    item.addEventListener('click', () => {
      const muting = !item.classList.contains('solo');
      legend.querySelectorAll('.legend-item').forEach(li => li.classList.remove('solo', 'muted'));
      $('#radar-wrap').querySelectorAll('polygon[data-coffee]').forEach(p => (p.style.opacity = ''));
      if (muting) {
        item.classList.add('solo');
        legend.querySelectorAll('.legend-item').forEach(li => { if (li !== item) li.classList.add('muted'); });
        $('#radar-wrap').querySelectorAll('polygon[data-coffee]').forEach(p => {
          p.style.opacity = p.dataset.coffee === String(r.index) ? '1' : '0.08';
        });
      }
    });
    legend.appendChild(item);
  });
}

/* ---------- share ---------- */

function buildShareText() {
  const ranked = state.coffees
    .map((c, i) => ({ coffee: c, index: i, score: coffeeScore(c) }))
    .sort((a, b) => b.score - a.score);

  const lines = ['☕️ SCA Cupping Results', ''];
  ranked.forEach((r, pos) => {
    lines.push(`${pos + 1}. ${coffeeName(r.coffee, r.index)} — ${fmt(r.score)} (${gradeFor(r.score)})`);
    if (r.coffee.notes.trim()) lines.push(`   ${r.coffee.notes.trim()}`);
  });
  return lines.join('\n');
}

async function shareResults() {
  const text = buildShareText();
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Results copied to clipboard');
  } catch (e) {
    toast('Could not share results');
  }
}

/* ============================================================
   WIRING
   ============================================================ */

function startCupping() {
  buildCuppingUI();
  showScreen('#screen-cupping');
  requestAnimationFrame(() => scrollToPanel(state.activeIndex, false));
}

document.addEventListener('DOMContentLoaded', () => {
  initStepper('#stepper-coffees', '#value-coffees', 'coffees', 'coffees');
  initStepper('#stepper-cups', '#value-cups', 'cups', 'cups');
  renderCupsPreview();

  // resume?
  const saved = load();
  if (saved) {
    state = saved;
    const btn = $('#btn-resume');
    btn.classList.remove('hidden');
    btn.textContent = `Resume session · ${saved.coffees.length} coffee${saved.coffees.length > 1 ? 's' : ''}`;
    btn.addEventListener('click', () => startCupping());
  }

  $('#btn-start').addEventListener('click', () => {
    newSession(setup.coffees, setup.cups);
    startCupping();
  });

  $('#btn-back-setup').addEventListener('click', () => showScreen('#screen-setup'));

  $('#btn-finish').addEventListener('click', () => {
    buildResults();
    showScreen('#screen-results');
  });

  $('#btn-back-cupping').addEventListener('click', () => {
    showScreen('#screen-cupping');
    requestAnimationFrame(() => scrollToPanel(state.activeIndex, false));
  });

  $('#btn-share').addEventListener('click', shareResults);

  $('#btn-new-session').addEventListener('click', () => {
    if (!confirm('Discard this session and start a new one?')) return;
    clearSession();
    $('#btn-resume').classList.add('hidden');
    showScreen('#screen-setup');
  });

  // keep swipe panel aligned on rotation / resize
  window.addEventListener('resize', () => {
    if ($('#screen-cupping').classList.contains('active')) scrollToPanel(state.activeIndex, false);
  });
});
