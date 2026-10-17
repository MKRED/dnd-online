import { describe, expect, it } from 'vitest';
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
  damage: [{ count: 1, die: 10, number: 0, type: 'fire' }],
  addModifier: false,
  onMiss: 'none',
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
        [{ ...fireBolt, damage: [], onMiss: 'half' }],
        [{ ...fireBolt, addModifier: 'yes' }],
        [fireBolt, fireBolt],
        {},
      ]) {
        const res = await author.post(url()).send(body({ steps })).expect(400);
        expect((res.body as { message: string[] }).message).toContain(
          'Применение способности задано неверно',
        );
      }
    });
  });
}
