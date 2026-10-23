import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bytesToBase64,
  encodeVoxels,
  modelVoxelCount,
  type Furniture,
  type ModelMesh,
  type VoxelModel,
} from 'shared';
import { createTestApp, type TestApp } from './support/test-app.js';

// Загруженный файл модели (docs/plan/blocks.md, этап 9): `.glb` или STL у модели
// справочника, что нарисовать — в extra.mesh записи, байты — отдельно; правка записи файл
// не теряет; копия модели и копия обстановки забирают и файл.

// Наименьший двоичный STL: заголовок, число треугольников и по 50 байт на каждый.
function stl(triangles: number): Buffer {
  const bytes = Buffer.alloc(84 + triangles * 50);
  bytes.writeUInt32LE(triangles, 80);
  return bytes;
}

// Заголовок `.glb`: «glTF», версия 2 и длина файла.
function glb(): Buffer {
  const bytes = Buffer.alloc(20);
  bytes.write('glTF', 0, 'ascii');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(20, 8);
  return bytes;
}

const modelBody = (isPublic = false) => {
  const voxels = new Uint8Array(modelVoxelCount([1, 1, 1]));
  voxels[0] = 1;
  return {
    name: 'Статуя',
    description: '',
    isPublic,
    size: [1, 1, 1],
    palette: ['#9a948a'],
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: {},
  };
};

const idOf = (res: request.Response) => (res.body as { id: string }).id;

