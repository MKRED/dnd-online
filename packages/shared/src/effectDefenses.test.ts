import { describe, expect, it } from 'vitest';
import { isEffectComponents } from './effectComponents.js';
import {
  formatDefense,
  isDefenseDetails,
  type DefenseDetails,
} from './effectDefenses.js';

// Stoneskin: сопротивление трём физическим типам.
const stoneskin: DefenseDetails = {
  level: 'resistance',
  damageTypes: ['bludgeoning', 'piercing', 'slashing'],
  conditions: [],
};

describe('effectDefenses', () => {
  it('принимает сопротивление типам и иммунитет к урону и состояниям', () => {
    expect(isDefenseDetails(stoneskin)).toBe(true);
    expect(
      isDefenseDetails({
        level: 'immunity',
        damageTypes: ['psychic'],
        conditions: ['charmed'],
      }),
    ).toBe(true);
    expect(
      isDefenseDetails({
        level: 'immunity',
        damageTypes: [],
        conditions: ['frightened'],
      }),
    ).toBe(true);
  });

  it('состояния — только у иммунитета; пустое, повторы и чужое не пускает', () => {
    const bad = [
      { ...stoneskin, conditions: ['charmed'] },
      { ...stoneskin, damageTypes: [] },
      { ...stoneskin, damageTypes: ['fire', 'fire'] },
      { ...stoneskin, damageTypes: ['holy'] },
      { ...stoneskin, level: 'immunity', conditions: ['cursed'] },
      { ...stoneskin, level: 'halved' },
      { ...stoneskin, damageTypes: 'fire' },
      { level: 'resistance', damageTypes: ['fire'] },
      null,
    ];
    for (const value of bad) expect(isDefenseDetails(value)).toBe(false);
  });

  it('в эффекте тип урона на одном уровне — один раз, на разных — можно', () => {
    const fire = (level: string) => ({
      kind: 'defense',
      level,
      damageTypes: ['fire'],
      conditions: [],
    });
    expect(isEffectComponents([fire('resistance'), fire('resistance')])).toBe(
      false,
    );
    expect(
      isEffectComponents([fire('resistance'), fire('vulnerability')]),
    ).toBe(true);
    expect(
      isEffectComponents([
        { kind: 'defense', ...stoneskin },
        fire('resistance'),
      ]),
    ).toBe(true);
  });

  it('строка карточки', () => {
    expect(formatDefense(stoneskin)).toBe(
      'Сопротивление: Дробящий, Колющий, Рубящий',
    );
    expect(
      formatDefense({
        level: 'immunity',
        damageTypes: ['psychic'],
        conditions: ['charmed'],
      }),
    ).toBe('Иммунитет: Психический, Очарованный');
  });
});
