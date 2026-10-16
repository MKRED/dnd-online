import type { AdvantageRoll } from './effectAdvantage.js';

// Условие у «Преимущества или помехи» (docs/plan/effects-coverage.md, пробел А;
// docs/dnd/modifiers.md). Небольшой список, а не свободный текст: движок должен уметь
// его проверить по карте. По книге 2024: Опрокинутый — атаки по нему в 5 фт.
// с преимуществом, дальше с помехой; Faerie Fire — если атакующий его видит; Испуганный —
// пока источник страха в поле зрения; Схваченный — помеха на атаки по всем, кроме
// схватившего; Bestow Curse — помеха на атаки по наложившему. «Наложивший» станет
// известен движку со связью «способность → эффект» (пробел К); до неё это только данные.
// Ключи хранятся в базе: добавлять можно, переименовывать — только с миграцией данных.
export const ADVANTAGE_WHENS = [
  'within_5ft',
  'beyond_5ft',
  'attacker_sees',
  'source_in_sight',
  'vs_source',
  'not_vs_source',
] as const;
export type AdvantageWhen = (typeof ADVANTAGE_WHENS)[number];

// Какие условия у каких бросков имеют смысл. Инициатива — без условий.
const WHENS_BY_ROLL: Record<AdvantageRoll, readonly AdvantageWhen[]> = {
  attack: ['vs_source', 'not_vs_source', 'source_in_sight'],
  attacked: ['within_5ft', 'beyond_5ft', 'attacker_sees'],
  save: ['source_in_sight'],
  check: ['source_in_sight'],
  d20: ['source_in_sight'],
  initiative: [],
};

export const advantageWhens = (roll: AdvantageRoll) => WHENS_BY_ROLL[roll];

export const isAdvantageWhen = (roll: AdvantageRoll, when: unknown) =>
  when === null || WHENS_BY_ROLL[roll].includes(when as AdvantageWhen);

// Пункты списка «Когда» в форме — продолжение фразы «Преимущество на …».
export const ADVANTAGE_WHEN_LABELS: Record<AdvantageWhen, string> = {
  within_5ft: 'Атакующий в пределах 5 фт.',
  beyond_5ft: 'Атакующий дальше 5 фт.',
  attacker_sees: 'Атакующий видит носителя',
  source_in_sight: 'Наложивший в поле зрения носителя',
  vs_source: 'Только по наложившему',
  not_vs_source: 'По всем, кроме наложившего',
};

// Хвост строки карточки: «Помеха на свои броски атаки, кроме как по наложившему».
export const ADVANTAGE_WHEN_PHRASES: Record<AdvantageWhen, string> = {
  within_5ft: ', если атакующий в пределах 5 фт.',
  beyond_5ft: ', если атакующий дальше 5 фт.',
  attacker_sees: ', если атакующий видит носителя',
  source_in_sight: ', пока наложивший в поле зрения носителя',
  vs_source: ' только по наложившему',
  not_vs_source: ', кроме как по наложившему',
};
