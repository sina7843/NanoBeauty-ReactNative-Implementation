import { createHash, randomBytes } from 'node:crypto';
import {
  catalogSchema,
  homeContentSchema,
  offerResponseSchema,
  policySchema,
  promoValidateRequestSchema,
  supportHubSchema,
  supportQuestionRequestSchema,
  articleSchema,
  type Catalog,
  type Offer,
  type PromoValidation,
} from '@nano/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/session';
import { HttpError } from '../errors';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** Revalidated on every launch (`no-cache`) but transferred only when the content changed. */
function sendCached(request: FastifyRequest, reply: FastifyReply, body: unknown) {
  const etag = `"${createHash('sha1').update(JSON.stringify(body)).digest('base64url')}"`;
  reply.header('etag', etag).header('cache-control', 'no-cache');
  if (request.headers['if-none-match'] === etag) return reply.status(304).send();
  return body;
}

type CampaignRow = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string | null;
  body: string | null;
  photo: string | null;
  starts_at: Date;
  ends_at: Date;
  paused: boolean;
  audience: 'all' | 'returning';
  eligible: Offer['eligible'];
  terms: string[];
  cta: Offer['cta'];
  fallback: Offer['fallback'];
  sample: boolean;
};
const CAMPAIGN_COLUMNS = 'id, eyebrow, title, summary, body, photo, starts_at, ends_at, paused, audience, eligible, terms, cta, fallback, sample';

/** Offer state from the server clock (PROMO 02, 09): the app never decides an offer is live on its own. */
export function offerState(c: Pick<CampaignRow, 'starts_at' | 'ends_at' | 'paused'>, now: number): Offer['state'] {
  if (now >= c.ends_at.getTime()) return 'expired';
  if (c.paused) return 'paused';
  if (now < c.starts_at.getTime()) return 'upcoming';
  return 'live';
}

const toOffer = (c: CampaignRow, now: number): Offer => ({
  id: c.id,
  eyebrow: c.eyebrow,
  title: c.title,
  summary: c.summary,
  body: c.body,
  photo: c.photo,
  startsAt: c.starts_at.toISOString(),
  endsAt: c.ends_at.toISOString(),
  state: offerState(c, now),
  audience: c.audience,
  eligible: c.eligible,
  terms: c.terms,
  cta: c.cta,
  fallback: c.fallback,
  sample: c.sample,
});

