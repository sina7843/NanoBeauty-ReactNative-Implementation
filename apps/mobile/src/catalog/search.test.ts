import type { Catalog, Service } from '@nano/contracts';
import { EMPTY_FILTERS, filterServices, searchCatalog } from './search';

const svc = (over: Partial<Service>): Service => ({
  id: 'x',
  categoryId: 'skin-tightening',
  name: 'X',
  aliases: [],
  concerns: [],
  description: null,
  price: { kind: 'fixed', amount: 100 },
  durationLabel: null,
  durationMin: null,
  perArea: false,
  areas: null,
  photo: null,
  status: 'live',
  professionals: [],
  faq: [],
  care: [],
  suitabilityArticle: null,
  sample: true,
  ...over,
});

const catalog: Catalog = {
  categories: [
    { id: 'skin-tightening', name: 'Skin tightening and resurfacing', photo: null },
    { id: 'injectables', name: 'Injectables and medical', photo: null },
    { id: 'laser', name: 'Laser', photo: null },
  ],
  concerns: [
    { id: 'loose-skin', name: 'Loose skin', homeRank: 2 },
    { id: 'unwanted-hair', name: 'Unwanted hair', homeRank: 3 },
  ],
  professionals: [],
  services: [
    svc({ id: 'hifu', name: '12D HIFU', aliases: ['hifu', 'ultherapy'], concerns: ['loose-skin'], price: { kind: 'from', amount: 250 }, durationMin: 60, professionals: ['naz'] }),
    svc({ id: 'aw', name: 'Anti-wrinkle injections', categoryId: 'injectables', aliases: ['botox'], price: { kind: 'consultation' } }),
    svc({ id: 'laser', name: 'Laser Hair Removal', categoryId: 'laser', concerns: ['unwanted-hair'], price: { kind: 'perUnit', amount: 50 }, durationMin: 20, professionals: ['anna'] }),
    svc({ id: 'old', name: 'Old peel', status: 'archived' }),
  ],
};

describe('searchCatalog (DISC 03, DISC 10)', () => {
  it('matches canonical names, aliases, categories and concerns', () => {
    expect(searchCatalog(catalog, 'hif').results.map((s) => s.id)).toEqual(['hifu']);
    expect(searchCatalog(catalog, 'ulther').results.map((s) => s.id)).toEqual(['hifu']);
    expect(searchCatalog(catalog, 'laser').results.map((s) => s.id)).toEqual(['laser']);
    expect(searchCatalog(catalog, 'loose skin').results.map((s) => s.id)).toEqual(['hifu']);
  });

  it('explains approved aliases with the clinic name', () => {
    const r = searchCatalog(catalog, 'Botox');
    expect(r.results.map((s) => s.id)).toEqual(['aw']);
    expect(r.alias).toMatchObject({ term: 'Botox', service: { name: 'Anti-wrinkle injections' } });
  });

  it('offers spelling help when nothing matches, and never finds archived services', () => {
    const r = searchCatalog(catalog, 'botoxx');
    expect(r.results).toEqual([]);
    expect(r.didYouMean).toMatchObject({ term: 'Botox', service: { id: 'aw' } });
    expect(searchCatalog(catalog, 'old peel').results).toEqual([]);
  });
});

describe('filterServices (DISC 05)', () => {
  it('filters by category, concern, price group, duration and professional', () => {
    const ids = (f: Partial<typeof EMPTY_FILTERS>) => filterServices(catalog.services, { ...EMPTY_FILTERS, ...f }).map((s) => s.id);
    expect(ids({})).toEqual(['hifu', 'aw', 'laser']);
    expect(ids({ category: 'laser' })).toEqual(['laser']);
    expect(ids({ concerns: ['loose-skin'] })).toEqual(['hifu']);
    expect(ids({ prices: ['consultation'] })).toEqual(['aw']);
    expect(ids({ prices: ['range'] })).toEqual(['hifu', 'laser']);
    expect(ids({ duration: 'under60' })).toEqual(['laser']);
    expect(ids({ duration: 'over60' })).toEqual(['hifu']);
    expect(ids({ professionals: ['anna'] })).toEqual(['laser']);
    expect(ids({ concerns: ['loose-skin'], prices: ['fixed'] })).toEqual([]);
  });
});
