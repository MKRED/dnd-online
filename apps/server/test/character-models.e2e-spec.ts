import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CHARACTER_MODEL_MAX_BYTES, type CharacterModel } from 'shared';
import {
  characterBody,
  pngImage,
  PNG_FILE,
} from './support/character-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

// 3D-модель персонажа (docs/plan/character-models.md, этап 1).

// Наименьший двоичный STL: заголовок, число треугольников и по 50 байт на каждый.
function stl(triangles = 2): Buffer {
  const bytes = Buffer.alloc(84 + triangles * 50);
  bytes.writeUInt32LE(triangles, 80);
  return bytes;
}

// Заголовок .glb с длиной файла; содержимое сервер не разбирает.
function glb(length = 64): Buffer {
  const bytes = Buffer.alloc(length);
  bytes.write('glTF', 0, 'ascii');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(length, 8);
  return bytes;
}

describe('3D-модели персонажей (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('model_owner');
    stranger = await t.loginAs('model_stranger');
  });

  afterAll(async () => {
    await t.close();
  });

  async function createCharacter(): Promise<string> {
    const res = await owner
      .post('/api/characters')
      .send(characterBody())
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const model = (id: string) => `/api/characters/${id}/model`;

  const upload = (
    agent: request.Agent,
    id: string,
    file: Buffer,
    name: string | { filename: string; contentType: string },
  ) => agent.put(model(id)).attach('file', file, name);

  it('без модели — null; STL получает цвет и поправку по умолчанию', async () => {
    const id = await createCharacter();
    expect((await owner.get(model(id)).expect(200)).body).toEqual({
      model: null,
    });

    const res = await upload(owner, id, stl(), 'hero.stl').expect(200);
    const created = res.body as CharacterModel;
    expect(created).toMatchObject({
      format: 'stl',
      size: stl().length,
      version: 1,
      fit: { scale: 1, turn: 0, up: 'z' },
    });
    expect(created.color).toMatch(/^#[0-9a-f]{6}$/);
    const file = await owner
      .get(`${model(id)}/file`)
      // Тип model/stl supertest сам не разбирает — просим байты.
      .responseType('blob')
      .expect(200);
    expect(file.headers['content-type']).toContain('model/stl');
    expect(file.headers['cache-control']).toContain('private');
    expect((file.body as Buffer).equals(stl())).toBe(true);
  });

  it('новый файл заменяет модель: версия растёт, поправка сбрасывается', async () => {
    const id = await createCharacter();
    await upload(owner, id, stl(), 'hero.stl').expect(200);
    await owner
      .patch(model(id))
      .send({ fit: { scale: 2, turn: 1, up: 'y' } })
      .expect(200);
    const res = await upload(owner, id, glb(), 'hero.glb').expect(200);
    const body = res.body as CharacterModel;
    expect(body).toMatchObject({
      format: 'glb',
      version: 2,
      color: null,
      fit: { scale: 1, turn: 0, up: 'y' },
    });
  });

  it('цвет и поправка правятся без файла; цвет — только у STL', async () => {
    const id = await createCharacter();
    await upload(owner, id, stl(), 'hero.stl').expect(200);
    const res = await owner
      .patch(model(id))
      .send({ color: '#AA3311', fit: { scale: 1.5, turn: 3, up: 'z' } })
      .expect(200);
    expect(res.body).toMatchObject({
      color: '#aa3311',
      fit: { scale: 1.5, turn: 3, up: 'z' },
      version: 1,
    });
    for (const body of [
      { color: 'red' },
      { fit: { scale: 10, turn: 0, up: 'z' } },
      { fit: { scale: 1, turn: 0, up: 'x' } },
    ]) {
      await owner.patch(model(id)).send(body).expect(400);
    }

    const glbId = await createCharacter();
    await upload(owner, glbId, glb(), 'hero.glb').expect(200);
    await owner.patch(model(glbId)).send({ color: '#aa3311' }).expect(400);
  });

  it('не модель и пустой запрос — 400, слишком большой файл — 413', async () => {
    const id = await createCharacter();
    await upload(owner, id, await pngImage(), PNG_FILE).expect(400);
    await owner.put(model(id)).expect(400);
    const big = Buffer.alloc(CHARACTER_MODEL_MAX_BYTES + 1);
    const res = await upload(owner, id, big, 'big.stl').expect(413);
    expect((res.body as { message: string }).message).toContain('МБ');
  });

  it('удаление убирает модель; нет модели — 404', async () => {
    const id = await createCharacter();
    await owner.delete(model(id)).expect(404);
    await upload(owner, id, stl(), 'hero.stl').expect(200);
    await owner.delete(model(id)).expect(204);
    expect((await owner.get(model(id)).expect(200)).body).toEqual({
      model: null,
    });
    await owner.get(`${model(id)}/file`).expect(404);
    await owner.patch(model(id)).send({ color: '#112233' }).expect(404);
  });

  it('чужой не видит закрытого, по ссылке — смотрит, но не меняет', async () => {
    const id = await createCharacter();
    await upload(owner, id, stl(), 'hero.stl').expect(200);
    await stranger.get(model(id)).expect(404);
    await stranger.get(`${model(id)}/file`).expect(404);
    await t.anonymous().get(model(id)).expect(401);

    await owner
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);
    await stranger.get(model(id)).expect(200);
    await stranger.get(`${model(id)}/file`).expect(200);
    await upload(stranger, id, stl(), 'hero.stl').expect(404);
    await stranger.patch(model(id)).send({ color: '#112233' }).expect(404);
    await stranger.delete(model(id)).expect(404);
  });
});
