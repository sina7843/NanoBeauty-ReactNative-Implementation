import { entitySchema, otpVerifyResponseSchema, type CampaignDraft, type PackageDraft } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const OWNER = ['7785550111', '+17785550111'] as const;
const OWNER2 = ['7785550112', '+17785550112'] as const;
const EDITOR = ['7785550122', '+17785550122'] as const;
const DESK = ['7785550100', '+17785550100'] as const;
const CUSTOMER = ['6045550123', '+16045550123'] as const;

export async function opsSetup() {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec(
    'TRUNCATE push_messages, staff_invites, catalog_imports, media, approvals, balance_help_cases, ledger_entries, wallet_instruments, refunds, provider_events, payment_attempts, orders, privacy_requests, customer_preferences, notifications, visit_requests, booking_handoffs, visits, audit_entries, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, support_questions, promo_redemptions, legacy_match_cases, customers CASCADE;',
  );
  await db.exec(`UPDATE app_settings SET settings = jsonb_set(settings, '{secondApprover,on}', 'false') WHERE id = 1;`);
  const clock = { t: Date.parse('2026-10-06T17:00:00Z') };
  const dev = createDevIntegrations({ now: () => clock.t });
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { now: () => clock.t, devOtpSink: dev.otpSink } });
  close = () => app.close();
  const req = (method: 'GET' | 'POST' | 'PUT', url: string, token?: string, payload?: object) =>
    app.inject({ method, url, ...(payload ? { payload } : {}), headers: token ? { authorization: `Bearer ${token}` } : {} });
  async function signIn(phone: string, e164: string, role?: string) {
    clock.t += 31_000;
    if (role) {
      await db.query(`INSERT INTO customers (phone_e164, first_name, last_name) VALUES ($1, $2, 'Staff') ON CONFLICT (phone_e164) DO NOTHING`, [e164, role.replace(' ', '')]);
      await db.query(`INSERT INTO staff_roles (customer_id, role) SELECT id, $2 FROM customers WHERE phone_e164 = $1 ON CONFLICT DO NOTHING`, [e164, role]);
    }
    const { challengeId } = (await req('POST', '/v1/auth/otp/start', undefined, { phone })).json();
    return otpVerifyResponseSchema.parse((await req('POST', '/v1/auth/otp/verify', undefined, { challengeId, code: dev.otpSink.get(e164)! })).json()).accessToken;
  }
  const entity = async (token: string, plural: string, id: string) => entitySchema.parse((await req('GET', `/v1/staff/${plural}/${id}`, token)).json());
  return { db, dev, clock, req, signIn, entity, OWNER, OWNER2, EDITOR, DESK, CUSTOMER };
}

const pkg = (over: Partial<PackageDraft> = {}): PackageDraft => ({
  name: 'Winter glow x3',
  serviceId: 'svc_hifu',
  sessions: 3,
  priceCents: 90000,
  regularCents: 105000,
  validityMonths: 12,
  terms: ['Valid 12 months'],
  visibility: 'live',
  ...over,
});
const cmp = (over: Partial<CampaignDraft> = {}): CampaignDraft => ({
  template: 'own',
  eyebrow: 'Winter',
  title: 'Winter glow',
  summary: 'Save on facials',
  body: null,
  photo: null,
  startsAt: '2026-11-01T17:00:00Z',
  endsAt: '2026-11-30T17:00:00Z',
  audience: 'all',
  eligible: [],
  terms: ['One per person'],
  cta: { label: 'See treatments', href: '/treatments' },
  fallback: { label: 'See treatments', href: '/treatments' },
  ...over,
});

