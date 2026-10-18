import { isBookmarkKind, type Bookmark, type BookmarkKind } from 'shared';
import { normalizeSearch } from '../catalog/catalogSearch';

// Подписи видов — чипы и разделы страницы «Закладки», в порядке BOOKMARK_KINDS.
export const BOOKMARK_KIND_LABELS: Record<BookmarkKind, string> = {
  character: 'Персонажи',
  item: 'Предметы',
  ability: 'Способности',
  effect: 'Эффекты',
};

// Вид и поиск — в адресе (?kind=item&q=меч), как фильтры каталога: «Назад» с карточки
// возвращает тот же список. null — «Все».
export interface BookmarkFilters {
  kind: BookmarkKind | null;
  query: string;
}

export function readBookmarkFilters(params: URLSearchParams): BookmarkFilters {
  const kind = params.get('kind');
  return {
    kind: isBookmarkKind(kind) ? kind : null,
    query: params.get('q') ?? '',
  };
}

export function writeBookmarkFilters(
  filters: BookmarkFilters,
): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.kind) next.set('kind', filters.kind);
  if (filters.query) next.set('q', filters.query);
  return next;
}

// Что показать при фильтрах. У плашки «Автор закрыл доступ» нет названия, и поиск её
// не находит: плашки видны, только пока поиск пустой.
export function filterBookmarks(
  bookmarks: Bookmark[],
  { kind, query }: BookmarkFilters,
): Bookmark[] {
  const search = normalizeSearch(query);
  return bookmarks.filter(
    (bookmark) =>
      (kind === null || bookmark.kind === kind) &&
      (search === ''
        ? true
        : bookmark.target !== null &&
          normalizeSearch(bookmark.target.name).includes(search)),
  );
}

// Сколько закладок каждого вида — число у чипа, без учёта поиска.
export function countBookmarks(
  bookmarks: Bookmark[],
): Record<BookmarkKind, number> {
  const counts = { character: 0, item: 0, ability: 0, effect: 0 };
  for (const bookmark of bookmarks) counts[bookmark.kind] += 1;
  return counts;
}
