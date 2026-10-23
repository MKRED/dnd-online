import { and, eq, inArray } from 'drizzle-orm';
import {
  readCatalogOrigin,
  readVoxelModelFields,
  type FurnitureModel,
} from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { voxelModels } from '../database/schema/index.js';

// Модели обстановки по id — целиком и любого автора: модель — часть обстановки, и её
// видит всякий, кто видит обстановку (docs/plan/blocks.md, этап 8б). Видимость
// оригинала копии модели и её обновления дописывает attachOrigins.
export async function loadFurnitureModels(
  db: Db,
  ids: string[],
): Promise<Map<string, FurnitureModel>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({
      id: voxelModels.id,
      name: voxelModels.name,
      extra: voxelModels.extra,
    })
    .from(voxelModels)
    .where(inArray(voxelModels.id, [...new Set(ids)]));
  return new Map(
    rows.map((row) => {
      const origin = readCatalogOrigin(row.extra);
      return [
        row.id,
        {
          id: row.id,
          name: row.name,
          ...readVoxelModelFields(row.extra),
          origin: origin && { ...origin, available: false, updated: false },
        },
      ];
    }),
  );
}

// Своя ли модель: в обстановку ставится только своя (решено с пользователем 2026-10-23).
export async function isOwnModel(
  db: Db,
  userId: string,
  modelId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: voxelModels.id })
    .from(voxelModels)
    .where(and(eq(voxelModels.id, modelId), eq(voxelModels.authorId, userId)));
  return Boolean(row);
}
