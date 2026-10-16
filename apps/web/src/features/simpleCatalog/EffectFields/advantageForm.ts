import {
  advantageHasAbility,
  advantageKey,
  advantageWhens,
  type AbilityScore,
  type AdvantageDetails,
  type AdvantageMode,
  type AdvantageRoll,
  type AdvantageWhen,
} from 'shared';

// Поля составляющей «Преимущество или помеха» в форме (shared/effectAdvantage.ts).
// Характеристика — 'all' вместо null, условие — 'always' вместо null: так их отдаёт Select.
export interface AdvantageValues {
  mode: AdvantageMode;
  roll: AdvantageRoll;
  ability: AbilityScore | 'all';
  when: AdvantageWhen | 'always';
}

export const NEW_ADVANTAGE: AdvantageValues = {
  mode: 'advantage',
  roll: 'attack',
  ability: 'all',
  when: 'always',
};

export function toAdvantageValues(details: AdvantageDetails): AdvantageValues {
  return {
    ...details,
    ability: details.ability ?? 'all',
    when: details.when ?? 'always',
  };
}

// Характеристика, выбранная для спасбросков, не уходит с атаками: переключил обратно —
// она на месте. Так же условие, которого у нового броска нет.
export function fromAdvantageValues(values: AdvantageValues): AdvantageDetails {
  return {
    mode: values.mode,
    roll: values.roll,
    ability:
      advantageHasAbility(values.roll) && values.ability !== 'all'
        ? values.ability
        : null,
    when:
      values.when !== 'always' &&
      advantageWhens(values.roll).includes(values.when)
        ? values.when
        : null,
  };
}

// Что показать в «Когда»: условие, которого у нового броска нет, хранится (переключил
// обратно — оно на месте), но не уходит на сервер. Показываем «Всегда» — то, что уйдёт:
// значение не из списка Select показал бы пустым.
export const shownAdvantageWhen = (values: AdvantageValues) =>
  fromAdvantageValues(values).when ?? 'always';

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
