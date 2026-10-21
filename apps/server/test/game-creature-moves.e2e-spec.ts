import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_MONSTER_STAT_BLOCK,
  GAME_SOCKET,
  type GameCreatures,
  type GameEventPage,
  type GameScenes,
  type GameSceneEditMessage,
  type GameSceneView,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { monsterBody } from './support/monster-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import {
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Ход монстров и НПС мастером (docs/plan/done/creature-movement.md): путь в пределах запаса из
// Скорости, правка сцены с записью creature.moved, отмена, «Новый раунд», «Рывок».
describe('game creature moves (e2e)', () => {
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

  // Сцена из карты фикстуры: поле 8×8, старт [0,1,0] с фигуркой игрока, объект 2 — гоблин
  // на [1,1,0] (Скорость 30), 3 — НПС «Трактирщик» на [2,1,0]. Сцена активная и открыта.
  // prepare — правки карты и каталога до того, как сцена скопирует их.
  async function started(
    prefix: string,
    prepare?: (g: Awaited<ReturnType<typeof createSceneGame>>) => Promise<void>,
  ) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    await prepare?.(g);
    const res = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (res.body as GameScenes).scenes[0].id;
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const url = `/api/games/${g.gameId}/scene/creatures`;
    const move = (
      agent: request.Agent,
      objectId: number,
      to: number[],
      status = 200,
    ) => agent.post(`${url}/${objectId}/move`).send({ to }).expect(status);
    return { ...g, m, sceneId, url, move };
  }

  const movementOf = (res: request.Response, objectId: number) =>
    (res.body as GameCreatures).creatures.find((c) => c.objectId === objectId)
      ?.state?.movement;

  async function positionOf(agent: request.Agent, gameId: string, id: number) {
    const res = await agent.get(`/api/games/${gameId}/scene`).expect(200);
    const object = (res.body as GameSceneView).objects.find((o) => o.id === id);
    return (
      object && {
        at: object.at,
        facing: 'facing' in object ? object.facing : null,
      }
    );
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  it('ход по пути тратит запас, игрок получает его правкой сцены, отмена возвращает', async () => {
    const g = await started('gcm_move');
    const playerSocket = await clients.connect(g.player.cookie);
    await join(playerSocket, g.gameId);
    const toPlayer = next<GameSceneEditMessage>(
      playerSocket,
      GAME_SOCKET.sceneEdit,
    );

    const list = await g.m.get(g.url).expect(200);
    expect(movementOf(list, 2)).toEqual({
      speed: 30,
      climb: null,
      moved: 0,
      dashes: 0,
    });
    // НПС — Скорость из листа копии.
    expect(movementOf(list, 3)).toEqual({
      speed: 30,
      climb: null,
      moved: 0,
      dashes: 0,
    });

    const moved = await g.move(g.m, 2, [1, 1, 4]);
    expect(movementOf(moved, 2)).toEqual({
      speed: 30,
      climb: null,
      moved: 20,
      dashes: 0,
    });
    // Взгляд — по последнему шагу, на юг.
    expect(await positionOf(g.m, g.gameId, 2)).toEqual({
      at: [1, 1, 4],
      facing: 180,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.moved',
      as: { kind: 'master' },
      sceneId: g.sceneId,
      intent: { objectId: 2, to: [1, 1, 4] },
      result: {
        creature: { objectId: 2, name: 'Гоблин' },
        from: [1, 1, 0],
        to: [1, 1, 4],
        cost: 20,
        left: 10,
        sceneSeq: 1,
      },
    });
    expect((await toPlayer).changes.objects).toEqual([
      {
        id: 2,
        before: expect.objectContaining({ at: [1, 1, 0] }) as unknown,
        after: expect.objectContaining({ at: [1, 1, 4] }) as unknown,
      },
    ]);

    // Отмена мастера снимает ход, как правку сцены; потраченные футы остаются.
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/undo`)
      .expect(200);
    expect((await positionOf(g.m, g.gameId, 2))?.at).toEqual([1, 1, 0]);
    expect(movementOf(await g.m.get(g.url).expect(200), 2)?.moved).toBe(20);
  });

  // Уступ в блок (docs/dnd/movement.md): вверх — лазание, 5 лишних футов; вниз — прыжок
  // за обычный шаг; скорость лазания лишние футы снимает.
  it('на уступ в блок — лазанием, вниз — прыжком; скорость лазания снимает лишние футы', async () => {
    const ledge =
      (climb: number | null) =>
      async (g: {
        mapId: string;
        goblin: string;
        master: { agent: request.Agent };
      }) => {
        await g.master.agent
          .post(`/api/maps/${g.mapId}/ops`)
          .send({ ops: [{ op: 'setBlock', at: [1, 1, 1], block: 'stone' }] })
          .expect(200);
        if (climb === null) return;
        await g.master.agent
          .put(`/api/monsters/${g.goblin}`)
          .send({
            ...monsterBody(),
            name: 'Гоблин',
            role: 'regular',
            statBlock: {
              ...DEFAULT_MONSTER_STAT_BLOCK,
              speed: { ...DEFAULT_MONSTER_STAT_BLOCK.speed, climb },
            },
          })
          .expect(200);
      };

    const plain = await started('gcm_ledge', ledge(null));
    const up = await plain.move(plain.m, 2, [1, 2, 1]);
    expect(movementOf(up, 2)).toMatchObject({ climb: null, moved: 10 });
    const down = await plain.move(plain.m, 2, [1, 1, 2]);
    expect(movementOf(down, 2)?.moved).toBe(15);

    const climber = await started('gcm_climber', ledge(30));
    const list = await climber.m.get(climber.url).expect(200);
    expect(movementOf(list, 2)).toMatchObject({ speed: 30, climb: 30 });
    const climbed = await climber.move(climber.m, 2, [1, 2, 1]);
    expect(movementOf(climbed, 2)?.moved).toBe(5);
  });

  it('запас: дальше не дойти, «Рывок» добавляет Скорость, «Новый раунд» и «Обновить» — полный', async () => {
    const g = await started('gcm_allowance');
    await g.move(g.m, 2, [1, 1, 4]);
    // Осталось 10 фт, а до [1,1,7] — 15.
    await g.move(g.m, 2, [1, 1, 7], 409);
    const dashed = await g.m.post(`${g.url}/2/dash`).expect(200);
    expect(movementOf(dashed, 2)).toEqual({
      speed: 30,
      climb: null,
      moved: 20,
      dashes: 1,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.dashed',
      result: { creature: { objectId: 2, name: 'Гоблин' }, dashes: 1 },
    });
    await g.move(g.m, 2, [1, 1, 7]);

    // У НПС строки состояния ещё нет — «Рывок» заводит её с полными хитами.
    const npc = await g.m.post(`${g.url}/3/dash`).expect(200);
    expect(
      (npc.body as GameCreatures).creatures.find((c) => c.objectId === 3)
        ?.state,
    ).toMatchObject({
      hitPoints: { current: 12, max: 12 },
      movement: { dashes: 1 },
    });

    const round = await g.m
      .post(`/api/games/${g.gameId}/figures/round`)
      .expect(200);
    expect(round.status).toBe(200);
    const after = await g.m.get(g.url).expect(200);
    expect(movementOf(after, 2)).toEqual({
      speed: 30,
      climb: null,
      moved: 0,
      dashes: 0,
    });
    expect(movementOf(after, 3)).toEqual({
      speed: 30,
      climb: null,
      moved: 0,
      dashes: 0,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'figures.round',
      result: { count: 1, creatures: 2 },
    });

    await g.move(g.m, 2, [1, 1, 5]);
    const refreshed = await g.m.post(`${g.url}/2/refresh`).expect(200);
    expect(movementOf(refreshed, 2)).toEqual({
      speed: 30,
      climb: null,
      moved: 0,
      dashes: 0,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'creature.refreshed',
      result: { creature: { objectId: 2, name: 'Гоблин' } },
    });
  });

  it('нельзя встать на персонажа или на НПС, поверженный не ходит', async () => {
    const g = await started('gcm_blocked');
    // Фигурка игрока на старте [0,1,0], НПС — на [2,1,0].
    await g.move(g.m, 2, [0, 1, 0], 409);
    await g.move(g.m, 2, [2, 1, 0], 409);
    // Своя клетка — не ход.
    await g.move(g.m, 2, [1, 1, 0], 409);
    await g.m
      .post(`${g.url}/2/changes`)
      .send({ kind: 'damage', amount: 4 })
      .expect(200);
    const down = await g.move(g.m, 2, [1, 1, 3], 409);
    expect((down.body as { message: string }).message).toBe(
      'Поверженное существо не ходит',
    );
  });

  it('водит только мастер; нет существа — 404; клетка — три целых числа', async () => {
    const g = await started('gcm_access');
    await g.move(g.player.agent, 2, [1, 1, 3], 403);
    await g.player.agent.post(`${g.url}/2/dash`).expect(403);
    await g.player.agent.post(`${g.url}/2/refresh`).expect(403);
    const stranger = await user('gcm_access_stranger');
    await g.move(stranger.agent, 2, [1, 1, 3], 403);
    await t
      .anonymous()
      .post(`${g.url}/2/move`)
      .send({ to: [1, 1, 3] })
      .expect(401);
    // Бочка — не существо, 99 — нет такого объекта.
    await g.move(g.m, 4, [5, 1, 5], 404);
    await g.move(g.m, 99, [5, 1, 5], 404);
    await g.move(g.m, 2, [1, 1], 400);
    await g.move(g.m, 2, [1.5, 1, 3], 400);
    // Ничего не сдвинулось.
    expect((await positionOf(g.m, g.gameId, 2))?.at).toEqual([1, 1, 0]);
  });
});
