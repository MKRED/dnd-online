import { CONDITION_RULES } from './conditionComponents.js';
import {
  CONDITION_KINDS,
  CONDITION_LABELS,
  type ConditionKind,
} from './effectConditions.js';
import type { AppliedEffect } from './effectSpeedTotal.js';

// Состояния на листе (sheetTotals.ts) и откуда каждое: эффект, где оно названо, или
// состояние, которое его включает (Бессознательный → Опрокинутый).

// Источник `condition:<вид>` даёт expandConditions раскрытым состояниям.
export const conditionOf = (source: string) =>
  source.startsWith('condition:')
    ? (source.split(':')[1] as ConditionKind)
    : null;

// applied — эффекты как наложены, expanded — после expandConditions: в нём нет
// состояний, к которым у носителя иммунитет. Порядок — как в книге.
export function sheetConditions(
  applied: readonly AppliedEffect[],
  expanded: readonly AppliedEffect[],
  nameOf: (source: string) => string,
): { kind: ConditionKind; from: string[] }[] {
  const present = new Set(expanded.flatMap((e) => conditionOf(e.source) ?? []));
  const from = new Map<ConditionKind, string[]>();
  const add = (kind: ConditionKind, name: string) => {
    const list = from.get(kind) ?? [];
    if (!list.includes(name)) list.push(name);
    from.set(kind, list);
    for (const included of CONDITION_RULES[kind].includes) {
      add(included, CONDITION_LABELS[kind]);
    }
  };
  for (const { source, components } of applied) {
    for (const c of components) {
      if (c.kind === 'condition') add(c.condition, nameOf(source));
    }
  }
  return CONDITION_KINDS.filter((k) => present.has(k)).map((kind) => ({
    kind,
    from: from.get(kind) ?? [],
  }));
}
