import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';
import { fireBolt } from './steps.js';

// Несколько шагов «Применения» (docs/plan/abilities.md, этап 5): «когда», цели прошлого
// шага и «сколько раз». Шаги проверяются цепочкой — каждый против прошлого.

// «Ледяной кинжал»: попал или нет, цель и все в 5 фт. от неё спасаются Ловкостью.
const burst = {
  when: 'always',
  times: 1,
  target: { kind: 'around', feet: 5 },
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 2, die: 6, number: 0, type: 'cold' }],
    addModifier: false,
  },
  miss: { damage: 'none' },
  growth: { damage: [], times: 0 },
};
const noCheck = { ...fireBolt, check: { kind: 'none' } };

export function describeAbilityStepChains(get: () => CatalogContext): void {
  describe('несколько шагов', () => {
    it('цепочка сохраняется и читается по порядку', async () => {
      const { author, url, create } = get();
      const steps = [
        fireBolt,
        { ...burst, when: 'hit' },
        { ...fireBolt, target: { kind: 'previous' }, times: 3 },
      ];
      // После трёх лучей — вокруг цели каждого попавшего (для каждого повтора отдельно).
      const rays = [
        { ...fireBolt, times: 3 },
        { ...burst, when: 'hit' },
      ];
      const second = await create({ steps: rays });
      const raysCard = await author.get(url(second.id)).expect(200);
      expect(raysCard.body).toMatchObject({ steps: rays });
      const { id } = await create({ steps });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ steps });
    });

    it('неверная связь с прошлым шагом — 400', async () => {
      const { author, url, body } = get();
      for (const steps of [
        // У первого шага нет прошлого.
        [{ ...fireBolt, when: 'hit' }],
        [burst],
        // По исходу шага без проверки; вокруг области; атака по всем вокруг.
        [noCheck, { ...burst, when: 'miss' }],
        [
          {
            ...burst,
            target: {
              kind: 'area',
              area: { shape: 'sphere', radius: 20 },
              origin: { kind: 'point', feet: 150 },
            },
          },
          burst,
        ],
        [fireBolt, { ...fireBolt, target: { kind: 'around', feet: 5 } }],
        // Без «сколько раз» или больше двадцати.
        [{ ...fireBolt, times: undefined }],
        [{ ...fireBolt, times: 21 }],
      ]) {
        const res = await author.post(url()).send(body({ steps })).expect(400);
        expect((res.body as { message: string[] }).message).toContain(
          'Применение способности задано неверно',
        );
      }
    });

    // Выкинуть шаг из середины нельзя: следующий привязался бы к чужому прошлому.
    it('шаги из базы читаются до первого испорченного', async () => {
      const { app, author, url, create } = get();
      const { id } = await create();
      await app
        .get(DatabaseService)
        .db.update(abilities)
        .set({
          extra: {
            activation: { kind: 'action' },
            steps: [fireBolt, { target: 1 }, burst],
          },
        })
        .where(eq(abilities.id, id));
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ steps: [fireBolt] });
    });
  });
}
