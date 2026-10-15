import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database/database.service.js';
import { effects } from '../src/database/schema/index.js';
import { describeCatalog } from './support/catalog-scenario/index.js';

const duration = {
  kind: 'time',
  amount: 2,
  unit: 'round',
  concentration: false,
};
const dark = { kind: 'sense', sense: 'darkvision', range: 60 };
const messages = (res: { body: unknown }) =>
  (res.body as { message: string[] }).message;

describeCatalog(
  {
    path: 'effects',
    body: {
      name: 'Горение',
      components: [],
      description: 'тест',
      isPublic: false,
      duration,
      saveEnds: null,
    },
    invalid: { components: [{ kind: 'aura' }] },
  },
  (get) => {
    describe('длительность и снятие спасброском', () => {
      it('сохраняются и возвращаются в карточке', async () => {
        const { author, url, create } = get();
        const saveEnds = { ability: 'constitution', edge: 'start' };
        const { id } = await create({ saveEnds });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ duration, saveEnds });
        const plain = await create();
        const plainCard = await author.get(url(plain.id)).expect(200);
        expect(plainCard.body).toMatchObject({ saveEnds: null });
      });

      it('без полей или с неверными — 400', async () => {
        const { author, url, body } = get();
        for (const over of [
          { duration: undefined },
          { duration: { ...duration, amount: 0 } },
          { saveEnds: undefined },
          { saveEnds: { ability: 'luck', edge: 'end' } },
        ]) {
          await author.post(url()).send(body(over)).expect(400);
        }
      });
    });

    describe('составляющие', () => {
      it('два чувства в одном эффекте, затем пустой список', async () => {
        const { author, url, body, create } = get();
        const invisible = {
          kind: 'sense',
          sense: 'see_invisible',
          range: null,
        };
        const { id } = await create({ components: [dark, invisible] });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ components: [dark, invisible] });
        expect(card.body).not.toHaveProperty('category');
        const edited = await author
          .put(url(id))
          .send(body({ components: [] }))
          .expect(200);
        expect(edited.body).toMatchObject({ components: [] });
      });

      it('повтор чувства, неверная дистанция, лишние и без списка — 400', async () => {
        const { author, url, body } = get();
        const many = Array.from({ length: 21 }, () => dark);
        for (const components of [
          [dark, { ...dark, range: 120 }],
          [{ ...dark, range: 62 }],
          many,
          undefined,
        ]) {
          const res = await author
            .post(url())
            .send(body({ components }))
            .expect(400);
          expect(messages(res)[0]).toMatch(
            /^Составляющие эффекта заданы неверно/,
          );
        }
      });

      // Старое тело с категорией: category и details отбрасываются, а без составляющих
      // запрос не проходит.
      it('тело старого вида с категорией — 400', async () => {
        const { author, url, body } = get();
        const res = await author
          .post(url())
          .send(
            body({
              category: 'sense',
              details: { sense: 'darkvision', range: 60 },
              components: undefined,
            }),
          )
          .expect(400);
        expect(messages(res)).toHaveLength(1);
      });

      it('эффект категории «Чувство» до составляющих читается одной составляющей', async () => {
        const { app, author, url, create } = get();
        const { id } = await create();
        await app
          .get(DatabaseService)
          .db.update(effects)
          .set({
            category: 'sense',
            details: { sense: 'darkvision', range: 60 },
          })
          .where(eq(effects.id, id));
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ components: [dark] });
      });
    });
  },
);
