import { describe, expect, it } from 'vitest';
import type { CatalogContext } from '../support/catalog-scenario/index.js';
import { fireBolt } from './steps.js';

// Что можно категории (docs/plan/ability-categories.md): «Базовая» — текст с активацией,
// без затрат и «Применения»; заклинание сотворяют не «без действия» и не тратят кость
// хитов. Черта — abilities/traits.ts, монстр — abilities/monster.ts.

const noCosts = { uses: null, spellSlot: null, movement: null, hitDie: false };
const basic = { category: 'basic', details: {}, costs: noCosts };
const fireball = {
  category: 'spell',
  details: {
    level: 3,
    school: 'evocation',
    components: 'V, S, M',
    ritual: false,
    duration: { kind: 'instant' },
  },
  activation: { kind: 'action' },
  costs: { ...noCosts, spellSlot: { minLevel: 3 } },
};

const messages = (res: { body: unknown }) =>
  (res.body as { message: string[] }).message;

export function describeAbilityCategories(get: () => CatalogContext): void {
  describe('категории', () => {
    it('базовая — текст с активацией, затраты и «Применение» — 400', async () => {
      const { author, url, body, create } = get();
      const saved = await create({
        ...basic,
        activation: { kind: 'bonus_action' },
      });
      expect(saved).toMatchObject({
        category: 'basic',
        activation: { kind: 'bonus_action' },
      });
      const costs = await author
        .post(url())
        .send(body({ category: 'basic' }))
        .expect(400);
      expect(messages(costs)).toContain(
        'У базовой способности нет затрат: для них выберите «Умение»',
      );
      const steps = await author
        .post(url())
        .send(body({ ...basic, steps: [fireBolt] }))
        .expect(400);
      expect(messages(steps)).toContain(
        'У базовой способности нет «Применения»: для него выберите «Умение»',
      );
    });

    it('заклинание: «без действия» и кость хитов — 400', async () => {
      const { author, url, body, create } = get();
      await create(fireball);
      const free = await author
        .post(url())
        .send(body({ ...fireball, activation: { kind: 'free', trigger: '' } }))
        .expect(400);
      expect(messages(free)).toContain(
        'Заклинание сотворяют действием, бонусным действием, реакцией или дольше',
      );
      const hitDie = await author
        .post(url())
        .send(body({ ...fireball, costs: { ...fireball.costs, hitDie: true } }))
        .expect(400);
      expect(messages(hitDie)).toContain('Заклинание не тратит кость хитов');
    });
  });
}
