import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../src/database/database.service.js';
import { abilities } from '../../src/database/schema/index.js';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// Пассивная черта (docs/plan/done/traits.md): активация «Черта» у «Базовой» и «Монстра»,
// её составляющие (passive) — как у эффекта и только у черты.

const darkvision = { kind: 'sense', sense: 'darkvision', range: 120 };
const resistance = {
  kind: 'defense',
  level: 'resistance',
  damageTypes: ['poison'],
  conditions: [],
};
const trait = (passive: object[]) => ({
  activation: { kind: 'trait' },
  passive,
});
const spell = {
  category: 'spell',
  details: {
    level: 0,
    school: 'evocation',
    components: '',
    ritual: false,
    duration: { kind: 'instant' },
  },
};

const messages = (res: { body: unknown }) =>
  (res.body as { message: string[] }).message;

export function describeAbilityTraits(get: () => CatalogContext): void {
  describe('черта', () => {
    it('у базовой сохраняется с составляющими и читается', async () => {
      const { author, url, create, body } = get();
      const { id } = await create(trait([darkvision, resistance]));
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({
        category: 'basic',
        ...trait([darkvision, resistance]),
      });
      // Без составляющих — всё в описании, как у черт монстров до них.
      const plain = await author
        .put(url(id))
        .send(body({ activation: { kind: 'trait' } }))
        .expect(200);
      expect(plain.body).toMatchObject(trait([]));
    });

    it('у монстра тоже бывает с составляющими', async () => {
      const { create } = get();
      const saved = await create({
        category: 'monster',
        details: { recharge: null },
        ...trait([resistance]),
      });
      expect(saved).toMatchObject(trait([resistance]));
    });

    it('составляющие не у черты — 400', async () => {
      const { author, url, body } = get();
      const res = await author
        .post(url())
        .send(body({ passive: [darkvision] }))
        .expect(400);
      expect(messages(res)).toContain('Составляющие бывают только у черты');
      // Пустой список подходит любой активации.
      await author
        .post(url())
        .send(body({ passive: [] }))
        .expect(201);
    });

    it('неверные составляющие — 400', async () => {
      const { author, url, body } = get();
      for (const passive of [
        [{ kind: 'aura' }],
        [{ ...darkvision, range: 62 }],
        [darkvision, darkvision],
        'тёмное зрение',
      ]) {
        const res = await author
          .post(url())
          .send(body({ activation: { kind: 'trait' }, passive }))
          .expect(400);
        expect(messages(res)).toContain('Составляющие черты заданы неверно');
      }
    });

    it('черта у заклинания — 400', async () => {
      const { author, url, body } = get();
      const res = await author
        .post(url())
        .send(body({ ...spell, ...trait([]) }))
        .expect(400);
      expect(messages(res)).toContain(
        'Легендарное действие бывает только у способности монстра, черта — у базовой способности и способности монстра',
      );
    });

    it('составляющие из базы у не-черты не читаются', async () => {
      const { app, author, url, create } = get();
      const { id } = await create();
      await app
        .get(DatabaseService)
        .db.update(abilities)
        .set({
          extra: {
            activation: { kind: 'action' },
            costs: {
              uses: null,
              spellSlot: null,
              movement: null,
              hitDie: false,
            },
            steps: [],
            passive: [darkvision],
          },
        })
        .where(eq(abilities.id, id));
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ passive: [] });
    });
  });
}
