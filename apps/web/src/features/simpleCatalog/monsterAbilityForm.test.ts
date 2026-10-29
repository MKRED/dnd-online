import { NO_ABILITY_COSTS } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  fromMonsterAbilityValues,
  monsterAbilityValidate,
  toMonsterAbilityValues,
} from './monsterAbilityForm';

// «Ограничение» монстра в форме (docs/plan/ability-categories.md, вариант 1А).
describe('monsterAbilityForm', () => {
  it('читает «N/день» и перезарядку, старую запись — с её перезарядкой', () => {
    const perDay = toMonsterAbilityValues(
      { recharge: null },
      {
        ...NO_ABILITY_COSTS,
        uses: { count: { kind: 'fixed', amount: 3 }, recovery: 'long' },
      },
    );
    expect(fromMonsterAbilityValues(perDay)).toEqual({
      kind: 'per_day',
      amount: 3,
    });
    // Заряды вместе с перезарядкой (до миграции 0065) — открывается перезарядкой.
    const legacy = toMonsterAbilityValues(
      { recharge: 5 },
      {
        ...NO_ABILITY_COSTS,
        uses: { count: { kind: 'proficiency' }, recovery: 'long' },
      },
    );
    expect(fromMonsterAbilityValues(legacy)).toEqual({
      kind: 'recharge',
      from: 5,
    });
  });

  it('проверяет «N/день», только когда оно выбрано у монстра', () => {
    const values = toMonsterAbilityValues();
    const perDay = { ...values, limit: 'per_day' as const };
    expect(
      monsterAbilityValidate.perDay('', {
        category: 'monster',
        monster: perDay,
      }),
    ).toBe('От 1 до 99');
    expect(
      monsterAbilityValidate.perDay('', {
        category: 'feature',
        monster: perDay,
      }),
    ).toBeNull();
    expect(
      monsterAbilityValidate.perDay('', {
        category: 'monster',
        monster: values,
      }),
    ).toBeNull();
  });
});
