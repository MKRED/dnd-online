import { describe, expect, it } from 'vitest';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// Составляющие этапа 7 плана эффектов (docs/plan/effects.md): изменение характеристик.
// Отдельным файлом, чтобы effects.e2e-spec.ts не рос с каждым видом.

// «Палящая кара»: 1d6 огнём в начале хода.
export const burn = {
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

export function describeEffectModifiers(get: () => CatalogContext): void {
  describe('изменение характеристик', () => {
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

    it('запрет лечения: принимается, дважды и с полями — 400', async () => {
      const { author, url, body, create } = get();
      const noHealing = { kind: 'no_healing' };
      const { id } = await create({ components: [noHealing, burn] });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components: [noHealing, burn] });
      for (const components of [
        [noHealing, noHealing],
        [{ ...noHealing, turns: 1 }],
      ]) {
        await author.post(url()).send(body({ components })).expect(400);
      }
    });

    it('скорость: изменение и особые скорости вместе', async () => {
      const { author, url, create } = get();
      const longstrider = {
        kind: 'speed',
        change: 'faster',
        feet: 10,
        hover: false,
      };
      const fly = { kind: 'speed', change: 'fly', feet: 60, hover: true };
      const spiderClimb = {
        kind: 'speed',
        change: 'climb',
        feet: null,
        hover: false,
      };
      const components = [longstrider, fly, spiderClimb];
      const { id } = await create({ components });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components });
    });

    it('скорость: футы не кратны 5, парение не у полёта, два изменения — 400', async () => {
      const { author, url, body } = get();
      const slow = { kind: 'speed', change: 'slower', feet: 10, hover: false };
      for (const components of [
        [{ ...slow, feet: 12 }],
        [{ ...slow, hover: true }],
        [{ ...slow, change: 'half' }],
        [slow, { ...slow, change: 'double', feet: null }],
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

    it('преимущество и помеха: Enlarge и Blur вместе', async () => {
      const { author, url, create } = get();
      const strength = {
        kind: 'advantage',
        mode: 'advantage',
        ability: 'strength',
      };
      const blur = {
        kind: 'advantage',
        mode: 'disadvantage',
        roll: 'attacked',
        ability: null,
      };
      const components = [
        { ...strength, roll: 'check' },
        { ...strength, roll: 'save' },
        blur,
      ];
      const { id } = await create({ components });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components });
    });

    it('преимущество: характеристика у атак, те же броски с другим знаком — 400', async () => {
      const { author, url, body } = get();
      const haste = {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'save',
        ability: 'dexterity',
      };
      for (const components of [
        [{ ...haste, roll: 'attack' }],
        [{ ...haste, ability: 'luck' }],
        [haste, { ...haste, mode: 'disadvantage' }],
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
  });
}
