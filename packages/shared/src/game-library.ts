import type { Ability } from './abilities.js';
import type { CatalogImage } from './catalogImage.js';
import type { Effect } from './effects.js';
import type { Item } from './items.js';
import type { Monster } from './monsters.js';

// Библиотека игры (docs/plan/game.md, «Справочники не влияют на игру»): копии записей
// справочников, которые игра использует. Копия одна на игру по виду и исходному id; правка,
// скрытие и удаление записи в справочнике её не трогают.

export const GAME_LIBRARY_KINDS = [
  'monster',
  'item',
  'ability',
  'effect',
] as const;
export type GameLibraryKind = (typeof GAME_LIBRARY_KINDS)[number];

export interface GameLibraryRef {
  kind: GameLibraryKind;
  sourceId: string;
}

// Копия рядом со справочником глазами мастера: same — запись не менялась после копии,
// changed — автор её правил, missing — удалена или скрыта от мастера, обновить нельзя.
export type GameLibrarySource = 'same' | 'changed' | 'missing';

// Строка списка библиотеки.
export interface GameLibraryItem extends GameLibraryRef {
  name: string;
  // Категория записи как в справочнике: тип монстра, категория предмета или способности;
  // у эффекта — всегда basic.
  category: string;
  image: CatalogImage | null;
  copiedAt: string;
  refreshedAt: string | null;
  source: GameLibrarySource;
}

interface GameLibraryRecords {
  monster: Monster;
  item: Item;
  ability: Ability;
  effect: Effect;
}

// Карточка копии: запись в том же виде, что отдаёт справочник. id записи — исходный id,
// автор — каким был при копии; связи (способности монстра, эффекты шагов, состав набора)
// читаются из той же библиотеки, а чего в ней нет — заглушки, как скрытое в листе.
export type GameLibraryEntry = {
  [K in GameLibraryKind]: Omit<GameLibraryItem, 'kind'> & {
    kind: K;
    record: GameLibraryRecords[K];
  };
}[GameLibraryKind];
