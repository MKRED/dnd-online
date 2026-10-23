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

// Свои ли все модели: в обстановку ставится только своя (решено с пользователем
// 2026-10-23), и у каждого положения тоже.
export async function areOwnModels(
  db: Db,
  userId: string,
  modelIds: string[],
): Promise<boolean> {
  const ids = [...new Set(modelIds)];
  const rows = await db
    .select({ id: voxelModels.id })
    .from(voxelModels)
    .where(and(inArray(voxelModels.id, ids), eq(voxelModels.authorId, userId)));
  return rows.length === ids.length;
}
