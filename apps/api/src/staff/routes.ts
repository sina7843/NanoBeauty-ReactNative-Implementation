import { randomBytes } from 'node:crypto';
import {
  approvalDecisionSchema,
  categoryCreateSchema,
  categoryRenameSchema,
  createServiceSchema,
  importCreateSchema,
  importDecisionsSchema,
  importMappingSchema,
  inviteSchema,
  maskPhone,
  mediaUpdateSchema,
  mediaUploadSchema,
  moveServiceSchema,
  normalizePhone,
  rolesUpdateSchema,
  saveDraftSchema,
  versionedSchema,
  ENTITY_TYPES,
  type Approval,
  type EntityType,
  type AuditEntry,
  type CategoryRow,
  type ImportField,
  type ImportJob,
  type ImportReview,
  type ImportRow,
  type Media,
  type Permission,
  type Price,
  type PublishState,
  type ServiceDraft,
  type StaffService,
  type StaffServiceRow,
  type TeamMember,
} from '@nano/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate, type AuthContext } from '../auth/session';
import type { Db, Queryable } from '../db';
import { HttpError } from '../errors';
import { notify } from '../visits/routes';
import { ENTITY_PERMS } from './entities';

const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 3600_000;
const INVITE_DAYS = 7;
/** Price is the high-risk field a service can change (D35: price, policy, offer terms). */
const HIGH_RISK = ['price'] as const;
const IMPORT_FIELDS: ImportField[] = ['name', 'category', 'price', 'duration', 'description'];
const REQUIRED_FIELDS: ImportField[] = ['name', 'category', 'price'];
const SYNONYMS: Record<ImportField, string[]> = {
  name: ['service name', 'name', 'service', 'treatment'],
  category: ['category', 'group', 'type'],
  price: ['price', 'cost', 'amount'],
  duration: ['duration', 'duration (min)', 'minutes', 'length', 'time'],
  description: ['description', 'details', 'about'],
};

type ServiceRow = {
  id: string;
  category_id: string;
  name: string;
  aliases: string[];
  concerns: string[];
  description: string | null;
  price: Price;
  duration_label: string | null;
  duration_min: number | null;
  photo: string | null;
  status: 'draft' | 'live' | 'unavailable' | 'archived';
  professionals: string[];
  faq: { q: string; a: string }[];
  care: { when: string; title: string; text?: string }[];
  version: number;
  draft: ServiceDraft | null;
  draft_by: string | null;
  in_review: boolean;
  published_at: Date | null;
  archived_at: Date | null;
  updated_at: Date | null;
  sort: number;
};

const liveOf = (r: ServiceRow): ServiceDraft => ({
  name: r.name,
  categoryId: r.category_id,
  aliases: r.aliases,
  concerns: r.concerns,
  description: r.description,
  price: r.price,
  durationLabel: r.duration_label,
  durationMin: r.duration_min,
  photo: r.photo,
  professionals: r.professionals,
  faq: r.faq,
  care: r.care,
  visibility: r.status === 'unavailable' ? 'unavailable' : 'live',
});
const stateOf = (r: Pick<ServiceRow, 'status' | 'in_review'>): PublishState => (r.status === 'archived' ? 'archived' : r.in_review ? 'review' : r.status === 'draft' ? 'draft' : r.status);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const text = (v: unknown) => (v === null || v === undefined ? null : typeof v === 'string' ? v : JSON.stringify(v));
/** Field-level differences, for the audit trail (before → after). */
const diff = (before: ServiceDraft | null, after: ServiceDraft) =>
  (Object.keys(after) as (keyof ServiceDraft)[]).filter((k) => !before || !same(before[k], after[k])).map((k) => ({ field: k, old: before ? text(before[k]) : null, new: text(after[k]) }));
const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30) || 'item';

