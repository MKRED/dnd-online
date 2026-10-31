import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './support/test-app.js';

interface EditResult {
  seq: number;
  changedCells: number;
  paletteAdded: string[];
}

describe('карты (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('owner');
    stranger = await t.loginAs('stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  async function createMap(name = 'Таверна'): Promise<string> {
    const res = await owner.post('/api/maps').send({ name }).expect(201);
    return (res.body as { id: string }).id;
  }

  const ops = (id: string, list: unknown[]) =>
    owner.post(`/api/maps/${id}/ops`).send({ ops: list });

  it('создание, список, переименование и удаление', async () => {
    const id = await createMap();
    const list = await owner.get('/api/maps').expect(200);
    expect((list.body as { id: string }[]).map((m) => m.id)).toContain(id);
    const renamed = await owner
      .patch(`/api/maps/${id}`)
      .send({ name: 'Подвал' })
      .expect(200);
    expect(renamed.body).toMatchObject({ name: 'Подвал', seq: 0 });
    // Пробелы по краям срезаются; пустое и слишком длинное имя — 400, имя не меняется.
    await owner
      .patch(`/api/maps/${id}`)
      .send({ name: '  Подвал таверны  ' })
      .expect(200);
    await owner.patch(`/api/maps/${id}`).send({ name: '   ' }).expect(400);
    await owner
      .patch(`/api/maps/${id}`)
      .send({ name: 'я'.repeat(101) })
      .expect(400);
    const card = await owner.get(`/api/maps/${id}`).expect(200);
    expect(card.body).toMatchObject({ name: 'Подвал таверны' });
    await owner.delete(`/api/maps/${id}`).expect(204);
    await owner.get(`/api/maps/${id}`).expect(404);
  });

  it('операции меняют карту, сводку, срез и чанки', async () => {
    const id = await createMap();
    const res = await ops(id, [
      { op: 'fillBox', from: [0, 0, 0], to: [2, 0, 1], block: 'stone' },
      { op: 'setBlock', at: [1, 1, 1], block: 'wood' },
    ]).expect(200);
    expect(res.body).toMatchObject({
      seq: 1,
      changedCells: 7,
      paletteAdded: expect.arrayContaining(['stone', 'wood']) as unknown,
    });

    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(summary.body).toMatchObject({
      seq: 1,
      bounds: { min: [0, 0, 0], max: [2, 1, 1] },
      blockCounts: { stone: 6, wood: 1 },
    });
    const slice = await owner.get(`/api/maps/${id}/slice?y=0`).expect(200);
    expect((slice.body as { text: string }).text).not.toBe('');
    await owner.get(`/api/maps/${id}/section?axis=x&at=1`).expect(200);
    const chunks = await owner.get(`/api/maps/${id}/chunks`).expect(200);
    expect((chunks.body as { chunks: unknown[] }).chunks).toHaveLength(1);
    expect(chunks.body).toMatchObject({ size: { width: 32, depth: 32 } });
  });

  it('отмена и возврат', async () => {
    const id = await createMap();
    await owner.post(`/api/maps/${id}/undo`).expect(400);
    await ops(id, [{ op: 'setBlock', at: [0, 0, 0], block: 'stone' }]).expect(
      200,
    );
    const undone = await owner.post(`/api/maps/${id}/undo`).expect(200);
    expect((undone.body as EditResult).changedCells).toBe(1);
    let summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(summary.body).toMatchObject({ bounds: null });

    await owner.post(`/api/maps/${id}/redo`).expect(200);
    summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(summary.body).toMatchObject({ blockCounts: { stone: 1 } });
    await owner.post(`/api/maps/${id}/redo`).expect(400);
  });

  it('неверные операции — 400, карта не меняется', async () => {
    const id = await createMap();
    for (const list of [
      [{ op: 'setBlock', at: [0, 0, 0], block: 'cheese' }],
      [{ op: 'explode', at: [0, 0, 0] }],
      [{ op: 'setBlock', at: [0.5, 0, 0], block: 'stone' }],
      // Координаты от нуля и до общих пределов (docs/plan/done/map-editor.md).
      [{ op: 'setBlock', at: [-1, 0, 0], block: 'stone' }],
      [{ op: 'setBlock', at: [0, 64, 0], block: 'stone' }],
      [{ op: 'setBlock', at: [256, 0, 0], block: 'stone' }],
    ]) {
      await ops(id, list).expect(400);
    }
    // За шириной этой карты (32 × 32) — отказ с понятным сообщением.
    const outside = await ops(id, [
      { op: 'setBlock', at: [32, 0, 0], block: 'stone' },
    ]).expect(400);
    expect(JSON.stringify(outside.body)).toContain(
      'Клетка [32, 0, 0] за границей карты 32 × 32',
    );
    for (const grow of [{ west: -32 }, { east: 300 }, { up: 1 }]) {
      await ops(id, [{ op: 'resize', grow }]).expect(400);
    }
    await owner.post(`/api/maps/${id}/ops`).send({ ops: 'x' }).expect(400);
    await owner.get(`/api/maps/${id}/slice`).expect(400);
    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(summary.body).toMatchObject({ seq: 0, bounds: null });
  });

  it('размер при создании: по умолчанию 32 × 32, свой — в пределах', async () => {
    const plain = await owner.post('/api/maps').send({ name: 'Поле' });
    expect(plain.body).toMatchObject({ width: 32, depth: 32 });
    const sized = await owner
      .post('/api/maps')
      .send({ name: 'Двор', width: 10, depth: 256 })
      .expect(201);
    expect(sized.body).toMatchObject({ width: 10, depth: 256 });
    const id = (sized.body as { id: string }).id;
    const card = await owner.get(`/api/maps/${id}`).expect(200);
    expect(card.body).toMatchObject({ width: 10, depth: 256 });
    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(summary.body).toMatchObject({
      size: { width: 10, depth: 256 },
      maxHeight: 64,
    });

    for (const size of [
      { width: 0 },
      { depth: 1.5 },
      { width: 257 },
      { depth: '10' },
    ]) {
      await owner
        .post('/api/maps')
        .send({ name: 'Плохая', ...size })
        .expect(400);
    }
  });

  it('resize сдвигает блоки и меняет размер; отмена и возврат — вместе с размером', async () => {
    const res = await owner
      .post('/api/maps')
      .send({ name: 'Подвал', width: 8, depth: 8 })
      .expect(201);
    const id = (res.body as { id: string }).id;
    await ops(id, [
      { op: 'fillBox', from: [0, 0, 0], to: [7, 0, 7], block: 'grass' },
    ]).expect(200);

    // Подвал: три уровня снизу, две клетки на западе, восток срезан с удалением.
    const resized = await ops(id, [
      { op: 'resize', grow: { down: 3, west: 2, east: -1 }, cut: 'delete' },
    ]).expect(200);
    expect(resized.body).toMatchObject({
      changes: {
        size: { before: { width: 8, depth: 8 }, after: { width: 9, depth: 8 } },
      },
    });
    const sizeAndBounds = async () => {
      const card = await owner.get(`/api/maps/${id}`).expect(200);
      const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
      const { width, depth } = card.body as { width: number; depth: number };
      const { bounds, blockCounts } = summary.body as {
        bounds: unknown;
        blockCounts: unknown;
      };
      return { width, depth, bounds, blockCounts };
    };
    expect(await sizeAndBounds()).toEqual({
      width: 9,
      depth: 8,
      bounds: { min: [2, 3, 0], max: [8, 3, 7] },
      blockCounts: { grass: 56 },
    });
    // Новое место на западе уже доступно для правки.
    await ops(id, [{ op: 'setBlock', at: [0, 0, 0], block: 'stone' }]).expect(
      200,
    );
    await owner.post(`/api/maps/${id}/undo`).expect(200);

    await owner.post(`/api/maps/${id}/undo`).expect(200);
    expect(await sizeAndBounds()).toEqual({
      width: 8,
      depth: 8,
      bounds: { min: [0, 0, 0], max: [7, 0, 7] },
      blockCounts: { grass: 64 },
    });
    await owner.post(`/api/maps/${id}/redo`).expect(200);
    expect(await sizeAndBounds()).toMatchObject({ width: 9, depth: 8 });
    const chunks = await owner.get(`/api/maps/${id}/chunks`).expect(200);
    expect(chunks.body).toMatchObject({ size: { width: 9, depth: 8 } });
  });

  it('срез и разрез без области берут размер карты', async () => {
    const res = await owner
      .post('/api/maps')
      .send({ name: 'Двор', width: 3, depth: 2 })
      .expect(201);
    const id = (res.body as { id: string }).id;
    const empty = await owner.get(`/api/maps/${id}/slice?y=0`).expect(200);
    expect((empty.body as { text: string }).text).toContain('x=0..2');
    await ops(id, [{ op: 'setBlock', at: [1, 2, 1], block: 'stone' }]).expect(
      200,
    );
    const section = await owner
      .get(`/api/maps/${id}/section?axis=z&at=1`)
      .expect(200);
    expect((section.body as { text: string }).text).toContain('x=0..2');
    expect((section.body as { text: string }).text).toContain('y=2..0');
  });

  it('чужая карта неотличима от несуществующей', async () => {
    const id = await createMap();
    const list = await stranger.get('/api/maps').expect(200);
    expect((list.body as { id: string }[]).map((m) => m.id)).not.toContain(id);
    await stranger.get(`/api/maps/${id}`).expect(404);
    await stranger.get(`/api/maps/${id}/chunks`).expect(404);
    await stranger.get(`/api/maps/${id}/summary`).expect(404);
    await stranger
      .post(`/api/maps/${id}/ops`)
      .send({ ops: [{ op: 'setBlock', at: [0, 0, 0], block: 'stone' }] })
      .expect(404);
    await stranger
      .post(`/api/maps/${id}/ops`)
      .send({ ops: [{ op: 'resize', grow: { east: 1 } }] })
      .expect(404);
    await stranger.post(`/api/maps/${id}/undo`).expect(404);
    await stranger.patch(`/api/maps/${id}`).send({ name: 'Моя' }).expect(404);
    await stranger.delete(`/api/maps/${id}`).expect(404);
    await t.anonymous().get('/api/maps').expect(401);
    await t
      .anonymous()
      .patch(`/api/maps/${id}`)
      .send({ name: 'Моя' })
      .expect(401);
    await t
      .anonymous()
      .post(`/api/maps/${id}/ops`)
      .send({ ops: [{ op: 'resize', grow: { east: 1 } }] })
      .expect(401);
    const card = await owner.get(`/api/maps/${id}`).expect(200);
    expect(card.body).toMatchObject({ width: 32, depth: 32 });
  });
});
