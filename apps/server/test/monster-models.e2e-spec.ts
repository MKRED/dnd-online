import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Monster, VoxelModelUsage } from 'shared';
import { monsterBody } from './support/monster-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import { createModel, stl, uploadMesh } from './support/voxel-model-fixture.js';

// 3D-модель монстра (docs/plan/done/monster-models.md): ссылка на свою модель справочника
// «Модели» с поправкой размера; вид модели и байты файла видит всякий, кто видит монстра.

const idOf = (res: request.Response) => (res.body as { id: string }).id;
const messages = (res: request.Response) =>
  (res.body as { message: string[] | string }).message;

describe('модель монстра (e2e)', () => {
  let t: TestApp;
  let author: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    author = await t.loginAs('mon_model_author');
    stranger = await t.loginAs('mon_model_stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  const createMonster = async (
    agent: request.Agent,
    extra: Record<string, unknown> = {},
    isPublic = false,
  ) =>
    idOf(
      await agent
        .post('/api/monsters')
        .send({ ...monsterBody(isPublic), ...extra })
        .expect(201),
    );
  const card = async (agent: request.Agent, id: string) =>
    (await agent.get(`/api/monsters/${id}`).expect(200)).body as Monster;
  const fileUrl = (monsterId: string, modelId: string) =>
    `/api/monsters/${monsterId}/models/${modelId}/file`;

  it('ссылка сохраняется, в карточке — вид модели; без поля правка её не трогает, null убирает', async () => {
    const modelId = await createModel(author);
    await uploadMesh(author, modelId, stl(2), 'ogre.stl').expect(200);
    const model = { id: modelId, scale: 1.5 };
    const id = await createMonster(author, { model });
    const read = await card(author, id);
    expect(read.model).toEqual(model);
    expect(read.modelView).toMatchObject({
      id: modelId,
      name: 'Статуя',
      available: true,
      size: [1, 1, 1],
      mesh: { format: 'stl', version: 1 },
    });
    // В списке вида модели нет: он нужен только карточке.
    const list = (
      await author.get('/api/monsters').query({ scope: 'mine' }).expect(200)
    ).body as Monster[];
    const listed = list.find((m) => m.id === id);
    expect(listed?.model).toEqual(model);
    expect(listed).not.toHaveProperty('modelView');

    // MCP и старые клиенты поля не шлют — ссылка остаётся.
    await author
      .put(`/api/monsters/${id}`)
      .send({ ...monsterBody(), name: 'Огр' })
      .expect(200);
    expect((await card(author, id)).model).toEqual(model);

    await author
      .put(`/api/monsters/${id}`)
      .send({ ...monsterBody(), model: null })
      .expect(200);
    const cleared = await card(author, id);
    expect(cleared.model).toBeNull();
    expect(cleared.modelView).toBeNull();
  });

  it('только своя модель; неверная ссылка — 400', async () => {
    const foreign = await createModel(stranger, true);
    const res = await author
      .post('/api/monsters')
      .send({ ...monsterBody(), model: { id: foreign, scale: 1 } })
      .expect(400);
    expect(messages(res)).toContain('Модель не найдена среди ваших');
    // Отказ при правке откатывает её целиком.
    const id = await createMonster(author);
    await author
      .put(`/api/monsters/${id}`)
      .send({
        ...monsterBody(),
        name: 'Другой',
        model: { id: foreign, scale: 1 },
      })
      .expect(400);
    expect((await card(author, id)).name).toBe('Аболет');

    const own = await createModel(author);
    for (const model of [
      { id: own, scale: 5 },
      { id: own, scale: 0.1 },
      { id: 'не-id', scale: 1 },
      { id: own },
    ]) {
      const wrong = await author
        .post('/api/monsters')
        .send({ ...monsterBody(), model })
        .expect(400);
      expect(messages(wrong)).toContain(
        'Модель монстра задана неверно: нужен id своей модели и размер от ×0,25 до ×4',
      );
    }
  });

  it('скрытую модель опубликованного монстра видит и получает файлом любой, кто видит монстра', async () => {
    const modelId = await createModel(author);
    await uploadMesh(author, modelId, stl(3), 'ogre.stl').expect(200);
    const id = await createMonster(
      author,
      { model: { id: modelId, scale: 1 } },
      true,
    );
    // Саму модель посторонний не видит…
    await stranger.get(`/api/voxel-models/${modelId}/mesh/file`).expect(404);
    // …а у монстра — видит.
    expect((await card(stranger, id)).modelView).toMatchObject({
      id: modelId,
      available: false,
      mesh: { format: 'stl' },
    });
    const file = await stranger
      .get(fileUrl(id, modelId))
      .responseType('blob')
      .expect(200);
    expect(file.headers['content-type']).toBe('model/stl');
    expect(file.headers['cache-control']).toContain('immutable');
    expect((file.body as Buffer).length).toBe(84 + 3 * 50);
    await t.anonymous().get(fileUrl(id, modelId)).expect(401);
  });

  it('файла нет у скрытого монстра, у чужой модели и у прежней модели после замены', async () => {
    const first = await createModel(author);
    await uploadMesh(author, first, stl(1), 'a.stl').expect(200);
    const second = await createModel(author);
    await uploadMesh(author, second, stl(2), 'b.stl').expect(200);
    const hidden = await createMonster(author, {
      model: { id: first, scale: 1 },
    });
    await author.get(fileUrl(hidden, first)).expect(200);
    await stranger.get(fileUrl(hidden, first)).expect(404);
    // Адрес с моделью, на которую монстр не ссылается, файла не отдаёт: он кешируется навсегда.
    await author.get(fileUrl(hidden, second)).expect(404);
    await author
      .put(`/api/monsters/${hidden}`)
      .send({ ...monsterBody(), model: { id: second, scale: 1 } })
      .expect(200);
    await author.get(fileUrl(hidden, first)).expect(404);
    await author.get(fileUrl(hidden, second)).expect(200);
    // Рисованная модель без файла — 404.
    const drawn = await createModel(author);
    const withDrawn = await createMonster(author, {
      model: { id: drawn, scale: 1 },
    });
    await author.get(fileUrl(withDrawn, drawn)).expect(404);
  });

  it('удаление модели: в вопросе — монстры с ней, после — монстр без вида', async () => {
    const modelId = await createModel(author);
    const id = await createMonster(author, {
      name: 'Огр',
      model: { id: modelId, scale: 1 },
    });
    const usage = (
      await author.get(`/api/voxel-models/${modelId}/usage`).expect(200)
    ).body as VoxelModelUsage;
    expect(usage).toEqual({ furniture: [], monsters: [{ id, name: 'Огр' }] });
    await author.delete(`/api/voxel-models/${modelId}`).expect(204);
    const read = await card(author, id);
    expect(read.model).toEqual({ id: modelId, scale: 1 });
    expect(read.modelView).toBeNull();
  });
});
