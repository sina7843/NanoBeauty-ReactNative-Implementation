import type { EntityRow } from '@nano/contracts';
import type { StringKey } from '../i18n';

/** One list filter chip: which server filter to ask for and, optionally, which of those rows to keep (ST-21). */
export type ListFilter = { id: string; label: StringKey; server: 'all' | 'live' | 'draft' | 'archived'; keep?: (r: EntityRow) => boolean };

const notLiveYet = (r: EntityRow) => r.state === 'draft' || r.state === 'review';

/** Generic set: packages, campaigns, support text. */
export const DEFAULT_FILTERS: ListFilter[] = [
  { id: 'all', label: 'stf.all', server: 'all' },
  { id: 'live', label: 'stf.live', server: 'live' },
  { id: 'draft', label: 'stf.drafts', server: 'draft' },
  { id: 'archived', label: 'stf.archived', server: 'archived' },
];

/** STF-19: Active / Scheduled / Used up / Archived. Unpublished drafts sit under Scheduled (D-N12-C3). */
export const PROMO_FILTERS: ListFilter[] = [
  { id: 'active', label: 'promo.filter.active', server: 'all', keep: (r) => r.phase === 'live' },
  { id: 'scheduled', label: 'promo.filter.scheduled', server: 'all', keep: (r) => r.phase === 'scheduled' || notLiveYet(r) },
  { id: 'usedUp', label: 'promo.filter.usedUp', server: 'all', keep: (r) => r.phase === 'used up' || r.phase === 'ended' },
  { id: 'archived', label: 'stf.archived', server: 'archived' },
];

/** STF-21: All / Visible / Hidden / Archived. Hidden = not shown in the app (hidden, or never published). */
export const PRO_FILTERS: ListFilter[] = [
  { id: 'all', label: 'stf.all', server: 'all' },
  { id: 'visible', label: 'pro.filter.visible', server: 'all', keep: (r) => r.state === 'live' },
  { id: 'hidden', label: 'pro.filter.hidden', server: 'all', keep: (r) => r.state !== 'live' },
  { id: 'archived', label: 'stf.archived', server: 'archived' },
];
