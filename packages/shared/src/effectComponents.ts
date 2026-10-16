import {
  CONDITION_LABELS,
  isConditionDetails,
  type ConditionDetails,
} from './effectConditions.js';
import {
  defenseKeys,
  formatDefense,
  isDefenseDetails,
  type DefenseDetails,
} from './effectDefenses.js';
import {
  formatPerTurn,
  isPerTurnDetails,
  type PerTurnDetails,
} from './effectPerTurn.js';
import {
  formatSense,
  isSenseDetails,
  type SenseDetails,
} from './effectSenses.js';

// Составляющие эффекта (docs/plan/effects.md): эффект — список того, что он делает, в
// любом наборе, а не одна категория. Эффект без составляющих — «Базовый»: всё в описании.
// Каждый этап плана добавляет вид. Ключи хранятся в базе: добавлять можно,
// переименовывать — только с миграцией данных.
export const EFFECT_COMPONENT_KINDS = [
  'sense',
  'condition',
  'per_turn',
  'defense',
  'no_healing',
] as const;
export type EffectComponentKind = (typeof EFFECT_COMPONENT_KINDS)[number];

// Виды без полей: во втором экземпляре смысла нет, форма не даёт добавить его снова.
export const SINGLE_EFFECT_COMPONENT_KINDS: readonly EffectComponentKind[] = [
  'no_healing',
];

// Чувство — вид и дистанция (effectSenses.ts), состояние — одно из книги
// (effectConditions.ts), урон или лечение за ход — effectPerTurn.ts, сопротивление и
// иммунитет — effectDefenses.ts. Запрет лечения полей не имеет: носитель не
// восстанавливает хиты, как от Chill Touch (docs/dnd/modifiers.md).
export type EffectComponent =
  | ({ kind: 'sense' } & SenseDetails)
  | ({ kind: 'condition' } & ConditionDetails)
  | ({ kind: 'per_turn' } & PerTurnDetails)
  | ({ kind: 'defense' } & DefenseDetails)
  | { kind: 'no_healing' };

// Больше в одном эффекте в книге не встречается; предел защищает форму и базу.
export const EFFECT_COMPONENTS_MAX = 20;

export const EFFECT_COMPONENT_LABELS: Record<EffectComponentKind, string> = {
  sense: 'Чувство',
  condition: 'Состояние',
  per_turn: 'Урон или лечение за ход',
  defense: 'Сопротивление и иммунитет',
  no_healing: 'Запрет лечения',
};

function isEffectComponent(value: unknown): value is EffectComponent {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, ...rest } = value as Record<string, unknown>;
  if (kind === 'sense') return isSenseDetails(rest);
  if (kind === 'condition') return isConditionDetails(rest);
  if (kind === 'per_turn') return isPerTurnDetails(rest);
  if (kind === 'defense') return isDefenseDetails(rest);
  if (kind === 'no_healing') return Object.keys(rest).length === 0;
  return false;
}

// Что в одном эффекте не должно повторяться: вид чувства, состояние, тип урона или
// состояние на одном уровне защиты. Урон за ход повторяться может (огонь и холод
// одновременно) — у него ключей нет.
function componentKeys(component: EffectComponent): string[] {
  switch (component.kind) {
    case 'sense':
      return [`sense:${component.sense}`];
    case 'condition':
      return [`condition:${component.condition}`];
    case 'per_turn':
      return [];
    case 'defense':
      return defenseKeys(component).map((key) => `defense:${key}`);
    case 'no_healing':
      return ['no_healing'];
    default:
      return component satisfies never;
  }
}

// Проверка тела запроса и jsonb из базы. Каждое чувство, состояние и защита — не больше
// раза: два «Тёмных зрения» с разной дистанцией ничего не значат, состояние по книге
// с самим собой не складывается, два сопротивления огню — одно.
export function isEffectComponents(value: unknown): value is EffectComponent[] {
  if (!Array.isArray(value) || value.length > EFFECT_COMPONENTS_MAX) {
    return false;
  }
  if (!value.every(isEffectComponent)) return false;
  const keys = value.flatMap(componentKeys);
  return new Set(keys).size === keys.length;
}

// Виды составляющих эффекта без повторов, в порядке списка, — для чипов и бейджей.
export function effectComponentKinds(
  components: readonly EffectComponent[],
): EffectComponentKind[] {
  return [...new Set(components.map((component) => component.kind))];
}

// Составляющая одной строкой карточки: «Тёмное зрение, 60 фт.», «Отравленный».
export function formatEffectComponent(component: EffectComponent): string {
  switch (component.kind) {
    case 'sense':
      return formatSense(component);
    case 'condition':
      return CONDITION_LABELS[component.condition];
    case 'per_turn':
      return formatPerTurn(component);
    case 'defense':
      return formatDefense(component);
    case 'no_healing':
      return 'Не восстанавливает хиты';
    default:
      return component satisfies never;
  }
}