describe('selling items share the draft model (STF-05/07/15/16, D35/D36)', () => {
  it('front desk and customers are refused with the missing permission', async () => {
    const t = await opsSetup();
    const desk = await t.signIn(...DESK, 'Front desk');
    const customer = await t.signIn(...CUSTOMER);
    for (const token of [desk, customer]) {
      for (const [m, url, body] of [
        ['GET', '/v1/staff/packages'],
        ['POST', '/v1/staff/campaigns', { draft: cmp() }],
        ['POST', '/v1/staff/promo-codes/GLOW25/publish', { version: 1 }],
        ['PUT', '/v1/staff/policies/booking/draft', { version: 1, draft: {} }],
        ['GET', '/v1/staff/professionals'],
      ] as const) {
        const res = await t.req(m, url, token, body);
        expect(res.statusCode, url).toBe(403);
        expect(res.json().error.missingPermission).toBeTruthy();
      }
    }
  });

  it('a new package is a draft nobody can buy; the Owner publishes it; a price change waits for a second approver', async () => {
    const t = await opsSetup();
    const editor = await t.signIn(...EDITOR, 'Editor');
    const owner = await t.signIn(...OWNER, 'Owner');
    const owner2 = await t.signIn(...OWNER2, 'Owner');
    const created = entitySchema.parse((await t.req('POST', '/v1/staff/packages', editor, { draft: pkg() })).json());
    expect(created.state).toBe('draft');
    const buyable = async () => (await t.req('GET', '/v1/packages', owner)).json().map((p: { id: string }) => p.id);
    expect(await buyable()).not.toContain(created.id);
    // Editors can't publish.
    expect((await t.req('POST', `/v1/staff/packages/${created.id}/publish`, editor, { version: created.version })).statusCode).toBe(403);
    const pub = (await t.req('POST', `/v1/staff/packages/${created.id}/publish`, owner, { version: created.version })).json();
    expect(pub.outcome).toBe('published');
    expect(await buyable()).toContain(created.id);

    await t.db.exec(`UPDATE app_settings SET settings = jsonb_set(settings, '{secondApprover,on}', 'true') WHERE id = 1;`);
    const live = await t.entity(owner, 'packages', created.id);
    const saved = entitySchema.parse((await t.req('PUT', `/v1/staff/packages/${created.id}/draft`, owner, { version: live.version, draft: pkg({ priceCents: 80000 }) })).json());
    expect(saved.highRiskChanges).toEqual(['price']);
    // Stale version: 409, no force-save.
    expect((await t.req('PUT', `/v1/staff/packages/${created.id}/draft`, editor, { version: live.version, draft: pkg() })).statusCode).toBe(409);
    const waiting = (await t.req('POST', `/v1/staff/packages/${created.id}/publish`, owner, { version: saved.version })).json();
    expect(waiting.outcome).toBe('waiting');
    const [row] = await t.db.query<{ price_cents: number }>('SELECT price_cents FROM packages WHERE id = $1', [created.id]);
    expect(row!.price_cents).toBe(90000);
    const queue = (await t.req('GET', '/v1/staff/approvals', owner2)).json();
    const a = queue.waiting.find((x: { itemId: string }) => x.itemId === created.id);
    expect(a).toMatchObject({ itemType: 'package', itemName: 'Winter glow x3', fields: ['price'] });
    // Not by the submitter.
    expect((await t.req('POST', `/v1/staff/approvals/${a.id}/decide`, owner, { decision: 'approve' })).statusCode).toBe(403);
    expect((await t.req('POST', `/v1/staff/approvals/${a.id}/decide`, owner2, { decision: 'approve' })).statusCode).toBe(200);
    const [after] = await t.db.query<{ price_cents: number }>('SELECT price_cents FROM packages WHERE id = $1', [created.id]);
    expect(after!.price_cents).toBe(80000);
    const audit = await t.db.query<{ field: string; old_value: string; new_value: string }>(`SELECT field, old_value, new_value FROM audit_entries WHERE item = $1 AND field = 'priceCents' ORDER BY id`, [`package:${created.id}`]);
    expect(audit.at(-1)).toEqual({ field: 'priceCents', old_value: '90000', new_value: '80000' });
  });

  it('published items are archived not deleted; drafts delete; restore comes back as a draft', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const c = entitySchema.parse((await t.req('POST', '/v1/staff/campaigns', owner, { draft: cmp() })).json());
    const pub = (await t.req('POST', `/v1/staff/campaigns/${c.id}/publish`, owner, { version: c.version })).json().entity;
    expect(pub.state).toBe('live');
    expect((await t.req('POST', `/v1/staff/campaigns/${c.id}/delete`, owner, { version: pub.version })).statusCode).toBe(409);
    const archived = (await t.req('POST', `/v1/staff/campaigns/${c.id}/archive`, owner, { version: pub.version })).json();
    expect(archived.state).toBe('archived');
    const restored = (await t.req('POST', `/v1/staff/campaigns/${c.id}/restore`, owner, { version: archived.version })).json();
    expect(restored.state).toBe('draft');
    const [r] = await t.db.query<{ published: boolean }>('SELECT published FROM campaigns WHERE id = $1', [c.id]);
    expect(r!.published).toBe(false);
    // Customers saw it once: restore doesn't make it deletable, and a link to it shows the ended page.
    expect(restored.deletable).toBe(false);
    expect((await t.req('POST', `/v1/staff/campaigns/${c.id}/delete`, owner, { version: restored.version })).statusCode).toBe(409);
    expect((await t.req('GET', `/v1/offers/${c.id}`)).json().offer.state).toBe('expired');

    const d = entitySchema.parse((await t.req('POST', '/v1/staff/campaigns', owner, { draft: cmp({ title: 'Never live' }) })).json());
    expect((await t.req('POST', `/v1/staff/campaigns/${d.id}/delete`, owner, { version: d.version })).json()).toEqual({ deleted: true });
  });

  it('a campaign can be paused, ended and reused for next year', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const c = entitySchema.parse((await t.req('POST', '/v1/staff/campaigns', owner, { draft: cmp({ startsAt: '2026-10-01T17:00:00Z' }) })).json());
    let e = (await t.req('POST', `/v1/staff/campaigns/${c.id}/publish`, owner, { version: c.version })).json().entity;
    e = (await t.req('POST', `/v1/staff/campaigns/${c.id}/pause`, owner, { version: e.version })).json();
    const rows = (await t.req('GET', '/v1/staff/campaigns', owner)).json();
    expect(rows.find((r: { id: string }) => r.id === c.id).phase).toBe('paused');
    e = (await t.req('POST', `/v1/staff/campaigns/${c.id}/end`, owner, { version: e.version })).json();
    expect(Date.parse(e.live.endsAt)).toBeLessThanOrEqual(t.clock.t);
    const copy = entitySchema.parse((await t.req('POST', `/v1/staff/campaigns/${c.id}/duplicate`, owner, {})).json());
    expect(copy.state).toBe('draft');
    expect(copy.draft.startsAt).toBe('2027-10-01T17:00:00.000Z');
  });

  it('promo codes: unique, not renameable; a draft code is invalid to customers until published', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const customer = await t.signIn(...CUSTOMER);
    const draft = { code: 'SNOW10', description: '10% off facials', discount: { type: 'percent', value: 10 }, appliesTo: 'category:facials', appliesLabel: 'facials', campaignId: null, startsAt: null, endsAt: null, totalLimit: 50, perPerson: 1 };
    expect((await t.req('POST', '/v1/staff/promo-codes', owner, { draft: { ...draft, code: 'GLOW25' } })).statusCode).toBe(409);
    const p = entitySchema.parse((await t.req('POST', '/v1/staff/promo-codes', owner, { draft })).json());
    expect(p.id).toBe('SNOW10');
    const check = async () => (await t.req('POST', '/v1/promo/validate', customer, { code: 'SNOW10' })).json().state;
    expect(await check()).toBe('invalid');
    expect((await t.req('PUT', '/v1/staff/promo-codes/SNOW10/draft', owner, { version: p.version, draft: { ...draft, code: 'SNOW11' } })).statusCode).toBe(409);
    await t.req('POST', '/v1/staff/promo-codes/SNOW10/publish', owner, { version: p.version });
    expect(await check()).toBe('valid');
  });

  it('a professional with a photo or bio can’t go live without consent; hidden people leave the customer list', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const p = entitySchema.parse((await t.req('POST', '/v1/staff/professionals', owner, { draft: { name: 'Mina R.', title: 'Laser specialist', bio: 'Ten years.', photo: null, consent: false, visible: true } })).json());
    expect(p.missing[0]).toMatch(/consent/i);
    expect((await t.req('POST', `/v1/staff/professionals/${p.id}/publish`, owner, { version: p.version })).statusCode).toBe(409);
    const s = entitySchema.parse((await t.req('PUT', `/v1/staff/professionals/${p.id}/draft`, owner, { version: p.version, draft: { ...p.draft, consent: true } })).json());
    expect((await t.req('POST', `/v1/staff/professionals/${p.id}/publish`, owner, { version: s.version })).json().outcome).toBe('published');
    const list = async () => (await t.req('GET', '/v1/catalog')).json().professionals.map((x: { id: string }) => x.id);
    expect(await list()).toContain(p.id);
    const now = await t.entity(owner, 'professionals', p.id);
    const hidden = entitySchema.parse((await t.req('PUT', `/v1/staff/professionals/${p.id}/draft`, owner, { version: now.version, draft: { ...now.draft, visible: false } })).json());
    await t.req('POST', `/v1/staff/professionals/${p.id}/publish`, owner, { version: hidden.version });
    expect(await list()).not.toContain(p.id);
  });

  it('policies: each publish adds a version customers see; history is kept', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const p = await t.entity(owner, 'policies', 'booking');
    const draft = { title: 'Booking policy', sections: [{ heading: 'Changes', body: 'Change up to 48 hours before.' }], changeNote: 'Clearer change window' };
    const s = entitySchema.parse((await t.req('PUT', '/v1/staff/policies/booking/draft', owner, { version: p.version, draft })).json());
    expect(s.highRiskChanges).toEqual(['policy']);
    await t.req('POST', '/v1/staff/policies/booking/publish', owner, { version: s.version });
    const after = await t.entity(owner, 'policies', 'booking');
    expect(after.facts.map((f) => f.value)).toEqual(['Clearer change window', 'First version']);
    const customer = (await t.req('GET', '/v1/policies/booking')).json();
    expect(customer.version).toBe('v2');
    expect(customer.sections[0].body).toBe('Change up to 48 hours before.');
  });
});

