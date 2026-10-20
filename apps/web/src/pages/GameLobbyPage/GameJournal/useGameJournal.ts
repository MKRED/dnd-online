import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEvent } from 'shared';
import { listGameEvents } from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';

// Записи журнала игры страницами, новые сверху. Первая страница грузится сразу: шторка
// монтирует содержимое при каждом открытии, так что открытие и есть обновление.
export function useGameJournal(gameId: string) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Номер последнего запроса первой страницы: ответ на устаревший запрос не затирает новый.
  const requestRef = useRef(0);

  const fetchFirst = useCallback(() => {
    const request = ++requestRef.current;
    listGameEvents(gameId)
      .then((page) => {
        if (request !== requestRef.current) return;
        setEvents(page.events);
        setHasMore(page.hasMore);
      })
      .catch((err: unknown) => {
        if (request !== requestRef.current) return;
        console.error('Failed to load game events', err);
        setError(errorMessage(err, 'Не удалось загрузить журнал'));
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [gameId]);

  useEffect(fetchFirst, [fetchFirst]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    fetchFirst();
  };

  const loadMore = () => {
    const last = events.at(-1);
    if (!last) return;
    const request = requestRef.current;
    setLoadingMore(true);
    setError(null);
    listGameEvents(gameId, last.seq)
      .then((page) => {
        // Пока грузилось, журнал обновили сверху — эта страница уже не к месту.
        if (request !== requestRef.current) return;
        setEvents((prev) => [...prev, ...page.events]);
        setHasMore(page.hasMore);
      })
      .catch((err: unknown) => {
        console.error('Failed to load older game events', err);
        setError(errorMessage(err, 'Не удалось загрузить записи'));
      })
      .finally(() => setLoadingMore(false));
  };

  return { events, hasMore, loading, loadingMore, error, refresh, loadMore };
}
