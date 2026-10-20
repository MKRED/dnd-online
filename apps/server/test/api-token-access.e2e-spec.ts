import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { issueApiToken, type TokenClient } from './support/api-token.js';
import {
  characterBody,
  pngImage,
  PNG_FILE,
} from './support/character-fixture.js';
import { createItem } from './support/item-fixture.js';
import { createMonster } from './support/monster-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Что API-токен может вне каталогов: персонажи с картинками и связями, связи монстров,
// карты. Каталоги проверяет describeCatalog. План — docs/plan/ai-access.md, этап 1.
const abilityBody = {
  name: 'Второе дыхание',
  category: 'basic',
  details: {},
  description: '',
  isPublic: false,
  activation: { kind: 'bonus_action' },
  costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
};
const effectBody = {
  name: 'Каменная кожа',
  components: [{ kind: 'armor_class', change: 'bonus', value: 2 }],
  description: '',
  isPublic: false,
  duration: { kind: 'permanent' },
  saveEnds: null,
};

const idOf = (res: request.Response) => (res.body as { id: string }).id;
const lastId = (res: request.Response) =>
  (res.body as { id: string }[]).at(-1)!.id;

describe('доступ по API-токену (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let api: TokenClient;
  let strangerApi: TokenClient;

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('owner');
    api = await issueApiToken(t.app, owner);
    strangerApi = await issueApiToken(t.app, await t.loginAs('stranger'));
  });

  afterAll(async () => {
    await t.close();
  });

  const createCharacter = async () =>
    idOf(await api.post('/api/characters').send(characterBody()).expect(201));

  it('персонаж: создать, прочитать, заменить и поправить', async () => {
    const id = await createCharacter();
    const list = await api.get('/api/characters').expect(200);
    expect((list.body as { id: string }[]).map((c) => c.id)).toContain(id);
    await api
      .put(`/api/characters/${id}`)
      .send(characterBody({ name: 'Нейросеть' }))
      .expect(200);
    await api
      .patch(`/api/characters/${id}`)
      .send({ hitPointsCurrent: 1 })
      .expect(200);
    const card = await owner.get(`/api/characters/${id}`).expect(200);
    expect(card.body).toMatchObject({
      name: 'Нейросеть',
      linkAccess: 'private',
    });
  });

  it('персонажа нельзя удалить и открыть по ссылке; по сессии можно', async () => {
    const id = await createCharacter();
    const res = await api.delete(`/api/characters/${id}`).expect(403);
    expect((res.body as { message: string }).message).toMatch(/API-токен/);
    await api
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(403);
    await owner
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);
    await owner.delete(`/api/characters/${id}`).expect(204);
  });

  it('картинки персонажа: загрузить и выбрать главную, но не удалить', async () => {
    const id = await createCharacter();
    const images = `/api/characters/${id}/images`;
    const png = await pngImage();
    await api.post(images).attach('file', png, PNG_FILE).expect(201);
    const second = idOf(
      await api.post(images).attach('file', png, PNG_FILE).expect(201),
    );
    await api.patch(`${images}/${second}`).send({ isMain: true }).expect(200);
    await api.get(images).expect(200);
    await api.get(`${images}/${second}/file`).expect(200);
    await api.delete(`${images}/${second}`).expect(403);
    await owner.delete(`${images}/${second}`).expect(204);
  });

  it('связи персонажа: предметы, способности и эффекты добавляются и убираются', async () => {
    const id = await createCharacter();
    const item = await createItem(owner);
    const abilityId = idOf(
      await owner.post('/api/abilities').send(abilityBody).expect(201),
    );
    const effectId = idOf(
      await owner.post('/api/effects').send(effectBody).expect(201),
    );
    const links = [
      ['items', { itemId: item.id, quantity: 1, location: 'carried' }],
      ['abilities', { abilityId }],
      ['effects', { effectId }],
    ] as const;
    for (const [path, body] of links) {
      const url = `/api/characters/${id}/${path}`;
      const entry = lastId(await api.post(url).send(body).expect(201));
      await api.delete(`${url}/${entry}`).expect(200);
    }
  });

  it('связи монстра: снаряжение, способности и эффекты', async () => {
    const monsterId = await createMonster(owner);
    const item = await createItem(owner);
    const abilityId = idOf(
      await owner.post('/api/abilities').send(abilityBody).expect(201),
    );
    const effectId = idOf(
      await owner.post('/api/effects').send(effectBody).expect(201),
    );
    const links = [
      ['items', { itemId: item.id, quantity: 1 }],
      ['abilities', { abilityId }],
      ['effects', { effectId }],
    ] as const;
    for (const [path, body] of links) {
      const url = `/api/monsters/${monsterId}/${path}`;
      const entry = lastId(await api.post(url).send(body).expect(201));
      await api.delete(`${url}/${entry}`).expect(200);
    }
  });

  it('чужой токен не видит закрытого персонажа и его связи', async () => {
    const id = await createCharacter();
    await strangerApi.get(`/api/characters/${id}`).expect(404);
    await strangerApi
      .patch(`/api/characters/${id}`)
      .send({ hitPointsCurrent: 1 })
      .expect(404);
    await strangerApi.get(`/api/characters/${id}/images`).expect(404);
    const item = await createItem(owner);
    await strangerApi
      .post(`/api/characters/${id}/items`)
      .send({ itemId: item.id, quantity: 1, location: 'carried' })
      .expect(404);
  });

  it('карту нельзя удалить токеном, остальное по картам работает', async () => {
    const mapId = idOf(
      await api.post('/api/maps').send({ name: 'Подземелье' }).expect(201),
    );
    await api.get(`/api/maps/${mapId}/summary`).expect(200);
    await api
      .patch(`/api/maps/${mapId}`)
      .send({ name: 'Подземелье крыс' })
      .expect(200);
    await api.delete(`/api/maps/${mapId}`).expect(403);
    await owner.delete(`/api/maps/${mapId}`).expect(204);
  });

  it('аккаунт, токены и закладки токену закрыты', async () => {
    await api.get('/api/auth/me').expect(401);
    await api.get('/api/api-tokens').expect(401);
    await api.post('/api/api-tokens').send({ name: 'ещё' }).expect(401);
    await api.get('/api/bookmarks').expect(401);
  });
});
