import {
  advantageHasAbility,
  advantageKey,
  type AbilityScore,
  type AdvantageDetails,
  type AdvantageMode,
  type AdvantageRoll,
} from 'shared';

// Поля составляющей «Преимущество или помеха» в форме (shared/effectAdvantage.ts).
// Характеристика — 'all' вместо null: так её отдаёт Select.
export interface AdvantageValues {
  mode: AdvantageMode;
  roll: AdvantageRoll;
  ability: AbilityScore | 'all';
}

export const NEW_ADVANTAGE: AdvantageValues = {
  mode: 'advantage',
  roll: 'attack',
  ability: 'all',
};

export function toAdvantageValues(details: AdvantageDetails): AdvantageValues {
  return { ...details, ability: details.ability ?? 'all' };
}

// Характеристика, выбранная для спасбросков, не уходит с атаками: переключил обратно —
// она на месте.
export function fromAdvantageValues(values: AdvantageValues): AdvantageDetails {
  return {
    mode: values.mode,
    roll: values.roll,
    ability:
      advantageHasAbility(values.roll) && values.ability !== 'all'
        ? values.ability
        : null,
  };
}

// Тот же ключ, что у сервера (advantageKey): повтор отмечаем у второй карточки.
// earlier — составляющие «Преимущество или помеха» выше этой в списке.
export function advantageRollError(
  values: AdvantageValues,
  earlier: AdvantageValues[],
): string | null {
  const key = advantageKey(fromAdvantageValues(values));
  return earlier.some(
    (other) => advantageKey(fromAdvantageValues(other)) === key,
  )
    ? 'Эти броски уже есть в другой карточке'
    : null;
}
