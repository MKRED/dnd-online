import type {
  GameLibraryEntry,
  GameLibraryItem,
  GameLibraryKind,
} from 'shared';
import type { ImagePathFn } from '../catalog';
import { apiRequest as request } from '../../lib/apiRequest';

// Библиотека игры — только мастеру (docs/plan/done/game.md, этап 4).
const libraryBase = (gameId: string) => `/games/${gameId}/library`;

export function listGameLibrary(gameId: string): Promise<GameLibraryItem[]> {
  return request(libraryBase(gameId));
}

export function getGameLibraryEntry(
  gameId: string,
  kind: GameLibraryKind,
  sourceId: string,
): Promise<GameLibraryEntry> {
  return request(`${libraryBase(gameId)}/${kind}/${sourceId}`);
}

// «Обновить из справочника»: одна запись, новые связи докопируются.
export function refreshGameLibraryEntry(
  gameId: string,
  kind: GameLibraryKind,
  sourceId: string,
): Promise<GameLibraryEntry> {
  return request(`${libraryBase(gameId)}/${kind}/${sourceId}/refresh`, {
    method: 'POST',
  });
}

// Картинка копии — по тому же правилу кеша, что у справочников: версия своя у копии.
export function libraryImagePath(
  gameId: string,
  kind: GameLibraryKind,
): ImagePathFn {
  return (sourceId, variant, version) =>
    `${libraryBase(gameId)}/${kind}/${sourceId}/image?variant=${variant}&v=${version}`;
}
