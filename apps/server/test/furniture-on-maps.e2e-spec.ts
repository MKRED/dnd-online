import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bytesToBase64,
  cellTypeId,
  decodeChunk,
  encodeVoxels,
  localIndex,
  modelVoxelCount,
  type GameScenes,
  type GameSceneView,
  type MapChunksResponse,
} from 'shared';
import { pngImage } from './support/character-fixture.js';
import { createItem } from './support/item-fixture.js';
import { createSceneGame } from './support/scene-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Обстановка на карте и сцене (docs/plan/blocks.md, этапы 8в1, 8в2 и 8г2): объект
// «furniture» со ссылкой на свою обстановку, место по модели, строгие пересечения и force
// (Shift), модель целиком в справочнике ответа — и игроку на сцене, хотя записи мастера
// скрыты; заливка обходит клетки обстановки, ход существа — её препятствия; дверь
// переключает положение операцией setPosition, и открытая пропускает.

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

// Ящик в клетку: воксели во всю клетку, своих свойств нет — препятствие.
function crateModel() {
  const voxels = new Uint8Array(modelVoxelCount([1, 1, 1])).fill(1);
  return {
    name: 'Ящик',
    description: '',
    isPublic: false,
    size: [1, 1, 1],
    palette: ['#6b4a2b'],
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: {},
  };
}

async function createFurniture(
  agent: request.Agent,
  isPublic = false,
  model: object = tableModel(),
  name = 'Обеденный стол',
) {
  const modelId = idOf(
    await agent.post('/api/voxel-models').send(model).expect(201),
  );
  return idOf(
    await agent
      .post('/api/furniture')
      .send({
        name,
        description: '',
        isPublic,
        modelId,
        mount: 'floor',
      })
      .expect(201),
  );
}

// Открытая дверь в клетку: тонкая створка у западной грани, клетка помечена «свободно».
function openDoorModel() {
  const size = [1, 1, 1];
  const voxels = new Uint8Array(modelVoxelCount([1, 1, 1]));
  for (let i = 0; i < voxels.length; i++) if (i % 16 < 2) voxels[i] = 1;
  return {
    name: 'Дверь открыта',
    description: '',
    isPublic: false,
    size,
    palette: ['#6b4a2b'],
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: { '0,0,0': 'free' },
  };
}

// Дверь в проёме: закрытая — ящик во всю клетку, открытая — створка у грани.
async function createDoor(agent: request.Agent) {
  const closed = idOf(
    await agent
      .post('/api/voxel-models')
      .send({ ...crateModel(), name: 'Дверь закрыта' })
      .expect(201),
  );
  const open = idOf(
    await agent.post('/api/voxel-models').send(openDoorModel()).expect(201),
  );
  return idOf(
    await agent
      .post('/api/furniture')
      .send({
        name: 'Дверь',
        description: '',
        isPublic: false,
        modelId: closed,
        mount: 'doorway',
        positions: [
          { name: 'Закрыта', modelId: closed },
          { name: 'Открыта', modelId: open },
        ],
      })
      .expect(201),
  );
}

