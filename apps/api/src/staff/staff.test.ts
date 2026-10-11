import { catalogSchema, importReviewSchema, otpVerifyResponseSchema, staffServiceSchema, type ServiceDraft } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';
import { onboard } from '../testOnboard';
import { parseCsv, parsePrice } from './routes';

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
const NEWBIE = ['7785550199', '+17785550199'] as const;
// Smallest valid JPEG header bytes are enough for the type check.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]).toString('base64');

async function setup() {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec(
    'TRUNCATE staff_invites, catalog_imports, media, approvals, balance_help_cases, ledger_entries, wallet_instruments, refunds, provider_events, payment_attempts, orders, privacy_requests, customer_preferences, notifications, visit_requests, booking_handoffs, visits, audit_entries, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, support_questions, promo_redemptions, legacy_match_cases, customers CASCADE;',
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
    const token = otpVerifyResponseSchema.parse((await req('POST', '/v1/auth/otp/verify', undefined, { challengeId, code: dev.otpSink.get(e164)! })).json()).accessToken;
    await onboard(db, e164);
    return token;
  }
  const service = async (token: string, id: string) => staffServiceSchema.parse((await req('GET', `/v1/staff/services/${id}`, token)).json());
  const catalog = async () => catalogSchema.parse((await req('GET', '/v1/catalog')).json());
  return { db, dev, clock, req, signIn, service, catalog };
}

const draftFor = (over: Partial<ServiceDraft> = {}): ServiceDraft => ({
  name: 'Winter facial',
  categoryId: 'skin-tightening',
  aliases: [],
  concerns: [],
  description: 'Hydrating facial.',
  price: { kind: 'fixed', amount: 180 },
  durationLabel: '60 min',
  durationMin: 60,
  photo: null,
  professionals: [],
  faq: [],
  care: [],
  visibility: 'live',
  ...over,
});

describe('staff access is server-enforced (D34, STF-14)', () => {
  it('customers and front desk get 403 with the missing permission; no session gets 401', async () => {
    const t = await setup();
    const customer = await t.signIn(...CUSTOMER);
    const desk = await t.signIn(...DESK, 'Front desk');
    const calls: [string, string, object?][] = [
      ['GET', '/v1/staff/services'],
      ['POST', '/v1/staff/services', { draft: draftFor() }],
      ['PUT', '/v1/staff/services/svc_hifu/draft', { version: 1, draft: draftFor() }],
      ['POST', '/v1/staff/services/svc_hifu/publish', { version: 1 }],
      ['POST', '/v1/staff/services/svc_hifu/archive', { version: 1 }],
      ['POST', '/v1/staff/categories', { name: 'Body' }],
      ['POST', '/v1/staff/media', { filename: 'a.jpg', contentType: 'image/jpeg', data: JPEG }],
      ['POST', '/v1/staff/imports', { filename: 'a.csv', csv: 'Name,Category,Price\nA,B,$1' }],
      ['GET', '/v1/staff/team'],
      ['GET', '/v1/staff/audit'],
    ];
    for (const [method, url, body] of calls) {
      for (const token of [customer, desk]) {
        const res = await t.req(method as 'GET', url, token, body);
        expect(res.statusCode, `${method} ${url}`).toBe(403);
        expect(res.json().error.missingPermission).toBeTruthy();
      }
      expect((await t.req(method as 'GET', url, undefined, body)).statusCode).toBe(401);
    }
    // Refused before the body is read: an unauthenticated oversized upload gets 401, not 413 or 400.
    expect((await t.req('POST', '/v1/staff/media', undefined, { filename: 'a.jpg', contentType: 'image/jpeg', data: 'A'.repeat(2_000_000) })).statusCode).toBe(401);
  });
});

