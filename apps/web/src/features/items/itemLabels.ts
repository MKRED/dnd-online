import type { Coin, ItemCategory, ItemCost, ItemRarity } from 'shared';

// Русские названия и форматы для предметов. Источники и даты — docs/dnd/items.md.

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  basic: 'Базовый',
  food: 'Еда и напитки',
  material: 'Материалы',
  quest: 'Сюжетный',
};

// Подсказка под полем «Категория» в форме: что в эту категорию класть.
export const CATEGORY_HINTS: Record<ItemCategory, string> = {
  basic: 'Снаряжение и всё, что не подходит под другие категории',
  food: 'Пища, напитки, рационы',
  material: 'Сырьё и компоненты: руда, шкуры, травы, ткань',
  quest: 'Ключи, письма, реликвии — то, что важно для истории',
};

export const RARITY_LABELS: Record<ItemRarity, string> = {
  none: 'Без редкости',
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  very_rare: 'Очень редкий',
  legendary: 'Легендарный',
  artifact: 'Артефакт',
};

// Цвет бейджа редкости — только оформление, в книге цветов нет. Растёт к артефакту,
// чтобы редкость читалась с одного взгляда.
export const RARITY_COLORS: Record<ItemRarity, string> = {
  none: 'gray',
  common: 'gray',
  uncommon: 'green',
  rare: 'blue',
  very_rare: 'violet',
  legendary: 'orange',
  artifact: 'red',
};

// Сокращения как на next.dnd.su («2 СМ»), все пять сверены с глоссарием (docs/dnd/items.md).
export const COIN_LABELS: Record<Coin, string> = {
  cp: 'ММ',
  sp: 'СМ',
  ep: 'ЭМ',
  gp: 'ЗМ',
  pp: 'ПМ',
};

const numberFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

// Нулевой вес — «—», как в книге у предметов без веса.
export function formatWeight(weight: number): string {
  return weight === 0 ? '—' : `${numberFormat.format(weight)} фнт.`;
}

export function formatCost(cost: ItemCost | null): string {
  return cost
    ? `${numberFormat.format(cost.amount)} ${COIN_LABELS[cost.coin]}`
    : '—';
}
