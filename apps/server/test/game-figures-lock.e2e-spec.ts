import type request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  GAME_SOCKET,
  type GameDetail,
  type GameEventPage,
  type GameFigures,
} from 'shared';
import { characterBody, pngImage } from './support/character-fixture.js';
import { createSceneGame, startSession } from './support/scene-fixture.js';
import {
  collect,
  join,
  listenForSockets,
  type SocketClients,
} from './support/socket-client.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Запрет игрокам ходить (вкладка «Сцена», решено с пользователем 2026-10-31): мастер
// запрещает одному герою или всем на местах; игрок не ходит и не тянет фигурку, мастер —
// как обычно.
describe('game figures move lock (e2e)', () => {
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

  async function figures(agent: request.Agent, gameId: string) {
    const res = await agent.get(`/api/games/${gameId}/scene/figures`);
    expect(res.status).toBe(200);
    return res.body as GameFigures;
  }

  async function events(agent: request.Agent, gameId: string) {
    const res = await agent.get(`/api/games/${gameId}/events?limit=5`);
    expect(res.status).toBe(200);
    return (res.body as GameEventPage).events;
  }

  // Открытая активная сцена, встреча идёт, свободный режим; игрок стоит на [0, 1, 0].
  async function opened(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    await startSession(m, g.gameId);
    const base = `/api/games/${g.gameId}/figures`;
    const [figure] = (await figures(m, g.gameId)).figures;
    return { ...g, m, base, id: figure.character.id };
  }

  async function seatSecond(gameId: string, prefix: string) {
    const second = await user(`${prefix}_second`);
    const res = await second.agent
      .post('/api/characters')
      .send(characterBody({ name: 'Второй' }))
      .expect(201);
    const character = (res.body as { id: string }).id;
    await second.agent
      .post(`/api/games/${gameId}/seats`)
      .send({ characterId: character })
      .expect(201);
    return { ...second, character };
  }

  it('запрет одному герою: игрок не ходит и не тянет, мастер ходит; снятие возвращает ход', async () => {
    const g = await opened('gfl_one');
    const lock = (locked: boolean) =>
      g.m.put(`${g.base}/lock`).send({ characterId: g.id, locked });
    const move = (agent: request.Agent, to: number[]) =>
      agent.post(`${g.base}/${g.id}/move`).send({ to });

    const locked = await lock(true).expect(200);
    const mine = (locked.body as GameFigures).figures[0];
    expect(mine.moveLocked).toBe(true);
    expect((await figures(g.player.agent, g.gameId)).figures[0]).toMatchObject({
      moveLocked: true,
      canMove: true,
    });
    const [event] = await events(g.m, g.gameId);
    expect(event).toMatchObject({
      kind: 'figures.locked',
      intent: { characterId: g.id, locked: true },
      result: { characters: [{ id: g.id }], locked: true },
    });

    const refused = await move(g.player.agent, [0, 1, 1]).expect(403);
    expect((refused.body as { message: string }).message).toBe(
      'Мастер запретил ходить этой фигуркой',
    );
    const masterSocket = await clients.connect(g.master.cookie);
    expect((await join(masterSocket, g.gameId)).ok).toBe(true);
    const playerSocket = await clients.connect(g.player.cookie);
    expect((await join(playerSocket, g.gameId)).ok).toBe(true);
    const nothing = collect(masterSocket, GAME_SOCKET.figureDragged);
    playerSocket.emit(GAME_SOCKET.figureDrag, {
      gameId: g.gameId,
      characterId: g.id,
      at: [0, 1, 2],
    });
    expect(await nothing).toEqual([]);
    await move(g.m, [0, 1, 1]).expect(200);

    // Тот же запрет ещё раз — ничего не меняется, записи нет.
    const before = (await events(g.m, g.gameId))[0].seq;
    await lock(true).expect(200);
    expect((await events(g.m, g.gameId))[0].seq).toBe(before);

    await lock(false).expect(200);
    await move(g.player.agent, [0, 1, 2]).expect(200);
  });

  it('запрет всем: встают все герои на местах; освобождённое место запрет снимает', async () => {
    const g = await opened('gfl_all');
    const second = await seatSecond(g.gameId, 'gfl_all');
    // Стартовая точка одна — второго героя ставит мастер.
    const place = () =>
      g.m
        .put(`${g.base}/${second.character}`)
        .send({ at: [3, 1, 3] })
        .expect(200);
    await place();
    const res = await g.m
      .put(`${g.base}/lock`)
      .send({ locked: true })
      .expect(200);
    expect((res.body as GameFigures).figures.map((f) => f.moveLocked)).toEqual([
      true,
      true,
    ]);
    const [event] = await events(g.m, g.gameId);
    expect(event).toMatchObject({
      kind: 'figures.locked',
      intent: { characterId: null, locked: true },
    });
    expect(
      (event.result as { characters: { id: string }[] }).characters
        .map((c) => c.id)
        .sort(),
    ).toEqual([g.id, second.character].sort());

    // Второй встал и сел снова — запрета у него уже нет.
    await second.agent.delete(`/api/games/${g.gameId}/seats/me`).expect(200);
    await second.agent
      .post(`/api/games/${g.gameId}/seats`)
      .send({ characterId: second.character })
      .expect(201);
    const detail = await g.m.get(`/api/games/${g.gameId}`).expect(200);
    expect((detail.body as GameDetail).seats).toHaveLength(2);
    await place();
    const after = (await figures(g.m, g.gameId)).figures;
    expect(
      after.find((f) => f.character.id === second.character)?.moveLocked,
    ).toBe(false);
    expect(after.find((f) => f.character.id === g.id)?.moveLocked).toBe(true);

    await g.m.put(`${g.base}/lock`).send({ locked: false }).expect(200);
    expect(
      (await figures(g.m, g.gameId)).figures.every((f) => !f.moveLocked),
    ).toBe(true);
  });

  it('запрещает только мастер; тело и герой проверяются', async () => {
    const g = await opened('gfl_access');
    const url = `${g.base}/lock`;
    await g.player.agent.put(url).send({ locked: true }).expect(403);
    const stranger = await user('gfl_access_stranger');
    await stranger.agent.put(url).send({ locked: true }).expect(403);
    await t.anonymous().put(url).send({ locked: true }).expect(401);
    await g.m.put(url).send({}).expect(400);
    await g.m.put(url).send({ locked: 'да' }).expect(400);
    await g.m.put(url).send({ locked: true, characterId: 'x' }).expect(400);
    // Персонаж не на месте этой игры.
    const other = await g.m
      .post('/api/characters')
      .send(characterBody({ name: 'Чужой' }))
      .expect(201);
    await g.m
      .put(url)
      .send({ locked: true, characterId: (other.body as { id: string }).id })
      .expect(404);
    expect((await figures(g.m, g.gameId)).figures[0].moveLocked).toBe(false);
  });
});
