import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// «Применение» способности: шаги с атакой и уроном (docs/plan/abilities.md, этап 3).
// Отдельным файлом, чтобы abilities.e2e-spec.ts не рос с каждым этапом.

// «Огненный снаряд»: дальнобойная атака заклинанием, 120 фт., 1d10 Огнём.
const fireBolt = {
  target: { kind: 'range', feet: 120, longFeet: null },
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 1, die: 10, number: 0, type: 'fire' }],
    addModifier: false,
  },
  miss: { damage: 'none' },
};

export function describeAbilitySteps(get: () => CatalogContext): void {
  describe('применение', () => {
    it('шаг сохраняется, без поля — пустой список, правка убирает шаг', async () => {
      const { author, url, body, create } = get();
      const { id } = await create({ steps: [fireBolt] });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ steps: [fireBolt] });

      const plain = await create();
      const plainCard = await author.get(url(plain.id)).expect(200);
      expect(plainCard.body).toMatchObject({ steps: [] });

      await author
        .put(url(id))
        .send(body({ steps: [] }))
        .expect(200);
      const cleared = await author.get(url(id)).expect(200);
      expect(cleared.body).toMatchObject({ steps: [] });
    });

    it('неверный шаг и два шага — 400', async () => {
      const { author, url, body } = get();
      for (const steps of [
        [{ ...fireBolt, target: { kind: 'touch' } }],
        [
          {
            ...fireBolt,
            hit: { damage: [], addModifier: false },
            miss: { damage: 'half' },
          },
        ],
        [{ ...fireBolt, hit: { ...fireBolt.hit, addModifier: 'yes' } }],
        // Без промаха: запрос проверяется строго, умолчания — только при чтении.
        [{ ...fireBolt, miss: undefined }],
        [fireBolt, fireBolt],
        {},
      ]) {
        const res = await author.post(url()).send(body({ steps })).expect(400);
        expect((res.body as { message: string[] }).message).toContain(
          'Применение способности задано неверно',
        );
      }
    });

    // Шаг, сохранённый до нового поля, читается с умолчанием (abilityStepsRead.ts), а
    // испорченный пропускается, не стирая остальные.
    it('шаг из базы без поля читается с умолчанием, испорченный пропускается', async () => {
      const { app, author, url, create } = get();
      const { id } = await create();
      const noMiss = {
        target: fireBolt.target,
        check: fireBolt.check,
        hit: fireBolt.hit,
      };
      const noModifier = { ...fireBolt, hit: { damage: fireBolt.hit.damage } };
      const read = async (steps: unknown[]) => {
        await app
          .get(DatabaseService)
          .db.update(abilities)
          .set({ extra: { activation: { kind: 'action' }, steps } })
          .where(eq(abilities.id, id));
        const card = await author.get(url(id)).expect(200);
        return (card.body as { steps: unknown[] }).steps;
      };
      expect(await read([noMiss])).toEqual([fireBolt]);
      expect(await read([noModifier])).toEqual([fireBolt]);
      expect(await read([{ target: 1 }])).toEqual([]);
    });
  });
}
