import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameLibraryItem, GameLibraryRef } from 'shared';
import {
  listGameLibrary,
  refreshGameLibraryEntry,
} from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';

// Список библиотеки игры. Грузится при монтировании (шторка монтирует содержимое при
// каждом открытии) и заново, когда растёт version — в игре что-то скопировали или
// обновили, пока шторка открыта.
export function useGameLibrary(gameId: string, version: number) {
  const [entries, setEntries] = useState<GameLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Какая копия сейчас обновляется — её кнопка крутится, остальные доступны.
  const [refreshing, setRefreshing] = useState<string | null>(null);
  // Ответ на устаревший запрос не затирает новый.
  const requestRef = useRef(0);

  const load = useCallback(() => {
    const request = ++requestRef.current;
    listGameLibrary(gameId)
      .then((list) => {
        if (request !== requestRef.current) return;
        setEntries(list);
        setError(null);
      })
      .catch((err: unknown) => {
        if (request !== requestRef.current) return;
        console.error('Failed to load game library', err);
        setError(errorMessage(err, 'Не удалось загрузить библиотеку'));
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [gameId]);

  // version — только повод перечитать; сам запрос от неё не зависит.
  useEffect(load, [load, version]);

  const refresh = (ref: GameLibraryRef) => {
    setRefreshing(`${ref.kind}:${ref.sourceId}`);
    setError(null);
    return refreshGameLibraryEntry(gameId, ref.kind, ref.sourceId)
      .then((entry) => {
        load();
        return entry;
      })
      .catch((err: unknown) => {
        console.error('Failed to refresh library entry', err);
        setError(errorMessage(err, 'Не удалось обновить запись'));
        return null;
      })
      .finally(() => setRefreshing(null));
  };

  return { entries, loading, error, refreshing, refresh };
}
