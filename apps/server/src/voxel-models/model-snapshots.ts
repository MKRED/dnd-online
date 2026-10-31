import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../catalog/catalog-access.js';
import { entryVisibleTo } from '../catalog/catalog-access.js';
import { voxelModelImages, voxelModels } from '../database/schema/index.js';
import { VOXEL_MODEL_ACCESS } from './voxel-models.config.js';

// Версии снимков моделей с загруженным файлом (docs/plan/blocks.md, этап 9г) для тех, кто
// получает модель внутри обстановки: её список и окно «Что поставить». Снимок — картинка
// записи модели, и отдаёт её маршрут картинки только тем, кто видит саму модель (как и
// файл). Поэтому версия — только у видимой читающему модели; у скрытой чужой — нет, и
// миниатюра остаётся по вокселям, а не заглушкой от 404.
export async function loadModelSnapshots(
  db: Db,
  readerId: string,
  ids: string[],
): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({ id: voxelModelImages.ownerId, version: voxelModelImages.version })
    .from(voxelModelImages)
    .innerJoin(voxelModels, eq(voxelModels.id, voxelModelImages.ownerId))
    .where(
      and(
        inArray(voxelModelImages.ownerId, [...new Set(ids)]),
        entryVisibleTo(VOXEL_MODEL_ACCESS, readerId),
      ),
    );
  return new Map(rows.map((row) => [row.id, row.version]));
}

// Версия снимка модели: только у модели с файлом — у воксельной картинку не показываем.
export const snapshotVersionOf = (
  snapshots: Map<string, number>,
  id: string,
  hasMesh: boolean,
): number | null => (hasMesh ? (snapshots.get(id) ?? null) : null);
