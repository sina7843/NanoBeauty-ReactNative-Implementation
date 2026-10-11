/** Plain-language helpers for server values shown to staff (never raw keys or IDs). */
export const humanize = (v: string) => {
  const s = v.replace(/[_-]+/g, ' ').trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
};

const TYPE_LABEL: Record<string, string> = {
  service: 'Treatment',
  package: 'Package',
  campaign: 'Campaign',
  promo: 'Promo code',
  professional: 'Team profile',
  policy: 'Policy',
  article: 'Support text',
  category: 'Category',
  media: 'Photo',
  settings: 'Settings',
  import: 'Import',
  push: 'Push message',
  team: 'Team',
};

/** `service:svc_new_service_3e48` becomes "Treatment · New service" (ST-24). Unknown shapes are humanized, not hidden. */
export function auditItemName(item: string): { type: string | null; name: string } {
  const i = item.indexOf(':');
  if (i < 0) return { type: null, name: humanize(item) };
  const kind = item.slice(0, i);
  let id = item.slice(i + 1);
  if (kind !== 'promo') id = id.replace(/^[a-z]{2,4}_/, '').replace(/_[0-9a-f]{4,8}$/, '');
  return { type: TYPE_LABEL[kind] ?? humanize(kind), name: kind === 'promo' ? id : humanize(id) };
}

/** One "Label: old → new" summary line split for a before/after view (STF-09); null when it isn't in that shape. */
export function splitDiff(summary: string): { label: string; before: string; after: string } | null {
  const m = /^([^:]+):\s*(.+?)\s*→\s*(.+)$/.exec(summary);
  return m ? { label: m[1]!.trim(), before: m[2]!.trim(), after: m[3]!.trim() } : null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Full month name of the first month word in "Oct 20 – Nov 1" or "20 Oct – 1 Nov" ("Sept" too); null if none. */
export function startMonth(subtitle: string | null): string | null {
  const word = (subtitle?.split('–')[0] ?? '').match(/[A-Za-z]{3,}/)?.[0]?.slice(0, 3).toLowerCase();
  return MONTHS.find((m) => m.slice(0, 3).toLowerCase() === word) ?? null;
}

/**
 * STF-05 calendar (ST-5): rows (already in start-date order from the server) grouped by the month they start. Only
 * consecutive rows share a group, so October 2026 and October 2027 stay apart.
 * ponytail: the row has no start year, so headers are month names only; add `startsAt` to EntityRow if years are needed.
 */
export function groupByMonth<R extends { subtitle: string | null }>(rows: R[]): { month: string; rows: R[] }[] {
  const out: { month: string; rows: R[] }[] = [];
  for (const r of rows) {
    const month = startMonth(r.subtitle) ?? '—';
    const last = out[out.length - 1];
    if (last && last.month === month) last.rows.push(r);
    else out.push({ month, rows: [r] });
  }
  return out;
}
