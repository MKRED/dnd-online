import sharp from 'sharp';
import type request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  characterBody,
  pngImage,
  PNG_FILE,
} from './support/character-fixture.js';
import { createTestApp, type TestApp } from './support/test-app.js';

interface Image {
  id: string;
  isMain: boolean;
}

describe('картинки персонажей (e2e)', () => {
  let t: TestApp;
  let owner: request.Agent;
  let stranger: request.Agent;
  let png: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    owner = await t.loginAs('owner');
    stranger = await t.loginAs('stranger');
    png = await pngImage();
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

  const images = (id: string) => `/api/characters/${id}/images`;

  async function upload(id: string): Promise<Image> {
    const res = await owner
      .post(images(id))
      .attach('file', png, PNG_FILE)
      .expect(201);
    return res.body as Image;
  }

  it('автор загружает, первая картинка становится основной, файлы — WebP', async () => {
    const id = await createCharacter();
    const first = await upload(id);
    const second = await upload(id);
    expect(first.isMain).toBe(true);
    expect(second.isMain).toBe(false);

    const list = await owner.get(images(id)).expect(200);
    expect((list.body as Image[]).map((i) => i.id)).toEqual([
      first.id,
      second.id,
    ]);
    for (const variant of ['full', 'preview', 'thumb']) {
      const file = await owner
        .get(`${images(id)}/${first.id}/file?variant=${variant}`)
        .buffer(true)
        .expect(200);
      expect(file.headers['cache-control']).toContain('private');
      expect((await sharp(file.body as Buffer).metadata()).format).toBe('webp');
    }
    const card = await owner.get(`/api/characters/${id}`).expect(200);
    expect(card.body).toMatchObject({ mainImage: { id: first.id } });
  });

  it('у закрытого персонажа чужой не видит ни галерею, ни файлы', async () => {
    const id = await createCharacter();
    const image = await upload(id);
    await stranger.get(images(id)).expect(404);
    await stranger.get(`${images(id)}/${image.id}/file`).expect(404);
  });

  it('по ссылке чужой смотрит картинки, но не меняет галерею', async () => {
    const id = await createCharacter();
    const image = await upload(id);
    await owner
      .put(`/api/characters/${id}/access`)
      .send({ linkAccess: 'link' })
      .expect(200);

    await stranger.get(images(id)).expect(200);
    await stranger
      .get(`${images(id)}/${image.id}/file?variant=thumb`)
      .expect(200);
    await stranger.post(images(id)).attach('file', png, PNG_FILE).expect(404);
    await stranger
      .patch(`${images(id)}/${image.id}`)
      .send({ thumbCrop: { x: 0, y: 0, size: 100 } })
      .expect(404);
    await stranger.delete(`${images(id)}/${image.id}`).expect(404);
    await t.anonymous().get(images(id)).expect(401);
  });

  it('картинку другого персонажа нельзя достать через свой', async () => {
    const mine = await createCharacter();
    const other = await createCharacter();
    const image = await upload(other);
    await owner.get(`${images(mine)}/${image.id}/file`).expect(404);
    await owner.delete(`${images(mine)}/${image.id}`).expect(404);
  });

  it('смена основной, вырез миниатюры и удаление', async () => {
    const id = await createCharacter();
    const first = await upload(id);
    const second = await upload(id);

    await owner
      .patch(`${images(id)}/${second.id}`)
      .send({ isMain: true })
      .expect(200);
    const list = (await owner.get(images(id)).expect(200)).body as Image[];
    expect(list.find((i) => i.isMain)?.id).toBe(second.id);

    await owner
      .patch(`${images(id)}/${first.id}`)
      .send({ thumbCrop: { x: 0, y: 0, size: 200 } })
      .expect(200);
    await owner
      .patch(`${images(id)}/${first.id}`)
      .send({ thumbCrop: { x: 900, y: 0, size: 200 } })
      .expect(400);

    await owner.delete(`${images(id)}/${first.id}`).expect(204);
    await owner.delete(`${images(id)}/${first.id}`).expect(404);
  });

  it('не картинка и пустой запрос — 400', async () => {
    const id = await createCharacter();
    await owner
      .post(images(id))
      .attach('file', Buffer.from('not an image'), PNG_FILE)
      .expect(400);
    await owner.post(images(id)).expect(400);
  });
});
