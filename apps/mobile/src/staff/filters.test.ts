import type { EntityRow } from '@nano/contracts';
import { PRO_FILTERS, PROMO_FILTERS, type ListFilter } from './filters';

const row = (state: EntityRow['state'], phase: string | null): EntityRow => ({ id: 'x', name: 'X', subtitle: null, state, phase, hasDraft: false, deletable: false, archivedAt: null, version: 1 });
const shows = (filters: ListFilter[], id: string, r: EntityRow) => filters.find((f) => f.id === id)!.keep!(r);

describe('per-screen list filters (ST-21)', () => {
  it('sorts promo codes into Active, Scheduled and Used up', () => {
    expect(shows(PROMO_FILTERS, 'active', row('live', 'live'))).toBe(true);
    expect(shows(PROMO_FILTERS, 'scheduled', row('live', 'scheduled'))).toBe(true);
    expect(shows(PROMO_FILTERS, 'scheduled', row('draft', null))).toBe(true);
    expect(shows(PROMO_FILTERS, 'usedUp', row('live', 'used up'))).toBe(true);
    expect(shows(PROMO_FILTERS, 'usedUp', row('live', 'ended'))).toBe(true);
    expect(shows(PROMO_FILTERS, 'active', row('live', 'ended'))).toBe(false);
  });
  it('splits professionals into Visible and Hidden', () => {
    expect(shows(PRO_FILTERS, 'visible', row('live', null))).toBe(true);
    expect(shows(PRO_FILTERS, 'hidden', row('unavailable', null))).toBe(true);
    expect(shows(PRO_FILTERS, 'hidden', row('draft', null))).toBe(true);
  });
});
