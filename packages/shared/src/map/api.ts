import type { FurnitureContainer } from '../voxelModel/furnitureContainer.js';
import type { BlockGroupInfo } from './customBlocks.js';
import type { SectionAxis } from './asciiSection.js';
import type { PackedChangeset } from './changesetPacking.js';
import type { Box3 } from './coords.js';
import type { MapSize } from './mapSize.js';
import type { Palette } from './palette.js';
import type { MapObject } from './objects/mapObject.js';
import type { MapObjectRefsView } from './objects/objectRefViews.js';
import type { MapObjectSummary } from './objects/objectSummary.js';

// Ответы HTTP API карт — общие для сервера и веба.

export interface MapInfo {
  id: string;
  name: string;
  // Номер последней записи журнала изменений.
  seq: number;
  // Размер карты в клетках (mapSize.ts); высота общая для всех карт.
  width: number;
  depth: number;
  createdAt: string;
  updatedAt: string;
}

// Карта в списке «Мои карты»: число стартов — на сколько игроков она рассчитана.
export interface MapListItem extends MapInfo {
  startCount: number;
}

export interface MapChunkData {
  cx: number;
  cy: number;
  cz: number;
  // Чанк в формате encodeChunk, base64.
  data: string;
}

// Вся карта для рендера. seq — точка отсчёта: изменения после неё клиент получит отдельно.
export interface MapChunksResponse {
  seq: number;
  // Размер приходит вместе с блоками: resize меняет их разом, и два отдельных
  // запроса могли бы разойтись.
  size: MapSize;
  palette: Palette;
  chunks: MapChunkData[];
  // Объекты на карте и справочник их ссылок (docs/plan/done/map-objects.md) — тем же снимком.
  objects: MapObject[];
  // Следующий номер объекта: клиент держит его в состоянии карты, как сервер.
  nextObjectId: number;
  refs: MapObjectRefsView;
  // Свои группы блоков владельца (docs/plan/blocks.md, этап 3): по ним клиент строит тот
  // же каталог, что и сервер, — и рисует, и считает правила для своих блоков.
  blocks: BlockGroupInfo[];
}

export interface MapEditResult {
  seq: number;
  changedCells: number;
  // Клетки, которые undo/redo не тронул, потому что их уже изменил кто-то другой.
  conflicts: number;
  paletteAdded: string[];
  // Что реально изменилось, в прямом виде (для undo «до» и «после» уже переставлены):
  // клиент применяет это к своей копии карты через applyChangeset(..., 'forward'),
  // а не перечитывает её целиком.
  changes: PackedChangeset;
  // Номера объектов, поставленных этой правкой, по порядку операций.
  createdObjectIds: number[];
  // Справочник ссылок затронутых объектов: новый гоблин без него рисовался бы без
  // картинки и размера, а отмена могла вернуть объект с монстром, удалённым после
  // загрузки карты.
  refs: MapObjectRefsView;
}

export interface MapSliceResponse {
  seq: number;
  y: number;
  text: string;
}

export interface MapSummaryResponse {
  seq: number;
  // Размер карты и предел высоты — где можно строить. bounds — где уже построено.
  size: MapSize;
  maxHeight: number;
  bounds: Box3 | null;
  blockCounts: Record<string, number>;
  chunkCount: number;
  palette: Palette;
  objects: MapObjectSummary[];
  // Свои группы владельца: имена своих блоков в палитре — это id групп.
  blocks: BlockGroupInfo[];
}

export interface MapSectionResponse {
  seq: number;
  axis: SectionAxis;
  at: number;
  text: string;
}

// Поиск по каталогу для расстановки объектов (нейросеть через MCP, редактор).
export type MapCatalogKind = 'monster' | 'item' | 'npc' | 'furniture';

export interface MapCatalogEntry {
  id: string;
  name: string;
  // Монстр: размер и роль; предмет: категория и вес в фунтах (груз контейнера). У НПС —
  // только имя.
  size?: string;
  role?: string;
  category?: string;
  weight?: number;
  // Обстановка (этап 8в): размер модели [x, y, z] в клетках и крепление; у контейнера
  // (этап 11) — его вместимость, замок и содержимое по умолчанию.
  modelSize?: number[];
  mount?: string;
  container?: FurnitureContainer | null;
}
