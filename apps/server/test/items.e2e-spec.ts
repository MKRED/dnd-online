import { describe, expect, it } from 'vitest';
import { describeCatalog } from './support/catalog-scenario/index.js';

describeCatalog(
  {
    path: 'items',
    body: {
      name: 'Верёвка',
      category: 'basic',
      details: {},
      description: 'тест',
      isPublic: false,
      rarity: 'none',
      weight: 1,
      cost: null,
    },
  },
  (get) => {
    describe('поля предмета', () => {
      it('вес, стоимость и редкость сохраняются', async () => {
        const { author, url, create } = get();
        const { id } = await create({
          rarity: 'rare',
          weight: 0.5,
          cost: { amount: 25, coin: 'gp' },
        });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          rarity: 'rare',
          weight: 0.5,
          cost: { amount: 25, coin: 'gp' },
        });
      });

      it('отрицательный вес и неизвестная редкость — 400', async () => {
        const { author, url, body } = get();
        await author
          .post(url())
          .send(body({ weight: -1 }))
          .expect(400);
        await author
          .post(url())
          .send(body({ rarity: 'legendary-ish' }))
          .expect(400);
      });
    });
  },
);
