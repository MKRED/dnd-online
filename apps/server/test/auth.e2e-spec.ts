import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestApp,
  TEST_PASSWORD,
  type TestApp,
} from './support/test-app.js';

describe('auth (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('регистрация ставит куки, и /me отвечает этим пользователем', async () => {
    const agent = await t.loginAs('alice');
    const me = await agent.get('/api/auth/me').expect(200);
    expect((me.body as { user: unknown }).user).toMatchObject({
      login: 'alice',
      nickname: 'alice',
    });
  });

  it('без входа /me — 401', async () => {
    await t.anonymous().get('/api/auth/me').expect(401);
  });

  it('вход с верным паролем пускает, с неверным — 401', async () => {
    await t.loginAs('bob');
    const agent = t.anonymous();
    await agent
      .post('/api/auth/login')
      .send({ login: 'bob', password: 'wrong-password' })
      .expect(401);
    await agent
      .post('/api/auth/login')
      .send({ login: 'bob', password: TEST_PASSWORD })
      .expect(200);
    await agent.get('/api/auth/me').expect(200);
  });

  it('занятый логин — 409', async () => {
    await t.loginAs('carol');
    await t
      .anonymous()
      .post('/api/auth/register')
      .send({ login: 'carol', nickname: 'Кэрол', password: TEST_PASSWORD })
      .expect(409);
  });

  it('неверное тело — 400 от общей валидации', async () => {
    await t
      .anonymous()
      .post('/api/auth/register')
      .send({ login: 'a', nickname: 'x', password: '1' })
      .expect(400);
  });
});
