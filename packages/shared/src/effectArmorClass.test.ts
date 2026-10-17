import { describe, expect, it } from 'vitest';
import {
  formatArmorClass,
  isArmorClassDetails,
  type ArmorClassDetails,
} from './effectArmorClass.js';
import { totalArmorClass } from './effectArmorClassTotal.js';
import {
  formatEffectComponent,
  isEffectComponents,
  type EffectComponent,
} from './effectComponents.js';
import type { AppliedEffect } from './effectSpeedTotal.js';

const ac = (details: ArmorClassDetails): EffectComponent => ({
  kind: 'armor_class',
  ...details,
});
const faith = ac({ change: 'bonus', value: 2 });
const slow = ac({ change: 'penalty', value: 2 });
const barkskin = ac({ change: 'minimum', value: 17 });
const mageArmor = ac({ change: 'base', value: 13 });
const applied = (source: string, ...components: EffectComponent[]) =>
  ({ source, components }) satisfies AppliedEffect;

describe('effectArmorClass', () => {
  it('у каждого изменения свои пределы', () => {
    const good: ArmorClassDetails[] = [
      { change: 'bonus', value: 5 },
      { change: 'penalty', value: 1 },
      { change: 'minimum', value: 17 },
      { change: 'base', value: 13 },
    ];
    for (const value of good) expect(isArmorClassDetails(value)).toBe(true);
    const bad = [
      { change: 'bonus', value: 0 },
      { change: 'bonus', value: 11 },
      { change: 'bonus', value: 1.5 },
      { change: 'minimum', value: 5 },
      { change: 'base', value: 21 },
      { change: 'formula', value: 13 },
      { change: 'bonus' },
      { change: 'bonus', value: 2, extra: 1 },
      null,
    ];
    for (const value of bad) expect(isArmorClassDetails(value)).toBe(false);
  });

  it('один сдвиг, одно «не ниже» и одна база в эффекте', () => {
    expect(isEffectComponents([faith, barkskin, mageArmor])).toBe(true);
    expect(isEffectComponents([faith, slow])).toBe(false);
    expect(isEffectComponents([barkskin, barkskin])).toBe(false);
  });

  it('строка карточки', () => {
    expect(formatEffectComponent(faith)).toBe('КД +2');
    expect(formatArmorClass({ change: 'penalty', value: 2 })).toBe('КД −2');
    expect(formatEffectComponent(barkskin)).toBe('КД не ниже 17');
    expect(formatEffectComponent(mageArmor)).toBe(
      'Базовый КД 13 + модификатор Ловкости',
    );
  });
});

describe('totalArmorClass', () => {
  // КД 14 без эффектов, Ловкость 16 (+3).
  const base = { armorClass: 14, dexterity: 16 };

  it('бонусы и штрафы разных эффектов складываются', () => {
    expect(totalArmorClass(base, [])).toBe(14);
    expect(
      totalArmorClass(base, [applied('faith', faith), applied('haste', faith)]),
    ).toBe(18);
    expect(
      totalArmorClass(base, [applied('haste', faith), applied('slow', slow)]),
    ).toBe(14);
  });

  it('одно заклинание дважды не складывается', () => {
    expect(
      totalArmorClass(base, [applied('faith', faith), applied('faith', faith)]),
    ).toBe(16);
  });

  it('«не ниже» — последним, по итогу с бонусами', () => {
    expect(
      totalArmorClass(base, [
        applied('barkskin', barkskin),
        applied('faith', faith),
      ]),
    ).toBe(17);
    expect(
      totalArmorClass({ armorClass: 16, dexterity: 10 }, [
        applied('barkskin', barkskin),
        applied('faith', faith),
      ]),
    ).toBe(18);
  });

  it('база эффекта — если больше числа формы', () => {
    expect(totalArmorClass(base, [applied('mage', mageArmor)])).toBe(16);
    expect(
      totalArmorClass({ armorClass: 18, dexterity: 16 }, [
        applied('mage', mageArmor),
      ]),
    ).toBe(18);
    expect(
      totalArmorClass(base, [
        applied('mage', mageArmor),
        applied('faith', faith),
      ]),
    ).toBe(18);
  });
});
