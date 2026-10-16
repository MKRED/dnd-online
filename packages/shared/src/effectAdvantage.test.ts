import { describe, expect, it } from 'vitest';
import {
  formatAdvantage,
  isAdvantageDetails,
  type AdvantageDetails,
} from './effectAdvantage.js';
import {
  formatEffectComponent,
  isEffectComponents,
  type EffectComponent,
} from './effectComponents.js';

// Haste: преимущество на спасброски Ловкости.
const haste: AdvantageDetails = {
  mode: 'advantage',
  roll: 'save',
  ability: 'dexterity',
  when: null,
};
const blur: AdvantageDetails = {
  mode: 'disadvantage',
  roll: 'attacked',
  ability: null,
  when: null,
};
// Опрокинутый: атаки по нему в 5 фт. с преимуществом, дальше — с помехой.
const proneNear: AdvantageDetails = {
  mode: 'advantage',
  roll: 'attacked',
  ability: null,
  when: 'within_5ft',
};
const proneFar: AdvantageDetails = {
  ...proneNear,
  mode: 'disadvantage',
  when: 'beyond_5ft',
};
const advantage = (details: AdvantageDetails): EffectComponent => ({
  kind: 'advantage',
  ...details,
});

describe('effectAdvantage', () => {
  it('принимает броски из книги, характеристика — только у спасбросков и проверок', () => {
    const good: AdvantageDetails[] = [
      haste,
      blur,
      proneNear,
      { mode: 'disadvantage', roll: 'check', ability: 'strength', when: null },
      { mode: 'advantage', roll: 'save', ability: null, when: null },
      { mode: 'advantage', roll: 'd20', ability: null, when: null },
      { mode: 'disadvantage', roll: 'initiative', ability: null, when: null },
    ];
    for (const value of good) expect(isAdvantageDetails(value)).toBe(true);
    const bad = [
      { ...blur, ability: 'dexterity' },
      { ...haste, ability: 'luck' },
      { ...haste, mode: 'both' },
      { ...haste, roll: 'damage' },
      { ...blur, roll: 'initiative', ability: 'dexterity' },
      { mode: 'advantage', roll: 'save', ability: null },
      { ...haste, extra: 1 },
      null,
    ];
    for (const value of bad) expect(isAdvantageDetails(value)).toBe(false);
  });

  it('условие — только из списка своего броска', () => {
    const good: AdvantageDetails[] = [
      proneFar,
      { ...blur, when: 'attacker_sees' },
      { ...blur, roll: 'attack', when: 'not_vs_source' },
      { ...blur, roll: 'attack', when: 'vs_source' },
      { ...blur, roll: 'check', when: 'source_in_sight' },
    ];
    for (const value of good) expect(isAdvantageDetails(value)).toBe(true);
    const bad = [
      { ...haste, when: 'within_5ft' },
      { ...blur, roll: 'attack', when: 'attacker_sees' },
      { ...blur, roll: 'initiative', when: 'source_in_sight' },
      { ...blur, when: 'sometimes' },
      { ...blur, when: undefined },
    ];
    for (const value of bad) expect(isAdvantageDetails(value)).toBe(false);
  });

  it('одни и те же броски с тем же условием — один раз, даже с другим знаком', () => {
    const allSaves = advantage({ ...haste, ability: null });
    expect(isEffectComponents([advantage(haste), allSaves])).toBe(true);
    expect(
      isEffectComponents([
        advantage(haste),
        advantage({ ...haste, roll: 'check' }),
      ]),
    ).toBe(true);
    expect(
      isEffectComponents([
        advantage(haste),
        advantage({ ...haste, mode: 'disadvantage' }),
      ]),
    ).toBe(false);
    expect(
      isEffectComponents([advantage(proneNear), advantage(proneFar)]),
    ).toBe(true);
    expect(
      isEffectComponents([
        advantage(proneNear),
        advantage({ ...proneNear, mode: 'disadvantage' }),
      ]),
    ).toBe(false);
  });

  it('строка карточки', () => {
    expect(formatAdvantage(haste)).toBe('Преимущество на спасброски Ловкости');
    expect(formatEffectComponent(advantage(blur))).toBe(
      'Помеха на броски атаки по носителю',
    );
    expect(
      formatAdvantage({
        mode: 'disadvantage',
        roll: 'check',
        ability: null,
        when: null,
      }),
    ).toBe('Помеха на проверки характеристик');
    expect(
      formatAdvantage({
        mode: 'advantage',
        roll: 'd20',
        ability: null,
        when: null,
      }),
    ).toBe('Преимущество на все Тесты к20');
    expect(formatAdvantage({ ...blur, roll: 'initiative' })).toBe(
      'Помеха на инициативу',
    );
    expect(formatAdvantage(proneFar)).toBe(
      'Помеха на броски атаки по носителю, если атакующий дальше 5 фт.',
    );
    expect(
      formatAdvantage({ ...blur, roll: 'attack', when: 'vs_source' }),
    ).toBe('Помеха на свои броски атаки только по наложившему');
    expect(
      formatAdvantage({ ...blur, roll: 'attack', when: 'not_vs_source' }),
    ).toBe('Помеха на свои броски атаки, кроме как по наложившему');
    expect(
      formatAdvantage({ ...blur, roll: 'check', when: 'source_in_sight' }),
    ).toBe(
      'Помеха на проверки характеристик, пока наложивший в поле зрения носителя',
    );
  });
});
