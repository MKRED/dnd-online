import {
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  type ItemCategory,
  type ItemRarity,
} from 'shared';

// Фильтры списка предметов (docs/plan/items-filters.md). Живут в адресе страницы, чтобы
// «Назад» с карточки возвращал тот же отфильтрованный список.

export const ITEM_SORTS = ['recent', 'name', 'weight', 'cost'] as const;
export type ItemSort = (typeof ITEM_SORTS)[number];

// 'magic' — любая редкость, кроме «Без редкости».
export type ItemRarityFilter = 'any' | 'magic' | ItemRarity;

export interface ItemFilters {
  // Пустой список — все категории.
  categories: ItemCategory[];
  rarity: ItemRarityFilter;
  query: string;
  sort: ItemSort;
}

export const DEFAULT_ITEM_FILTERS: ItemFilters = {
  categories: [],
  rarity: 'any',
  query: '',
  sort: 'recent',
};

const PARAMS = {
  categories: 'cat',
  rarity: 'rarity',
  query: 'q',
  sort: 'sort',
} as const;

function isOneOf<T extends string>(
  list: readonly T[],
  value: string,
): value is T {
  return (list as readonly string[]).includes(value);
}

// Адрес правят руками и присылают ссылкой, поэтому неизвестные значения молча
// отбрасываем, а не показываем ошибку.
export function readItemFilters(params: URLSearchParams): ItemFilters {
  const categories = (params.get(PARAMS.categories) ?? '')
    .split(',')
    .filter((value) => isOneOf(ITEM_CATEGORIES, value));
  const rarity = params.get(PARAMS.rarity) ?? '';
  const sort = params.get(PARAMS.sort) ?? '';
  return {
    categories: [...new Set(categories)],
    rarity:
      rarity === 'magic' || isOneOf(ITEM_RARITIES, rarity)
        ? rarity
        : DEFAULT_ITEM_FILTERS.rarity,
    query: params.get(PARAMS.query) ?? '',
    sort: isOneOf(ITEM_SORTS, sort) ? sort : DEFAULT_ITEM_FILTERS.sort,
  };
}

// Новые параметры адреса: остальные (вкладка) сохраняются, значения по умолчанию в
// адрес не пишутся — чистый /items показывает всё.
export function writeItemFilters(
  params: URLSearchParams,
  filters: ItemFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string, fallback: string) => {
    if (value === fallback) next.delete(key);
    else next.set(key, value);
  };
  set(PARAMS.categories, filters.categories.join(','), '');
  set(PARAMS.rarity, filters.rarity, DEFAULT_ITEM_FILTERS.rarity);
  set(PARAMS.query, filters.query, '');
  set(PARAMS.sort, filters.sort, DEFAULT_ITEM_FILTERS.sort);
  return next;
}

// Фильтры, которые сужают список (сортировка не в счёт).
export function hasActiveFilters(filters: ItemFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.rarity !== 'any' ||
    filters.query.trim() !== ''
  );
}
