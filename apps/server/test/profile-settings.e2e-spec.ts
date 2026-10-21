import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from 'shared';
import {
  createTestApp,
  TEST_PASSWORD,
  type TestApp,
} from './support/test-app.js';

describe('profile settings (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('новый пользователь получает настройки по умолчанию, и в /me тоже', async () => {
    const agent = await t.loginAs('set_default');
    const res = await agent.get('/api/profile/settings').expect(200);
    expect(res.body).toEqual(DEFAULT_USER_SETTINGS);
    const me = await agent.get('/api/auth/me').expect(200);
    expect((me.body as { user: { settings: unknown } }).user.settings).toEqual(
      DEFAULT_USER_SETTINGS,
    );
  });

  it('изменение сохраняется, видно в /me и при новом входе', async () => {
    const agent = await t.loginAs('set_change');
    const res = await agent
      .patch('/api/profile/settings')
      .send({ facingMarker: 'compass' })
      .expect(200);
    const compass = { ...DEFAULT_USER_SETTINGS, facingMarker: 'compass' };
    expect(res.body).toEqual(compass);
    await agent.get('/api/profile/settings').expect(200, compass);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(
      (me.body as { user: { settings: { facingMarker: string } } }).user
        .settings.facingMarker,
    ).toBe('compass');
    const login = await t
      .anonymous()
      .post('/api/auth/login')
      .send({ login: 'set_change', password: TEST_PASSWORD })
      .expect(200);
    expect(
      (login.body as { user: { settings: unknown } }).user.settings,
    ).toEqual(compass);
  });

  it('пустое тело ничего не меняет, лишние поля отбрасываются', async () => {
    const agent = await t.loginAs('set_partial');
    await agent
      .patch('/api/profile/settings')
      .send({ facingMarker: 'chevrons' })
      .expect(200);
    await agent
      .patch('/api/profile/settings')
      .send({ unknown: 1 })
      .expect(200, { ...DEFAULT_USER_SETTINGS, facingMarker: 'chevrons' });
  });

  it('качество графики меняется отдельно от взгляда; «высокое» пока недоступно', async () => {
    const agent = await t.loginAs('set_quality');
    await agent
      .patch('/api/profile/settings')
      .send({ facingMarker: 'compass' })
      .expect(200);
    await agent
      .patch('/api/profile/settings')
      .send({ graphicsQuality: 'low' })
      .expect(200, { facingMarker: 'compass', graphicsQuality: 'low' });
    for (const graphicsQuality of ['high', 'ultra']) {
      await agent
        .patch('/api/profile/settings')
        .send({ graphicsQuality })
        .expect(400);
    }
    await agent
      .get('/api/profile/settings')
      .expect(200, { facingMarker: 'compass', graphicsQuality: 'low' });
  });

  it('настройки у каждого свои', async () => {
    const alice = await t.loginAs('set_alice');
    const bob = await t.loginAs('set_bob');
    await alice
      .patch('/api/profile/settings')
      .send({ facingMarker: 'compass' })
      .expect(200);
    await bob.get('/api/profile/settings').expect(200, DEFAULT_USER_SETTINGS);
  });

  it('неизвестный вид — 400, без входа — 401', async () => {
    const agent = await t.loginAs('set_invalid');
    await agent
      .patch('/api/profile/settings')
      .send({ facingMarker: 'arrow' })
      .expect(400);
    await t.anonymous().get('/api/profile/settings').expect(401);
    await t
      .anonymous()
      .patch('/api/profile/settings')
      .send({ facingMarker: 'compass' })
      .expect(401);
  });
});
