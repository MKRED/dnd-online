import { useCallback, useState } from 'react';
import type { GameEvent } from 'shared';
import { unreadCount } from './unreadCount';

// Сколько живых записей держать: столько же, сколько лобби.
const LIVE_EVENTS_MAX = 200;

// Живые записи журнала для вкладки «Журнал» на сцене (docs/plan/scene-page.md, этап 7):
// приходят мастеру по сокету и копятся, пока вкладка закрыта, — открытие показывает их
// поверх первой страницы. seen — последняя запись, которую мастер видел во вкладке.
export function useJournalLive(userId: string | null) {
  const [live, setLive] = useState<GameEvent[]>([]);
  // Растёт, когда пропущено слишком много: вкладка перечитывает журнал целиком.
  const [key, setKey] = useState(0);
  const [seen, setSeen] = useState(0);

  const add = useCallback(
    (events: GameEvent[]) =>
      setLive((prev) => [...prev, ...events].slice(-LIVE_EVENTS_MAX)),
    [],
  );
  const resync = useCallback(
    (missed: GameEvent[] | null) => {
      if (missed) {
        add(missed);
        return;
      }
      setLive([]);
      setKey((value) => value + 1);
    },
    [add],
  );
  const last = live.at(-1)?.seq ?? 0;
  const markSeen = useCallback(
    () => setSeen((prev) => Math.max(prev, last)),
    [last],
  );
  return {
    live,
    key,
    add,
    resync,
    markSeen,
    unread: unreadCount(live, seen, userId),
  };
}

export type JournalLive = ReturnType<typeof useJournalLive>;
