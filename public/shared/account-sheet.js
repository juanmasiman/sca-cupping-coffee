/* ============================================================
   lento — the profile sheet, once, for every page

   ONE SIGN-IN

   There used to be two: the cupping sheet's own (a "Keep your history
   everywhere" sheet and a six-box keypad) and this one, shared by the
   dial-in, the brew log and the front door. Same account, same session
   in storage, and two sets of screens that said different things about
   the same failures — a wrong code was "keep typing" on one and "send a
   new one" on the other, and neither could tell a wrong code from no
   signal. A person has one account here; they should meet one door.

   So this sheet is the only sign-in, and it is the profile page too:
   signed out it signs you in, signed in it says who you are, what is
   backed up, and lets you sync or sign out. Every page opens it from a
   person button in its header (the front door from its account row).

   IT CARRIES ITS OWN LOOK AND ITS OWN MODAL

   The four pages do not share a stylesheet below tokens.css — the
   cupping sheet has its own — and they each manage modals their own way.
   A sheet that borrowed either would look different on each page, which
   is the problem this file exists to end. It injects its own styles
   (built only from tokens.css variables, prefixed .lp-) and runs its own
   dialog: focus moves in and is kept there, Escape and the backdrop
   close it, the page behind is inert, and focus goes back where it was.

   WHAT A PAGE SUPPLIES (install)
     toast(msg)       the page's own toast
     refresh()        redraw after sign-in or sign-out
     sync()           optional: push and pull now; resolves true/false
     status(phase)    one line for the signed-in sheet ('idle'|'synced')
   ============================================================ */

