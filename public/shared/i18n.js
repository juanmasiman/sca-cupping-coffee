/* ============================================================
   lento — language

   English is the source. Every string in the code and the markup is
   written in English, and Spanish is a dictionary keyed by that English.
   A string with no entry stays English, which is the right failure: a
   sentence in the wrong language is readable, a missing one is not.

   HOW A PAGE IS TRANSLATED

   1. Markup. This file loads in <head>, before the body is parsed, and
      watches the document. Every text node and every aria-label,
      placeholder, title and alt that arrives — from the parser, from
      innerHTML, from textContent — is looked up whole (whitespace
      collapsed) and swapped if the dictionary has it. Because a
      MutationObserver runs before the next paint, nothing flashes.

   2. Code. A string with a number or a name in it cannot be looked up
      whole, so the code says so: tr('{n} brews', { n }) and
      trn(n, '{n} brew', '{n} brews'). The dictionary holds the same
      template with the same {placeholders}. A dictionary value may also
      be a function of the vars, for grammar a template cannot carry.

   3. Escape hatch. Anything inside [translate="no"] or [data-i18n-skip]
      is left alone — a coffee called "Bright" stays "Bright". A block of
      markup whose sentence spans inline elements can carry
      data-i18n-html: its whole innerHTML is the key.

   WHAT IS NEVER TRANSLATED

   Stored data. Keys, ids, saved labels and anything written to
   localStorage or the server stay English, so a record made in Spanish
   reads the same on an English phone. Only what is drawn is translated.

   Choosing: a choice made on this device wins; otherwise the phone's
   first language decides (es-* → Spanish). Changing it reloads the page,
   because every screen is drawn from state and redrawing is what a load
   already does.
   ============================================================ */

