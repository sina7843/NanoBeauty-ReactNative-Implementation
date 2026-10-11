import type { Catalog, Service } from '@nano/contracts';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

export interface SearchResult {
  results: Service[];
  /** The query was an approved alias of one service ("botox" → "Anti-wrinkle injections"). */
  alias: { term: string; service: Service } | null;
  /** Spelling help when nothing matched ("botoxx" → Botox). */
  didYouMean: { term: string; service: Service } | null;
  /** TRT-04 typing: categories and concerns whose name matches, as a link to their list (FE-14). */
  groups: { kind: 'category' | 'concern'; id: string; name: string; count: number }[];
}

/**
 * DISC 03: canonical names, approved aliases, categories and concerns. Only customer-visible services
 * (archived ones are reachable from old links, never from search).
 */
export function searchCatalog(catalog: Catalog, query: string): SearchResult {
  const q = normalize(query);
  const visible = catalog.services.filter((s) => s.status !== 'archived');
  if (!q) return { results: [], alias: null, didYouMean: null, groups: [] };
  const categoryName = new Map(catalog.categories.map((c) => [c.id, normalize(c.name)]));
  const concernName = new Map(catalog.concerns.map((c) => [c.id, normalize(c.name)]));

  const aliasHit = visible.find((s) => s.aliases.some((a) => normalize(a) === q));
  const results = visible.filter(
    (s) =>
      normalize(s.name).includes(q) ||
      s.aliases.some((a) => normalize(a).startsWith(q)) ||
      (categoryName.get(s.categoryId) ?? '').includes(q) ||
      s.concerns.some((c) => (concernName.get(c) ?? '').includes(q)),
  );
  const alias = aliasHit && !normalize(aliasHit.name).includes(q) ? { term: query.trim(), service: aliasHit } : null;
  const groups = [
    ...catalog.categories.map((c) => ({ kind: 'category' as const, id: c.id, name: c.name, count: visible.filter((s) => s.categoryId === c.id).length })),
    ...catalog.concerns.map((c) => ({ kind: 'concern' as const, id: c.id, name: c.name, count: visible.filter((s) => s.concerns.includes(c.id)).length })),
  ].filter((g) => g.count > 0 && normalize(g.name).includes(q));
  if (results.length > 0 || q.length < 4) return { results, alias, didYouMean: null, groups };

  let best: { term: string; service: Service; d: number } | null = null;
  for (const s of visible) {
    for (const term of [s.name, ...s.aliases]) {
      const d = distance(q, normalize(term));
      if (d <= 2 && (!best || d < best.d)) best = { term, service: s, d };
    }
  }
  const didYouMean = best ? { term: best.term.charAt(0).toUpperCase() + best.term.slice(1), service: best.service } : null;
  return { results, alias, didYouMean, groups };
}

/** TRT-03 price groups: the board offers "Fixed price", "Price range" and "Consultation first". */
export type PriceGroup = 'fixed' | 'range' | 'consultation';
const PRICE_GROUP: Record<Service['price']['kind'], PriceGroup> = {
  fixed: 'fixed',
  from: 'range',
  range: 'range',
  perUnit: 'range',
  consultation: 'consultation',
};
export type DurationFilter = 'any' | 'under60' | 'over60';

export interface Filters {
  category?: string;
  concern?: string;
  concerns: string[];
  prices: PriceGroup[];
  duration: DurationFilter;
  professionals: string[];
}

export const EMPTY_FILTERS: Filters = { concerns: [], prices: [], duration: 'any', professionals: [] };

/** DISC 05: category, concern, price type, duration and professional, where data exists. */
export function filterServices(services: Service[], f: Filters): Service[] {
  return services.filter((s) => {
    if (s.status === 'archived') return false;
    if (f.category && s.categoryId !== f.category) return false;
    if (f.concern && !s.concerns.includes(f.concern)) return false;
    if (f.concerns.length && !f.concerns.some((c) => s.concerns.includes(c))) return false;
    if (f.prices.length && !f.prices.includes(PRICE_GROUP[s.price.kind])) return false;
    if (f.duration === 'under60' && !(s.durationMin !== null && s.durationMin < 60)) return false;
    if (f.duration === 'over60' && !(s.durationMin !== null && s.durationMin >= 60)) return false;
    if (f.professionals.length && !f.professionals.some((p) => s.professionals.includes(p))) return false;
    return true;
  });
}

export const activeFilterCount = (f: Filters) => f.concerns.length + f.prices.length + (f.duration === 'any' ? 0 : 1) + f.professionals.length;

/**
 * FE-4: why TRT-02 is empty. `scope` when the list's own category has no services, or nothing is filtered at all;
 * `filters` when sheet filters (including the entry concern) narrowed it to nothing.
 */
export function emptyCause(catalog: Catalog, category: string | undefined, filters: Filters): 'scope' | 'filters' {
  const scope = filterServices(catalog.services, { ...EMPTY_FILTERS, category });
  return scope.length === 0 || activeFilterCount(filters) === 0 ? 'scope' : 'filters';
}
