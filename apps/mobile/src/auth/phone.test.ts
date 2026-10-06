import { formatPhone, maskPhone, normalizePhone } from '@nano/contracts';

describe('phone numbers (AUT-01)', () => {
  it.each([
    ['(604) 555-0123', '+16045550123'],
    ['604-555-0123', '+16045550123'],
    ['+1 604 555 0123', '+16045550123'],
    ['16045550123', '+16045550123'],
  ])('normalizes %s', (input, e164) => {
    expect(normalizePhone(input)).toBe(e164);
  });

  it.each(['(604) 555-01', '104-555-0123', '604-155-0123', '+44 20 7946 0958', ''])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('masks for "Sent to" and formats for display', () => {
    expect(maskPhone('+16045550123')).toBe('(604) •••-••23');
    expect(formatPhone('+16045550123')).toBe('(604) 555-0123');
  });
});
