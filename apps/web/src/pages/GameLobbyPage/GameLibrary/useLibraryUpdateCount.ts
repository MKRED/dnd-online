import { useCallback, useEffect, useRef, useState } from 'react';
import { listGameLibrary } from '../../../features/games';

// Сколько копий в библиотеке можно обновить из справочника — число на кнопке «Библиотека»
// у мастера. Удалённые и скрытые («Нет в справочнике») не считаются: их не обновить.
// Перечитывается, когда в игре скопировали или обновили записи (version), когда мастер
// закрыл шторку (в ней могли обновить) и когда вернулся на вкладку: справочник могли
// поправить в другой вкладке, а об этом сокет игры не скажет.
export function useLibraryUpdateCount(
  gameId: string,
  enabled: boolean,
  version: number,
  drawerOpened: boolean,
): number {
  const [count, setCount] = useState(0);
  // Ответ на устаревший запрос не затирает новый.
  const requestRef = useRef(0);

  const load = useCallback(() => {
    if (!enabled) return;
    const request = ++requestRef.current;
    listGameLibrary(gameId)
      .then((list) => {
        if (request !== requestRef.current) return;
        setCount(list.filter((entry) => entry.source === 'changed').length);
      })
      .catch((err: unknown) =>
        console.error('Failed to count library updates', err),
      );
  }, [gameId, enabled]);

  // Пока шторка открыта, она перечитывает себя сама; закрытие — повод пересчитать.
  // version — только повод перечитать.
  useEffect(() => {
    if (!drawerOpened) load();
  }, [load, version, drawerOpened]);

  useEffect(() => {
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  return enabled ? count : 0;
}
