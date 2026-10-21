import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// «Применение» способности: шаги с атакой и уроном (docs/plan/done/abilities.md, этапы 3 и 4;
// цепочки шагов этапа 5 — chains.ts).
// Отдельным файлом, чтобы abilities.e2e-spec.ts не рос с каждым этапом.

// «Огненный снаряд»: дальнобойная атака заклинанием, 120 фт., 1d10 Огнём.
export const fireBolt = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 120, longFeet: null },
  check: {
    kind: 'attack',
    attack: 'ranged_spell',
    bonus: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 1, die: 10, number: 0, type: 'fire' }],
    addModifier: false,
    effects: [],
  },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
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

    it('неверный шаг и больше трёх шагов — 400', async () => {
      const { author, url, body } = get();
      for (const steps of [
        [{ ...fireBolt, target: { kind: 'touch' } }],
        [
          {
            ...fireBolt,
            hit: { damage: [], addModifier: false, effects: [] },
            miss: { damage: 'half', effects: [] },
            growth: { damage: [], times: 0 },
          },
        ],
        [{ ...fireBolt, hit: { ...fireBolt.hit, addModifier: 'yes' } }],
        // Без промаха: запрос проверяется строго, умолчания — только при чтении.
        [{ ...fireBolt, miss: undefined }],
        [fireBolt, fireBolt, fireBolt, fireBolt],
        {},
      ]) {
        const res = await author.post(url()).send(body({ steps })).expect(400);
        expect(
          (res.body as { message: string[] }).message.join('\n'),
        ).toContain('Применение способности задано неверно: ');
      }
      // Ответ называет шаг и поле: запросу в обход формы (MCP) иначе неясно, что исправлять.
      const touchRes = await author
        .post(url())
        .send(body({ steps: [{ ...fireBolt, target: { kind: 'touch' } }] }))
        .expect(400);
      expect(
        (touchRes.body as { message: string[] }).message.join('\n'),
      ).toContain('Применение способности задано неверно: шаг 1: target — ');
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

    // Этап 4: «Огненный шар» — спасбросок и сфера в точке; «Волшебная стрела» — без
    // проверки.
    it('спасбросок с областью и шаг без проверки сохраняются, неверная область — 400', async () => {
      const { author, url, body, create } = get();
      const fireball = {
        when: 'always',
        times: 1,
        target: {
          kind: 'area',
          area: { shape: 'sphere', radius: 20 },
          origin: { kind: 'point', feet: 150 },
        },
        check: {
          kind: 'save',
          ability: 'dexterity',
          dc: { kind: 'ability', ability: 'spellcasting' },
        },
        hit: {
          damage: [{ count: 8, die: 6, number: 0, type: 'fire' }],
          addModifier: false,
          effects: [],
        },
        miss: { damage: 'half', effects: [] },
        growth: { damage: [], times: 0 },
      };
      // Три дротика по 1d4 + 1 — «сколько раз» этапа 5.
      const missile = {
        when: 'always',
        times: 3,
        target: { kind: 'range', feet: 120, longFeet: null },
        check: { kind: 'none' },
        hit: {
          damage: [{ count: 1, die: 4, number: 1, type: 'force' }],
          addModifier: false,
          effects: [],
        },
        miss: { damage: 'none', effects: [] },
        growth: { damage: [], times: 0 },
      };
      for (const step of [fireball, missile]) {
        const { id } = await create({ steps: [step] });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ steps: [step] });
      }
      for (const step of [
        {
          ...fireball,
          target: {
            ...fireball.target,
            area: { shape: 'emanation', distance: 15 },
          },
        },
        { ...missile, miss: { damage: 'half', effects: [] } },
        { ...fireball, target: { kind: 'self' } },
      ]) {
        await author
          .post(url())
          .send(body({ steps: [step] }))
          .expect(400);
      }
    });
  });
}