const settingsVersion = async (t: Awaited<ReturnType<typeof opsSetup>>) => (await t.req('GET', '/v1/settings')).json().version as number;

describe('settings change app behaviour without a rebuild (STF-17/31/32/34)', () => {
  it('rules: versioned, audited, owner-only; in-app booking stays off; saved values drop the Sample badge', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const editor = await t.signIn(...EDITOR, 'Editor');
    const boot = (await t.req('GET', '/v1/settings')).json();
    const pick = ({ bookingMode, deposit, freeChangeHours, lateCancelOutcome, lateChangeOutcome, noShowOutcome, slotHoldMinutes, slotHoldWarningMinutes, paymentMethods, financingLine, consultation, secondApprover, ratingLine, deletionGraceDays }: Record<string, unknown>) => ({
      bookingMode, deposit, freeChangeHours, lateCancelOutcome, lateChangeOutcome, noShowOutcome, slotHoldMinutes, slotHoldWarningMinutes, paymentMethods, financingLine, consultation, secondApprover, ratingLine, deletionGraceDays,
    });
    const body = (over: Record<string, unknown> = {}) => ({ version: boot.version, settings: { ...pick(boot.settings), ...over }, features: { legacyMembership: true } });
    expect((await t.req('PUT', '/v1/staff/settings/rules', editor, body())).json().error.missingPermission).toBe('rules.manage');
    expect((await t.req('PUT', '/v1/staff/settings/rules', owner, body({ bookingMode: 'inapp' }))).statusCode).toBe(409);
    const res = (await t.req('PUT', '/v1/staff/settings/rules', owner, body({ freeChangeHours: 24 }))).json();
    expect(res.version).toBe(boot.version + 1);
    const after = (await t.req('GET', '/v1/settings')).json();
    expect(after).toMatchObject({ settings: { freeChangeHours: 24, sample: false }, features: { legacyMembership: true } });
    // Someone else's older copy can't overwrite this.
    expect((await t.req('PUT', '/v1/staff/settings/rules', owner, body({ freeChangeHours: 12 }))).statusCode).toBe(409);
    const audit = await t.db.query<{ field: string }>(`SELECT field FROM audit_entries WHERE item = 'settings' ORDER BY id`);
    expect(audit.map((a) => a.field)).toEqual(expect.arrayContaining(['settings.freeChangeHours', 'features.legacyMembership']));
  });

  it('gift settings keep presets inside the custom range; expiry stays locked off', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const v = await settingsVersion(t);
    const gift = { presetsCAD: [50, 100], customRangeCAD: [25, 300], expiry: null, designs: ['thanks'] };
    expect((await t.req('PUT', '/v1/staff/settings/gifts', owner, { version: v, gift: { ...gift, presetsCAD: [400] }, giftRefundDays: 14 })).statusCode).toBe(400);
    expect((await t.req('PUT', '/v1/staff/settings/gifts', owner, { version: v, gift, giftRefundDays: 14 })).statusCode).toBe(200);
    expect((await t.req('GET', '/v1/settings')).json().settings.gift).toEqual(gift);
  });

  it('home layout: at most two published offers, in order; ended ones can’t be chosen', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const editor = await t.signIn(...EDITOR, 'Editor');
    const view = (await t.req('GET', '/v1/staff/home-layout', editor)).json();
    const ids = view.candidates.map((c: { id: string }) => c.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect((await t.req('PUT', '/v1/staff/home-layout', editor, { version: view.version, offers: [], ratingLine: false })).statusCode).toBe(403);
    expect((await t.req('PUT', '/v1/staff/home-layout', owner, { version: view.version, offers: [ids[0], ids[1], ids[0]], ratingLine: false })).statusCode).toBe(400);
    expect((await t.req('PUT', '/v1/staff/home-layout', owner, { version: view.version, offers: ['cmp_nope'], ratingLine: false })).statusCode).toBe(409);
    const saved = (await t.req('PUT', '/v1/staff/home-layout', owner, { version: view.version, offers: [ids[1], ids[0]], ratingLine: true })).json();
    expect(saved.offers).toEqual([ids[1], ids[0]]);
    expect(saved.version).toBeGreaterThan(view.version);
    const home = (await t.req('GET', '/v1/content/home')).json();
    expect(home.offers.map((o: { id: string }) => o.id)).toEqual([ids[1], ids[0]]);
    expect((await t.req('GET', '/v1/settings')).json().settings.ratingLine.on).toBe(true);
  });
});

