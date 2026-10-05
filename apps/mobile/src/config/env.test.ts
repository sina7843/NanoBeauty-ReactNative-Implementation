import { readEnv } from './env';

describe('readEnv', () => {
  it('uses the configured API URL without a trailing slash', () => {
    expect(readEnv({ appVariant: 'staging', apiUrl: 'https://api.example.invalid/' }, undefined)).toEqual({
      appVariant: 'staging',
      apiUrl: 'https://api.example.invalid',
    });
  });

  it('points development builds at the Metro host when no URL is set', () => {
    expect(readEnv({ appVariant: 'development', apiUrl: null }, '192.168.1.20:8081')).toEqual({
      appVariant: 'development',
      apiUrl: 'http://192.168.1.20:4000',
    });
  });

  it('never guesses a host for non-development builds', () => {
    expect(readEnv({ appVariant: 'production', apiUrl: null }, '192.168.1.20:8081').apiUrl).toBeNull();
  });

  it('rejects an invalid config', () => {
    expect(() => readEnv({ appVariant: 'qa', apiUrl: null }, undefined)).toThrow(/App config is invalid/);
  });
});
