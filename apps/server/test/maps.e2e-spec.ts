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
    ]) {
      await ops(id, list).expect(400);
    }
    await owner.post(`/api/maps/${id}/ops`).send({ ops: 'x' }).expect(400);
    await owner.get(`/api/maps/${id}/slice`).expect(400);
    const summary = await owner.get(`/api/maps/${id}/summary`).expect(200);
    expect(summary.body).toMatchObject({ seq: 0, bounds: null });
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
    await stranger.post(`/api/maps/${id}/undo`).expect(404);
    await stranger.patch(`/api/maps/${id}`).send({ name: 'Моя' }).expect(404);
    await stranger.delete(`/api/maps/${id}`).expect(404);
    await t.anonymous().get('/api/maps').expect(401);
  });
});
