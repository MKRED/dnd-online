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
import { createTestApp, type TestApp } from './support/test-app.js';

// Справочник «Обстановка» (docs/plan/blocks.md, этап 8б): роль поверх своей модели —
// модель целиком в ответе, крепление; копия чужой обстановки копирует и модель.

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
});
