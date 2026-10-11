import { onboardingRedirect } from './flow';

jest.mock('expo-router', () => ({ router: {} }));
jest.mock('../api/client', () => ({}));

describe('onboardingRedirect (FE-1)', () => {
  it('sends an unfinished sign-up to its pending step from anywhere in the app', () => {
    expect(onboardingRedirect('consents', '/home')).toBe('/auth/consents');
    expect(onboardingRedirect('profile', '/visits/v1')).toBe('/auth/profile');
    expect(onboardingRedirect('match', '/auth/phone')).toBe('/auth/match');
  });

  it('leaves the step itself, the entry splash, the terms page and finished accounts alone', () => {
    expect(onboardingRedirect('consents', '/auth/consents')).toBeNull();
    expect(onboardingRedirect('consents', '/')).toBeNull();
    expect(onboardingRedirect('consents', '/legal/terms')).toBeNull();
    expect(onboardingRedirect('done', '/home')).toBeNull();
    expect(onboardingRedirect(undefined, '/home')).toBeNull();
  });
});
