import {
  CONDITION_KINDS,
  CONDITION_LABELS,
  type ConditionKind,
} from './effectConditions.js';
import {
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  type DamageType,
} from './damageTypes.js';

// Составляющая эффекта «Сопротивление и иммунитет» (docs/plan/done/effects.md, этап 7.1;
// docs/dnd/modifiers.md): сопротивление, уязвимость или иммунитет к типам урона, а у
// иммунитета ещё и к состояниям. Так в книге у Protection from Energy (сопротивление к
// одному типу), Stoneskin (к трём), Heroism (иммунитет к «Испуганному»), Mind Blank
// (к психическому урону и «Очарованному»).
export const DEFENSE_LEVELS = [
  'resistance',
  'vulnerability',
  'immunity',
] as const;
export type DefenseLevel = (typeof DEFENSE_LEVELS)[number];

export const DEFENSE_LEVEL_LABELS: Record<DefenseLevel, string> = {
  resistance: 'Сопротивление',
  vulnerability: 'Уязвимость',
  immunity: 'Иммунитет',
};

// conditions — только у иммунитета: сопротивления и уязвимости к состоянию в книге нет.
export type DefenseDetails = {
  level: DefenseLevel;
  damageTypes: DamageType[];
  conditions: ConditionKind[];
};

const isUniqueListOf = <T>(value: unknown, allowed: readonly T[]) =>
  Array.isArray(value) &&
  value.every((item) => allowed.includes(item as T)) &&
  new Set(value).size === value.length;

export function isDefenseDetails(value: unknown): value is DefenseDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'conditions,damageTypes,level') {
    return false;
  }
  if (!DEFENSE_LEVELS.includes(v.level as DefenseLevel)) return false;
  if (!isUniqueListOf(v.damageTypes, DAMAGE_TYPES)) return false;
  if (!isUniqueListOf(v.conditions, CONDITION_KINDS)) return false;
  const types = v.damageTypes as DamageType[];
  const conditions = v.conditions as ConditionKind[];
  if (v.level !== 'immunity' && conditions.length > 0) return false;
  // Пустая составляющая ничего не делает — так не заводят.
  return types.length + conditions.length > 0;
}

// Что не должно повторяться в одном эффекте: тип урона или состояние на том же уровне.
// Разные уровни к одному типу не запрещаем: как они сочетаются, решат правила игры на
// карте, а не каталог.
export function defenseKeys(details: DefenseDetails): string[] {
  return [
    ...details.damageTypes.map((type) => `${details.level}:${type}`),
    ...details.conditions.map((condition) => `${details.level}:${condition}`),
  ];
}

// «Сопротивление: Дробящий, Колющий, Рубящий», «Иммунитет: Психический, Очарованный».
export function formatDefense(details: DefenseDetails): string {
  const items = [
    ...details.damageTypes.map((type) => DAMAGE_TYPE_LABELS[type]),
    ...details.conditions.map((condition) => CONDITION_LABELS[condition]),
  ];
  return `${DEFENSE_LEVEL_LABELS[details.level]}: ${items.join(', ')}`;
}