(function (root) {
  'use strict';

  var GOOGLE_ICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">'
    + '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>'
    + '<path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>'
    + '<path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/>'
    + '<path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.5 2.2-6.3 0-11.7-3.7-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">'
    + '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

  // The same words on every page. They used to differ by page: "your
  // log stays on this device" on a front door that has no log.
  var SIGNED_OUT = 'Signed out — everything stays on this device';
  var signedInMsg = function (u) {
    return 'Signed in' + (u && u.email ? ' as ' + u.email : '');
  };

  var CSS = ''
    + '.lp-modal{position:fixed;inset:0;z-index:900;display:flex;align-items:flex-end;justify-content:center;'
    + 'background:rgba(15,17,19,.45);padding:0}'
    + '.lp-modal[hidden]{display:none}'
    + '.lp-sheet{width:100%;max-width:480px;max-height:92dvh;overflow-y:auto;background:var(--bg-card);color:var(--text);'
    + 'border:1px solid var(--line);border-bottom:0;border-radius:var(--radius) var(--radius) 0 0;font-family:var(--sans);'
    + 'padding:var(--space-5) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom,0px));'
    + 'display:flex;flex-direction:column;gap:var(--space-4)}'
    + '@media (min-width:640px){.lp-modal{align-items:center;padding:var(--space-5)}.lp-sheet{border-radius:var(--radius);border-bottom:1px solid var(--line)}}'
    + '.lp-head{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)}'
    + '.lp-head h2{margin:0;font-size:20px;font-weight:700}'
    + '.lp-head h2:focus{outline:none}'
    + '.lp-x{flex:none;width:44px;height:44px;margin-right:-10px;display:grid;place-items:center;background:none;border:0;color:var(--text);cursor:pointer;border-radius:var(--radius)}'
    + '.lp-note{margin:0;font-size:15px;line-height:1.45;color:var(--text-dim)}'
    + '.lp-foot{margin:0;font-size:13px;line-height:1.45;color:var(--text-faint)}'
    + '.lp-label{font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:calc(var(--space-2) * -1)}'
    + '.lp-input{width:100%;min-height:48px;font:inherit;font-size:16px;color:var(--text);background:var(--bg);'
    + 'border:1px solid var(--rail);border-radius:var(--radius);padding:0 var(--space-4)}'
    + '.lp-input:focus-visible{outline:2px solid var(--data);outline-offset:1px}'
    + '.lp-code{font-family:var(--mono);font-size:24px;letter-spacing:.3em;text-align:center;font-variant-numeric:tabular-nums}'
    + '.lp-btn{display:block;width:100%;min-height:48px;font:inherit;font-size:17px;font-weight:700;border-radius:var(--radius);cursor:pointer;'
    + 'border:1px solid var(--rail);background:transparent;color:var(--text)}'
    + '.lp-btn.lp-primary{background:var(--chrome);color:var(--on-chrome);border-color:var(--chrome)}'
    + '.lp-btn:disabled{opacity:.6;cursor:default}'
    + '.lp-btn:focus-visible,.lp-link:focus-visible,.lp-x:focus-visible{outline:2px solid var(--data);outline-offset:2px}'
    + '.lp-google{display:flex;align-items:center;justify-content:center;gap:var(--space-3);font-size:15px}'
    + '.lp-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)}'
    + '.lp-or{display:flex;align-items:center;gap:var(--space-3);font-size:13px;color:var(--text-faint)}'
    + '.lp-or::before,.lp-or::after{content:"";flex:1;height:1px;background:var(--line)}'
    + '.lp-status{margin:0;min-height:1.45em;font-size:15px;line-height:1.45;color:var(--text-dim)}'
    + '.lp-status.lp-bad{color:var(--red)}'
    + '.lp-link{position:relative;font:inherit;font-size:15px;color:var(--text);background:none;border:0;padding:0;'
    + 'text-decoration:underline;text-underline-offset:3px;cursor:pointer}'
    + '.lp-link::after{content:"";position:absolute;inset:-12px -6px}'
    + '.lp-who{display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);border:1px solid var(--line);border-radius:var(--radius)}'
    + '.lp-avatar{flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;overflow:hidden;'
    + 'background:var(--bg-raise);border:1px solid var(--line);font-size:20px;font-weight:700}'
    + '.lp-avatar img{width:100%;height:100%;object-fit:cover}'
    + '.lp-name{font-size:17px;font-weight:700;overflow-wrap:anywhere}'
    + '.lp-mail{font-size:13px;color:var(--text-dim);overflow-wrap:anywhere}';

  var host = { toast: function () {}, refresh: function () {}, sync: null, status: function () { return ''; } };
  var modal = null, sheetEl = null, lastFocus = null, inerted = [];
  var signingOut = false, inCodeStep = false;

  function esc(s) {
    return String(s === null || typeof s === 'undefined' ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function enabled() { return Boolean(root.LentoAccount && root.LentoAccount.enabled()); }
  function user() { return enabled() ? root.LentoAccount.user() : null; }
  function codeLength() { return Math.min(10, Math.max(6, root.OTP_LENGTH || 6)); }

  /* WHY IT DID NOT WORK, IN WORDS THAT MATCH THE REASON. A rate limit is
     not a dead connection, and no connection is not a wrong code: telling
     somebody with no signal to request a new code sends them for a thing
     they already have. */
  function whySendFailed(e) {
    var status = e && e.status;
    if (status === 429) return 'Too many codes requested in the last hour. Wait a few minutes, or continue with Google.';
    if (status === 422 || status === 400) {
      return (e && e.detail)
        ? e.detail.charAt(0).toUpperCase() + e.detail.slice(1)
        : 'That address was refused. Check it, or continue with Google.';
    }
    if (status >= 500) return 'Sign-in is down at the moment. Everything else still works — try again in a few minutes.';
    return 'No connection. Check your signal and try again.';
  }
  function whyCodeFailed(status) {
    if (!status) return 'No connection — your code is still good. Try again when you have signal.';
    if (status === 429) return 'Too many tries. Wait a minute, then try again.';
    if (status >= 500) return 'Sign-in is down at the moment. Try the same code again in a few minutes.';
    return 'That code is wrong or has expired. Check it, or send a new one.';
  }

  // What a row that opens this sheet says (Settings, the front door).
  function line() {
    var u = user();
    if (u) return u.email || u.name || 'Signed in';
    return 'One account for cupping, espresso and filter';
  }

  /* ---------- the dialog ---------- */

  function install(opts) {
    opts = opts || {};
    ['toast', 'refresh', 'status'].forEach(function (k) { if (typeof opts[k] === 'function') host[k] = opts[k]; });
    host.sync = typeof opts.sync === 'function' ? opts.sync : null;
    if (modal) return;
    var style = document.createElement('style');
    style.id = 'lento-profile-css';
    style.textContent = CSS;
    document.head.appendChild(style);
    modal = document.createElement('div');
    modal.className = 'lp-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="lp-sheet" role="dialog" aria-modal="true" aria-labelledby="lp-title"></div>';
    sheetEl = modal.firstChild;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) { e.preventDefault(); close(); }
    });
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(sheetEl.querySelectorAll('button:not([disabled]), input, [href]'));
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    /* The account changed — here, in another tab, or because the server
       ended the session. The page redraws, and so does this sheet if it
       is open: a profile left up after a sign-out elsewhere still offered
       Sync now on an account that was gone. A sign-out nobody asked for on
       this page is said, rather than discovered later. */
    var was = user();
    if (root.LentoAccount && root.LentoAccount.onChange) {
      root.LentoAccount.onChange(function (u) {
        try { host.refresh(); } catch (e) {}
        if (modal && !modal.hidden && !inCodeStep) {
          if (u) profile(u); else emailStep('');
          focusSoon('#lp-title'); // the old focus went with the old contents
        }
        if (was && !u && !signingOut) host.toast('You were signed out. Sign in again to keep syncing.');
        was = u;
      });
    }
  }

  function show() {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    inerted = [].slice.call(document.body.children).filter(function (n) {
      return n !== modal && !n.inert && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE';
    });
    inerted.forEach(function (n) { n.inert = true; });
    modal.hidden = false;
  }
  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    inerted.forEach(function (n) { n.inert = false; });
    inerted = [];
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function frame(title, inner) {
    sheetEl.innerHTML = '<div class="lp-head"><h2 id="lp-title" tabindex="-1">' + title + '</h2>'
      + '<button type="button" class="lp-x" data-close aria-label="Close">' + CLOSE_ICON + '</button></div>' + inner;
    sheetEl.querySelector('[data-close]').addEventListener('click', close);
  }
  function focusSoon(sel) {
    setTimeout(function () { var n = sheetEl.querySelector(sel); if (n) n.focus(); }, 60);
  }

  /* ---------- the three states ---------- */

  function open() {
    if (!modal) install({});
    var u = user();
    if (u) profile(u);
    else emailStep('');
    show();
    if (!u) focusSoon('#lp-email');
    else focusSoon('#lp-title');
  }

  function profile(u) {
    inCodeStep = false;
    var initial = (u.name || u.email || '?').trim().charAt(0).toUpperCase();
    frame('Your profile',
      '<div class="lp-who"><div class="lp-avatar">'
      + (u.avatar ? '<img src="' + esc(u.avatar) + '" alt="">' : esc(initial)) + '</div>'
      + '<div><div class="lp-name">' + esc(u.name || u.email) + '</div>'
      + (u.name && u.email ? '<div class="lp-mail">' + esc(u.email) + '</div>' : '') + '</div></div>'
      + '<p class="lp-status" id="lp-status" role="status">' + esc(host.status('idle')) + '</p>'
      + '<div class="' + (host.sync ? 'lp-row' : '') + '">'
      + '<button type="button" class="lp-btn" id="lp-signout">Sign out</button>'
      + (host.sync ? '<button type="button" class="lp-btn lp-primary" id="lp-sync">Sync now</button>' : '')
      + '</div>'
      + '<p class="lp-foot">One account for cupping, espresso and filter. You stay signed in on this device until you sign out, and signing out leaves everything here.</p>');
    sheetEl.querySelector('#lp-signout').addEventListener('click', async function () {
      signingOut = true;
      await root.LentoAccount.signOut();
      signingOut = false;
      close();
      host.toast(SIGNED_OUT);
      host.refresh();
    });
    if (!host.sync) return;
    sheetEl.querySelector('#lp-sync').addEventListener('click', async function () {
      var status = sheetEl.querySelector('#lp-status');
      status.textContent = 'Syncing…';
      var ok = await host.sync();
      if (!user()) return; // signed out meanwhile: the sheet has redrawn and said so
      status.textContent = ok ? host.status('synced') : 'Could not reach the cloud — it will try again on its own.';
    });
  }

  function emailStep(prefill) {
    inCodeStep = false;
    frame('Sign in',
      '<p class="lp-note">One account for cupping, espresso and filter. We email you a code — no password — and you stay signed in on this device. Every tool works without it.</p>'
      + '<label class="lp-label" for="lp-email">Your email</label>'
      + '<input class="lp-input" id="lp-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com">'
      + '<p class="lp-status" id="lp-status" role="status"></p>'
      + '<button type="button" class="lp-btn lp-primary" id="lp-send">Email me a code</button>'
      + '<div class="lp-or">or</div>'
      + '<button type="button" class="lp-btn lp-google" id="lp-google">' + GOOGLE_ICON + ' Continue with Google</button>');
    var input = sheetEl.querySelector('#lp-email');
    var status = sheetEl.querySelector('#lp-status');
    var go = sheetEl.querySelector('#lp-send');
    input.value = prefill || '';
    sheetEl.querySelector('#lp-google').addEventListener('click', function () {
      root.LentoAccount.signInWith('google');
    });
    var send = async function () {
      var email = input.value.trim();
      status.classList.remove('lp-bad');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = 'That does not look like an email address.';
        status.classList.add('lp-bad');
        input.focus();
        return;
      }
      go.disabled = true;
      status.textContent = 'Sending…';
      try {
        await root.LentoAccount.sendEmailCode(email);
      } catch (e) {
        go.disabled = false;
        status.textContent = whySendFailed(e);
        status.classList.add('lp-bad');
        input.focus();
        return;
      }
      codeStep(email);
    };
    go.addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  }

  /* One field, not six boxes: a paste of the whole code works, the phone
     can offer the code from Mail (autocomplete one-time-code), and it
     signs in by itself the moment the last digit is in. */
  function codeStep(email) {
    inCodeStep = true;
    var n = codeLength();
    frame('Enter your code',
      '<p class="lp-note">Sent to <strong>' + esc(email) + '</strong>. '
      + '<button type="button" class="lp-link" id="lp-change">Wrong address?</button></p>'
      + '<label class="lp-label" for="lp-code">The ' + n + '-digit code from the email</label>'
      + '<input class="lp-input lp-code" id="lp-code" type="text" inputmode="numeric" autocomplete="one-time-code"'
      + ' maxlength="12" placeholder="' + new Array(n + 1).join('0') + '">'
      + '<p class="lp-status" id="lp-status" role="status"></p>'
      + '<button type="button" class="lp-btn lp-primary" id="lp-verify">Sign in</button>'
      + '<p class="lp-foot">Or tap <strong>Sign in to lento</strong> in the email on this device. Nothing yet? Check junk, or '
      + '<button type="button" class="lp-link" id="lp-resend">send a new code</button>.</p>');
    var input = sheetEl.querySelector('#lp-code');
    var status = sheetEl.querySelector('#lp-status');
    var go = sheetEl.querySelector('#lp-verify');
    var busy = false;
    sheetEl.querySelector('#lp-change').addEventListener('click', function () {
      emailStep(email);
      focusSoon('#lp-email');
    });
    var verify = async function () {
      if (busy) return;
      var code = input.value.replace(/\D/g, '');
      status.classList.remove('lp-bad');
      if (code.length < n) {
        status.textContent = 'The code is ' + n + ' digits.';
        status.classList.add('lp-bad');
        input.focus();
        return;
      }
      busy = true;
      go.disabled = true;
      status.textContent = 'Checking…';
      var res = await root.LentoAccount.verifyCode(email, code);
      busy = false;
      go.disabled = false;
      if (!res.ok) {
        status.textContent = whyCodeFailed(res.status);
        status.classList.add('lp-bad');
        input.focus();
        if (res.status) { input.select(); }
        return;
      }
      inCodeStep = false;
      close();
      host.toast(signedInMsg(user()));
      // the page's own account listener redraws and syncs, once
    };
    go.addEventListener('click', verify);
    input.addEventListener('input', function () {
      if (input.value.replace(/\D/g, '').length >= n) verify();
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
    sheetEl.querySelector('#lp-resend').addEventListener('click', async function () {
      status.classList.remove('lp-bad');
      status.textContent = 'Sending…';
      try {
        await root.LentoAccount.sendEmailCode(email);
        status.textContent = 'A new code is on its way. Use the newest one.';
        input.value = '';
        input.focus();
      } catch (e) {
        status.textContent = whySendFailed(e);
        status.classList.add('lp-bad');
      }
    });
    focusSoon('#lp-code');
  }

  /* A return from Google or from the email's button, or a failed one,
     said the same way on every page. Resolves true when it signed in. */
  async function adoptRedirect() {
    if (!root.LentoAccount) return false;
    var arrived = false;
    try { arrived = await root.LentoAccount.adoptRedirect(); } catch (e) { arrived = false; }
    var err = root.LentoAccount.redirectError && root.LentoAccount.redirectError();
    if (arrived) host.toast(signedInMsg(user()));
    else if (err) host.toast(err);
    return arrived;
  }

  root.LentoAccountSheet = {
    install: install,
    open: open,
    close: close,
    line: line,
    enabled: enabled,
    user: user,
    adoptRedirect: adoptRedirect,
  };
}(window));
