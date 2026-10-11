import { dark, light } from '@nano/design-tokens';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DELETION_PLAN } from '../account/routes';
import { APP_JS } from './app-js';

// The two allowed web surfaces (handover routes): WEB-01/02 gift claim at /gift/<code> and WEB-03/04 account deletion
// at /delete (Google Play's account-deletion URL). Server-rendered shells + one script that calls the existing public
// API on the same origin. No third-party scripts, fonts or trackers; strict CSP; nothing cached for gift links.

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const tokens = (t: typeof light) =>
  `--bg:${t.bg};--surface:${t.surface};--ink:${t.ink};--muted:${t.inkMuted};--primary:${t.primary};--on-primary:${t.onPrimary};--line:${t.lineStrong};--danger:${t.danger};--on-danger:${t.onDanger}`;
const CSS = `:root{${tokens(light)}}@media (prefers-color-scheme:dark){:root{${tokens(dark as unknown as typeof light)}}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:440px;margin:0 auto;padding:32px 20px}h1{font:600 26px/1.25 Georgia,serif;margin:0 0 12px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;margin:16px 0}
.muted{color:var(--muted)}label{display:block;font-weight:600;margin:16px 0 6px}
input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);min-height:48px}
button{width:100%;min-height:48px;margin-top:16px;border:0;border-radius:24px;font-family:inherit;font-weight:600;font-size:16px;line-height:1;background:var(--primary);color:var(--on-primary);cursor:pointer}
button.secondary{background:transparent;color:var(--primary);border:1px solid var(--line)}button.danger{background:var(--danger);color:var(--on-danger)}
.brand{font:600 20px/1 Georgia,serif;margin-bottom:24px}.gc{border-radius:20px;padding:24px;background:var(--primary);color:var(--on-primary);min-height:140px;display:flex;flex-direction:column;justify-content:space-between}
.gc b{font:600 32px/1.1 Georgia,serif}.gc small{opacity:.85}.msg{font-style:italic}ul.plain{padding-left:20px;margin:8px 0}.steps{list-style:none;padding:0;margin:12px 0}.steps li{padding:6px 0 6px 28px;position:relative}.steps li::before{content:'';position:absolute;left:4px;top:12px;width:12px;height:12px;border-radius:50%;border:2px solid var(--primary)}.steps li.on::before{background:var(--primary)}button:disabled{opacity:.6}
.error{color:var(--danger);margin-top:8px}[hidden]{display:none!important}a{color:var(--primary)}footer{margin-top:32px;font-size:14px}
:focus-visible{outline:3px solid var(--primary);outline-offset:2px}`;

function page(reply: FastifyReply, title: string, body: string, data: Record<string, string> = {}) {
  const attrs = Object.entries(data)
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
  return reply
    .header('content-type', 'text/html; charset=utf-8')
    .header('content-security-policy', CSP)
    .header('cache-control', 'no-store')
    .send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">` +
        `<title>${esc(title)} · Nano Beauty</title><link rel="stylesheet" href="/web/app.css"></head><body${attrs}><main><div class="brand">Nano Beauty</div>${body}</main>` +
        `<script src="/web/app.js"></script></body></html>`,
    );
}

