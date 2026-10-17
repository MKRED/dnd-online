import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// Категория «Заклинание» (docs/plan/abilities.md, этап 6): круг, школа, компоненты,
// ритуал, длительность и затрата «Ячейка заклинаний» по кругу.

const fireball = {
  level: 3,
  school: 'evocation',
  components: 'В, С, М (шарик из помёта летучей мыши и серы)',
  ritual: false,
  duration: { kind: 'instant' },
};
const noCosts = { uses: null, spellSlot: null, movement: null, hitDie: false };
const slot = (minLevel: number) => ({ ...noCosts, spellSlot: { minLevel } });
const spell = (details: object, costs: object = slot(3)) => ({
  category: 'spell',
  details,
  costs,
});

export function describeAbilitySpells(get: () => CatalogContext): void {
  describe('заклинание', () => {
    it('сохраняется и читается, правкой становится базовой', async () => {
      const { author, url, create, body } = get();
      const { id } = await create(spell(fireball));
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject(spell(fireball));
      // Ритуал с концентрацией и без ячейки — сотворяют от черты.
      const detect = {
        ...fireball,
        level: 1,
        school: 'divination',
        components: '',
        ritual: true,
        duration: {
          kind: 'time',
          amount: 10,
          unit: 'minute',
          concentration: true,
        },
      };
      const edited = await author
        .put(url(id))
        .send(body(spell(detect, noCosts)))
        .expect(200);
      expect(edited.body).toMatchObject(spell(detect, noCosts));
      const basic = await author
        .put(url(id))
        .send(body({ category: 'basic', details: {} }))
        .expect(200);
      expect(basic.body).toMatchObject({ category: 'basic', details: {} });
    });

    it('неверные поля заклинания — 400', async () => {
      const { author, url, body } = get();
      for (const details of [
        {},
        { ...fireball, level: 10 },
        { ...fireball, school: 'chronurgy' },
        { ...fireball, level: 0, ritual: true },
        { ...fireball, duration: { kind: 'permanent' } },
      ]) {
        const res = await author
          .post(url())
          .send(body(spell(details, noCosts)))
          .expect(400);
        expect((res.body as { message: string[] }).message).toContain(
          'Поля заклинания заданы неверно',
        );
      }
      // Поля заклинания у базовой — 400.
      await author
        .post(url())
        .send(body({ category: 'basic', details: fireball }))
        .expect(400);
    });

    it('ячейка не своего круга и у заговора — 400', async () => {
      const { author, url, body } = get();
      for (const [details, costs] of [
        [fireball, slot(1)],
        [fireball, slot(5)],
        [{ ...fireball, level: 0 }, slot(1)],
      ] as const) {
        const res = await author
          .post(url())
          .send(body(spell(details, costs)))
          .expect(400);
        expect((res.body as { message: string[] }).message).toContain(
          'Ячейка заклинаний должна быть круга заклинания, у заговора её нет',
        );
      }
    });

    it('испорченное заклинание из базы читается базовой', async () => {
      const { app, author, url, create } = get();
      const { id } = await create(spell(fireball));
      await app
        .get(DatabaseService)
        .db.update(abilities)
        .set({ details: { ...fireball, level: 'три' } })
        .where(eq(abilities.id, id));
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ category: 'basic', details: {} });
    });
  });
}
