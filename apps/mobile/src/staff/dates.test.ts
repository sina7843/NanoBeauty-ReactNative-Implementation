import { fromWallInput, toWallInput } from './dates';

// Fixed-rule zone for exact-instant assertions. America/Vancouver is NOT used for those: tzdata 2026c (node:22
// images, newer ICU) gives British Columbia permanent daylight time, so winter instants differ by runtime tz data.
const TZ = 'America/Toronto';
const VAN = 'America/Vancouver';

describe('clinic wall-time inputs', () => {
  it('round-trips across standard and daylight time', () => {
    expect(fromWallInput('2026-10-31 23:59', TZ)).toBe('2026-11-01T03:59:00.000Z');
    expect(fromWallInput('2026-12-24 09:00', TZ)).toBe('2026-12-24T14:00:00.000Z');
    expect(toWallInput('2026-11-01T03:59:00.000Z', TZ)).toBe('2026-10-31 23:59');
    expect(toWallInput(fromWallInput('2027-03-14 12:00', TZ), TZ)).toBe('2027-03-14 12:00');
  });

  it('round-trips in the clinic zone whatever the runtime tz data says', () => {
    for (const text of ['2026-07-01 10:00', '2026-12-24 09:00', '2027-03-14 12:00']) expect(toWallInput(fromWallInput(text, VAN), VAN)).toBe(text);
  });

  it('rejects text that isn’t a real date', () => {
    expect(fromWallInput('31/10/2026', TZ)).toBeNull();
    expect(fromWallInput('2026-02-30 10:00', TZ)).toBeNull();
    expect(fromWallInput('2026-10-31 24:00', TZ)).toBeNull();
    expect(toWallInput(null, TZ)).toBe('');
  });
});
