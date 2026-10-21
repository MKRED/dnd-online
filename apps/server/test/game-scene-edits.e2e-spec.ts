import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  GAME_SOCKET,
  type GameEventPage,
  type GameScenes,
  type GameSceneEditMessage,
  type GameSceneView,
  type MapEditResult,
} from 'shared';
import { characterBody, pngImage } from './support/character-fixture.js';
import { monsterBody } from './support/monster-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import {
  collect,
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Правки мастера в сцене (docs/plan/done/game.md, этап 6): операции карты на сцене, записи
// журнала, отмена и возврат, новые записи справочников — в библиотеку, рассылка правок
// мастеру целиком и игрокам — без скрытого.
describe('game scene edits (e2e)', () => {
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

  // Игра со сценой из карты мастера; сцена активная и закрыта.
  async function started(prefix: string) {
    const game = await createSceneGame(user, png, prefix);
    const scenes = await game.master.agent
      .post(`/api/games/${game.gameId}/scenes`)
      .send({ mapId: game.mapId })
      .expect(201);
    const sceneId = (scenes.body as GameScenes).scenes[0].id;
    const url = `/api/games/${game.gameId}/scenes/${sceneId}`;
    const m = game.master.agent;
    const ops = (list: unknown[], status = 200) =>
      m.post(`${url}/ops`).send({ ops: list }).expect(status);
    return { ...game, sceneId, url, m, ops };
  }

  async function view(agent: request.Agent, gameId: string) {
    const res = await agent.get(`/api/games/${gameId}/scene`).expect(200);
    return res.body as GameSceneView;
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  const resultOf = (res: request.Response) => res.body as MapEditResult;
  const stone = { op: 'setBlock', at: [5, 1, 5], block: 'stone' };

  it('мастер правит сцену, как карту: новое — в библиотеку, карта не меняется', async () => {
    const g = await started('gse_edit');
    const orc = idOf(
      await g.m
        .post('/api/monsters')
        .send({ ...monsterBody(), name: 'Орк', role: 'regular' })
        .expect(201),
    );

    const edited = resultOf(
      await g.ops([
        stone,
        {
          op: 'placeObject',
          at: [6, 1, 6],
          object: { kind: 'monster', monsterId: orc, hidden: true },
        },
        { op: 'updateObject', id: 4, object: { name: 'Бочка эля' } },
      ]),
    );
    expect(edited).toMatchObject({
      seq: 1,
      changedCells: 1,
      createdObjectIds: [6],
    });
    // Ссылки — из библиотеки игры: орк скопирован туда этой же правкой.
    expect(edited.refs.monsters[orc]).toMatchObject({
      missing: null,
      name: 'Орк',
    });
    await g.m.get(`/api/games/${g.gameId}/library/monster/${orc}`).expect(200);

    const scene = await view(g.m, g.gameId);
    expect(scene.seq).toBe(1);
    expect(scene.objects.find((o) => o.id === 6)).toMatchObject({
      kind: 'monster',
      hidden: true,
    });
    expect(scene.objects.find((o) => o.id === 4)).toMatchObject({
      name: 'Бочка эля',
    });

    const event = await lastEvent(g.m, g.gameId);
    expect(event).toMatchObject({
      kind: 'scene.edited',
      sceneId: g.sceneId,
      intent: { ops: [{ op: 'setBlock' }, { op: 'placeObject' }, {}] },
      result: {
        scene: { id: g.sceneId, name: 'Логово' },
        sceneSeq: 1,
        cells: 1,
        objects: 2,
        libraryCopied: 1,
      },
    });
    // Changeset в запись для мастера не входит.
    expect(event).not.toHaveProperty('changes');

    // Карта мастера — шаблон: правка сцены её не трогает.
    const map = await g.m.get(`/api/maps/${g.mapId}/chunks`).expect(200);
    expect(map.body).toMatchObject({ seq: 1 });
    expect((map.body as GameSceneView).objects).toHaveLength(5);

    // Пустая правка — без записи и без нового номера.
    expect(resultOf(await g.ops([stone]))).toMatchObject({
      seq: 1,
      changedCells: 0,
    });
    expect((await lastEvent(g.m, g.gameId)).seq).toBe(event.seq);
  });

  it('«Отменить» и «Вернуть» — записи журнала; новая правка очищает возврат, перезапуск — всё', async () => {
    const g = await started('gse_undo');
    await g.ops([{ op: 'setBlock', at: [1, 1, 1], block: 'stone' }]);
    const a = await lastEvent(g.m, g.gameId);
    await g.ops([{ op: 'moveObject', id: 2, at: [5, 1, 5] }]);
    const b = await lastEvent(g.m, g.gameId);
    const at = async (id: number) =>
      (await view(g.m, g.gameId)).objects.find((o) => o.id === id)?.at;

    // Отмена снимает последнюю правку, потом — предыдущую.
    expect(resultOf(await g.m.post(`${g.url}/undo`).expect(200))).toMatchObject(
      { seq: 3, conflicts: 0 },
    );
    expect(await at(2)).toEqual([1, 1, 0]);
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'scene.undone',
      intent: { seq: b.seq },
      result: { sceneSeq: 3, objects: 1, conflicts: 0 },
    });
    const undoneA = resultOf(await g.m.post(`${g.url}/undo`).expect(200));
    // Блок снят: после правки в клетке воздух.
    expect(undoneA.changes.cells.slice(0, 3)).toEqual([1, 1, 1]);
    expect(undoneA.changes.cells[4]).toBe(0);
    const undoA = await lastEvent(g.m, g.gameId);
    expect(
      (await g.m.post(`${g.url}/undo`).expect(400)).body as { message: string },
    ).toMatchObject({ message: 'Нечего отменять' });

    // Возврат — в обратном порядке.
    const redoneA = resultOf(await g.m.post(`${g.url}/redo`).expect(200));
    expect(redoneA.changes.cells[4]).not.toBe(0);
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'scene.redone',
      intent: { seq: a.seq, undoSeq: undoA.seq },
    });
    await g.m.post(`${g.url}/redo`).expect(200);
    expect(await at(2)).toEqual([5, 1, 5]);
    await g.m.post(`${g.url}/redo`).expect(400);

    // Новая правка после отмены — возвращать больше нечего.
    await g.m.post(`${g.url}/undo`).expect(200);
    await g.ops([{ op: 'turnObject', id: 1, facing: 90 }]);
    expect(
      (await g.m.post(`${g.url}/redo`).expect(400)).body as { message: string },
    ).toMatchObject({ message: 'Нечего возвращать' });

    // Перезапуск — новая копия с пустой историей; старая больше не правится.
    const restarted = await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/restart`)
      .expect(201);
    const fresh = (restarted.body as GameScenes).scenes[0].id;
    await g.m.post(`/api/games/${g.gameId}/scenes/${fresh}/undo`).expect(400);
    await g.ops([stone], 404);
  });

  it('доступ и проверки: только мастер, без размера, без чужого и без своего героя', async () => {
    const g = await started('gse_acl');
    const stranger = await user('gse_acl_stranger');

    await request(t.app.getHttpServer())
      .post(`${g.url}/ops`)
      .send({ ops: [stone] })
      .expect(401);
    await g.player.agent
      .post(`${g.url}/ops`)
      .send({ ops: [stone] })
      .expect(403);
    await g.player.agent.post(`${g.url}/undo`).expect(403);
    await stranger.agent.post(`${g.url}/redo`).expect(403);
    await g.m
      .post(
        `/api/games/${g.gameId}/scenes/00000000-0000-4000-8000-000000000000/ops`,
      )
      .send({ ops: [stone] })
      .expect(404);
    await g.ops([{ op: 'setBlock', at: [1, 1], block: 'stone' }], 400);

    const resized = await g.ops([{ op: 'resize', grow: { east: 2 } }], 400);
    expect((resized.body as { message: string }).message).toContain(
      'Размер сцены в игре не меняется',
    );

    // Чужой скрытый монстр и свой игровой персонаж — не ставятся и в библиотеку не
    // попадают: правка сцены не способ утащить в игру чужое.
    const secret = idOf(
      await stranger.agent
        .post('/api/monsters')
        .send({ ...monsterBody(), name: 'Тайна', role: 'regular' })
        .expect(201),
    );
    await g.ops(
      [
        {
          op: 'placeObject',
          at: [6, 1, 6],
          object: { kind: 'monster', monsterId: secret },
        },
      ],
      400,
    );
    await g.m
      .get(`/api/games/${g.gameId}/library/monster/${secret}`)
      .expect(404);
    const hero = idOf(
      await g.m
        .post('/api/characters')
        .send(characterBody({ name: 'Герой' }))
        .expect(201),
    );
    await g.ops(
      [
        {
          op: 'placeObject',
          at: [6, 1, 6],
          object: { kind: 'npc', characterId: hero },
        },
      ],
      400,
    );
    await g.m.get(`/api/games/${g.gameId}/library/npc/${hero}`).expect(404);
    expect((await view(g.m, g.gameId)).seq).toBe(0);
  });

  it('рассылка: мастеру — целиком, игроку — без скрытого и только при открытой сцене', async () => {
    const g = await started('gse_live');
    const masterSocket = await clients.connect(g.master.cookie);
    await join(masterSocket, g.gameId);
    const playerSocket = await clients.connect(g.player.cookie);
    await join(playerSocket, g.gameId);
    const edit = (socket: typeof masterSocket) =>
      next<GameSceneEditMessage>(socket, GAME_SOCKET.sceneEdit);

    // Сцена закрыта — правку видит только мастер.
    const closedMaster = edit(masterSocket);
    const closedPlayer = collect<GameSceneEditMessage>(
      playerSocket,
      GAME_SOCKET.sceneEdit,
    );
    await g.ops([stone]);
    expect(await closedMaster).toMatchObject({
      gameId: g.gameId,
      sceneId: g.sceneId,
      seq: 1,
      changes: { cells: [5, 1, 5, 0, expect.any(Number) as number] },
    });
    expect(await closedPlayer).toEqual([]);

    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);

    // Засада и содержимое бочки: игроку — номер правки без объектов.
    let toMaster = edit(masterSocket);
    let toPlayer = edit(playerSocket);
    await g.ops([
      {
        op: 'placeObject',
        at: [6, 1, 6],
        object: { kind: 'monster', monsterId: g.goblin, hidden: true },
      },
      { op: 'updateObject', id: 4, object: { items: [] } },
    ]);
    const full = await toMaster;
    expect(full.changes.objects).toHaveLength(2);
    expect(full.refs.monsters[g.goblin]).toMatchObject({ name: 'Гоблин' });
    expect(await toPlayer).toEqual({
      gameId: g.gameId,
      sceneId: g.sceneId,
      seq: 2,
      changes: { cells: [], paletteAdded: [] },
      refs: { monsters: {}, items: {}, npcs: {} },
    });

    // Мастер выводит засаду: игроку гоблин «ставится», со ссылкой из библиотеки.
    toPlayer = edit(playerSocket);
    await g.ops([{ op: 'updateObject', id: 6, object: { hidden: false } }]);
    const revealed = await toPlayer;
    expect(revealed.changes.objects).toEqual([
      {
        id: 6,
        before: null,
        after: expect.objectContaining({
          kind: 'monster',
          hidden: false,
        }) as unknown,
      },
    ]);
    expect(revealed.refs.monsters[g.goblin]).toMatchObject({ name: 'Гоблин' });

    // Отмена прячет его снова — у игрока гоблин убран.
    toPlayer = edit(playerSocket);
    toMaster = edit(masterSocket);
    await g.m.post(`${g.url}/undo`).expect(200);
    expect((await toPlayer).changes.objects).toEqual([
      {
        id: 6,
        before: expect.objectContaining({ id: 6 }) as unknown,
        after: null,
      },
    ]);
    expect((await toMaster).changes.objects?.[0].after).toMatchObject({
      hidden: true,
    });
    // То же видит игрок, перечитав сцену.
    expect(
      (await view(g.player.agent, g.gameId)).objects.map((o) => o.id),
    ).not.toContain(6);

    // Сцену закрыли — правки к игроку больше не идут.
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    const afterClose = collect<GameSceneEditMessage>(
      playerSocket,
      GAME_SOCKET.sceneEdit,
    );
    await g.ops([{ op: 'setBlock', at: [2, 1, 2], block: 'stone' }]);
    expect(await afterClose).toEqual([]);
  });
});
