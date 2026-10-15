import { randomId } from '@mantine/hooks';
import {
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  senseHasRange,
  type AbilityScore,
  type EffectComponent,
  type EffectComponentKind,
  type EffectFields,
  type SaveEndsEdge,
  type SenseKind,
} from 'shared';

// Составляющие и снятие спасброском в форме эффекта (docs/plan/effects.md). key — только
// для React: по нему список не путает строки при удалении из середины.
export interface ComponentValues {
  key: string;
  kind: EffectComponentKind;
  // null — вид ещё не выбран; range — '' пока поле пустое (так отдаёт NumberInput).
  sense: SenseKind | null;
  range: number | string;
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
  return { key: randomId(), kind, sense: null, range: '' };
}

export function toEffectValues(entry?: EffectFields): EffectValues {
  const components = (entry?.components ?? []).map((component) => ({
    ...newComponent(component.kind),
    sense: component.sense,
    range: component.range ?? '',
  }));
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
  const components = values.components.flatMap((c): EffectComponent[] =>
    c.sense
      ? [
          {
            kind: 'sense',
            sense: c.sense,
            // Дистанция, введённая для другого вида, не уходит.
            range: senseHasRange(c.sense) ? Number(c.range) : null,
          },
        ]
      : [],
  );
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

// Те же правила, что у сервера (isEffectComponents, isEffectSaveEnds).
export const effectValidate = {
  components: {
    sense: (value: SenseKind | null, values: WithEffect, path: string) => {
      if (!value) return 'Выберите вид чувства';
      const twice = values.effect.components.findIndex(
        (c) => c.sense === value,
      );
      return twice !== Number(path.split('.')[2])
        ? 'Это чувство уже есть в эффекте'
        : null;
    },
    range: (value: number | string, values: WithEffect, path: string) => {
      const { sense } = componentAt(values, path);
      if (!sense || !senseHasRange(sense)) return null;
      const range = Number(value);
      return value !== '' &&
        Number.isInteger(range) &&
        range >= SENSE_RANGE_STEP &&
        range <= SENSE_RANGE_MAX &&
        range % SENSE_RANGE_STEP === 0
        ? null
        : `Кратно ${SENSE_RANGE_STEP}, до ${SENSE_RANGE_MAX}`;
    },
  },
  saveEnds: {
    ability: (value: AbilityScore | null, values: WithEffect) =>
      values.effect.saveEnds.on && !value ? 'Выберите характеристику' : null,
  },
};
