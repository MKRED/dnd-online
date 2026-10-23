import { inArray } from 'drizzle-orm';
import {
  furnitureModelIds,
  isFurnitureMount,
  readFurniturePositions,
  readVoxelModelFields,
  type FurnitureRef,
  type FurnitureRefView,
  type Vec3,
  type VoxelModelFields,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { furniture, voxelModels } from '../../database/schema/index.js';

// Обстановка объектов карты (docs/plan/blocks.md, этап 8в) — из справочника владельца
// карты, а на сцене — мастера, как свои блоки: правка своей обстановки видна сразу, в
// библиотеку игры она не копируется. Модели (и всех положений двери) приходят целиком: их
// рисуют на карте, и игроку на сцене они нужны все. Поставить можно только свою (usable).
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
  // Модели записи — основная и всех положений двери (этап 8г).
  const fieldsOf = (extra: Record<string, unknown>) => ({
    modelId: typeof extra.modelId === 'string' ? extra.modelId : '',
    positions: readFurniturePositions(extra.positions),
  });
  const modelIds = rows
    .flatMap((row) => furnitureModelIds(fieldsOf(row.extra)))
    .filter(Boolean);
  const models = modelIds.length
    ? await db
        .select({ id: voxelModels.id, extra: voxelModels.extra })
        .from(voxelModels)
        .where(inArray(voxelModels.id, [...new Set(modelIds)]))
    : [];
  const modelById = new Map(
    models.map((row) => [row.id, readVoxelModelFields(row.extra)]),
  );
  const look = (model: VoxelModelFields | null) => ({
    size: model?.size ?? ([1, 1, 1] as Vec3),
    cells: model?.cells ?? {},
    voxels: model?.voxels ?? null,
  });
  for (const row of rows) {
    const mount = isFurnitureMount(row.extra.mount) ? row.extra.mount : 'floor';
    const fields = fieldsOf(row.extra);
    const model = modelById.get(fields.modelId) ?? null;
    const positions = fields.positions.map(({ name, modelId }) => ({
      name,
      model: modelById.get(modelId) ?? null,
    }));
    view[row.id] = { missing: null, name: row.name, mount, model, positions };
    refs.set(row.id, {
      name: row.name,
      mount,
      ...look(model),
      positions: positions.map((p) => ({ name: p.name, ...look(p.model) })),
      usable: row.authorId === ownerId,
    });
  }
  for (const id of ids) view[id] ??= { missing: 'deleted' };
  return { view, refs };
}
