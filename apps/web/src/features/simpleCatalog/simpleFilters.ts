import { nameCollator, normalizeSearch } from '../catalog';
import type { SimpleEntry } from './simpleCatalogs';

// Фильтры простого каталога: поиск по названию и сортировка, в адресе, как у предметов
// (q, sort). Чипов категорий нет, пока категория одна.
export const SIMPLE_SORTS = ['recent', 'name'] as const;
export type SimpleSort = (typeof SIMPLE_SORTS)[number];

export interface SimpleFilters {
  query: string;
  sort: SimpleSort;
}

export const DEFAULT_SIMPLE_FILTERS: SimpleFilters = {
  query: '',
  sort: 'recent',
};

// Неизвестные значения из адреса молча отбрасываем: его правят руками.
export function readSimpleFilters(params: URLSearchParams): SimpleFilters {
  const sort = params.get('sort') ?? '';
  return {
    query: params.get('q') ?? '',
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
  const found = query
    ? entries.filter((entry) => normalizeSearch(entry.name).includes(query))
    : entries;
  return filters.sort === 'name'
    ? found.toSorted((a, b) => nameCollator.compare(a.name, b.name))
    : found;
}