export function registerContentRoutes(app: FastifyInstance, { now }: { now: () => number }) {
  const { db } = app;

  async function block<T>(id: string): Promise<T | null> {
    const [row] = await db.query<{ value: T }>('SELECT value FROM content_blocks WHERE id = $1', [id]);
    return row?.value ?? null;
  }

  // Only approved, customer-visible services (DISC 02); drafts never leave the server.
  app.get('/v1/catalog', async (request, reply) => {
    const [categories, concerns, services, professionals] = await Promise.all([
      db.query<{ id: string; name: string; photo: string | null }>('SELECT id, name, photo FROM categories WHERE NOT archived ORDER BY sort'),
      db.query<{ id: string; name: string; home_rank: number | null }>('SELECT id, name, home_rank FROM concerns ORDER BY sort'),
      db.query<Record<string, unknown>>(
        `SELECT id, category_id, name, aliases, concerns, description, price, duration_label, duration_min, per_area, photo, status,
                professionals, faq, care, suitability_article, sample
           FROM services WHERE status <> 'draft' ORDER BY sort`,
      ),
      db.query<{ id: string; name: string; title: string | null; bio: string | null; photo: string | null; profile_consent: boolean; sample: boolean }>(
        'SELECT id, name, title, bio, photo, profile_consent, sample FROM professionals ORDER BY name',
      ),
    ]);
    const catalog: Catalog = catalogSchema.parse({
      categories,
      concerns: concerns.map((c) => ({ id: c.id, name: c.name, homeRank: c.home_rank })),
      services: services.map((s) => ({
        id: s.id,
        categoryId: s.category_id,
        name: s.name,
        aliases: s.aliases,
        concerns: s.concerns,
        description: s.description,
        price: s.price,
        durationLabel: s.duration_label,
        durationMin: s.duration_min,
        perArea: s.per_area,
        photo: s.photo,
        status: s.status,
        professionals: s.professionals,
        faq: s.faq,
        care: s.care,
        suitabilityArticle: s.suitability_article,
        sample: s.sample,
      })),
      // Without written consent only the name leaves the server: no title, bio or photo.
      professionals: professionals.map((p) => ({
        id: p.id,
        name: p.name,
        profile: p.profile_consent ? { title: p.title, bio: p.bio, photo: p.photo } : null,
        sample: p.sample,
      })),
    });
    return sendCached(request, reply, catalog);
  });

  app.get('/v1/content/home', async () => {
    const t = now();
    const rows = await db.query<CampaignRow>(
      `SELECT ${CAMPAIGN_COLUMNS} FROM campaigns WHERE published AND home_rank IS NOT NULL ORDER BY home_rank`,
    );
    const home = await block<{ hero: { title: string; subtitle: string; photo: string | null; alt: string }; sample: boolean }>('home');
    const rating = await block<{ value: number; count: number; source: string }>('rating');
    return homeContentSchema.parse({
      hero: home?.hero ?? { title: '', subtitle: '', photo: null, alt: '' },
      // Ended offers never sit on Home (safe destination lives on the offer page itself).
      offers: rows.map((r) => toOffer(r, t)).filter((o) => o.state !== 'expired').slice(0, 2),
      rating: rating ? { value: rating.value, count: rating.count, source: rating.source } : null,
      sample: home?.sample ?? true,
      serverTime: new Date(t).toISOString(),
    });
  });

  app.get('/v1/offers/:id', async (request) => {
    const { id } = z.object({ id: z.string().min(1).max(80) }).parse(request.params);
    const t = now();
    const [row] = await db.query<CampaignRow>(`SELECT ${CAMPAIGN_COLUMNS} FROM campaigns WHERE id = $1 AND published`, [id]);
    if (!row) throw new HttpError(404, 'not_found', 'Offer not found.');
    const offer = toOffer(row, t);
    const others =
      offer.state === 'live'
        ? []
        : (await db.query<CampaignRow>(`SELECT ${CAMPAIGN_COLUMNS} FROM campaigns WHERE published AND id <> $1 ORDER BY home_rank NULLS LAST, starts_at`, [id]))
            .map((r) => toOffer(r, t))
            .filter((o) => o.state === 'live')
            .slice(0, 1);
    return offerResponseSchema.parse({ offer, alternatives: others, serverTime: new Date(t).toISOString() });
  });

  // OFR-03 / PROMO 06. Throttled per client address so codes can't be enumerated.
  app.post('/v1/promo/validate', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request): Promise<PromoValidation> => {
    const { code: raw, appliesTo } = promoValidateRequestSchema.parse(request.body);
    const code = raw.toUpperCase().replace(/\s+/g, '');
    const t = now();
    const [p] = await db.query<{
      code: string;
      campaign_id: string | null;
      description: string;
      applies_to: string;
      applies_label: string;
      starts_at: Date | null;
      ends_at: Date | null;
      total_limit: number | null;
      used: number;
      per_person: number;
      archived: boolean;
    }>('SELECT * FROM promo_codes WHERE code = $1', [code]);
    const result = (state: PromoValidation['state'], extra: Partial<PromoValidation> = {}): PromoValidation => ({
      state,
      code,
      description: p?.description ?? null,
      appliesLabel: p?.applies_label ?? null,
      endedAt: null,
      startsAt: null,
      usedAt: null,
      campaignId: p?.campaign_id ?? null,
      ...extra,
    });
    if (!p) return { ...result('invalid'), description: null, appliesLabel: null };
    // Ended and not-yet-started codes don't reveal what they were or will be (no early leak of a launch).
    const hidden = { description: null, appliesLabel: null, campaignId: null };
    if (p.ends_at && p.ends_at.getTime() <= t) return result('ended', { endedAt: iso(p.ends_at), ...hidden });
    if (p.archived) return { ...result('invalid'), description: null, appliesLabel: null };
    if (p.starts_at && p.starts_at.getTime() > t) return result('notyet', { startsAt: iso(p.starts_at), ...hidden });
    if (p.total_limit !== null && p.used >= p.total_limit) return result('usedup');
    if (appliesTo && !matchesTarget(p.applies_to, appliesTo)) return result('noteligible');
    // "Already used" needs to know who is asking; anonymous checks skip it (the purchase re-checks, NANO-06).
    const ctx = request.headers.authorization ? await authenticate(db, request.headers.authorization, t).catch(() => null) : null;
    // A stale or invalid token just means an anonymous check, not a failure.
    if (ctx) {
      const used = await db.query<{ redeemed_at: Date }>(
        'SELECT redeemed_at FROM promo_redemptions WHERE code = $1 AND customer_id = $2 ORDER BY redeemed_at',
        [code, ctx.customerId],
      );
      if (used.length >= p.per_person) return result('alreadyused', { usedAt: iso(used[0]!.redeemed_at) });
    }
    return result('valid');
  });

  app.get('/v1/support', async (request, reply) => {
    const articles = await db.query<{ id: string; title: string }>('SELECT id, title FROM support_articles WHERE on_hub ORDER BY sort');
    const ask = await block<{ topics: string[] }>('ask_topics');
    return sendCached(request, reply, supportHubSchema.parse({ articles, askTopics: ask?.topics ?? [] }));
  });

  app.get('/v1/support/articles/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1).max(80) }).parse(request.params);
    const [a] = await db.query<{ id: string; title: string; body: string[]; sample: boolean }>(
      'SELECT id, title, body, sample FROM support_articles WHERE id = $1',
      [id],
    );
    if (!a) throw new HttpError(404, 'not_found', 'Article not found.');
    return sendCached(request, reply, articleSchema.parse(a));
  });

  app.get('/v1/policies/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1).max(40) }).parse(request.params);
    const [p] = await db.query<{ id: string; title: string; version: string; updated_on: Date | string; sections: unknown; sample: boolean }>(
      'SELECT id, title, version, updated_on, sections, sample FROM policies WHERE id = $1',
      [id],
    );
    if (!p) throw new HttpError(404, 'not_found', 'Policy not found.');
    const updatedOn = typeof p.updated_on === 'string' ? p.updated_on.slice(0, 10) : p.updated_on.toISOString().slice(0, 10);
    return sendCached(request, reply, policySchema.parse({ ...p, updatedOn }));
  });

  // SUP-04 → staff inbox (SUP 05). A signed-in customer, so the clinic knows who to reply to.
  app.post('/v1/support/questions', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request) => {
    const ctx = await authenticate(db, request.headers.authorization, now());
    const body = supportQuestionRequestSchema.parse(request.body);
    const reference = `SUP-${randomBytes(3).toString('hex').toUpperCase()}`;
    await db.query(
      `INSERT INTO support_questions (reference, customer_id, topic, channel, message, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (customer_id, idempotency_key) DO NOTHING`,
      [reference, ctx.customerId, body.topic, body.channel, body.message, body.idempotencyKey, new Date(now()).toISOString()],
    );
    const [row] = await db.query<{ reference: string }>(
      'SELECT reference FROM support_questions WHERE customer_id = $1 AND idempotency_key = $2',
      [ctx.customerId, body.idempotencyKey],
    );
    return { reference: row!.reference };
  });
}

/** "package:laser" matches "package:laser" and "package:any"; "category:facials" matches "category:facials". */
export function matchesTarget(codeTarget: string, wanted: string): boolean {
  if (codeTarget === wanted) return true;
  const [kind, value] = codeTarget.split(':');
  return value === 'any' && wanted.startsWith(`${kind}:`);
}
