import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  GAME_SOCKET,
  type GameChangedMessage,
  type GameEvent,
  type GameEventPage,
  type GameFigures,
  type GameScenes,
  type GameWalkMessage,
  type Vec3,
} from 'shared';
import type { Socket } from 'socket.io-client';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame, startSession } from './support/scene-fixture.js';
import {
  collect,
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Анимация хода (docs/plan/done/walk-animation.md): путь в записи журнала и сообщение
// game:walked — мастеру весь путь, игроку то, что ему видно, раньше «изменилось» того же хода.
describe('game walks (e2e)', () => {
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

  // Сцена из карты фикстуры (поле 8×8, фигурка игрока на [0,1,0], гоблин — объект 2 на
  // [1,1,0]), активная и открытая; мастер и игрок в комнате.
  async function started(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const res = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (res.body as GameScenes).scenes[0].id;
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await startSession(m, g.gameId);
    const figures = await m
      .get(`/api/games/${g.gameId}/scene/figures`)
      .expect(200);
    const hero = (figures.body as GameFigures).figures[0].character.id;
    const playerSocket = await clients.connect(g.player.cookie);
    await join(playerSocket, g.gameId);
    const masterSocket = await clients.connect(g.master.cookie);
    await join(masterSocket, g.gameId);
    return { ...g, m, sceneId, hero, playerSocket, masterSocket };
  }

  type Started = Awaited<ReturnType<typeof started>>;

  const moveFigure = (g: Started, agent: request.Agent, to: number[]) =>
    agent
      .post(`/api/games/${g.gameId}/figures/${g.hero}/move`)
      .send({ to })
      .expect(200);

  const moveGoblin = (g: Started, to: number[]) =>
    g.m
      .post(`/api/games/${g.gameId}/scene/creatures/2/move`)
      .send({ to })
      .expect(200);

  const ops = (g: Started, list: unknown[]) =>
    g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/ops`)
      .send({ ops: list })
      .expect(200);

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  // Порядок сообщений сокета: путь должен прийти раньше «изменилось» своего хода.
  function order(socket: Socket) {
    const got: string[] = [];
    socket.on(GAME_SOCKET.walked, (m: GameWalkMessage) =>
      got.push(`walked:${m.seq}`),
    );
    socket.on(GAME_SOCKET.changed, (m: GameChangedMessage) =>
      got.push(`changed:${m.seq}`),
    );
    return got;
  }

  const pathOf = (event: GameEvent) =>
    event.kind === 'figure.moved' || event.kind === 'creature.moved'
      ? event.result.path
      : undefined;

  const path: Vec3[] = [
    [0, 1, 0],
    [0, 1, 1],
    [0, 1, 2],
  ];

  it('ход фигурки: путь в журнале, всем в комнате — до «изменилось»', async () => {
    const g = await started('gwk_figure');
    const toPlayer = next<GameWalkMessage>(g.playerSocket, GAME_SOCKET.walked);
    const toMaster = next<GameWalkMessage>(g.masterSocket, GAME_SOCKET.walked);
    const seen = order(g.playerSocket);

    await moveFigure(g, g.player.agent, [0, 1, 2]);

    const event = await lastEvent(g.m, g.gameId);
    expect(event.kind).toBe('figure.moved');
    expect(pathOf(event)).toEqual(path);
    const expected: GameWalkMessage = {
      gameId: g.gameId,
      sceneId: g.sceneId,
      seq: event.seq,
      walker: { kind: 'figure', characterId: g.hero },
      path,
    };
    expect(await toPlayer).toEqual(expected);
    expect(await toMaster).toEqual(expected);
    await collect(g.playerSocket, GAME_SOCKET.changed, 200);
    expect(seen.slice(0, 2)).toEqual([
      `walked:${event.seq}`,
      `changed:${event.seq}`,
    ]);
  });

  it('закрытая сцена: путь только мастеру', async () => {
    const g = await started('gwk_closed');
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    const toMaster = next<GameWalkMessage>(g.masterSocket, GAME_SOCKET.walked);
    const toPlayer = collect<GameWalkMessage>(
      g.playerSocket,
      GAME_SOCKET.walked,
      500,
    );

    await moveFigure(g, g.m, [0, 1, 2]);

    expect((await toMaster).path).toEqual(path);
    expect(await toPlayer).toEqual([]);
  });

  it('ход монстра без тумана: путь целиком и мастеру, и игроку', async () => {
    const g = await started('gwk_creature');
    const toPlayer = next<GameWalkMessage>(g.playerSocket, GAME_SOCKET.walked);
    const toMaster = next<GameWalkMessage>(g.masterSocket, GAME_SOCKET.walked);

    await moveGoblin(g, [1, 1, 2]);

    const event = await lastEvent(g.m, g.gameId);
    expect(event.kind).toBe('creature.moved');
    const goblinPath: Vec3[] = [
      [1, 1, 0],
      [1, 1, 1],
      [1, 1, 2],
    ];
    expect(pathOf(event)).toEqual(goblinPath);
    const master = await toMaster;
    expect(master.walker).toEqual({ kind: 'creature', objectId: 2 });
    expect(master.path).toEqual(goblinPath);
    expect((await toPlayer).path).toEqual(goblinPath);
  });

  it('скрытый монстр: путь только мастеру', async () => {
    const g = await started('gwk_hidden');
    await ops(g, [{ op: 'updateObject', id: 2, object: { hidden: true } }]);
    const toMaster = next<GameWalkMessage>(g.masterSocket, GAME_SOCKET.walked);
    const toPlayer = collect<GameWalkMessage>(
      g.playerSocket,
      GAME_SOCKET.walked,
      500,
    );

    await moveGoblin(g, [1, 1, 2]);

    expect((await toMaster).path).toHaveLength(3);
    expect(await toPlayer).toEqual([]);
  });

  it('туман: игрок видит путь до стены, дальше — null', async () => {
    const g = await started('gwk_fog');
    // Стена поперёк поля между z = 2 и z = 4: за ней фигурка на [0,1,0] не видит.
    await ops(g, [
      { op: 'fillBox', from: [0, 1, 3], to: [7, 3, 3], block: 'stone' },
      { op: 'fillBox', from: [1, 1, 3], to: [1, 3, 3], block: 'air' },
    ]);
    await g.m
      .put(`/api/games/${g.gameId}/scenes/${g.sceneId}/fog`)
      .send({ enabled: true, sightRange: 10 })
      .expect(200);
    const toPlayer = next<GameWalkMessage>(g.playerSocket, GAME_SOCKET.walked);
    const toMaster = next<GameWalkMessage>(g.masterSocket, GAME_SOCKET.walked);

    // Гоблин уходит в проём и за стену, вбок: последних клеток группа не видит.
    await moveGoblin(g, [2, 1, 5]);

    const master = await toMaster;
    expect(master.path[0]).toEqual([1, 1, 0]);
    expect(master.path.at(-1)).toEqual([2, 1, 5]);
    expect(master.path).not.toContain(null);
    const player = await toPlayer;
    expect(player.path[0]).toEqual([1, 1, 0]);
    expect(player.path.at(-1)).toBeNull();
    // Скрытый кусок — один null, видимые клетки — те же, что у мастера.
    expect(player.path.filter((cell) => cell === null)).toHaveLength(1);
    for (const cell of player.path) {
      if (cell) expect(master.path).toContainEqual(cell);
    }
  });
});
