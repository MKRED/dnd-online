import {
  objectRefIds,
  objectSliceLines,
  summarizeObjects,
  type MapSize,
  type Palette,
  type SliceRegion,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import type { maps } from '../../database/schema/index.js';
import { loadChunks } from '../map-storage.js';
import { sizeOf } from '../maps.mapper.js';
import { loadRefs } from './map-object-refs.js';
import { loadObjects } from './map-object-storage.js';

type MapRow = typeof maps.$inferSelect;

// Объекты карты и справочник их ссылок — для рендера и сводки.
export async function loadObjectsWithView(
  tx: DbTransaction,
  userId: string,
  map: MapRow,
) {
  const objects = await loadObjects(tx, map.id, map.nextObjectId);
  const { view } = await loadRefs(
    tx,
    userId,
    objectRefIds(objects.byId.values()),
  );
  return { objects, view };
}

// Строки объектов под ASCII-срезом уровня y. Сводка — по всем объектам (номера стартов
// идут по всей карте), а предупреждения («нельзя стоять») смотрят на соседние уровни,
// поэтому нужны все чанки, а не только срез.
export async function objectSliceText(
  tx: DbTransaction,
  userId: string,
  map: MapRow,
  y: number,
  region: SliceRegion,
): Promise<string[]> {
  const { objects, view } = await loadObjectsWithView(tx, userId, map);
  if (![...objects.byId.values()].some((o) => o.at[1] === y)) return [];
  const store = await loadChunks(tx, map.id, 'all');
  const sized: { store: typeof store; palette: Palette; size: MapSize } = {
    store,
    palette: map.palette,
    size: sizeOf(map),
  };
  return objectSliceLines(
    summarizeObjects(sized, objects.byId.values(), view),
    y,
    region,
  );
}
