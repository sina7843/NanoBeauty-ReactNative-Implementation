import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

async function setup() {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  const dev = createDevIntegrations();
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations });
  close = () => app.close();
  return app;
}

describe('web surfaces (WEB-01–04)', () => {
  it('the gift page is a locked-down shell that carries the code only to its own script', async () => {
    const app = await setup();
    const res = await app.inject('/gift/ABCD-EFGH-JK23');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toContain('data-code="ABCD-EFGH-JK23"');
    expect(res.body).toContain('Send me a code');
    expect(res.body).not.toMatch(/<script>(?!<\/script>)/); // no inline script
  });

  it('a malformed gift link is a plain 404 (no reflection)', async () => {
    const app = await setup();
    const res = await app.inject('/gift/%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('<script>alert');
  });

  it('the account-deletion page (Google Play URL) and its assets are served', async () => {
    const app = await setup();
    const page = await app.inject('/delete');
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Delete your account');
    expect(page.body).toContain('Request deletion');
    const js = await app.inject('/web/app.js');
    expect(js.headers['content-type']).toContain('text/javascript');
    expect(() => new Function(js.body)).not.toThrow(); // valid script
    const css = await app.inject('/web/app.css');
    expect(css.body).toContain('--primary:');
  });
});
