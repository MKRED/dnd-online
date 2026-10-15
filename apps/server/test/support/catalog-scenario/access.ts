import type request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { CatalogContext } from './catalog-scenario.types.js';

const ids = (res: request.Response) =>
  (res.body as { id: string }[]).map((entry) => entry.id);

export function describeAccess(get: () => CatalogContext): void {
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
