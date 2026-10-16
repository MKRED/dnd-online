import { randomId } from '@mantine/hooks';
import {
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  senseHasRange,
  type AbilityScore,
  type ConditionKind,
  type EffectComponent,
  type EffectComponentKind,
  type EffectFields,
  type SaveEndsEdge,
  type SenseKind,
} from 'shared';

// Составляющие и снятие спасброском в форме эффекта (docs/plan/effects.md). key — только
// для React: по нему список не путает строки при удалении из середины. Поля всех видов
// лежат в одной плоской строке: Mantine проверяет списки по путям, а каждая карточка
// читает только поля своего вида.
export interface ComponentValues {
  key: string;
  kind: EffectComponentKind;
  // null — ещё не выбрано; range — '' пока поле пустое (так отдаёт NumberInput).
  sense: SenseKind | null;
  range: number | string;
  condition: ConditionKind | null;
}

// Галочка снятой не стирает выбранное: вернул галочку — поля на месте.
export interface SaveEndsValues {
  on: boolean;
  ability: AbilityScore | null;
  edge: SaveEndsEdge;
}

export interface EffectValues {
  components: ComponentValues[];
  saveEnds: SaveEndsValues;
}

export function newComponent(kind: EffectComponentKind): ComponentValues {
  return { key: randomId(), kind, sense: null, range: '', condition: null };
}

function toComponentValues(component: EffectComponent): ComponentValues {
  const values = newComponent(component.kind);
  switch (component.kind) {
    case 'sense':
      return {
        ...values,
        sense: component.sense,
        range: component.range ?? '',
      };
    case 'condition':
      return { ...values, condition: component.condition };
    default:
      return component satisfies never;
  }
}

// Строка формы → составляющая запроса; недозаполненную форма не пропустит до отправки.
function fromComponentValues(c: ComponentValues): EffectComponent[] {
  switch (c.kind) {
    case 'sense':
      return c.sense
        ? [
            {
              kind: 'sense',
              sense: c.sense,
              // Дистанция, введённая для другого вида, не уходит.
              range: senseHasRange(c.sense) ? Number(c.range) : null,
            },
          ]
        : [];
    case 'condition':
      return c.condition ? [{ kind: 'condition', condition: c.condition }] : [];
    default:
      return c.kind satisfies never;
  }
}

export function toEffectValues(entry?: EffectFields): EffectValues {
  const components = (entry?.components ?? []).map(toComponentValues);
  const saveEnds = entry?.saveEnds;
  return {
    components,
    saveEnds: saveEnds
      ? { on: true, ...saveEnds }
      : { on: false, ability: null, edge: 'end' },
  };
}

export function fromEffectValues(
  values: EffectValues,
): Pick<EffectFields, 'components' | 'saveEnds'> {
  const components = values.components.flatMap(fromComponentValues);
  const { on, ability, edge } = values.saveEnds;
  return {
    components,
    saveEnds: on && ability ? { ability, edge } : null,
  };
}

type WithEffect = { effect: EffectValues };

// Строка списка по пути поля: 'effect.components.2.range' → третья составляющая.
const componentAt = (values: WithEffect, path: string) =>
  values.effect.components[Number(path.split('.')[2])];

// Повтор: та же строка этого вида уже есть выше — ошибка у второй карточки.
const repeated = (
  values: WithEffect,
  path: string,
  same: (c: ComponentValues) => boolean,
) => values.effect.components.findIndex(same) !== Number(path.split('.')[2]);

// Те же правила, что у сервера (isEffectComponents, isEffectSaveEnds). Правило поля
// работает только у карточки своего вида.
export const effectValidate = {
  components: {
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
  },
  saveEnds: {
    ability: (value: AbilityScore | null, values: WithEffect) =>
      values.effect.saveEnds.on && !value ? 'Выберите характеристику' : null,
  },
};
