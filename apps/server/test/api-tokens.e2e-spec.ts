import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './support/test-app.js';

interface CreatedToken {
  token: string;
  info: { id: string; name: string };
}

// Токен API — доступ внешних клиентов (MCP-сервер карты) к картам владельца, и только к ним.
describe('токены API (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('owner');
    stranger = await t.loginAs('stranger');
    server = t.app.getHttpServer();
  });

  afterAll(async () => {
    await t.close();
  });

  async function issue(agent: request.Agent): Promise<CreatedToken> {
    const res = await agent
      .post('/api/api-tokens')
      .send({ name: 'MCP' })
      .expect(201);
    return res.body as CreatedToken;
  }

  // Запрос только с токеном, без кук.
  const withToken = (token: string) => ({
    get: (path: string) =>
      request(server).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string) =>
      request(server).post(path).set('Authorization', `Bearer ${token}`),
  });

  it('токен показывается один раз и даёт доступ к картам владельца', async () => {
    const { token, info } = await issue(owner);
    expect(token).toMatch(/^dnd_/);
    const list = await owner.get('/api/api-tokens').expect(200);
    expect(list.body).toEqual([expect.objectContaining({ id: info.id })]);
    expect(JSON.stringify(list.body)).not.toContain(token);

    const api = withToken(token);
    const created = await api
      .post('/api/maps')
      .send({ name: 'От нейросети' })
      .expect(201);
    const mapId = (created.body as { id: string }).id;
    await owner.get(`/api/maps/${mapId}`).expect(200);
    await api.get('/api/maps').expect(200);
  });

  it('токен не открывает чужие карты и маршруты вне карт', async () => {
    const { token } = await issue(owner);
    const theirs = await stranger
      .post('/api/maps')
      .send({ name: 'Чужая' })
      .expect(201);
    const api = withToken(token);
    await api
      .get(`/api/maps/${(theirs.body as { id: string }).id}`)
      .expect(404);
    // Утёкший токен не должен выпускать новые токены и читать другие данные.
    await api.get('/api/api-tokens').expect(401);
    await api.post('/api/api-tokens').send({ name: 'ещё' }).expect(401);
    await api.get('/api/characters').expect(401);
    await api.get('/api/auth/me').expect(401);
  });

  it('отозванный, выдуманный и кривой токен — 401', async () => {
    const { token, info } = await issue(owner);
    await stranger.delete(`/api/api-tokens/${info.id}`).expect(404);
    await withToken(token).get('/api/maps').expect(200);

    await owner.delete(`/api/api-tokens/${info.id}`).expect(204);
    await withToken(token).get('/api/maps').expect(401);
    await withToken(`dnd_${'a'.repeat(40)}`)
      .get('/api/maps')
      .expect(401);
    await request(server)
      .get('/api/maps')
      .set('Authorization', 'Basic abc')
      .expect(401);
  });

  it('пустое название — 400', async () => {
    await owner.post('/api/api-tokens').send({ name: '   ' }).expect(400);
  });
});
