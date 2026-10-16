// Составляющая эффекта «Состояние» (docs/plan/effects.md, effectComponents.ts): одно из
// 15 состояний книги 2024. Что каждое делает — в docs/dnd/conditions.md, в эффект правила
// не переписываем. Ключи хранятся в базе: добавлять можно, переименовывать — только с
// миграцией данных.
export const CONDITION_KINDS = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

// Русские названия — по глоссарию next.dnd.su (docs/dnd/conditions.md).
export const CONDITION_LABELS: Record<ConditionKind, string> = {
  blinded: 'Ослеплённый',
  charmed: 'Очарованный',
  deafened: 'Оглохший',
  exhaustion: 'Истощение',
  frightened: 'Испуганный',
  grappled: 'Схваченный',
  incapacitated: 'Недееспособный',
  invisible: 'Невидимый',
  paralyzed: 'Парализованный',
  petrified: 'Окаменевший',
  poisoned: 'Отравленный',
  prone: 'Опрокинутый',
  restrained: 'Опутанный',
  stunned: 'Ошеломлённый',
  unconscious: 'Бессознательный',
};

// Уровня истощения в составляющей нет: по книге каждое получение истощения даёт ровно
// один уровень, так что эффект с «Истощением» — это +1 уровень.
export type ConditionDetails = { condition: ConditionKind };

export function isConditionDetails(value: unknown): value is ConditionDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).join(',') === 'condition' &&
    CONDITION_KINDS.includes(v.condition as ConditionKind)
  );
}
