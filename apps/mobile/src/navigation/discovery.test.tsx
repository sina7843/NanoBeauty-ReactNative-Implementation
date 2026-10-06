import type { Catalog, HomeContent, Offer } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
jest.mock('../settings/useSettings', () => ({
  useSettings: () => ({
    data: {
      data: {
        settings: {
          bookingMode: 'handoff',
          ratingLine: { on: false, source: 'Fresha' },
          financingLine: { on: true, minCAD: 200 },
          paymentMethods: { card: true, applePay: false, googlePay: false, klarna: true, affirm: false },
          consultation: { priceCAD: 20, credited: true },
          clinicHours: null,
          sample: true,
        },
        clinic: { timezone: 'America/Vancouver', phone: null, parking: null, directionsUrl: null, address: '555 6th St #130', supportReplyTime: '1 business day' },
      },
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(45_000);

const base = { aliases: [], concerns: [], description: null, durationLabel: null, durationMin: null, perArea: false, photo: null, professionals: [], faq: [], care: [], suitabilityArticle: null, sample: true, status: 'live' as const };
const catalog: Catalog = {
  categories: [
    { id: 'skin-tightening', name: 'Skin tightening and resurfacing', photo: 'treatment-hifu' },
    { id: 'injectables', name: 'Injectables and medical', photo: null },
  ],
  concerns: [
    { id: 'loose-skin', name: 'Loose skin', homeRank: 1 },
    { id: 'pigmentation', name: 'Pigmentation', homeRank: 2 },
  ],
  professionals: [{ id: 'stf_naz', name: 'Nazanin (Naz)', profile: null, sample: true }],
  services: [
    {
      ...base,
      id: 'svc_hifu',
      categoryId: 'skin-tightening',
      name: '12D HIFU',
      aliases: ['hifu'],
      concerns: ['loose-skin'],
      price: { kind: 'from', amount: 250 },
      durationLabel: '60 to 90 min',
      durationMin: 60,
      professionals: ['stf_naz'],
      faq: [{ q: 'Does it hurt?', a: 'Most clients feel warmth and short tingles.' }],
      care: [{ when: '2 days before', title: 'Prepare your skin' }],
    },
    { ...base, id: 'svc_aw', categoryId: 'injectables', name: 'Anti-wrinkle injections', aliases: ['botox'], price: { kind: 'consultation' } },
    { ...base, id: 'svc_prp', categoryId: 'injectables', name: 'PRP Hair Treatment', price: { kind: 'consultation' }, status: 'unavailable' },
  ],
};
const offer: Offer = {
  id: 'cmp_autumn_laser',
  eyebrow: 'Autumn offer',
  title: '15% off laser packages',
  summary: null,
  body: 'Buy any new 6-session laser hair removal package during October and save 15%.',
  photo: null,
  startsAt: '2026-10-01T16:00:00.000Z',
  endsAt: '2099-11-01T06:59:00.000Z',
  state: 'live',
  audience: 'all',
  eligible: [{ title: 'Underarms, 6 sessions', was: 378, now: 321 }],
  terms: ['Not combinable with other offers or promo codes.'],
  cta: { label: 'Choose a package', href: '/wallet/buy-package' },
  fallback: { label: 'See laser treatments', href: '/treatments/list?category=laser' },
  sample: true,
};
const now = new Date().toISOString();
const home: HomeContent = {
  hero: { title: 'Skin care, by appointment.', subtitle: 'A medical spa in New Westminster', photo: null, alt: '' },
  offers: [offer],
  rating: null,
  sample: true,
  serverTime: now,
};

let offline = false;
function scriptApi() {
  global.fetch = jest.fn(async (url: string, init: { method?: string; body?: string }) => {
    if (offline) throw new TypeError('Network request failed');
    const path = url.replace('http://api.test', '');
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', etag: '"v1"' } });
    if (path === '/v1/content/home') return json(200, home);
    if (path === '/v1/catalog') return json(200, catalog);
    if (path === '/v1/offers/cmp_autumn_laser') return json(200, { offer, alternatives: [], serverTime: now });
    if (path === '/v1/support') return json(200, { articles: [{ id: 'deposits', title: 'How do deposits work?' }], askTopics: ['Unwanted hair', 'Something else'] });
    if (path === '/v1/policies/booking')
      return json(200, { id: 'booking', title: 'Booking policy', version: '1.0', updatedOn: '2026-09-25', sections: [{ heading: 'Deposits', body: 'Sample deposit text.' }], sample: true });
    if (path === '/v1/promo/validate') {
      const { code } = JSON.parse(init.body ?? '{}') as { code: string };
      const valid = code.trim().toUpperCase() === 'GLOW25';
      return json(200, {
        state: valid ? 'valid' : 'invalid',
        code: code.trim().toUpperCase(),
        description: valid ? '15% off new 6-session laser packages' : null,
        appliesLabel: valid ? 'laser packages' : null,
        endedAt: null,
        startsAt: null,
        usedAt: null,
        campaignId: valid ? 'cmp_autumn_laser' : null,
      });
    }
    return json(404, { error: { code: 'not_found', message: 'not found', requestId: 'r' } });
  }) as unknown as typeof fetch;
}

beforeEach(async () => {
  offline = false;
  await AsyncStorage.clear();
  scriptApi();
});

describe('guest discovery on the real screens (NANO-03)', () => {
  it('Home shows server hero, one primary action, the offer and concern chips', async () => {
    renderRouter(APP_DIR, { initialUrl: '/home' });
    expect(await screen.findByText('Skin care, by appointment.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Book appointment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Explore treatments' })).toBeTruthy();
    expect(await screen.findByText('15% off laser packages')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Loose skin' })).toBeTruthy();
  });

  it('browse → list → detail with price kind, financing from settings, FAQ and a hand-off book action', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/treatments/list?category=skin-tightening' });
    expect(await screen.findByText('1 treatment')).toBeTruthy();
    fireEvent.press(await screen.findByLabelText('Skin tightening and resurfacing, 12D HIFU, 60 to 90 min'));
    await waitFor(() => expect(router.getPathname()).toBe('/treatments/svc_hifu'));
    expect(await screen.findByText('Financing available: pay over time with Klarna')).toBeTruthy();
    expect(screen.getByLabelText('From $250.00')).toBeTruthy();
    expect(screen.getByText('Sample answers · clinic to approve')).toBeTruthy();
    // No profile consent → names only, no profile link.
    expect(screen.getByText('Nazanin (Naz)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Book this treatment' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/how-it-works'));
  });

  it('consultation-only and unavailable treatments read correctly', async () => {
    renderRouter(APP_DIR, { initialUrl: '/treatments/svc_aw' });
    expect(await screen.findByRole('button', { name: 'Book a consultation · $20.00' })).toBeTruthy();
    expect(screen.getByText('Consultation $20.00, credited to your treatment')).toBeTruthy();
  });

  it('TRT-07: unavailable treatment explains and offers the clinic', async () => {
    renderRouter(APP_DIR, { initialUrl: '/treatments/svc_prp' });
    expect(await screen.findByText('Not bookable in the app right now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ask the clinic' })).toBeTruthy();
  });

  it('search explains aliases and helps with spelling', async () => {
    renderRouter(APP_DIR, { initialUrl: '/treatments/search' });
    const input = await screen.findByLabelText('Search treatments or concerns');
    fireEvent.changeText(input, 'botox');
    expect(await screen.findByText('Showing results for Anti-wrinkle injections')).toBeTruthy();
    fireEvent.changeText(input, 'botoxx');
    expect(await screen.findByText('No match for “botoxx”')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Did you mean Botox?' })).toBeTruthy();
  });

  it('offer page: absolute end time, eligible items, terms one tap away', async () => {
    renderRouter(APP_DIR, { initialUrl: '/offers/cmp_autumn_laser' });
    expect(await screen.findByText('15% off laser packages')).toBeTruthy();
    expect(screen.getByText(/^Ends /)).toBeTruthy();
    expect(screen.getByText('$378.00 → $321.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose a package' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Terms and exclusions' })).toBeTruthy();
  });

  it('promo code: invalid and valid states', async () => {
    renderRouter(APP_DIR, { initialUrl: '/promo' });
    const field = await screen.findByLabelText('Promo code');
    fireEvent.changeText(field, 'nope');
    fireEvent.press(screen.getByRole('button', { name: 'Apply code' }));
    expect(await screen.findByText('We don’t recognise that code. Check the letters and try again.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Promo code'), 'glow25');
    fireEvent.press(screen.getByRole('button', { name: 'Apply code' }));
    expect(await screen.findByText('GLOW25 applied')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Choose a package' })).toBeTruthy();
  });

  it('support hub and Ask us: guests are asked to sign in before anything is sent', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/support/ask' });
    fireEvent.press(await screen.findByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('Add a short question so we can help')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Your question'), 'Is laser OK for tanned skin?');
    fireEvent.press(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(router.getPathname()).toBe('/auth/phone'));
  });

  it('legal policy shows its version, and a saved copy is labelled when offline', async () => {
    const first = renderRouter(APP_DIR, { initialUrl: '/legal/booking' });
    expect(await screen.findByText('Version 1.0 · updated 25 Sep 2026')).toBeTruthy();
    first.unmount();
    offline = true;
    renderRouter(APP_DIR, { initialUrl: '/legal/booking' });
    expect(await screen.findByText('Saved copy')).toBeTruthy();
    expect(screen.getByText('Sample deposit text.')).toBeTruthy();
  });

  it('an unknown or unpublished offer link lands on Home with the note, without retrying', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/offers/cmp_gone' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    expect(await screen.findByText('Link not found')).toBeTruthy();
  });
});
