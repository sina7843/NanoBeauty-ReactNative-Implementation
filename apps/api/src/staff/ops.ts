import {
  clinicUpdateSchema,
  giftSettingsUpdateSchema,
  homeLayoutUpdateSchema,
  inboxStatusSchema,
  maskPhone,
  normalizePhone,
  pushCreateSchema,
  replySchema,
  rulesUpdateSchema,
  versionedSchema,
  type CustomerProfile,
  type HomeLayoutView,
  type InboxThread,
  type Reports,
  type RequestDetail,
  type Settings,
  type Today,
} from '@nano/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Queryable } from '../db';
import { HttpError } from '../errors';
import { notify } from '../visits/routes';
import { walletFor } from '../wallet/routes';
import { diffFields, iso, staffKit } from './kit';

const DAY = 24 * 3600_000;
const name = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(' ') || null;
const outcomeText: Record<Settings['lateCancelOutcome'], string> = { keepDeposit: 'the deposit is kept', credit: 'the deposit becomes clinic credit', none: 'no charge' };

type SettingsRow = { version: number; settings: Settings; features: { legacyMembership: boolean }; clinic: Record<string, unknown> };

/** NANO-08 settings (STF-17/31/32/34), front-desk operations (STF-23–30), push composer (STF-35) and reports (STF-37). */
export function registerOpsRoutes(app: FastifyInstance, { now }: { now: () => number }) {
  const { db, integrations } = app;
  const { auth, pre, audit, conflict } = staffKit(app, now);

  // ---------- Settings: one versioned row; every change bumps the version so apps refetch (no rebuild) ----------

  async function lockSettings(tx: Queryable, version: number): Promise<SettingsRow> {
    const [row] = await tx.query<SettingsRow>('SELECT version, settings, features, clinic FROM app_settings WHERE id = 1 FOR UPDATE');
    if (row!.version !== version) throw conflict();
    return row!;
  }
  async function saveSettings(tx: Queryable, request: FastifyRequest, before: SettingsRow, after: Omit<SettingsRow, 'version'>, reason: string) {
    const changes = [
      ...diffFields(before.settings, after.settings).map((c) => ({ ...c, field: `settings.${c.field}` })),
      ...diffFields(before.features, after.features).map((c) => ({ ...c, field: `features.${c.field}` })),
      ...diffFields(before.clinic, after.clinic).map((c) => ({ ...c, field: `clinic.${c.field}` })),
    ];
    if (!changes.length) return before.version;
    const [{ version }] = (await tx.query<{ version: number }>(
      'UPDATE app_settings SET settings = $1, features = $2, clinic = $3, version = version + 1, updated_at = $4 WHERE id = 1 RETURNING version',
      [JSON.stringify(after.settings), JSON.stringify(after.features), JSON.stringify(after.clinic), iso(now())],
    )) as [{ version: number }];
    for (const c of changes) await audit(tx, request, 'settings', c.field, c.old, c.new, reason);
    return version;
  }

  app.put('/v1/staff/settings/clinic', pre('clinic.manage'), async (request) => {
    const body = clinicUpdateSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const before = await lockSettings(tx, body.version);
      const clinic = { ...before.clinic, address: body.address, phone: body.phone, parking: body.parking, supportReplyTime: body.supportReplyTime };
      const version = await saveSettings(tx, request, before, { ...before, clinic, settings: { ...before.settings, clinicHours: body.clinicHours } }, 'clinic info');
      // STF-31: a new closure doesn't move anyone's booking; staff see who is affected and move them in Fresha.
      const tz = String(before.clinic.timezone ?? 'America/Vancouver');
      const closures = new Set(body.clinicHours?.closures ?? []);
      const added = [...closures].filter((d) => !(before.settings.clinicHours?.closures ?? []).includes(d));
      let affected = 0;
      if (added.length) {
        const visits = await tx.query<{ starts_at: Date }>(`SELECT starts_at FROM visits WHERE status IN ('confirmed', 'pending', 'changed') AND starts_at > $1`, [iso(now())]);
        const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
        affected = visits.filter((v) => added.includes(day(v.starts_at))).length;
      }
      const notice = added.length
        ? affected
          ? `${affected} visit${affected > 1 ? 's are' : ' is'} booked on a new closed day. Closing doesn’t cancel them; contact each client first.`
          : integrations.fresha.isConnected()
            ? 'No booked visits fall on the new closure.'
            : 'Bookings live in Fresha: check for visits on the new closure there.'
        : 'Support hub and contact pages show the new details now.';
      return { version, notice };
    });
  });

  app.put('/v1/staff/settings/rules', pre('rules.manage'), async (request) => {
    const body = rulesUpdateSchema.parse(request.body);
    // D33: there's no Fresha booking API, so in-app booking can't be switched on (NANO-09 owns the gate).
    if (body.settings.bookingMode === 'inapp') throw new HttpError(409, 'conflict', 'In-app booking needs a booking connection that doesn’t exist yet. It stays on hand-off to Fresha.');
    if (body.settings.slotHoldWarningMinutes >= body.settings.slotHoldMinutes) throw new HttpError(400, 'validation_failed', 'The hold warning must come before the hold ends.');
    return db.transaction(async (tx) => {
      const before = await lockSettings(tx, body.version);
      // Saving the rules confirms them: the Sample badges come off (A1–A8).
      const settings: Settings = { ...before.settings, ...body.settings, sample: false };
      const version = await saveSettings(tx, request, before, { ...before, settings, features: body.features }, 'rules and settings');
      // The switch is only half of it: the provider must really take the method too (PAY 14).
      const PROVIDER_ID: Record<string, string> = { card: 'card', applePay: 'apple_pay', googlePay: 'google_pay', klarna: 'klarna', affirm: 'affirm' };
      const offered = integrations.payments.capabilities() as string[];
      const missing = Object.entries(settings.paymentMethods)
        .filter(([m, on]) => on && !offered.includes(PROVIDER_ID[m]!))
        .map(([m]) => m);
      const notice = missing.length ? `Switched on but not offered by the payment provider, so customers won’t see: ${missing.join(', ')}.` : 'Applies to new bookings and purchases from now on.';
      return { version, notice };
    });
  });

  app.put('/v1/staff/settings/gifts', pre('giftcard.settings'), async (request) => {
    const body = giftSettingsUpdateSchema.parse(request.body);
    const [min, max] = body.gift.customRangeCAD;
    if (body.gift.presetsCAD.some((p) => p < min || p > max)) throw new HttpError(400, 'validation_failed', 'Preset amounts must be inside the custom range.');
    return db.transaction(async (tx) => {
      const before = await lockSettings(tx, body.version);
      const settings = { ...before.settings, gift: { ...body.gift, expiry: null }, giftRefundDays: body.giftRefundDays };
      const version = await saveSettings(tx, request, before, { ...before, settings }, 'gift card settings');
      return { version, notice: 'Cards already sold keep the amount and terms they were bought with.' };
    });
  });

  // ---------- Home layout (STF-34): at most two offers, staff-ordered; rating line on/off ----------

  async function homeLayout(tx: Queryable): Promise<HomeLayoutView> {
    const [s] = await tx.query<SettingsRow>('SELECT version, settings FROM app_settings WHERE id = 1');
    const rows = await tx.query<{ id: string; title: string; starts_at: Date; ends_at: Date; paused: boolean; home_rank: number | null }>(
      `SELECT id, title, starts_at, ends_at, paused, home_rank FROM campaigns WHERE published AND archived_at IS NULL AND ends_at > $1 ORDER BY starts_at`,
      [iso(now())],
    );
    const t = now();
    return {
      version: s!.version,
      offers: rows
        .filter((r) => r.home_rank)
        .sort((a, b) => a.home_rank! - b.home_rank!)
        .map((r) => r.id),
      ratingLine: s!.settings.ratingLine.on,
      candidates: rows.map((r) => ({ id: r.id, title: r.title, phase: r.paused ? 'paused' : r.starts_at.getTime() > t ? 'scheduled' : 'live', endsAt: r.ends_at.toISOString() })),
    };
  }
  app.get('/v1/staff/home-layout', pre('selling.draft'), async () => homeLayout(db));
  app.put('/v1/staff/home-layout', pre('selling.publish'), async (request) => {
    const body = homeLayoutUpdateSchema.parse(request.body);
    if (new Set(body.offers).size !== body.offers.length) throw new HttpError(400, 'validation_failed', 'Choose two different offers.');
    return db.transaction(async (tx) => {
      const before = await lockSettings(tx, body.version);
      const current = await homeLayout(tx);
      const allowed = new Set(current.candidates.map((c) => c.id));
      if (body.offers.some((id) => !allowed.has(id))) throw new HttpError(409, 'conflict', 'Only published offers that haven’t ended can go on Home.');
      await tx.query('UPDATE campaigns SET home_rank = NULL WHERE home_rank IS NOT NULL');
      for (const [i, id] of body.offers.entries()) await tx.query('UPDATE campaigns SET home_rank = $2 WHERE id = $1', [id, i + 1]);
      if (JSON.stringify(current.offers) !== JSON.stringify(body.offers)) await audit(tx, request, 'home', 'offers', current.offers.join(', ') || null, body.offers.join(', ') || null, 'home layout');
      const settings = { ...before.settings, ratingLine: { ...before.settings.ratingLine, on: body.ratingLine } };
      let version = await saveSettings(tx, request, before, { ...before, settings }, 'home layout');
      // Home order changed without a settings change: still bump so apps refetch Home.
      if (version === before.version && JSON.stringify(current.offers) !== JSON.stringify(body.offers)) {
        [{ version }] = (await tx.query<{ version: number }>('UPDATE app_settings SET version = version + 1, updated_at = $1 WHERE id = 1 RETURNING version', [iso(now())])) as [{ version: number }];
      }
      return { ...(await homeLayout(tx)), version };
    });
  });

  // ---------- Today and requests (STF-23/24) ----------

  async function clinicTz() {
    const [s] = await db.query<SettingsRow>('SELECT settings, clinic FROM app_settings WHERE id = 1');
    return { tz: String(s!.clinic.timezone ?? 'America/Vancouver'), settings: s!.settings };
  }
  const isLate = (visitAt: Date, requestedAt: Date, hours: number) => visitAt.getTime() - requestedAt.getTime() < hours * 3600_000;

  app.get('/v1/staff/today', pre('today.view'), async (): Promise<Today> => {
    const { tz, settings } = await clinicTz();
    const t = now();
    const day = (d: Date | number) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz });
    // Visits the app knows about (in-app bookings or Fresha read-back). Without a read-back, Fresha is the diary.
    const visits = await db.query<{ id: string; starts_at: Date; service_name: string; professional_name: string | null; status: string; first_name: string | null; last_name: string | null }>(
      `SELECT v.id, v.starts_at, v.service_name, v.professional_name, v.status, c.first_name, c.last_name FROM visits v JOIN customers c ON c.id = v.customer_id
        WHERE v.starts_at BETWEEN $1 AND $2 ORDER BY v.starts_at`,
      [iso(t - DAY), iso(t + 2 * DAY)],
    );
    const requests = await db.query<{ id: string; reference: string; type: 'change' | 'cancel'; status: string; message: string; created_at: Date; starts_at: Date; first_name: string | null; last_name: string | null }>(
      `SELECT r.id, r.reference, r.type, r.status, r.message, r.created_at, v.starts_at, c.first_name, c.last_name
         FROM visit_requests r JOIN visits v ON v.id = r.visit_id JOIN customers c ON c.id = r.customer_id
        WHERE r.status IN ('submitted', 'in_progress', 'call_needed', 'approved') ORDER BY r.created_at`,
    );
    return {
      bookingMode: settings.bookingMode,
      synced: integrations.fresha.isConnected(),
      visits: visits
        .filter((v) => day(v.starts_at) === day(t))
        .map((v) => ({ id: v.id, at: v.starts_at.toISOString(), customer: name(v.first_name, v.last_name) ?? 'Client', service: v.service_name, professional: v.professional_name, status: v.status })),
      requests: requests.map((r) => ({
        id: r.id,
        reference: r.reference,
        customer: name(r.first_name, r.last_name) ?? 'Client',
        type: r.type,
        status: r.status,
        message: r.message,
        visitAt: r.starts_at.toISOString(),
        late: isLate(r.starts_at, r.created_at, settings.freeChangeHours),
        createdAt: r.created_at.toISOString(),
      })),
    };
  });

  app.get('/v1/staff/requests/:id', pre('requests.manage'), async (request): Promise<RequestDetail> => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const [r] = await db.query<{
      id: string;
      reference: string;
      type: 'change' | 'cancel';
      status: RequestDetail['status'];
      message: string;
      created_at: Date;
      customer_id: string;
      first_name: string | null;
      last_name: string | null;
      phone_e164: string;
      external_ref: string;
      service_name: string;
      starts_at: Date;
      source: string;
      professional_name: string | null;
    }>(
      `SELECT r.id, r.reference, r.type, r.status, r.message, r.created_at, r.customer_id, c.first_name, c.last_name, c.phone_e164,
              v.external_ref, v.service_name, v.starts_at, v.source, v.professional_name
         FROM visit_requests r JOIN visits v ON v.id = r.visit_id JOIN customers c ON c.id = r.customer_id WHERE r.id = $1`,
      [id],
    );
    if (!r) throw new HttpError(404, 'not_found', 'Request not found.');
    const { settings } = await clinicTz();
    const [{ n }] = (await db.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM visits WHERE customer_id = $1 AND status = 'completed'`, [r.customer_id])) as [{ n: string }];
    const late = isLate(r.starts_at, r.created_at, settings.freeChangeHours);
    const outcome = r.type === 'cancel' ? settings.lateCancelOutcome : settings.lateChangeOutcome;
    return {
      id: r.id,
      reference: r.reference,
      type: r.type,
      status: r.status,
      message: r.message,
      createdAt: r.created_at.toISOString(),
      customer: { id: r.customer_id, name: name(r.first_name, r.last_name) ?? 'Client', phone: maskPhone(r.phone_e164), pastVisits: Number(n) },
      visit: { ref: r.external_ref, service: r.service_name, at: r.starts_at.toISOString(), source: r.source, professional: r.professional_name },
      late,
      lateRule: late
        ? `Asked less than ${settings.freeChangeHours} hours before the visit: ${outcomeText[outcome]}.`
        : `Asked more than ${settings.freeChangeHours} hours before the visit: free to ${r.type === 'cancel' ? 'cancel' : 'change'}.`,
      freshaUrl: integrations.fresha.handoffUrl(),
    };
  });

  // ---------- Customers (STF-26/27/28) ----------

  app.get('/v1/staff/customers', pre('customers.view'), async (request) => {
    const { q } = z.object({ q: z.string().trim().max(60).default('') }).parse(request.query);
    const phone = normalizePhone(q);
    const digits = q.replace(/\D/g, '');
    const term = q.toLowerCase();
    const rows = await db.query<{ id: string; first_name: string | null; last_name: string | null; phone_e164: string; last_visit: Date | null }>(
      `SELECT c.id, c.first_name, c.last_name, c.phone_e164, (SELECT MAX(starts_at) FROM visits v WHERE v.customer_id = c.id AND v.starts_at <= $4) AS last_visit
         FROM customers c
        WHERE c.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM staff_roles s WHERE s.customer_id = c.id)
          AND ($1 = '' OR c.phone_e164 = $2 OR (length($3) >= 4 AND c.phone_e164 LIKE '%' || $3)
               OR position($1 in lower(CONCAT(c.first_name, ' ', c.last_name))) > 0)
        ORDER BY c.updated_at DESC LIMIT 30`,
      [term, phone ?? '', digits, iso(now())],
    );
    return rows.map((c) => ({ id: c.id, name: name(c.first_name, c.last_name), phone: maskPhone(c.phone_e164), lastVisit: c.last_visit?.toISOString() ?? null }));
  });

  app.get('/v1/staff/customers/:id', pre('customers.view'), async (request): Promise<CustomerProfile> => {
    const seesInbox = auth(request).permissions.includes('inbox.manage');
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const [c] = await db.query<{ id: string; first_name: string | null; last_name: string | null; phone_e164: string; email: string | null; created_at: Date }>(
      'SELECT id, first_name, last_name, phone_e164, email, created_at FROM customers WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (!c) throw new HttpError(404, 'not_found', 'Customer not found.');
    const [consent] = await db.query<{ granted: boolean }>(`SELECT granted FROM consents WHERE customer_id = $1 AND purpose = 'marketing' ORDER BY recorded_at DESC, id DESC LIMIT 1`, [id]);
    const visits = await db.query<{ external_ref: string; service_name: string; starts_at: Date; status: string; professional_name: string | null }>(
      'SELECT external_ref, service_name, starts_at, status, professional_name FROM visits WHERE customer_id = $1 ORDER BY starts_at DESC LIMIT 20',
      [id],
    );
    const value = (await walletFor(db, id, now())).filter((i) => i.role === 'owner' && i.status === 'active');
    const [match] = await db.query<{ id: string; reference: string; state: string; decision: string }>(
      `SELECT id, reference, state, decision FROM legacy_match_cases WHERE customer_id = $1 AND status = 'awaiting_clinic' LIMIT 1`,
      [id],
    );
    const [q] = await db.query<{ message: string }>('SELECT message FROM support_questions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    return {
      id: c.id,
      name: name(c.first_name, c.last_name),
      phone: maskPhone(c.phone_e164),
      email: c.email,
      since: c.created_at.toISOString(),
      offers: consent?.granted ?? false,
      visits: visits.map((v) => ({ ref: v.external_ref, service: v.service_name, at: v.starts_at.toISOString(), status: v.status, professional: v.professional_name })),
      value: value.map((i) => ({
        id: i.id,
        label: i.label,
        value: i.sessions ? `${i.sessions.remaining} of ${i.sessions.total} sessions` : money(i.balanceCents ?? 0),
      })),
      openMatchCase: match ?? null,
      // Support messages are inbox data: shown only to roles that handle the inbox.
      lastMessage: seesInbox ? (q?.message ?? null) : null,
    };
  });

  // STF-28: the clinic compares the new account with the old app's record. Read-only; nothing moves here.
  app.get('/v1/staff/match-cases/:id', pre('accountMatch.resolve'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const [m] = await db.query<{ id: string; reference: string; status: string; decision: string; phone_e164: string; first_name: string | null; last_name: string | null }>(
      `SELECT m.id, m.reference, m.status, m.decision, c.phone_e164, c.first_name, c.last_name FROM legacy_match_cases m JOIN customers c ON c.id = m.customer_id WHERE m.id = $1`,
      [id],
    );
    if (!m) throw new HttpError(404, 'not_found', 'Case not found.');
    const found = await integrations.legacy.findByPhone(m.phone_e164);
    const record = found.status === 'found' ? found.record : null;
    const fullName = name(m.first_name, m.last_name);
    return {
      id: m.id,
      reference: m.reference,
      status: m.status,
      decision: m.decision,
      newRecord: { name: fullName, phone: maskPhone(m.phone_e164) },
      oldRecord: record ? { name: `${record.firstName} ${record.lastName}`, phone: maskPhone(m.phone_e164), items: record.items } : null,
      sameName: !!record && (fullName ?? '').trim().toLowerCase() === `${record.firstName} ${record.lastName}`.toLowerCase(),
    };
  });

  // ---------- Support inbox (STF-29/30) ----------

  type QuestionRow = { id: string; reference: string; customer_id: string; topic: string; channel: 'text' | 'email' | 'app'; message: string; status: 'new' | 'in_progress' | 'waiting' | 'done'; created_at: Date; first_name: string | null; last_name: string | null };
  const QUESTION_SQL = `SELECT q.*, c.first_name, c.last_name FROM support_questions q JOIN customers c ON c.id = q.customer_id`;
  const toRow = (q: QuestionRow) => ({
    id: q.id,
    reference: q.reference,
    customer: name(q.first_name, q.last_name) ?? 'Client',
    topic: q.topic,
    status: q.status,
    preview: q.message.slice(0, 120),
    createdAt: q.created_at.toISOString(),
  });
  async function thread(id: string): Promise<InboxThread> {
    const [q] = await db.query<QuestionRow>(`${QUESTION_SQL} WHERE q.id = $1`, [id]);
    if (!q) throw new HttpError(404, 'not_found', 'Message not found.');
    const replies = await db.query<{ id: string; message: string; channel: 'text' | 'email' | 'app'; delivery: 'pending' | 'sent' | 'failed'; created_at: Date; first_name: string | null }>(
      'SELECT r.id, r.message, r.channel, r.delivery, r.created_at, c.first_name FROM support_replies r LEFT JOIN customers c ON c.id = r.author_id WHERE r.question_id = $1 ORDER BY r.created_at',
      [id],
    );
    return {
      ...toRow(q),
      customerId: q.customer_id,
      channel: q.channel,
      message: q.message,
      replies: replies.map((r) => ({ id: r.id, message: r.message, channel: r.channel, delivery: r.delivery, createdAt: r.created_at.toISOString(), by: r.first_name ?? 'Clinic' })),
    };
  }

  app.get('/v1/staff/inbox', pre('inbox.manage'), async (request) => {
    const { status } = z.object({ status: z.enum(['open', 'done', 'all']).default('open') }).parse(request.query);
    const where = status === 'open' ? `WHERE q.status <> 'done'` : status === 'done' ? `WHERE q.status = 'done'` : '';
    return (await db.query<QuestionRow>(`${QUESTION_SQL} ${where} ORDER BY q.created_at DESC LIMIT 100`)).map(toRow);
  });
  app.get('/v1/staff/inbox/:id', pre('inbox.manage'), async (request) => thread(z.object({ id: z.uuid() }).parse(request.params).id));

  app.put('/v1/staff/inbox/:id/status', pre('inbox.manage'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { status } = inboxStatusSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const [q] = await tx.query<{ status: string }>('SELECT status FROM support_questions WHERE id = $1 FOR UPDATE', [id]);
      if (!q) throw new HttpError(404, 'not_found', 'Message not found.');
      if (q.status === status) return;
      await tx.query('UPDATE support_questions SET status = $2 WHERE id = $1', [id, status]);
      await audit(tx, request, `support:${id}`, 'status', q.status, status, null);
    });
    return thread(id);
  });

  // A reply goes out the way the customer asked to hear back; a failed send is shown, never reported as sent.
  app.post('/v1/staff/inbox/:id/replies', { ...pre('inbox.manage'), config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = replySchema.parse(request.body);
    const ctx = auth(request);
    const [q] = await db.query<QuestionRow & { phone_e164: string; email: string | null }>(
      `SELECT q.*, c.phone_e164, c.email, c.first_name, c.last_name FROM support_questions q JOIN customers c ON c.id = q.customer_id WHERE q.id = $1 AND c.deleted_at IS NULL`,
      [id],
    );
    if (!q) throw new HttpError(404, 'not_found', 'Message not found.');
    if (body.channel === 'email' && !q.email) throw new HttpError(409, 'conflict', 'This customer has no email address: reply by text or in the app.');
    // Claim the key first: a double tap or a retry finds the row and sends nothing more.
    const [claimed] = await db.query<{ id: string }>(
      `INSERT INTO support_replies (question_id, author_id, channel, message, delivery, idempotency_key, created_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [id, ctx.customerId, body.channel, body.message, `${id}:${body.idempotencyKey}`, iso(now())],
    );
    if (!claimed) return thread(id);
    let delivery: 'sent' | 'failed' = 'sent';
    if (body.channel !== 'app') {
      delivery = await integrations.messages
        .send({ channel: body.channel === 'text' ? 'sms' : 'email', to: body.channel === 'text' ? q.phone_e164 : q.email!, template: 'NTF-10.support_reply', data: { reference: q.reference, message: body.message } })
        .then(
          () => 'sent' as const,
          () => 'failed' as const,
        );
    }
    await db.transaction(async (tx) => {
      await tx.query('UPDATE support_replies SET delivery = $2 WHERE id = $1', [claimed.id, delivery]);
      if (delivery === 'sent') {
        // Every reply also lands in the customer's in-app inbox (NTF-10).
        await notify(tx, { audience: 'customer', customerId: q.customer_id, template: 'NTF-10.support_reply', data: { reference: q.reference, message: body.message }, now: now() });
        if (q.status !== 'done') await tx.query(`UPDATE support_questions SET status = 'waiting' WHERE id = $1`, [id]);
      }
      await audit(tx, request, `support:${id}`, 'reply', null, delivery, body.channel);
    });
    return thread(id);
  });

  // ---------- Marketing push (STF-35): only customers whose latest marketing choice is "yes" ----------

  const AUDIENCE_SQL = `SELECT COUNT(*)::text AS n FROM (
      SELECT DISTINCT ON (k.customer_id) k.customer_id, k.granted FROM consents k JOIN customers c ON c.id = k.customer_id
       WHERE k.purpose = 'marketing' AND c.deleted_at IS NULL ORDER BY k.customer_id, k.recorded_at DESC, k.id DESC) latest WHERE granted`;
  const audience = async (tx: Queryable) => Number(((await tx.query<{ n: string }>(AUDIENCE_SQL)) as [{ n: string }])[0].n);
  type PushRow = { id: string; text: string; opens: string; send_at: Date; audience_count: number; status: 'scheduled' | 'cancelled' | 'sent'; version: number };
  const toPush = (p: PushRow) => ({ id: p.id, text: p.text, opens: p.opens, sendAt: p.send_at.toISOString(), audienceCount: p.audience_count, status: p.status, version: p.version });

  app.get('/v1/staff/push', pre('push.send'), async () => ({
    audience: await audience(db),
    messages: (await db.query<PushRow>('SELECT * FROM push_messages ORDER BY send_at DESC LIMIT 50')).map(toPush),
  }));

  app.post('/v1/staff/push', pre('push.send'), async (request) => {
    const body = pushCreateSchema.parse(request.body);
    const t = now();
    const sendAt = body.sendAt ? Date.parse(body.sendAt) : t;
    if (sendAt < t - 60_000 || sendAt > t + 90 * DAY) throw new HttpError(400, 'validation_failed', 'Choose a send time within the next 90 days.');
    return db.transaction(async (tx) => {
      const [dup] = await tx.query<PushRow>('SELECT * FROM push_messages WHERE idempotency_key = $1', [body.idempotencyKey]);
      if (dup) return toPush(dup);
      const n = await audience(tx);
      if (!n) throw new HttpError(409, 'conflict', 'Nobody has said yes to offers yet, so there is no one to send this to.');
      const [p] = await tx.query<PushRow>(
        `INSERT INTO push_messages (text, opens, send_at, audience_count, status, created_by, idempotency_key, created_at) VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, $7) RETURNING *`,
        [body.text, body.opens, iso(Math.max(sendAt, t)), n, auth(request).customerId, body.idempotencyKey, iso(t)],
      );
      await audit(tx, request, `push:${p!.id}`, 'status', null, 'scheduled', `${n} opted-in customers`);
      return toPush(p!);
    });
  });

  app.post('/v1/staff/push/:id/cancel', pre('push.send'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const [p] = await tx.query<PushRow>('SELECT * FROM push_messages WHERE id = $1 FOR UPDATE', [id]);
      if (!p) throw new HttpError(404, 'not_found', 'Message not found.');
      if (p.version !== version) throw conflict();
      if (p.status !== 'scheduled') throw new HttpError(409, 'conflict', 'Only a scheduled message can be cancelled.');
      const [after] = await tx.query<PushRow>(`UPDATE push_messages SET status = 'cancelled', version = version + 1 WHERE id = $1 RETURNING *`, [id]);
      await audit(tx, request, `push:${id}`, 'status', 'scheduled', 'cancelled', null);
      return toPush(after!);
    });
  });

  // ---------- Reports (STF-37): real server data only; what we can't measure says so ----------

  app.get('/v1/staff/reports', pre('reports.view'), async (request): Promise<Reports> => {
    const { period } = z.object({ period: z.enum(['week', 'month', 'all']).default('month') }).parse(request.query);
    const t = now();
    const from = period === 'all' ? null : iso(t - (period === 'week' ? 7 : 30) * DAY);
    const since = from ?? '1970-01-01T00:00:00Z';
    const one = async (sql: string) => Number(((await db.query<{ n: string }>(sql, [since])) as [{ n: string }])[0].n);
    const sales = async (kind: 'gift' | 'package') => {
      const [r] = await db.query<{ n: string; cents: string }>(`SELECT COUNT(*)::text AS n, COALESCE(SUM(amount_cents), 0)::text AS cents FROM orders WHERE kind = $2 AND paid_at >= $1`, [since, kind]);
      return { count: Number(r!.n), cents: Number(r!.cents) };
    };
    const connected = integrations.fresha.isConnected();
    const campaigns = await db.query<{ id: string; title: string }>(`SELECT id, title FROM campaigns WHERE published_at IS NOT NULL AND ends_at >= $1 ORDER BY starts_at DESC LIMIT 20`, [since]);
    const notMeasured = { value: null, unavailable: 'Not measured yet: offer views and taps are recorded once analytics is on (NANO-09).' };
    return {
      period,
      from,
      bookingsStarted: { value: await one(`SELECT COUNT(*)::text AS n FROM booking_handoffs WHERE created_at >= $1`), unavailable: null },
      bookingsCompleted: connected
        ? { value: await one(`SELECT COUNT(*)::text AS n FROM visits WHERE status = 'completed' AND starts_at >= $1`), unavailable: null }
        : { value: null, unavailable: 'Bookings are made in Fresha and there is no read-back yet, so completed visits can’t be counted here.' },
      giftCards: await sales('gift'),
      packages: await sales('package'),
      refundsCents: await one(`SELECT COALESCE(SUM(amount_cents), 0)::text AS n FROM refunds WHERE status = 'succeeded' AND updated_at >= $1`),
      promoCodes: (await db.query<{ code: string; n: string }>(`SELECT code, COUNT(*)::text AS n FROM promo_redemptions WHERE redeemed_at >= $1 GROUP BY code ORDER BY COUNT(*) DESC`, [since])).map((p) => ({
        code: p.code,
        uses: Number(p.n),
      })),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        views: notMeasured,
        taps: notMeasured,
        bookings: { value: null, unavailable: 'Bookings happen in Fresha, so they can’t be linked to an offer.' },
      })),
    };
  });

}
