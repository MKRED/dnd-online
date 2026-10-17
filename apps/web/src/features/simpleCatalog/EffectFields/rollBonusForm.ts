import {
  ROLL_BONUS_DICE_MAX,
  ROLL_BONUS_NUMBER_MAX,
  rollBonusHasAbility,
  rollBonusHasDamageType,
  rollBonusKey,
  type AbilityScore,
  type DamageDie,
  type DamageType,
  type RollBonusDetails,
  type RollBonusMode,
  type RollBonusRoll,
} from 'shared';

// Поля составляющей «Бонус к броску» в форме (shared/effectRollBonus.ts). Характеристика —
// 'all' вместо null, тип урона — 'same' вместо null: так их отдаёт Select. Числа — ''
// пока поле пустое, кость — строка.
export interface RollBonusValues {
  mode: RollBonusMode;
  roll: RollBonusRoll;
  ability: AbilityScore | 'all';
  count: number | string;
  die: string;
  number: number | string;
  damageType: DamageType | 'same';
}

// Чаще всего это +1d4, как у Bless и Guidance.
export const NEW_ROLL_BONUS: RollBonusValues = {
  mode: 'bonus',
  roll: 'attack',
  ability: 'all',
  count: 1,
  die: '4',
  number: 0,
  damageType: 'same',
};

export function toRollBonusValues(details: RollBonusDetails): RollBonusValues {
  return {
    ...details,
    ability: details.ability ?? 'all',
    die: String(details.die),
    damageType: details.damageType ?? 'same',
  };
}

// Характеристика и тип урона, выбранные для других бросков, остаются в форме, но не
// уходят: переключил обратно — они на месте.
export function fromRollBonusValues(values: RollBonusValues): RollBonusDetails {
  return {
    mode: values.mode,
    roll: values.roll,
    ability:
      rollBonusHasAbility(values.roll) && values.ability !== 'all'
        ? values.ability
        : null,
    count: Number(values.count),
    die: Number(values.die) as DamageDie,
    number: Number(values.number),
    damageType:
      rollBonusHasDamageType(values) && values.damageType !== 'same'
        ? values.damageType
        : null,
  };
}

const intUpTo = (value: number | string, max: number) => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= 0 && n <= max;
};

// Те же правила, что у сервера (isRollBonusDetails, rollBonusKey). Повтор — у выбора
// бросков второй карточки, пустая прибавка — у костей.
export const rollBonusValidate = {
  roll: (values: RollBonusValues, earlier: RollBonusValues[]) => {
    const key = rollBonusKey(fromRollBonusValues(values));
    return earlier.some(
      (other) => rollBonusKey(fromRollBonusValues(other)) === key,
    )
      ? 'Эти броски уже есть в другой карточке'
      : null;
  },
  count: (values: RollBonusValues) => {
    if (!intUpTo(values.count, ROLL_BONUS_DICE_MAX)) {
      return `От 0 до ${ROLL_BONUS_DICE_MAX}`;
    }
    return Number(values.count) === 0 && Number(values.number) === 0
      ? 'Укажите кости или число'
      : null;
  },
  number: (values: RollBonusValues) =>
    intUpTo(values.number, ROLL_BONUS_NUMBER_MAX)
      ? null
      : `От 0 до ${ROLL_BONUS_NUMBER_MAX}`,
};