describe('services: drafts, versions, publish (STF-02/03/09, D35)', () => {
  it('editor drafts and submits; stale saves get 409; the Owner approves; customers only ever see published content', async () => {
    const t = await setup();
    const editor = await t.signIn(...EDITOR, 'Editor');
    const owner = await t.signIn(...OWNER, 'Owner');
    const created = staffServiceSchema.parse((await t.req('POST', '/v1/staff/services', editor, { draft: draftFor() })).json());
    expect(created).toMatchObject({ state: 'draft', deletable: true, live: null });
    expect((await t.catalog()).services.some((s) => s.name === 'Winter facial')).toBe(false);

    const save = (version: number, over: Partial<ServiceDraft>) => t.req('PUT', `/v1/staff/services/${created.id}/draft`, editor, { version, draft: draftFor(over) });
    const v2 = staffServiceSchema.parse((await save(created.version, { price: { kind: 'fixed', amount: 160 } })).json());
    expect((await save(created.version, { price: { kind: 'fixed', amount: 999 } })).statusCode).toBe(409); // stale: no silent overwrite
    expect((await t.req('POST', `/v1/staff/services/${created.id}/publish`, editor, { version: v2.version })).statusCode).toBe(403); // an Editor never publishes
    // ST-3: an incomplete draft can't be submitted (the Owner could never approve it).
    const incomplete = staffServiceSchema.parse((await save(v2.version, { price: { kind: 'fixed', amount: 160 }, durationMin: null })).json());
    expect((await t.req('POST', `/v1/staff/services/${created.id}/submit`, editor, { version: incomplete.version })).statusCode).toBe(409);
    const v3 = staffServiceSchema.parse((await save(incomplete.version, { price: { kind: 'fixed', amount: 160 } })).json());
    const submitted = staffServiceSchema.parse((await t.req('POST', `/v1/staff/services/${created.id}/submit`, editor, { version: v3.version })).json());
    expect(submitted.state).toBe('review');

    const approvals = (await t.req('GET', '/v1/staff/approvals', owner)).json();
    expect(approvals.waiting).toEqual([expect.objectContaining({ itemName: 'Winter facial', submittedByMe: false })]);
    expect((await t.req('POST', `/v1/staff/approvals/${approvals.waiting[0].id}/decide`, owner, { decision: 'reject' })).statusCode).toBe(400); // reason required
    expect((await t.req('POST', `/v1/staff/approvals/${approvals.waiting[0].id}/decide`, owner, { decision: 'approve' })).json()).toEqual({ status: 'approved' });
    const live = (await t.catalog()).services.find((s) => s.name === 'Winter facial');
    expect(live).toMatchObject({ status: 'live', price: { kind: 'fixed', amount: 160 } });
    expect((await t.service(owner, created.id)).deletable).toBe(false);
  });

  it('Owner publishes after confirm; price changes keep customers on the live price until published; audit has before/after', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const hifu = await t.service(owner, 'svc_hifu');
    const edited = staffServiceSchema.parse(
      (await t.req('PUT', '/v1/staff/services/svc_hifu/draft', owner, { version: hifu.version, draft: { ...hifu.draft, price: { kind: 'from', amount: 320 } } })).json(),
    );
    expect(edited.highRiskChanges).toEqual(['price']);
    expect((await t.catalog()).services.find((s) => s.id === 'svc_hifu')!.price).toEqual({ kind: 'from', amount: 250 });
    const res = (await t.req('POST', '/v1/staff/services/svc_hifu/publish', owner, { version: edited.version })).json();
    expect(res.outcome).toBe('published');
    expect((await t.catalog()).services.find((s) => s.id === 'svc_hifu')!.price).toEqual({ kind: 'from', amount: 320 });
    const audit = await t.db.query<{ field: string; old_value: string; new_value: string; reason: string }>(
      `SELECT field, old_value, new_value, reason FROM audit_entries WHERE item = 'service:svc_hifu' AND reason = 'published'`,
    );
    expect(audit).toEqual([
      { field: 'price', old_value: '{"kind":"from","amount":250}', new_value: '{"kind":"from","amount":320}', reason: 'published' },
      { field: 'state', old_value: 'live', new_value: 'live', reason: 'published' },
    ]);
  });

  it('with a second approver on, a price change waits for someone other than the submitter', async () => {
    const t = await setup();
    await t.db.exec(`UPDATE app_settings SET settings = jsonb_set(settings, '{secondApprover,on}', 'true') WHERE id = 1;`);
    const owner = await t.signIn(...OWNER, 'Owner');
    const owner2 = await t.signIn(...OWNER2, 'Owner');
    const hifu = await t.service(owner, 'svc_hifu');
    const edited = staffServiceSchema.parse(
      (await t.req('PUT', '/v1/staff/services/svc_hifu/draft', owner, { version: hifu.version, draft: { ...hifu.draft, price: { kind: 'from', amount: 300 } } })).json(),
    );
    expect((await t.req('POST', '/v1/staff/services/svc_hifu/publish', owner, { version: edited.version })).json().outcome).toBe('waiting');
    expect((await t.catalog()).services.find((s) => s.id === 'svc_hifu')!.price).toEqual({ kind: 'from', amount: 250 });
    const [waiting] = (await t.req('GET', '/v1/staff/approvals', owner)).json().waiting;
    expect(waiting.summary).toBe('Price: from $250 → from $300');
    expect((await t.req('POST', `/v1/staff/approvals/${waiting.id}/decide`, owner, { decision: 'approve' })).statusCode).toBe(403);
    expect((await t.req('POST', `/v1/staff/approvals/${waiting.id}/decide`, owner2, { decision: 'reject', reason: 'Check with Naz first' })).json()).toEqual({ status: 'rejected' });
    expect((await t.service(owner, 'svc_hifu')).state).toBe('live'); // back to editing, still unpublished
    expect((await t.catalog()).services.find((s) => s.id === 'svc_hifu')!.price).toEqual({ kind: 'from', amount: 250 });
  });
});