// Наименьший двоичный STL: заголовок, число треугольников и по 50 байт на каждый.
function stl(triangles: number): Buffer {
  const bytes = Buffer.alloc(84 + triangles * 50);
  bytes.writeUInt32LE(triangles, 80);
  return bytes;
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
    ).body as {
      id: string;
      modelSize: number[];
      mount: string;
      model: unknown;
    }[];
    expect(found).toEqual([
      expect.objectContaining({
        id: table,
        modelSize: [2, 1, 1],
        mount: 'floor',
      }),
    ]);
    // Модель целиком — по ней окно «Что поставить» рисует миниатюру.
    expect(found[0].model).toMatchObject({ size: [2, 1, 1] });

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

  it('файл модели на сцене: игроку — у видимой обстановки, мастеру — и у скрытой', async () => {
    const { master, player, mapId, gameId } = await createSceneGame(
      user,
      png,
      'fum9',
    );
    const m = master.agent;
    const withMesh = async (name: string) => {
      const furnitureId = await createFurniture(m, false, crateModel(), name);
      const record = (await m.get(`/api/furniture/${furnitureId}`).expect(200))
        .body as { modelId: string };
      await m
        .put(`/api/voxel-models/${record.modelId}/mesh`)
        .attach('file', stl(2), 'a.stl')
        .expect(200);
      return { furnitureId, modelId: record.modelId };
    };
    const shown = await withMesh('Статуя');
    const hidden = await withMesh('Тайник');
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({
        ops: [
          placeFurniture([3, 1, 3], shown.furnitureId),
          placeFurniture([5, 1, 5], hidden.furnitureId, { hidden: true }),
        ],
      })
      .expect(200);
    await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201);
    const mesh = (agent: request.Agent, modelId: string) =>
      agent.get(`/api/games/${gameId}/scene/models/mesh/${modelId}?v=1`);

    // Закрытая сцена игроку ничего не отдаёт, мастеру — да.
    await mesh(player.agent, shown.modelId).expect(404);
    await mesh(m, hidden.modelId).expect(200);
    await m
      .put(`/api/games/${gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const view = (
      await player.agent.get(`/api/games/${gameId}/scene`).expect(200)
    ).body as GameSceneView;
    expect(view.refs.furniture[shown.furnitureId]).toMatchObject({
      model: { id: shown.modelId, mesh: { format: 'stl', version: 1 } },
    });
    const file = await mesh(player.agent, shown.modelId)
      .responseType('blob')
      .expect(200);
    expect(file.headers['content-type']).toBe('model/stl');
    await mesh(player.agent, hidden.modelId).expect(404);
    const outsider = await t.loginAs('fum9_out');
    await mesh(outsider, shown.modelId).expect(403);
  });

  it('заливка обходит клетки стола, блок в его клетку — 400', async () => {
    const { master, mapId } = await createSceneGame(user, png, 'fub');
    const m = master.agent;
    const ops = (list: unknown[]) =>
      m.post(`/api/maps/${mapId}/ops`).send({ ops: list });
    const table = await createFurniture(m);
    await ops([placeFurniture([3, 1, 5], table)]).expect(200);
    await ops([
      { op: 'fillBox', from: [2, 1, 5], to: [5, 1, 5], block: 'stone' },
    ]).expect(200);
    const slice = (await m.get(`/api/maps/${mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    const stone = slice.palette.indexOf('stone');
    const chunk = decodeChunk(Buffer.from(slice.chunks[0].data, 'base64'));
    const at = (x: number, y: number, z: number) =>
      cellTypeId(chunk[localIndex(x, y, z)]);
    expect([at(2, 1, 5), at(3, 1, 5), at(4, 1, 5), at(5, 1, 5)]).toEqual([
      stone,
      0,
      0,
      stone,
    ]);
    const refused = await ops([
      { op: 'setBlock', at: [4, 1, 5], block: 'stone' },
    ]).expect(400);
    expect(JSON.stringify(refused.body)).toMatch(/стоит обстановка/);
  });

  it('на сцене существо не встаёт в клетку ящика и обходит его', async () => {
    const { master, mapId, gameId } = await createSceneGame(user, png, 'fuw');
    const m = master.agent;
    const crate = await createFurniture(m, false, crateModel(), 'Ящик');
    // Гоблин (объект 2) стоит на [1, 1, 0]; ящик — прямо перед ним.
    await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [placeFurniture([1, 1, 1], crate)] })
      .expect(200);
    await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201);
    const move = (to: number[]) =>
      m.post(`/api/games/${gameId}/scene/creatures/2/move`).send({ to });
    await move([1, 1, 1]).expect(409);
    await move([1, 1, 2]).expect(200);
  });

  it('дверь: положения с моделями в справочнике, setPosition, «заперта» в сводке', async () => {
    const { master, mapId } = await createSceneGame(user, png, 'fud');
    const m = master.agent;
    const ops = (list: unknown[]) =>
      m.post(`/api/maps/${mapId}/ops`).send({ ops: list });
    const door = await createDoor(m);
    const table = await createFurniture(m);
    const placed = await ops([
      placeFurniture([3, 1, 3], door, { locked: true }),
      placeFurniture([1, 1, 5], table),
    ]).expect(200);
    const [doorId, tableId] = (placed.body as { createdObjectIds: number[] })
      .createdObjectIds;
    const map = (await m.get(`/api/maps/${mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    const view = map.refs.furniture[door];
    expect(view).toMatchObject({
      missing: null,
      positions: [
        { name: 'Закрыта', model: { size: [1, 1, 1] } },
        { name: 'Открыта', model: { cells: { '0,0,0': 'free' } } },
      ],
    });

    await ops([{ op: 'setPosition', id: doorId, position: 1 }]).expect(200);
    const after = (await m.get(`/api/maps/${mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(after.objects.find((o) => o.id === doorId)).toMatchObject({
      position: 1,
      locked: true,
    });
    const summary = await m.get(`/api/maps/${mapId}/summary`).expect(200);
    expect(JSON.stringify(summary.body)).toMatch(
      /Дверь \(обстановка 1×1×1, крепление: проём, положение: Открыта, заперта\)/,
    );

    const noPositions = await ops([
      { op: 'setPosition', id: tableId, position: 1 },
    ]).expect(400);
    expect(JSON.stringify(noPositions.body)).toMatch(/нет положений/);
    await ops([{ op: 'setPosition', id: doorId, position: 2 }]).expect(400);
    // Отмена возвращает дверь в прежнее положение.
    await m.post(`/api/maps/${mapId}/undo`).expect(200);
    const undone = (await m.get(`/api/maps/${mapId}/chunks`).expect(200))
      .body as MapChunksResponse;
    expect(undone.objects.find((o) => o.id === doorId)).not.toHaveProperty(
      'position',
    );
  });

  it('на сцене закрытая дверь не пропускает существо, открытая мастером — пропускает', async () => {
    const { master, mapId, gameId } = await createSceneGame(user, png, 'fuo');
    const m = master.agent;
    const door = await createDoor(m);
    // Гоблин (объект 2) стоит на [1, 1, 0]; дверь — прямо перед ним.
    const placed = await m
      .post(`/api/maps/${mapId}/ops`)
      .send({ ops: [placeFurniture([1, 1, 1], door)] })
      .expect(200);
    const [doorId] = (placed.body as { createdObjectIds: number[] })
      .createdObjectIds;
    const scenes = (
      await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201)
    ).body as GameScenes;
    const sceneId = scenes.scenes[0].id;
    const move = (to: number[]) =>
      m.post(`/api/games/${gameId}/scene/creatures/2/move`).send({ to });
    await move([1, 1, 1]).expect(409);
    await m
      .post(`/api/games/${gameId}/scenes/${sceneId}/ops`)
      .send({ ops: [{ op: 'setPosition', id: doorId, position: 1 }] })
      .expect(200);
    await move([1, 1, 1]).expect(200);
  });

  it('контейнер-обстановка: содержимое по вместимости записи, игроку — без содержимого', async () => {
    const { master, player, mapId, gameId } = await createSceneGame(
      user,
      png,
      'fuc',
    );
    const m = master.agent;
    const gold = await createItem(m, { name: 'Золото', weight: 0.5 });
    const modelId = idOf(
      await m.post('/api/voxel-models').send(crateModel()).expect(201),
    );
    const chest = idOf(
      await m
        .post('/api/furniture')
        .send({
          name: 'Сундук',
          description: '',
          isPublic: false,
          modelId,
          mount: 'floor',
          container: { capacity: 2, lockDc: 15, contents: [] },
        })
        .expect(201),
    );
    const found = (
      await m.get('/api/map-catalog?kind=furniture&q=Сундук').expect(200)
    ).body as { container: unknown }[];
    expect(found[0].container).toEqual({
      capacity: 2,
      lockDc: 15,
      contents: [],
    });

    const ops = (list: unknown[]) =>
      m.post(`/api/maps/${mapId}/ops`).send({ ops: list });
    const coins = (quantity: number) => [{ itemId: gold.id, quantity }];
    const placed = await ops([
      placeFurniture([3, 1, 3], chest, { name: 'Казна', items: coins(4) }),
    ]).expect(200);
    const [id] = (placed.body as { createdObjectIds: number[] })
      .createdObjectIds;
    const refused = await ops([
      { op: 'updateObject', id, object: { items: coins(5) } },
    ]).expect(400);
    expect(JSON.stringify(refused.body)).toMatch(/Не влезет в «Казна»/);
    const summary = await m.get(`/api/maps/${mapId}/summary`).expect(200);
    expect(JSON.stringify(summary.body)).toMatch(
      /Казна \(контейнер «Сундук» 1×1×1, предметов: 1, замок Сл 15\)/,
    );

    await m.post(`/api/games/${gameId}/scenes`).send({ mapId }).expect(201);
    await m
      .put(`/api/games/${gameId}/scenes/open`)
      .send({ open: true })
      .expect(200);
    const view = (
      await player.agent.get(`/api/games/${gameId}/scene`).expect(200)
    ).body as GameSceneView;
    const seen = view.objects.find((o) => o.kind === 'furniture');
    expect(seen).toMatchObject({ name: 'Казна', items: [] });
  });
});
