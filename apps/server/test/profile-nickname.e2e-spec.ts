import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { issueApiToken } from './support/api-token.js';
import {
  createTestApp,
  TEST_PASSWORD,
  type TestApp,
} from './support/test-app.js';

const nicknameOf = (body: unknown) => (body as { nickname: string }).nickname;
const meNickname = (body: unknown) =>
  (body as { user: { nickname: string } }).user.nickname;

// Смена ника в профиле: правила — shared/nickname.ts.
describe('смена ника (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('ник сохраняется приведённым, виден в /me и после нового входа', async () => {
    const agent = await t.loginAs('nick_owner');
    const res = await agent
      .put('/api/profile/nickname')
      .send({ nickname: '  mk \t  red ' })
      .expect(200);
    expect(res.body).toMatchObject({ login: 'nick_owner', nickname: 'mk red' });

    expect(nicknameOf((await agent.get('/api/profile').expect(200)).body)).toBe(
      'mk red',
    );
    expect(meNickname((await agent.get('/api/auth/me').expect(200)).body)).toBe(
      'mk red',
    );
    const login = await t
      .anonymous()
      .post('/api/auth/login')
      .send({ login: 'nick_owner', password: TEST_PASSWORD })
      .expect(200);
    expect(meNickname(login.body)).toBe('mk red');
  });

  it('ник не уникален: двое могут взять один и тот же', async () => {
    const first = await t.loginAs('nick_twin_a');
    const second = await t.loginAs('nick_twin_b');
    await first
      .put('/api/profile/nickname')
      .send({ nickname: 'Игрок' })
      .expect(200);
    await second
      .put('/api/profile/nickname')
      .send({ nickname: 'Игрок' })
      .expect(200);
  });

  it('короткий, длинный, не строка и с управляющими символами — 400, ник прежний', async () => {
    const agent = await t.loginAs('nick_bad');
    for (const nickname of ['  a  ', 'x'.repeat(33), 42, 'mk\u0000red']) {
      const res = await agent
        .put('/api/profile/nickname')
        .send({ nickname })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/Ник|нике/);
    }
    await agent.put('/api/profile/nickname').send({}).expect(400);
    expect(nicknameOf((await agent.get('/api/profile').expect(200)).body)).toBe(
      'nick_bad',
    );
  });

  it('без входа — 401, по API-токену — 401: ник меняет сам человек', async () => {
    await t
      .anonymous()
      .put('/api/profile/nickname')
      .send({ nickname: 'Чужой' })
      .expect(401);
    const agent = await t.loginAs('nick_token');
    const api = await issueApiToken(t.app, agent);
    await api
      .put('/api/profile/nickname')
      .send({ nickname: 'Из MCP' })
      .expect(401);
  });

  it('регистрация приводит ник так же и не пускает длиннее 32 знаков', async () => {
    const res = await t
      .anonymous()
      .post('/api/auth/register')
      .send({
        login: 'nick_reg',
        nickname: ' Арвен   Звезда ',
        password: 'secret123',
      })
      .expect(201);
    expect(meNickname(res.body)).toBe('Арвен Звезда');
    await t
      .anonymous()
      .post('/api/auth/register')
      .send({
        login: 'nick_reg_long',
        nickname: 'x'.repeat(33),
        password: 'secret123',
      })
      .expect(400);
  });
});
