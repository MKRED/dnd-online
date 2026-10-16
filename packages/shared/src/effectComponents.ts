import {
  CONDITION_LABELS,
  isConditionDetails,
  type ConditionDetails,
} from './effectConditions.js';
import {
  formatSense,
  isSenseDetails,
  type SenseDetails,
} from './effectSenses.js';

// Составляющие эффекта (docs/plan/effects.md): эффект — список того, что он делает, в
// любом наборе, а не одна категория. Эффект без составляющих — «Базовый»: всё в описании.
// Каждый этап плана добавляет вид. Ключи хранятся в базе: добавлять можно,
// переименовывать — только с миграцией данных.
export const EFFECT_COMPONENT_KINDS = ['sense', 'condition'] as const;
export type EffectComponentKind = (typeof EFFECT_COMPONENT_KINDS)[number];

// Чувство — вид и дистанция (effectSenses.ts), состояние — одно из книги
// (effectConditions.ts).
export type EffectComponent =
  | ({ kind: 'sense' } & SenseDetails)
  | ({ kind: 'condition' } & ConditionDetails);

// Больше в одном эффекте в книге не встречается; предел защищает форму и базу.
export const EFFECT_COMPONENTS_MAX = 20;

export const EFFECT_COMPONENT_LABELS: Record<EffectComponentKind, string> = {
  sense: 'Чувство',
  condition: 'Состояние',
};

function isEffectComponent(value: unknown): value is EffectComponent {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, ...rest } = value as Record<string, unknown>;
  if (kind === 'sense') return isSenseDetails(rest);
  if (kind === 'condition') return isConditionDetails(rest);
  return false;
}

// Что в одном эффекте не должно повторяться: вид чувства или состояние.
function componentKey(component: EffectComponent): string {
  switch (component.kind) {
    case 'sense':
      return `sense:${component.sense}`;
    case 'condition':
      return `condition:${component.condition}`;
    default:
      return component satisfies never;
  }
}

// Проверка тела запроса и jsonb из базы. Каждое чувство и каждое состояние — не больше
// раза: два «Тёмных зрения» с разной дистанцией ничего не значат, а состояние по книге
// с самим собой не складывается.
export function isEffectComponents(value: unknown): value is EffectComponent[] {
  if (!Array.isArray(value) || value.length > EFFECT_COMPONENTS_MAX) {
    return false;
  }
  if (!value.every(isEffectComponent)) return false;
  const keys = value.map(componentKey);
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
    default:
      return component satisfies never;
  }
}
