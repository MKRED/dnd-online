import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  GameLibraryItem,
  GameSceneView,
  MapChunksResponse,
  MonsterRefModel,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { monsterBody } from './support/monster-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import { createModel, stl, uploadMesh } from './support/voxel-model-fixture.js';

// 3D-модель монстра на карте и сцене (docs/plan/done/monster-models.md, этап 2): карта мастера
// берёт модель из справочника, сцена — снимок модели в библиотеке игры с байтами файла.

describe('3D-модель монстра на сцене (e2e)', () => {
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

  const linkModel = (
    agent: request.Agent,
    monsterId: string,
    model: { id: string; scale: number } | null,
  ) =>
    agent
      .put(`/api/monsters/${monsterId}`)
      .send({ ...monsterBody(), name: 'Гоблин', role: 'regular', model })
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

  const sceneModel = async (
    agent: request.Agent,
    gameId: string,
    id: string,
  ) => {
    const scene = (await agent.get(`/api/games/${gameId}/scene`).expect(200))
      .body as GameSceneView;
    const ref = scene.refs.monsters[id];
    if (ref.missing !== null) throw new Error('Монстра нет на сцене');
    return ref.model;
  };

  const bytes = (agent: request.Agent, url: string) =>
    agent.get(url).responseType('blob');

  it('карта и сцена отдают модель монстра; байты сцены — снимок, тем, кто видит монстра', async () => {
    const g = await createSceneGame(user, png, 'gmm_scene');
    const m = g.master.agent;
    const modelId = await createModel(m);
    await uploadMesh(m, modelId, stl(2), 'goblin.stl').expect(200);
    await linkModel(m, g.goblin, { id: modelId, scale: 1.5 });

    const chunks = (await m.get(`/api/maps/${g.mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(chunks.refs.monsters[g.goblin]).toMatchObject({
      missing: null,
      model: {
        id: modelId,
        scale: 1.5,
        size: [1, 1, 1],
        mesh: { format: 'stl', version: 1 },
      },
    });

    await openScene(m, g.gameId, g.mapId);
    expect(await sceneModel(g.player.agent, g.gameId, g.goblin)).toMatchObject({
      id: modelId,
      scale: 1.5,
      mesh: { format: 'stl', version: 1 },
    });

    const url = `/api/games/${g.gameId}/scene/models/monster/${g.goblin}?v=1`;
    const file = await bytes(g.player.agent, url).expect(200);
    expect(file.headers['content-type']).toContain('model/stl');
    expect(file.headers['cache-control']).toContain('immutable');
    expect((file.body as Buffer).length).toBe(84 + 2 * 50);

    // Справочник не трогает игру: модель удалили — на карте её нет, у копии осталась.
    await m.delete(`/api/voxel-models/${modelId}`).expect(204);
    const after = (await m.get(`/api/maps/${g.mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(after.refs.monsters[g.goblin]).toMatchObject({ model: null });
    expect(await sceneModel(m, g.gameId, g.goblin)).toMatchObject({
      id: modelId,
    });
    await bytes(g.player.agent, url).expect(200);

    const stranger = await user('gmm_scene_stranger');
    await stranger.agent.get(url).expect(403);
    await t.anonymous().get(url).expect(401);
    // У НПС модели монстра нет — не найдено и мастеру.
    await m
      .get(`/api/games/${g.gameId}/scene/models/monster/${g.npc}`)
      .expect(404);

    // Закрыли сцену — игроку файла нет, и отказ не кешируется.
    await m
      .put(`/api/games/${g.gameId}/scenes/open`)
      .send({ open: false })
      .expect(200);
    const refused = await g.player.agent.get(url).expect(404);
    expect(refused.headers['cache-control'] ?? '').not.toContain('immutable');
    await bytes(m, url).expect(200);
  });

  it('правка модели — копия «изменена»; обновление берёт новый файл и версию', async () => {
    const g = await createSceneGame(user, png, 'gmm_refresh');
    const m = g.master.agent;
    const modelId = await createModel(m);
    await uploadMesh(m, modelId, stl(1), 'a.stl').expect(200);
    await linkModel(m, g.goblin, { id: modelId, scale: 1 });
    await openScene(m, g.gameId, g.mapId);
    const library = `/api/games/${g.gameId}/library`;
    const monsterRow = async () =>
      ((await m.get(library).expect(200)).body as GameLibraryItem[]).find(
        (item) => item.kind === 'monster',
      );
    expect((await monsterRow())?.source).toBe('same');

    // Монстра не трогали, а модель — да: копия уже не та.
    await new Promise((resolve) => setTimeout(resolve, 10));
    await uploadMesh(m, modelId, stl(3), 'b.stl').expect(200);
    expect((await monsterRow())?.source).toBe('changed');
    await m.post(`${library}/monster/${g.goblin}/refresh`).expect(201);
    expect((await monsterRow())?.source).toBe('same');

    const model = (await sceneModel(m, g.gameId, g.goblin)) as MonsterRefModel;
    // Версия файла в копии — версия копии, общая с картинкой: выросла с обновлением.
    expect(model.mesh?.version).toBe(2);
    const file = await bytes(
      m,
      `/api/games/${g.gameId}/scene/models/monster/${g.goblin}?v=2`,
    ).expect(200);
    expect((file.body as Buffer).length).toBe(84 + 3 * 50);
  });

  it('рисованная модель — вид в снимке, файла нет', async () => {
    const g = await createSceneGame(user, png, 'gmm_drawn');
    const m = g.master.agent;
    const modelId = await createModel(m);
    await linkModel(m, g.goblin, { id: modelId, scale: 2 });
    await openScene(m, g.gameId, g.mapId);
    const model = (await sceneModel(m, g.gameId, g.goblin)) as MonsterRefModel;
    expect(model).toMatchObject({ id: modelId, scale: 2, size: [1, 1, 1] });
    expect(model.mesh).toBeUndefined();
    expect(typeof model.voxels).toBe('string');
    await m
      .get(`/api/games/${g.gameId}/scene/models/monster/${g.goblin}?v=1`)
      .expect(404);
  });
});
