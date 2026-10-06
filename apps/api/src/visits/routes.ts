import { randomBytes } from 'node:crypto';
import {
  handoffRequestSchema,
  visitRequestCreateSchema,
  visitRequestTransitionSchema,
  type HandoffStatus,
  type Visit,
  type VisitRequest,
  type VisitsResponse,
} from '@nano/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, type AuthContext } from '../auth/session';
import type { Queryable } from '../db';
import { toAreas } from '../content/routes';
import { HttpError } from '../errors';
import type { FreshaVisit } from '../integrations';

const iso = (ms: number) => new Date(ms).toISOString();
/** A hand-off link stays checkable for a day (relaunch, slow sync); after that the return check is just "not yet". */
const HANDOFF_TTL_MS = 24 * 3600_000;
/** How long the return check says "checking", from the first check after Fresha closes, before "not yet". */
const CHECKING_WINDOW_MS = 90_000;
/** Fresha is read at most this often per customer; the 3 s return-check polls answer from the last read. */
const SYNC_MIN_INTERVAL_MS = 15_000;
const OPEN_STATUSES = ['submitted', 'in_progress', 'call_needed'];

/** Staff transitions (STF-24). Declined and done are final. */
const TRANSITIONS: Record<string, readonly string[]> = {
  submitted: ['in_progress', 'approved', 'declined', 'call_needed', 'done'],
  in_progress: ['approved', 'declined', 'call_needed', 'done'],
  call_needed: ['in_progress', 'approved', 'declined', 'done'],
  approved: ['done'],
  declined: [],
  done: [],
};
/** Customer is told about these outcomes (BOOK 18); NTF-03 covers an approved change. */
const CUSTOMER_TEMPLATE: Record<string, string> = {
  approved: 'NTF-03.visit_request_approved',
  declined: 'visit_request_declined',
  call_needed: 'visit_request_call_needed',
};

type VisitRow = {
  id: string;
  external_ref: string;
  source: 'fresha_sync' | 'inapp';
  service_id: string | null;
  service_name: string;
  detail: string | null;
  professional_name: string | null;
  starts_at: Date;
  duration_min: number | null;
  status: Visit['status'];
  deposit_cad: string | null;
  first_seen_at: Date;
};
type RequestRow = {
  id: string;
  reference: string;
  visit_id: string;
  customer_id: string;
  type: VisitRequest['type'];
  status: VisitRequest['status'];
  message: string;
  decline_reason: string | null;
  created_at: Date;
};

const toRequest = (r: RequestRow): VisitRequest => ({
  id: r.id,
  reference: r.reference,
  visitId: r.visit_id,
  type: r.type,
  status: r.status,
  message: r.message,
  declineReason: r.decline_reason,
  createdAt: r.created_at.toISOString(),
});

const toVisit = (v: VisitRow, open: RequestRow | undefined): Visit => ({
  id: v.id,
  ref: v.external_ref,
  source: v.source,
  serviceId: v.service_id,
  serviceName: v.service_name,
  detail: v.detail,
  professional: v.professional_name,
  startsAt: v.starts_at.toISOString(),
  durationMin: v.duration_min,
  status: v.status,
  depositCAD: v.deposit_cad === null ? null : Number(v.deposit_cad),
  openRequest: open ? toRequest(open) : null,
});

/** Notification hook (spec 3): written to the outbox in the same transaction; NANO-09 delivers. */
export async function notify(
  db: Queryable,
  n: { audience: 'customer' | 'staff'; customerId?: string; permission?: string; template: string; data: Record<string, unknown>; now: number },
) {
  await db.query('INSERT INTO notifications (audience, customer_id, permission, template, data, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [
    n.audience,
    n.customerId ?? null,
    n.permission ?? null,
    n.template,
    JSON.stringify(n.data),
    iso(n.now),
  ]);
}