describe('front desk operations (STF-23–30)', () => {
  async function seedRequest(t: Awaited<ReturnType<typeof opsSetup>>, customer: string, hoursAhead: number) {
    const [c] = await t.db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1', [customer]);
    const [v] = await t.db.query<{ id: string }>(
      `INSERT INTO visits (customer_id, external_ref, source, service_name, starts_at, status, synced_at, first_seen_at) VALUES ($1, 'FR-1', 'fresha_sync', 'HIFU', $2, 'confirmed', $3, $3) RETURNING id`,
      [c!.id, new Date(t.clock.t + hoursAhead * 3600_000).toISOString(), new Date(t.clock.t).toISOString()],
    );
    const [r] = await t.db.query<{ id: string }>(
      `INSERT INTO visit_requests (reference, visit_id, customer_id, type, message, status, idempotency_key, created_at, updated_at) VALUES ('NB-R1', $1, $2, 'cancel', 'Sick', 'submitted', 'k1', $3, $3) RETURNING id`,
      [v!.id, c!.id, new Date(t.clock.t).toISOString()],
    );
    return { customerId: c!.id, requestId: r!.id };
  }

  it('request detail shows the late rule and the Fresha instruction; transition is audited', async () => {
    const t = await opsSetup();
    await t.signIn(...CUSTOMER);
    const desk = await t.signIn(...DESK, 'Front desk');
    const { requestId } = await seedRequest(t, CUSTOMER[1], 10);
    const today = (await t.req('GET', '/v1/staff/today', desk)).json();
    expect(today).toMatchObject({ bookingMode: 'handoff', synced: false });
    expect(today.requests[0]).toMatchObject({ id: requestId, late: true, type: 'cancel' });
    const detail = (await t.req('GET', `/v1/staff/requests/${requestId}`, desk)).json();
    expect(detail.late).toBe(true);
    expect(detail.lateRule).toMatch(/less than 48 hours/);
    expect(detail.customer.phone).not.toContain('6045550123');
    expect((await t.req('POST', `/v1/staff/requests/${requestId}/transition`, desk, { to: 'approved' })).statusCode).toBe(200);
    expect((await t.req('POST', `/v1/staff/requests/${requestId}/transition`, desk, { to: 'done' })).statusCode).toBe(200);
  });

  it('customer search and profile mask the phone and show only real value', async () => {
    const t = await opsSetup();
    const customer = await t.signIn(...CUSTOMER);
    await t.req('PUT', '/v1/me/profile', customer, { firstName: 'Maria', lastName: 'Lopez', email: null });
    const desk = await t.signIn(...DESK, 'Front desk');
    const rows = (await t.req('GET', '/v1/staff/customers?q=maria', desk)).json();
    expect(rows).toHaveLength(1);
    expect((await t.req('GET', '/v1/staff/customers?q=0123', desk)).json()).toHaveLength(1);
    // Staff accounts don't show up as customers.
    expect((await t.req('GET', '/v1/staff/customers?q=frontdesk', desk)).json()).toHaveLength(0);
    const profile = (await t.req('GET', `/v1/staff/customers/${rows[0].id}`, desk)).json();
    expect(profile).toMatchObject({ name: 'Maria Lopez', value: [], visits: [], offers: false });
    expect(profile.phone).not.toContain('6045550123');
  });

  it('inbox reply goes out by text, lands in the customer inbox, and a failed send is shown as failed', async () => {
    const t = await opsSetup();
    const customer = await t.signIn(...CUSTOMER);
    const desk = await t.signIn(...DESK, 'Front desk');
    await t.req('POST', '/v1/support/questions', customer, { topic: 'Unwanted hair', channel: 'text', message: 'Is laser OK for tanned skin?', idempotencyKey: 'key-0001' });
    const [row] = (await t.req('GET', '/v1/staff/inbox', desk)).json();
    expect(row).toMatchObject({ status: 'new', customer: 'Client' });
    const reply = { message: 'Yes, after a patch test.', channel: 'text', idempotencyKey: 'reply-0001' };
    const thread = (await t.req('POST', `/v1/staff/inbox/${row.id}/replies`, desk, reply)).json();
    expect(thread).toMatchObject({ status: 'waiting', replies: [{ delivery: 'sent', channel: 'text' }] });
    // Same key again: no second message.
    expect((await t.req('POST', `/v1/staff/inbox/${row.id}/replies`, desk, reply)).json().replies).toHaveLength(1);
    expect(t.dev.outbox.filter((m) => m.template === 'NTF-10.support_reply')).toHaveLength(1);
    const inbox = (await t.req('GET', '/v1/me/inbox', customer)).json();
    expect(JSON.stringify(inbox)).toContain('The clinic replied');

    t.clock.t += 1000;
    const send = t.dev.integrations.messages.send;
    t.dev.integrations.messages.send = async () => {
      throw new Error('down');
    };
    const failed = (await t.req('POST', `/v1/staff/inbox/${row.id}/replies`, desk, { ...reply, idempotencyKey: 'reply-0002' })).json();
    t.dev.integrations.messages.send = send;
    expect(failed.replies[1].delivery).toBe('failed');
    expect((await t.req('PUT', `/v1/staff/inbox/${row.id}/status`, desk, { status: 'done' })).json().status).toBe('done');
  });
});

