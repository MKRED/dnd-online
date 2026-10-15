import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestApp,
  TEST_PASSWORD,
  type TestApp,
} from './support/test-app.js';

// Обновление сессии, выход и профиль: смена пароля и запрет повторно задать логин.
describe('сессия и профиль (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('refresh выдаёт новую сессию; выход отзывает refresh только своей сессии', async () => {
    const agent = await t.loginAs('alice');
    await agent.post('/api/auth/refresh').expect(200);
    await agent.get('/api/auth/me').expect(200);

    // Две отдельные сессии; их куки шлём вручную, чтобы после выхода проверить именно
    // отзыв на сервере, а не то, что браузер стёр куки.
    const login = async () => {
      const res = await t
        .anonymous()
        .post('/api/auth/login')
        .send({ login: 'alice', password: TEST_PASSWORD })
        .expect(200);
      return (res.headers['set-cookie'] as unknown as string[]).map(
        (c) => c.split(';')[0],
      );
    };
    const kept = await login();
    const leaving = await login();
    const withCookies = (cookies: string[], path: string) =>
      t.anonymous().post(path).set('Cookie', cookies);

    await withCookies(leaving, '/api/auth/logout').expect(204);
    await withCookies(leaving, '/api/auth/refresh').expect(401);
    await withCookies(kept, '/api/auth/refresh').expect(200);
  });

  it('refresh без куки — 401', async () => {
    await t.anonymous().post('/api/auth/refresh').expect(401);
  });

  it('профиль; смена пароля требует верный текущий', async () => {
    const agent = await t.loginAs('bob');
    const profile = await agent.get('/api/profile').expect(200);
    expect(profile.body).toMatchObject({ login: 'bob' });

    await agent
      .post('/api/profile/password')
      .send({ currentPassword: 'wrong-password', newPassword: 'new-password' })
      .expect(400);
    await agent
      .post('/api/profile/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: '123' })
      .expect(400);
    await agent
      .post('/api/profile/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'new-password' })
      .expect(204);

    const login = (password: string) =>
      t.anonymous().post('/api/auth/login').send({ login: 'bob', password });
    await login(TEST_PASSWORD).expect(401);
    await login('new-password').expect(200);
  });

  it('логин и пароль, уже заданные при регистрации, повторно не задаются — 409', async () => {
    const agent = await t.loginAs('carol');
    await agent
      .put('/api/profile/credentials')
      .send({ login: 'carol_new', password: 'other-password' })
      .expect(409);
    await t.anonymous().get('/api/profile').expect(401);
  });
});
