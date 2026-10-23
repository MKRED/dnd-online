import { inArray } from 'drizzle-orm';
import type { CatalogOrigin, FurnitureModel } from 'shared';
import { catalogVersion } from '../catalog/copies/catalog-version.js';
import type { Db } from '../catalog/catalog-access.js';
import { furniture, voxelModels } from '../database/schema/index.js';

interface FurnitureCopy {
  origin: CatalogOrigin | null;
  model: FurnitureModel | null;
}

// Копия обстановки «обновлена» и тогда, когда автор поменял только модель
// (docs/plan/blocks.md, этап 8б): отпечаток модели оригинала сравниваем с отпечатком, с
// которого скопирована модель копии. Видимость самой модели не важна: модель — часть
// обстановки, и «Подтянуть обновления» берёт её и скрытой. Меняет записи на месте.
export async function markModelUpdates(
  db: Db,
  entries: FurnitureCopy[],
): Promise<void> {
  const copies = entries.filter(
    (entry) => entry.origin?.available && !entry.origin.updated && entry.model,
  );
  if (!copies.length) return;
  const originals = await db
    .select({ id: furniture.id, extra: furniture.extra })
    .from(furniture)
    .where(
      inArray(furniture.id, [...new Set(copies.map((e) => e.origin!.id))]),
    );
  const modelOf = new Map(
    originals.map((row) => [row.id, row.extra.modelId as string | undefined]),
  );
  const modelIds = [
    ...new Set([...modelOf.values()].filter(Boolean)),
  ] as string[];
  if (!modelIds.length) return;
  const models = await db
    .select({
      id: voxelModels.id,
      details: voxelModels.details,
      extra: voxelModels.extra,
    })
    .from(voxelModels)
    .where(inArray(voxelModels.id, modelIds));
  const versionOf = new Map(models.map((row) => [row.id, catalogVersion(row)]));
  for (const entry of copies) {
    const version = versionOf.get(modelOf.get(entry.origin!.id) ?? '');
    if (version && version !== entry.model!.origin?.version)
      entry.origin!.updated = true;
  }
}
