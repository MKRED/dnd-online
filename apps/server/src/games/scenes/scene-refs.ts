import { and, eq, or } from 'drizzle-orm';
import {
  emptyObjectRefs,
  emptyRefsView,
  objectRefIds,
  type GameLibraryKind,
  type MapObject,
  type MapObjectRefsView,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { gameLibrary } from '../../database/schema/index.js';
import type { LoadedRefs, RefIds } from '../../maps/objects/map-object-refs.js';
import { toMonsterFields } from '../../monsters/monsters.config.js';

// Справочник ссылок объектов сцены — из библиотеки игры, а не из справочников: правка
// справочника идущую игру не трогает (docs/plan/done/game.md, «Справочники не влияют на
// игру»). Чего в библиотеке нет (скрыто от мастера или удалено до копии), для игры нет
// вовсе — заглушка «удалено».
export async function sceneRefsView(
  db: Db,
  gameId: string,
  objects: Iterable<MapObject>,
): Promise<MapObjectRefsView> {
  return (await sceneRefs(db, gameId, objectRefIds(objects))).view;
}

// То же и для правки сцены (editMap): размеры, роли и веса — из копий. Поставить можно
// всё, что есть в библиотеке; новое туда сначала копирует scene-edit-refs.ts.
export async function sceneRefs(
  db: Db,
  gameId: string,
  ids: RefIds,
): Promise<LoadedRefs> {
  const view = emptyRefsView();
  const refs = emptyObjectRefs();
  const wanted: [GameLibraryKind, Set<string>][] = [
    ['monster', ids.monsters],
    ['npc', ids.npcs],
    ['item', ids.items],
  ];
  const conditions = wanted.flatMap(([kind, set]) =>
    [...set].map((sourceId) =>
      and(eq(gameLibrary.kind, kind), eq(gameLibrary.sourceId, sourceId)),
    ),
  );
  const rows =
    conditions.length === 0
      ? []
      : await db
          .select()
          .from(gameLibrary)
          .where(and(eq(gameLibrary.gameId, gameId), or(...conditions)));
  for (const row of rows) {
    const { record } = row;
    if (row.kind === 'monster') {
      const { statBlock, role } = toMonsterFields(
        String(record.category),
        objectOf(record.details),
        objectOf(record.extra),
      );
      view.monsters[row.sourceId] = {
        missing: null,
        size: statBlock.size,
        name: row.name,
        role,
        image: row.image,
      };
      refs.monsters.set(row.sourceId, {
        name: row.name,
        size: statBlock.size,
        role,
        usable: true,
      });
    } else if (row.kind === 'item') {
      const weight = Number(record.weight) || 0;
      view.items[row.sourceId] = {
        missing: null,
        name: row.name,
        image: row.image,
        weight,
      };
      refs.items.set(row.sourceId, weight);
    } else if (row.kind === 'npc') {
      // Картинка НПС — копия в библиотеке; id картинки галереи игре не нужен, путь
      // строится по НПС и версии (gameScenesApi.ts в вебе).
      view.npcs[row.sourceId] = {
        missing: null,
        name: row.name,
        mainImage: row.image
          ? { id: row.sourceId, thumbVersion: row.image.version }
          : null,
      };
      refs.npcs.add(row.sourceId);
    }
  }
  for (const id of ids.monsters)
    view.monsters[id] ??= { missing: 'deleted', size: 'medium' };
  for (const id of ids.items) view.items[id] ??= { missing: 'deleted' };
  for (const id of ids.npcs) view.npcs[id] ??= { missing: 'deleted' };
  return { view, refs };
}

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}
