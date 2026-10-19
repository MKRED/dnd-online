import {
  MONSTER_CHALLENGES,
  MONSTER_TYPES,
  isMonsterChallenge,
  type Monster,
  type MonsterChallenge,
  type MonsterType,
} from 'shared';
import { nameCollator, normalizeSearch } from '../../catalog';

// Фильтры справочника монстров в адресе, как у других разделов: поиск (q), типы (cat),
// ПО «от» и «до» (cr_min, cr_max) и сортировка (sort). ПО — диапазоном, а не чипами:
// противника ищут как «от 1/4 до 2» (решено с пользователем 2026-10-19).
export interface MonsterFilters {
  query: string;
  // Пустой список — все типы.
  types: MonsterType[];
  // null — без границы.
  crMin: MonsterChallenge | null;
  crMax: MonsterChallenge | null;
  sort: 'recent' | 'name';
}

export const DEFAULT_MONSTER_FILTERS: MonsterFilters = {
  query: '',
  types: [],
  crMin: null,
  crMax: null,
  sort: 'recent',
};

const readChallenge = (value: string | null) =>
  isMonsterChallenge(value) ? value : null;

// Неизвестные значения из адреса молча отбрасываем: его правят руками.
export function readMonsterFilters(params: URLSearchParams): MonsterFilters {
  const types = (params.get('cat') ?? '')
    .split(',')
    .filter((value): value is MonsterType =>
      MONSTER_TYPES.includes(value as MonsterType),
    );
  return {
    query: params.get('q') ?? '',
    types: [...new Set(types)],
    crMin: readChallenge(params.get('cr_min')),
    crMax: readChallenge(params.get('cr_max')),
    sort: params.get('sort') === 'name' ? 'name' : 'recent',
  };
}

// Значения по умолчанию в адрес не пишутся; остальные параметры (вкладка) сохраняются.
export function writeMonsterFilters(
  params: URLSearchParams,
  filters: MonsterFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('q', filters.query);
  set('cat', filters.types.join(','));
  set('cr_min', filters.crMin);
  set('cr_max', filters.crMax);
  set('sort', filters.sort === 'recent' ? null : filters.sort);
  return next;
}

const rank = (challenge: MonsterChallenge) =>
  MONSTER_CHALLENGES.indexOf(challenge);

// «Сначала новые» — порядок сервера, его не трогаем. «От» больше «до» — ничего не
// подходит: границы показываются как выбраны, а не меняются местами молча.
export function applyMonsterFilters(
  monsters: Monster[],
  filters: MonsterFilters,
): Monster[] {
  const query = normalizeSearch(filters.query);
  const { types, crMin, crMax } = filters;
  const found = monsters.filter((monster) => {
    const cr = rank(monster.statBlock.challenge);
    return (
      (types.length === 0 || types.includes(monster.category)) &&
      (crMin === null || cr >= rank(crMin)) &&
      (crMax === null || cr <= rank(crMax)) &&
      normalizeSearch(monster.name).includes(query)
    );
  });
  return filters.sort === 'name'
    ? found.toSorted((a, b) => nameCollator.compare(a.name, b.name))
    : found;
}
