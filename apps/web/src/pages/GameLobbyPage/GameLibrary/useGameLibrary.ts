import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameLibraryItem, GameLibraryRef } from 'shared';
import {
  listGameLibrary,
  refreshGameLibraryEntry,
} from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';

// Значение refreshing, пока идёт «Обновить все».
export const ALL = 'all';

// Список библиотеки игры. Грузится при монтировании (шторка монтирует содержимое при
// каждом открытии) и заново, когда растёт version — в игре что-то скопировали или
// обновили, пока шторка открыта.
export function useGameLibrary(gameId: string, version: number) {
  const [entries, setEntries] = useState<GameLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Какая копия сейчас обновляется (`kind:sourceId`, или ALL) — её кнопка крутится.
  const [refreshing, setRefreshing] = useState<string | null>(null);
  // Ответ на устаревший запрос не затирает новый.
  const requestRef = useRef(0);

  const load = useCallback(() => {
    const request = ++requestRef.current;
    return listGameLibrary(gameId)
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
  useEffect(() => {
    void load();
  }, [load, version]);

  const refresh = (ref: GameLibraryRef) => {
    setRefreshing(`${ref.kind}:${ref.sourceId}`);
    setError(null);
    return refreshGameLibraryEntry(gameId, ref.kind, ref.sourceId)
      .then((entry) => {
        void load();
        return entry;
      })
      .catch((err: unknown) => {
        console.error('Failed to refresh library entry', err);
        setError(errorMessage(err, 'Не удалось обновить запись'));
        return null;
      })
      .finally(() => setRefreshing(null));
  };

  // «Обновить все»: по одной, чтобы связи докопировались по порядку и сервер не получил
  // пачку параллельных записей. Ошибка одной не останавливает остальные — в конце их
  // имена в одной строке. Список перечитывается один раз, в конце.
  const refreshAll = async (items: GameLibraryItem[]) => {
    setRefreshing(ALL);
    setError(null);
    const failed: string[] = [];
    for (const item of items) {
      try {
        await refreshGameLibraryEntry(gameId, item.kind, item.sourceId);
      } catch (err: unknown) {
        console.error('Failed to refresh library entry', item, err);
        failed.push(item.name);
      }
    }
    // Удачное чтение списка сбрасывает ошибку — поэтому имена неудавшихся после него.
    await load();
    if (failed.length > 0)
      setError(`Не удалось обновить: ${failed.join(', ')}`);
    setRefreshing(null);
  };

  return { entries, loading, error, refreshing, refresh, refreshAll };
}
