/* ============================================================
   lento — the sign-in sheet, once

   WHY THIS EXISTS

   The dial-in and the brew log had the same two sheets, twice: the same
   email field, the same code field, the same Google button, the same
   Sign out and Sync now, and the same twenty-nine lines of modal markup
   in each index.html. It was copied deliberately — the two apps differ
   in small ways, and two honest copies beat a premature abstraction —
   but the moment a third tool would have wanted one, it was three.

   Two copies of a sheet are not a style problem. They are a promise that
   somebody will fix a sign-in bug in one app and ship the other one
   still broken.

   WHAT IT DOES NOT ABSORB

   The apps genuinely differ where they differ, so this takes those as
   arguments rather than pretending. Opening and closing a modal is the
   host's job: the dial-in stacks sheets, locks the page behind them and
   marks the board inert, and the brew log does none of that. The noun is
   the host's ("3 shots", "3 brews"). Syncing is the host's, because what
   a record is differs.

   What is genuinely the same is everything you can see: the copy, the
   fields, the two ways in, the states, and the markup they live in.

   THE MARKUP COMES WITH IT

   `install` injects both sheets, rather than each index.html carrying a
   copy. A component that owns its own markup cannot drift from it, and
   this one is never used by anything else. It has to run before the host
   wires its delegated handlers — the backdrop-click binding walks
   `.modal` once — so it is called from boot, before wire().
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

  var host = null;

  function esc(s) {
    return String(s === null || typeof s === 'undefined' ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* WHY THE CODE DID NOT ARRIVE, IN THE WORDS THAT MATCH THE REASON.

     Every failure here used to read "Could not send it — check the
     connection and try again." Supabase allows a small number of sign-in
     emails an hour per project, so the ordinary way to meet this message
     is to ask twice, get nothing, ask again — and be told to go and look
     at your wifi, which is fine. Sending somebody to debug the wrong
     thing is worse than saying nothing.

     Each branch names the problem and the way out, and every one of them
     points at Google, because that route is not rate-limited and it is one
     tap away on the sheet behind this line. */
  function whySendFailed(e) {
    var status = e && e.status;
    if (status === 429) {
      return 'Too many sign-in emails from this project in the last hour. '
        + 'Wait a few minutes, or continue with Google.';
    }
    if (status === 422 || status === 400) {
      return (e && e.detail)
        ? e.detail.charAt(0).toUpperCase() + e.detail.slice(1)
        : 'That address was refused. Check it, or continue with Google.';
    }
    if (status >= 500) {
      return 'Sign-in is down at the moment. Everything else still works — '
        + 'try again in a few minutes.';
    }
    // No status at all means the request never completed.
    return 'Could not reach sign-in. Check the connection and try again.';
  }

  function enabled() { return Boolean(root.LentoAccount && root.LentoAccount.enabled()); }
  function user() { return enabled() ? root.LentoAccount.user() : null; }

  // What the row in Settings says. Signed in, the address; signed out,
  // what an account is for — in one line, because the sentence that
  // explains sync belongs in the sheet and not on the button.
  function line() {
    var u = user();
    if (u) return u.email || u.name || 'Signed in';
    return 'Your log on every device you use';
  }


  function sheet(id, title) {
    return '<div id="' + id + '-modal" class="modal hidden">'
      + '<div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title">'
      + '<div class="sheet-head">'
      + '<h3 id="' + id + '-title">' + title + '</h3>'
      + '<button id="' + id + '-close" class="icon-btn" aria-label="Close">' + CLOSE_ICON + '</button>'
      + '</div>'
      + '<div class="settings-body" id="' + id + '-body"></div>'
      + '</div></div>';
  }

  function install(opts) {
    host = opts;
    // Optional throughout: with no Supabase project configured the host
    // does not draw the Settings row, and nothing here is ever reached.
    // The markup still goes in, because "enabled" can be a deploy-time
    // difference and a missing element is a harder failure than an
    // unused one.
    var wrap = document.createElement('div');
    wrap.innerHTML = sheet('account', 'Your account') + sheet('code', 'Enter your code');
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    document.getElementById('account-close')
      .addEventListener('click', function () { host.close('#account-modal'); });
    document.getElementById('code-close')
      .addEventListener('click', function () { host.close('#code-modal'); });
  }

  function open() {
    var body = document.getElementById('account-body');
    var u = user();
    // "Your account" is wrong on the sheet that does not have one yet.
    document.getElementById('account-title').textContent = u ? 'Your account' : 'Sign in';

    if (u) signedIn(body, u);
    else signedOut(body);
    host.open('#account-modal');
  }

  /* The signed-in state. The status line is the host's: what a tool has
     to say about itself is "3 shots, backed up as you log them" and what
     the front door has to say is what is on this device — one sentence,
     supplied rather than assembled here from a noun and a count, because
     the sentence was never the same shape in the first place.

     `sync` is optional, and it is the cupping sheet that leaves it out:
     it holds its history in its own store and syncs on its own schedule.
     A button that does nothing is worse than a button that is not there.
     (The launcher used to leave it out too, on the grounds that it held
     no records. It holds two shared ones now — the grinders and the
     shelf — so it passes one.) */
  function signedIn(body, u) {
    body.innerHTML = '<p class="sheet-note">' + esc(u.email || u.name || '') + '</p>'
      + '<p class="sheet-note" id="account-status">' + esc(host.status('idle')) + '</p>'
      + '<div class="sheet-actions">'
      + '<button class="btn btn-ghost" id="btn-signout">Sign out</button>'
      + (host.sync ? '<button class="btn btn-primary" id="btn-sync">Sync now</button>' : '')
      + '</div>'
      + '<p class="sheet-foot">' + esc(host.signOutNote) + '</p>';

    body.querySelector('#btn-signout').addEventListener('click', async function () {
      await root.LentoAccount.signOut();
      host.close('#account-modal');
      host.toast('Signed out — your log stays on this device');
    });
    if (!host.sync) return;
    body.querySelector('#btn-sync').addEventListener('click', async function () {
      var status = body.querySelector('#account-status');
      status.textContent = 'Syncing…';
      var ok = await host.sync();
      status.textContent = ok
        ? host.status('synced')
        : 'Could not reach the cloud — it will try again';
    });
  }

  function signedOut(body) {
    body.innerHTML = '<p class="sheet-note">A code by email, no password. '
      + esc(host.signedOutNote) + '</p>'
      + '<label class="field-label" for="account-email">Your email</label>'
      + '<input class="field-input" id="account-email" type="email" inputmode="email"'
      + ' autocomplete="email" placeholder="you@example.com">'
      + '<p class="sheet-note" id="account-status" role="status"></p>'
      + '<div class="sheet-actions">'
      + '<button class="btn btn-primary" id="btn-email-code">Email me a code</button>'
      + '</div>'
      + '<div class="auth-or"><span>or</span></div>'
      + '<button class="btn btn-ghost auth-google" id="btn-google">' + GOOGLE_ICON
      + ' Continue with Google</button>'
      + '<p class="sheet-foot">Nothing leaves this device without an account.</p>';

    body.querySelector('#btn-google').addEventListener('click', function () {
      root.LentoAccount.signInWith('google');
    });

    var send = async function () {
      var input = body.querySelector('#account-email');
      var status = body.querySelector('#account-status');
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = 'That does not look like an email address.';
        return;
      }
      status.textContent = 'Sending…';
      try {
        await root.LentoAccount.sendEmailCode(email);
      } catch (e) {
        status.textContent = whySendFailed(e);
        return;
      }
      openCode(email);
    };
    body.querySelector('#btn-email-code').addEventListener('click', send);
    body.querySelector('#account-email').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  /* One field rather than six boxes: a paste of the whole code works, and
     Supabase codes are not always six digits. */
  function openCode(email) {
    host.close('#account-modal');
    var body = document.getElementById('code-body');
    body.innerHTML = '<p class="sheet-note">Sent to ' + esc(email) + '.</p>'
      + '<label class="field-label" for="code-input">Code</label>'
      + '<input class="field-input" id="code-input" type="text" inputmode="numeric"'
      + ' autocomplete="one-time-code" maxlength="10" placeholder="123456">'
      + '<p class="sheet-note" id="code-status" role="status"></p>'
      + '<div class="sheet-actions">'
      + '<button class="btn btn-ghost" id="btn-code-resend">Send a new code</button>'
      + '<button class="btn btn-primary" id="btn-code-verify">Sign in</button>'
      + '</div>';

    var status = body.querySelector('#code-status');
    var verify = async function () {
      var code = body.querySelector('#code-input').value.replace(/\s+/g, '');
      if (code.length < 6) {
        status.textContent = 'Keep going — the code is at least six digits.';
        return;
      }
      status.textContent = 'Checking…';
      var ok = await root.LentoAccount.verifyEmailCode(email, code);
      if (!ok) { status.textContent = 'That code did not work. Send a new one.'; return; }
      host.close('#code-modal');
      host.toast(host.signedInToast);
      host.refresh();
      if (host.sync) host.sync();
    };
    body.querySelector('#btn-code-verify').addEventListener('click', verify);
    body.querySelector('#code-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); verify(); }
    });
    body.querySelector('#btn-code-resend').addEventListener('click', async function () {
      status.textContent = 'Sending…';
      try {
        await root.LentoAccount.sendEmailCode(email);
        status.textContent = 'A new code is on its way.';
      } catch (e) {
        status.textContent = whySendFailed(e);
      }
    });
    host.open('#code-modal');
  }

  root.LentoAccountSheet = {
    install: install,
    open: open,
    line: line,
    enabled: enabled,
    user: user,
  };
}(window));
