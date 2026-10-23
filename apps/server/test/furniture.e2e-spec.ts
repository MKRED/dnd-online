import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bytesToBase64,
  encodeVoxels,
  modelVoxelCount,
  type Furniture,
  type VoxelModel,
  type VoxelModelUsage,
} from 'shared';
import { describeCatalog } from './support/catalog-scenario/index.js';
import { createItem } from './support/item-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Справочник «Обстановка» (docs/plan/blocks.md, этапы 8б и 8г): роль поверх своей
// модели — модель целиком в ответе, крепление, положения со своими моделями (дверь);
// копия чужой обстановки копирует и модели.

// Модель 1×1×1 с одним вокселем первого цвета.
const modelBody = (palette = ['#8a5a2b']) => {
  const voxels = new Uint8Array(modelVoxelCount([1, 1, 1]));
  voxels[0] = 1;
  return {
    name: 'Стол',
    description: '',
    isPublic: false,
    size: [1, 1, 1],
    palette,
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: { '0,0,0': 'stand' },
  };
};

const furnitureBody = {
  name: 'Обеденный стол',
  description: 'тест',
  isPublic: false,
  mount: 'floor',
};

const idOf = (res: request.Response) => (res.body as { id: string }).id;

const createModel = async (agent: request.Agent, over: object = {}) =>
  idOf(
    await agent
      .post('/api/voxel-models')
      .send({ ...modelBody(), ...over })
      .expect(201),
  );

