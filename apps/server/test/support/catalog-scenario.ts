import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type request from 'supertest';
import sharp from 'sharp';
import { createTestApp, type TestApp } from './test-app.js';

export interface CatalogScenario {
  // Путь API без /api: items, abilities, effects.
  path: string;
  // Тело, которое сервер примет; поверх него тесты меняют отдельные поля.
  body: Record<string, unknown>;
}

export interface CatalogContext {
  author: request.Agent;
  stranger: request.Agent;
  anonymous: request.Agent;
  url: (id?: string) => string;
  body: (over?: Record<string, unknown>) => Record<string, unknown>;
  create: (over?: Record<string, unknown>) => Promise<{ id: string }>;
}

// Общее для каталогов предметов, способностей и эффектов: доступ к скрытым и
// опубликованным записям, общие поля и картинка. Свои поля каталога файл проверяет
// сам через fields(ctx).
export function describeCatalog(
  scenario: CatalogScenario,
  fields?: (ctx: () => CatalogContext) => void,
): void {
  describe(`каталог ${scenario.path} (e2e)`, () => {
    let t: TestApp;
    let ctx: CatalogContext;

    beforeAll(async () => {
      t = await createTestApp();
      const author = await t.loginAs('author');
      const url = (id?: string) =>
        id ? `/api/${scenario.path}/${id}` : `/api/${scenario.path}`;
      const body = (over: Record<string, unknown> = {}) => ({
        ...scenario.body,
        ...over,
      });
      ctx = {
        author,
        stranger: await t.loginAs('stranger'),
        anonymous: t.anonymous(),
        url,
        body,
        async create(over) {
          const res = await author.post(url()).send(body(over)).expect(201);
          return res.body as { id: string };
        },
      };
    });

    afterAll(async () => {
      await t.close();
    });

    describeAccess(() => ctx);
    describeImage(() => ctx);
    fields?.(() => ctx);
  });
}

const ids = (res: request.Response) =>
  (res.body as { id: string }[]).map((entry) => entry.id);

function describeAccess(get: () => CatalogContext): void {
  describe('доступ', () => {
    it('скрытая запись видна автору в «Моих» и больше никому', async () => {
      const { author, stranger, url, body, create } = get();
      const { id } = await create();
      expect(
        ids(await author.get(`${url()}?scope=mine`).expect(200)),
      ).toContain(id);
      expect(
        ids(await author.get(`${url()}?scope=catalog`).expect(200)),
      ).not.toContain(id);
      await stranger.get(url(id)).expect(404);
      await stranger.put(url(id)).send(body()).expect(404);
      await stranger.delete(url(id)).expect(404);
    });

    it('опубликованную видят все, но менять и удалять может только автор', async () => {
      const { author, stranger, url, body, create } = get();
      const { id } = await create({ isPublic: true });
      expect(
        ids(await stranger.get(`${url()}?scope=catalog`).expect(200)),
      ).toContain(id);
      await stranger.get(url(id)).expect(200);
      const put = await stranger.put(url(id)).send(body()).expect(403);
      expect((put.body as { message: string }).message).toMatch(/только/);
      await stranger.delete(url(id)).expect(403);
      await author.get(url(id)).expect(200);
    });

    it('автор правит и удаляет свою запись', async () => {
      const { author, url, body, create } = get();
      const { id } = await create();
      const res = await author
        .put(url(id))
        .send(body({ name: 'Новое имя', isPublic: true }))
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Новое имя', isPublic: true });
      await author.delete(url(id)).expect(204);
      await author.get(url(id)).expect(404);
    });

    it('без входа — 401, без scope — 400', async () => {
      const { author, anonymous, url, body } = get();
      await anonymous.get(`${url()}?scope=catalog`).expect(401);
      await anonymous.post(url()).send(body()).expect(401);
      await author.get(url()).expect(400);
    });

    it('пустое имя и чужие поля категории — 400', async () => {
      const { author, url, body } = get();
      await author
        .post(url())
        .send(body({ name: ' ' }))
        .expect(400);
      await author
        .post(url())
        .send(body({ details: { x: 1 } }))
        .expect(400);
    });
  });
}

function describeImage(get: () => CatalogContext): void {
  describe('картинка', () => {
    it('загрузка, миниатюра для другого, вырез и удаление', async () => {
      const { author, stranger, url, create } = get();
      const { id } = await create({ isPublic: true });
      const png = await sharp({
        create: {
          width: 400,
          height: 100,
          channels: 4,
          background: { r: 200, g: 50, b: 50, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const file = { filename: 'x.png', contentType: 'image/png' };

      const up = await author
        .put(`${url(id)}/image`)
        .attach('file', png, file)
        .expect(200);
      expect(up.body).toMatchObject({ version: 1, width: 400, height: 100 });
      await stranger
        .put(`${url(id)}/image`)
        .attach('file', png, file)
        .expect(403);

      const thumb = await stranger
        .get(`${url(id)}/image?variant=thumb&v=1`)
        .buffer(true)
        .expect(200);
      const meta = await sharp(thumb.body as Buffer).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 256 });

      const crop = await author
        .patch(`${url(id)}/image`)
        .send({ thumbCrop: { x: 0, y: 0, size: 100 } })
        .expect(200);
      expect(crop.body).toMatchObject({ version: 2 });
      await author
        .patch(`${url(id)}/image`)
        .send({ thumbCrop: { x: 900, y: 0, size: 100 } })
        .expect(400);
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ image: { version: 2 } });

      await author.delete(`${url(id)}/image`).expect(204);
      await author.delete(`${url(id)}/image`).expect(404);
    });
  });
}
