import { onlineManager } from '@tanstack/react-query';
import { ApiError, apiRequest } from './client';

describe('offline writes (NFR 09)', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('a write is refused before any request while the device is offline; reads still go (cache fallback)', async () => {
    const fetchImpl = jest.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    onlineManager.setOnline(false);
    await expect(apiRequest('/v1/orders', { method: 'POST', body: { kind: 'gift' } }, fetchImpl as unknown as typeof fetch, 'http://api.test')).rejects.toMatchObject({
      code: 'network',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    await apiRequest('/v1/catalog', {}, fetchImpl as unknown as typeof fetch, 'http://api.test');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    onlineManager.setOnline(true);
    await apiRequest('/v1/orders', { method: 'POST', body: { kind: 'gift' } }, fetchImpl as unknown as typeof fetch, 'http://api.test');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(ApiError).toBeDefined();
  });

  it('sign-in, refresh and read-style POSTs still try when the probe says offline', async () => {
    const fetchImpl = jest.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    onlineManager.setOnline(false);
    for (const path of ['/v1/auth/otp/start', '/v1/auth/otp/verify', '/v1/auth/refresh', '/v1/promo/validate', '/v1/gifts/lookup']) {
      await apiRequest(path, { method: 'POST', body: {} }, fetchImpl as unknown as typeof fetch, 'http://api.test');
    }
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });
});
