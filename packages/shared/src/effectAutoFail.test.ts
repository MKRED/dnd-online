import { describe, expect, it } from 'vitest';
import {
  formatAutoFail,
  isAutoFailDetails,
  type AutoFailDetails,
} from './effectAutoFail.js';
import {
  formatEffectComponent,
  isEffectComponents,
  type EffectComponent,
} from './effectComponents.js';

// Парализованный: автопровал спасбросков Силы и Ловкости — две составляющие.
const strength: AutoFailDetails = { roll: 'save', ability: 'strength' };
const dexterity: AutoFailDetails = { roll: 'save', ability: 'dexterity' };
const blinded: AutoFailDetails = { roll: 'sight_check', ability: null };
const autoFail = (details: AutoFailDetails): EffectComponent => ({
  kind: 'auto_fail',
  ...details,
});

describe('effectAutoFail', () => {
  it('характеристика — только у спасбросков', () => {
    const good: AutoFailDetails[] = [
      strength,
      blinded,
      { roll: 'save', ability: null },
      { roll: 'hearing_check', ability: null },
    ];
    for (const value of good) expect(isAutoFailDetails(value)).toBe(true);
    const bad = [
      { ...blinded, ability: 'wisdom' },
      { ...strength, ability: 'luck' },
      { ...strength, roll: 'attack' },
      { roll: 'save' },
      { ...strength, extra: 1 },
      null,
    ];
    for (const value of bad) expect(isAutoFailDetails(value)).toBe(false);
  });

  it('одни и те же броски — один раз', () => {
    expect(
      isEffectComponents([
        autoFail(strength),
        autoFail(dexterity),
        autoFail({ roll: 'save', ability: null }),
        autoFail(blinded),
      ]),
    ).toBe(true);
    expect(isEffectComponents([autoFail(strength), autoFail(strength)])).toBe(
      false,
    );
  });

  it('строка карточки', () => {
    expect(formatEffectComponent(autoFail(strength))).toBe(
      'Автопровал спасбросков Силы',
    );
    expect(formatAutoFail({ roll: 'save', ability: null })).toBe(
      'Автопровал всех спасбросков',
    );
    expect(formatAutoFail(blinded)).toBe(
      'Автопровал проверок, где нужно зрение',
    );
    expect(formatAutoFail({ roll: 'hearing_check', ability: null })).toBe(
      'Автопровал проверок, где нужен слух',
    );
  });
});