/** Minimal RFC 4180 CSV (quotes, escaped quotes, commas and newlines inside quotes). */
export function parseCsv(raw: string): string[][] {
  // Spreadsheet exports often start with a byte-order mark; NUL characters can't be stored.
  const input = raw.replace(/^\uFEFF/, '').replace(/\u0000/g, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows.map((r) => r.map((v) => v.trim()));
}

/** "From $250", "$50 per area", "$450", "$300–$500", "Consultation" → PriceTag props; null when unreadable. */
export function parsePrice(raw: string): Price | null {
  const s = raw.trim();
  if (/consult/i.test(s)) return { kind: 'consultation' };
  const nums = [...s.replace(/,/g, '').matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (!nums.length) return null;
  const per = /per\s+([a-z ]+)/i.exec(s);
  if (per) return { kind: 'perUnit', amount: nums[0]!, unit: `per ${per[1]!.trim()}` };
  if (nums.length >= 2 && /[-–]|to/i.test(s)) return nums[0]! <= nums[1]! ? { kind: 'range', min: nums[0]!, max: nums[1]! } : null;
  return { kind: /from/i.test(s) ? 'from' : 'fixed', amount: nums[0]! };
}
const priceText = (p: Price) =>
  p.kind === 'consultation' ? 'consultation' : p.kind === 'range' ? `$${p.min}–$${p.max}` : `${p.kind === 'from' ? 'from ' : ''}$${p.amount}${p.kind === 'perUnit' ? ` ${p.unit ?? ''}` : ''}`.trim();

export function registerStaffRoutes(app: FastifyInstance, { now }: { now: () => number }) {
  const { db, integrations } = app;
  const auth = (request: FastifyRequest) => request.auth as AuthContext;
  /** Server-side authority for every staff route (D34): 401 without a session, 403 with the missing permission. */
  const can =
    (...permissions: Permission[]) =>
    async (request: FastifyRequest) => {
      request.auth = await authenticate(db, request.headers.authorization, now());
      const missing = permissions.find((p) => !request.auth!.permissions.includes(p));
      if (missing) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: missing });
    };
  // onRequest: refused before the body is even read (no 8 MB upload parsed for an unauthenticated caller).
  const pre = (...permissions: Permission[]) => ({ onRequest: can(...permissions) });
  const device = (request: FastifyRequest) => String(request.headers['user-agent'] ?? '').slice(0, 200);
  const audit = (tx: Queryable, request: FastifyRequest, item: string, field: string | null, oldValue: string | null, newValue: string | null, reason: string | null) => {
    const ctx = auth(request);
    return tx.query(
      `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ctx.customerId, ctx.roles.join(','), item, field, oldValue?.slice(0, 4000) ?? null, newValue?.slice(0, 4000) ?? null, reason, device(request), iso(now())],
    );
  };
  const conflict = () => new HttpError(409, 'conflict', 'Someone else changed this. Load the latest version to continue.');
  const requirePermission = (request: FastifyRequest, p: Permission) => {
    if (!auth(request).permissions.includes(p)) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: p });
  };

  async function settings() {
    const [s] = await db.query<{ settings: { secondApprover: { on: boolean; fields: string[] } } }>('SELECT settings FROM app_settings WHERE id = 1');
    return s!.settings;
  }

  // ---------- Services ----------

  async function loadService(tx: Queryable, id: string, lock = false): Promise<ServiceRow> {
    const [row] = await tx.query<ServiceRow>(`SELECT * FROM services WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [id]);
    if (!row) throw new HttpError(404, 'not_found', 'Service not found.');
    return row;
  }
  /** Locks the row and checks the version the client edited (no force-save, ever). */
  async function versioned(tx: Queryable, id: string, version: number): Promise<ServiceRow> {
    const row = await loadService(tx, id, true);
    if (row.version !== version) throw conflict();
    return row;
  }

  async function missingFor(tx: Queryable, d: ServiceDraft): Promise<string[]> {
    const out: string[] = [];
    if (d.durationMin === null && d.price.kind !== 'consultation') out.push('Add a duration');
    const [cat] = await tx.query<{ archived: boolean }>('SELECT archived FROM categories WHERE id = $1', [d.categoryId]);
    if (!cat || cat.archived) out.push('Choose a live category');
    if (d.photo && !/^(media:[0-9a-f-]{36}|[a-z0-9-]{3,40})$/.test(d.photo)) out.push('Choose a photo from Media');
    else if (d.photo?.startsWith('media:')) {
      const [m] = await tx.query<{ status: string }>('SELECT status FROM media WHERE id::text = $1', [d.photo.slice(6)]);
      if (!m || m.status !== 'active') out.push('Add alt text and confirm rights for the photo');
    }
    return out;
  }

  async function viewService(tx: Queryable, row: ServiceRow, viewerId: string): Promise<StaffService> {
    const live = row.published_at ? liveOf(row) : null;
    const draft = row.draft ?? liveOf(row);
    const [waiting] = await tx.query<{ id: string; submitted_by: string }>(`SELECT id, submitted_by FROM approvals WHERE item_type = 'service' AND item_id = $1 AND status = 'waiting'`, [row.id]);
    return {
      id: row.id,
      state: stateOf(row),
      version: row.version,
      draft,
      live,
      highRiskChanges: live ? HIGH_RISK.filter((f) => !same(live[f], draft[f])) : [],
      missing: await missingFor(tx, draft),
      waitingApproval: waiting ? { id: waiting.id, submittedByMe: waiting.submitted_by === viewerId } : null,
      updatedAt: row.updated_at?.toISOString() ?? null,
      deletable: !row.published_at,
    };
  }

  /** Makes the draft live: the only place customer-visible service fields change. Audited field by field. */
  async function publishRow(tx: Queryable, request: FastifyRequest, row: ServiceRow, reason: string) {
    const d = row.draft ?? liveOf(row);
    const missing = await missingFor(tx, d);
    if (missing.length) throw new HttpError(409, 'conflict', `${missing.length} thing${missing.length > 1 ? 's' : ''} missing: ${missing.join(', ')}.`);
    const before = row.published_at ? liveOf(row) : null;
    await tx.query(
      `UPDATE services SET name = $2, category_id = $3, aliases = $4, concerns = $5, description = $6, price = $7, duration_label = $8, duration_min = $9,
         photo = $10, professionals = $11, faq = $12, care = $13, status = $14, draft = NULL, draft_by = NULL, in_review = false,
         published_at = COALESCE(published_at, $15), archived_at = NULL, sample = false, version = version + 1, updated_at = $15
       WHERE id = $1`,
      [row.id, d.name, d.categoryId, d.aliases, d.concerns, d.description, JSON.stringify(d.price), d.durationLabel, d.durationMin, d.photo, d.professionals, JSON.stringify(d.faq), JSON.stringify(d.care), d.visibility, iso(now())],
    );
    for (const change of diff(before, d)) await audit(tx, request, `service:${row.id}`, change.field, change.old, change.new, reason);
    // One state entry per publish, even with no field changes, so "Recently published" and the log always show it.
    await audit(tx, request, `service:${row.id}`, 'state', before ? stateOf(row) : 'draft', d.visibility, reason);
    // Whatever was waiting is settled by this publish.
    await tx.query(`UPDATE approvals SET status = 'approved', decided_by = $2, decided_at = $3 WHERE item_type = 'service' AND item_id = $1 AND status = 'waiting'`, [
      row.id,
      auth(request).customerId,
      iso(now()),
    ]);
  }

  app.get('/v1/staff/services', pre('content.draft'), async (request): Promise<StaffServiceRow[]> => {
    const q = z.object({ filter: z.enum(['all', 'live', 'draft', 'archived']).default('all'), q: z.string().max(80).optional() }).parse(request.query);
    const rows = await db.query<ServiceRow & { category_name: string | null }>(
      `SELECT s.*, c.name AS category_name FROM services s LEFT JOIN categories c ON c.id = s.category_id ORDER BY s.sort, s.name`,
    );
    const term = q.q?.trim().toLowerCase();
    return rows
      .filter((r) => {
        const st = stateOf(r);
        if (q.filter === 'live' && st !== 'live' && st !== 'unavailable') return false;
        if (q.filter === 'draft' && !(st === 'draft' || st === 'review' || r.draft)) return false;
        if (q.filter === 'archived' && st !== 'archived') return false;
        if (q.filter === 'all' && st === 'archived') return false;
        return !term || r.name.toLowerCase().includes(term) || (r.draft?.name ?? '').toLowerCase().includes(term);
      })
      .map((r) => ({
        id: r.id,
        name: r.draft?.name ?? r.name,
        categoryName: r.category_name,
        state: stateOf(r),
        hasDraft: !!r.draft && !!r.published_at,
        price: r.draft?.price ?? r.price,
        archivedAt: r.archived_at?.toISOString() ?? null,
        deletable: !r.published_at,
        version: r.version,
      }));
  });

  app.get('/v1/staff/services/:id', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    return viewService(db, await loadService(db, id), auth(request).customerId);
  });

  // Manual entry (STF-03 new) — always starts as a draft nobody can see.
  app.post('/v1/staff/services', pre('content.draft'), async (request) => {
    const { draft } = createServiceSchema.parse(request.body);
    const id = `svc_${slug(draft.name)}_${randomBytes(2).toString('hex')}`;
    const t = iso(now());
    return db.transaction(async (tx) => {
      const [{ max }] = (await tx.query<{ max: number | null }>('SELECT MAX(sort) AS max FROM services')) as [{ max: number | null }];
      await tx.query(
        `INSERT INTO services (id, category_id, name, aliases, concerns, description, price, duration_label, duration_min, per_area, photo, status, professionals, faq, care, sort, sample, draft, draft_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, 'draft', $11, $12, $13, $14, false, $15, $16, $17)`,
        [id, draft.categoryId, draft.name, draft.aliases, draft.concerns, draft.description, JSON.stringify(draft.price), draft.durationLabel, draft.durationMin, draft.photo, draft.professionals, JSON.stringify(draft.faq), JSON.stringify(draft.care), (max ?? 0) + 1, JSON.stringify(draft), auth(request).customerId, t],
      );
      await audit(tx, request, `service:${id}`, 'state', null, 'draft', 'created');
      return viewService(tx, await loadService(tx, id), auth(request).customerId);
    });
  });

  // Save draft (STF-03, STF-40): customers keep seeing the live version.
  app.put('/v1/staff/services/:id/draft', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const body = saveDraftSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const row = await versioned(tx, id, body.version);
      if (row.status === 'archived') throw new HttpError(409, 'conflict', 'Restore this service before editing it.');
      const before = row.draft ?? (row.published_at ? liveOf(row) : null);
      // Editing withdraws a waiting approval: the reviewer must see what will actually go live.
      await withdrawApprovals(tx, request, id, 'edited after submitting');
      await tx.query(`UPDATE services SET draft = $2, draft_by = $3, in_review = false, version = version + 1, updated_at = $4 WHERE id = $1`, [
        id,
        JSON.stringify(body.draft),
        auth(request).customerId,
        iso(now()),
      ]);
      for (const change of diff(before, body.draft)) await audit(tx, request, `service:${id}`, `draft.${change.field}`, change.old, change.new, 'draft saved');
      return viewService(tx, await loadService(tx, id), auth(request).customerId);
    });
  });

  /** A waiting approval stops being valid when what it shows changes; recorded and the submitter told. */
  async function withdrawApprovals(tx: Queryable, request: FastifyRequest, id: string, why: string) {
    const gone = await tx.query<{ id: string; submitted_by: string }>(
      `UPDATE approvals SET status = 'withdrawn', decided_by = $2, decided_at = $3 WHERE item_type = 'service' AND item_id = $1 AND status = 'waiting' RETURNING id, submitted_by`,
      [id, auth(request).customerId, iso(now())],
    );
    for (const a of gone) {
      await audit(tx, request, `approval:${a.id}`, 'status', 'waiting', 'withdrawn', why);
      await notify(tx, { audience: 'staff', permission: 'content.draft', template: 'approval_withdrawn', data: { item: id, submitter: a.submitted_by, reason: why }, now: now() });
    }
  }

  async function openApproval(tx: Queryable, request: FastifyRequest, row: ServiceRow, submittedBy: string, fields: string[], why: string) {
    const d = row.draft ?? liveOf(row);
    // ST-3: the same completeness rule as publish, so an Owner is never handed an item they can't approve.
    const missing = await missingFor(tx, d);
    if (missing.length) throw new HttpError(409, 'conflict', `${missing.length} thing${missing.length > 1 ? 's' : ''} missing: ${missing.join(', ')}.`);
    const live = row.published_at ? liveOf(row) : null;
    const summary = fields.includes('price') && live ? `Price: ${priceText(live.price)} → ${priceText(d.price)}` : live ? 'Content changes' : 'New service';
    await tx.query(
      `INSERT INTO approvals (item_type, item_id, submitted_by, fields, summary, status, created_at) VALUES ('service', $1, $2, $3, $4, 'waiting', $5)
       ON CONFLICT (item_type, item_id) WHERE status = 'waiting' DO NOTHING`,
      [row.id, submittedBy, fields, summary, iso(now())],
    );
    await tx.query('UPDATE services SET in_review = true, version = version + 1, updated_at = $2 WHERE id = $1', [row.id, iso(now())]);
    await audit(tx, request, `service:${row.id}`, 'state', stateOf(row), 'review', why);
    const [who] = await tx.query<{ first_name: string | null }>('SELECT first_name FROM customers WHERE id = $1', [submittedBy]);
    await notify(tx, { audience: 'staff', permission: 'content.publish', template: 'NTF-12.approval_needed', data: { item: d.name, who: who?.first_name ?? '' }, now: now() });
  }

  // Editor: Submit → the Owner reviews (D35). Customers keep the live version meanwhile.
  app.post('/v1/staff/services/:id/submit', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const row = await versioned(tx, id, version);
      if (row.status === 'archived') throw new HttpError(409, 'conflict', 'Restore this service first.');
      const d = row.draft ?? liveOf(row);
      const live = row.published_at ? liveOf(row) : null;
      await openApproval(tx, request, row, auth(request).customerId, live ? HIGH_RISK.filter((f) => !same(live[f], d[f])) : [...HIGH_RISK], 'submitted');
      return viewService(tx, await loadService(tx, id), auth(request).customerId);
    });
  });

  // Owner: publish after the app's confirm step (STF-09). With a second approver on, a price change waits (STF-08).
  app.post('/v1/staff/services/:id/publish', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    const second = (await settings()).secondApprover;
    return db.transaction(async (tx) => {
      const row = await versioned(tx, id, version);
      if (row.status === 'archived') throw new HttpError(409, 'conflict', 'Restore this service first.');
      const d = row.draft ?? liveOf(row);
      const live = row.published_at ? liveOf(row) : null;
      const risky = live ? HIGH_RISK.filter((f) => !same(live[f], d[f])) : [];
      if (second.on && risky.some((f) => second.fields.includes(f))) {
        await openApproval(tx, request, row, auth(request).customerId, risky, 'second approver required');
        return { outcome: 'waiting' as const, service: await viewService(tx, await loadService(tx, id), auth(request).customerId) };
      }
      await publishRow(tx, request, row, 'published');
      return { outcome: 'published' as const, service: await viewService(tx, await loadService(tx, id), auth(request).customerId) };
    });
  });

  // D36: archive (customers stop seeing it; visits keep it), restore (back as a draft), delete (never-published drafts only).
  app.post('/v1/staff/services/:id/archive', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const row = await versioned(tx, id, version);
      if (!row.published_at) throw new HttpError(409, 'conflict', 'This draft was never live: delete it instead.');
      if (row.status === 'archived') throw conflict();
      await tx.query(`UPDATE services SET status = 'archived', archived_at = $2, in_review = false, version = version + 1, updated_at = $2 WHERE id = $1`, [id, iso(now())]);
      await withdrawApprovals(tx, request, id, 'archived');
      await audit(tx, request, `service:${id}`, 'state', row.status, 'archived', 'archived');
      return viewService(tx, await loadService(tx, id), auth(request).customerId);
    });
  });
  app.post('/v1/staff/services/:id/restore', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const row = await versioned(tx, id, version);
      if (row.status !== 'archived') throw new HttpError(409, 'conflict', 'Only archived services can be restored.');
      // Back as a draft: hidden from customers until someone publishes it again.
      await tx.query(`UPDATE services SET status = 'draft', archived_at = NULL, draft = COALESCE(draft, $2), version = version + 1, updated_at = $3 WHERE id = $1`, [
        id,
        JSON.stringify(liveOf(row)),
        iso(now()),
      ]);
      await audit(tx, request, `service:${id}`, 'state', 'archived', 'draft', 'restored');
      return viewService(tx, await loadService(tx, id), auth(request).customerId);
    });
  });
  app.post('/v1/staff/services/:id/delete', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const row = await versioned(tx, id, version);
      if (row.published_at) throw new HttpError(409, 'conflict', 'Customers have seen this service: archive it instead.');
      const [used] = await tx.query(`SELECT 1 FROM visits WHERE service_id = $1 UNION ALL SELECT 1 FROM packages WHERE service_id = $1 LIMIT 1`, [id]);
      if (used) throw new HttpError(409, 'conflict', 'Something refers to this service: archive it instead.');
      await tx.query(`DELETE FROM approvals WHERE item_type = 'service' AND item_id = $1`, [id]);
      await tx.query('DELETE FROM services WHERE id = $1', [id]);
      await audit(tx, request, `service:${id}`, 'state', 'draft', 'deleted', 'deleted draft');
    });
    return { deleted: true };
  });

  // STF-04 move (live categorisation, not a price change): Owner-level, audited.
  app.post('/v1/staff/services/:id/move', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const body = moveServiceSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const row = await versioned(tx, id, body.version);
      const [cat] = await tx.query<{ archived: boolean }>('SELECT archived FROM categories WHERE id = $1', [body.categoryId]);
      if (!cat || cat.archived) throw new HttpError(409, 'conflict', 'Choose a live category.');
      await tx.query(
        `UPDATE services SET category_id = $2, draft = CASE WHEN draft IS NULL THEN NULL ELSE jsonb_set(draft, '{categoryId}', to_jsonb($2::text)) END, version = version + 1, updated_at = $3 WHERE id = $1`,
        [id, body.categoryId, iso(now())],
      );
      await withdrawApprovals(tx, request, id, 'moved to another category');
      await audit(tx, request, `service:${id}`, 'categoryId', row.category_id, body.categoryId, 'moved');
      return viewService(tx, await loadService(tx, id), auth(request).customerId);
    });
  });

  // ---------- Categories (STF-04) ----------

  async function categoryRows(tx: Queryable): Promise<CategoryRow[]> {
    const rows = await tx.query<{ id: string; name: string; archived: boolean; version: number; published_at: Date | null; n: string }>(
      `SELECT c.id, c.name, c.archived, c.version, c.published_at, COUNT(s.id) FILTER (WHERE s.status <> 'archived')::text AS n
         FROM categories c LEFT JOIN services s ON s.category_id = c.id GROUP BY c.id ORDER BY c.archived, c.sort, c.name`,
    );
    return rows.map((r) => ({ id: r.id, name: r.name, treatments: Number(r.n), archived: r.archived, deletable: !r.published_at && Number(r.n) === 0, version: r.version }));
  }
  app.get('/v1/staff/categories', pre('content.draft'), async () => categoryRows(db));
  app.post('/v1/staff/categories', pre('content.publish'), async (request) => {
    const { name } = categoryCreateSchema.parse(request.body);
    const id = `cat_${slug(name)}_${randomBytes(2).toString('hex')}`;
    await db.transaction(async (tx) => {
      const [{ max }] = (await tx.query<{ max: number | null }>('SELECT MAX(sort) AS max FROM categories')) as [{ max: number | null }];
      await tx.query('INSERT INTO categories (id, name, sort, created_at, published_at) VALUES ($1, $2, $3, $4, $4)', [id, name, (max ?? 0) + 1, iso(now())]);
      await audit(tx, request, `category:${id}`, 'name', null, name, 'created');
    });
    return (await categoryRows(db)).find((c) => c.id === id);
  });
  async function lockCategory(tx: Queryable, id: string, version: number) {
    const [c] = await tx.query<{ id: string; name: string; archived: boolean; version: number; published_at: Date | null }>('SELECT * FROM categories WHERE id = $1 FOR UPDATE', [id]);
    if (!c) throw new HttpError(404, 'not_found', 'Category not found.');
    if (c.version !== version) throw conflict();
    const [{ n }] = (await tx.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM services WHERE category_id = $1 AND status <> 'archived'`, [id])) as [{ n: string }];
    return { ...c, treatments: Number(n) };
  }
  app.put('/v1/staff/categories/:id', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const body = categoryRenameSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const c = await lockCategory(tx, id, body.version);
      await tx.query('UPDATE categories SET name = $2, version = version + 1 WHERE id = $1', [id, body.name]);
      await audit(tx, request, `category:${id}`, 'name', c.name, body.name, 'renamed');
    });
    return (await categoryRows(db)).find((c) => c.id === id);
  });
  // A category with treatments can't be archived or deleted: they move first (STF-04 blocked state).
  app.post('/v1/staff/categories/:id/archive', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const c = await lockCategory(tx, id, version);
      if (c.treatments > 0) throw new HttpError(409, 'conflict', `Move its ${c.treatments} treatments to another category first.`);
      await tx.query('UPDATE categories SET archived = true, version = version + 1 WHERE id = $1', [id]);
      await audit(tx, request, `category:${id}`, 'state', 'live', 'archived', 'archived');
    });
    return (await categoryRows(db)).find((c) => c.id === id);
  });
  app.post('/v1/staff/categories/:id/restore', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const c = await lockCategory(tx, id, version);
      if (!c.archived) throw new HttpError(409, 'conflict', 'This category isn’t archived.');
      await tx.query('UPDATE categories SET archived = false, version = version + 1 WHERE id = $1', [id]);
      await audit(tx, request, `category:${id}`, 'state', 'archived', 'live', 'restored');
    });
    return (await categoryRows(db)).find((c) => c.id === id);
  });
  app.post('/v1/staff/categories/:id/delete', pre('content.publish'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    const { version } = versionedSchema.parse(request.body);
    await db.transaction(async (tx) => {
      const c = await lockCategory(tx, id, version);
      if (c.treatments > 0) throw new HttpError(409, 'conflict', `Move its ${c.treatments} treatments to another category first.`);
      const [anyRef] = await tx.query('SELECT 1 FROM services WHERE category_id = $1 LIMIT 1', [id]);
      if (c.published_at || anyRef) throw new HttpError(409, 'conflict', 'Customers have seen this category: archive it instead.');
      await tx.query('DELETE FROM categories WHERE id = $1', [id]);
      await audit(tx, request, `category:${id}`, 'state', 'draft', 'deleted', 'deleted');
    });
    return { deleted: true };
  });

  // ---------- Approvals (STF-08/09) ----------

  /** Who may decide an approval: the publish permission of its item type (services: content.publish). */
  const publishPerm = (type: string): Permission => (type === 'service' ? 'content.publish' : ENTITY_PERMS[type as EntityType].publish);
  const publishable = (request: FastifyRequest) => ['service', ...ENTITY_TYPES].filter((t) => auth(request).permissions.includes(publishPerm(t)));
  const approverGate = {
    onRequest: async (request: FastifyRequest) => {
      await can()(request);
      if (!publishable(request).length) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: 'content.publish' });
    },
  };

  app.get('/v1/staff/approvals', approverGate, async (request) => {
    const me = auth(request).customerId;
    const types = publishable(request);
    const waiting = await db.query<{ id: string; item_type: string; item_id: string; item_name: string | null; summary: string; fields: string[]; submitted_by: string; created_at: Date; name: string | null; by: string | null }>(
      `SELECT a.*, COALESCE(s.draft->>'name', s.name) AS name, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS by
         FROM approvals a LEFT JOIN services s ON a.item_type = 'service' AND s.id = a.item_id JOIN customers c ON c.id = a.submitted_by
        WHERE a.status = 'waiting' AND a.item_type = ANY($1) ORDER BY a.created_at`,
      [types],
    );
    const recent = await db.query<{ item: string; by: string | null; at: Date }>(
      `SELECT DISTINCT ON (e.item) e.item, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS by, e.at FROM audit_entries e LEFT JOIN customers c ON c.id = e.actor_id
        WHERE e.reason IN ('published', 'approved') AND e.field = 'state' AND split_part(e.item, ':', 1) = ANY($1) ORDER BY e.item, e.at DESC`,
      [types],
    );
    const names = new Map((await db.query<{ id: string; name: string }>('SELECT id, name FROM services')).map((s) => [`service:${s.id}`, s.name]));
    const nameOf = async (item: string) => {
      const [type, ...rest] = item.split(':');
      return names.get(item) ?? (await app.approvalHandlers.get(type!)?.name(rest.join(':'))) ?? item;
    };
    const recentRows = recent.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20);
    return {
      secondApprover: (await settings()).secondApprover.on,
      waiting: waiting.map(
        (a): Approval => ({
          id: a.id,
          itemType: a.item_type as Approval['itemType'],
          itemId: a.item_id,
          itemName: a.name ?? a.item_name ?? a.item_id,
          summary: a.summary,
          fields: a.fields,
          submittedBy: a.by ?? 'Staff member',
          submittedByMe: a.submitted_by === me,
          createdAt: a.created_at.toISOString(),
        }),
      ),
      recent: await Promise.all(recentRows.map(async (r) => ({ item: await nameOf(r.item), by: r.by ?? 'Staff member', at: r.at.toISOString() }))),
    };
  });

  // The approver is never the submitter (D35); sending back needs a reason the submitter is told.
  app.post('/v1/staff/approvals/:id/decide', approverGate, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = approvalDecisionSchema.parse(request.body);
    const me = auth(request).customerId;
    return db.transaction(async (tx) => {
      const [a] = await tx.query<{ id: string; item_type: string; item_id: string; item_name: string | null; submitted_by: string; status: string }>(
        'SELECT * FROM approvals WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!a) throw new HttpError(404, 'not_found', 'Approval not found.');
      requirePermission(request, publishPerm(a.item_type));
      if (a.status !== 'waiting') throw conflict();
      if (a.submitted_by === me) throw new HttpError(403, 'forbidden', 'Someone other than the submitter must decide.');
      let itemName: string;
      if (a.item_type === 'service') {
        const row = await loadService(tx, a.item_id, true);
        itemName = row.draft?.name ?? row.name;
        if (body.decision === 'approve') {
          await publishRow(tx, request, row, 'approved');
        } else {
          await tx.query('UPDATE services SET in_review = false, version = version + 1, updated_at = $2 WHERE id = $1', [row.id, iso(now())]);
          await audit(tx, request, `service:${row.id}`, 'state', 'review', 'draft', `sent back: ${body.reason}`);
        }
      } else {
        const handler = app.approvalHandlers.get(a.item_type)!;
        itemName = a.item_name ?? a.item_id;
        if (body.decision === 'approve') await handler.publish(tx, request, a.item_id);
        else await handler.reject(tx, request, a.item_id, body.reason!);
      }
      await tx.query('UPDATE approvals SET status = $2, reason = $3, decided_by = $4, decided_at = $5 WHERE id = $1', [
        id,
        body.decision === 'approve' ? 'approved' : 'rejected',
        body.reason ?? null,
        me,
        iso(now()),
      ]);
      await notify(tx, {
        audience: 'staff',
        permission: a.item_type === 'service' ? 'content.draft' : ENTITY_PERMS[a.item_type as EntityType].draft,
        template: body.decision === 'approve' ? 'approval_approved' : 'approval_sent_back',
        data: { item: itemName, ...(body.reason ? { reason: body.reason } : {}), submitter: a.submitted_by },
        now: now(),
      });
      return { status: body.decision === 'approve' ? 'approved' : 'rejected' };
    });
  });

  // Any staff member: every kind of editor reads it for the second-approver hint.
  const anyStaff = {
    onRequest: async (request: FastifyRequest) => {
      await can()(request);
      if (!auth(request).permissions.length) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: 'content.draft' });
    },
  };
  app.get('/v1/staff/summary', anyStaff, async (request) => {
    const me = auth(request).customerId;
    const [{ mine, all }] = (await db.query<{ mine: string; all: string }>(
      `SELECT COUNT(*) FILTER (WHERE submitted_by = $1)::text AS mine, COUNT(*)::text AS all FROM approvals WHERE status = 'waiting'`,
      [me],
    )) as [{ mine: string; all: string }];
    return { myWaiting: Number(mine), waitingApprovals: Number(all), secondApprover: (await settings()).secondApprover.on };
  });

  // ---------- Audit log (STF-12) — read only; entries can't be changed (DB trigger) ----------

  app.get('/v1/staff/audit', pre('audit.view'), async (request): Promise<AuditEntry[]> => {
    const q = z
      .object({ days: z.coerce.number().int().min(1).max(365).default(7), person: z.string().max(60).optional(), item: z.string().max(80).optional() })
      .parse(request.query);
    const rows = await db.query<{ id: string; actor: string | null; actor_roles: string; item: string; field: string | null; old_value: string | null; new_value: string | null; reason: string | null; device: string | null; at: Date }>(
      `SELECT e.id::text, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS actor, e.actor_roles, e.item, e.field, e.old_value, e.new_value, e.reason, e.device, e.at
         FROM audit_entries e LEFT JOIN customers c ON c.id = e.actor_id
        WHERE e.at >= $1 AND ($2::text IS NULL OR CONCAT(c.first_name, ' ', c.last_name) ILIKE '%' || $2 || '%')
          AND ($3::text IS NULL OR e.item ILIKE '%' || $3 || '%')
        ORDER BY e.at DESC, e.id DESC LIMIT 500`,
      [iso(now() - q.days * DAY), q.person ?? null, q.item ?? null],
    );
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor ?? 'Staff member',
      roles: r.actor_roles,
      item: r.item,
      field: r.field,
      oldValue: r.old_value,
      newValue: r.new_value,
      reason: r.reason,
      device: r.device,
      at: r.at.toISOString(),
    }));
  });

  // ---------- Team (STF-13/38) — Owner only ----------

  async function team(): Promise<TeamMember[]> {
    const active = await db.query<{ id: string; name: string | null; phone_e164: string; roles: string[]; since: Date | null }>(
      `SELECT c.id, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS name, c.phone_e164, array_agg(r.role ORDER BY r.role) AS roles, MIN(c.created_at) AS since
         FROM staff_roles r JOIN customers c ON c.id = r.customer_id WHERE c.deleted_at IS NULL GROUP BY c.id`,
    );
    const invited = await db.query<{ id: string; phone_e164: string; roles: string[]; created_at: Date }>(
      `SELECT id, phone_e164, roles, created_at FROM staff_invites WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $1`,
      [iso(now())],
    );
    const removed = await db.query<{ id: string; name: string | null; phone_e164: string; at: Date }>(
      `SELECT DISTINCT ON (c.id) c.id, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS name, c.phone_e164, e.at FROM audit_entries e
         JOIN customers c ON e.item = 'staff:' || c.id::text
        WHERE e.field = 'access' AND e.new_value = 'removed' AND NOT EXISTS (SELECT 1 FROM staff_roles r WHERE r.customer_id = c.id) AND c.deleted_at IS NULL
        ORDER BY c.id, e.at DESC`,
    );
    return [
      ...active.map((m) => ({ id: m.id, name: m.name, phoneMasked: maskPhone(m.phone_e164), roles: m.roles as TeamMember['roles'], status: 'active' as const, since: m.since?.toISOString() ?? null })),
      ...invited.map((i) => ({ id: `invite:${i.id}`, name: null, phoneMasked: maskPhone(i.phone_e164), roles: i.roles as TeamMember['roles'], status: 'invited' as const, since: i.created_at.toISOString() })),
      ...removed.map((m) => ({ id: m.id, name: m.name, phoneMasked: maskPhone(m.phone_e164), roles: [], status: 'removed' as const, since: m.at.toISOString() })),
    ];
  }
  app.get('/v1/staff/team', pre('team.manage'), async () => team());

  app.post('/v1/staff/team/invites', pre('team.manage'), async (request) => {
    const body = inviteSchema.parse(request.body);
    const phone = normalizePhone(body.phone);
    if (!phone) throw new HttpError(400, 'validation_failed', 'Enter a 10-digit Canadian mobile number');
    const t = now();
    const [existing] = await db.query<{ id: string }>(
      `SELECT c.id FROM customers c JOIN staff_roles r ON r.customer_id = c.id WHERE c.phone_e164 = $1 LIMIT 1`,
      [phone],
    );
    if (existing) throw new HttpError(409, 'conflict', 'This person already has access. Change their roles instead.');
    await db.transaction(async (tx) => {
      // A new invite replaces an unanswered one for the same number.
      await tx.query(`UPDATE staff_invites SET revoked_at = $2 WHERE phone_e164 = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, [phone, iso(t)]);
      await tx.query(`INSERT INTO staff_invites (phone_e164, roles, invited_by, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)`, [
        phone,
        [...new Set(body.roles)],
        auth(request).customerId,
        iso(t),
        iso(t + INVITE_DAYS * DAY),
      ]);
      await audit(tx, request, `invite:${maskPhone(phone)}`, 'roles', null, body.roles.join(','), 'invited');
    });
    await integrations.messages.send({ channel: 'sms', to: phone, template: 'staff_invite', data: { roles: body.roles.join(', ') } }).catch(() => undefined);
    return team();
  });

  /** Never leaves the clinic without an Owner. */
  async function ownersLeft(tx: Queryable, excluding: string): Promise<number> {
    const [{ n }] = (await tx.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM staff_roles WHERE role = 'Owner' AND customer_id <> $1`, [excluding])) as [{ n: string }];
    return Number(n);
  }
  app.put('/v1/staff/team/:id/roles', pre('team.manage'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { roles } = rolesUpdateSchema.parse(request.body);
    await db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['staff_roles']);
      const current = (await tx.query<{ role: string }>('SELECT role FROM staff_roles WHERE customer_id = $1', [id])).map((r) => r.role);
      if (!current.length) throw new HttpError(404, 'not_found', 'Not a team member. Invite them instead.');
      if (current.includes('Owner') && !roles.includes('Owner') && (await ownersLeft(tx, id)) === 0) throw new HttpError(409, 'conflict', 'The clinic needs at least one Owner.');
      await tx.query('DELETE FROM staff_roles WHERE customer_id = $1', [id]);
      for (const role of new Set(roles)) await tx.query('INSERT INTO staff_roles (customer_id, role) VALUES ($1, $2)', [id, role]);
      await audit(tx, request, `staff:${id}`, 'roles', current.sort().join(','), [...new Set(roles)].sort().join(','), 'roles changed');
    });
    return team();
  });
  app.post('/v1/staff/team/:id/remove', pre('team.manage'), async (request) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
    await db.transaction(async (tx) => {
      if (id.startsWith('invite:')) {
        const done = await tx.query(`UPDATE staff_invites SET revoked_at = $2 WHERE id::text = $1 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`, [id.slice(7), iso(now())]);
        if (!done.length) throw new HttpError(404, 'not_found', 'Invite not found.');
        await audit(tx, request, id, 'access', 'invited', 'revoked', 'invite revoked');
        return;
      }
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['staff_roles']);
      const current = (await tx.query<{ role: string }>('SELECT role FROM staff_roles WHERE customer_id::text = $1', [id])).map((r) => r.role);
      if (!current.length) throw new HttpError(404, 'not_found', 'Not a team member.');
      if (current.includes('Owner') && (await ownersLeft(tx, id)) === 0) throw new HttpError(409, 'conflict', 'The clinic needs at least one Owner.');
      await tx.query('DELETE FROM staff_roles WHERE customer_id::text = $1', [id]);
      // Their staff sessions end now; past actions stay in the audit log.
      await tx.query(`UPDATE sessions SET revoked_at = $2, revoked_reason = 'access_removed' WHERE customer_id::text = $1 AND revoked_at IS NULL`, [id, iso(now())]);
      await audit(tx, request, `staff:${id}`, 'access', current.sort().join(','), 'removed', 'access removed');
    });
    return team();
  });

  // ---------- Media (STF-36) ----------

  type MediaRow = { id: string; filename: string; alt_text: string | null; rights_confirmed: boolean; status: Media['status']; width: number | null; height: number | null; size_bytes: number; version: number; created_at: Date };
  async function mediaView(tx: Queryable, m: MediaRow): Promise<Media> {
    // Services, campaigns, professionals (live or in a draft) and category photos all count (ST-9).
    const [{ n }] = (await tx.query<{ n: string }>(
      `SELECT ((SELECT COUNT(*) FROM services WHERE photo = $1 OR draft->>'photo' = $1)
             + (SELECT COUNT(*) FROM campaigns WHERE photo = $1 OR draft->>'photo' = $1)
             + (SELECT COUNT(*) FROM professionals WHERE photo = $1 OR draft->>'photo' = $1)
             + (SELECT COUNT(*) FROM categories WHERE photo = $1))::text AS n`,
      [`media:${m.id}`],
    )) as [{ n: string }];
    return {
      id: m.id,
      filename: m.filename,
      altText: m.alt_text,
      rightsConfirmed: m.rights_confirmed,
      status: m.status,
      width: m.width,
      height: m.height,
      sizeBytes: m.size_bytes,
      inUse: Number(n),
      version: m.version,
      createdAt: m.created_at.toISOString(),
    };
  }
  const MEDIA_COLUMNS = 'id, filename, alt_text, rights_confirmed, status, width, height, size_bytes, version, created_at';
  app.get('/v1/staff/media', pre('content.draft'), async (request) => {
    const q = z.object({ q: z.string().max(80).optional(), archived: z.enum(['true', 'false']).optional() }).parse(request.query);
    const rows = await db.query<MediaRow>(
      `SELECT ${MEDIA_COLUMNS} FROM media WHERE ($1::text IS NULL OR filename ILIKE '%' || $1 || '%' OR alt_text ILIKE '%' || $1 || '%')
         AND (status = 'archived') = $2 ORDER BY created_at DESC`,
      [q.q ?? null, q.archived === 'true'],
    );
    return Promise.all(rows.map((m) => mediaView(db, m)));
  });
  // Upload: bytes are checked against the declared type; nothing is usable until alt text and rights are set.
  app.post('/v1/staff/media', { ...pre('content.draft'), bodyLimit: 8 * 1024 * 1024 }, async (request) => {
    const body = mediaUploadSchema.parse(request.body);
    const bytes = Buffer.from(body.data, 'base64');
    if (bytes.length > 5 * 1024 * 1024) throw new HttpError(400, 'validation_failed', 'Photos must be 5 MB or smaller.');
    const magic: Record<string, (b: Buffer) => boolean> = {
      'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
      'image/png': (b) => b.subarray(0, 4).toString('hex') === '89504e47',
      'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
    };
    if (!magic[body.contentType]!(bytes)) throw new HttpError(400, 'validation_failed', 'That file isn’t a JPG, PNG or WebP photo.');
    return db.transaction(async (tx) => {
      const [m] = await tx.query<MediaRow>(
        `INSERT INTO media (filename, content_type, bytes, size_bytes, width, height, status, uploaded_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8) RETURNING ${MEDIA_COLUMNS}`,
        [body.filename, body.contentType, bytes, bytes.length, body.width ?? null, body.height ?? null, auth(request).customerId, iso(now())],
      );
      await audit(tx, request, `media:${m!.id}`, 'state', null, 'draft', `uploaded ${body.filename}`);
      return mediaView(tx, m!);
    });
  });
  app.put('/v1/staff/media/:id', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = mediaUpdateSchema.parse(request.body);
    return db.transaction(async (tx) => {
      const [m] = await tx.query<MediaRow>(`SELECT ${MEDIA_COLUMNS} FROM media WHERE id = $1 FOR UPDATE`, [id]);
      if (!m) throw new HttpError(404, 'not_found', 'Photo not found.');
      if (m.version !== body.version) throw conflict();
      if (m.status === 'archived') throw new HttpError(409, 'conflict', 'Restore this photo before editing it.');
      // Usable only with alt text AND confirmed rights (R07); otherwise it stays a draft.
      const status = body.altText && body.rightsConfirmed ? 'active' : 'draft';
      if (status !== 'active' && (await mediaView(tx, m)).inUse) throw new HttpError(409, 'conflict', 'This photo is in use: choose another photo there before removing its alt text or rights.');
      const [u] = await tx.query<MediaRow>(`UPDATE media SET alt_text = $2, rights_confirmed = $3, status = $4, version = version + 1 WHERE id = $1 RETURNING ${MEDIA_COLUMNS}`, [
        id,
        body.altText,
        body.rightsConfirmed,
        status,
      ]);
      if (m.alt_text !== body.altText) await audit(tx, request, `media:${id}`, 'altText', m.alt_text, body.altText, 'edited');
      if (m.rights_confirmed !== body.rightsConfirmed) await audit(tx, request, `media:${id}`, 'rightsConfirmed', String(m.rights_confirmed), String(body.rightsConfirmed), 'rights');
      return mediaView(tx, u!);
    });
  });
  const mediaState = (to: 'archived' | 'restore' | 'delete') =>
    async (request: FastifyRequest) => {
      const { id } = z.object({ id: z.uuid() }).parse(request.params);
      const { version } = versionedSchema.parse(request.body);
      return db.transaction(async (tx) => {
        const [m] = await tx.query<MediaRow>(`SELECT ${MEDIA_COLUMNS} FROM media WHERE id = $1 FOR UPDATE`, [id]);
        if (!m) throw new HttpError(404, 'not_found', 'Photo not found.');
        if (m.version !== version) throw conflict();
        const view = await mediaView(tx, m);
        if (to === 'delete') {
          // D36: media can be deleted only as a draft nobody uses; otherwise archive.
          if (m.status !== 'draft' || view.inUse) throw new HttpError(409, 'conflict', 'This photo has been usable or is in use: archive it instead.');
          await tx.query('DELETE FROM media WHERE id = $1', [id]);
          await audit(tx, request, `media:${id}`, 'state', 'draft', 'deleted', 'deleted');
          return { deleted: true };
        }
        if (to === 'archived') {
          if (view.inUse) throw new HttpError(409, 'conflict', `Used by ${view.inUse} item${view.inUse > 1 ? 's' : ''} (treatments, offers or team): choose another photo there first.`);
          const [u] = await tx.query<MediaRow>(`UPDATE media SET status = 'archived', version = version + 1 WHERE id = $1 RETURNING ${MEDIA_COLUMNS}`, [id]);
          await audit(tx, request, `media:${id}`, 'state', m.status, 'archived', 'archived');
          return mediaView(tx, u!);
        }
        if (m.status !== 'archived') throw new HttpError(409, 'conflict', 'Only archived photos can be restored.');
        const [u] = await tx.query<MediaRow>(`UPDATE media SET status = 'draft', version = version + 1 WHERE id = $1 RETURNING ${MEDIA_COLUMNS}`, [id]);
        await audit(tx, request, `media:${id}`, 'state', 'archived', 'draft', 'restored');
        return mediaView(tx, u!);
      });
    };
  app.post('/v1/staff/media/:id/archive', pre('content.publish'), mediaState('archived'));
  app.post('/v1/staff/media/:id/restore', pre('content.publish'), mediaState('restore'));
  app.post('/v1/staff/media/:id/delete', pre('content.draft'), mediaState('delete'));

  // Customers (and staff previews) get the bytes of usable photos only; staff may preview drafts with a session.
  app.get('/v1/media/:id', async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const [m] = await db.query<{ bytes: Buffer; content_type: string; status: string }>('SELECT bytes, content_type, status FROM media WHERE id = $1', [id]);
    if (!m) throw new HttpError(404, 'not_found', 'Photo not found.');
    if (m.status !== 'active') {
      const ctx = await authenticate(db, request.headers.authorization, now()).catch(() => null);
      if (!ctx?.permissions.includes('content.draft')) throw new HttpError(404, 'not_found', 'Photo not found.');
    }
    return reply.header('content-type', m.content_type).header('x-content-type-options', 'nosniff').header('cache-control', m.status === 'active' ? 'public, max-age=86400' : 'no-store').send(m.bytes);
  });

  // ---------- Import (STF-41/42) ----------

  type ImportRowDb = { id: string; filename: string; header: string[]; rows: string[][]; mapping: Record<ImportField, string | null> | null; decisions: Record<string, ImportRow['decision']>; status: 'draft' | 'published'; result: ImportReview['result']; created_by: string };
  const suggest = (header: string[]) =>
    Object.fromEntries(IMPORT_FIELDS.map((f) => [f, header.find((h) => SYNONYMS[f].includes(h.trim().toLowerCase())) ?? null])) as Record<ImportField, string | null>;
  const jobView = (j: ImportRowDb): ImportJob => {
    const mapping = j.mapping ?? suggest(j.header);
    return { id: j.id, filename: j.filename, header: j.header, rowCount: j.rows.length, mapping, missingRequired: REQUIRED_FIELDS.filter((f) => !mapping[f]), status: j.status };
  };
  async function loadImport(id: string): Promise<ImportRowDb> {
    const [j] = await db.query<ImportRowDb>('SELECT * FROM catalog_imports WHERE id = $1', [id]);
    if (!j) throw new HttpError(404, 'not_found', 'Import not found.');
    return j;
  }

  app.post('/v1/staff/imports', { ...pre('content.draft'), bodyLimit: 3 * 1024 * 1024 }, async (request) => {
    const body = importCreateSchema.parse(request.body);
    const [header, ...rows] = parseCsv(body.csv);
    if (!header || !rows.length) throw new HttpError(400, 'validation_failed', 'The file has no rows. Export it again with a header row.');
    if (rows.length > 1000) throw new HttpError(400, 'validation_failed', 'Up to 1,000 services per import.');
    const [j] = await db.query<ImportRowDb>(
      `INSERT INTO catalog_imports (created_by, filename, header, rows, mapping, status, created_at) VALUES ($1, $2, $3, $4, $5, 'draft', $6) RETURNING *`,
      [auth(request).customerId, body.filename, header, JSON.stringify(rows), JSON.stringify(suggest(header)), iso(now())],
    );
    return jobView(j!);
  });
  app.put('/v1/staff/imports/:id/mapping', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { mapping } = importMappingSchema.parse(request.body);
    const j = await loadImport(id);
    if (j.status !== 'draft') throw conflict();
    for (const col of Object.values(mapping)) if (col && !j.header.includes(col)) throw new HttpError(400, 'validation_failed', `No column called “${col}”.`);
    const full = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, mapping[f] ?? null]));
    await db.query('UPDATE catalog_imports SET mapping = $2 WHERE id = $1', [id, JSON.stringify(full)]);
    return jobView(await loadImport(id));
  });

  /** Classifies every row against the live catalogue: new, changed (with what), unchanged, duplicate or invalid. */
  async function review(j: ImportRowDb): Promise<ImportReview> {
    const job = jobView(j);
    const col = (f: ImportField) => (job.mapping[f] ? j.header.indexOf(job.mapping[f]!) : -1);
    const services = await db.query<ServiceRow>(`SELECT * FROM services WHERE status <> 'archived'`);
    const byName = new Map(services.map((s) => [s.name.trim().toLowerCase(), s]));
    const seen = new Map<string, number>();
    const rows: ImportRow[] = j.rows.map((r, index) => {
      const get = (f: ImportField) => (col(f) >= 0 ? (r[col(f)] ?? '').trim() : '');
      const name = get('name');
      const category = get('category');
      const key = name.toLowerCase();
      const base = { index, name, category, matchId: null as string | null, decision: j.decisions[String(index)] ?? null };
      const price = parsePrice(get('price'));
      if (!name || !category || !price) return { ...base, kind: 'invalid' as const, detail: !name ? 'No name' : !category ? 'No category' : 'Price not readable' };
      const mins = get('duration') ? Number.parseInt(get('duration'), 10) : null;
      if (name.length > 80 || category.length > 60 || get('description').length > 2000) return { ...base, kind: 'invalid' as const, detail: 'Text too long' };
      if (mins !== null && (!Number.isFinite(mins) || mins < 1 || mins > 600)) return { ...base, kind: 'invalid' as const, detail: 'Duration must be 1–600 minutes' };
      const firstIndex = seen.get(key);
      seen.set(key, firstIndex ?? index);
      if (firstIndex !== undefined) return { ...base, kind: 'duplicate' as const, detail: `Listed twice in the file (row ${firstIndex + 2})` };
      const live = byName.get(key);
      if (!live) return { ...base, kind: 'new' as const, detail: null };
      // Never overwrite unpublished work: someone's draft or a submission waiting for approval wins.
      if (live.draft || live.in_review) return { ...base, matchId: live.id, kind: 'conflict' as const, detail: 'Has unpublished edits: publish or discard them in Services first' };
      const changes: string[] = [];
      if (!same(live.price, price)) changes.push(`price ${priceText(live.price)} → ${priceText(price)}`);
      const minutes = Number.parseInt(get('duration'), 10);
      if (col('duration') >= 0 && Number.isFinite(minutes) && minutes !== live.duration_min) changes.push(`duration ${live.duration_min ?? '—'} → ${minutes} min`);
      if (col('description') >= 0 && get('description') && get('description') !== (live.description ?? '')) changes.push('description');
      return { ...base, matchId: live.id, kind: changes.length ? ('changed' as const) : ('unchanged' as const), detail: changes.join(', ') || null };
    });
    const dup = rows.filter((r) => r.kind === 'duplicate');
    return {
      import: job,
      rows,
      counts: {
        new: rows.filter((r) => r.kind === 'new').length,
        changed: rows.filter((r) => r.kind === 'changed').length,
        duplicate: dup.length,
        unresolved: dup.filter((r) => !r.decision).length,
        invalid: rows.filter((r) => r.kind === 'invalid').length,
        conflict: rows.filter((r) => r.kind === 'conflict').length,
      },
      result: j.result,
    };
  }
  app.get('/v1/staff/imports/:id/review', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const j = await loadImport(id);
    if (jobView(j).missingRequired.length) throw new HttpError(409, 'conflict', 'Match the name, category and price columns first.');
    return review(j);
  });
  app.put('/v1/staff/imports/:id/decisions', pre('content.draft'), async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { decisions } = importDecisionsSchema.parse(request.body);
    const j = await loadImport(id);
    if (j.status !== 'draft') throw conflict();
    await db.query('UPDATE catalog_imports SET decisions = decisions || $2::jsonb WHERE id = $1', [id, JSON.stringify(decisions)]);
    return review(await loadImport(id));
  });

  /**
   * Controlled publish (STF-42). Publish (content.publish): new rows go live, changed rows update; with a second
   * approver on, price changes wait for approval instead. Submit (content.draft only): everything becomes drafts
   * in review. Duplicates must be resolved first; "keep" and "skip" leave the live service alone.
   */
  app.post('/v1/staff/imports/:id/:action', pre('content.draft'), async (request) => {
    const { id, action } = z.object({ id: z.uuid(), action: z.enum(['publish', 'submit']) }).parse(request.params);
    const ctx = auth(request);
    if (action === 'publish' && !ctx.permissions.includes('content.publish')) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: 'content.publish' });
    const j = await loadImport(id);
    if (j.status !== 'draft') throw conflict();
    const r = await review(j);
    if (r.counts.unresolved) throw new HttpError(409, 'conflict', `Resolve ${r.counts.unresolved} duplicates first.`);
    const second = (await settings()).secondApprover;
    const job = r.import;
    const col = (f: ImportField) => (job.mapping[f] ? j.header.indexOf(job.mapping[f]!) : -1);
    const result = { created: 0, updated: 0, skipped: 0, waiting: 0 };
    await db.transaction(async (tx) => {
      const locked = await tx.query<{ status: string }>('SELECT status FROM catalog_imports WHERE id = $1 FOR UPDATE', [id]);
      if (locked[0]?.status !== 'draft') throw conflict();
      const categories = await tx.query<{ id: string; name: string }>('SELECT id, name FROM categories WHERE NOT archived');
      const catId = async (name: string) => {
        const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (found) return found.id;
        const cid = `cat_${slug(name)}_${randomBytes(2).toString('hex')}`;
        await tx.query('INSERT INTO categories (id, name, sort, created_at, published_at) VALUES ($1, $2, 99, $3, $3)', [cid, name, iso(now())]);
        await audit(tx, request, `category:${cid}`, 'name', null, name, `import ${j.filename}`);
        categories.push({ id: cid, name });
        return cid;
      };
      for (const row of r.rows) {
        const raw = j.rows[row.index]!;
        const get = (f: ImportField) => (col(f) >= 0 ? (raw[col(f)] ?? '').trim() : '');
        const skipRow = row.kind === 'invalid' || row.kind === 'unchanged' || row.kind === 'conflict' || (row.kind === 'duplicate' && (row.decision === 'keep' || row.decision === 'skip'));
        // Only someone who can publish creates categories customers would see; a submit skips rows needing one.
        const knownCategory = categories.some((c) => c.name.toLowerCase() === row.category.toLowerCase());
        if (skipRow || (action === 'submit' && !knownCategory)) {
          result.skipped++;
          continue;
        }
        const minutes = Number.parseInt(get('duration'), 10);
        const fields = {
          name: row.name,
          categoryId: await catId(row.category),
          price: parsePrice(get('price'))!,
          durationMin: Number.isFinite(minutes) ? minutes : null,
          description: get('description') || null,
        };
        const target = row.kind === 'changed' || (row.kind === 'duplicate' && row.decision === 'replace') ? (row.matchId ?? (await tx.query<{ id: string }>('SELECT id FROM services WHERE lower(name) = lower($1) AND status <> $2 LIMIT 1', [row.name, 'archived']))[0]?.id) : null;
        if (target) {
          const s = await loadService(tx, target, true);
          // Re-checked under the row lock: work started since the review is never overwritten.
          if (s.draft || s.in_review || s.status === 'archived') {
            result.skipped++;
            continue;
          }
          const base = liveOf(s);
          const draft: ServiceDraft = { ...base, ...fields, durationMin: fields.durationMin ?? base.durationMin, description: fields.description ?? base.description, durationLabel: fields.durationMin ? `${fields.durationMin} min` : base.durationLabel };
          await tx.query('UPDATE services SET draft = $2, draft_by = $3, version = version + 1, updated_at = $4 WHERE id = $1', [target, JSON.stringify(draft), ctx.customerId, iso(now())]);
          for (const change of diff(base, draft)) await audit(tx, request, `service:${target}`, `draft.${change.field}`, change.old, change.new, `import ${j.filename}`);
          const fresh = await loadService(tx, target, true);
          const risky = !same(s.price, fields.price);
          if (action === 'submit' || (second.on && risky && second.fields.includes('price'))) {
            await openApproval(tx, request, fresh, ctx.customerId, risky ? ['price'] : [], `import ${j.filename}`);
            result.waiting++;
          } else {
            await publishRow(tx, request, fresh, `import ${j.filename}`);
            result.updated++;
          }
          continue;
        }
        const sid = `svc_${slug(row.name)}_${randomBytes(2).toString('hex')}`;
        const draft: ServiceDraft = {
          ...fields,
          aliases: [],
          concerns: [],
          durationLabel: fields.durationMin ? `${fields.durationMin} min` : null,
          photo: null,
          professionals: [],
          faq: [],
          care: [],
          visibility: 'live',
        };
        await tx.query(
          `INSERT INTO services (id, category_id, name, aliases, concerns, description, price, duration_label, duration_min, per_area, photo, status, professionals, faq, care, sort, sample, draft, draft_by, updated_at)
           VALUES ($1, $2, $3, '{}', '{}', $4, $5, $6, $7, false, NULL, 'draft', '{}', '[]', '[]', 500, false, $8, $9, $10)`,
          [sid, fields.categoryId, fields.name, fields.description, JSON.stringify(fields.price), draft.durationLabel, fields.durationMin, JSON.stringify(draft), ctx.customerId, iso(now())],
        );
        await audit(tx, request, `service:${sid}`, 'state', null, 'draft', `import ${j.filename}`);
        const created = await loadService(tx, sid, true);
        // A new service missing a duration can't go live yet: it stays a draft to finish in STF-03.
        if (action === 'publish' && !(await missingFor(tx, draft)).length) {
          await publishRow(tx, request, created, `import ${j.filename}`);
          result.created++;
        } else if (action === 'submit') {
          await openApproval(tx, request, created, ctx.customerId, [], `import ${j.filename}`);
          result.waiting++;
        } else result.skipped++;
      }
      await tx.query(`UPDATE catalog_imports SET status = 'published', result = $2, published_at = $3 WHERE id = $1`, [id, JSON.stringify(result), iso(now())]);
    });
    return review(await loadImport(id));
  });
}

/** Grants a pending staff invite when its number signs in (identity = phone). Audited as the inviter's action. */
export async function acceptStaffInvite(db: Db, customerId: string, phone: string, now: number) {
  return db.transaction((tx) => acceptInTx(tx, customerId, phone, now));
}
async function acceptInTx(db: Queryable, customerId: string, phone: string, now: number) {
  const [invite] = await db.query<{ id: string; roles: string[]; invited_by: string }>(
    `UPDATE staff_invites SET accepted_at = $2 WHERE phone_e164 = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2 RETURNING id, roles, invited_by`,
    [phone, iso(now)],
  );
  if (!invite) return;
  for (const role of invite.roles) await db.query('INSERT INTO staff_roles (customer_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING', [customerId, role]);
  await db.query(
    `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at) VALUES ($1, 'Owner', $2, 'access', 'invited', $3, 'invite accepted', NULL, $4)`,
    [invite.invited_by, `staff:${customerId}`, invite.roles.join(','), iso(now)],
  );
}