describe('файл модели (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('mm_author');
    stranger = await t.loginAs('mm_stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  const createModel = async (agent: request.Agent, isPublic = false) =>
    idOf(
      await agent
        .post('/api/voxel-models')
        .send(modelBody(isPublic))
        .expect(201),
    );
  const upload = (
    agent: request.Agent,
    id: string,
    file: Buffer,
    name: string,
  ) => agent.put(`/api/voxel-models/${id}/mesh`).attach('file', file, name);
  const read = async (agent: request.Agent, id: string) =>
    (await agent.get(`/api/voxel-models/${id}`).expect(200)).body as VoxelModel;

  it('загрузка STL: файл в записи, правка записи его не теряет, байты — по версии', async () => {
    const id = await createModel(author);
    const mesh = (await upload(author, id, stl(2), 'statue.stl').expect(200))
      .body as ModelMesh;
    expect(mesh).toEqual({
      format: 'stl',
      version: 1,
      color: '#9a948a',
      fit: { up: 'z', turn: 0 },
    });
    expect((await read(author, id)).mesh).toEqual(mesh);
    // Правка записи (воксели, посчитанные клиентом) оставляет файл.
    await author
      .put(`/api/voxel-models/${id}`)
      .send({ ...modelBody(), name: 'Статуя рыцаря' })
      .expect(200);
    expect((await read(author, id)).mesh).toEqual(mesh);
    const file = await author
      .get(`/api/voxel-models/${id}/mesh/file`)
      .responseType('blob')
      .expect(200);
    expect(file.headers['content-type']).toBe('model/stl');
    expect((file.body as Buffer).length).toBe(84 + 2 * 50);
    // Новый файл — новая версия, вписывание и цвет — по умолчанию для формата.
    const next = (await upload(author, id, glb(), 'statue.glb').expect(200))
      .body as ModelMesh;
    expect(next).toEqual({
      format: 'glb',
      version: 2,
      color: null,
      fit: { up: 'y', turn: 0 },
    });
  });

  it('цвет и вписывание; у .glb цвета нет; неверное — 400', async () => {
    const id = await createModel(author);
    await author
      .patch(`/api/voxel-models/${id}/mesh`)
      .send({ color: '#ff0000' })
      .expect(404);
    await upload(author, id, stl(1), 'a.stl').expect(200);
    const patched = (
      await author
        .patch(`/api/voxel-models/${id}/mesh`)
        .send({ color: '#FF0000', fit: { up: 'y', turn: 3 } })
        .expect(200)
    ).body as ModelMesh;
    expect(patched).toMatchObject({
      color: '#ff0000',
      fit: { up: 'y', turn: 3 },
      version: 1,
    });
    await author
      .patch(`/api/voxel-models/${id}/mesh`)
      .send({ fit: { up: 'x', turn: 0 } })
      .expect(400);
    await upload(author, id, glb(), 'a.glb').expect(200);
    await author
      .patch(`/api/voxel-models/${id}/mesh`)
      .send({ color: '#00ff00' })
      .expect(400);
    const bad = await upload(
      author,
      id,
      Buffer.from('не модель'),
      'a.obj',
    ).expect(400);
    expect(JSON.stringify(bad.body)).toMatch(/\.glb и STL/);
  });

  it('доступ: менять — автор; файл скрытой модели — только ему, опубликованной — всем', async () => {
    const hidden = await createModel(author);
    await upload(author, hidden, stl(1), 'a.stl').expect(200);
    await upload(stranger, hidden, stl(1), 'a.stl').expect(404);
    await stranger.get(`/api/voxel-models/${hidden}/mesh/file`).expect(404);
    await t
      .anonymous()
      .get(`/api/voxel-models/${hidden}/mesh/file`)
      .expect(401);

    const shared = await createModel(author, true);
    await upload(author, shared, stl(1), 'a.stl').expect(200);
    await stranger.get(`/api/voxel-models/${shared}/mesh/file`).expect(200);
    await upload(stranger, shared, stl(1), 'a.stl').expect(403);
    await stranger.delete(`/api/voxel-models/${shared}/mesh`).expect(403);
  });

  it('удаление файла оставляет модель воксельной', async () => {
    const id = await createModel(author);
    await upload(author, id, stl(1), 'a.stl').expect(200);
    await author.delete(`/api/voxel-models/${id}/mesh`).expect(204);
    const model = await read(author, id);
    expect(model).not.toHaveProperty('mesh');
    expect(model.palette).toEqual(['#9a948a']);
    await author.get(`/api/voxel-models/${id}/mesh/file`).expect(404);
    await author.delete(`/api/voxel-models/${id}/mesh`).expect(404);
  });

  it('копия модели забирает файл; «Подтянуть обновления» — новый файл', async () => {
    const original = await createModel(author, true);
    await upload(author, original, stl(1), 'a.stl').expect(200);
    const copy = (
      await stranger.post(`/api/voxel-models/${original}/copy`).expect(201)
    ).body as VoxelModel;
    expect(copy.mesh).toMatchObject({ format: 'stl' });
    const file = (copyId: string) =>
      stranger
        .get(`/api/voxel-models/${copyId}/mesh/file`)
        .responseType('blob')
        .expect(200);
    expect(((await file(copy.id)).body as Buffer).length).toBe(134);

    await upload(author, original, stl(3), 'b.stl').expect(200);
    const seen = await read(stranger, copy.id);
    expect(seen.origin).toMatchObject({ updated: true });
    await stranger.post(`/api/voxel-models/${copy.id}/pull`).expect(200);
    expect(((await file(copy.id)).body as Buffer).length).toBe(84 + 3 * 50);
  });

  it('копия обстановки копирует и файл её модели', async () => {
    const modelId = await createModel(author);
    await upload(author, modelId, stl(2), 'a.stl').expect(200);
    const furnitureId = idOf(
      await author
        .post('/api/furniture')
        .send({
          name: 'Статуя',
          description: '',
          isPublic: true,
          modelId,
          mount: 'floor',
        })
        .expect(201),
    );
    const copy = (
      await stranger.post(`/api/furniture/${furnitureId}/copy`).expect(201)
    ).body as Furniture;
    expect(copy.model?.mesh).toMatchObject({ format: 'stl' });
    const file = await stranger
      .get(`/api/voxel-models/${copy.modelId}/mesh/file`)
      .responseType('blob')
      .expect(200);
    expect((file.body as Buffer).length).toBe(84 + 2 * 50);
  });
});
