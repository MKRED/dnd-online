import {
  CONDITION_LABELS,
  DAMAGE_TYPE_LABELS,
  DEFENSE_LEVEL_LABELS,
  type ConditionKind,
  type DamageType,
  type DefenseDetails,
  type DefenseLevel,
} from 'shared';

// Поля составляющей «Сопротивление и иммунитет» в форме (shared/effectDefenses.ts).
export interface DefenseValues {
  level: DefenseLevel;
  damageTypes: DamageType[];
  conditions: ConditionKind[];
}

// Чаще всего это сопротивление, как у Protection from Energy.
export const NEW_DEFENSE: DefenseValues = {
  level: 'resistance',
  damageTypes: [],
  conditions: [],
};

// Состояния, выбранные у иммунитета, уходят только с иммунитетом: переключил на
// сопротивление — они в форме остаются, но в запрос не идут.
export function fromDefenseValues(values: DefenseValues): DefenseDetails {
  return {
    level: values.level,
    damageTypes: values.damageTypes,
    conditions: values.level === 'immunity' ? values.conditions : [],
  };
}

// Пустую составляющую и повтор отмечаем у типов урона: это поле есть у всех уровней.
// earlier — составляющие «Сопротивления и иммунитета» выше этой в списке.
export function defenseDamageTypesError(
  values: DefenseValues,
  earlier: DefenseValues[],
): string | null {
  const { damageTypes, conditions } = fromDefenseValues(values);
  if (damageTypes.length + conditions.length === 0) {
    return values.level === 'immunity'
      ? 'Выберите тип урона или состояние'
      : 'Выберите хотя бы один тип урона';
  }
  const taken = new Set(
    earlier
      .filter((other) => other.level === values.level)
      .flatMap((other) => {
        const details = fromDefenseValues(other);
        return [...details.damageTypes, ...details.conditions];
      }),
  );
  const twice = [...damageTypes, ...conditions].find((item) => taken.has(item));
  if (!twice) return null;
  const label =
    twice in DAMAGE_TYPE_LABELS
      ? DAMAGE_TYPE_LABELS[twice as DamageType]
      : CONDITION_LABELS[twice as ConditionKind];
  return `«${label}» уже есть в другой карточке «${DEFENSE_LEVEL_LABELS[values.level]}»`;
}
