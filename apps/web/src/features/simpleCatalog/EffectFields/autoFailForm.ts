import {
  autoFailHasAbility,
  autoFailKey,
  type AbilityScore,
  type AutoFailDetails,
  type AutoFailRoll,
} from 'shared';

// Поля составляющей «Автопровал» в форме (shared/effectAutoFail.ts). Характеристика —
// 'all' вместо null: так её отдаёт Select.
export interface AutoFailValues {
  roll: AutoFailRoll;
  ability: AbilityScore | 'all';
}

export const NEW_AUTO_FAIL: AutoFailValues = { roll: 'save', ability: 'all' };

export function toAutoFailValues(details: AutoFailDetails): AutoFailValues {
  return { ...details, ability: details.ability ?? 'all' };
}

// Характеристика, выбранная для спасбросков, не уходит с проверками.
export function fromAutoFailValues(values: AutoFailValues): AutoFailDetails {
  return {
    roll: values.roll,
    ability:
      autoFailHasAbility(values.roll) && values.ability !== 'all'
        ? values.ability
        : null,
  };
}

// Тот же ключ, что у сервера (autoFailKey): повтор отмечаем у второй карточки.
// earlier — составляющие «Автопровал» выше этой в списке.
export function autoFailRollError(
  values: AutoFailValues,
  earlier: AutoFailValues[],
): string | null {
  const key = autoFailKey(fromAutoFailValues(values));
  return earlier.some((other) => autoFailKey(fromAutoFailValues(other)) === key)
    ? 'Эти броски уже есть в другой карточке'
    : null;
}
