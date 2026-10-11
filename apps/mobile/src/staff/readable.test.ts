import { auditItemName, groupByMonth, humanize, splitDiff, startMonth } from './readable';

describe('readable staff values', () => {
  it('turns audit item keys into names', () => {
    expect(auditItemName('service:svc_new_service_3e48')).toEqual({ type: 'Treatment', name: 'New service' });
    expect(auditItemName('promo:HALLO26')).toEqual({ type: 'Promo code', name: 'HALLO26' });
    expect(auditItemName('mystery')).toEqual({ type: null, name: 'Mystery' });
    expect(humanize('awaiting_clinic')).toBe('Awaiting clinic');
  });
  it('splits a before/after summary', () => {
    expect(splitDiff('Price: $320 → $250 (lower face)')).toEqual({ label: 'Price', before: '$320', after: '$250 (lower face)' });
    expect(splitDiff('New treatment')).toBeNull();
  });
  it('groups campaigns by the month they start, not the day (ST-5)', () => {
    expect(startMonth('Oct 20 – Nov 1')).toBe('October');
    expect(startMonth('20 Oct – 1 Nov · Home slot 2')).toBe('October');
    expect(startMonth('Sept 3 – Sept 9')).toBe('September');
    const rows = [{ subtitle: 'Oct 1 – Oct 31' }, { subtitle: 'Oct 20 – Nov 1' }, { subtitle: 'Nov 27 – Dec 1' }, { subtitle: 'Oct 1 – Oct 31' }];
    expect(groupByMonth(rows).map((g) => [g.month, g.rows.length])).toEqual([
      ['October', 2],
      ['November', 1],
      ['October', 1],
    ]);
  });
});
