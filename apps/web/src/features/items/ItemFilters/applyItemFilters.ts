import {
  COIN_VALUE_IN_CP,
  ITEM_CATEGORIES,
  type Item,
  type ItemCategory,
  type ItemCost,
} from 'shared';
import type { ItemFilters, ItemSort } from './filterParams';

// Поиск без учёта регистра, «ё» = «е»: «Верёвка» находится по «веревка».
function normalize(text: string): string {
  return text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim();
}

function matchesExceptCategory(
  item: Item,
  filters: ItemFilters,
  query: string,
) {
  if (filters.rarity === 'magic' && item.rarity === 'none') return false;
  if (
    filters.rarity !== 'any' &&
    filters.rarity !== 'magic' &&
    item.rarity !== filters.rarity
  ) {
    return false;
  }
  return query === '' || normalize(item.name).includes(query);
}

export function filterItems(items: Item[], filters: ItemFilters): Item[] {
  const query = normalize(filters.query);
  return items.filter(
    (item) =>
      (filters.categories.length === 0 ||
        filters.categories.includes(item.category)) &&
      matchesExceptCategory(item, filters, query),
  );
}

// Сколько предметов в каждой категории с учётом поиска и редкости, но не самого выбора
// категорий: так видно, сколько добавит ещё один чип.
export function countByCategory(
  items: Item[],
  filters: ItemFilters,
): Record<ItemCategory, number> {
  const query = normalize(filters.query);
  const counts = Object.fromEntries(
    ITEM_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ItemCategory, number>;
  for (const item of items) {
    if (matchesExceptCategory(item, filters, query)) counts[item.category] += 1;
  }
  return counts;
}

function costInCp(cost: ItemCost | null): number {
  return cost ? cost.amount * COIN_VALUE_IN_CP[cost.coin] : Infinity;
}

const byName = new Intl.Collator('ru-RU', { sensitivity: 'base' });

// «Сначала новые» — порядок сервера (по дате изменения), его не трогаем. Сортировка
// стабильная, поэтому при равных весе и цене порядок тоже остаётся серверным. Предметы
// без цены — в конце.
export function sortItems(items: Item[], sort: ItemSort): Item[] {
  if (sort === 'recent') return items;
  const compare: Record<
    Exclude<ItemSort, 'recent'>,
    (a: Item, b: Item) => number
  > = {
    name: (a, b) => byName.compare(a.name, b.name),
    weight: (a, b) => a.weight - b.weight,
    cost: (a, b) => {
      const left = costInCp(a.cost);
      const right = costInCp(b.cost);
      return left === right ? 0 : left < right ? -1 : 1;
    },
  };
  return items.toSorted(compare[sort]);
}
