import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  GAME_SOCKET,
  type GameDetail,
  type GameEventPage,
  type GameFigureDragMessage,
  type GameFigures,
  type GameScenes,
  type GameSceneView,
} from 'shared';
import {
  characterBody,
  pngImage,
  PNG_FILE,
} from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import {
  collect,
  join,
  listenForSockets,
  next,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Фигурки персонажей (docs/plan/done/game.md, этап 7): встают на свободные стартовые точки,
// когда сцена становится активной и когда персонаж садится на место; видны тем, кто
// видит сцену.
describe('game figures (e2e)', () => {
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
  const figuresUrl = (gameId: string) => `/api/games/${gameId}/scene/figures`;

  async function figures(agent: request.Agent, gameId: string) {
    const res = await agent.get(figuresUrl(gameId)).expect(200);
    return res.body as GameFigures;
  }

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  async function addScene(agent: request.Agent, gameId: string, mapId: string) {
    const res = await agent
      .post(`/api/games/${gameId}/scenes`)
      .send({ mapId })
      .expect(201);
    return res.body as GameScenes;
  }

  // Второй игрок садится на место своим персонажем.
  async function seatSecond(gameId: string, prefix: string) {
    const second = await user(`${prefix}_second`);
    const character = idOf(
      await second.agent
        .post('/api/characters')
        .send(characterBody({ name: 'Второй' }))
        .expect(201),
    );
    await second.agent
      .post(`/api/games/${gameId}/seats`)
      .send({ characterId: character })
      .expect(201);
    return { ...second, character };
  }

  it('фигурка встаёт на стартовую точку новой активной сцены; видна, пока сцена открыта', async () => {
    const g = await createSceneGame(user, png, 'gfg_place');
    const m = g.master.agent;
    await m.get(figuresUrl(g.gameId)).expect(404);
    const { scenes } = await addScene(m, g.gameId, g.mapId);

    const seen = await figures(m, g.gameId);
    expect(seen.sceneId).toBe(scenes[0].id);
    expect(seen.unplaced).toEqual([]);
    expect(seen.figures).toEqual([
      expect.objectContaining({
        character: expect.objectContaining({ name: 'Зритель' }) as unknown,
        ownerId: g.player.id,
        at: [0, 1, 0],
        size: 'medium',
        speed: 30,
        moved: 0,
        dashes: 0,
        canMove: true,
      }),
    ]);
    const event = await lastEvent(m, g.gameId);
    expect(event).toMatchObject({
      kind: 'figures.placed',
      sceneId: scenes[0].id,
      intent: { reason: 'scene' },
      result: {
        placed: [{ character: { name: 'Зритель' }, at: [0, 1, 0] }],
        unplaced: [],
      },
    });

    // Закрытую сцену игрок не видит — и фигурки на ней тоже.
    await g.player.agent.get(figuresUrl(g.gameId)).expect(403);
    const stranger = await user('gfg_place_stranger');
    await stranger.agent.get(figuresUrl(g.gameId)).expect(403);
    await t.anonymous().get(figuresUrl(g.gameId)).expect(401);
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const forPlayer = await figures(g.player.agent, g.gameId);
    expect(forPlayer.figures[0].canMove).toBe(true);
    expect(forPlayer.unplaced).toEqual([]);
    const forSecond = await figures(
      (await seatSecond(g.gameId, 'gfg_place')).agent,
      g.gameId,
    );
    // Чужой фигуркой второй игрок не ходит; ему точки не хватило — список у мастера.
    expect(forSecond.figures).toHaveLength(1);
    expect(forSecond.figures[0].canMove).toBe(false);
    expect(forSecond.unplaced).toEqual([]);
    expect((await figures(m, g.gameId)).unplaced).toEqual([
      expect.objectContaining({ name: 'Второй' }),
    ]);
    expect(await lastEvent(m, g.gameId)).toMatchObject({
      kind: 'figures.placed',
      intent: { reason: 'seat' },
      result: { placed: [], unplaced: [{ name: 'Второй' }] },
    });
  });

  it('скрытая точка пропускается; смена и перезапуск сцены ставят фигурки заново, место — убирает', async () => {
    const g = await createSceneGame(user, png, 'gfg_switch');
    const m = g.master.agent;
    await m
      .post(`/api/maps/${g.mapId}/ops`)
      .send({
        ops: [
          {
            op: 'placeObject',
            at: [6, 1, 6],
            object: { kind: 'start', hidden: true },
          },
          { op: 'placeObject', at: [7, 1, 7], object: { kind: 'start' } },
        ],
      })
      .expect(200);
    const { scenes } = await addScene(m, g.gameId, g.mapId);
    const second = await seatSecond(g.gameId, 'gfg_switch');
    const atOf = async () =>
      Object.fromEntries(
        (await figures(m, g.gameId)).figures.map((f) => [
          f.character.name,
          f.at,
        ]),
      );
    expect(await atOf()).toEqual({ Зритель: [0, 1, 0], Второй: [7, 1, 7] });

    // Вторая сцена — фигурки уходят на неё; обратно — снова на стартовые точки.
    const other = await addScene(m, g.gameId, g.mapId);
    const otherId = other.scenes[1].id;
    expect((await figures(m, g.gameId)).sceneId).toBe(scenes[0].id);
    await m
      .put(`/api/games/${g.gameId}/scenes/active`)
      .send({ sceneId: otherId })
      .expect(200);
    const moved = await figures(m, g.gameId);
    expect(moved.sceneId).toBe(otherId);
    expect(moved.figures).toHaveLength(2);

    const restarted = await m
      .post(`/api/games/${g.gameId}/scenes/${otherId}/restart`)
      .expect(201);
    const fresh = (restarted.body as GameScenes).scenes.find((s) => s.active);
    const after = await figures(m, g.gameId);
    expect(after.sceneId).toBe(fresh?.id);
    expect(await atOf()).toEqual({ Зритель: [0, 1, 0], Второй: [7, 1, 7] });

    // Освободил место — фигурки нет; сел снова — встал на свободную точку.
    await second.agent.delete(`/api/games/${g.gameId}/seats/me`).expect(200);
    expect(await atOf()).toEqual({ Зритель: [0, 1, 0] });
    await second.agent
      .post(`/api/games/${g.gameId}/seats`)
      .send({ characterId: second.character })
      .expect(201);
    expect(await atOf()).toEqual({ Зритель: [0, 1, 0], Второй: [7, 1, 7] });
    // Убранный мастером игрок уносит фигурку.
    await m.delete(`/api/games/${g.gameId}/members/${second.id}`).expect(204);
    expect(await atOf()).toEqual({ Зритель: [0, 1, 0] });
  });

  it('картинку фигурки видит мастер и участник открытой сцены', async () => {
    const g = await createSceneGame(user, png, 'gfg_image');
    const m = g.master.agent;
    await addScene(m, g.gameId, g.mapId);
    const [figure] = (await figures(m, g.gameId)).figures;
    const url = `/api/games/${g.gameId}/figures/${figure.character.id}/image?v=1`;
    // Картинки нет — 404.
    await m.get(url).expect(404);
    await g.player.agent
      .post(`/api/characters/${figure.character.id}/images`)
      .attach('file', png, PNG_FILE)
      .expect(201);
    expect((await figures(m, g.gameId)).figures[0].image).not.toBeNull();

    const res = await m.get(url).expect(200);
    expect(res.headers['content-type']).toBe('image/webp');
    const second = await seatSecond(g.gameId, 'gfg_image');
    // Сцена закрыта — участнику картинку не отдают, постороннему — никогда.
    await second.agent.get(url).expect(404);
    const stranger = await user('gfg_image_stranger');
    await stranger.agent.get(url).expect(403);
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await second.agent.get(url).expect(200);
    // Фигурки на сцене нет — нет и картинки.
    const unknown = `/api/games/${g.gameId}/figures/${second.character}/image?v=1`;
    await m.get(unknown).expect(404);
  });

  // Игра с открытой активной сценой: фигурка игрока на стартовой точке [0, 1, 0],
  // гоблин — на [1, 1, 0], пол — камень на y = 0 (стоят на y = 1).
  async function opened(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const { scenes } = await addScene(m, g.gameId, g.mapId);
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const [figure] = (await figures(m, g.gameId)).figures;
    const base = `/api/games/${g.gameId}/figures`;
    const url = `${base}/${figure.character.id}`;
    return { ...g, m, sceneId: scenes[0].id, figure, base, url };
  }

  const figureOf = (res: request.Response, id: string) =>
    (res.body as GameFigures).figures.find((f) => f.character.id === id);

  it('ход по пути тратит запас; «Рывок» и «Новый раунд» его пополняют', async () => {
    const g = await opened('gfg_move');
    const id = g.figure.character.id;
    const p = g.player.agent;
    const moved = await p
      .post(`${g.url}/move`)
      .send({ to: [0, 1, 3] })
      .expect(200);
    expect(figureOf(moved, id)).toMatchObject({
      at: [0, 1, 3],
      moved: 15,
      facing: 180,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'figure.moved',
      as: { kind: 'character', id },
      sceneId: g.sceneId,
      result: { from: [0, 1, 0], to: [0, 1, 3], cost: 15, left: 15 },
    });
    // 20 футов при запасе 15 — не дойти.
    await p
      .post(`${g.url}/move`)
      .send({ to: [0, 1, 7] })
      .expect(409);

    // «Рывок» — ещё 30 футов; дошли, осталось 25.
    const dashed = await g.m.post(`${g.url}/dash`).expect(200);
    expect(figureOf(dashed, id)).toMatchObject({ dashes: 1, moved: 15 });
    const far = await p
      .post(`${g.url}/move`)
      .send({ to: [0, 1, 7] })
      .expect(200);
    expect(figureOf(far, id)).toMatchObject({ at: [0, 1, 7], moved: 35 });

    const round = await g.m.post(`${g.base}/round`).expect(200);
    expect(figureOf(round, id)).toMatchObject({ moved: 0, dashes: 0 });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'figures.round',
      result: { count: 1 },
    });
    await p
      .post(`${g.url}/move`)
      .send({ to: [0, 1, 6] })
      .expect(200);
    const refreshed = await g.m.post(`${g.url}/refresh`).expect(200);
    expect(figureOf(refreshed, id)).toMatchObject({ moved: 0 });
  });

  it('в чужом месте ход не кончается; скрытый монстр игроку не мешает, мастеру — да', async () => {
    const g = await opened('gfg_crowd');
    const p = g.player.agent;
    // Гоблин стоит на [1, 1, 0]: остановиться там нельзя.
    await p
      .post(`${g.url}/move`)
      .send({ to: [1, 1, 0] })
      .expect(409);
    const view = (await g.m.get(`/api/games/${g.gameId}/scene`).expect(200))
      .body as GameSceneView;
    const goblin = view.objects.find((o) => o.kind === 'monster');
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/ops`)
      .send({
        ops: [{ op: 'updateObject', id: goblin?.id, object: { hidden: true } }],
      })
      .expect(200);
    // Мастер видит засаду — поставить туда не даст; игрок её не видит — встанет.
    await g.m
      .put(g.url)
      .send({ at: [1, 1, 0] })
      .expect(409);
    await p
      .post(`${g.url}/move`)
      .send({ to: [1, 1, 0] })
      .expect(200);
  });

  it('мастер ставит фигурку куда угодно, где она встанет; «Не на сцене» — тоже', async () => {
    const g = await opened('gfg_place2');
    const second = await seatSecond(g.gameId, 'gfg_place2');
    const placed = await g.m
      .put(`${g.base}/${second.character}`)
      .send({ at: [6, 1, 6] })
      .expect(200);
    expect(figureOf(placed, second.character)).toMatchObject({
      at: [6, 1, 6],
      moved: 0,
    });
    expect((placed.body as GameFigures).unplaced).toEqual([]);
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'figure.placed',
      result: { from: null, to: [6, 1, 6] },
    });
    // Без пути: через всю карту, запас не тратится.
    const jumped = await g.m
      .put(g.url)
      .send({ at: [7, 1, 7] })
      .expect(200);
    expect(figureOf(jumped, g.figure.character.id)).toMatchObject({
      at: [7, 1, 7],
      moved: 0,
    });
    // Занято другой фигуркой, в воздухе, за картой — нельзя.
    for (const at of [
      [6, 1, 6],
      [5, 4, 5],
      [9, 1, 9],
    ]) {
      await g.m.put(g.url).send({ at }).expect(409);
    }
  });

  it('водит фигурку владелец и мастер; правки запаса — только мастер', async () => {
    const g = await opened('gfg_rights');
    const second = await seatSecond(g.gameId, 'gfg_rights');
    const stranger = await user('gfg_rights_stranger');
    const move = (agent: request.Agent, status: number) =>
      agent
        .post(`${g.url}/move`)
        .send({ to: [0, 1, 1] })
        .expect(status);
    await move(second.agent, 403);
    await move(stranger.agent, 403);
    await t
      .anonymous()
      .post(`${g.url}/move`)
      .send({ to: [0, 1, 1] })
      .expect(401);
    for (const path of ['round']) {
      await g.player.agent.post(`${g.base}/${path}`).expect(403);
    }
    await g.player.agent.post(`${g.url}/dash`).expect(403);
    await g.player.agent.post(`${g.url}/refresh`).expect(403);
    await g.player.agent
      .put(g.url)
      .send({ at: [5, 1, 5] })
      .expect(403);
    // Кривое тело и неизвестная фигурка.
    await g.player.agent
      .post(`${g.url}/move`)
      .send({ to: [0, 1] })
      .expect(400);
    await g.m
      .post(`${g.base}/${second.id}/move`)
      .send({ to: [0, 1, 1] })
      .expect(404);
    // Закрытая сцена — игрок не ходит, мастер ходит.
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    await move(g.player.agent, 403);
    await move(g.m, 200);
  });

  it('куда тянут фигурку — остальным по сокету; чужую, за сценой и на закрытой сцене игроку — нет', async () => {
    const g = await opened('gfg_drag');
    const second = await seatSecond(g.gameId, 'gfg_drag');
    const connect = async (cookie: string) => {
      const socket = await clients.connect(cookie);
      expect((await join(socket, g.gameId)).ok).toBe(true);
      return socket;
    };
    const masterSocket = await connect(g.master.cookie);
    const playerSocket = await connect(g.player.cookie);
    const secondSocket = await connect(second.cookie);
    const id = g.figure.character.id;
    const drag = (at: GameFigureDragMessage['at']): GameFigureDragMessage => ({
      gameId: g.gameId,
      characterId: id,
      at,
    });
    const dragged = GAME_SOCKET.figureDragged;

    // Игрок тянет свою фигурку — видят мастер и второй игрок, сам он — нет.
    const toMaster = next(masterSocket, dragged);
    const toSecond = next(secondSocket, dragged);
    const toSelf = collect(playerSocket, dragged);
    playerSocket.emit(GAME_SOCKET.figureDrag, drag([0, 1, 2]));
    expect(await toMaster).toEqual(drag([0, 1, 2]));
    expect(await toSecond).toEqual(drag([0, 1, 2]));
    expect(await toSelf).toEqual([]);

    // Чужую фигурку, клетку за сценой и кривое сообщение сервер отбрасывает.
    const nothing = collect(masterSocket, dragged);
    secondSocket.emit(GAME_SOCKET.figureDrag, drag([0, 1, 3]));
    playerSocket.emit(GAME_SOCKET.figureDrag, drag([40, 1, 3]));
    playerSocket.emit(GAME_SOCKET.figureDrag, { ...drag(null), at: [1, 2] });
    expect(await nothing).toEqual([]);

    // Сцена закрыта: игрок не тянет, тянущий мастер игрокам не виден.
    await g.m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    const closedToMaster = collect(masterSocket, dragged);
    playerSocket.emit(GAME_SOCKET.figureDrag, drag([0, 1, 4]));
    expect(await closedToMaster).toEqual([]);
    const closedToPlayer = collect(playerSocket, dragged);
    masterSocket.emit(GAME_SOCKET.figureDrag, drag([0, 1, 5]));
    expect(await closedToPlayer).toEqual([]);
  });

  it('мастер отдаёт управление участнику: тот водит фигурку, пока владелец разрешает', async () => {
    const g = await opened('gfg_ctrl');
    const second = await seatSecond(g.gameId, 'gfg_ctrl');
    const stranger = await user('gfg_ctrl_stranger');
    const controllerUrl = `/api/games/${g.gameId}/seats/${g.player.id}/controller`;
    const give = (
      agent: request.Agent,
      controllerId: string | null,
      status: number,
    ) => agent.put(controllerUrl).send({ controllerId }).expect(status);
    const move = (to: number[], status: number) =>
      second.agent.post(`${g.url}/move`).send({ to }).expect(status);

    await move([0, 1, 1], 403);
    const given = await give(g.m, second.id, 200);
    const seat = (given.body as GameDetail).seats.find(
      (s) => s.user.id === g.player.id,
    );
    expect(seat?.controller).toEqual({
      id: second.id,
      nickname: 'gfg_ctrl_second',
    });
    // Участники — кто вошёл в лобби; мастер в их числе не значится.
    expect((given.body as GameDetail).members.map((m) => m.id).sort()).toEqual(
      [g.player.id, second.id].sort(),
    );
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'seat.controller',
      intent: { userId: g.player.id, controllerId: second.id },
      result: { controller: { id: second.id } },
    });
    const moved = await move([0, 1, 1], 200);
    expect(figureOf(moved, g.figure.character.id)?.canMove).toBe(true);
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'figure.moved',
      actor: { id: second.id },
      as: { kind: 'character', id: g.figure.character.id },
    });
    // Участников видит только мастер.
    const lobby = await g.player.agent
      .get(`/api/games/${g.gameId}`)
      .expect(200);
    expect((lobby.body as GameDetail).members).toEqual([]);

    // Только мастер, только другой участник, только при разрешении владельца.
    await give(g.player.agent, second.id, 403);
    await give(g.m, g.player.id, 400);
    await give(g.m, g.master.id, 400);
    await give(g.m, stranger.id, 400);
    await g.m
      .put(`/api/games/${g.gameId}/seats/${stranger.id}/controller`)
      .send({ controllerId: second.id })
      .expect(404);
    await g.player.agent
      .patch(`/api/games/${g.gameId}/seats/me`)
      .send({ allowHandover: false })
      .expect(200);
    await move([0, 1, 2], 403);
    await give(g.m, second.id, 409);

    // Снова можно — и управляющий уходит из игры: управление снимается.
    await g.player.agent
      .patch(`/api/games/${g.gameId}/seats/me`)
      .send({ allowHandover: true })
      .expect(200);
    await give(g.m, second.id, 200);
    await second.agent
      .delete(`/api/games/${g.gameId}/members/${second.id}`)
      .expect(204);
    const after = await g.m.get(`/api/games/${g.gameId}`).expect(200);
    expect((after.body as GameDetail).seats[0].controller).toBeNull();
    // Забрать управление — null.
    await give(g.m, null, 200);
  });
});
