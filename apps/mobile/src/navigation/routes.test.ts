import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isReachable, routeMeta, ROUTES } from './routes';

describe('route table', () => {
  it('is a verbatim snapshot of the handover routes.json', () => {
    const source = join(__dirname, '../../../../reference/nano-beauty-dev-handover-v1.2.1/design-system/export/routes.json');
    if (!existsSync(source)) return; // reference pack not present in this checkout
    expect(ROUTES).toEqual(JSON.parse(readFileSync(source, 'utf8')));
  });

  it('matches group and dynamic segments', () => {
    expect(routeMeta('/home')?.screens).toBe('HOM-01..03');
    expect(routeMeta('/visits/abc123')?.screens).toBe('VIS-02,VIS-04,VIS-07');
    expect(routeMeta('/visits/abc123/reschedule')?.bookingMode).toBe('inapp');
    expect(routeMeta('/nope')).toBeUndefined();
  });
});

describe('booking mode gating (D33)', () => {
  it('blocks in-app booking routes in hand-off mode, including by deep link', () => {
    expect(isReachable('/book/time', 'handoff')).toBe(false);
    expect(isReachable('/book/fresha', 'handoff')).toBe(true);
    expect(isReachable('/book/service', 'handoff')).toBe(true);
  });

  it('blocks hand-off routes in in-app mode', () => {
    expect(isReachable('/book/fresha', 'inapp')).toBe(false);
    expect(isReachable('/book/time', 'inapp')).toBe(true);
  });

  it('defaults to hand-off when settings are not loaded', () => {
    expect(isReachable('/book/time', undefined)).toBe(false);
    expect(isReachable('/book/how-it-works', undefined)).toBe(true);
  });

  it('treats unknown paths as unreachable', () => {
    expect(isReachable('/book/does-not-exist', 'handoff')).toBe(false);
  });
});
