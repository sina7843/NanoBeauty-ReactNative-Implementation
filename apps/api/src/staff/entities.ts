import { randomBytes } from 'node:crypto';
import {
  articleDraftSchema,
  campaignDraftSchema,
  entityCreateSchema,
  entitySaveSchema,
  packageDraftSchema,
  policyDraftSchema,
  professionalDraftSchema,
  promoDraftSchema,
  versionedSchema,
  type Entity,
  type EntityRow,
  type EntityType,
  type Permission,
  type PublishState,
} from '@nano/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Queryable } from '../db';
import { HttpError } from '../errors';
import { clinicTz, notify } from '../visits/routes';
import { diffFields, iso, staffKit } from './kit';

type Row = Record<string, unknown> & {
  version: number;
  draft: Record<string, unknown> | null;
  in_review: boolean;
  published_at: Date | null;
  first_published_at: Date | null;
  archived_at: Date | null;
  updated_at: Date | null;
};
type Ctx = { tx: Queryable; now: number };
type HighRisk = { field: string; key: 'price' | 'policy' | 'offerTerms' };

/** One draftable kind of content. The engine gives every kind the same governance (NANO-07 model). */
interface Def {
  type: EntityType;
  plural: string;
  table: string;
  idCol: string;
  schema: z.ZodType<Record<string, unknown>>;
  perm: { draft: Permission; publish: Permission };
  highRisk: HighRisk[];
  liveOf(row: Row): Record<string, unknown>;
  name(d: Record<string, unknown>): string;
  /** `tz` is the clinic's time zone (dates in the subtitle are clinic dates). */
  subtitle(row: Row, d: Record<string, unknown>, now: number, tz: string): string | null;
  /** Live, non-archived state for customers: live or unavailable/paused. */
  liveState(row: Row): PublishState;
  phase?(row: Row, now: number): string | null;
  newId(d: Record<string, unknown>): string;
  insert(c: Ctx, id: string, d: Record<string, unknown>): Promise<void>;
  apply(c: Ctx, row: Row, d: Record<string, unknown>): Promise<void>;
  missing?(c: Ctx, d: Record<string, unknown>, row: Row | null): Promise<string[]>;
  facts?(c: Ctx, row: Row): Promise<{ label: string; value: string }[]>;
  /** Archive/restore (D36). Undefined = not archivable (policies). */
  archive?(c: Ctx, row: Row): Promise<void>;
  restore?(c: Ctx, row: Row): Promise<void>;
  /** Reason a never-published row can't be deleted; null = can. */
  blockDelete?(c: Ctx, row: Row): Promise<string | null>;
  creatable: boolean;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30) || 'item';
const rid = (prefix: string, name: string) => `${prefix}_${slug(name)}_${randomBytes(2).toString('hex')}`;
const mediaOk = async ({ tx }: Ctx, photo: unknown): Promise<boolean> => {
  if (typeof photo !== 'string' || !photo.startsWith('media:')) return true;
  const [m] = await tx.query<{ status: string }>('SELECT status FROM media WHERE id::text = $1', [photo.slice(6)]);
  return m?.status === 'active';
};
const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

