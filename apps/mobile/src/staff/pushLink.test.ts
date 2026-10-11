import { DEFAULT_PUSH_OPENS, validPushOpens } from './pushLink';

describe('push Opens link', () => {
  it('accepts real customer routes, with or without a query', () => {
    expect(validPushOpens(DEFAULT_PUSH_OPENS, 'handoff')).toBe(true);
    expect(validPushOpens('/offers/halloween-glow', 'handoff')).toBe(true);
    expect(validPushOpens('/offers/halloween-glow?src=push', 'handoff')).toBe(true);
  });
  it('rejects /offers (no such route), staff routes, free text and unreachable routes', () => {
    expect(validPushOpens('/offers', 'handoff')).toBe(false);
    expect(validPushOpens('/staff/audit', 'handoff')).toBe(false);
    expect(validPushOpens('offers', 'handoff')).toBe(false);
    expect(validPushOpens('/nowhere', 'handoff')).toBe(false);
  });
});