describe('push composer and reports (STF-35/37)', () => {
  it('push goes only to opted-in customers; nobody opted in = refused', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const customer = await t.signIn(...CUSTOMER);
    const msg = { text: 'Winter glow is back: 20% off facials.', opens: '/offers/cmp_halloween', sendAt: null, idempotencyKey: 'push-0001' };
    expect((await t.req('POST', '/v1/staff/push', owner, msg)).statusCode).toBe(409);
    await t.req('POST', '/v1/me/consents', customer, { terms: true, transactional: true, marketing: true });
    expect((await t.req('GET', '/v1/staff/push', owner)).json().audience).toBe(1);
    const p = (await t.req('POST', '/v1/staff/push', owner, msg)).json();
    expect(p).toMatchObject({ status: 'scheduled', audienceCount: 1 });
    expect((await t.req('POST', '/v1/staff/push', owner, msg)).json().id).toBe(p.id);
    expect((await t.req('POST', `/v1/staff/push/${p.id}/cancel`, owner, { version: p.version })).json().status).toBe('cancelled');
    await t.req('POST', '/v1/me/consents', customer, { terms: true, transactional: true, marketing: false });
    expect((await t.req('GET', '/v1/staff/push', owner)).json().audience).toBe(0);
  });

  it('reports use real counts and say which metrics aren’t measured', async () => {
    const t = await opsSetup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const desk = await t.signIn(...DESK, 'Front desk');
    expect((await t.req('GET', '/v1/staff/reports', desk)).statusCode).toBe(403);
    const r = (await t.req('GET', '/v1/staff/reports?period=week', owner)).json();
    expect(r).toMatchObject({ bookingsStarted: { value: 0, unavailable: null }, bookingsCompleted: { value: null }, giftCards: { count: 0, cents: 0 } });
    expect(r.bookingsCompleted.unavailable).toMatch(/Fresha/);
    for (const c of r.campaigns) expect(c.views.value).toBeNull();
  });
});

