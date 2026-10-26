import { useEffect, useState } from 'react';
import type { Character, Item, Monster } from 'shared';
import { getGameLibraryEntry } from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';

export type LibraryRecord =
  | { kind: 'monster'; record: Monster }
  | { kind: 'npc'; record: Character }
  | { kind: 'item'; record: Item };

// Копия монстра или НПС в библиотеке игры — то, что показывают вкладки окна карточки
// (раньше это делала шторка «Полный лист»). Копия в игре не меняется на ходу, поэтому
// читается один раз на окно.
export function useLibraryRecord(
  gameId: string,
  source: { kind: 'monster' | 'npc' | 'item'; id: string } | null,
) {
  const [loaded, setLoaded] = useState<LibraryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kind = source?.kind ?? null;
  const id = source?.id ?? null;

  useEffect(() => {
    if (!kind || !id) return;
    let alive = true;
    getGameLibraryEntry(gameId, kind, id)
      .then((entry) => {
        if (!alive) return;
        setLoaded(
          entry.kind === 'monster'
            ? { kind: 'monster', record: entry.record }
            : entry.kind === 'item'
              ? { kind: 'item', record: entry.record }
              : { kind: 'npc', record: entry.record as Character },
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to load the library copy for the card', err);
        if (alive) setError(errorMessage(err, 'Не удалось открыть карточку'));
      });
    return () => {
      alive = false;
    };
  }, [gameId, kind, id]);

  return { loaded, error };
}
