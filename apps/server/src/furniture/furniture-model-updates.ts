import { inArray } from 'drizzle-orm';
import type { CatalogOrigin, FurnitureModel } from 'shared';
import { catalogVersion } from '../catalog/copies/catalog-version.js';
import type { Db } from '../catalog/catalog-access.js';
import { voxelModels } from '../database/schema/index.js';

interface FurnitureCopy {
  origin: CatalogOrigin | null;
  models: Record<string, FurnitureModel>;
}

// Копия обстановки «обновлена» и тогда, когда автор поменял только модель одного из
// положений (docs/plan/blocks.md, этапы 8б и 8г): отпечаток модели оригинала сравниваем
// с отпечатком, с которого скопирована модель копии. Смену самих моделей или положений
// замечает отпечаток записи обстановки. Видимость модели не важна: модель — часть
// обстановки, и «Подтянуть обновления» берёт её и скрытой. Меняет записи на месте.
export async function markModelUpdates(
  db: Db,
  entries: FurnitureCopy[],
): Promise<void> {
  const copies = entries.filter(
    (entry) => entry.origin?.available && !entry.origin.updated,
  );
  const sourceIds = new Set(
    copies.flatMap((entry) =>
      Object.values(entry.models).flatMap((m) =>
        m.origin ? [m.origin.id] : [],
      ),
    ),
  );
  if (!sourceIds.size) return;
  const models = await db
    .select({
      id: voxelModels.id,
      details: voxelModels.details,
      extra: voxelModels.extra,
    })
    .from(voxelModels)
    .where(inArray(voxelModels.id, [...sourceIds]));
  const versionOf = new Map(models.map((row) => [row.id, catalogVersion(row)]));
  for (const entry of copies) {
    const changed = Object.values(entry.models).some((model) => {
      const version = model.origin && versionOf.get(model.origin.id);
      return version !== undefined && version !== model.origin!.version;
    });
    if (changed) entry.origin!.updated = true;
  }
}
