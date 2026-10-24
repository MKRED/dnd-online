import { describe, expect, it } from 'vitest';
import { describeAbilityStepChains } from './abilities/chains.js';
import { describeAbilityEffects } from './abilities/effects.js';
import { describeAbilityGrowth } from './abilities/growth.js';
import { describeAbilityMonster } from './abilities/monster.js';
import { describeAbilitySpells } from './abilities/spells.js';
import { describeAbilitySteps } from './abilities/steps.js';
import { describeAbilityTraits } from './abilities/traits.js';
import { describeCatalog } from './support/catalog-scenario/index.js';

const costs = {
  uses: { count: { kind: 'proficiency' }, recovery: 'long' },
  spellSlot: null,
  movement: { kind: 'feet', feet: 15 },
  hitDie: false,
};

describeCatalog(
  {
    path: 'abilities',
    body: {
      name: 'Отражение',
      category: 'basic',
      details: {},
      description: 'тест',
      isPublic: false,
      activation: { kind: 'reaction', trigger: 'когда вас бьют' },
      costs,
    },
    invalid: { details: { x: 1 } },
  },
  (get) => {
    describe('активация и затраты', () => {
      it('сохраняются и возвращаются в карточке', async () => {
        const { author, url, create } = get();
        const { id } = await create();
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          activation: { kind: 'reaction', trigger: 'когда вас бьют' },
          costs,
        });
      });

      it('без активации или затрат — 400', async () => {
        const { author, url, body } = get();
        await author
          .post(url())
          .send(body({ activation: undefined }))
          .expect(400);
        await author
          .post(url())
          .send(body({ costs: undefined }))
          .expect(400);
      });

      it('ячейка 10 круга и футы не кратно 5 — 400', async () => {
        const { author, url, body } = get();
        for (const bad of [
          { ...costs, spellSlot: { minLevel: 10 } },
          { ...costs, movement: { kind: 'feet', feet: 12 } },
        ]) {
          const res = await author
            .post(url())
            .send(body({ costs: bad }))
            .expect(400);
          expect((res.body as { message: string[] }).message).toContain(
            'Затраты способности заданы неверно',
          );
        }
      });
    });

    describeAbilitySteps(get);
    describeAbilityStepChains(get);
    describeAbilitySpells(get);
    describeAbilityGrowth(get);
    describeAbilityMonster(get);
    describeAbilityTraits(get);
    describeAbilityEffects(get);
  },
);
