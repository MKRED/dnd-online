import { describe, expect, it } from 'vitest';
import { pngImage, PNG_FILE } from '../character-fixture.js';
import type { CatalogContext } from './catalog-scenario.types.js';

// API-токен: читает, создаёт и правит, но не удаляет и не меняет видимость
// (docs/plan/ai-access.md, этап 1).
export function describeTokenAccess(get: () => CatalogContext): void {
  describe('API-токен', () => {
    it('создаёт скрытую запись, читает и правит её', async () => {
      const { author, authorToken, url, body } = get();
      const created = await authorToken.post(url()).send(body()).expect(201);
      const { id } = created.body as { id: string };
      await authorToken.get(`${url()}?scope=mine`).expect(200);
      await authorToken.get(url(id)).expect(200);
      await authorToken
        .put(url(id))
        .send(body({ name: 'Правка нейросети' }))
        .expect(200);
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({
        name: 'Правка нейросети',
        isPublic: false,
      });
    });

    it('не публикует и не скрывает — ни при создании, ни правкой', async () => {
      const { authorToken, url, body, create } = get();
      const res = await authorToken
        .post(url())
        .send(body({ isPublic: true }))
        .expect(403);
      expect((res.body as { message: string }).message).toMatch(/API-токен/);

      const hidden = await create();
      await authorToken
        .put(url(hidden.id))
        .send(body({ isPublic: true }))
        .expect(403);

      // Опубликованное правится с тем же признаком, а снять публикацию нельзя.
      const published = await create({ isPublic: true });
      await authorToken
        .put(url(published.id))
        .send(body({ name: 'Ещё правка', isPublic: true }))
        .expect(200);
      await authorToken
        .put(url(published.id))
        .send(body({ isPublic: false }))
        .expect(403);
    });

    it('не удаляет запись и картинку; удаление по сессии работает', async () => {
      const { author, authorToken, url, create } = get();
      const { id } = await create();
      const png = await pngImage();
      await authorToken
        .put(`${url(id)}/image`)
        .attach('file', png, PNG_FILE)
        .expect(200);
      await authorToken.get(`${url(id)}/image?v=1`).expect(200);
      await authorToken
        .patch(`${url(id)}/image`)
        .send({ thumbCrop: { x: 0, y: 0, size: 100 } })
        .expect(200);
      await authorToken.delete(`${url(id)}/image`).expect(403);
      await authorToken.delete(url(id)).expect(403);
      await author.delete(url(id)).expect(204);
    });

    it('чужой токен не видит скрытую запись и не правит опубликованную', async () => {
      const { strangerToken, url, body, create } = get();
      const hidden = await create();
      await strangerToken.get(url(hidden.id)).expect(404);
      await strangerToken.put(url(hidden.id)).send(body()).expect(404);
      const published = await create({ isPublic: true });
      await strangerToken.get(url(published.id)).expect(200);
      await strangerToken
        .put(url(published.id))
        .send(body({ isPublic: true }))
        .expect(403);
    });
  });
}
