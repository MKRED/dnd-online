import { eq } from 'drizzle-orm';
import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  maskHas,
  maskSize,
  type CellMask,
  type GameEventPage,
  type GameFigures,
  type GameScenes,
  type Vec3,
} from 'shared';
import { DatabaseService } from '../src/database/database.service.js';
import { gameSceneFog } from '../src/database/schema/index.js';
import { loadFog } from '../src/games/fog/index.js';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Туман войны, этап 2 (docs/plan/fog-of-war.md): настройки тумана у сцены и маски
// «открыто» и «видно», которые пересчитывает запись журнала. Игроку туман ещё не
// уходит (этап 3), поэтому маски читаются из базы.
describe('game scene fog (e2e)', () => {
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

  const db = () => t.app.get(DatabaseService).db;
  const fogUrl = (gameId: string, sceneId: string) =>
    `/api/games/${gameId}/scenes/${sceneId}/fog`;

  async function lastEvent(agent: request.Agent, gameId: string) {
    const res = await agent
      .get(`/api/games/${gameId}/events?limit=1`)
      .expect(200);
    return (res.body as GameEventPage).events[0];
  }

  // Игра со сценой 8×8 (scene-fixture.ts): фигурка игрока встаёт на старт [0, 1, 0].
  async function setup(prefix: string) {
    const g = await createSceneGame(user, png, prefix);
    const m = g.master.agent;
    const added = await m
      .post(`/api/games/${g.gameId}/scenes`)
      .send({ mapId: g.mapId })
      .expect(201);
    const sceneId = (added.body as GameScenes).scenes[0].id;
    // Ход игрока — только по открытой сцене.
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const figures = await m
      .get(`/api/games/${g.gameId}/scene/figures`)
      .expect(200);
    const characterId = (figures.body as GameFigures).figures[0].character.id;
    return { ...g, m, sceneId, characterId };
  }

  const fog = (sceneId: string) => loadFog(db(), sceneId);
  const has = (mask: CellMask, cell: Vec3) => maskHas(mask, cell);

  it('туман включает и настраивает только мастер; неверная дальность — 400', async () => {
    const g = await setup('gfog_access');
    const url = fogUrl(g.gameId, g.sceneId);
    const body = { enabled: true, sightRange: 30 };
    await t.anonymous().put(url).send(body).expect(401);
    await g.player.agent.put(url).send(body).expect(403);
    const stranger = await user('gfog_access_stranger');
    await stranger.agent.put(url).send(body).expect(403);
    for (const sightRange of [0, 7, 125, '30']) {
      await g.m.put(url).send({ enabled: true, sightRange }).expect(400);
    }
    await g.m
      .put(fogUrl(g.gameId, '00000000-0000-4000-8000-000000000000'))
      .send(body)
      .expect(404);

    const res = await g.m.put(url).send(body).expect(200);
    expect((res.body as GameScenes).scenes[0]).toMatchObject({
      fog: true,
      sightRange: 30,
    });
    expect(await lastEvent(g.m, g.gameId)).toMatchObject({
      kind: 'scene.fog',
      sceneId: g.sceneId,
      intent: body,
    });
    // Повтор без изменений события не пишет.
    const seq = (await lastEvent(g.m, g.gameId)).seq;
    await g.m.put(url).send(body).expect(200);
    expect((await lastEvent(g.m, g.gameId)).seq).toBe(seq);
  });

  it('включённый туман открывает то, что видит фигурка, а ход — новое', async () => {
    const g = await setup('gfog_move');
    // Выключен — масок нет, ход их не создаёт.
    expect((await fog(g.sceneId)).explored.size).toBe(0);
    await g.m
      .put(fogUrl(g.gameId, g.sceneId))
      .send({ enabled: true, sightRange: 10 })
      .expect(200);
    const start = await fog(g.sceneId);
    // Пол вокруг старта на 2 клетки видно, дальше — нет.
    expect(has(start.visible, [2, 0, 2])).toBe(true);
    expect(has(start.visible, [3, 0, 0])).toBe(false);
    expect(has(start.explored, [2, 0, 2])).toBe(true);

    await g.player.agent
      .post(`/api/games/${g.gameId}/figures/${g.characterId}/move`)
      .send({ to: [0, 1, 5] })
      .expect(200);
    const moved = await fog(g.sceneId);
    expect(has(moved.visible, [2, 0, 7])).toBe(true);
    // Старт ушёл из поля зрения, но остался открытым.
    expect(has(moved.visible, [2, 0, 0])).toBe(false);
    expect(has(moved.explored, [2, 0, 0])).toBe(true);
    expect(has(moved.explored, [5, 0, 0])).toBe(false);
  });

  it('без сознания персонаж не смотрит; выключенный туман масок не трогает', async () => {
    const g = await setup('gfog_down');
    await g.m
      .put(fogUrl(g.gameId, g.sceneId))
      .send({ enabled: true, sightRange: 10 })
      .expect(200);
    await g.m
      .post(`/api/games/${g.gameId}/characters/${g.characterId}/changes`)
      .send({ kind: 'damage', amount: 12 })
      .expect(200);
    const down = await fog(g.sceneId);
    expect(has(down.visible, [0, 0, 0])).toBe(false);
    expect(has(down.explored, [0, 0, 0])).toBe(true);

    await g.m
      .post(`/api/games/${g.gameId}/characters/${g.characterId}/changes`)
      .send({ kind: 'heal', amount: 100 })
      .expect(200);
    expect(has((await fog(g.sceneId)).visible, [0, 0, 0])).toBe(true);

    await g.m
      .put(fogUrl(g.gameId, g.sceneId))
      .send({ enabled: false, sightRange: 10 })
      .expect(200);
    const off = await fog(g.sceneId);
    await g.m
      .put(`/api/games/${g.gameId}/figures/${g.characterId}`)
      .send({ at: [6, 1, 6] })
      .expect(200);
    expect(await fog(g.sceneId)).toEqual(off);
  });

  it('стена мастера закрывает обзор, снос — открывает; перезапуск начинает туман заново', async () => {
    const g = await setup('gfog_edit');
    await g.m
      .put(fogUrl(g.gameId, g.sceneId))
      .send({ enabled: true, sightRange: 40 })
      .expect(200);
    expect(has((await fog(g.sceneId)).visible, [6, 0, 6])).toBe(true);
    const ops = (block: string) => ({
      ops: [{ op: 'fillBox', from: [0, 1, 2], to: [7, 3, 2], block }],
    });
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/ops`)
      .send(ops('stone'))
      .expect(200);
    const walled = await fog(g.sceneId);
    expect(has(walled.visible, [6, 0, 6])).toBe(false);
    expect(has(walled.explored, [6, 0, 6])).toBe(true);
    // Отмена стены — снова видно.
    await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/undo`)
      .expect(200);
    expect(has((await fog(g.sceneId)).visible, [6, 0, 6])).toBe(true);

    // Перед перезапуском обзор сужен: новая копия возьмёт эти настройки.
    await g.m
      .put(fogUrl(g.gameId, g.sceneId))
      .send({ enabled: true, sightRange: 5 })
      .expect(200);
    const restarted = await g.m
      .post(`/api/games/${g.gameId}/scenes/${g.sceneId}/restart`)
      .expect(201);
    const next = (restarted.body as GameScenes).scenes[0];
    expect(next.id).not.toBe(g.sceneId);
    expect(next).toMatchObject({ fog: true, sightRange: 5 });
    // У новой копии — своё открытое, со стартовой точки; у старой строки остались.
    const fresh = await fog(next.id);
    expect(has(fresh.visible, [1, 0, 1])).toBe(true);
    // Дальний угол открыла старая сцена; новая видит со старта на 5 футов и открытого
    // старой не наследует.
    expect(has(fresh.explored, [6, 0, 6])).toBe(false);
    expect(maskSize(fresh.explored)).toBe(maskSize(fresh.visible));
    const old = await db()
      .select()
      .from(gameSceneFog)
      .where(eq(gameSceneFog.sceneId, g.sceneId));
    expect(old.length).toBeGreaterThan(0);
  });
});
