import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bytesToBase64,
  encodeVoxels,
  modelVoxelCount,
  modelVoxelSize,
  voxelIndex,
  type Vec3,
  type VoxelModel,
} from 'shared';
import { describeCatalog } from './support/catalog-scenario/index.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// Справочник «Модели» (docs/plan/blocks.md, этап 8а): модель из вокселей — запись
// каталога с размером в клетках, палитрой, сжатыми вокселями и свойствами клеток.

// Воксели модели размера size: в заданных точках — цвет value, остальное пусто.
function voxels(size: Vec3, points: [Vec3, number][] = []) {
  const bytes = new Uint8Array(modelVoxelCount(size));
  const voxelSize = modelVoxelSize(size);
  for (const [[x, y, z], value] of points)
    bytes[voxelIndex(voxelSize, x, y, z)] = value;
  return bytesToBase64(encodeVoxels(bytes));
}

const modelBody = {
  name: 'Бочка',
  description: 'тест',
  isPublic: false,
  size: [1, 2, 1],
  palette: ['#8a5a2b', '#333333'],
  voxels: voxels([1, 2, 1], [[[8, 3, 8], 2]]),
  cells: { '0,0,0': 'stand' },
};

const idOf = (res: request.Response) => (res.body as { id: string }).id;
const card = (res: request.Response) => res.body as VoxelModel;

describeCatalog(
  { path: 'voxel-models', body: modelBody, invalid: { size: [0, 1, 1] } },
  (get) => {
    describe('свои поля модели', () => {
      it('сохраняются и возвращаются в карточке и списке', async () => {
        const { author, url, create } = get();
        const { id } = await create();
        const found = card(await author.get(url(id)).expect(200));
        expect(found).toMatchObject({
          size: [1, 2, 1],
          palette: ['#8a5a2b', '#333333'],
          voxels: modelBody.voxels,
          cells: { '0,0,0': 'stand' },
          origin: null,
        });
        const list = (await author.get(`${url()}?scope=mine`).expect(200))
          .body as VoxelModel[];
        expect(list.find((entry) => entry.id === id)?.voxels).toBe(
          modelBody.voxels,
        );
      });

      it('большая модель 8×8×8 проходит одним телом', async () => {
        const { create } = get();
        const size: Vec3 = [8, 8, 8];
        // Четыре слоя шахматки: серии по вокселю, тело — больше 100 КБ по умолчанию.
        const floor: [Vec3, number][] = [];
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 128; x++)
            for (let z = 0; z < 128; z++)
              floor.push([[x, y, z], 1 + ((x + z) % 2)]);
        const body = voxels(size, floor);
        expect(body.length).toBeGreaterThan(100_000);
        await create({ size, voxels: body, cells: {} });
      });

      it('отказывает испорченной модели: длина, цвет, клетки, палитра', async () => {
        const { author, url, body } = get();
        const bad = async (over: Record<string, unknown>, message: RegExp) => {
          const res = await author.post(url()).send(body(over)).expect(400);
          expect(JSON.stringify(res.body)).toMatch(message);
        };
        await bad({ size: [2, 2, 1] }, /не совпадают с размером/);
        await bad({ palette: ['#8a5a2b'] }, /нет в палитре/);
        await bad({ cells: { '0,2,0': 'free' } }, /за пределами/);
        await bad({ cells: { '0,0,0': 'wall' } }, /Свойства клеток/);
        await bad({ palette: ['red', '#333333'] }, /Палитра/);
        await bad({ voxels: 'не base64' }, /испорчены/);
        await bad({ size: [1, 9, 1] }, /Размер модели/);
        const withoutCells: Record<string, unknown> = { ...modelBody };
        delete withoutCells.cells;
        await author.post(url()).send(withoutCells).expect(400);
      });
    });
  },
);

describe('копии моделей (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let copier: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('vm_author');
    copier = await t.loginAs('vm_copier');
  });

  afterAll(async () => {
    await t.close();
  });

  it('копия опубликованной, правка оригинала, «Подтянуть обновления»', async () => {
    const originalId = idOf(
      await author
        .post('/api/voxel-models')
        .send({ ...modelBody, isPublic: true })
        .expect(201),
    );
    const copy = card(
      await copier.post(`/api/voxel-models/${originalId}/copy`).expect(201),
    );
    expect(copy).toMatchObject({
      isPublic: false,
      voxels: modelBody.voxels,
      origin: { id: originalId, available: true, updated: false },
    });
    await author.post(`/api/voxel-models/${originalId}/copy`).expect(400);

    // Автор перекрасил и поменял свойства клетки — у копии «обновлён».
    const repainted = { palette: ['#8a5a2b', '#ff0000'], cells: {} };
    await author
      .put(`/api/voxel-models/${originalId}`)
      .send({ ...modelBody, isPublic: true, ...repainted })
      .expect(200);
    const seen = card(
      await copier.get(`/api/voxel-models/${copy.id}`).expect(200),
    );
    expect(seen.origin).toMatchObject({ updated: true });

    // Правка копии в форме не теряет ссылку; обновление возвращает вид оригинала.
    await copier
      .put(`/api/voxel-models/${copy.id}`)
      .send({ ...modelBody, name: 'Моя бочка' })
      .expect(200);
    const pulled = card(
      await copier.post(`/api/voxel-models/${copy.id}/pull`).expect(200),
    );
    expect(pulled).toMatchObject({
      name: 'Моя бочка',
      ...repainted,
      origin: { id: originalId, updated: false },
    });

    // Не копия — 400, чужая копия — 403 (она скрыта — 404), оригинал скрыт — 409.
    await author.post(`/api/voxel-models/${originalId}/pull`).expect(400);
    await author.post(`/api/voxel-models/${copy.id}/pull`).expect(404);
    await author
      .put(`/api/voxel-models/${originalId}`)
      .send({ ...modelBody, isPublic: false })
      .expect(200);
    await copier.post(`/api/voxel-models/${copy.id}/pull`).expect(409);
    await copier.post(`/api/voxel-models/${originalId}/copy`).expect(404);
  });
});
