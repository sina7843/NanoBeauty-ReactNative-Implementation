import { t } from './index';
import { clinicDate, clinicDateLong, clinicDateTime, clinicDay, clinicTime, money, timeZoneLabel } from './format';

describe('formatting', () => {
  it('formats CAD with the locale formatter', () => {
    expect(money(1250)).toBe('$1,250.00');
    expect(money(50)).toBe('$50.00');
  });

  it('formats clinic-local times in house style', () => {
    expect(clinicTime('2026-10-07T06:00:00Z', 'America/Vancouver')).toBe('11 pm');
    expect(clinicTime('2026-10-16T21:30:00Z', 'America/Vancouver')).toBe('2:30 pm');
    expect(timeZoneLabel('America/Vancouver')).toBe('PT');
  });

  it('interpolates strings and leaves unknown placeholders visible', () => {
    expect(t('ent.maintenance.body', { time: '11 pm', zone: 'PT' })).toBe(
      "We're improving the app until about 11 pm PT. Your visits are unaffected. To change one now, call or text the clinic.",
    );
    expect(t('async.reference')).toBe('Reference {reference}');
  });
});

describe('clinic dates (BV-3)', () => {
  const zone = 'America/Vancouver';
  const now = Date.parse('2026-10-11T12:00:00Z');
  it('visit dates carry the weekday', () => {
    expect(clinicDay('2026-10-16T21:30:00Z', zone, now)).toBe('Fri 16 Oct');
    expect(clinicDay('2026-10-16T00:30:00Z', zone, now)).toBe('Thu 15 Oct'); // clinic-local, not UTC
  });
  it('adds the year outside the current year', () => {
    expect(clinicDate('2026-10-31T06:00:00Z', zone, now)).toBe('30 Oct');
    expect(clinicDate('2027-02-28T20:00:00Z', zone, now)).toBe('28 Feb 2027');
    expect(clinicDay('2027-02-28T20:00:00Z', zone, now)).toBe('Sun 28 Feb 2027');
  });
  it('long dates always show the year', () => {
    expect(clinicDateLong('2026-10-12T20:00:00Z', zone)).toBe('12 Oct 2026');
    expect(clinicDateLong('2027-02-28T20:00:00Z', zone)).toBe('28 Feb 2027');
  });
  it('receipts show the year with the time', () => {
    expect(clinicDateTime('2026-10-12T17:14:00Z', zone, true)).toBe('12 Oct 2026, 10:14 am PT');
  });
});
