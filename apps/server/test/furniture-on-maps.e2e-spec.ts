import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bytesToBase64,
  encodeVoxels,
  modelVoxelCount,
  type GameScenes,
  type GameSceneView,
  type MapChunksResponse,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Обстановка на карте и сцене (docs/plan/blocks.md, этап 8в1): объект «furniture» со
// ссылкой на свою обстановку, место по модели, строгие пересечения и force (Shift), модель
// целиком в справочнике ответа — и игроку на сцене, хотя записи мастера скрыты.

const idOf = (res: request.Response) => (res.body as { id: string }).id;

// Модель 2×1×1: стол на две клетки, на верх можно встать.
function tableModel() {
  const voxels = new Uint8Array(modelVoxelCount([2, 1, 1]));
  voxels.fill(1, 0, 32);
  return {
    name: 'Стол',
    description: '',
    isPublic: false,
    size: [2, 1, 1],
    palette: ['#8a5a2b'],
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: { '0,0,0': 'stand', '1,0,0': 'stand' },
  };
}

async function createFurniture(agent: request.Agent, isPublic = false) {
  const modelId = idOf(
    await agent.post('/api/voxel-models').send(tableModel()).expect(201),
  );
  return idOf(
    await agent
      .post('/api/furniture')
      .send({
        name: 'Обеденный стол',
        description: '',
        isPublic,
        modelId,
        mount: 'floor',
      })
      .expect(201),
  );
}

const placeFurniture = (
  at: number[],
  furnitureId: string,
  extra: Record<string, unknown> = {},
) => ({
  op: 'placeObject',
  at,
  object: { kind: 'furniture', furnitureId, ...extra },
});

describe('обстановка на карте (e2e)', () => {
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

  it('на карте: своя ставится, чужая, пересечения и 45° — 400, с force — ставится', async () => {
    const { master, player, mapId } = await createSceneGame(user, png, 'fum');
    const m = master.agent;
    const ops = (list: unknown[]) =>
      m.post(`/api/maps/${mapId}/ops`).send({ ops: list });
    const table = await createFurniture(m);

    const placed = await ops([
      placeFurniture([3, 1, 3], table, { facing: 90 }),
    ]).expect(200);
    const [tableId] = (placed.body as { createdObjectIds: number[] })
      .createdObjectIds;
    const map = (await m.get(`/api/maps/${mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(map.objects.find((o) => o.kind === 'furniture')).toMatchObject({
      at: [3, 1, 3],
      facing: 90,
    });
    expect(map.refs.furniture[table]).toMatchObject({
      missing: null,
      name: 'Обеденный стол',
      mount: 'floor',
      model: { size: [2, 1, 1], cells: { '0,0,0': 'stand' } },
    });

    // Поиск для постановки — только своя обстановка, с размером модели и креплением.
    const found = (
      await m.get('/api/map-catalog?kind=furniture&q=стол').expect(200)
    ).body as { id: string; modelSize: number[]; mount: string }[];
    expect(found).toEqual([
      expect.objectContaining({
        id: table,
        modelSize: [2, 1, 1],
        mount: 'floor',
      }),
    ]);

    const foreign = await createFurniture(player.agent, true);
    expect(
      (await m.get('/api/map-catalog?kind=furniture').expect(200)).body,
    ).toHaveLength(1);
    const refused = await ops([placeFurniture([5, 1, 5], foreign)]).expect(400);
    expect(JSON.stringify(refused.body)).toMatch(/скопируйте себе/);
    // На [0, 1, 0] уже стоит старт, на [3, 1, 4] — повёрнутый стол.
    expect(
      JSON.stringify(
        (await ops([placeFurniture([0, 1, 0], table)]).expect(400)).body,
      ),
    ).toMatch(/мешает объект/);
    await ops([placeFurniture([5, 1, 5], table, { facing: 45 })]).expect(400);
    // Под самым верхом нет опоры.
    expect(
      JSON.stringify(
        (await ops([placeFurniture([5, 3, 5], table)]).expect(400)).body,
      ),
    ).toMatch(/нужна опора/);
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [{ ...placeFurniture([5, 3, 5], table), force: true }] })
      .expect(200);
    await ops([{ op: 'turnObject', id: tableId, facing: 45 }]).expect(400);
  });

  it('на сцене: игрок получает обстановку с моделью, хотя записи мастера скрыты', async () => {
    const { master, player, mapId, gameId } = await createSceneGame(
      user,
      png,
      'fus',
    );
    const m = master.agent;
    const table = await createFurniture(m);
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [placeFurniture([3, 1, 3], table)] })
      .expect(200);
    const sceneId = (
      (await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201))
        .body as GameScenes
    ).scenes[0].id;
    await m
      .put(`/api/games/${gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const view = (
      await player.agent.get(`/api/games/${gameId}/scene`).expect(200)
    ).body as GameSceneView;
    expect(view.objects.some((o) => o.kind === 'furniture')).toBe(true);
    expect(view.refs.furniture[table]).toMatchObject({
      missing: null,
      model: { size: [2, 1, 1] },
    });

    // Мастер ставит обстановку и на сцене — по тем же правилам.
    await m
      .post(`/api/games/${gameId}/scenes/${sceneId}/ops`)
      .send({ ops: [placeFurniture([5, 1, 5], table, { facing: 180 })] })
      .expect(200);
    await m
      .post(`/api/games/${gameId}/scenes/${sceneId}/ops`)
      .send({ ops: [placeFurniture([5, 1, 5], table)] })
      .expect(400);
  });
});
