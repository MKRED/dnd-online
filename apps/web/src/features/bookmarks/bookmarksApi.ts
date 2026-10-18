import type { Bookmark, BookmarkKind, BookmarkState } from 'shared';
import { apiRequest } from '../../lib/apiRequest';

// Закладки игрока (docs/plan/bookmarks.md).
const targetPath = (kind: BookmarkKind, id: string) =>
  `/bookmarks/${kind}/${id}`;

export const listBookmarks = (): Promise<Bookmark[]> =>
  apiRequest('/bookmarks');

export const getBookmarkState = (
  kind: BookmarkKind,
  id: string,
): Promise<BookmarkState> => apiRequest(targetPath(kind, id));

export const addBookmark = (
  kind: BookmarkKind,
  id: string,
): Promise<BookmarkState> =>
  apiRequest(targetPath(kind, id), { method: 'PUT' });

export const removeBookmark = (kind: BookmarkKind, id: string): Promise<void> =>
  apiRequest(targetPath(kind, id), { method: 'DELETE' });
