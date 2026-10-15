import { describe, expect, it } from 'vitest';
import { describeCatalog } from './support/catalog-scenario.js';

const duration = {
  kind: 'time',
  amount: 2,
  unit: 'round',
  concentration: false,
};

describeCatalog(
  {
    path: 'effects',
    body: {
      name: 'Горение',
      category: 'basic',
      details: {},
      description: 'тест',
      isPublic: false,
      duration,
    },
  },
  (get) => {
    describe('длительность', () => {
      it('сохраняется и возвращается в карточке', async () => {
        const { author, url, create } = get();
        const { id } = await create();
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ duration });
      });

      it('без длительности или с нулевой — 400', async () => {
        const { author, url, body } = get();
        await author
          .post(url())
          .send(body({ duration: undefined }))
          .expect(400);
        await author
          .post(url())
          .send(body({ duration: { ...duration, amount: 0 } }))
          .expect(400);
      });
    });

    describe('категория «Чувство»', () => {
      it('тёмное зрение с дистанцией и видение невидимого без неё', async () => {
        const { author, url, create } = get();
        const { id } = await create({
          category: 'sense',
          details: { sense: 'darkvision', range: 60 },
        });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          category: 'sense',
          details: { sense: 'darkvision', range: 60 },
        });
        await create({
          category: 'sense',
          details: { sense: 'see_invisible', range: null },
        });
      });

      it('без дистанции или не кратно 5 — 400', async () => {
        const { author, url, body } = get();
        for (const details of [
          { sense: 'darkvision', range: null },
          { sense: 'blindsight', range: 12 },
        ]) {
          await author
            .post(url())
            .send(body({ category: 'sense', details }))
            .expect(400);
        }
      });
    });
  },
);
