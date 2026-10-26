import { useEffect, useState } from 'react';
import type { Item } from 'shared';
import type { RecordKind } from '../../../features/catalog';
import { getGameLibraryEntry } from '../../../features/games';
import { getItem } from '../../../features/items';
import {
  ABILITIES,
  EFFECTS,
  type SimpleEntry,
} from '../../../features/simpleCatalog';
import { ApiError, errorMessage } from '../../../lib/apiRequest';

export type RecordEntry =
  | { kind: 'item'; record: Item }
  | { kind: 'ability' | 'effect'; record: SimpleEntry };

function fromCatalog(kind: RecordKind, id: string): Promise<RecordEntry> {
  if (kind === 'item') return getItem(id).then((record) => ({ kind, record }));
  const def = kind === 'ability' ? ABILITIES : EFFECTS;
  return def.api.get(id).then((record) => ({ kind, record }));
}

// Запись для окна способности, эффекта или предмета (замечания после первой партии,
// 2026-10-26). Мастеру — копия из библиотеки игры, как у монстров и НПС: её видит игра,
// даже если автор скрыл или удалил запись; если копии нет — справочник. Игроку библиотека
// закрыта — запись из справочника, как на её странице.
export function useRecordEntry(
  gameId: string,
  master: boolean,
  kind: RecordKind,
  id: string,
) {
  const [loaded, setLoaded] = useState<RecordEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = master
      ? getGameLibraryEntry(gameId, kind, id)
          .then((entry) => ({ kind, record: entry.record }) as RecordEntry)
          // Копии нет (запись игре не нужна) — берём из справочника; другие ошибки — дальше.
          .catch((err: unknown) => {
            if (!(err instanceof ApiError) || err.status !== 404) throw err;
            return fromCatalog(kind, id);
          })
      : fromCatalog(kind, id);
    load
      .then((entry) => {
        if (alive) setLoaded(entry);
      })
      .catch((err: unknown) => {
        console.error('Failed to load the record for its window', err);
        if (alive) setError(errorMessage(err, 'Не удалось открыть запись'));
      });
    return () => {
      alive = false;
    };
  }, [gameId, master, kind, id]);

  return { loaded, error };
}
