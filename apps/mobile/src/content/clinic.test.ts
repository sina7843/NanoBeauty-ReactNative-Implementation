import { isOpenNow } from './clinic';

const hours = {
  weekly: [
    { day: 5, opens: '10:00', closes: '18:00' }, // Friday
  ],
  closures: ['2026-10-15'],
};

describe('isOpenNow (SUP-03)', () => {
  it('uses the clinic time zone, not the device', () => {
    // Fri 16 Oct 2026, 17:30 UTC = 10:30 PDT → open.
    expect(isOpenNow(hours, 'America/Vancouver', Date.parse('2026-10-16T17:30:00Z'))).toBe(true);
    // Fri 16 Oct 2026, 16:30 UTC = 09:30 PDT → not yet.
    expect(isOpenNow(hours, 'America/Vancouver', Date.parse('2026-10-16T16:30:00Z'))).toBe(false);
    // Sat 17 Oct 2026, 00:59 UTC = Fri 17:59 PDT → still open; 01:00 UTC = 18:00 → closed.
    expect(isOpenNow(hours, 'America/Vancouver', Date.parse('2026-10-17T00:59:00Z'))).toBe(true);
    expect(isOpenNow(hours, 'America/Vancouver', Date.parse('2026-10-17T01:00:00Z'))).toBe(false);
  });

  it('respects closures and makes no claim without published hours', () => {
    expect(isOpenNow({ ...hours, closures: ['2026-10-16'] }, 'America/Vancouver', Date.parse('2026-10-16T17:30:00Z'))).toBe(false);
    expect(isOpenNow(null, 'America/Vancouver', Date.now())).toBeNull();
  });
});