describe('archive and delete rules (D36, STF-39)', () => {
  it('published services are archived, never deleted; restore returns a hidden draft; never-published drafts can be deleted', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const hifu = await t.service(owner, 'svc_hifu');
    expect((await t.req('POST', '/v1/staff/services/svc_hifu/delete', owner, { version: hifu.version })).statusCode).toBe(409);
    const archived = staffServiceSchema.parse((await t.req('POST', '/v1/staff/services/svc_hifu/archive', owner, { version: hifu.version })).json());
    expect(archived.state).toBe('archived');
    expect((await t.catalog()).services.find((s) => s.id === 'svc_hifu')!.status).toBe('archived'); // old links show TRT-07
    const restored = staffServiceSchema.parse((await t.req('POST', '/v1/staff/services/svc_hifu/restore', owner, { version: archived.version })).json());
    expect(restored.state).toBe('draft');
    expect((await t.catalog()).services.some((s) => s.id === 'svc_hifu')).toBe(false);
    const draft = staffServiceSchema.parse((await t.req('POST', '/v1/staff/services', owner, { draft: draftFor() })).json());
    expect((await t.req('POST', `/v1/staff/services/${draft.id}/archive`, owner, { version: draft.version })).statusCode).toBe(409);
    expect((await t.req('POST', `/v1/staff/services/${draft.id}/delete`, owner, { version: draft.version })).json()).toEqual({ deleted: true });
    const reasons = (await t.db.query<{ reason: string }>(`SELECT reason FROM audit_entries WHERE field = 'state' ORDER BY id`)).map((r) => r.reason);
    expect(reasons).toEqual(['archived', 'restored', 'created', 'deleted draft']);
  });

  it('a category with treatments can’t be archived until they move; customer-seen categories are archived, not deleted', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const cats = (await t.req('GET', '/v1/staff/categories', owner)).json();
    const laser = cats.find((c: { id: string }) => c.id === 'laser');
    const blocked = await t.req('POST', '/v1/staff/categories/laser/archive', owner, { version: laser.version });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.message).toMatch(/Move its 1 treatments/);
    const svc = await t.service(owner, 'svc_laser');
    await t.req('POST', '/v1/staff/services/svc_laser/move', owner, { version: svc.version, categoryId: 'skin-tightening' });
    expect((await t.req('POST', '/v1/staff/categories/laser/delete', owner, { version: laser.version })).statusCode).toBe(409); // seen by customers
    expect((await t.req('POST', '/v1/staff/categories/laser/archive', owner, { version: laser.version })).json()).toMatchObject({ archived: true });
    expect((await t.catalog()).categories.some((c) => c.id === 'laser')).toBe(false);
    const fresh = (await t.req('POST', '/v1/staff/categories', owner, { name: 'Body' })).json();
    expect((await t.req('PUT', `/v1/staff/categories/${fresh.id}`, owner, { version: fresh.version + 5, name: 'Body care' })).statusCode).toBe(409);
  });
});