describeCatalog(
  {
    path: 'furniture',
    body: furnitureBody,
    invalid: { mount: 'roof' },
    prepare: async (author) => ({ modelId: await createModel(author) }),
  },
  (get) => {
    describe('свои поля обстановки', () => {
      it('модель приходит целиком в карточке и списке', async () => {
        const { author, url, create, body } = get();
        const { id } = await create({ mount: 'wall' });
        const card = (await author.get(url(id)).expect(200)).body as Furniture;
        expect(card).toMatchObject({
          mount: 'wall',
          modelId: body().modelId,
          model: {
            id: body().modelId,
            name: 'Стол',
            size: [1, 1, 1],
            cells: { '0,0,0': 'stand' },
            origin: null,
          },
          origin: null,
        });
        const list = (await author.get(`${url()}?scope=mine`).expect(200))
          .body as Furniture[];
        expect(list.find((entry) => entry.id === id)?.model?.name).toBe('Стол');
      });

      it('чужая или несуществующая модель — 400', async () => {
        const { author, stranger, url, body } = get();
        const foreign = await createModel(stranger, { isPublic: true });
        const res = await author
          .post(url())
          .send(body({ modelId: foreign }))
          .expect(400);
        expect(JSON.stringify(res.body)).toMatch(/скопируйте себе/);
        await author
          .post(url())
          .send(body({ modelId: '00000000-0000-4000-8000-000000000000' }))
          .expect(400);
        await author
          .post(url())
          .send(body({ modelId: 'не id' }))
          .expect(400);
      });

      it('дверь: положения со своими моделями, все модели — в models', async () => {
        const { author, url, create, body } = get();
        const openId = await createModel(author, { name: 'Открытая дверь' });
        const positions = [
          { name: 'Закрыта', modelId: body().modelId },
          { name: ' Открыта ', modelId: openId },
        ];
        const { id } = await create({ mount: 'doorway', positions });
        const card = (await author.get(url(id)).expect(200)).body as Furniture;
        expect(card.mount).toBe('doorway');
        expect(card.positions).toEqual([
          positions[0],
          { name: 'Открыта', modelId: openId },
        ]);
        expect(Object.keys(card.models).sort()).toEqual(
          [body().modelId, openId].sort(),
        );
        expect(card.models[openId].name).toBe('Открытая дверь');
        const usage = (
          await author.get(`/api/voxel-models/${openId}/usage`).expect(200)
        ).body as VoxelModelUsage;
        expect(usage.furniture.map((entry) => entry.id)).toEqual([id]);
        // Без поля положений — обычная обстановка.
        const plain = await create();
        const read = (await author.get(url(plain.id)).expect(200))
          .body as Furniture;
        expect(read.positions).toEqual([]);
      });

      it('контейнер: вместимость, Сл замка и содержимое с предметами', async () => {
        const { author, url, create } = get();
        const gold = await createItem(author, { name: 'Золото', weight: 0.02 });
        const container = {
          capacity: 360,
          lockDc: 15,
          contents: [{ itemId: gold.id, quantity: 50 }],
        };
        const { id } = await create({ container });
        const card = (await author.get(url(id)).expect(200)).body as Furniture;
        expect(card.container).toEqual(container);
        expect(card.contentItems[gold.id]).toMatchObject({
          missing: null,
          name: 'Золото',
          weight: 0.02,
        });
        // Обычная обстановка — без контейнера.
        const plain = await create();
        expect(
          ((await author.get(url(plain.id)).expect(200)).body as Furniture)
            .container,
        ).toBeNull();
      });

      it('контейнер: неверные поля, чужой скрытый предмет и перегруз — 400', async () => {
        const { author, stranger, url, body } = get();
        const bad = (container: unknown) =>
          author.post(url()).send(body({ container })).expect(400);
        await bad({ capacity: 0, lockDc: null, contents: [] });
        await bad({ capacity: 30, lockDc: 12, contents: [] });
        await bad({ capacity: 30, lockDc: null, contents: 'нет' });
        const hidden = await createItem(stranger, { name: 'Тайна' });
        const res = await bad({
          capacity: 30,
          lockDc: null,
          contents: [{ itemId: hidden.id, quantity: 1 }],
        });
        expect(JSON.stringify(res.body)).toMatch(/не найден в каталоге/);
        const anvil = await createItem(author, {
          name: 'Наковальня',
          weight: 25,
        });
        const heavy = await bad({
          capacity: 30,
          lockDc: null,
          contents: [{ itemId: anvil.id, quantity: 2 }],
        });
        expect(JSON.stringify(heavy.body)).toMatch(/не влезет: 50 из 30/);
      });

      it('неверные положения и чужая модель положения — 400', async () => {
        const { author, stranger, url, body } = get();
        const own = body().modelId;
        const one = await author
          .post(url())
          .send(body({ positions: [{ name: 'Закрыта', modelId: own }] }))
          .expect(400);
        expect(JSON.stringify(one.body)).toMatch(/от 2 до 8/);
        const twice = [
          { name: 'Закрыта', modelId: own },
          { name: 'Закрыта', modelId: own },
        ];
        await author
          .post(url())
          .send(body({ positions: twice }))
          .expect(400);
        const notFirst = [
          { name: 'Открыта', modelId: await createModel(author) },
          { name: 'Закрыта', modelId: own },
        ];
        const res = await author
          .post(url())
          .send(body({ positions: notFirst }))
          .expect(400);
        expect(JSON.stringify(res.body)).toMatch(/первого положения/);
        const foreign = await createModel(stranger, { isPublic: true });
        const other = await author
          .post(url())
          .send(
            body({
              positions: [
                { name: 'Закрыта', modelId: own },
                { name: 'Открыта', modelId: foreign },
              ],
            }),
          )
          .expect(400);
        expect(JSON.stringify(other.body)).toMatch(/скопируйте себе/);
      });

      it('«где используется» у модели; после её удаления обстановка без вида', async () => {
        const { author, stranger, anonymous, url, create } = get();
        const modelId = await createModel(author, { name: 'Бочка' });
        const { id } = await create({ modelId, name: 'Бочка у стены' });
        const usage = (
          await author.get(`/api/voxel-models/${modelId}/usage`).expect(200)
        ).body as VoxelModelUsage;
        expect(usage.furniture).toEqual([{ id, name: 'Бочка у стены' }]);
        await stranger.get(`/api/voxel-models/${modelId}/usage`).expect(404);
        await anonymous.get(`/api/voxel-models/${modelId}/usage`).expect(401);
        await author.delete(`/api/voxel-models/${modelId}`).expect(204);
        const card = (await author.get(url(id)).expect(200)).body as Furniture;
        expect(card.model).toBeNull();
      });
    });
  },
);

