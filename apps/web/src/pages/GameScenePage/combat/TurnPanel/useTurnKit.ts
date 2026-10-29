import { useEffect, useState } from 'react';
import type { Character, GameCreatureSpells, Monster } from 'shared';
import { abilitiesCatalog } from '../../../../features/abilityLinks';
import type { ImagePathFn } from '../../../../features/catalog';
import {
  getGameCharacter,
  getGameLibraryEntry,
  libraryImagePath,
} from '../../../../features/games';
import { itemImagePath } from '../../../../features/items';
import { errorMessage } from '../../../../lib/apiRequest';
import { characterKit, monsterKit } from './turnKit';
import type { TurnKit } from './turnTiles';

// Чей набор показывает блок: герой — его лист в игре (перечитывается с version, как
// карточка), монстр и НПС — их копия в библиотеке игры; ячейки и «подготовлено» НПС —
// свои у экземпляра.
export type TurnKitSource =
  | { kind: 'figure'; characterId: string }
  | { kind: 'npc'; sourceId: string; spells: GameCreatureSpells | null }
  | { kind: 'monster'; sourceId: string };

type Loaded =
  | { key: string; kind: 'character'; record: Character }
  | { key: string; kind: 'monster'; record: Monster };

const keyOf = (s: TurnKitSource) =>
  s.kind === 'figure' ? `figure:${s.characterId}` : `${s.kind}:${s.sourceId}`;

export interface TurnKitView {
  kit: TurnKit | null;
  abilityImage: ImagePathFn;
  itemImage: ImagePathFn;
  error: string | null;
}

export function useTurnKit(
  gameId: string,
  source: TurnKitSource | null,
  version: number,
): TurnKitView {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = source ? keyOf(source) : null;
  const kind = source?.kind ?? null;
  const id =
    source === null
      ? null
      : source.kind === 'figure'
        ? source.characterId
        : source.sourceId;
  // Копия в библиотеке на ходу не меняется — version нужен только листу героя.
  const figureVersion = kind === 'figure' ? version : 0;

  useEffect(() => {
    if (!key || !kind || !id) return;
    let alive = true;
    const request: Promise<Loaded> =
      kind === 'figure'
        ? getGameCharacter(gameId, id).then((record) => ({
            key,
            kind: 'character',
            record,
          }))
        : getGameLibraryEntry(gameId, kind, id).then((entry) =>
            entry.kind === 'monster'
              ? { key, kind: 'monster', record: entry.record }
              : { key, kind: 'character', record: entry.record as Character },
          );
    request
      .then((next) => {
        if (alive) setLoaded(next);
      })
      .catch((err: unknown) => {
        console.error('Failed to load the turn kit', err);
        if (alive)
          setError(errorMessage(err, 'Не удалось загрузить способности'));
      });
    return () => {
      alive = false;
    };
  }, [gameId, key, kind, id, figureVersion]);

  const library = kind === 'npc' || kind === 'monster';
  const shown = loaded && loaded.key === key ? loaded : null;
  const kit =
    shown === null || source === null
      ? null
      : shown.kind === 'monster'
        ? monsterKit(shown.record)
        : source.kind === 'npc'
          ? characterKit(shown.record, source.spells)
          : characterKit(shown.record);
  return {
    kit,
    abilityImage: library
      ? libraryImagePath(gameId, 'ability')
      : abilitiesCatalog.imagePath,
    itemImage: library ? libraryImagePath(gameId, 'item') : itemImagePath,
    error,
  };
}
