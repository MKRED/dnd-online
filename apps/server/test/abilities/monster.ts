import { describe, expect, it } from 'vitest';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// Категория «Монстр» (docs/plan/done/monsters-npcs.md, этап 2): «Легендарное действие» с
// ценой и перезарядка в details — только у неё. «Черта» бывает и у «Базовой» и «Умения»
// (abilities/traits.ts). Затраты монстра — «Ограничение» и движение
// (docs/plan/ability-categories.md).

const noCosts = { uses: null, spellSlot: null, movement: null, hitDie: false };
const breath = {
  category: 'monster',
  details: { recharge: 5 },
  activation: { kind: 'action' },
  costs: noCosts,
};
const legendary = (cost: number) => ({
  category: 'monster',
  details: { recharge: null },
  activation: { kind: 'legendary', cost },
  costs: noCosts,
});
const fixedUses = (amount: number, recovery: string) => ({
  count: { kind: 'fixed', amount },
  recovery,
});

const messages = (res: { body: unknown }) =>
  (res.body as { message: string[] }).message;

export function describeAbilityMonster(get: () => CatalogContext): void {
  describe('способность монстра', () => {
    it('сохраняется и читается, правкой становится умением', async () => {
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
            costs: noCosts,
          }),
        )
        .expect(200);
      expect(trait.body).toMatchObject({ activation: { kind: 'trait' } });
      const feature = await author
        .put(url(id))
        .send(body({ category: 'feature', details: {} }))
        .expect(200);
      expect(feature.body).toMatchObject({ category: 'feature', details: {} });
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

    it('легендарное действие в другой категории — 400', async () => {
      const { author, url, create, body } = get();
      const res = await author
        .post(url())
        .send(body({ activation: { kind: 'legendary', cost: 1 } }))
        .expect(400);
      expect(messages(res)).toContain(
        'Легендарное действие бывает только у способности монстра',
      );
      // Сменить категорию, оставив легендарное действие, тоже нельзя.
      const { id } = await create(legendary(1));
      await author
        .put(url(id))
        .send(
          body({
            category: 'feature',
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

    it('«Ограничение»: «N/день», перезарядка или «после отдыха», без ячейки и кости хитов', async () => {
      const { author, url, create, body } = get();
      for (const uses of [fixedUses(3, 'long'), fixedUses(1, 'short')]) {
        const saved = await create({
          ...breath,
          details: { recharge: null },
          costs: { ...noCosts, uses },
        });
        expect(saved).toMatchObject({ costs: { uses } });
      }
      const cases: [object, object, string][] = [
        [
          { recharge: null },
          { ...noCosts, spellSlot: { minLevel: 1 } },
          'Монстр не тратит ячейки заклинаний: частота его заклинаний задаётся у монстра',
        ],
        [
          { recharge: null },
          { ...noCosts, hitDie: true },
          'Монстр не тратит кость хитов',
        ],
        [
          { recharge: null },
          {
            ...noCosts,
            uses: { count: { kind: 'proficiency' }, recovery: 'long' },
          },
          'Ограничение монстра — одно из «N/день», «Перезарядка» и «после отдыха»',
        ],
        [
          { recharge: 5 },
          { ...noCosts, uses: fixedUses(1, 'long') },
          'Ограничение монстра — одно из «N/день», «Перезарядка» и «после отдыха»',
        ],
      ];
      for (const [details, costs, message] of cases) {
        const res = await author
          .post(url())
          .send(body({ ...breath, details, costs }))
          .expect(400);
        expect(messages(res)).toContain(message);
      }
      // У черты монстра нет перезарядки.
      const trait = await author
        .post(url())
        .send(body({ ...breath, activation: { kind: 'trait' } }))
        .expect(400);
      expect(messages(trait)).toContain('У черты нет перезарядки');
    });
  });
}
