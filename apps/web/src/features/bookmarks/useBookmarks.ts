import { useEffect, useState } from 'react';
import type { Bookmark, BookmarkKind } from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import { listBookmarks, removeBookmark } from './bookmarksApi';

// Закладки игрока для страницы «Закладки» и снятие плашки «Автор закрыл доступ».
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    listBookmarks()
      .then(setBookmarks)
      .catch((err: unknown) => {
        console.error('Failed to load bookmarks', err);
        setError(errorMessage(err, 'Не удалось загрузить закладки'));
      });
  }, []);

  const remove = (kind: BookmarkKind, targetId: string) => {
    setRemoving(targetId);
    setRemoveError(null);
    removeBookmark(kind, targetId)
      .then(() =>
        setBookmarks(
          (list) =>
            list?.filter(
              (b) => !(b.kind === kind && b.targetId === targetId),
            ) ?? null,
        ),
      )
      .catch((err: unknown) => {
        console.error('Failed to remove bookmark', err);
        setRemoveError(errorMessage(err, 'Не удалось убрать закладку'));
      })
      .finally(() => setRemoving(null));
  };

  return { bookmarks, error, removing, removeError, remove };
}
