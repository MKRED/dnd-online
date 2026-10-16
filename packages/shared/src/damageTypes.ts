// 13 типов урона книги 2024 и кости урона (docs/dnd/attacks-and-saves.md). Нужны
// составляющей эффекта «Урон или лечение за ход», а потом и шагу способности «Урон».
// Ключи хранятся в базе: добавлять можно, переименовывать — только с миграцией данных.
export const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

// Русские названия — по глоссарию next.dnd.su.
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  acid: 'Кислота',
  bludgeoning: 'Дробящий',
  cold: 'Холод',
  fire: 'Огонь',
  force: 'Силовой',
  lightning: 'Электричество',
  necrotic: 'Некротический',
  piercing: 'Колющий',
  poison: 'Яд',
  psychic: 'Психический',
  radiant: 'Излучение',
  slashing: 'Рубящий',
  thunder: 'Звук',
};

// Урон и лечение в книге бросают на этих костях; d20 и d100 — для проверок и таблиц.
export const DAMAGE_DICE = [4, 6, 8, 10, 12] as const;
export type DamageDie = (typeof DAMAGE_DICE)[number];