describe('копии обстановки (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let copier: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('fu_author');
    copier = await t.loginAs('fu_copier');
  });

  afterAll(async () => {
    await t.close();
  });

  it('копия забирает и модель; правка модели автором — «обновлена»; обновление — на месте', async () => {
    const modelId = await createModel(author);
    const originalId = idOf(
      await author
        .post('/api/furniture')
        .send({ ...furnitureBody, modelId, isPublic: true })
        .expect(201),
    );
    const copy = (
      await copier.post(`/api/furniture/${originalId}/copy`).expect(201)
    ).body as Furniture;
    expect(copy.modelId).not.toBe(modelId);
    expect(copy).toMatchObject({
      isPublic: false,
      origin: { id: originalId, available: true, updated: false },
      model: { name: 'Стол', origin: { id: modelId } },
    });
    // Копия модели — своя скрытая запись копирующего.
    const copiedModel = (
      await copier.get(`/api/voxel-models/${copy.modelId}`).expect(200)
    ).body as VoxelModel;
    expect(copiedModel).toMatchObject({
      isPublic: false,
      palette: ['#8a5a2b'],
    });

    // Автор перекрасил только модель — запись обстановки не тронута, но копия
    // показывает «обновлена».
    await author
      .put(`/api/voxel-models/${modelId}`)
      .send(modelBody(['#ff0000']))
      .expect(200);
    const seen = (await copier.get(`/api/furniture/${copy.id}`).expect(200))
      .body as Furniture;
    expect(seen.origin).toMatchObject({ updated: true });

    // Обновление: модель копии обновлена на месте, крепление — как у оригинала.
    await author
      .put(`/api/furniture/${originalId}`)
      .send({ ...furnitureBody, modelId, isPublic: true, mount: 'ceiling' })
      .expect(200);
    const pulled = (
      await copier.post(`/api/furniture/${copy.id}/pull`).expect(200)
    ).body as Furniture;
    expect(pulled).toMatchObject({
      modelId: copy.modelId,
      mount: 'ceiling',
      model: { palette: ['#ff0000'] },
      origin: { updated: false },
    });

    // Свою обстановку копировать не нужно; чужую модель в свою обстановку — нельзя.
    await author.post(`/api/furniture/${originalId}/copy`).expect(400);
    await copier
      .post('/api/furniture')
      .send({ ...furnitureBody, modelId })
      .expect(400);
  });

  it('копия двери забирает модели всех положений; обновление — на месте', async () => {
    const closedId = await createModel(author, { name: 'Закрытая' });
    const openId = await createModel(author, { name: 'Открытая' });
    const door = {
      ...furnitureBody,
      name: 'Дверь',
      mount: 'doorway',
      modelId: closedId,
      isPublic: true,
      positions: [
        { name: 'Закрыта', modelId: closedId },
        { name: 'Открыта', modelId: openId },
      ],
    };
    const originalId = idOf(
      await author.post('/api/furniture').send(door).expect(201),
    );
    const copy = (
      await copier.post(`/api/furniture/${originalId}/copy`).expect(201)
    ).body as Furniture;
    const [closedCopy, openCopy] = copy.positions.map((p) => p.modelId);
    expect(closedCopy).toBe(copy.modelId);
    expect([closedCopy, openCopy]).not.toContain(closedId);
    expect(openCopy).not.toBe(openId);
    expect(copy.models[openCopy]).toMatchObject({
      name: 'Открытая',
      origin: { id: openId },
    });

    // Автор перекрасил модель второго положения — копия «обновлена».
    await author
      .put(`/api/voxel-models/${openId}`)
      .send({ ...modelBody(['#00ff00']), name: 'Открытая' })
      .expect(200);
    const seen = (await copier.get(`/api/furniture/${copy.id}`).expect(200))
      .body as Furniture;
    expect(seen.origin).toMatchObject({ updated: true });

    // Обновление: обе модели копии — на месте, вторая перекрашена.
    const pulled = (
      await copier.post(`/api/furniture/${copy.id}/pull`).expect(200)
    ).body as Furniture;
    expect(pulled.positions.map((p) => p.modelId)).toEqual([
      closedCopy,
      openCopy,
    ]);
    expect(pulled.models[openCopy].palette).toEqual(['#00ff00']);
    expect(pulled.origin).toMatchObject({ updated: false });
  });
});