export function registerVisitRoutes(app: FastifyInstance, { now }: { now: () => number }) {
  const { db, integrations } = app;
  const auth = (authorization: string | undefined) => authenticate(db, authorization, now());

  // ponytail: per-process throttle; move to a `customers.fresha_synced_at` column when the API runs as several instances.
  const lastSync = new Map<string, number>();

  /**
   * Pull the customer's bookings from Fresha when a read-back exists (BOOK 19). Returns whether the visits table
   * reflects Fresha (now or within the last few seconds). A Fresha failure degrades to "not synced", never a 500.
   */
  async function sync(customerId: string, { force = false } = {}): Promise<boolean> {
    if (!integrations.fresha.isConnected()) return false;
    const last = lastSync.get(customerId);
    if (!force && last !== undefined && now() - last < SYNC_MIN_INTERVAL_MS) return true;
    const [c] = await db.query<{ phone_e164: string }>('SELECT phone_e164 FROM customers WHERE id = $1', [customerId]);
    let read: Awaited<ReturnType<typeof integrations.fresha.readVisits>>;
    try {
      read = await integrations.fresha.readVisits(c!.phone_e164);
    } catch (err) {
      app.log.warn({ err }, 'Fresha read-back failed');
      return false;
    }
    if (read.status !== 'synced') return false;
    const visits = read.visits;
    const t = iso(now());
    await db.transaction(async (tx) => {
      for (const v of visits) await upsert(tx, customerId, v, t);
    });
    lastSync.set(customerId, now());
    return true;
  }

  async function upsert(tx: Queryable, customerId: string, v: FreshaVisit, t: string) {
    {
      await tx.query(
        `INSERT INTO visits (customer_id, external_ref, source, service_id, service_name, detail, professional_name, starts_at, duration_min, status, deposit_cad, synced_at, first_seen_at)
         VALUES ($1, $2, 'fresha_sync', (SELECT id FROM services WHERE id = $3), $4, $5, $6, $7, $8, $9, $10, $11, $11)
         ON CONFLICT (customer_id, external_ref) DO UPDATE SET
           service_name = EXCLUDED.service_name, detail = EXCLUDED.detail, professional_name = EXCLUDED.professional_name,
           starts_at = EXCLUDED.starts_at, duration_min = EXCLUDED.duration_min, status = EXCLUDED.status,
           deposit_cad = EXCLUDED.deposit_cad, synced_at = EXCLUDED.synced_at`,
        [customerId, v.ref, v.serviceId, v.serviceName, v.detail, v.professional, v.startsAt, v.durationMin, v.status, v.depositCAD, t],
      );
    }
  }

  async function visitsFor(customerId: string): Promise<Visit[]> {
    const rows = await db.query<VisitRow>('SELECT * FROM visits WHERE customer_id = $1 ORDER BY starts_at', [customerId]);
    const open = await db.query<RequestRow>(`SELECT * FROM visit_requests WHERE customer_id = $1 AND status = ANY($2)`, [customerId, OPEN_STATUSES]);
    return rows.map((v) => toVisit(v, open.find((r) => r.visit_id === v.id)));
  }

  // VIS-01. Degrades to "not connected" (bookings live in Fresha) when there's no read-back.
  app.get('/v1/visits', async (request): Promise<VisitsResponse> => {
    const ctx = await auth(request.headers.authorization);
    const synced = await sync(ctx.customerId);
    const t = now();
    const all = await visitsFor(ctx.customerId);
    const isUpcoming = (v: Visit) => Date.parse(v.startsAt) >= t && ['confirmed', 'pending', 'changed'].includes(v.status);
    return {
      sync: synced ? 'synced' : 'not_connected',
      syncedAt: synced ? iso(t) : null,
      upcoming: all.filter(isUpcoming),
      past: all.filter((v) => !isUpcoming(v)).reverse(),
      freshaUrl: integrations.fresha.handoffUrl(),
      serverTime: iso(t),
    };
  });

  app.get('/v1/visits/:id', async (request) => {
    const ctx = await auth(request.headers.authorization);
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const visit = (await visitsFor(ctx.customerId)).find((v) => v.id === id);
    if (!visit) throw new HttpError(404, 'not_found', 'Visit not found.');
    return visit;
  });

  // BKG-08. Records the intent only; the booking itself happens in Fresha. Idempotent per key.
  app.post('/v1/bookings/handoffs', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request) => {
    const ctx = await auth(request.headers.authorization);
    const body = handoffRequestSchema.parse(request.body);
    const [settings] = await db.query<{ settings: { bookingMode: string } }>('SELECT settings FROM app_settings WHERE id = 1');
    if (settings?.settings.bookingMode !== 'handoff') throw new HttpError(409, 'conflict', 'Booking hand-off is not in use.');
    const ids = [...new Set(body.items.map((i) => i.serviceId))];
    const live = await db.query<{ id: string; areas: unknown }>(`SELECT id, areas FROM services WHERE id = ANY($1) AND status = 'live'`, [ids]);
    if (live.length !== ids.length) throw new HttpError(409, 'conflict', 'A treatment in the basket is not bookable right now.');
    // Areas must be ones the catalogue offers, within the per-visit maximum.
    for (const item of body.items) {
      const areas = toAreas(live.find((s) => s.id === item.serviceId)?.areas);
      if (!item.areas) continue;
      const offered = areas?.[item.areas.set].map((a) => a.name) ?? [];
      if (item.areas.names.length > (areas?.maxAreasPerVisit ?? 0) || item.areas.names.some((n) => !offered.includes(n)))
        throw new HttpError(400, 'validation_failed', 'Those areas are not offered for this treatment.');
    }
    // Record everything already booked in Fresha first, so the return check only counts bookings made after this.
    await sync(ctx.customerId, { force: true });
    const t = now();
    await db.query(
      `INSERT INTO booking_handoffs (customer_id, items, idempotency_key, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (customer_id, idempotency_key) DO NOTHING`,
      [ctx.customerId, JSON.stringify(body.items), body.idempotencyKey, iso(t), iso(t + HANDOFF_TTL_MS)],
    );
    const [h] = await db.query<{ id: string; expires_at: Date }>(
      'SELECT id, expires_at FROM booking_handoffs WHERE customer_id = $1 AND idempotency_key = $2',
      [ctx.customerId, body.idempotencyKey],
    );
    // ponytail: no prefill parameters — what Fresha accepts is unconfirmed (E2); the link opens the clinic page.
    return { id: h!.id, url: integrations.fresha.handoffUrl(), expiresAt: h!.expires_at.toISOString() };
  });

  // BKG-09. Truth from Fresha only: a browser coming back proves nothing (BOOK 16).
  app.get('/v1/bookings/handoffs/:id', async (request): Promise<HandoffStatus> => {
    const ctx = await auth(request.headers.authorization);
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const t = now();
    // The "checking" window starts at the first check (the person is back from Fresha), not when Fresha opened.
    const [h] = await db.query<{
      id: string;
      created_at: Date;
      expires_at: Date;
      first_checked_at: Date;
      matched_visit_id: string | null;
      items: { serviceId: string }[];
    }>(
      `UPDATE booking_handoffs SET first_checked_at = COALESCE(first_checked_at, $3) WHERE id = $1 AND customer_id = $2
       RETURNING id, created_at, expires_at, first_checked_at, matched_visit_id, items`,
      [id, ctx.customerId, iso(t)],
    );
    if (!h) throw new HttpError(404, 'not_found', 'Booking hand-off not found.');
    const result = (state: HandoffStatus['state'], visit: Visit | null = null): HandoffStatus => ({ state, visit, checkAgainAt: null });

    if (h.matched_visit_id) {
      await sync(ctx.customerId);
      return result('confirmed', (await visitsFor(ctx.customerId)).find((v) => v.id === h.matched_visit_id) ?? null);
    }
    if (t > h.expires_at.getTime()) return result('notyet'); // an old link never matches a later booking
    if (!(await sync(ctx.customerId))) return result('notyet'); // can't read Fresha: never guess

    // A new Fresha booking no other hand-off has claimed; one for a treatment in this basket first.
    const rows = await db.query<{ id: string }>(
      `SELECT v.id FROM visits v WHERE v.customer_id = $1 AND v.source = 'fresha_sync' AND v.first_seen_at > $2
         AND v.status IN ('confirmed', 'pending') AND v.starts_at > $3
         AND NOT EXISTS (SELECT 1 FROM booking_handoffs b WHERE b.matched_visit_id = v.id)
       ORDER BY COALESCE(v.service_id = ANY($4), false) DESC, v.first_seen_at LIMIT 1`,
      [ctx.customerId, h.created_at.toISOString(), iso(t), h.items.map((i) => i.serviceId)],
    );
    const found = rows[0];
    if (found) {
      const claimed = await db.query('UPDATE booking_handoffs SET matched_visit_id = $2 WHERE id = $1 AND matched_visit_id IS NULL RETURNING id', [h.id, found.id]);
      if (claimed.length) return result('confirmed', (await visitsFor(ctx.customerId)).find((v) => v.id === found.id) ?? null);
    }
    return result(t - h.first_checked_at.getTime() < CHECKING_WINDOW_MS ? 'checking' : 'notyet');
  });

  // VIS-06 → clinic queue (BOOK 18). One open request per visit; retries return the same request.
  app.post('/v1/visits/:id/requests', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request) => {
    const ctx = await auth(request.headers.authorization);
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = visitRequestCreateSchema.parse(request.body);
    const t = now();
    return db.transaction(async (tx) => {
      const [visit] = await tx.query<VisitRow>('SELECT * FROM visits WHERE id = $1 AND customer_id = $2 FOR UPDATE', [id, ctx.customerId]);
      if (!visit) throw new HttpError(404, 'not_found', 'Visit not found.');
      const [same] = await tx.query<RequestRow>('SELECT * FROM visit_requests WHERE customer_id = $1 AND idempotency_key = $2', [
        ctx.customerId,
        body.idempotencyKey,
      ]);
      if (same) return toRequest(same);
      if (visit.starts_at.getTime() <= t || !['confirmed', 'pending', 'changed'].includes(visit.status)) {
        throw new HttpError(409, 'conflict', 'This visit can no longer be changed in the app.');
      }
      const [open] = await tx.query<RequestRow>(`SELECT * FROM visit_requests WHERE visit_id = $1 AND status = ANY($2)`, [visit.id, OPEN_STATUSES]);
      if (open) {
        // Same intent again (new key after a lost response): the open request. A different one would be lost: say so.
        if (open.type === body.type) return toRequest(open);
        throw new HttpError(409, 'conflict', 'A request for this visit is already with the clinic.');
      }
      const reference = `NB-R${randomBytes(3).toString('hex').toUpperCase()}`;
      const [row] = await tx.query<RequestRow>(
        `INSERT INTO visit_requests (reference, visit_id, customer_id, type, message, status, idempotency_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'submitted', $6, $7, $7) RETURNING *`,
        [reference, visit.id, ctx.customerId, body.type, body.message, body.idempotencyKey, iso(t)],
      );
      // NTF-11 to staff who can handle requests; acknowledgement to the customer.
      await notify(tx, { audience: 'staff', permission: 'requests.manage', template: 'NTF-11.request_needs_you', data: { requestId: row!.id, reference }, now: t });
      await notify(tx, { audience: 'customer', customerId: ctx.customerId, template: 'visit_request_submitted', data: { requestId: row!.id, reference }, now: t });
      return toRequest(row!);
    });
  });

  const staff = async (authorization: string | undefined): Promise<AuthContext> => {
    const ctx = await auth(authorization);
    if (!ctx.permissions.includes('requests.manage')) {
      throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: 'requests.manage' });
    }
    return ctx;
  };

  // STF-23 queue data (UI in NANO-08).
  app.get('/v1/staff/requests', async (request) => {
    await staff(request.headers.authorization);
    // Approved requests stay listed until staff mark them done (hand-off: after moving the booking in Fresha).
    const rows = await db.query<RequestRow>(`SELECT * FROM visit_requests WHERE status = ANY($1) ORDER BY created_at`, [[...OPEN_STATUSES, 'approved']]);
    return rows.map(toRequest);
  });

  // STF-24. Audited; the customer is told the outcome. In hand-off mode staff move the booking in Fresha first.
  app.post('/v1/staff/requests/:id/transition', async (request) => {
    const ctx = await staff(request.headers.authorization);
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = visitRequestTransitionSchema.parse(request.body);
    const t = now();
    return db.transaction(async (tx) => {
      const [r] = await tx.query<RequestRow>('SELECT * FROM visit_requests WHERE id = $1 FOR UPDATE', [id]);
      if (!r) throw new HttpError(404, 'not_found', 'Request not found.');
      if (r.customer_id === ctx.customerId) throw new HttpError(403, 'forbidden', 'Another staff member must handle your own request.');
      if (!TRANSITIONS[r.status]!.includes(body.to)) throw new HttpError(409, 'conflict', `A ${r.status} request can't become ${body.to}.`);
      const [updated] = await tx.query<RequestRow>(
        `UPDATE visit_requests SET status = $2, decline_reason = COALESCE($3, decline_reason), staff_note = COALESCE($4, staff_note),
           updated_at = $5, resolved_by = $6 WHERE id = $1 RETURNING *`,
        [id, body.to, body.to === 'declined' ? body.reason : null, body.note ?? null, iso(t), ctx.customerId],
      );
      await tx.query(
        `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at)
         VALUES ($1, $2, $3, 'status', $4, $5, $6, $7, $8)`,
        [ctx.customerId, ctx.roles.join(','), `visit_request:${id}`, r.status, body.to, body.reason ?? body.note ?? null, String(request.headers['user-agent'] ?? ''), iso(t)],
      );
      const template = CUSTOMER_TEMPLATE[body.to];
      if (template) {
        await notify(tx, {
          audience: 'customer',
          customerId: r.customer_id,
          template,
          data: { requestId: id, reference: r.reference, ...(body.to === 'declined' ? { reason: body.reason } : {}) },
          now: t,
        });
      }
      return toRequest(updated!);
    });
  });
}
