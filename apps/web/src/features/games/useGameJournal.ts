import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEvent } from 'shared';
import { listGameEvents } from './gamesApi';
import { errorMessage } from '../../lib/apiRequest';

// Записи журнала игры страницами, новые сверху. Первая страница грузится сразу: шторка
// монтирует содержимое при каждом открытии, так что открытие и есть обновление.
// live — записи, пришедшие по сокету (старые первыми): те, что новее загруженных,
// встают сверху без перезагрузки и без потери подгруженных страниц.
export function useGameJournal(gameId: string, live: GameEvent[]) {
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

  const top = events[0]?.seq ?? 0;
  // Пока первая страница грузится, живые записи не показываем: она их и так принесёт.
  const fresh = loading
    ? []
    : live.filter((event) => event.seq > top).reverse();
  return {
    events: fresh.length > 0 ? [...fresh, ...events] : events,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  };
}
