import { SPELL_LEVEL_MAX } from 'shared';
import { nameCollator, normalizeSearch } from '../catalog';
import type { SimpleEntry } from './simpleCatalogs';

// Фильтры простого каталога: поиск по названию, виды записей (категории способности,
// составляющие эффекта), круг заклинания и сортировка, в адресе, как у предметов (q, cat,
// lvl, sort). Чипы показываются, когда видов больше одного.
export const SIMPLE_SORTS = ['recent', 'name'] as const;
export type SimpleSort = (typeof SIMPLE_SORTS)[number];

export interface SimpleFilters {
  query: string;
  // Виды записей; пустой список — все.
  categories: string[];
  // Круги заклинаний (0 — заговор); пустой список — все. Выбранный круг оставляет только
  // заклинания.
  levels: number[];
  sort: SimpleSort;
}

export const DEFAULT_SIMPLE_FILTERS: SimpleFilters = {
  query: '',
  categories: [],
  levels: [],
  sort: 'recent',
};

// Неизвестные значения из адреса молча отбрасываем: его правят руками. known — виды
// записей раздела.
export function readSimpleFilters(
  params: URLSearchParams,
  known: readonly string[],
): SimpleFilters {
  const sort = params.get('sort') ?? '';
  const categories = (params.get('cat') ?? '')
    .split(',')
    .filter((value) => known.includes(value));
  const levels = (params.get('lvl') ?? '')
    .split(',')
    .filter((value) => /^\d$/.test(value))
    .map(Number)
    .filter((level) => level <= SPELL_LEVEL_MAX);
  return {
    query: params.get('q') ?? '',
    categories: [...new Set(categories)],
    levels: [...new Set(levels)],
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
  if (filters.levels.length > 0) next.set('lvl', filters.levels.join(','));
  else next.delete('lvl');
  if (filters.sort !== 'recent') next.set('sort', filters.sort);
  else next.delete('sort');
  return next;
}

// «Сначала новые» — порядок сервера (по дате изменения), его не трогаем. Запись проходит,
// если у неё есть хоть один выбранный вид и круг из выбранных; kindsOf — def.kinds.of
// раздела, levelOf — def.levelOf (круг заклинания, у остального null).
export function applySimpleFilters<Entry extends SimpleEntry>(
  entries: Entry[],
  filters: SimpleFilters,
  kindsOf: (entry: Entry) => readonly string[],
  levelOf: (entry: Entry) => number | null = () => null,
): Entry[] {
  const query = normalizeSearch(filters.query);
  const { categories, levels } = filters;
  const found =
    query || categories.length > 0 || levels.length > 0
      ? entries.filter((entry) => {
          const level = levelOf(entry);
          return (
            (categories.length === 0 ||
              kindsOf(entry).some((kind) => categories.includes(kind))) &&
            (levels.length === 0 ||
              (level !== null && levels.includes(level))) &&
            normalizeSearch(entry.name).includes(query)
          );
        })
      : entries;
  return filters.sort === 'name'
    ? found.toSorted((a, b) => nameCollator.compare(a.name, b.name))
    : found;
}
