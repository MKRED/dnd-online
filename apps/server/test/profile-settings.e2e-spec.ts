import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS, GRAPHICS_PRESET_VALUES } from 'shared';
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

  it('набор графики задаёт значения; «своё» хранит свои; «высокое» недоступно', async () => {
    const agent = await t.loginAs('set_quality');
    await agent
      .patch('/api/profile/settings')
      .send({ facingMarker: 'compass' })
      .expect(200);
    const low = {
      ...DEFAULT_USER_SETTINGS,
      facingMarker: 'compass',
      graphicsPreset: 'low',
      ...GRAPHICS_PRESET_VALUES.low,
    };
    await agent
      .patch('/api/profile/settings')
      .send({ graphicsPreset: 'low' })
      .expect(200, low);

    // Своё: значения по одному, вместе с набором.
    const custom = {
      ...low,
      graphicsPreset: 'custom',
      animationFps: 30,
      creatureModels: 'party',
      renderScale: 0.5,
      antialias: true,
      frameLimit: 60,
    };
    await agent
      .patch('/api/profile/settings')
      .send({
        graphicsPreset: 'custom',
        animationFps: 30,
        creatureModels: 'party',
        renderScale: 0.5,
        antialias: true,
        frameLimit: 60,
      })
      .expect(200, custom);
    // Вернулись к набору — значения снова его, а свои лежат до следующего «своего».
    await agent
      .patch('/api/profile/settings')
      .send({ graphicsPreset: 'medium' })
      .expect(200, {
        ...custom,
        graphicsPreset: 'medium',
        ...GRAPHICS_PRESET_VALUES.medium,
      });

    for (const body of [
      { graphicsPreset: 'high' },
      { graphicsPreset: 'ultra' },
      { animationFps: 61 },
      { animationFps: 2.5 },
      { creatureModels: 'some' },
      { renderScale: 0.3 },
      { antialias: 'yes' },
      { frameLimit: 45 },
    ]) {
      await agent.patch('/api/profile/settings').send(body).expect(400);
    }
    const bad = await agent
      .patch('/api/profile/settings')
      .send({ graphicsPreset: 'high' })
      .expect(400);
    expect((bad.body as { message: string[] }).message).toContain(
      'Такой набор графики недоступен',
    );
  });

  it('вид метки здоровья сохраняется; неизвестный — 400', async () => {
    const agent = await t.loginAs('set_mark');
    await agent
      .patch('/api/profile/settings')
      .send({ healthMarkStyle: 'ribbon' })
      .expect(200, { ...DEFAULT_USER_SETTINGS, healthMarkStyle: 'ribbon' });
    const bad = await agent
      .patch('/api/profile/settings')
      .send({ healthMarkStyle: 'neon' })
      .expect(400);
    expect((bad.body as { message: string[] }).message).toContain(
      'Неизвестный вид метки здоровья',
    );
    await agent
      .get('/api/profile/settings')
      .expect(200, { ...DEFAULT_USER_SETTINGS, healthMarkStyle: 'ribbon' });
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
