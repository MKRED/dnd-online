import type { AbilityScore, EffectFields, SaveEndsEdge } from 'shared';
import { componentRules } from './componentRules';
import {
  fromComponentValues,
  toComponentValues,
  type ComponentValues,
} from './componentValues';

// Составляющие и снятие спасброском в форме эффекта (docs/plan/done/effects.md). Значения
// составляющих — componentValues.ts, их правила — componentRules.ts.
export { newComponent, type ComponentValues } from './componentValues';

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

// Те же правила, что у сервера (isEffectComponents, isEffectSaveEnds).
export const effectValidate = {
  components: componentRules,
  saveEnds: {
    ability: (value: AbilityScore | null, values: WithEffect) =>
      values.effect.saveEnds.on && !value ? 'Выберите характеристику' : null,
  },
};
