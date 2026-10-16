import { ABILITY_GENITIVE } from './abilityUsageLabels.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';

// Составляющая эффекта «Автопровал» (docs/plan/effects-coverage.md, пробел Б;
// docs/dnd/modifiers.md). По книге 2024 её дают только состояния: Парализованный,
// Окаменевший, Ошеломлённый и Бессознательный — спасброски Силы и Ловкости, Ослеплённый —
// проверки, где нужно зрение, Оглохший — где нужен слух. Ни одно заклинание её не даёт:
// составляющая — для своих эффектов и тех же примитивов в движке.
// Ключи хранятся в базе: добавлять можно, переименовывать — только с миграцией данных.
export const AUTO_FAIL_ROLLS = [
  'save',
  'sight_check',
  'hearing_check',
] as const;
export type AutoFailRoll = (typeof AUTO_FAIL_ROLLS)[number];

export const AUTO_FAIL_ROLL_LABELS: Record<AutoFailRoll, string> = {
  save: 'Спасброски',
  sight_check: 'Проверки, где нужно зрение',
  hearing_check: 'Проверки, где нужен слух',
};

// ability — только у спасбросков; null — все характеристики.
export type AutoFailDetails = {
  roll: AutoFailRoll;
  ability: AbilityScore | null;
};

export const autoFailHasAbility = (roll: AutoFailRoll) => roll === 'save';

export function isAutoFailDetails(value: unknown): value is AutoFailDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'ability,roll') return false;
  if (!AUTO_FAIL_ROLLS.includes(v.roll as AutoFailRoll)) return false;
  if (v.ability === null) return true;
  return (
    autoFailHasAbility(v.roll as AutoFailRoll) &&
    ABILITY_SCORES.includes(v.ability as AbilityScore)
  );
}

// В эффекте одни и те же броски — один раз. «Все спасброски» и «спасброски Силы» вместе
// не запрещаем, как у преимущества: лишнее, но не противоречие.
export const autoFailKey = (details: AutoFailDetails) =>
  `${details.roll}:${details.ability ?? 'all'}`;

// «Автопровал спасбросков Силы», «Автопровал проверок, где нужно зрение».
export function formatAutoFail(details: AutoFailDetails): string {
  switch (details.roll) {
    case 'save':
      return details.ability
        ? `Автопровал спасбросков ${ABILITY_GENITIVE[details.ability]}`
        : 'Автопровал всех спасбросков';
    case 'sight_check':
      return 'Автопровал проверок, где нужно зрение';
    case 'hearing_check':
      return 'Автопровал проверок, где нужен слух';
    default:
      return details.roll satisfies never;
  }
}
