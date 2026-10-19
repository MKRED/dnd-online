import { describe, expect, it } from 'vitest';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// Категория «Монстра» (docs/plan/done/monsters-npcs.md, этап 2): активации «Черта» и
// «Легендарное действие» с ценой и перезарядка в details — только у неё.

const breath = {
  category: 'monster',
  details: { recharge: 5 },
  activation: { kind: 'action' },
};
const legendary = (cost: number) => ({
  category: 'monster',
  details: { recharge: null },
  activation: { kind: 'legendary', cost },
});

const messages = (res: { body: unknown }) =>
  (res.body as { message: string[] }).message;

export function describeAbilityMonster(get: () => CatalogContext): void {
  describe('способность монстра', () => {
    it('сохраняется и читается, правкой становится базовой', async () => {
      const { author, url, create, body } = get();
      const { id } = await create(breath);
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject(breath);
      const edited = await author
        .put(url(id))
        .send(body(legendary(2)))
        .expect(200);
      expect(edited.body).toMatchObject(legendary(2));
      const trait = await author
        .put(url(id))
        .send(
          body({
            category: 'monster',
            details: { recharge: null },
            activation: { kind: 'trait' },
          }),
        )
        .expect(200);
      expect(trait.body).toMatchObject({ activation: { kind: 'trait' } });
      const basic = await author
        .put(url(id))
        .send(body({ category: 'basic', details: {} }))
        .expect(200);
      expect(basic.body).toMatchObject({ category: 'basic', details: {} });
    });

    it('неверная перезарядка или цена — 400', async () => {
      const { author, url, body } = get();
      for (const details of [{}, { recharge: 1 }, { recharge: 7 }]) {
        const res = await author
          .post(url())
          .send(body({ ...breath, details }))
          .expect(400);
        expect(messages(res)).toContain(
          'Поля способности монстра заданы неверно',
        );
      }
      for (const cost of [0, 4]) {
        await author
          .post(url())
          .send(body(legendary(cost)))
          .expect(400);
      }
    });

    it('черта и легендарное действие в другой категории — 400', async () => {
      const { author, url, create, body } = get();
      const res = await author
        .post(url())
        .send(body({ activation: { kind: 'trait' } }))
        .expect(400);
      expect(messages(res)).toContain(
        'Черта и легендарное действие бывают только у способности монстра',
      );
      // Сменить категорию, оставив легендарное действие, тоже нельзя.
      const { id } = await create(legendary(1));
      await author
        .put(url(id))
        .send(
          body({
            category: 'basic',
            details: {},
            activation: { kind: 'legendary', cost: 1 },
          }),
        )
        .expect(400);
      // Перезарядка у базовой — 400 от проверки полей категории.
      await author
        .post(url())
        .send(body({ category: 'basic', details: { recharge: 5 } }))
        .expect(400);
    });
  });
}
