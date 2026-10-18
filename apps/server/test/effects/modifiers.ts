import { describe, expect, it } from 'vitest';
import type { CatalogContext } from '../support/catalog-scenario/index.js';

// Составляющие этапа 7 плана эффектов (docs/plan/done/effects.md): изменение характеристик.
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
        when: null,
      };
      const blur = {
        kind: 'advantage',
        mode: 'disadvantage',
        roll: 'attacked',
        ability: null,
        when: null,
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
        when: null,
      };
      for (const components of [
        [{ ...haste, roll: 'attack' }],
        [{ ...haste, ability: 'luck' }],
        [haste, { ...haste, mode: 'disadvantage' }],
        [{ ...haste, when: 'within_5ft' }],
        [{ ...haste, roll: 'initiative', ability: null, when: 'vs_source' }],
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

    // Опрокинутый: по нему в 5 фт. с преимуществом, дальше — с помехой; условие различает
    // броски. Инициатива — новый пункт «На какие броски».
    it('преимущество с условием: Опрокинутый и инициатива', async () => {
      const { author, url, create } = get();
      const near = {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'attacked',
        ability: null,
        when: 'within_5ft',
      };
      const components = [
        near,
        { ...near, mode: 'disadvantage', when: 'beyond_5ft' },
        { ...near, roll: 'initiative', when: null },
      ];
      const { id } = await create({ components });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components });
    });

    // Парализованный: автопровал спасбросков Силы и Ловкости; Ослеплённый — проверок,
    // где нужно зрение.
    it('автопровал: Парализованный и Ослеплённый', async () => {
      const { author, url, create } = get();
      const save = { kind: 'auto_fail', roll: 'save', ability: 'strength' };
      const components = [
        save,
        { ...save, ability: 'dexterity' },
        { kind: 'auto_fail', roll: 'sight_check', ability: null },
      ];
      const { id } = await create({ components });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components });
    });

    // Щит веры, Дубовая кора и Доспехи мага в одном эффекте: сдвиг, «не ниже» и база.
    it('КД: бонус, «не ниже» и база', async () => {
      const { author, url, create } = get();
      const components = [
        { kind: 'armor_class', change: 'bonus', value: 2 },
        { kind: 'armor_class', change: 'minimum', value: 17 },
        { kind: 'armor_class', change: 'base', value: 13 },
      ];
      const { id } = await create({ components });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components });
    });

    it('КД: число вне пределов, неизвестное изменение, два сдвига — 400', async () => {
      const { author, url, body } = get();
      const faith = { kind: 'armor_class', change: 'bonus', value: 2 };
      for (const components of [
        [{ ...faith, value: 11 }],
        [{ ...faith, value: 1.5 }],
        [{ ...faith, change: 'minimum', value: 5 }],
        [{ ...faith, change: 'formula' }],
        [faith, { ...faith, change: 'penalty' }],
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

    // Благословение (атаки и спасброски), Замедление (−2 к спасброскам Ловкости),
    // Божественное благоволение (+1d4 урона Излучением).
    const bless = {
      kind: 'roll_bonus',
      mode: 'bonus',
      roll: 'attack',
      ability: null,
      count: 1,
      die: 4,
      number: 0,
      damageType: null,
    };
    it('бонус к броску: Благословение, Замедление, урон Излучением', async () => {
      const { author, url, create } = get();
      const components = [
        bless,
        { ...bless, roll: 'save' },
        {
          ...bless,
          mode: 'penalty',
          roll: 'save',
          ability: 'dexterity',
          count: 0,
          number: 2,
        },
        { ...bless, roll: 'damage', damageType: 'radiant' },
      ];
      const { id } = await create({ components });
      const card = await author.get(url(id)).expect(200);
      expect(card.body).toMatchObject({ components });
    });

    it('бонус к броску: пустой, характеристика у атак, тип у вычета, повтор — 400', async () => {
      const { author, url, body } = get();
      for (const components of [
        [{ ...bless, count: 0 }],
        [{ ...bless, ability: 'strength' }],
        [{ ...bless, roll: 'damage', mode: 'penalty', damageType: 'fire' }],
        [{ ...bless, die: 20 }],
        [bless, { ...bless, mode: 'penalty' }],
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

    it('автопровал: характеристика у проверок, повтор — 400', async () => {
      const { author, url, body } = get();
      const save = { kind: 'auto_fail', roll: 'save', ability: 'strength' };
      for (const components of [
        [{ ...save, roll: 'hearing_check' }],
        [{ ...save, ability: 'luck' }],
        [save, save],
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