export const DEFS: Def[] = [
  {
    type: 'package',
    plural: 'packages',
    table: 'packages',
    idCol: 'id',
    schema: packageDraftSchema as z.ZodType<Record<string, unknown>>,
    perm: { draft: 'selling.draft', publish: 'selling.publish' },
    highRisk: [
      { field: 'priceCents', key: 'price' },
      { field: 'sessions', key: 'price' },
    ],
    liveOf: (r) => ({
      name: r.name,
      serviceId: r.service_id,
      sessions: r.sessions,
      priceCents: r.price_cents,
      regularCents: r.regular_cents,
      validityMonths: r.validity_months,
      terms: r.terms,
      visibility: r.status === 'unavailable' ? 'unavailable' : 'live',
    }),
    name: (d) => String(d.name),
    subtitle: (_r, d) => {
      const price = Number(d.priceCents);
      const regular = d.regularCents ? Number(d.regularCents) : null;
      return `${money(price)}${regular && regular > price ? ` · saves ${money(regular - price)}` : ''}`;
    },
    liveState: (r) => (r.status === 'unavailable' ? 'unavailable' : 'live'),
    newId: (d) => rid('pkg', String(d.name)),
    insert: async ({ tx }, id, d) => {
      await tx.query(
        `INSERT INTO packages (id, name, service_id, sessions, price_cents, regular_cents, validity_months, status, terms, sort, sample, draft)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, 99, false, $9)`,
        [id, d.name, d.serviceId, d.sessions, d.priceCents, d.regularCents, d.validityMonths, JSON.stringify(d.terms), JSON.stringify(d)],
      );
    },
    apply: async ({ tx }, r, d) => {
      await tx.query(
        `UPDATE packages SET name = $2, service_id = $3, sessions = $4, price_cents = $5, regular_cents = $6, validity_months = $7, terms = $8, status = $9, sample = false WHERE id = $1`,
        [r.id, d.name, d.serviceId, d.sessions, d.priceCents, d.regularCents, d.validityMonths, JSON.stringify(d.terms), d.visibility],
      );
    },
    missing: async ({ tx }, d) => {
      const out: string[] = [];
      if (d.serviceId) {
        const [s] = await tx.query<{ status: string }>('SELECT status FROM services WHERE id = $1', [d.serviceId]);
        if (!s || s.status === 'archived' || s.status === 'draft') out.push('Choose a live treatment');
      } else out.push('Choose the treatment');
      if (!(d.terms as unknown[]).length) out.push('Add the package terms');
      return out;
    },
    // Owners keep using an archived package until it expires (WALT 06): the wallet never reads catalogue status.
    facts: async ({ tx }, r) => {
      const [{ n }] = (await tx.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM wallet_instruments WHERE package_id = $1 AND status = 'active'`, [r.id])) as [{ n: string }];
      return [{ label: 'Owners', value: n }];
    },
    archive: async ({ tx }, r) => void (await tx.query(`UPDATE packages SET status = 'archived' WHERE id = $1`, [r.id])),
    restore: async ({ tx }, r) => void (await tx.query(`UPDATE packages SET status = 'draft' WHERE id = $1`, [r.id])),
    blockDelete: async ({ tx }, r) => ((await tx.query('SELECT 1 FROM orders WHERE package_id = $1 LIMIT 1', [r.id])).length ? 'Orders refer to this package: archive it instead.' : null),
    creatable: true,
  },
  {
    type: 'campaign',
    plural: 'campaigns',
    table: 'campaigns',
    idCol: 'id',
    schema: campaignDraftSchema as z.ZodType<Record<string, unknown>>,
    perm: { draft: 'selling.draft', publish: 'selling.publish' },
    highRisk: [
      { field: 'terms', key: 'offerTerms' },
      { field: 'eligible', key: 'offerTerms' },
    ],
    liveOf: (r) => ({
      template: r.template ?? 'own',
      eyebrow: r.eyebrow,
      title: r.title,
      summary: r.summary,
      body: r.body,
      photo: r.photo,
      startsAt: (r.starts_at as Date).toISOString(),
      endsAt: (r.ends_at as Date).toISOString(),
      audience: r.audience,
      eligible: r.eligible,
      terms: r.terms,
      cta: r.cta,
      fallback: r.fallback,
    }),
    name: (d) => String(d.title),
    subtitle: (r, d, _now, tz) => {
      // House style "20 Oct – 1 Nov" in the clinic's time zone (WP-28).
      const fmt = (s: unknown) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: tz }).format(new Date(String(s)));
      return `${fmt(d.startsAt)} – ${fmt(d.endsAt)}${r.home_rank ? ` · Home slot ${r.home_rank}` : ''}`;
    },
    liveState: (r) => (r.paused ? 'unavailable' : 'live'),
    phase: (r, now) => {
      if (!r.published_at || r.archived_at) return null;
      if (r.paused) return 'paused';
      if ((r.ends_at as Date).getTime() <= now) return 'ended';
      if ((r.starts_at as Date).getTime() > now) return 'scheduled';
      return 'live';
    },
    newId: (d) => rid('cmp', String(d.title)),
    insert: async ({ tx }, id, d) => {
      await tx.query(
        `INSERT INTO campaigns (id, eyebrow, title, summary, body, photo, starts_at, ends_at, published, audience, eligible, terms, cta, fallback, sample, template, draft)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, $12, $13, false, $14, $15)`,
        [id, d.eyebrow, d.title, d.summary, d.body, d.photo, d.startsAt, d.endsAt, d.audience, JSON.stringify(d.eligible), JSON.stringify(d.terms), JSON.stringify(d.cta), JSON.stringify(d.fallback), d.template, JSON.stringify(d)],
      );
    },
    apply: async ({ tx }, r, d) => {
      await tx.query(
        `UPDATE campaigns SET eyebrow = $2, title = $3, summary = $4, body = $5, photo = $6, starts_at = $7, ends_at = $8, audience = $9, eligible = $10, terms = $11,
           cta = $12, fallback = $13, template = $14, published = true, sample = false WHERE id = $1`,
        [r.id, d.eyebrow, d.title, d.summary, d.body, d.photo, d.startsAt, d.endsAt, d.audience, JSON.stringify(d.eligible), JSON.stringify(d.terms), JSON.stringify(d.cta), JSON.stringify(d.fallback), d.template],
      );
    },
    missing: async (c, d) => {
      const out: string[] = [];
      if (Date.parse(String(d.endsAt)) <= Date.parse(String(d.startsAt))) out.push('The end date must be after the start');
      if (Date.parse(String(d.endsAt)) <= c.now) out.push('The end date has passed');
      if (!(d.terms as unknown[]).length) out.push('Add the offer terms (PROMO 04)');
      if (!(await mediaOk(c, d.photo))) out.push('Add alt text and confirm rights for the photo');
      return out;
    },
    // Archived campaigns leave Home and customers see the ended page (OFR-04).
    archive: async ({ tx }, r) => void (await tx.query(`UPDATE campaigns SET published = false, home_rank = NULL WHERE id = $1`, [r.id])),
    restore: async ({ tx }, r) => void (await tx.query(`UPDATE campaigns SET published = false WHERE id = $1`, [r.id])),
    blockDelete: async ({ tx }, r) => ((await tx.query('SELECT 1 FROM promo_codes WHERE campaign_id = $1 LIMIT 1', [r.id])).length ? 'A promo code is linked to this campaign.' : null),
    creatable: true,
  },
  {
    type: 'promo',
    plural: 'promo-codes',
    table: 'promo_codes',
    idCol: 'code',
    schema: promoDraftSchema as z.ZodType<Record<string, unknown>>,
    perm: { draft: 'selling.draft', publish: 'selling.publish' },
    highRisk: [{ field: 'discount', key: 'offerTerms' }],
    liveOf: (r) => ({
      code: r.code,
      description: r.description,
      discount: r.discount,
      appliesTo: r.applies_to,
      appliesLabel: r.applies_label,
      campaignId: r.campaign_id,
      startsAt: (r.starts_at as Date | null)?.toISOString() ?? null,
      endsAt: (r.ends_at as Date | null)?.toISOString() ?? null,
      totalLimit: r.total_limit,
      perPerson: r.per_person,
    }),
    name: (d) => String(d.code),
    subtitle: (r, d) => `${d.description}${r.total_limit ? ` · ${r.used} of ${r.total_limit} used` : r.used ? ` · ${r.used} used` : ''}`,
    liveState: () => 'live',
    phase: (r, now) => {
      if (!r.published_at || r.archived_at) return null;
      if (r.total_limit && Number(r.used) >= Number(r.total_limit)) return 'used up';
      if (r.ends_at && (r.ends_at as Date).getTime() <= now) return 'ended';
      if (r.starts_at && (r.starts_at as Date).getTime() > now) return 'scheduled';
      return 'live';
    },
    newId: (d) => String(d.code),
    insert: async ({ tx }, id, d) => {
      const [taken] = await tx.query('SELECT 1 FROM promo_codes WHERE code = $1', [id]);
      if (taken) throw new HttpError(409, 'conflict', 'That code already exists.');
      await tx.query(
        `INSERT INTO promo_codes (code, campaign_id, description, applies_to, applies_label, starts_at, ends_at, total_limit, per_person, discount, live, draft)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11)`,
        [id, d.campaignId, d.description, d.appliesTo, d.appliesLabel, d.startsAt, d.endsAt, d.totalLimit, d.perPerson, JSON.stringify(d.discount), JSON.stringify(d)],
      );
    },
    apply: async ({ tx }, r, d) => {
      if (d.code !== r.code) throw new HttpError(409, 'conflict', 'A code can’t be renamed: make a new one.');
      await tx.query(
        `UPDATE promo_codes SET campaign_id = $2, description = $3, applies_to = $4, applies_label = $5, starts_at = $6, ends_at = $7, total_limit = $8, per_person = $9,
           discount = $10, live = true, archived = false WHERE code = $1`,
        [r.code, d.campaignId, d.description, d.appliesTo, d.appliesLabel, d.startsAt, d.endsAt, d.totalLimit, d.perPerson, JSON.stringify(d.discount)],
      );
    },
    missing: async (c, d) => {
      const out: string[] = [];
      if (d.startsAt && d.endsAt && Date.parse(String(d.endsAt)) <= Date.parse(String(d.startsAt))) out.push('The end date must be after the start');
      const discount = d.discount as { type: string; value: number };
      if (discount.type === 'percent' && discount.value > 100) out.push('A percentage can’t be over 100');
      if (d.campaignId) {
        const [cmp] = await c.tx.query('SELECT 1 FROM campaigns WHERE id = $1', [d.campaignId]);
        if (!cmp) out.push('Choose an existing campaign');
      }
      return out;
    },
    facts: async (_c, r) => [{ label: 'Used', value: r.total_limit ? `${r.used} of ${r.total_limit}` : String(r.used) }],
    archive: async ({ tx }, r) => void (await tx.query(`UPDATE promo_codes SET archived = true WHERE code = $1`, [r.code])),
    restore: async ({ tx }, r) => void (await tx.query(`UPDATE promo_codes SET archived = false, live = false WHERE code = $1`, [r.code])),
    blockDelete: async ({ tx }, r) => ((await tx.query('SELECT 1 FROM promo_redemptions WHERE code = $1 LIMIT 1', [r.code])).length ? 'This code has been used: archive it instead.' : null),
    creatable: true,
  },
  {
    type: 'professional',
    plural: 'professionals',
    table: 'professionals',
    idCol: 'id',
    schema: professionalDraftSchema as z.ZodType<Record<string, unknown>>,
    perm: { draft: 'professionals.draft', publish: 'professionals.publish' },
    highRisk: [],
    liveOf: (r) => ({ name: r.name, title: r.title, bio: r.bio, photo: r.photo, consent: r.profile_consent, visible: !r.hidden }),
    name: (d) => String(d.name),
    subtitle: (r, d) => `${d.title ?? 'Title to confirm'}${r.hidden ? ' · hidden' : ''}${d.consent ? '' : ' · no profile consent'}`,
    liveState: (r) => (r.hidden ? 'unavailable' : 'live'),
    newId: (d) => rid('stf', String(d.name)),
    insert: async ({ tx }, id, d) => {
      await tx.query(
        `INSERT INTO professionals (id, name, title, bio, photo, profile_consent, hidden, status, sample, draft) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', false, $8)`,
        [id, d.name, d.title, d.bio, d.photo, d.consent, !d.visible, JSON.stringify(d)],
      );
    },
    apply: async ({ tx }, r, d) => {
      await tx.query(`UPDATE professionals SET name = $2, title = $3, bio = $4, photo = $5, profile_consent = $6, hidden = $7, status = 'live', sample = false WHERE id = $1`, [
        r.id,
        d.name,
        d.title,
        d.bio,
        d.photo,
        d.consent,
        !d.visible,
      ]);
    },
    // C5: with a photo or bio, the signed consent must be on file before anything goes live.
    missing: async (c, d) => {
      const out: string[] = [];
      if ((d.photo || d.bio) && !d.consent) out.push('Photo consent missing: you can save a draft, but not publish');
      if (!(await mediaOk(c, d.photo))) out.push('Add alt text and confirm rights for the photo');
      return out;
    },
    facts: async ({ tx }, r) => {
      const [{ n }] = (await tx.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM services WHERE $1 = ANY(professionals) AND status <> 'archived'`, [r.id])) as [{ n: string }];
      return [{ label: 'Services', value: n }];
    },
    archive: async ({ tx }, r) => void (await tx.query(`UPDATE professionals SET status = 'archived', hidden = true WHERE id = $1`, [r.id])),
    restore: async ({ tx }, r) => void (await tx.query(`UPDATE professionals SET status = 'draft' WHERE id = $1`, [r.id])),
    blockDelete: async ({ tx }, r) => ((await tx.query('SELECT 1 FROM services WHERE $1 = ANY(professionals) LIMIT 1', [r.id])).length ? 'Services list this person: archive instead.' : null),
    creatable: true,
  },
  {
    type: 'policy',
    plural: 'policies',
    table: 'policies',
    idCol: 'id',
    schema: policyDraftSchema as z.ZodType<Record<string, unknown>>,
    perm: { draft: 'policies.draft', publish: 'policies.publish' },
    highRisk: [{ field: 'sections', key: 'policy' }],
    liveOf: (r) => ({ title: r.title, sections: r.sections, changeNote: '' }),
    name: (d) => String(d.title),
    subtitle: (r) => `${r.version_label} · live`,
    liveState: () => 'live',
    newId: () => '',
    insert: async () => {
      throw new HttpError(409, 'conflict', 'Policies are a fixed set.');
    },
    // Each publish adds a version to the history; customers see the newest (STF-33, ACC-11).
    apply: async ({ tx, now }, r, d) => {
      const [{ n }] = (await tx.query<{ n: string }>('SELECT COUNT(*)::text AS n FROM policy_versions WHERE policy_id = $1', [r.id])) as [{ n: string }];
      const label = `v${Number(n) + 1}`;
      await tx.query('UPDATE policies SET title = $2, sections = $3, version_label = $4, updated_on = $5, sample = false WHERE id = $1', [r.id, d.title, JSON.stringify(d.sections), label, iso(now).slice(0, 10)]);
      await tx.query('INSERT INTO policy_versions (policy_id, version_label, title, sections, change_note, published_at) VALUES ($1, $2, $3, $4, $5, $6)', [
        r.id,
        label,
        d.title,
        JSON.stringify(d.sections),
        d.changeNote,
        iso(now),
      ]);
    },
    facts: async ({ tx }, r) =>
      (await tx.query<{ version_label: string; change_note: string | null; published_at: Date }>('SELECT version_label, change_note, published_at FROM policy_versions WHERE policy_id = $1 ORDER BY id DESC', [r.id])).map(
        (v) => ({ label: `${v.version_label} · ${v.published_at.toISOString().slice(0, 10)}`, value: v.change_note ?? '' }),
      ),
    creatable: false,
  },
];

DEFS.push({
  type: 'article',
  plural: 'articles',
  table: 'support_articles',
  idCol: 'id',
  schema: articleDraftSchema as z.ZodType<Record<string, unknown>>,
  perm: { draft: 'content.draft', publish: 'content.publish' },
  highRisk: [],
  liveOf: (r) => ({ title: r.title, body: r.body, onHub: r.on_hub }),
  name: (d) => String(d.title),
  subtitle: (_r, d) => (d.onHub ? 'On the help hub' : 'Linked from treatments only'),
  liveState: () => 'live',
  newId: (d) => rid('art', String(d.title)),
  insert: async ({ tx }, id, d) => {
    await tx.query(`INSERT INTO support_articles (id, title, body, sort, on_hub, sample, draft) VALUES ($1, $2, $3, 99, $4, false, $5)`, [id, d.title, JSON.stringify(d.body), d.onHub, JSON.stringify(d)]);
  },
  apply: async ({ tx }, r, d) => {
    await tx.query('UPDATE support_articles SET title = $2, body = $3, on_hub = $4, sample = false WHERE id = $1', [r.id, d.title, JSON.stringify(d.body), d.onHub]);
  },
  // Archived articles leave the hub and their page answers "not found"; one a treatment links to can't be archived.
  archive: async ({ tx }, r) => {
    if ((await tx.query('SELECT 1 FROM services WHERE suitability_article = $1 AND status <> \'archived\' LIMIT 1', [r.id])).length) {
      throw new HttpError(409, 'conflict', 'A treatment links to this article: change the treatment first.');
    }
  },
  restore: async () => undefined,
  blockDelete: async ({ tx }, r) => ((await tx.query('SELECT 1 FROM services WHERE suitability_article = $1 LIMIT 1', [r.id])).length ? 'A treatment links to this article.' : null),
  creatable: true,
});

export function registerEntityRoutes(app: FastifyInstance, { now }: { now: () => number }) {
  const { db } = app;
  const { auth, pre, audit, conflict } = staffKit(app, now);
  const second = async () => {
    const [s] = await db.query<{ settings: { secondApprover: { on: boolean; fields: string[] } } }>('SELECT settings FROM app_settings WHERE id = 1');
    return s!.settings.secondApprover;
  };

  for (const def of DEFS) {
    const base = `/v1/staff/${def.plural}`;
    const stateOf = (r: Row): PublishState => (r.archived_at ? 'archived' : r.in_review ? 'review' : !r.published_at ? 'draft' : def.liveState(r));
    const ctx = (tx: Queryable): Ctx => ({ tx, now: now() });
    async function load(tx: Queryable, id: string, lock = false): Promise<Row> {
      const [row] = await tx.query<Row>(`SELECT * FROM ${def.table} WHERE ${def.idCol} = $1 ${lock ? 'FOR UPDATE' : ''}`, [id]);
      if (!row) throw new HttpError(404, 'not_found', 'Not found.');
      return row;
    }
    async function versioned(tx: Queryable, id: string, version: number) {
      const row = await load(tx, id, true);
      if (row.version !== version) throw conflict();
      return row;
    }
    const draftOf = (r: Row) => r.draft ?? def.liveOf(r);
    const risky = (r: Row) => {
      if (!r.first_published_at) return [];
      const live = def.liveOf(r);
      const d = draftOf(r);
      return [...new Set(def.highRisk.filter((h) => JSON.stringify(live[h.field]) !== JSON.stringify(d[h.field])).map((h) => h.key))];
    };
    async function view(tx: Queryable, r: Row, viewer: string): Promise<Entity> {
      const [waiting] = await tx.query<{ id: string; submitted_by: string }>(`SELECT id, submitted_by FROM approvals WHERE item_type = $1 AND item_id = $2 AND status = 'waiting'`, [
        def.type,
        String(r[def.idCol]),
      ]);
      const d = draftOf(r);
      return {
        id: String(r[def.idCol]),
        type: def.type,
        state: stateOf(r),
        version: r.version,
        draft: d,
        live: r.published_at ? def.liveOf(r) : null,
        highRiskChanges: risky(r),
        missing: def.missing ? await def.missing(ctx(tx), d, r) : [],
        waitingApproval: waiting ? { id: waiting.id, submittedByMe: waiting.submitted_by === viewer } : null,
        updatedAt: r.updated_at?.toISOString() ?? null,
        deletable: !r.first_published_at,
        facts: def.facts ? await def.facts(ctx(tx), r) : [],
      };
    }
    async function bump(tx: Queryable, id: string, set: string, params: unknown[] = []) {
      await tx.query(`UPDATE ${def.table} SET ${set ? `${set}, ` : ''}version = version + 1, updated_at = $2 WHERE ${def.idCol} = $1`, [id, iso(now()), ...params]);
    }
    async function withdraw(tx: Queryable, request: FastifyRequest, id: string, why: string) {
      const gone = await tx.query<{ id: string }>(
        `UPDATE approvals SET status = 'withdrawn', decided_by = $3, decided_at = $4 WHERE item_type = $1 AND item_id = $2 AND status = 'waiting' RETURNING id`,
        [def.type, id, auth(request).customerId, iso(now())],
      );
      for (const a of gone) await audit(tx, request, `approval:${a.id}`, 'status', 'waiting', 'withdrawn', why);
    }
    /** Makes the draft live; field-by-field audit; settles waiting approvals. */
    async function publish(tx: Queryable, request: FastifyRequest, r: Row, reason: string) {
      const d = draftOf(r);
      await assertComplete(tx, r);
      const before = r.published_at ? def.liveOf(r) : null;
      await def.apply(ctx(tx), r, d);
      const id = String(r[def.idCol]);
      await bump(tx, id, 'draft = NULL, in_review = false, archived_at = NULL, published_at = COALESCE(published_at, $2), first_published_at = COALESCE(first_published_at, $2)');
      for (const c of diffFields(before, d)) await audit(tx, request, `${def.type}:${id}`, c.field, c.old, c.new, reason);
      await audit(tx, request, `${def.type}:${id}`, 'state', before ? stateOf(r) : 'draft', 'live', reason);
      await tx.query(`UPDATE approvals SET status = 'approved', decided_by = $3, decided_at = $4 WHERE item_type = $1 AND item_id = $2 AND status = 'waiting'`, [
        def.type,
        id,
        auth(request).customerId,
        iso(now()),
      ]);
    }
    /** Same completeness rule for submit, second-approver hand-off and publish, so an Owner never gets an item they can't approve (ST-3). */
    async function assertComplete(tx: Queryable, r: Row) {
      const missing = def.missing ? await def.missing(ctx(tx), draftOf(r), r) : [];
      if (missing.length) throw new HttpError(409, 'conflict', `${missing.length} thing${missing.length > 1 ? 's' : ''} to fix: ${missing.join(', ')}.`);
    }
    async function openApproval(tx: Queryable, request: FastifyRequest, r: Row, fields: string[], why: string) {
      await assertComplete(tx, r);
      const id = String(r[def.idCol]);
      const d = draftOf(r);
      await tx.query(
        `INSERT INTO approvals (item_type, item_id, item_name, submitted_by, fields, summary, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7)
         ON CONFLICT (item_type, item_id) WHERE status = 'waiting' DO NOTHING`,
        [def.type, id, def.name(d), auth(request).customerId, fields, fields.length ? `${fields.join(', ')} change` : r.published_at ? 'Content changes' : `New ${def.type}`, iso(now())],
      );
      await bump(tx, id, 'in_review = true');
      await audit(tx, request, `${def.type}:${id}`, 'state', stateOf(r), 'review', why);
      const [who] = await tx.query<{ first_name: string | null }>('SELECT first_name FROM customers WHERE id = $1', [auth(request).customerId]);
      await notify(tx, { audience: 'staff', permission: def.perm.publish, template: 'NTF-12.approval_needed', data: { item: def.name(d), who: who?.first_name ?? '' }, now: now() });
    }

    // Approvals queue (STF-08/09) publishes or sends back through the same rules.
    app.approvalHandlers.set(def.type, {
      publish: async (tx, request, id) => publish(tx, request, await load(tx, id, true), 'approved'),
      reject: async (tx, request, id, reason) => {
        await bump(tx, id, 'in_review = false');
        await audit(tx, request, `${def.type}:${id}`, 'state', 'review', 'draft', `sent back: ${reason}`);
      },
      name: async (id) => {
        const r = await load(db, id).catch(() => null);
        return r ? def.name(draftOf(r)) : id;
      },
    });

    app.get(base, pre(def.perm.draft), async (request): Promise<EntityRow[]> => {
      const q = z.object({ filter: z.enum(['all', 'live', 'draft', 'archived']).default('all'), q: z.string().max(80).optional() }).parse(request.query);
      // Campaigns in date order, soonest first (ST-5).
      const rows = await db.query<Row>(`SELECT * FROM ${def.table} ORDER BY ${def.table === 'campaigns' ? 'starts_at ASC' : def.idCol}`);
      const tz = await clinicTz(db);
      const term = q.q?.trim().toLowerCase();
      return rows
        .filter((r) => {
          const st = stateOf(r);
          if (q.filter === 'archived') return st === 'archived';
          if (st === 'archived') return false;
          if (q.filter === 'live' && (st === 'draft' || st === 'review')) return false;
          if (q.filter === 'draft' && !(st === 'draft' || st === 'review' || r.draft)) return false;
          return !term || def.name(draftOf(r)).toLowerCase().includes(term);
        })
        .map((r) => ({
          id: String(r[def.idCol]),
          name: def.name(draftOf(r)),
          subtitle: def.subtitle(r, draftOf(r), now(), tz),
          state: stateOf(r),
          phase: def.phase?.(r, now()) ?? null,
          hasDraft: !!r.draft && !!r.published_at,
          deletable: !r.first_published_at,
          archivedAt: r.archived_at?.toISOString() ?? null,
          version: r.version,
        }));
    });

    app.get(`${base}/:id`, pre(def.perm.draft), async (request) => {
      const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
      return view(db, await load(db, id), auth(request).customerId);
    });

    if (def.creatable) {
      app.post(base, pre(def.perm.draft), async (request) => {
        const body = entityCreateSchema.parse(request.body);
        const d = def.schema.parse(body.draft);
        const id = def.newId(d);
        return db.transaction(async (tx) => {
          await def.insert(ctx(tx), id, d);
          await bump(tx, id, '');
          await audit(tx, request, `${def.type}:${id}`, 'state', null, 'draft', 'created');
          return view(tx, await load(tx, id), auth(request).customerId);
        });
      });
    }

    app.put(`${base}/:id/draft`, pre(def.perm.draft), async (request) => {
      const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
      const body = entitySaveSchema.parse(request.body);
      const d = def.schema.parse(body.draft);
      return db.transaction(async (tx) => {
        const r = await versioned(tx, id, body.version);
        if (r.archived_at) throw new HttpError(409, 'conflict', 'Restore this first.');
        if (def.type === 'promo' && d.code !== id) throw new HttpError(409, 'conflict', 'A code can’t be renamed: make a new one.');
        const before = r.draft ?? (r.published_at ? def.liveOf(r) : null);
        await withdraw(tx, request, id, 'edited after submitting');
        await bump(tx, id, 'draft = $3, in_review = false', [JSON.stringify(d)]);
        for (const c of diffFields(before, d)) await audit(tx, request, `${def.type}:${id}`, `draft.${c.field}`, c.old, c.new, 'draft saved');
        return view(tx, await load(tx, id), auth(request).customerId);
      });
    });

    app.post(`${base}/:id/submit`, pre(def.perm.draft), async (request) => {
      const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
      const { version } = versionedSchema.parse(request.body);
      return db.transaction(async (tx) => {
        const r = await versioned(tx, id, version);
        if (r.archived_at) throw new HttpError(409, 'conflict', 'Restore this first.');
        await openApproval(tx, request, r, risky(r), 'submitted');
        return view(tx, await load(tx, id), auth(request).customerId);
      });
    });

    app.post(`${base}/:id/publish`, pre(def.perm.publish), async (request) => {
      const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
      const { version } = versionedSchema.parse(request.body);
      const s = await second();
      return db.transaction(async (tx) => {
        const r = await versioned(tx, id, version);
        if (r.archived_at) throw new HttpError(409, 'conflict', 'Restore this first.');
        const fields = risky(r);
        if (s.on && fields.some((f) => s.fields.includes(f))) {
          await openApproval(tx, request, r, fields, 'second approver required');
          return { outcome: 'waiting' as const, entity: await view(tx, await load(tx, id), auth(request).customerId) };
        }
        await publish(tx, request, r, 'published');
        return { outcome: 'published' as const, entity: await view(tx, await load(tx, id), auth(request).customerId) };
      });
    });

    if (def.archive && def.restore) {
      app.post(`${base}/:id/archive`, pre(def.perm.publish), async (request) => {
        const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
        const { version } = versionedSchema.parse(request.body);
        return db.transaction(async (tx) => {
          const r = await versioned(tx, id, version);
          // A restored item is a draft again but was live before, so it can be archived; only never-live drafts are deleted instead (ST-8).
          if (!r.first_published_at) throw new HttpError(409, 'conflict', 'This draft was never live: delete it instead.');
          if (r.archived_at) throw conflict();
          await def.archive!(ctx(tx), r);
          await withdraw(tx, request, id, 'archived');
          await bump(tx, id, 'archived_at = $2, in_review = false');
          await audit(tx, request, `${def.type}:${id}`, 'state', stateOf(r), 'archived', 'archived');
          return view(tx, await load(tx, id), auth(request).customerId);
        });
      });
      app.post(`${base}/:id/restore`, pre(def.perm.publish), async (request) => {
        const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
        const { version } = versionedSchema.parse(request.body);
        return db.transaction(async (tx) => {
          const r = await versioned(tx, id, version);
          if (!r.archived_at) throw new HttpError(409, 'conflict', 'Only archived items can be restored.');
          await def.restore!(ctx(tx), r);
          // Back as a draft: nothing customer-visible until it's published again.
          await bump(tx, id, 'archived_at = NULL, published_at = NULL, draft = COALESCE(draft, $3)', [JSON.stringify(def.liveOf(r))]);
          await audit(tx, request, `${def.type}:${id}`, 'state', 'archived', 'draft', 'restored');
          return view(tx, await load(tx, id), auth(request).customerId);
        });
      });
    }

    if (def.creatable) {
      app.post(`${base}/:id/delete`, pre(def.perm.draft), async (request) => {
        const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
        const { version } = versionedSchema.parse(request.body);
        await db.transaction(async (tx) => {
          const r = await versioned(tx, id, version);
          if (r.first_published_at) throw new HttpError(409, 'conflict', 'Customers have seen this: archive it instead.');
          const blocked = def.blockDelete ? await def.blockDelete(ctx(tx), r) : null;
          if (blocked) throw new HttpError(409, 'conflict', blocked);
          await tx.query(`DELETE FROM approvals WHERE item_type = $1 AND item_id = $2`, [def.type, id]);
          await tx.query(`DELETE FROM ${def.table} WHERE ${def.idCol} = $1`, [id]);
          await audit(tx, request, `${def.type}:${id}`, 'state', 'draft', 'deleted', 'deleted draft');
        });
        return { deleted: true };
      });
    }

    // Campaign lifecycle (STF-05 row menu): pause / resume / end now / duplicate for next year.
    if (def.type === 'campaign') {
      const lifecycle = (action: 'pause' | 'resume' | 'end') =>
        app.post(`${base}/:id/${action}`, pre(def.perm.publish), async (request) => {
          const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
          const { version } = versionedSchema.parse(request.body);
          return db.transaction(async (tx) => {
            const r = await versioned(tx, id, version);
            if (!r.published_at || r.archived_at) throw new HttpError(409, 'conflict', 'Only live campaigns can be paused or ended.');
            if (action === 'end') await bump(tx, id, `ends_at = LEAST(ends_at, $2), home_rank = NULL`);
            else await bump(tx, id, `paused = ${action === 'pause'}`);
            await audit(tx, request, `campaign:${id}`, action === 'end' ? 'endsAt' : 'paused', action === 'end' ? (r.ends_at as Date).toISOString() : String(r.paused), action === 'end' ? iso(now()) : String(action === 'pause'), action);
            return view(tx, await load(tx, id), auth(request).customerId);
          });
        });
      lifecycle('pause');
      lifecycle('resume');
      lifecycle('end');
      app.post(`${base}/:id/duplicate`, pre(def.perm.draft), async (request) => {
        const { id } = z.object({ id: z.string().max(80) }).parse(request.params);
        return db.transaction(async (tx) => {
          const r = await load(tx, id);
          const d = { ...draftOf(r) };
          // "Reuse for next year: dates move forward" (STF-05).
          const year = (s: unknown) => {
            const dt = new Date(String(s));
            dt.setUTCFullYear(dt.getUTCFullYear() + 1);
            return dt.toISOString();
          };
          d.startsAt = year(d.startsAt);
          d.endsAt = year(d.endsAt);
          const copy = def.schema.parse(d);
          const newId = def.newId(copy);
          await def.insert(ctx(tx), newId, copy);
          await bump(tx, newId, '');
          await audit(tx, request, `campaign:${newId}`, 'state', null, 'draft', `duplicated from ${id}`);
          return view(tx, await load(tx, newId), auth(request).customerId);
        });
      });
      // STF-06 templates: start from last time's campaign of the same kind (dates moved forward), or a blank one.
      app.get('/v1/staff/campaign-templates/:template', pre(def.perm.draft), async (request) => {
        const { template } = z.object({ template: z.enum(['halloween', 'canada_day', 'black_friday', 'holidays', 'own']) }).parse(request.params);
        const [last] = await db.query<Row>(`SELECT * FROM campaigns WHERE template = $1 ORDER BY starts_at DESC LIMIT 1`, [template]);
        if (last) {
          const d = { ...def.liveOf(last) };
          // Both dates move by the same number of years, so the range stays valid (API-6).
          let years = 0;
          const start = new Date(String(d.startsAt));
          while (new Date(start).setUTCFullYear(start.getUTCFullYear() + years) < now()) years++;
          const shift = (s: unknown) => {
            const dt = new Date(String(s));
            dt.setUTCFullYear(dt.getUTCFullYear() + years);
            return dt.toISOString();
          };
          return { ...d, startsAt: shift(d.startsAt), endsAt: shift(d.endsAt) };
        }
        const start = new Date(now() + 7 * 86_400_000);
        return {
          template,
          eyebrow: 'Offer',
          title: '',
          summary: null,
          body: null,
          photo: null,
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + 14 * 86_400_000).toISOString(),
          audience: 'all',
          eligible: [],
          terms: [],
          cta: { label: 'See treatments', href: '/treatments' },
          fallback: { label: 'See treatments', href: '/treatments' },
        };
      });
    }
  }

}

export type ApprovalHandler = {
  publish(tx: Queryable, request: FastifyRequest, id: string): Promise<void>;
  reject(tx: Queryable, request: FastifyRequest, id: string, reason: string): Promise<void>;
  name(id: string): Promise<string>;
};
export const ENTITY_PERMS = Object.fromEntries(DEFS.map((d) => [d.type, d.perm])) as Record<EntityType, { draft: Permission; publish: Permission }>;
