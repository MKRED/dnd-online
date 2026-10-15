import { isSenseDetails, type SenseDetails } from './effectSenses.js';

// Составляющие эффекта (docs/plan/effects.md): эффект — список того, что он делает, в
// любом наборе, а не одна категория. Эффект без составляющих — «Базовый»: всё в описании.
// Каждый этап плана добавляет вид. Ключи хранятся в базе: добавлять можно,
// переименовывать — только с миграцией данных.
export const EFFECT_COMPONENT_KINDS = ['sense'] as const;
export type EffectComponentKind = (typeof EFFECT_COMPONENT_KINDS)[number];

// Вид чувства и дистанция (effectSenses.ts).
export type EffectComponent = { kind: 'sense' } & SenseDetails;

// Больше в одном эффекте в книге не встречается; предел защищает форму и базу.
export const EFFECT_COMPONENTS_MAX = 20;

export const EFFECT_COMPONENT_LABELS: Record<EffectComponentKind, string> = {
  sense: 'Чувство',
};

function isEffectComponent(value: unknown): value is EffectComponent {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, ...rest } = value as Record<string, unknown>;
  return kind === 'sense' && isSenseDetails(rest);
}

// Проверка тела запроса и jsonb из базы. Один вид чувства — не больше раза: два
// «Тёмных зрения» с разной дистанцией в одном эффекте ничего не значат.
export function isEffectComponents(value: unknown): value is EffectComponent[] {
  if (!Array.isArray(value) || value.length > EFFECT_COMPONENTS_MAX) {
    return false;
  }
  if (!value.every(isEffectComponent)) return false;
  const senses = value.map((component) => component.sense);
  return new Set(senses).size === senses.length;
}

// Виды составляющих эффекта без повторов, в порядке списка, — для чипов и бейджей.
export function effectComponentKinds(
  components: readonly EffectComponent[],
): EffectComponentKind[] {
  return [...new Set(components.map((component) => component.kind))];
}
