import { redirectSystemPath } from '../app/+native-intent';
import { resolveLink, toAppPath } from './links';
import { ROUTES } from './routes';

const OLD = '/home?notice=oldlink';

describe('deep links (PROMO 05, LEG 07, NANO-09)', () => {
  it('every notification destination opens its screen', () => {
    // The paths the server's templates (spec 3) and staff pushes open.
    const supported = [
      '/visits/v1',
      '/visits/v1/cancelled',
      '/pay/receipt/o1',
      '/wallet/gift-cards/i1',
      '/wallet/packages/i1',
      '/wallet',
      '/account/inbox/42',
      '/account/data-request',
      '/support',
      '/support/contact',
      '/offers/cmp_halloween',
      '/staff/requests/r1',
      '/staff/approvals',
      '/staff/gift-cards/i1',
      '/staff/today',
    ];
    for (const path of supported) expect(resolveLink(path, 'handoff')).toBe(path);
  });

  it('accepts the app scheme and the clinic web domain; a gift link opens the in-app claim', () => {
    expect(toAppPath('nanobeauty://visits/v1')).toBe('/visits/v1');
    expect(toAppPath('nanobeauty-dev:///wallet')).toBe('/wallet');
    expect(toAppPath('https://app.nanobeautystar.com/offers/cmp_halloween?from=sms')).toBe('/offers/cmp_halloween?from=sms');
    expect(resolveLink('https://app.nanobeautystar.com/gift/ABCD-EFGH-JK23', 'handoff')).toBe('/wallet/claim?code=ABCD-EFGH-JK23');
  });

  it('unknown, foreign, empty and mode-blocked links land on Home with "Link not found"', () => {
    expect(resolveLink('/nope', 'handoff')).toBe(OLD);
    expect(resolveLink('https://evil.example.com/visits/v1', 'handoff')).toBe(OLD);
    expect(resolveLink('http://app.nanobeautystar.com/visits/v1', 'handoff')).toBe(OLD);
    expect(resolveLink('//evil.example.com/x', 'handoff')).toBe(OLD);
    expect(resolveLink(undefined, 'handoff')).toBe(OLD);
    // D33: in-app booking screens are unreachable in hand-off; hand-off screens in in-app mode.
    expect(resolveLink('/book/time', 'handoff')).toBe(OLD);
    expect(resolveLink('/visits/v1/reschedule', undefined)).toBe(OLD);
    expect(resolveLink('/book/fresha', 'inapp')).toBe(OLD);
  });

  it('every in-app booking route stays unreachable while the mode is hand-off (the default)', () => {
    const inapp = ROUTES.filter((r) => r.bookingMode === 'inapp').map((r) => r.route.replace(/\[[^\]]+\]/g, 'x'));
    expect(inapp.length).toBeGreaterThan(5);
    for (const route of inapp) {
      expect(resolveLink(route, 'handoff')).toBe(OLD);
      expect(resolveLink(route, undefined)).toBe(OLD);
    }
  });

  it('incoming system URLs are rewritten before routing', () => {
    expect(redirectSystemPath({ path: 'https://app.nanobeautystar.com/gift/ABCDEFGHJK23', initial: true })).toBe('/wallet/claim?code=ABCDEFGHJK23');
    expect(redirectSystemPath({ path: 'nanobeauty://visits/v1', initial: false })).toBe('/visits/v1');
    expect(redirectSystemPath({ path: 'https://evil.example.com/x', initial: true })).toBe(OLD);
  });
});
