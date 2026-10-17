import { describe, expect, it } from 'vitest';
import {
  formatEffectComponent,
  isEffectComponents,
  type EffectComponent,
} from './effectComponents.js';
import {
  formatRollBonus,
  isRollBonusDetails,
  type RollBonusDetails,
} from './effectRollBonus.js';

// Bless: +1d4 к атакам и спасброскам — две составляющие.
const blessAttack: RollBonusDetails = {
  mode: 'bonus',
  roll: 'attack',
  ability: null,
  count: 1,
  die: 4,
  number: 0,
  damageType: null,
};
const blessSave: RollBonusDetails = { ...blessAttack, roll: 'save' };
const slow: RollBonusDetails = {
  ...blessAttack,
  mode: 'penalty',
  roll: 'save',
  ability: 'dexterity',
  count: 0,
  number: 2,
};
const divineFavor: RollBonusDetails = {
  ...blessAttack,
  roll: 'damage',
  damageType: 'radiant',
};
const bonus = (details: RollBonusDetails): EffectComponent => ({
  kind: 'roll_bonus',
  ...details,
});

describe('effectRollBonus', () => {
  it('характеристика — у спасбросков и проверок, тип — у прибавки к урону', () => {
    const good = [
      blessAttack,
      slow,
      divineFavor,
      { ...blessAttack, roll: 'check', ability: 'wisdom' },
      { ...blessAttack, roll: 'damage', mode: 'penalty', die: 8 },
      { ...blessAttack, roll: 'd20', count: 2, number: 1 },
    ];
    for (const value of good) expect(isRollBonusDetails(value)).toBe(true);
    const bad = [
      { ...blessAttack, ability: 'strength' },
      { ...slow, ability: 'luck' },
      { ...blessAttack, damageType: 'fire' },
      { ...divineFavor, mode: 'penalty' },
      { ...divineFavor, damageType: 'mud' },
      { ...blessAttack, count: 0 },
      { ...blessAttack, count: 11 },
      { ...blessAttack, number: 21 },
      { ...blessAttack, die: 20 },
      { ...blessAttack, roll: 'attacked' },
      { ...blessAttack, extra: 1 },
      null,
    ];
    for (const value of bad) expect(isRollBonusDetails(value)).toBe(false);
  });

  it('одни и те же броски — один раз в эффекте', () => {
    expect(
      isEffectComponents([
        bonus(blessAttack),
        bonus(blessSave),
        bonus(slow),
        bonus(divineFavor),
      ]),
    ).toBe(true);
    expect(
      isEffectComponents([
        bonus(blessAttack),
        bonus({ ...blessAttack, mode: 'penalty' }),
      ]),
    ).toBe(false);
  });

  it('строка карточки', () => {
    expect(formatEffectComponent(bonus(blessAttack))).toBe(
      '+1d4 к своим броскам атаки',
    );
    expect(formatRollBonus(slow)).toBe('−2 к спасброскам Ловкости');
    expect(formatRollBonus(divineFavor)).toBe(
      '+1d4 к своему урону (Излучение)',
    );
    expect(
      formatRollBonus({ ...blessAttack, roll: 'check', count: 2, number: 1 }),
    ).toBe('+(2d4 + 1) к проверкам характеристик');
  });
});
