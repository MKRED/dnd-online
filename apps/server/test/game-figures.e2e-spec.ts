import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameEventPage, GameFigures, GameScenes } from 'shared';
import {
  characterBody,
  pngImage,
  PNG_FILE,
} from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Фигурки персонажей (docs/plan/game.md, этап 7): встают на свободные стартовые точки,
// когда сцена становится активной и когда персонаж садится на место; видны тем, кто
// видит сцену.
describe('game figures (e2e)', () => {
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
});
