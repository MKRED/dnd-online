import { useEffect, useState } from 'react';
import type { BookmarkKind } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import { addBookmark, getBookmarkState, removeBookmark } from '../bookmarksApi';

interface Known {
  key: string;
  bookmarked: boolean | null;
  error: string | null;
}

// Стоит ли закладка на цели и переключение. bookmarked — null, пока не узнали:
// тогда звезда не нажимается, чтобы клик не ушёл наугад. Состояние помечено целью:
// перешли на другую запись — старое не показывается, пока не придёт новое.
export function useBookmark(kind: BookmarkKind, id: string) {
  const key = `${kind}/${id}`;
  const [known, setKnown] = useState<Known | null>(null);
  const [busy, setBusy] = useState(false);
  const current = known?.key === key ? known : null;
  const bookmarked = current?.bookmarked ?? null;

  useEffect(() => {
    let cancelled = false;
    getBookmarkState(kind, id)
      .then((state) => {
        if (!cancelled) {
          setKnown({ key, bookmarked: state.bookmarked, error: null });
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load bookmark state', err);
        if (!cancelled) {
          setKnown({
            key,
            bookmarked: null,
            error: errorMessage(err, 'Не удалось узнать, есть ли закладка'),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id, key]);

  const toggle = () => {
    if (bookmarked === null || busy) return;
    const next = !bookmarked;
    setBusy(true);
    setKnown({ key, bookmarked, error: null });
    (next ? addBookmark(kind, id) : removeBookmark(kind, id))
      .then(() => setKnown({ key, bookmarked: next, error: null }))
      .catch((err: unknown) => {
        console.error('Failed to toggle bookmark', err);
        setKnown({
          key,
          bookmarked,
          error: errorMessage(
            err,
            next
              ? 'Не удалось добавить закладку'
              : 'Не удалось убрать закладку',
          ),
        });
      })
      .finally(() => setBusy(false));
  };

  return { bookmarked, busy, error: current?.error ?? null, toggle };
}
