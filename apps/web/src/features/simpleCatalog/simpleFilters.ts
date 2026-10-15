import { nameCollator, normalizeSearch } from '../catalog';
import type { SimpleEntry } from './simpleCatalogs';

// Фильтры простого каталога: поиск по названию, категории и сортировка, в адресе, как у
// предметов (q, cat, sort). Чипы категорий показываются, когда категорий больше одной.
export const SIMPLE_SORTS = ['recent', 'name'] as const;
export type SimpleSort = (typeof SIMPLE_SORTS)[number];

export interface SimpleFilters {
  query: string;
  // Пустой список — все категории.
  categories: string[];
  sort: SimpleSort;
}

export const DEFAULT_SIMPLE_FILTERS: SimpleFilters = {
  query: '',
  categories: [],
  sort: 'recent',
};

// Неизвестные значения из адреса молча отбрасываем: его правят руками. known — категории
// раздела.
export function readSimpleFilters(
  params: URLSearchParams,
  known: readonly string[],
): SimpleFilters {
  const sort = params.get('sort') ?? '';
  const categories = (params.get('cat') ?? '')
    .split(',')
    .filter((value) => known.includes(value));
  return {
    query: params.get('q') ?? '',
    categories: [...new Set(categories)],
    sort: sort === 'name' ? 'name' : 'recent',
  };
}

// Значения по умолчанию в адрес не пишутся; остальные параметры (вкладка) сохраняются.
export function writeSimpleFilters(
  params: URLSearchParams,
  filters: SimpleFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filters.query) next.set('q', filters.query);
  else next.delete('q');
  if (filters.categories.length > 0) {
    next.set('cat', filters.categories.join(','));
  } else next.delete('cat');
  if (filters.sort !== 'recent') next.set('sort', filters.sort);
  else next.delete('sort');
  return next;
}

// «Сначала новые» — порядок сервера (по дате изменения), его не трогаем.
export function applySimpleFilters<Entry extends SimpleEntry>(
  entries: Entry[],
  filters: SimpleFilters,
): Entry[] {
  const query = normalizeSearch(filters.query);
  const { categories } = filters;
  const found =
    query || categories.length > 0
      ? entries.filter(
          (entry) =>
            (categories.length === 0 || categories.includes(entry.category)) &&
            normalizeSearch(entry.name).includes(query),
        )
      : entries;
  return filters.sort === 'name'
    ? found.toSorted((a, b) => nameCollator.compare(a.name, b.name))
    : found;
}
