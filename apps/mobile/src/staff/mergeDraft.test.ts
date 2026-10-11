import { mergeDraft } from './mergeDraft';

const base = { name: 'A', faq: [] as string[] };

describe('mergeDraft', () => {
  it('keeps local edits and takes the fields saved elsewhere (service edit + FAQ screen)', () => {
    expect(mergeDraft(base, { name: 'B', faq: [] }, { name: 'A', faq: ['q'] })).toEqual({ draft: { name: 'B', faq: ['q'] }, conflict: false });
  });
  it('flags a field both sides changed differently', () => {
    expect(mergeDraft(base, { name: 'B', faq: [] }, { name: 'C', faq: [] }).conflict).toBe(true);
  });
  it('is not a conflict when both made the same change', () => {
    expect(mergeDraft(base, { name: 'B', faq: [] }, { name: 'B', faq: [] }).conflict).toBe(false);
  });
});
