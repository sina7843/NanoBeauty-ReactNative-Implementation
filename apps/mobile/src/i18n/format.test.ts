import { t } from './index';
import { clinicTime, money, timeZoneLabel } from './format';

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
