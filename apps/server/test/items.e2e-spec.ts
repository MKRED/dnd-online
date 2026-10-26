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
    invalid: { details: { x: 1 } },
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

    describe('экипировка', () => {
      const longsword = {
        base: 'longsword',
        weaponCategory: 'martial',
        attackType: 'melee',
        damage: { count: 1, die: 8, type: 'slashing' },
        properties: [],
        thrown: null,
        ammunition: null,
        versatile: { count: 1, die: 10 },
        mastery: 'sap',
        magicBonus: 1,
        attunement: false,
      };

      it('оружие сохраняется с полями, правится в доспех', async () => {
        const { author, url, create, body } = get();
        const { id } = await create({
          category: 'weapon',
          rarity: 'uncommon',
          details: longsword,
        });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          category: 'weapon',
          details: longsword,
        });
        const list = await author.get(url()).query({ scope: 'mine' });
        const listed = (list.body as { id: string }[]).find(
          (item) => item.id === id,
        );
        expect(listed).toMatchObject({ details: longsword });

        const armor = {
          base: null,
          kind: 'medium',
          armorClass: 14,
          strength: null,
          stealthDisadvantage: false,
          magicBonus: 0,
          attunement: true,
        };
        await author
          .put(url(id))
          .send(body({ category: 'armor', rarity: 'rare', details: armor }))
          .expect(200);
        const edited = await author.get(url(id)).expect(200);
        expect(edited.body).toMatchObject({
          category: 'armor',
          details: armor,
        });
      });

      it('неверные поля и магия без редкости — 400 с текстом', async () => {
        const { author, url, body } = get();
        const badRange = await author
          .post(url())
          .send(
            body({
              category: 'weapon',
              rarity: 'uncommon',
              details: { ...longsword, thrown: { normal: 60, long: 20 } },
            }),
          )
          .expect(400);
        expect(JSON.stringify(badRange.body)).toContain('Дистанция метания');
        const noRarity = await author
          .post(url())
          .send(
            body({
              category: 'wearable',
              details: { slot: 'ring', attunement: true },
            }),
          )
          .expect(400);
        expect(JSON.stringify(noRarity.body)).toContain('выберите редкость');
      });
    });
  },
);
