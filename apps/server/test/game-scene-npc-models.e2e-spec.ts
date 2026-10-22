import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameLibraryItem, GameSceneView, MapChunksResponse } from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// 3D-модель НПС на карте и сцене (docs/plan/character-models.md, этап 4): карта мастера
// берёт модель из персонажа, сцена — из копии в библиотеке игры.

// Наименьший двоичный STL: заголовок, число треугольников и по 50 байт на каждый.
function stl(triangles: number): Buffer {
  const bytes = Buffer.alloc(84 + triangles * 50);
  bytes.writeUInt32LE(triangles, 80);
  return bytes;
}

describe('3D-модель НПС на сцене (e2e)', () => {
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

  const uploadModel = (agent: request.Agent, npc: string, triangles: number) =>
    agent
      .put(`/api/characters/${npc}/model`)
      .attach('file', stl(triangles), 'npc.stl')
      .expect(200);

  async function openScene(
    agent: request.Agent,
    gameId: string,
    mapId: string,
  ) {
    await agent.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201);
    await agent
      .put(`/api/games/${gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
  }

  const bytes = (agent: request.Agent, url: string) =>
    agent.get(url).responseType('blob');

  it('карта и сцена отдают модель НПС; байты сцены — копия, тем, кто видит НПС', async () => {
    const g = await createSceneGame(user, png, 'gnm_scene');
    const m = g.master.agent;
    await uploadModel(m, g.npc, 2);
    await m
      .patch(`/api/characters/${g.npc}/model`)
      .send({ color: '#aa3311' })
      .expect(200);

    const chunks = (await m.get(`/api/maps/${g.mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(chunks.refs.npcs[g.npc]).toMatchObject({
      missing: null,
      model: {
        format: 'stl',
        version: 1,
        color: '#aa3311',
        fit: { scale: 1, turn: 0, up: 'z' },
      },
    });

    await openScene(m, g.gameId, g.mapId);
    const scene = (await g.player.agent.get(`/api/games/${g.gameId}/scene`))
      .body as GameSceneView;
    expect(scene.refs.npcs[g.npc]).toMatchObject({
      missing: null,
      model: { format: 'stl', version: 1, color: '#aa3311' },
    });

    const url = `/api/games/${g.gameId}/scene/models/npc/${g.npc}?v=1`;
    const file = await bytes(g.player.agent, url).expect(200);
    expect(file.headers['content-type']).toContain('model/stl');
    expect(file.headers['cache-control']).toContain('immutable');
    expect((file.body as Buffer).length).toBe(84 + 2 * 50);

    // Справочник не трогает игру: модель удалили у НПС — у копии она осталась.
    await m.delete(`/api/characters/${g.npc}/model`).expect(204);
    await bytes(g.player.agent, url).expect(200);

    const stranger = await user('gnm_scene_stranger');
    await stranger.agent.get(url).expect(403);
    await t.anonymous().get(url).expect(401);
    await m.get(`/api/games/${g.gameId}/scene/models/npc/nope`).expect(400);
    // Модели нет у монстра и у предмета — не найдено и мастеру.
    await m
      .get(`/api/games/${g.gameId}/scene/models/npc/${g.goblin}`)
      .expect(404);

    // Закрыли сцену — игроку модели нет, и отказ не кешируется.
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    const refused = await g.player.agent.get(url).expect(404);
    expect(refused.headers['cache-control'] ?? '').not.toContain('immutable');
    await bytes(m, url).expect(200);
  });

  it('новая модель у НПС — копия «изменена»; обновление берёт новые байты и версию', async () => {
    const g = await createSceneGame(user, png, 'gnm_refresh');
    const m = g.master.agent;
    await openScene(m, g.gameId, g.mapId);
    const library = `/api/games/${g.gameId}/library`;
    const npcRow = async () =>
      ((await m.get(library).expect(200)).body as GameLibraryItem[]).find(
        (item) => item.kind === 'npc',
      );
    expect((await npcRow())?.source).toBe('same');
    let scene = (await m.get(`/api/games/${g.gameId}/scene`).expect(200))
      .body as GameSceneView;
    expect(scene.refs.npcs[g.npc]).toMatchObject({ model: null });

    // Время правки модели — своё: лист не трогали, а копия уже не та.
    await uploadModel(m, g.npc, 3);
    expect((await npcRow())?.source).toBe('changed');
    await m.post(`${library}/npc/${g.npc}/refresh`).expect(201);
    expect((await npcRow())?.source).toBe('same');

    scene = (await m.get(`/api/games/${g.gameId}/scene`).expect(200))
      .body as GameSceneView;
    const ref = scene.refs.npcs[g.npc];
    if (ref.missing !== null || !ref.model) throw new Error('Нет модели');
    // Версия копии — своя, общая с картинкой: выросла с обновлением.
    expect(ref.model.version).toBe(2);
    const file = await bytes(
      m,
      `/api/games/${g.gameId}/scene/models/npc/${g.npc}?v=2`,
    ).expect(200);
    expect((file.body as Buffer).length).toBe(84 + 3 * 50);
  });
});
