import { CONDITION_RULES } from './conditionComponents.js';
import type { EffectComponent } from './effectComponents.js';
import type { ConditionKind } from './effectConditions.js';
import type { AppliedEffect } from './effectSpeedTotal.js';

// Состояния на существе → их составляющие (conditionComponents.ts), чтобы вычислители
// видели «Схваченный» как Скорость 0. Правила книги (docs/dnd/combining-effects.md):
// - состояние с самим собой не складывается: одно и то же из двух эффектов — один
//   экземпляр с общим источником `condition:<вид>`;
// - Истощение копится: каждое получение — свой источник, даже из одной записи каталога;
// - иммунитет к состоянию значит, что оно не действует (в том числе иммунитет из другого
//   состояния: Окаменевший не бывает Отравленным).
export function expandConditions(
  effects: readonly AppliedEffect[],
): AppliedEffect[] {
  const present = new Set<ConditionKind>();
  let exhaustion = 0;
  const add = (kind: ConditionKind) => {
    if (present.has(kind)) return;
    present.add(kind);
    CONDITION_RULES[kind].includes.forEach(add);
  };
  for (const { components } of effects) {
    for (const c of components) {
      if (c.kind !== 'condition') continue;
      if (c.condition === 'exhaustion') exhaustion += 1;
      add(c.condition);
    }
  }

  const immune = new Set<ConditionKind>();
  const collectImmunity = (components: readonly EffectComponent[]) => {
    for (const c of components) {
      if (c.kind === 'defense' && c.level === 'immunity') {
        c.conditions.forEach((kind) => immune.add(kind));
      }
    }
  };
  for (const { components } of effects) collectImmunity(components);
  for (const kind of present) collectImmunity(CONDITION_RULES[kind].components);

  const expanded: AppliedEffect[] = [...effects];
  for (const kind of present) {
    if (immune.has(kind)) continue;
    const { components } = CONDITION_RULES[kind];
    const copies = kind === 'exhaustion' ? exhaustion : 1;
    for (let i = 0; i < copies; i += 1) {
      const source =
        kind === 'exhaustion' ? `condition:${kind}:${i}` : `condition:${kind}`;
      expanded.push({ source, components });
    }
  }
  return expanded;
}
