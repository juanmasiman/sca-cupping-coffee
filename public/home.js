/* ============================================================
   lento — the front door

   One account across the four surfaces, and this is the one that had no
   way to reach it. Somebody who signs in inside the cupping sheet is
   signed in everywhere, but the page they actually land on could not say
   so, could not sign them in, and could not sign them out.

   WHAT THIS PAGE IS NOT

   It is not a tool. It holds no records, so it has nothing to sync and it
   does not offer to — see `sync` being absent below. What it can say, and
   what nothing else can, is what is on this device across all three
   tools, because localStorage is one origin and the front door is the
   only place that sees all of it at once.

   Those stores belong to the apps that write them. They are read
   defensively and anything unreadable is simply left out of the sentence,
   rather than this page having an opinion about a shape it does not own.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- the minimum a sheet needs ----------

     The three apps each have a modal layer with their own rules — the
     dial-in stacks sheets and marks the board inert, the cupping sheet
     runs full-screen panels. This page has one sheet at a time and no
     board behind it, so it has the small version: show, trap, restore
     focus. The look comes from components.css, same as everywhere. */

  var lastFocus = null;

  function openModal(sel) {
    var m = $(sel);
    lastFocus = document.activeElement;
    m.classList.remove('hidden');
    document.documentElement.classList.add('sheet-open');
    if (!m.dataset.trapped) {
      m.dataset.trapped = '1';
      m.addEventListener('keydown', function (e) { trap(m, e); });
      m.addEventListener('click', function (e) { if (e.target === m) closeModal(sel); });
    }
    var first = m.querySelector('input, button, [tabindex]');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 30);
  }

  function closeModal(sel) {
    $(sel).classList.add('hidden');
    if (!document.querySelector('.modal:not(.hidden)')) {
      document.documentElement.classList.remove('sheet-open');
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function trap(m, e) {
    if (e.key === 'Escape') { closeModal('#' + m.id); return; }
    if (e.key !== 'Tab') return;
    var items = Array.prototype.filter.call(
      m.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // The same component the apps use, shown the same way: `.toast` is
  // always in the page and `hidden` is what moves. It has no undo here —
  // nothing on this page destroys anything.
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 4000);
  }

  /* ---------- what is on this device ---------- */

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function countIn(key, field) {
    var s = readJSON(key);
    if (!s || !Array.isArray(s.coffees)) return null;
    return s.coffees.reduce(function (n, c) {
      return n + (Array.isArray(c[field]) ? c[field].length : 0);
    }, 0);
  }

  function cuppings() {
    var a = readJSON('sca-cupping-history-v1');
    return Array.isArray(a) ? a.length : null;
  }

  function say(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  // Only what is actually there. A front door that says "0 shots" to
  // somebody who has never opened the dial-in is telling them about a
  // thing they have not used.
  function counts() {
    var bits = [];
    var c = cuppings();
    var s = countIn('lento-espresso-v1', 'shots');
    var b = countIn('lento-filter-v1', 'brews');
    if (c) bits.push(say(c, 'cupping', 'cuppings'));
    if (s) bits.push(say(s, 'shot', 'shots'));
    if (b) bits.push(say(b, 'brew', 'brews'));
    return bits;
  }

  // The sentence in the sheet, where there is room for one.
  function deviceLine() {
    var bits = counts();
    if (!bits.length) return 'Your history follows you to any device you sign in on.';
    return bits.join(' · ') + ' on this device.';
  }

  /* ---------- the account row ---------- */

  // The sub-line on the row, where there is not. Signed out it says what
  // signing in is for; signed in the address is already on the line above,
  // so this says what that account is currently holding on this device.
  function rowNote(u) {
    if (!u) return 'Your log on every device';
    var bits = counts();
    return bits.length ? bits.join(' · ') : 'Nothing logged on this device yet';
  }

  function renderAccount() {
    var btn = $('#btn-account');
    if (!window.LentoAccount || !LentoAccount.enabled()) {
      btn.classList.add('hidden');
      return;
    }
    btn.classList.remove('hidden');
    var u = LentoAccount.user();
    // The row reads as what it does, so it needs no aria-label over the
    // top of its own visible text — and a label that disagreed with that
    // text would be the accessible name for a control saying something
    // else, which is the failure the label was meant to prevent.
    $('#account-name').textContent = u ? (u.email || u.name || 'Your account') : 'Sign in';
    $('#account-note').textContent = rowNote(u);
  }

  function boot() {
    if (!window.LentoAccountSheet || !window.LentoAccount) return;

    LentoAccountSheet.install({
      open: openModal,
      close: closeModal,
      toast: toast,
      refresh: renderAccount,
      // No `sync`: this page holds no records, and a Sync now that syncs
      // nothing is worse than no button at all.
      status: function () { return deviceLine(); },
      // Not "your log": the front door is not a log. What follows you is
      // whatever the three tools have recorded.
      signedOutNote: 'Your cuppings, shots and brews then follow you to any device — and every tool still works with no signal.',
      signOutNote: 'Signing out leaves everything on this device.',
      signedInToast: 'Signed in — your tools will follow you',
    });

    $('#btn-account').addEventListener('click', function () { LentoAccountSheet.open(); });
    LentoAccount.onChange(renderAccount);
    renderAccount();

    /* An OAuth return lands here as a fragment when sign-in started here.
       `https://lento.cafe/` has to be in the project's Redirect URLs for
       that to come back to this page rather than the site URL — see
       DEPLOY.md. */
    LentoAccount.adoptRedirect()
      .then(function (signedIn) {
        if (signedIn) toast('Signed in — your tools will follow you');
      })
      .catch(function () {});
  }

  /* The front door works offline too, now that it is a door somebody comes
     back to from an instrument that does. See sw.js for why this worker
     does not take the apps over. */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
