import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';
import { fireBolt } from './steps.js';

// Рост шага (docs/plan/abilities.md, этап 7): строки урона и повторы на ступень. С чем
// растёт, решает способность, поэтому сервер рост с категорией и затратами не сверяет.

const fire = (count: number) => ({ count, die: 6, number: 0, type: 'fire' });
// «Огненный шар»: 8d6 огнём, +1d6 за каждый круг ячейки выше 3.
const fireball = {
  ...fireBolt,
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
  hit: { damage: [fire(8)], addModifier: false, effects: [] },
  miss: { damage: 'half', effects: [] },
  growth: { damage: [fire(1)], times: 0 },
};
const spell = {
  category: 'spell',
  details: {
    level: 3,
    school: 'evocation',
    components: '',
    ritual: false,
    duration: { kind: 'instant' },
  },
  costs: {
    uses: null,
    spellSlot: { minLevel: 3 },
    movement: null,
    hitDie: false,
  },
};

// Шаг без поля роста — как в запросе или в базе до этапа 7.
const withoutGrowth = (step: object) =>
  Object.fromEntries(Object.entries(step).filter(([key]) => key !== 'growth'));

export function describeAbilityGrowth(get: () => CatalogContext): void {
  describe('рост шага', () => {
    it('сохраняется и читается, смена категории его не портит', async () => {
      const { author, url, body, create } = get();
      const { id } = await create({ ...spell, steps: [fireball] });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ steps: [fireball] });
      // «Волшебная стрела» базовой способностью без ячейки: +1 повтор на 5, 11, 17.
      const missile = {
        ...fireBolt,
        times: 3,
        growth: { damage: [], times: 1 },
      };
      const edited = await author
        .put(url(id))
        .send(body({ category: 'basic', details: {}, steps: [missile] }))
        .expect(200);
      expect(edited.body).toMatchObject({ steps: [missile] });
    });

    it('неверный рост — 400', async () => {
      const { author, url, body } = get();
      const noGrowth = withoutGrowth(fireBolt);
      for (const step of [
        noGrowth,
        { ...fireBolt, growth: { damage: [], times: 4 } },
        { ...fireBolt, growth: { damage: [fire(0)], times: 0 } },
        { ...fireBolt, growth: { damage: [], times: 0, slot: 3 } },
      ]) {
        await author
          .post(url())
          .send(body({ steps: [step] }))
          .expect(400);
      }
    });

    // Шаги этапов 3–6 лежат в базе без роста — читаются не растущими, а не пропадают.
    it('шаг из базы без роста читается не растущим', async () => {
      const { app, author, url, create } = get();
      const { id } = await create();
      const stored = withoutGrowth(fireball);
      await app
        .get(DatabaseService)
        .db.update(abilities)
        .set({
          extra: { activation: { kind: 'action' }, steps: [stored, stored] },
        })
        .where(eq(abilities.id, id));
      const card = await author.get(url(id)).expect(200);
      const empty = { ...fireball, growth: { damage: [], times: 0 } };
      expect((card.body as { steps: unknown[] }).steps).toEqual([empty, empty]);
    });
  });
}