describe('media library (STF-36)', () => {
  it('a photo is usable only with alt text and confirmed rights; in-use photos can’t be archived or deleted', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    expect((await t.req('POST', '/v1/staff/media', owner, { filename: 'fake.jpg', contentType: 'image/jpeg', data: Buffer.from('not an image').toString('base64') })).statusCode).toBe(400);
    const m = (await t.req('POST', '/v1/staff/media', owner, { filename: 'room.jpg', contentType: 'image/jpeg', data: JPEG })).json();
    expect(m).toMatchObject({ status: 'draft', rightsConfirmed: false });
    expect((await t.req('GET', `/v1/media/${m.id}`)).statusCode).toBe(404); // customers can't load drafts
    const hifu = await t.service(owner, 'svc_hifu');
    const withPhoto = staffServiceSchema.parse((await t.req('PUT', '/v1/staff/services/svc_hifu/draft', owner, { version: hifu.version, draft: { ...hifu.draft, photo: `media:${m.id}` } })).json());
    expect(withPhoto.missing).toEqual(['Add alt text and confirm rights for the photo']);
    expect((await t.req('POST', '/v1/staff/services/svc_hifu/publish', owner, { version: withPhoto.version })).statusCode).toBe(409);
    const ready = (await t.req('PUT', `/v1/staff/media/${m.id}`, owner, { version: m.version, altText: 'Treatment room with a bed', rightsConfirmed: true })).json();
    expect(ready).toMatchObject({ status: 'active', inUse: 1 });
    // ST-9: campaign and team photos count too.
    await t.db.query(`UPDATE campaigns SET photo = $1 WHERE id = 'cmp_halloween'`, [`media:${m.id}`]);
    await t.db.query(`UPDATE professionals SET photo = $1 WHERE id = (SELECT id FROM professionals LIMIT 1)`, [`media:${m.id}`]);
    const listed = (await t.req('GET', '/v1/staff/media', owner)).json();
    expect((Array.isArray(listed) ? listed : listed.items).find((x: { id: string }) => x.id === m.id).inUse).toBe(3);
    expect((await t.req('POST', '/v1/staff/services/svc_hifu/publish', owner, { version: withPhoto.version })).json().outcome).toBe('published');
    expect((await t.req('GET', `/v1/media/${m.id}`)).statusCode).toBe(200);
    expect((await t.req('POST', `/v1/staff/media/${m.id}/archive`, owner, { version: ready.version })).statusCode).toBe(409);
    // A photo in use can't lose its alt text or rights (the live service would show a broken image).
    expect((await t.req('PUT', `/v1/staff/media/${m.id}`, owner, { version: ready.version, altText: null, rightsConfirmed: true })).statusCode).toBe(409);
    // Only Media photos or bundled images: no arbitrary URLs.
    const cur = await t.service(owner, 'svc_hifu');
    expect((await t.req('PUT', '/v1/staff/services/svc_hifu/draft', owner, { version: cur.version, draft: { ...cur.draft, photo: 'https://tracker.example/p.png' } })).statusCode).toBe(400);
    expect((await t.req('POST', `/v1/staff/media/${m.id}/delete`, owner, { version: ready.version })).statusCode).toBe(409);
  });
});