describe('gift-card staff actions (STF-18)', () => {
  async function paidGift(t: Awaited<ReturnType<typeof opsSetup>>, buyer: string) {
    const o = (await t.req('POST', '/v1/orders', buyer, { kind: 'gift', gift: { design: 'birthday', amountCents: 10000, recipientName: 'Sara', recipientPhone: '6045550177', message: null, sendAt: null }, idempotencyKey: 'order-key-1' })).json();
    const a = (await t.req('POST', `/v1/orders/${o.id}/attempts`, buyer, { method: 'card', idempotencyKey: 'attempt-key-1' })).json();
    await t.req('POST', `/v1/payments/attempts/${a.id}/confirm`, buyer, { paymentToken: 'tok_visa' });
    const [g] = await t.db.query<{ id: string }>(`SELECT id FROM wallet_instruments WHERE kind = 'gift_card'`);
    return g!.id;
  }

  it('change recipient sends a new code; void refunds the unused value and stops the card', async () => {
    const t = await opsSetup();
    const buyer = await t.signIn(...CUSTOMER);
    const desk = await t.signIn(...DESK, 'Front desk');
    const owner = await t.signIn(...OWNER, 'Owner');
    const id = await paidGift(t, buyer);
    const before = (await t.req('GET', `/v1/staff/gifts/${id}`, desk)).json();
    expect(before).toMatchObject({ delivery: 'sent', remainingCents: 10000, refundableCents: 10000, claimed: false });
    // A reason is required, and staff can't redirect a card to their own number.
    expect((await t.req('POST', `/v1/staff/gifts/${id}/recipient`, desk, { idempotencyKey: 'gift-act-00', recipientName: 'Lea', recipientPhone: '6045550188' })).statusCode).toBe(400);
    expect((await t.req('POST', `/v1/staff/gifts/${id}/recipient`, desk, { idempotencyKey: 'gift-act-00', recipientName: 'Me', recipientPhone: DESK[0], reason: 'Wrong number' })).statusCode).toBe(403);
    const changed = (await t.req('POST', `/v1/staff/gifts/${id}/recipient`, desk, { idempotencyKey: 'gift-act-01', recipientName: 'Lea', recipientPhone: '6045550188', reason: 'Buyer asked' })).json();
    expect(changed.recipientName).toBe('Lea');
    expect(changed.reference).not.toBe(before.reference);
    expect(t.dev.outbox.filter((m) => m.template === 'NTF-07.gift_received').map((m) => m.to)).toEqual(['+16045550177', '+16045550188']);
    // Front desk can't void; void needs a reason.
    expect((await t.req('POST', `/v1/staff/gifts/${id}/void`, desk, { idempotencyKey: 'gift-act-02', reason: 'Lost' })).json().error.missingPermission).toBe('giftcard.void');
    expect((await t.req('POST', `/v1/staff/gifts/${id}/void`, owner, { idempotencyKey: 'gift-act-02' })).statusCode).toBe(400);
    const voided = (await t.req('POST', `/v1/staff/gifts/${id}/void`, owner, { idempotencyKey: 'gift-act-02', reason: 'Bought by mistake', refund: true })).json();
    expect(voided).toMatchObject({ voided: true, remainingCents: 0, refundableCents: 0 });
    const [refund] = await t.db.query<{ amount_cents: number; status: string }>('SELECT amount_cents, status FROM refunds');
    expect(refund).toMatchObject({ amount_cents: 10000, status: 'succeeded' });
    // Old and new codes no longer work, and nothing can be redeemed.
    expect((await t.req('POST', `/v1/staff/gifts/${id}/resend`, desk, { idempotencyKey: 'gift-act-03' })).statusCode).toBe(409);
  });
});
