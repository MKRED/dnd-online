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

  const directive = async (name: string) => {
    const res = await t.anonymous().get('/api/auth/me').expect(401);
    const csp = res.headers['content-security-policy'];
    return csp.split(';').find((part) => part.startsWith(`${name} `));
  };

  it('CSP пускает WebAssembly для сжатия моделей, но не eval', async () => {
    expect(await directive('script-src')).toBe(
      "script-src 'self' 'wasm-unsafe-eval'",
    );
  });

  it('CSP пускает fetch blob: — так GLTFLoader читает текстуры .glb', async () => {
    expect(await directive('connect-src')).toBe("connect-src 'self' blob:");
  });
});
