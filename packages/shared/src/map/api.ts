import type { SectionAxis } from './asciiSection.js';
import type { PackedChangeset } from './changesetPacking.js';
import type { Box3 } from './coords.js';
import type { Palette } from './palette.js';

// Ответы HTTP API карт — общие для сервера и веба.

export interface MapInfo {
  id: string;
  name: string;
  // Номер последней записи журнала изменений.
  seq: number;
  createdAt: string;
  updatedAt: string;
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
  palette: Palette;
  chunks: MapChunkData[];
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
}

export interface MapSliceResponse {
  seq: number;
  y: number;
  text: string;
}

export interface MapSummaryResponse {
  seq: number;
  bounds: Box3 | null;
  blockCounts: Record<string, number>;
  chunkCount: number;
  palette: Palette;
}

export interface MapSectionResponse {
  seq: number;
  axis: SectionAxis;
  at: number;
  text: string;
}