(function () {
  'use strict';

  var KEY = 'lento-lang';
  var SUPPORTED = ['en', 'es'];

  function detect() {
    try {
      var saved = localStorage.getItem(KEY);
      if (SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) { /* private mode: fall through to the phone */ }
    var langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || 'en'];
    return /^es\b/i.test(String(langs[0] || '')) ? 'es' : 'en';
  }

  var lang = detect();
  var dict = Object.create(null);

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function fill(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
    });
  }

  function lookup(key, vars) {
    if (lang === 'en') return undefined;
    var v = dict[key];
    if (v === undefined) return undefined;
    return typeof v === 'function' ? v(vars || {}) : v;
  }

  /* tr('Save') → 'Guardar'; tr('{n} cups', { n: 5 }) → '5 tazas'. */
  function tr(str, vars) {
    var hit = lookup(str, vars);
    return fill(hit === undefined ? str : hit, vars);
  }

  /* trn(3, '{n} brew', '{n} brews') — the vars get n for free. Spanish
     and English both take the singular at exactly one. */
  function trn(n, one, other, vars) {
    var v = { n: n };
    if (vars) for (var k in vars) v[k] = vars[k];
    return tr(n === 1 ? one : other, v);
  }

  function add(map) {
    for (var k in map) dict[norm(k)] = map[k];
    if (lang !== 'en' && document.body) apply(document.body);
  }

  /* ---------- the document ---------- */

  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt', 'data-label'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };

  function skipped(el) {
    for (; el && el.nodeType === 1; el = el.parentNode) {
      if (SKIP_TAGS[el.tagName]) return true;
      if (el.getAttribute('translate') === 'no' || el.hasAttribute('data-i18n-skip')) return true;
      if (el.isContentEditable) return true;
    }
    return false;
  }

  function doText(node) {
    var raw = node.nodeValue;
    if (!raw || !/\S/.test(raw)) return;
    var key = norm(raw);
    var hit = lookup(key);
    if (hit === undefined || typeof hit !== 'string' || hit === key) return;
    var lead = raw.match(/^\s*/)[0];
    var tail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + hit + tail;
  }

  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var val = el.getAttribute(a);
      var hit = lookup(norm(val));
      if (typeof hit === 'string' && hit !== val) el.setAttribute(a, hit);
    }
    if (el.tagName === 'META' && el.getAttribute('name') === 'description') {
      var d = lookup(norm(el.getAttribute('content') || ''));
      if (typeof d === 'string') el.setAttribute('content', d);
    }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) {
      var b = lookup(norm(el.value));
      if (typeof b === 'string') el.value = b;
    }
    if (el.hasAttribute('data-i18n-html')) {
      var h = lookup(norm(el.innerHTML));
      if (typeof h === 'string') el.innerHTML = h;
    }
  }

  function apply(root) {
    if (lang === 'en' || !root) return;
    if (root.nodeType === 3) {
      if (!skipped(root.parentNode)) doText(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var start = root.nodeType === 9 ? root.documentElement : root;
    if (start.nodeType === 1 && start.tagName === 'TEXTAREA' && !skipped(start.parentNode)) {
      doAttrs(start);
      return;
    }
    if (start.nodeType === 1 && skipped(start)) return;
    if (start.nodeType === 1) doAttrs(start);
    var walker = document.createTreeWalker(start, 5 /* elements + text */, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          /* A textarea's text is the user's, but its placeholder is ours. */
          if (n.tagName === 'TEXTAREA' && !skipped(n.parentNode)) doAttrs(n);
          if (SKIP_TAGS[n.tagName] || n.getAttribute('translate') === 'no' ||
              n.hasAttribute('data-i18n-skip') || n.isContentEditable) return 2; /* reject subtree */
          return 1;
        }
        return 1;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 1) doAttrs(n); else doText(n);
    }
  }

  function watch() {
    if (lang === 'en' || typeof MutationObserver === 'undefined') return;
    var busy = false;
    var mo = new MutationObserver(function (list) {
      if (busy) return;
      busy = true;
      try {
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.type === 'childList') {
            for (var j = 0; j < m.addedNodes.length; j++) apply(m.addedNodes[j]);
          } else if (m.type === 'characterData') {
            apply(m.target);
          } else if (m.type === 'attributes') {
            var host = m.target.tagName === 'TEXTAREA' ? m.target.parentNode : m.target;
            if (!skipped(host)) doAttrs(m.target);
          }
        }
      } finally {
        mo.takeRecords();
        busy = false;
      }
    });
    mo.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    /* The title is a text node in <head>; the observer catches it, but a
       script assigning document.title replaces it in one go. */
    document.addEventListener('DOMContentLoaded', function () { apply(document); });
  }

  /* ---------- choosing ---------- */

  function setLang(next) {
    if (SUPPORTED.indexOf(next) === -1 || next === lang) return;
    try { localStorage.setItem(KEY, next); } catch (e) { /* stays for this load only */ }
    location.reload();
  }

  /* A segmented English | Español control, using the shared .seg look.
     The labels are each language's own name, so they are never
     translated. */
  function toggle() {
    var wrap = document.createElement('div');
    wrap.className = 'seg lang-seg';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', tr('Language'));
    wrap.setAttribute('translate', 'no');
    [['en', 'English'], ['es', 'Español']].forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (pair[0] === lang ? ' on' : '');
      b.lang = pair[0];
      b.textContent = pair[1];
      b.setAttribute('aria-pressed', pair[0] === lang ? 'true' : 'false');
      b.addEventListener('click', function () { setLang(pair[0]); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  if (lang !== 'en') document.documentElement.lang = lang;

  window.LentoI18n = {
    lang: lang,
    /* For toLocaleDateString and friends. undefined keeps the browser's
       own choice in English, which is what the apps did before. */
    locale: lang === 'es' ? 'es' : undefined,
    tr: tr,
    trn: trn,
    add: add,
    apply: apply,
    setLang: setLang,
    toggle: toggle,
    has: function (key) { return dict[norm(key)] !== undefined; }
  };
  window.tr = tr;
  window.trn = trn;

  watch();
})();
