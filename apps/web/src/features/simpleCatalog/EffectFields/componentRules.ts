import {
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  senseHasRange,
  type ConditionKind,
  type SenseKind,
} from 'shared';
import type { ComponentValues } from './componentValues';
import { advantageRollError } from './advantageForm';
import { defenseDamageTypesError } from './defenseForm';
import { perTurnValidate, type PerTurnValues } from './perTurnForm';
import { speedValidate } from './speedForm';

type WithEffect = { effect: { components: ComponentValues[] } };

// Строка списка по пути поля: 'effect.components.2.range' → третья составляющая.
// Путь поля урона за ход длиннее ('effect.components.2.perTurn.count'), индекс тот же.
const componentAt = (values: WithEffect, path: string) =>
  values.effect.components[Number(path.split('.')[2])];

// Повтор: та же строка этого вида уже есть выше — ошибка у второй карточки.
const repeated = (
  values: WithEffect,
  path: string,
  same: (c: ComponentValues) => boolean,
) => values.effect.components.findIndex(same) !== Number(path.split('.')[2]);

// Составляющие того же вида выше этой в списке — для ошибки повтора у второй карточки.
const earlierOf = (values: WithEffect, path: string) =>
  values.effect.components.slice(0, Number(path.split('.')[2]));

// Правила полей урона за ход — только у карточки этого вида.
function perTurnRules() {
  const only =
    <V>(rule: (value: V, perTurn: PerTurnValues) => string | null) =>
    (value: V, values: WithEffect, path: string) => {
      const component = componentAt(values, path);
      return component.kind === 'per_turn'
        ? rule(value, component.perTurn)
        : null;
    };
  return {
    damageType: only(perTurnValidate.damageType),
    count: only(perTurnValidate.count),
    bonus: only(perTurnValidate.bonus),
  };
}

// Правила полей составляющих — те же, что у сервера (isEffectComponents). Правило поля
// работает только у карточки своего вида.
export const componentRules = {
  sense: (value: SenseKind | null, values: WithEffect, path: string) => {
    if (componentAt(values, path).kind !== 'sense') return null;
    if (!value) return 'Выберите вид чувства';
    return repeated(
      values,
      path,
      (c) => c.kind === 'sense' && c.sense === value,
    )
      ? 'Это чувство уже есть в эффекте'
      : null;
  },
  range: (value: number | string, values: WithEffect, path: string) => {
    const { kind, sense } = componentAt(values, path);
    if (kind !== 'sense' || !sense || !senseHasRange(sense)) return null;
    const range = Number(value);
    return value !== '' &&
      Number.isInteger(range) &&
      range >= SENSE_RANGE_STEP &&
      range <= SENSE_RANGE_MAX &&
      range % SENSE_RANGE_STEP === 0
      ? null
      : `Кратно ${SENSE_RANGE_STEP}, до ${SENSE_RANGE_MAX}`;
  },
  condition: (
    value: ConditionKind | null,
    values: WithEffect,
    path: string,
  ) => {
    if (componentAt(values, path).kind !== 'condition') return null;
    if (!value) return 'Выберите состояние';
    return repeated(
      values,
      path,
      (c) => c.kind === 'condition' && c.condition === value,
    )
      ? 'Это состояние уже есть в эффекте'
      : null;
  },
  perTurn: perTurnRules(),
  defense: {
    // Пустая защита и повтор — у типов урона: это поле есть у всех уровней.
    damageTypes: (_value: unknown, values: WithEffect, path: string) => {
      const component = componentAt(values, path);
      if (component.kind !== 'defense') return null;
      const earlier = earlierOf(values, path)
        .filter((c) => c.kind === 'defense')
        .map((c) => c.defense);
      return defenseDamageTypesError(component.defense, earlier);
    },
  },
  speed: {
    // Повтор — у выбора изменения, число — у своего поля.
    change: (_value: unknown, values: WithEffect, path: string) => {
      const component = componentAt(values, path);
      if (component.kind !== 'speed') return null;
      const earlier = earlierOf(values, path)
        .filter((c) => c.kind === 'speed')
        .map((c) => c.speed);
      return speedValidate.change(component.speed, earlier);
    },
    feet: (_value: unknown, values: WithEffect, path: string) => {
      const component = componentAt(values, path);
      return component.kind === 'speed'
        ? speedValidate.feet(component.speed)
        : null;
    },
  },
  advantage: {
    // Повтор — у выбора бросков.
    roll: (_value: unknown, values: WithEffect, path: string) => {
      const component = componentAt(values, path);
      if (component.kind !== 'advantage') return null;
      const earlier = earlierOf(values, path)
        .filter((c) => c.kind === 'advantage')
        .map((c) => c.advantage);
      return advantageRollError(component.advantage, earlier);
    },
  },
};
