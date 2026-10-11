import { centsOf, dollarsText, typeMoney } from './money';

describe('staff money fields', () => {
  it('keeps "25." and "49.9" while typing, caps at two decimals, one separator', () => {
    expect(typeMoney('25.')).toBe('25.');
    expect(typeMoney('49.999')).toBe('49.99');
    expect(typeMoney('1.2.3')).toBe('1.23');
    expect(typeMoney('$ 12,5')).toBe('12.5');
    expect(typeMoney('')).toBe('');
  });
  it('converts to cents only on save; empty stays empty', () => {
    expect(centsOf('49.99')).toBe(4999);
    expect(centsOf('25.')).toBe(2500);
    expect(centsOf('')).toBeNull();
    expect(dollarsText(4999)).toBe('49.99');
    expect(dollarsText(null)).toBe('');
  });
});
