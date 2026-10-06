// Browser script for the two web pages (plain ES2017, no build step, no dependencies). Talks only to /v1 on the same
// origin; never stores the gift code or the phone number.
export const APP_JS = String.raw`(function () {
  var body = document.body;
  var $ = function (id) { return document.getElementById(id); };
  var show = function (id, on) { var el = $(id); if (el) el.hidden = on === false; };
  var hide = function (id) { show(id, false); };
  var money = function (cents) { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100).replace('CA$', '$'); };
  function api(path, payload) {
    return fetch(path, { method: payload ? 'POST' : 'GET', headers: payload ? { 'content-type': 'application/json' } : {}, body: payload ? JSON.stringify(payload) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { ok: res.ok, status: res.status, json: json }; }); });
  }
  function errorText(r) {
    if (r.status === 429) return 'Too many tries. Wait a minute and try again.';
    var m = r.json && r.json.error && r.json.error.message;
    return m || 'Something went wrong. Try again.';
  }
  function busy(form, on) { var b = form.querySelector('button'); if (b) b.disabled = on; }

  if (body.dataset.page === 'gift') {
    var code = body.dataset.code, challenge = null, phoneShown = '';
    api('/v1/gifts/lookup', { code: code }).then(function (r) {
      hide('loading');
      if (!r.ok || r.json.state === 'notfound') return show('gone');
      if (r.json.state === 'claimed') return show('taken');
      var g = r.json;
      $('gift-title').textContent = (g.recipientName ? g.recipientName + ', you' : 'You') + ' have a gift';
      $('gift-message').textContent = g.message ? '“' + g.message + '”' : '';
      $('gift-from').textContent = g.fromName ? 'From ' + g.fromName : '';
      $('gift-amount').textContent = g.amountCents != null ? money(g.amountCents) + ' at Nano Beauty' : '';
      body.dataset.amount = g.amountCents != null ? String(g.amountCents) : '';
      show('gift');
    });
    $('claim-start').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target; busy(f, true); $('gift-error').textContent = '';
      api('/v1/gifts/claim/start', { code: code, phone: $('phone').value }).then(function (r) {
        busy(f, false);
        if (!r.ok) return ($('gift-error').textContent = errorText(r));
        if (r.json.state !== 'valid') { hide('gift'); return show(r.json.state === 'claimed' ? 'taken' : 'gone'); }
        challenge = r.json.challenge.challengeId; phoneShown = r.json.challenge.sentTo;
        hide('claim-start'); show('claim-confirm'); $('otp').focus();
      });
    });
    $('claim-confirm').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target; busy(f, true); $('gift-error').textContent = '';
      api('/v1/gifts/claim/confirm', { code: code, challengeId: challenge, otp: $('otp').value }).then(function (r) {
        busy(f, false);
        if (!r.ok) return ($('gift-error').textContent = errorText(r));
        var amount = body.dataset.amount ? money(Number(body.dataset.amount)) : 'Your gift card';
        $('claimed-text').textContent = amount + ' is ready to use at Nano Beauty. Show your code at the desk or sign in to the app with ' + phoneShown + '.';
        hide('gift'); show('claimed');
        api('/v1/settings').then(function (s) {
          if (!s.ok) return;
          var store = s.json.app && s.json.app.storeUrl;
          var safe = function (u) { return typeof u === 'string' && /^https:\/\//.test(u); };
          if (store && safe(store.ios)) { $('ios').href = store.ios; show('ios'); }
          if (store && safe(store.android)) { $('android').href = store.android; show('android'); }
          $('address').textContent = s.json.clinic ? s.json.clinic.address : '';
        });
      });
    });
    $('keep').addEventListener('click', function () { hide('gift'); show('kept'); });
  }

  if (body.dataset.page === 'delete') {
    var challengeId = null;
    $('del-start').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target; busy(f, true); $('del-error').textContent = '';
      api('/v1/privacy/deletion/start', { phone: $('phone').value }).then(function (r) {
        busy(f, false);
        if (!r.ok) return ($('del-error').textContent = errorText(r));
        challengeId = r.json.challengeId; hide('del-start'); show('del-confirm'); $('otp').focus();
      });
    });
    $('del-confirm').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target; busy(f, true); $('del-error').textContent = '';
      api('/v1/privacy/deletion/confirm', { challengeId: challengeId, code: $('otp').value }).then(function (r) {
        busy(f, false);
        if (!r.ok) return ($('del-error').textContent = errorText(r));
        $('reference').textContent = 'Reference ' + r.json.reference;
        api('/v1/settings').then(function (s) {
          var days = s.ok ? s.json.settings.deletionGraceDays : null;
          $('grace').textContent = 'Changed your mind? Sign in to the app' + (days ? ' within ' + days + ' days' : '') + ' to cancel the request.';
        });
        hide('ask'); show('done');
      });
    });
  }
})();`;
