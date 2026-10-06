import type { AppGate } from '@nano/contracts';
import { compareVersions, decideEntry, type EntryInput } from './decide';

const gate: AppGate = {
  minimumVersion: { ios: '1.2.0', android: '1.1.0' },
  storeUrl: { ios: null, android: null },
  maintenance: null,
};
const base: EntryInput = {
  gate,
  platform: 'ios',
  appVersion: '1.2.0',
  primerSeen: true,
  notificationPermission: 'granted',
  now: Date.parse('2026-10-06T12:00:00Z'),
};

describe('compareVersions', () => {
  it('compares numerically, not lexically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });
});

describe('decideEntry', () => {
  it('goes Home when nothing gates entry', () => {
    expect(decideEntry(base)).toBe('home');
  });

  it('requires an update below the platform minimum (ENT-02)', () => {
    expect(decideEntry({ ...base, appVersion: '1.1.9' })).toBe('update');
    expect(decideEntry({ ...base, platform: 'android', appVersion: '1.1.9' })).toBe('home');
  });

  it('skips the update gate when the installed version is unknown', () => {
    expect(decideEntry({ ...base, appVersion: null })).toBe('home');
  });

  it('shows maintenance only while the window is open (ENT-03)', () => {
    const open = { ...gate, maintenance: { until: '2026-10-06T13:00:00Z' } };
    expect(decideEntry({ ...base, gate: open })).toBe('maintenance');
    const over = { ...gate, maintenance: { until: '2026-10-06T11:00:00Z' } };
    expect(decideEntry({ ...base, gate: over })).toBe('home');
  });

  it('puts update ahead of maintenance', () => {
    const open = { ...gate, maintenance: { until: '2026-10-06T13:00:00Z' } };
    expect(decideEntry({ ...base, gate: open, appVersion: '1.0.0' })).toBe('update');
  });

  it('shows the primer once, only while permission is undetermined (ENT-04)', () => {
    expect(decideEntry({ ...base, primerSeen: false, notificationPermission: 'undetermined' })).toBe('primer');
    expect(decideEntry({ ...base, primerSeen: true, notificationPermission: 'undetermined' })).toBe('home');
    expect(decideEntry({ ...base, primerSeen: false, notificationPermission: 'denied' })).toBe('home');
  });

  it('does not invent a gate when settings are unavailable', () => {
    expect(decideEntry({ ...base, gate: null, appVersion: '0.0.1' })).toBe('home');
  });
});
