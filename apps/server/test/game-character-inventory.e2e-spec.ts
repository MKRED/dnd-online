import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  GAME_INVENTORY_MASTER_ONLY,
  GAME_INVENTORY_NOT_PUBLIC,
  type Character,
  type GameEventPage,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createItem, packBody } from './support/item-fixture.js';
import { createSceneGame, startSession } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Инвентарь героя мастером в игре (docs/plan/gm-items.md, этап 1): положить опубликованный
// предмет, переложить, поменять количество, убрать — и во время встречи, когда лист заперт.
describe('game character inventory (e2e)', () => {
  let t: TestApp;
  let png: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    png = await pngImage();
  });

  afterAll(async () => {
    await t.close();
  });

  async function user(login: string) {
    const agent = await t.loginAs(login);
    const me = await agent.get('/api/auth/me').expect(200);
    return { agent, id: (me.body as { user: { id: string } }).user.id };
  }

  // Сцена активна, встреча идёт: лист игрока заперт. У мастера опубликованное зелье и
  // скрытое сердце.
  async function setup(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    await startSession(m, g.gameId);
    const potion = await createItem(m, { name: 'Зелье', isPublic: true });
    const secret = await createItem(m, { name: 'Сердце купола' });
    const url = `/api/games/${g.gameId}/characters/${g.character}/items`;
    return { ...g, potion, secret, url };
  }

  const rows = (res: request.Response) =>
    (res.body as Character).inventory.map((e) => [
      e.item?.name,
      e.location,
      e.quantity,
    ]);
  const idOf = (res: request.Response, name: string) =>
    (res.body as Character).inventory.find((e) => e.item?.name === name)!.id;
  const message = (res: request.Response) =>
    (res.body as { message: string }).message;

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  it('мастер кладёт, перекладывает, меняет и убирает при запертом листе; журнал и лист владельца', async () => {
    const g = await setup('gi_happy');
    const m = g.master.agent;
    // Сам игрок во встрече свой лист не правит — ради этого маршрут и под игрой.
    await g.player.agent
      .post(`/api/characters/${g.character}/items`)
      .send({ itemId: g.potion.id, quantity: 1, location: 'carried' })
      .expect(409);

    const added = await m
      .post(g.url)
      .send({ itemId: g.potion.id, quantity: 3, location: 'carried' })
      .expect(201);
    expect(rows(added)).toEqual([['Зелье', 'carried', 3]]);
    expect(await lastEvent(m, g.gameId)).toMatchObject({
      kind: 'character.inventory',
      visibility: 'players',
      as: { kind: 'master' },
      intent: {
        characterId: g.character,
        change: { kind: 'add', quantity: 3, location: 'carried' },
      },
      result: { character: { name: 'Зритель' }, item: { name: 'Зелье' } },
    });
    // Повтор в то же место прибавляется к строке.
    await m
      .post(g.url)
      .send({ itemId: g.potion.id, quantity: 1, location: 'carried' })
      .expect(201);

    const entry = idOf(added, 'Зелье');
    const moved = await m
      .post(`${g.url}/${entry}/move`)
      .send({ location: 'stash', quantity: 1 })
      .expect(201);
    expect(rows(moved)).toEqual([
      ['Зелье', 'carried', 3],
      ['Зелье', 'stash', 1],
    ]);
    const changed = await m
      .patch(`${g.url}/${entry}`)
      .send({ quantity: 2 })
      .expect(200);
    expect(rows(changed)).toEqual([
      ['Зелье', 'carried', 2],
      ['Зелье', 'stash', 1],
    ]);
    const stashed = idOf(
      {
        body: { inventory: (moved.body as Character).inventory.slice(1) },
      } as request.Response,
      'Зелье',
    );
    const removed = await m.delete(`${g.url}/${stashed}`).expect(200);
    expect(rows(removed)).toEqual([['Зелье', 'carried', 2]]);
    expect(await lastEvent(m, g.gameId)).toMatchObject({
      intent: { change: { kind: 'remove', entryId: stashed } },
      result: { item: { name: 'Зелье' } },
    });

    // Лист владельца — тот же: правка остаётся после встречи.
    const sheet = await g.player.agent
      .get(`/api/characters/${g.character}`)
      .expect(200);
    expect(rows(sheet)).toEqual([['Зелье', 'carried', 2]]);
  });

  it('надетое, ушедшее в хранилище, кукла отпускает; набор распаковывается', async () => {
    const g = await setup('gi_gear');
    const m = g.master.agent;
    const armor = await createItem(m, {
      name: 'Латы',
      category: 'armor',
      isPublic: true,
      details: {
        base: null,
        kind: 'heavy',
        armorClass: 18,
        strength: null,
        stealthDisadvantage: true,
        magicBonus: 0,
        attunement: false,
      },
    });
    const added = await m
      .post(g.url)
      .send({ itemId: armor.id, quantity: 1, location: 'carried' })
      .expect(201);
    const entry = idOf(added, 'Латы');
    await m
      .put(`/api/games/${g.gameId}/characters/${g.character}/equipment/body`)
      .send({ entryId: entry })
      .expect(200);
    const moved = await m
      .post(`${g.url}/${entry}/move`)
      .send({ location: 'stash', quantity: 1 })
      .expect(201);
    expect((moved.body as Character).inventory[0].equipped).toEqual([]);

    const pack = await createItem(
      m,
      packBody([{ itemId: g.potion.id, quantity: 2 }], { isPublic: true }),
    );
    const unpacked = await m
      .post(g.url)
      .send({ itemId: pack.id, quantity: 2, location: 'carried', unpack: true })
      .expect(201);
    expect(rows(unpacked)).toContainEqual(['Зелье', 'carried', 4]);
  });

  it('доступ: аноним 401, чужой 403, игрок и владелец 403, вне встречи мастеру можно', async () => {
    const g = await setup('gi_access');
    const body = { itemId: g.potion.id, quantity: 1, location: 'carried' };
    await t.anonymous().post(g.url).send(body).expect(401);
    const stranger = await user('gi_access_stranger');
    await stranger.agent.post(g.url).send(body).expect(403);
    const owner = await g.player.agent.post(g.url).send(body).expect(403);
    expect(message(owner)).toBe(GAME_INVENTORY_MASTER_ONLY);
    await g.master.agent.delete(`/api/games/${g.gameId}/session`).expect(200);
    await g.master.agent.post(g.url).send(body).expect(201);
  });

  it('неверное: скрытый и чужой скрытый предмет, лишнее количество, чужая строка — 400 и 404', async () => {
    const g = await setup('gi_invalid');
    const m = g.master.agent;
    const hidden = await m
      .post(g.url)
      .send({ itemId: g.secret.id, quantity: 1, location: 'carried' })
      .expect(400);
    expect(message(hidden)).toBe(GAME_INVENTORY_NOT_PUBLIC);
    const othersSecret = await createItem(g.player.agent, { name: 'Тайна' });
    await m
      .post(g.url)
      .send({ itemId: othersSecret.id, quantity: 1, location: 'carried' })
      .expect(400);
    await m
      .post(g.url)
      .send({ itemId: g.potion.id, quantity: 0, location: 'pocket' })
      .expect(400);

    const added = await m
      .post(g.url)
      .send({ itemId: g.potion.id, quantity: 1, location: 'carried' })
      .expect(201);
    const entry = idOf(added, 'Зелье');
    await m
      .post(`${g.url}/${entry}/move`)
      .send({ location: 'stash', quantity: 5 })
      .expect(400);
    await m
      .post(`${g.url}/${entry}/move`)
      .send({ location: 'carried', quantity: 1 })
      .expect(400);
    await m.patch(`${g.url}/${entry}`).send({ quantity: 1.5 }).expect(400);
    const missing = '00000000-0000-4000-8000-000000000000';
    await m.delete(`${g.url}/${missing}`).expect(404);
    await m.patch(`${g.url}/${missing}`).send({ quantity: 2 }).expect(404);
  });
});
