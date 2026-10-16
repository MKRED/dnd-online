import { ABILITY_GENITIVE } from './abilityUsageLabels.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';
import {
  ADVANTAGE_WHEN_PHRASES,
  isAdvantageWhen,
  type AdvantageWhen,
} from './effectAdvantageWhen.js';

// Составляющая эффекта «Преимущество или помеха» (docs/plan/effects.md, этап 7.4;
// docs/dnd/modifiers.md). По книге 2024: Faerie Fire и Blur — атаки по носителю, Haste —
// спасброски Ловкости, Hex и Enhance Ability — проверки одной характеристики,
// Enlarge/Reduce — проверки и спасброски Силы (две составляющие), Foresight — все Тесты к20,
// Невидимый и Недееспособный — инициатива. Условие «когда» — effectAdvantageWhen.ts.
// Ключи хранятся в базе: добавлять можно, переименовывать — только с миграцией данных.
export const ADVANTAGE_MODES = ['advantage', 'disadvantage'] as const;
export type AdvantageMode = (typeof ADVANTAGE_MODES)[number];

export const ADVANTAGE_ROLLS = [
  'attack',
  'attacked',
  'save',
  'check',
  'd20',
  'initiative',
] as const;
export type AdvantageRoll = (typeof ADVANTAGE_ROLLS)[number];

export const ADVANTAGE_MODE_LABELS: Record<AdvantageMode, string> = {
  advantage: 'Преимущество',
  disadvantage: 'Помеха',
};

export const ADVANTAGE_ROLL_LABELS: Record<AdvantageRoll, string> = {
  attack: 'Свои броски атаки',
  attacked: 'Броски атаки по носителю',
  save: 'Спасброски',
  check: 'Проверки характеристик',
  d20: 'Все Тесты к20',
  initiative: 'Инициатива',
};

// ability — только у спасбросков и проверок; null — все характеристики.
// when — условие; null — всегда.
export type AdvantageDetails = {
  mode: AdvantageMode;
  roll: AdvantageRoll;
  ability: AbilityScore | null;
  when: AdvantageWhen | null;
};

export const advantageHasAbility = (roll: AdvantageRoll) =>
  roll === 'save' || roll === 'check';

export function isAdvantageDetails(value: unknown): value is AdvantageDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'ability,mode,roll,when') {
    return false;
  }
  if (!ADVANTAGE_MODES.includes(v.mode as AdvantageMode)) return false;
  if (!ADVANTAGE_ROLLS.includes(v.roll as AdvantageRoll)) return false;
  if (!isAdvantageWhen(v.roll as AdvantageRoll, v.when)) return false;
  if (v.ability === null) return true;
  return (
    advantageHasAbility(v.roll as AdvantageRoll) &&
    ABILITY_SCORES.includes(v.ability as AbilityScore)
  );
}

// В эффекте одни и те же броски — один раз, будь то преимущество или помеха: по книге
// они на одном броске взаимно гасятся, вдвоём в одном эффекте смысла не имеют.
// «Все спасброски» и «спасброски Силы» — разные броски, их вместе не запрещаем. С разными
// условиями — тоже разные: Опрокинутый даёт по нему преимущество в 5 фт. и помеху дальше.
export const advantageKey = (details: AdvantageDetails) =>
  `${details.roll}:${details.ability ?? 'all'}:${details.when ?? 'always'}`;

const ROLL_PHRASES: Record<AdvantageRoll, string> = {
  attack: 'свои броски атаки',
  attacked: 'броски атаки по носителю',
  save: 'спасброски',
  check: 'проверки',
  d20: 'все Тесты к20',
  initiative: 'инициативу',
};

// «Преимущество на спасброски Ловкости», «Помеха на броски атаки по носителю, если
// атакующий дальше 5 фт.».
export function formatAdvantage(details: AdvantageDetails): string {
  const ability = details.ability
    ? ` ${ABILITY_GENITIVE[details.ability]}`
    : details.roll === 'check'
      ? ' характеристик'
      : '';
  const when = details.when ? ADVANTAGE_WHEN_PHRASES[details.when] : '';
  return `${ADVANTAGE_MODE_LABELS[details.mode]} на ${ROLL_PHRASES[details.roll]}${ability}${when}`;
}