describe('catalogue import (STF-41/42)', () => {
  const CSV = [
    'Service name,Category,Price,Time,Description',
    '"Filler (lips, 1 ml)",Injectables,$450,30,Lip filler',
    'Liposonix,Body,Consultation,,',
    'Laser Hair Removal,Laser,$55 per area,20,',
    'HydraFacial,Facials,$199,45,',
    'HydraFacial,Facials,$209,45,',
    ',Facials,$10,10,',
  ].join('\n');

  it('maps columns, classifies rows, blocks publish until duplicates are resolved, then publishes in a controlled way', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const job = (await t.req('POST', '/v1/staff/imports', owner, { filename: 'fresha-services-sep.csv', csv: CSV })).json();
    expect(job).toMatchObject({ rowCount: 6, missingRequired: [], mapping: { name: 'Service name', category: 'Category', price: 'Price', duration: 'Time', description: 'Description' } });
    const review = importReviewSchema.parse((await t.req('GET', `/v1/staff/imports/${job.id}/review`, owner)).json());
    expect(review.rows.map((r) => r.kind)).toEqual(['new', 'new', 'changed', 'new', 'duplicate', 'invalid']);
    expect(review.rows[2]!.detail).toBe('price $50 per area → $55 per area');
    expect((await t.req('POST', `/v1/staff/imports/${job.id}/publish`, owner)).statusCode).toBe(409);
    await t.req('PUT', `/v1/staff/imports/${job.id}/decisions`, owner, { decisions: { '4': 'skip' } });
    const done = importReviewSchema.parse((await t.req('POST', `/v1/staff/imports/${job.id}/publish`, owner)).json());
    expect(done.result).toEqual({ created: 3, updated: 1, skipped: 2, waiting: 0 });
    const c = await t.catalog();
    expect(c.services.find((s) => s.name === 'Filler (lips, 1 ml)')).toMatchObject({ status: 'live', price: { kind: 'fixed', amount: 450 }, durationMin: 30 });
    expect(c.categories.some((x) => x.name === 'Body')).toBe(true); // created on publish, audited
    expect((await t.req('POST', `/v1/staff/imports/${job.id}/publish`, owner)).statusCode).toBe(409); // not twice
  });

  it('an editor’s import becomes drafts in review; missing required columns are reported', async () => {
    const t = await setup();
    const editor = await t.signIn(...EDITOR, 'Editor');
    const bad = (await t.req('POST', '/v1/staff/imports', editor, { filename: 'x.csv', csv: 'Title,Fee\nA,$1' })).json();
    expect(bad.missingRequired).toEqual(['name', 'category', 'price']);
    expect((await t.req('GET', `/v1/staff/imports/${bad.id}/review`, editor)).statusCode).toBe(409);
    const job = (await t.req('POST', '/v1/staff/imports', editor, { filename: 'y.csv', csv: 'Name,Category,Price,Duration\nGlow peel,Laser,$120,30\nNew thing,Brand new category,$90,30' })).json();
    expect((await t.req('POST', `/v1/staff/imports/${job.id}/publish`, editor)).statusCode).toBe(403);
    const r = importReviewSchema.parse((await t.req('POST', `/v1/staff/imports/${job.id}/submit`, editor)).json());
    // A row that would need a new category is skipped: only someone who can publish creates categories.
    expect(r.result).toEqual({ created: 0, updated: 0, skipped: 1, waiting: 1 });
    expect((await t.catalog()).categories.some((c) => c.name === 'Brand new category')).toBe(false);
    expect((await t.catalog()).services.some((s) => s.name === 'Glow peel')).toBe(false);
  });

  it('an import never overwrites unpublished work or a waiting approval', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const editor = await t.signIn(...EDITOR, 'Editor');
    const laser = await t.service(editor, 'svc_laser');
    await t.req('PUT', '/v1/staff/services/svc_laser/draft', editor, { version: laser.version, draft: { ...laser.draft, description: 'Editor rewrite, not reviewed yet' } });
    const job = (await t.req('POST', '/v1/staff/imports', owner, { filename: 'p.csv', csv: 'Name,Category,Price\nLaser Hair Removal,Laser,$55 per area' })).json();
    const review = importReviewSchema.parse((await t.req('GET', `/v1/staff/imports/${job.id}/review`, owner)).json());
    expect(review.rows[0]).toMatchObject({ kind: 'conflict' });
    const done = importReviewSchema.parse((await t.req('POST', `/v1/staff/imports/${job.id}/publish`, owner)).json());
    expect(done.result).toEqual({ created: 0, updated: 0, skipped: 1, waiting: 0 });
    const after = await t.service(owner, 'svc_laser');
    expect(after.draft.description).toBe('Editor rewrite, not reviewed yet');
    expect((await t.catalog()).services.find((s) => s.id === 'svc_laser')!.price).toEqual({ kind: 'perUnit', amount: 50, unit: 'per area' });
  });

  it('rejects unreadable rows: BOM handled, long text, impossible durations, reversed ranges', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const csv = '\uFEFFName,Category,Price,Duration\nOK one,Laser,$10,30\nBad duration,Laser,$10,99999999999\nBad range,Laser,2024-05,30\n' + 'X'.repeat(90) + ',Laser,$10,30';
    const job = (await t.req('POST', '/v1/staff/imports', owner, { filename: 'q.csv', csv })).json();
    expect(job.mapping.name).toBe('Name');
    const review = importReviewSchema.parse((await t.req('GET', `/v1/staff/imports/${job.id}/review`, owner)).json());
    expect(review.rows.map((r) => r.kind)).toEqual(['new', 'invalid', 'invalid', 'invalid']);
  });

  it('parses CSV quoting and the common price formats', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ]);
    expect(parsePrice('From $250')).toEqual({ kind: 'from', amount: 250 });
    expect(parsePrice('$1,200')).toEqual({ kind: 'fixed', amount: 1200 });
    expect(parsePrice('$300–$500')).toEqual({ kind: 'range', min: 300, max: 500 });
    expect(parsePrice('Consultation first')).toEqual({ kind: 'consultation' });
    expect(parsePrice('tbd')).toBeNull();
    expect(parsePrice('$500–$300')).toBeNull();
    expect(parseCsv('\uFEFFa,b\n1,2\u0000')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('team and audit (STF-12/13/38)', () => {
  it('invite by number → access on sign-in; roles change; the last Owner stays; removal ends sessions; all audited', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const editor = await t.signIn(...EDITOR, 'Editor');
    expect((await t.req('POST', '/v1/staff/team/invites', owner, { phone: NEWBIE[0], roles: ['Editor'] })).json().some((m: { status: string }) => m.status === 'invited')).toBe(true);
    expect(t.dev.outbox.at(-1)).toMatchObject({ to: NEWBIE[1], template: 'staff_invite' });
    const newbie = await t.signIn(...NEWBIE);
    expect((await t.req('GET', '/v1/staff/services', newbie)).statusCode).toBe(200);
    const [{ id: ownerId }] = (await t.db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1', [OWNER[1]])) as [{ id: string }];
    expect((await t.req('PUT', `/v1/staff/team/${ownerId}/roles`, owner, { roles: ['Editor'] })).statusCode).toBe(409); // last Owner
    const [{ id: editorId }] = (await t.db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1', [EDITOR[1]])) as [{ id: string }];
    await t.req('POST', `/v1/staff/team/${editorId}/remove`, owner);
    expect((await t.req('GET', '/v1/staff/services', editor)).statusCode).toBe(401);
    const members = (await t.req('GET', '/v1/staff/team', owner)).json();
    expect(members.find((m: { id: string }) => m.id === editorId).status).toBe('removed');
    const log = (await t.req('GET', '/v1/staff/audit?days=1', owner)).json();
    expect(log.map((e: { reason: string }) => e.reason)).toEqual(expect.arrayContaining(['invited', 'invite accepted', 'access removed']));
    await expect(t.db.exec(`DELETE FROM audit_entries`)).rejects.toThrow(); // immutable
    // The only Owner can't delete their account and leave the clinic without one.
    t.clock.t += 31_000;
    const start = (await t.req('POST', '/v1/me/deletion/start', owner)).json();
    const res = await t.req('POST', '/v1/me/deletion', owner, { challengeId: start.challengeId, code: t.dev.otpSink.get(OWNER[1]) });
    expect(res.statusCode).toBe(409);
  });
});
