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
const poisoned = { kind: 'condition', condition: 'poisoned' };
const prone = { kind: 'condition', condition: 'prone' };
// «Палящая кара»: 1d6 огнём в начале хода.
const burn = {
  kind: 'per_turn',
  outcome: 'damage',
  damageType: 'fire',
  count: 1,
  die: 6,
  bonus: 0,
  addModifier: false,
  edge: 'start',
};
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

      it('разные состояния вместе с чувством', async () => {
        const { author, url, create } = get();
        const { id } = await create({ components: [poisoned, prone, dark] });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({
          components: [poisoned, prone, dark],
        });
      });

      it('повтор состояния, неизвестное и уровень истощения — 400', async () => {
        const { author, url, body } = get();
        for (const components of [
          [poisoned, poisoned],
          [{ kind: 'condition', condition: 'cursed' }],
          [{ kind: 'condition', condition: 'exhaustion', level: 2 }],
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

      it('урон за ход повторяется, временные хиты от модификатора', async () => {
        const { author, url, create } = get();
        const heroism = {
          ...burn,
          outcome: 'temp_hp',
          damageType: null,
          count: 0,
          addModifier: true,
        };
        const cold = { ...burn, damageType: 'cold', edge: 'end' };
        const components = [burn, cold, burn, heroism];
        const { id } = await create({ components });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ components });
      });

      it('урон без типа, лечение с типом, пустая сумма и d20 — 400', async () => {
        const { author, url, body } = get();
        for (const component of [
          { ...burn, damageType: null },
          { ...burn, outcome: 'healing' },
          { ...burn, count: 0 },
          { ...burn, die: 20 },
        ]) {
          const res = await author
            .post(url())
            .send(body({ components: [component] }))
            .expect(400);
          expect(messages(res)[0]).toMatch(
            /^Составляющие эффекта заданы неверно/,
          );
        }
      });

      it('сопротивление нескольким типам, иммунитет к урону и состоянию', async () => {
        const { author, url, create } = get();
        const stoneskin = {
          kind: 'defense',
          level: 'resistance',
          damageTypes: ['bludgeoning', 'piercing', 'slashing'],
          conditions: [],
        };
        const mindBlank = {
          kind: 'defense',
          level: 'immunity',
          damageTypes: ['psychic'],
          conditions: ['charmed'],
        };
        const { id } = await create({ components: [stoneskin, mindBlank] });
        const card = await author.get(url(id)).expect(200);
        expect(card.body).toMatchObject({ components: [stoneskin, mindBlank] });
      });

      it('пустая защита, состояние у сопротивления, повтор типа — 400', async () => {
        const { author, url, body } = get();
        const fire = {
          kind: 'defense',
          level: 'resistance',
          damageTypes: ['fire'],
          conditions: [],
        };
        for (const components of [
          [{ ...fire, damageTypes: [] }],
          [{ ...fire, conditions: ['charmed'] }],
          [fire, { ...fire, damageTypes: ['cold', 'fire'] }],
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
