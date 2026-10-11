import { inboxIcon, inboxSummary } from './inbox';

test('inbox icon follows the destination (WP-27)', () => {
  expect(inboxIcon('/visits/a1')).toBe('calendar-check');
  expect(inboxIcon('/offers/o1')).toBe('ticket');
  expect(inboxIcon('/pay/receipt/r1')).toBe('receipt');
  expect(inboxIcon('/wallet/gift-cards/g1')).toBe('gift');
  expect(inboxIcon('/wallet')).toBe('wallet');
  expect(inboxIcon('/walletx')).toBe('envelope-simple');
  expect(inboxIcon(null)).toBe('envelope-simple');
});

test('inbox summary is the first sentence', () => {
  expect(inboxSummary({ body: 'Laser Hair Removal, Thu 16 Oct, 2:30 pm. See you then.' })).toBe('Laser Hair Removal, Thu 16 Oct, 2:30 pm');
  expect(inboxSummary({ body: 'Reference DR-1042.' })).toBe('Reference DR-1042');
});
