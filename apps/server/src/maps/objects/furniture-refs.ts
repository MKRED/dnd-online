import { inArray } from 'drizzle-orm';
import {
  isFurnitureMount,
  readVoxelModelFields,
  type FurnitureRef,
  type FurnitureRefView,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { furniture, voxelModels } from '../../database/schema/index.js';

// Обстановка объектов карты (docs/plan/blocks.md, этап 8в) — из справочника владельца
// карты, а на сцене — мастера, как свои блоки: правка своей обстановки видна сразу, в
// библиотеку игры она не копируется. Модель приходит целиком: её рисуют на карте, и игроку
// на сцене она нужна вся. Поставить можно только свою (usable).
export async function loadFurnitureRefs(
  db: Db,
  ownerId: string,
  ids: Set<string>,
): Promise<{
  view: Record<string, FurnitureRefView>;
  refs: Map<string, FurnitureRef>;
}> {
  const view: Record<string, FurnitureRefView> = {};
  const refs = new Map<string, FurnitureRef>();
  if (ids.size === 0) return { view, refs };
  const rows = await db
    .select({
      id: furniture.id,
      authorId: furniture.authorId,
      name: furniture.name,
      extra: furniture.extra,
    })
    .from(furniture)
    .where(inArray(furniture.id, [...ids]));
  const modelIds = rows.flatMap((row) =>
    typeof row.extra.modelId === 'string' ? [row.extra.modelId] : [],
  );
  const models = modelIds.length
    ? await db
        .select({ id: voxelModels.id, extra: voxelModels.extra })
        .from(voxelModels)
        .where(inArray(voxelModels.id, modelIds))
    : [];
  const modelById = new Map(
    models.map((row) => [row.id, readVoxelModelFields(row.extra)]),
  );
  for (const row of rows) {
    const mount = isFurnitureMount(row.extra.mount) ? row.extra.mount : 'floor';
    const model = modelById.get(row.extra.modelId as string) ?? null;
    view[row.id] = { missing: null, name: row.name, mount, model };
    refs.set(row.id, {
      name: row.name,
      size: model?.size ?? [1, 1, 1],
      mount,
      cells: model?.cells ?? {},
      voxels: model?.voxels ?? null,
      usable: row.authorId === ownerId,
    });
  }
  for (const id of ids) view[id] ??= { missing: 'deleted' };
  return { view, refs };
}
