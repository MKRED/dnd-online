import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './support/test-app.js';

// Заголовки безопасности: CSP собирается в configureApp, и ошибку в нём не видно в dev —
// Vite отдаёт страницу без CSP.
describe('заголовки безопасности (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('CSP пускает WebAssembly для сжатия моделей, но не eval', async () => {
    const res = await t.anonymous().get('/api/auth/me').expect(401);
    const csp = res.headers['content-security-policy'];
    const scriptSrc = csp
      .split(';')
      .find((directive) => directive.startsWith('script-src '));
    expect(scriptSrc).toBe("script-src 'self' 'wasm-unsafe-eval'");
  });
});