export function registerWebRoutes(app: FastifyInstance) {
  app.get('/web/app.css', async (_request, reply) => reply.header('content-type', 'text/css; charset=utf-8').header('cache-control', 'public, max-age=3600').send(CSS));
  app.get('/web/app.js', async (_request, reply) => reply.header('content-type', 'text/javascript; charset=utf-8').header('cache-control', 'public, max-age=3600').send(APP_JS));

  // WEB-01 / WEB-02. The code is only ever sent to our own API; the page shows nothing until the API answers.
  app.get('/gift/:code', async (request, reply) => {
    const parsed = z.object({ code: z.string().regex(/^[A-Za-z0-9-]{6,40}$/) }).safeParse(request.params);
    if (!parsed.success) return reply.status(404).header('content-type', 'text/html; charset=utf-8').header('cache-control', 'no-store').send(notFoundHtml);
    return page(
      reply,
      'Your gift',
      `<div id="loading" class="muted" aria-live="polite">Opening your gift…</div>
<section id="gone" hidden><h1>We couldn’t find this gift card</h1><p class="muted">Check the link in your text, or contact the clinic.</p></section>
<section id="taken" hidden><h1>This gift card is already in a Wallet</h1><p class="muted">If that wasn’t you, contact the clinic.</p></section>
<section id="trouble" hidden><h1>We couldn’t open your gift just now</h1><p class="muted" id="trouble-text"></p><button type="button" id="retry">Try again</button></section>
<section id="gift" hidden><h1 id="gift-title"></h1><div class="gc" aria-label="Gift card"><small>Nano Beauty gift card</small><b id="gift-amount"></b><small id="gift-ref"></small></div>
<div class="card"><p class="msg" id="gift-message"></p><p class="muted" id="gift-from"></p></div><p class="muted">Enter your mobile number and we’ll text you a code to add this card to your Wallet. You don’t need the app.</p>
<form id="claim-start"><label for="phone">Your mobile number</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required><button type="submit">Send me a code</button></form>
<form id="claim-confirm" hidden><label for="otp">Code from the text</label><input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button type="submit">Claim gift card</button><button class="secondary" id="newcode" type="button">Send a new code</button></form>
<button class="secondary" id="keep" type="button">Just keep the code</button><p class="error" id="gift-error" role="alert"></p></section>
<section id="claimed" hidden><h1>Gift card claimed</h1><div class="card"><p id="claimed-text"></p><p class="muted" id="claimed-ref"></p></div><p>Book and track it in the app.</p>
<p><a id="ios" href="#" hidden>Get the app for iPhone</a></p><p><a id="android" href="#" hidden>Get the app for Android</a></p><p class="muted" id="address"></p></section>
<section id="kept" hidden><h1>Keep this text</h1><p class="muted">Show the code at the desk when you visit, or claim it in the app later.</p></section>`,
      { page: 'gift', code: parsed.data.code },
    );
  });

  // WEB-03 / WEB-04: Google Play's "delete your account" URL. A code to the number proves it's theirs.
  app.get('/delete', async (_request, reply) =>
    page(
      reply,
      'Delete your account',
      `<section id="ask"><h1>Delete your account</h1><p class="muted">Use this page if you can’t open the app. We’ll confirm it’s you with a code by text.</p>
<div class="card"><p><b>We delete</b></p><ul class="plain">${DELETION_PLAN.delete.map((d) => `<li>${esc(d.label)}</li>`).join('')}</ul><p><b>We keep, without your name</b></p><ul class="plain">${DELETION_PLAN.retain.map((d) => `<li>${esc(d.label)}</li>`).join('')}</ul></div>
<form id="del-start"><label for="phone">Your mobile number</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required><button type="submit">Send me a code</button></form>
<form id="del-confirm" hidden><label for="otp">Code from the text</label><input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required><button class="danger" type="submit">Request deletion</button><button class="secondary" id="del-newcode" type="button">Use a different number</button></form>
<p class="error" id="del-error" role="alert"></p></section>
<section id="done" hidden><h1>Deletion requested</h1><div class="card"><p>We’ve received your request and sent a confirmation by text.</p><p class="muted" id="reference"></p></div>
<ol class="steps" aria-label="What happens next"><li class="on">Request received</li><li>Waiting period: sign in to the app to cancel</li><li>Account deleted</li></ol><p class="muted" id="grace"></p></section>
<footer class="muted">What is deleted, kept or de-identified is listed in the privacy policy.</footer>`,
      { page: 'delete' },
    ),
  );
}

const notFoundHtml = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found</title><p>This link isn’t valid.</p></html>';
