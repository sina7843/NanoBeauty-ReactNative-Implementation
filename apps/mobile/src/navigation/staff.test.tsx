import type { CategoryRow, ImportReview, StaffService, StaffServiceRow } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///cache/fresha.csv', name: 'fresha-services-sep.csv' }] })),
}));
jest.mock('../settings/useSettings', () => ({
  useSettings: () => ({
    data: { data: { settings: { bookingMode: 'handoff', clinicHours: null, ratingLine: { on: false, source: 'Fresha' }, sample: true }, features: { legacyMembership: false }, clinic: { timezone: 'America/Vancouver', phone: null, address: '555 6th St' } } },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(60_000);

const OWNER_PERMS = ['content.draft', 'content.publish', 'team.manage', 'audit.view', 'today.view', 'value.redeem'];
const EDITOR_PERMS = ['content.draft'];
let me: { roles: string[]; permissions: string[] };
type Reply = { status: number; body?: unknown };
let routes: Record<string, (body: Record<string, unknown>) => Reply>;
let calls: { key: string; body: Record<string, unknown> }[];
const envelope = (code: string, extra: object = {}) => ({ error: { code, message: code, requestId: 'r', ...extra } });

const draft = {
  name: '12D HIFU',
  categoryId: 'skin-tightening',
  aliases: ['hifu'],
  concerns: [],
  description: 'Lifting.',
  price: { kind: 'from' as const, amount: 250 },
  durationLabel: '60 to 90 min',
  durationMin: 60,
  photo: null,
  professionals: [],
  faq: [{ q: 'Does it hurt?', a: 'Warmth and short tingles.' }],
  care: [],
  visibility: 'live' as const,
};
const service = (over: Partial<StaffService> = {}): StaffService => ({
  id: 'svc_hifu',
  state: 'live',
  version: 3,
  draft,
  live: draft,
  highRiskChanges: [],
  missing: [],
  waitingApproval: null,
  updatedAt: '2026-10-06T17:00:00.000Z',
  deletable: false,
  ...over,
});
const row: StaffServiceRow = { id: 'svc_hifu', name: '12D HIFU', categoryName: 'Skin tightening', state: 'live', hasDraft: false, price: draft.price, archivedAt: null, deletable: false, version: 3 };
const cats: CategoryRow[] = [
  { id: 'skin-tightening', name: 'Skin tightening', treatments: 1, archived: false, deletable: false, version: 1 },
  { id: 'laser', name: 'Laser', treatments: 1, archived: false, deletable: false, version: 2 },
];

function scriptApi(extra: Record<string, (body: Record<string, unknown>) => Reply> = {}) {
  calls = [];
  routes = {
    'GET /v1/me': () => ({
      status: 200,
      body: { customer: { id: 'c1', phone: '+17785550111', firstName: 'Naz', lastName: 'Staff', email: null }, consents: [], roles: me.roles, permissions: me.permissions, next: 'done', sessionExpiresAt: '2099-01-01T00:00:00.000Z' },
    }),
    'GET /v1/content/home': () => ({ status: 404, body: envelope('not_found') }),
    'GET /v1/staff/summary': () => ({ status: 200, body: { myWaiting: 2, waitingApprovals: 1, secondApprover: false } }),
    'GET /v1/staff/categories': () => ({ status: 200, body: cats }),
    'GET /v1/staff/media': () => ({ status: 200, body: [] }),
    'GET /v1/staff/services/svc_hifu': () => ({ status: 200, body: service() }),
    'GET /v1/staff/services?filter=all': () => ({ status: 200, body: [row] }),
    ...extra,
  };
  global.fetch = jest.fn(async (url: string, init: { method?: string; body?: string } = {}) => {
    if (url.startsWith('file://')) {
      return new Response('Service name,Category,Price\nFiller,Injectables,$450\nHydraFacial,Facials,$199\nHydraFacial,Facials,$209');
    }
    const key = `${init.method ?? 'GET'} ${url.replace('http://api.test', '')}`;
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ key, body });
    const r = routes[key]?.(body) ?? { status: 404, body: envelope('not_found') };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(async () => {
  me = { roles: ['Owner'], permissions: OWNER_PERMS };
  await AsyncStorage.clear();
  await SecureStore.setItemAsync(
    'nano.session.v2',
    JSON.stringify({ accessToken: 'acc', refreshToken: 'ref', accessExpiresAt: '2099-01-01T00:00:00.000Z', sessionExpiresAt: '2099-01-01T00:00:00.000Z' }),
  );
});

describe('staff access (D34, STF-01, STF-14)', () => {
  it('a customer never reaches the workspace and has no Staff row', async () => {
    me = { roles: [], permissions: [] };
    scriptApi({ 'GET /v1/me/preferences': () => ({ status: 200, body: { bookingMessages: true, reminders: true, aftercare: true, marketing: false } }), 'GET /v1/me/inbox': () => ({ status: 200, body: { items: [], unread: 0 } }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/staff/services' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    expect(calls.some((c) => c.key.startsWith('GET /v1/staff'))).toBe(false);
  });

  it('the Account screen shows Staff workspace only for staff', async () => {
    scriptApi({ 'GET /v1/me/preferences': () => ({ status: 200, body: { bookingMessages: true, reminders: true, aftercare: true, marketing: false } }), 'GET /v1/me/inbox': () => ({ status: 200, body: { items: [], unread: 0 } }) });
    renderRouter(APP_DIR, { initialUrl: '/account' });
    expect(await screen.findByText('Staff workspace')).toBeTruthy();
  });

  it('an Editor sees Content only; the Owner also sees approvals, team and audit', async () => {
    me = { roles: ['Editor'], permissions: EDITOR_PERMS };
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/staff' });
    expect(await screen.findByText('Services')).toBeTruthy();
    expect(screen.getByText('Signed in as Editor')).toBeTruthy();
    expect(await screen.findByText('2 of your drafts are waiting for the Owner.')).toBeTruthy();
    expect(screen.queryByText('Team')).toBeNull();
    expect(screen.queryByText('Audit log')).toBeNull();
    expect(screen.queryByText('Approvals')).toBeNull();
  });

  it('a 403 from the server opens STF-14', async () => {
    scriptApi({ 'GET /v1/staff/team': () => ({ status: 403, body: envelope('forbidden', { missingPermission: 'team.manage' }) }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/staff/team' });
    await waitFor(() => expect(router.getPathname()).toBe('/staff/denied'));
    expect(await screen.findByText('You can’t do this yet')).toBeTruthy();
  });
});

describe('service editing (STF-03, STF-09, D35)', () => {
  it('saves with the version it was based on; a stale save shows the conflict state and overwrites nothing', async () => {
    me = { roles: ['Editor'], permissions: EDITOR_PERMS };
    scriptApi({ 'PUT /v1/staff/services/svc_hifu/draft': () => ({ status: 409, body: envelope('conflict') }) });
    renderRouter(APP_DIR, { initialUrl: '/staff/services/svc_hifu' });
    fireEvent.changeText(await screen.findByLabelText('Price (CAD)'), '320');
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull(); // an Editor never sees Publish
    fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Someone else changed this')).toBeTruthy();
    expect(calls.find((c) => c.key === 'PUT /v1/staff/services/svc_hifu/draft')!.body).toMatchObject({ version: 3, draft: { price: { kind: 'from', amount: 320 } } });
    expect(screen.getByRole('button', { name: 'Load the latest version' })).toBeTruthy();
  });

  it('a failed save keeps the edits on the phone and says nothing was published', async () => {
    scriptApi({ 'PUT /v1/staff/services/svc_hifu/draft': () => ({ status: 500, body: envelope('internal_error') }) });
    renderRouter(APP_DIR, { initialUrl: '/staff/services/svc_hifu' });
    fireEvent.changeText(await screen.findByLabelText('Name'), '12D HIFU Lift');
    fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Couldn’t save the draft')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem('nano.staff.unsaved.service.svc_hifu'))!).draft.name).toBe('12D HIFU Lift');
  });

  it('the Owner publishes after a confirm step', async () => {
    scriptApi({
      'PUT /v1/staff/services/svc_hifu/draft': (b) => ({ status: 200, body: service({ version: 4, draft: b.draft as typeof draft, highRiskChanges: ['price'] }) }),
      'POST /v1/staff/services/svc_hifu/publish': () => ({ status: 200, body: { outcome: 'published', service: service({ version: 5 }) } }),
    });
    renderRouter(APP_DIR, { initialUrl: '/staff/services/svc_hifu' });
    fireEvent.changeText(await screen.findByLabelText('Price (CAD)'), '320');
    fireEvent.press(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Publish 12D HIFU?')).toBeTruthy();
    expect(calls.some((c) => c.key.endsWith('/publish'))).toBe(false); // nothing until confirmed
    const confirm = screen.getAllByRole('button', { name: 'Publish' });
    fireEvent.press(confirm[confirm.length - 1]!);
    await waitFor(() => expect(calls.find((c) => c.key === 'POST /v1/staff/services/svc_hifu/publish')?.body).toEqual({ version: 4 }));
  });
});

describe('lists and archive rules (STF-02, STF-04, STF-39)', () => {
  it('archive asks first (STF-39) and sends the row version', async () => {
    scriptApi({ 'POST /v1/staff/services/svc_hifu/archive': () => ({ status: 200, body: service({ state: 'archived', version: 4 }) }) });
    renderRouter(APP_DIR, { initialUrl: '/staff/services' });
    fireEvent.press(await screen.findByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Archive 12D HIFU?')).toBeTruthy();
    const archive = screen.getAllByRole('button', { name: 'Archive' });
    fireEvent.press(archive[archive.length - 1]!);
    await waitFor(() => expect(calls.find((c) => c.key === 'POST /v1/staff/services/svc_hifu/archive')?.body).toEqual({ version: 3 }));
  });

  it('a category with treatments shows the blocked state with a way to move them', async () => {
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/staff/taxonomy' });
    const archive = await screen.findAllByRole('button', { name: 'Archive' });
    fireEvent.press(archive[0]!);
    expect(await screen.findByText('“Skin tightening” isn’t empty')).toBeTruthy();
    expect(screen.getByText('Move 12D HIFU to…')).toBeTruthy();
  });
});

describe('import (STF-41/42)', () => {
  it('file → columns → review → resolve duplicates → publish', async () => {
    const reviewBase: ImportReview = {
      import: { id: '9b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d', filename: 'fresha-services-sep.csv', header: ['Service name', 'Category', 'Price'], rowCount: 3, mapping: { name: 'Service name', category: 'Category', price: 'Price', duration: null, description: null }, missingRequired: [], status: 'draft' },
      rows: [
        { index: 0, name: 'Filler', category: 'Injectables', kind: 'new', detail: null, matchId: null, decision: null },
        { index: 1, name: 'HydraFacial', category: 'Facials', kind: 'new', detail: null, matchId: null, decision: null },
        { index: 2, name: 'HydraFacial', category: 'Facials', kind: 'duplicate', detail: 'Listed twice in the file (row 3)', matchId: null, decision: null },
      ],
      counts: { new: 2, changed: 0, duplicate: 1, unresolved: 1, invalid: 0, conflict: 0 },
      result: null,
    };
    const id = reviewBase.import.id;
    let review = reviewBase;
    scriptApi({
      'POST /v1/staff/imports': () => ({ status: 200, body: reviewBase.import }),
      [`GET /v1/staff/imports/${id}/review`]: () => ({ status: 200, body: review }),
      [`PUT /v1/staff/imports/${id}/decisions`]: () => {
        review = { ...review, rows: review.rows.map((r) => (r.index === 2 ? { ...r, decision: 'skip' } : r)), counts: { ...review.counts, unresolved: 0 } };
        return { status: 200, body: review };
      },
      [`POST /v1/staff/imports/${id}/publish`]: () => {
        review = { ...review, import: { ...review.import, status: 'published' }, result: { created: 2, updated: 0, skipped: 1, waiting: 0 } };
        return { status: 200, body: review };
      },
    });
    const router = renderRouter(APP_DIR, { initialUrl: '/staff/import' });
    fireEvent.press(await screen.findByText('Choose a CSV file'));
    expect(await screen.findByText('fresha-services-sep.csv')).toBeTruthy();
    expect(calls.find((c) => c.key === 'POST /v1/staff/imports')!.body).toMatchObject({ filename: 'fresha-services-sep.csv', csv: expect.stringContaining('HydraFacial') });
    fireEvent.press(screen.getByRole('button', { name: 'Review 3 services' }));
    await waitFor(() => expect(router.getPathname()).toBe('/staff/import/review'));
    expect(await screen.findByText('Resolve 1 duplicates')).toBeTruthy();
    fireEvent.press(screen.getByRole('togglebutton', { name: 'Skip' }));
    await waitFor(() => expect(screen.queryByText('Resolve 1 duplicates')).toBeNull());
    fireEvent.press(screen.getByRole('button', { name: 'Publish 2' }));
    expect(await screen.findByText('Catalogue published')).toBeTruthy();
  });
});

describe('team and audit (STF-12/13)', () => {
  it('lists members and invites by mobile number with roles', async () => {
    let invited: Record<string, unknown> = {};
    scriptApi({
      'GET /v1/staff/team': () => ({ status: 200, body: [{ id: 'c1', name: 'Naz Staff', phoneMasked: '(778) •••-••11', roles: ['Owner'], status: 'active', since: null }] }),
      'POST /v1/staff/team/invites': (b) => {
        invited = b;
        return { status: 200, body: [{ id: 'c1', name: 'Naz Staff', phoneMasked: '(778) •••-••11', roles: ['Owner'], status: 'active', since: null }, { id: 'invite:x', name: null, phoneMasked: '(778) •••-••99', roles: ['Editor'], status: 'invited', since: null }] };
      },
    });
    renderRouter(APP_DIR, { initialUrl: '/staff/team' });
    expect(await screen.findByText('Naz Staff')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Invite someone' }));
    fireEvent.changeText(screen.getByLabelText('Their mobile number'), '(778) 555-0199');
    fireEvent.press(screen.getByRole('togglebutton', { name: 'Front desk' }));
    fireEvent.press(screen.getByRole('togglebutton', { name: 'Editor' }));
    fireEvent.press(screen.getByRole('button', { name: 'Send invite' }));
    expect(await screen.findByText('(778) •••-••99')).toBeTruthy();
    expect(invited).toEqual({ phone: '(778) 555-0199', roles: ['Editor'] });
  });

  it('audit log shows who changed what, before and after', async () => {
    scriptApi({
      'GET /v1/staff/audit?days=7': () => ({
        status: 200,
        body: [{ id: '1', actor: 'Naz Staff', roles: 'Owner', item: 'service:svc_hifu', field: 'price', oldValue: '$250', newValue: '$320', reason: 'published', device: null, at: '2026-10-06T17:00:00.000Z' }],
      }),
    });
    renderRouter(APP_DIR, { initialUrl: '/staff/audit' });
    expect(await screen.findByText('Naz Staff · service:svc_hifu')).toBeTruthy();
    expect(screen.getByText(/price: \$250 → \$320 · published/)).toBeTruthy();
  });
});
