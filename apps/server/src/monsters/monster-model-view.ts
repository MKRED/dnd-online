import { inArray } from 'drizzle-orm';
import {
  readVoxelModelFields,
  type MonsterModelLink,
  type MonsterModelView,
  type MonsterRecordFields,
  type MonsterRefModel,
  type VoxelModelFields,
} from 'shared';
import type { Db } from '../catalog/catalog-access.js';
import { voxelModels } from '../database/schema/index.js';

// Модели монстров (docs/plan/done/monster-models.md) — любого автора: модель — часть монстра,
// и её видит всякий, кто видит монстра, как модели обстановки. Удалённая модель читается
// как null — на карте у монстра снова карточка.

interface LoadedModel {
  name: string;
  authorId: string;
  isPublic: boolean;
  updatedAt: Date;
  fields: VoxelModelFields;
}

export async function loadMonsterModels(
  db: Db,
  links: (MonsterModelLink | null)[],
): Promise<Map<string, LoadedModel>> {
  const ids = [...new Set(links.flatMap((link) => link?.id ?? []))];
  if (!ids.length) return new Map();
  const rows = await db
    .select({
      id: voxelModels.id,
      name: voxelModels.name,
      authorId: voxelModels.authorId,
      isPublic: voxelModels.isPublic,
      updatedAt: voxelModels.updatedAt,
      extra: voxelModels.extra,
    })
    .from(voxelModels)
    .where(inArray(voxelModels.id, ids));
  return new Map(
    rows.map(({ id, extra, ...row }) => [
      id,
      { ...row, fields: readVoxelModelFields(extra) },
    ]),
  );
}

// Модель на карте: вид и поправка из ссылки; нет модели — null.
export function monsterRefModel(
  models: Map<string, LoadedModel>,
  link: MonsterModelLink | null,
): MonsterRefModel | null {
  const model = link && models.get(link.id);
  return model ? { ...model.fields, id: link.id, scale: link.scale } : null;
}

// Вид модели в карточке монстра.
export async function attachMonsterModelViews(
  db: Db,
  userId: string,
  entries: MonsterRecordFields[],
): Promise<void> {
  const models = await loadMonsterModels(
    db,
    entries.map((entry) => entry.model),
  );
  for (const entry of entries) {
    const link = entry.model;
    const model = link ? models.get(link.id) : undefined;
    entry.modelView =
      link && model
        ? ({
            id: link.id,
            name: model.name,
            // Открыть в «Моделях» смотрящий может свою или опубликованную.
            available: model.authorId === userId || model.isPublic,
            ...model.fields,
          } satisfies MonsterModelView)
        : null;
  }
}
