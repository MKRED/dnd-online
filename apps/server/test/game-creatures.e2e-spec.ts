import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type {
  CharacterEffectEntry,
  GameCreatures,
  GameEventPage,
  GameScenes,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import {
  listenForSockets,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Монстры и НПС на сцене — экземпляры со своими хитами и эффектами (docs/plan/done/game.md,
// этап 8). Правит мастер; игрок видит только метки здоровья видимых ему существ.
describe('game creatures (e2e)', () => {
  let t: TestApp;
  let clients: SocketClients;
  let png: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    clients = await listenForSockets(t);
    png = await pngImage();
  });

  afterEach(() => clients.disconnectAll());

  afterAll(async () => {
    await t.close();
  });

  const user = (login: string) => clients.user(login);
  const idOf = (res: request.Response) => (res.body as { id: string }).id;

  // Сцена из карты фикстуры: объект 2 — гоблин (4 хита), 3 — НПС «Трактирщик» (12),
  // 4 — бочка. Сцена активная и закрыта.
  async function started(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const res = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (res.body as GameScenes).scenes[0].id;
    const url = `/api/games/${g.gameId}/scene/creatures`;
    const open = () =>
      m
        .put(`/api/games/${g.gameId}/scenes/open`)
        .send({ open: true })
        .expect(200);
    const change = (
      agent: request.Agent,
      objectId: number,
      body: Record<string, unknown>,
      status = 200,
    ) => agent.post(`${url}/${objectId}/changes`).send(body).expect(status);
    return { ...g, m, sceneId, url, open, change };
  }

  async function list(agent: request.Agent, url: string) {
    const res = await agent.get(url).expect(200);
    return (res.body as GameCreatures).creatures;
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  it('мастер видит хиты экземпляров, игрок — только метки «Ранен» и «Повержен»', async () => {
    const g = await started('gcr_hp');
    expect(await list(g.m, g.url)).toEqual([
      {
        objectId: 2,
        health: null,
        state: {
          name: 'Гоблин',
          hitPoints: { current: 4, max: 4, temp: 0 },
          effects: [],
          movement: { speed: 30, climb: null, moved: 0, dashes: 0 },
        },
      },
      {
        objectId: 3,
        health: null,
        state: {
          name: 'Трактирщик',
          hitPoints: { current: 12, max: 12, temp: 0 },
          effects: [],
          movement: { speed: 30, climb: null, moved: 0, dashes: 0 },
        },
      },
    ]);
    await g.player.agent.get(g.url).expect(403);
    const stranger = await user('gcr_hp_stranger');
    await stranger.agent.get(g.url).expect(403);
    await t.anonymous().get(g.url).expect(401);
    await g.open();
    expect(await list(g.player.agent, g.url)).toEqual([]);

    const hit = await g.change(g.m, 2, { kind: 'damage', amount: 2 });
    expect((hit.body as GameCreatures).creatures[0]).toMatchObject({
      health: 'bloodied',
      state: { hitPoints: { current: 2 } },
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.changed',
      as: { kind: 'master' },
      sceneId: g.sceneId,
      intent: { objectId: 2, change: { kind: 'damage', amount: 2 } },
      result: {
        creature: { objectId: 2, name: 'Гоблин' },
        before: { current: 4, max: 4, temp: 0 },
        after: { current: 2, max: 4, temp: 0 },
      },
    });
    expect(await list(g.player.agent, g.url)).toEqual([
      { objectId: 2, health: 'bloodied', state: null },
    ]);

    // Временные хиты принимают урон первыми; на нуле — «Повержен», без спасбросков.
    await g.change(g.m, 3, { kind: 'temp', amount: 5 });
    await g.change(g.m, 3, { kind: 'damage', amount: 20 });
    await g.change(g.m, 3, { kind: 'damage', amount: 3 });
    const down = await list(g.m, g.url);
    expect(down[1]).toMatchObject({
      health: 'down',
      state: { hitPoints: { current: 0, temp: 0 } },
    });
    await g.change(g.m, 3, { kind: 'heal', amount: 100 });
    expect((await list(g.m, g.url))[1].state?.hitPoints.current).toBe(12);

    // Скрытый от игроков монстр пропадает и из его списка.
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/ops`)
      .send({ ops: [{ op: 'updateObject', id: 2, object: { hidden: true } }] })
      .expect(200);
    expect(await list(g.player.agent, g.url)).toEqual([]);
  });

  it('правит только мастер; неверные правки и не существа — отказ', async () => {
    const g = await started('gcr_rights');
    await g.open();
    await g.change(g.player.agent, 2, { kind: 'damage', amount: 1 }, 403);
    await t
      .anonymous()
      .post(`${g.url}/2/changes`)
      .send({ kind: 'damage', amount: 1 })
      .expect(401);
    await g.change(g.m, 2, { kind: 'death_saves', amount: 1 }, 400);
    await g.change(g.m, 2, { kind: 'damage', amount: -1 }, 400);
    await g.change(g.m, 2, { kind: 'damage' }, 400);
    // Бочка — не существо, объекта 99 нет.
    await g.change(g.m, 4, { kind: 'damage', amount: 1 }, 404);
    await g.change(g.m, 99, { kind: 'damage', amount: 1 }, 404);
  });

  it('эффекты экземпляра — из библиотеки; «Запрет лечения» не даёт лечить', async () => {
    const g = await started('gcr_effects');
    const effect = (over: Record<string, unknown>) =>
      g.m
        .post('/api/effects')
        .send({
          name: 'Ослабление',
          components: [{ kind: 'no_healing' }],
          description: '',
          isPublic: false,
          duration: { kind: 'permanent' },
          saveEnds: null,
          ...over,
        })
        .expect(201)
        .then(idOf);
    const chill = await effect({ name: 'Леденящее прикосновение' });
    const url = `${g.url}/3/effects`;

    const added = await g.m.post(url).send({ effectId: chill }).expect(201);
    const [entry] = added.body as CharacterEffectEntry[];
    expect(entry).toMatchObject({
      effect: { id: chill, name: 'Леденящее прикосновение' },
      inactive: false,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.effect_added',
      result: {
        creature: { objectId: 3, name: 'Трактирщик' },
        effect: { id: chill },
        libraryCopied: 1,
      },
    });
    await g.m.post(url).send({ effectId: chill }).expect(409);
    await g.open();
    await g.player.agent.post(url).send({ effectId: chill }).expect(403);
    // Игроку эффектов не видно.
    expect(await list(g.player.agent, g.url)).toEqual([]);

    await g.change(g.m, 3, { kind: 'damage', amount: 5 });
    const refused = await g.change(g.m, 3, { kind: 'heal', amount: 5 }, 400);
    expect((refused.body as { message: string }).message).toBe(
      'Лечение запрещено: Леденящее прикосновение',
    );

    await g.m.delete(`${url}/${entry.id}`).expect(200);
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.effect_removed',
      result: { effect: { id: chill, name: 'Леденящее прикосновение' } },
    });
    await g.m.delete(`${url}/${entry.id}`).expect(404);
    await g.change(g.m, 3, { kind: 'heal', amount: 5 });
  });
});
