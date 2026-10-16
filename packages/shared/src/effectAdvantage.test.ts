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
};
const blur: AdvantageDetails = {
  mode: 'disadvantage',
  roll: 'attacked',
  ability: null,
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
      { mode: 'disadvantage', roll: 'check', ability: 'strength' },
      { mode: 'advantage', roll: 'save', ability: null },
      { mode: 'advantage', roll: 'd20', ability: null },
    ];
    for (const value of good) expect(isAdvantageDetails(value)).toBe(true);
    const bad = [
      { ...blur, ability: 'dexterity' },
      { ...haste, ability: 'luck' },
      { ...haste, mode: 'both' },
      { ...haste, roll: 'damage' },
      { mode: 'advantage', roll: 'save' },
      { ...haste, extra: 1 },
      null,
    ];
    for (const value of bad) expect(isAdvantageDetails(value)).toBe(false);
  });

  it('одни и те же броски — один раз, даже с другим знаком', () => {
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
  });

  it('строка карточки', () => {
    expect(formatAdvantage(haste)).toBe('Преимущество на спасброски Ловкости');
    expect(formatEffectComponent(advantage(blur))).toBe(
      'Помеха на броски атаки по носителю',
    );
    expect(
      formatAdvantage({ mode: 'disadvantage', roll: 'check', ability: null }),
    ).toBe('Помеха на проверки характеристик');
    expect(
      formatAdvantage({ mode: 'advantage', roll: 'd20', ability: null }),
    ).toBe('Преимущество на все Тесты к20');
  });
});
