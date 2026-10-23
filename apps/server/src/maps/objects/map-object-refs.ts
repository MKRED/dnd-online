import { and, eq, inArray } from 'drizzle-orm';
import {
  emptyObjectRefs,
  emptyRefsView,
  objectRefIds,
  type MapObjectRefsView,
  type ObjectRefs,
} from 'shared';
import { toCatalogImage } from '../../catalog/catalog-image.mapper.js';
import type { Db } from '../../catalog/catalog-access.js';
import {
  characterImages,
  characterModels,
  characters,
  itemImages,
  items,
  monsterImages,
  monsters,
} from '../../database/schema/index.js';
import { toMonsterFields } from '../../monsters/monsters.config.js';
import { loadFurnitureRefs } from './furniture-refs.js';

export type RefIds = ReturnType<typeof objectRefIds>;

export interface LoadedRefs {
  // Что показать клиенту: имя и картинка или заглушка.
  view: MapObjectRefsView;
  // Что знает правка карты (editMap): размеры, роли и что можно поставить.
  refs: ObjectRefs;
}

// Ссылки объектов одним заходом на каждую таблицу. Доступ — как в каталоге: своё или
// опубликованное; чужое скрытое — заглушка «скрыт», не найденное — «удалён»
// (docs/plan/done/map-objects.md, «Ссылки на каталог»). Монстра ищем и скрытого: его размер
// нужен месту на карте.
export async function loadRefs(
  db: Db,
  userId: string,
  ids: RefIds,
): Promise<LoadedRefs> {
  const view = emptyRefsView();
  const refs = emptyObjectRefs();

  if (ids.monsters.size > 0) {
    const rows = await db
      .select({ entry: monsters, image: monsterImages })
      .from(monsters)
      .leftJoin(monsterImages, eq(monsterImages.ownerId, monsters.id))
      .where(inArray(monsters.id, [...ids.monsters]));
    for (const { entry, image } of rows) {
      const { statBlock, role } = toMonsterFields(
        entry.category,
        entry.details,
        entry.extra,
      );
      const visible = entry.authorId === userId || entry.isPublic;
      const size = statBlock.size;
      view.monsters[entry.id] = visible
        ? {
            missing: null,
            size,
            name: entry.name,
            role,
            image: toCatalogImage(image),
          }
        : { missing: 'hidden', size };
      refs.monsters.set(entry.id, {
        name: entry.name,
        size,
        role,
        usable: visible,
      });
    }
    for (const id of ids.monsters) {
      view.monsters[id] ??= { missing: 'deleted', size: 'medium' };
    }
  }

  if (ids.items.size > 0) {
    const rows = await db
      .select({ entry: items, image: itemImages })
      .from(items)
      .leftJoin(itemImages, eq(itemImages.ownerId, items.id))
      .where(inArray(items.id, [...ids.items]));
    for (const { entry, image } of rows) {
      const visible = entry.authorId === userId || entry.isPublic;
      view.items[entry.id] = visible
        ? {
            missing: null,
            name: entry.name,
            image: toCatalogImage(image),
            weight: entry.weight,
          }
        : { missing: 'hidden' };
      if (visible) refs.items.set(entry.id, entry.weight);
    }
    for (const id of ids.items) view.items[id] ??= { missing: 'deleted' };
  }

  if (ids.npcs.size > 0) {
    const rows = await db
      .select({
        id: characters.id,
        userId: characters.userId,
        kind: characters.kind,
        name: characters.name,
        mainImage: {
          id: characterImages.id,
          thumbVersion: characterImages.thumbVersion,
        },
        // Метаданные модели, без байтов (docs/plan/done/character-models.md, этап 4).
        model: {
          format: characterModels.format,
          version: characterModels.version,
          color: characterModels.color,
          fit: characterModels.fit,
        },
      })
      .from(characters)
      .leftJoin(
        characterImages,
        and(
          eq(characterImages.characterId, characters.id),
          eq(characterImages.isMain, true),
        ),
      )
      .leftJoin(characterModels, eq(characterModels.characterId, characters.id))
      .where(inArray(characters.id, [...ids.npcs]));
    for (const row of rows) {
      // Ставить можно только своего НПС; свой игровой персонаж на карте (тип сменили
      // после постановки) показывается как есть, но заново его не поставить.
      const own = row.userId === userId;
      view.npcs[row.id] = own
        ? {
            missing: null,
            name: row.name,
            mainImage: row.mainImage,
            model: row.model,
          }
        : { missing: 'hidden' };
      if (own && row.kind === 'npc') refs.npcs.add(row.id);
    }
    for (const id of ids.npcs) view.npcs[id] ??= { missing: 'deleted' };
  }

  const furnitureRefs = await loadFurnitureRefs(db, userId, ids.furniture);
  view.furniture = furnitureRefs.view;
  refs.furniture = furnitureRefs.refs;

  return { view, refs };
}
