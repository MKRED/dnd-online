import { eq, sql } from 'drizzle-orm';
import { objectRefIds, type GameLibraryRef } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  gameSceneChunks,
  gameSceneObjects,
  gameScenes,
  mapChunks,
  mapObjects,
  type maps,
} from '../../database/schema/index.js';
import { toMapObject } from '../../maps/storage/index.js';
import { copyToLibrary } from '../library/library-copy.js';

type MapRow = typeof maps.$inferSelect;
export type SceneRow = typeof gameScenes.$inferSelect;

// Новая сцена — копия карты мастера (docs/plan/done/game.md, этап 5). Транзакция уже взяла
// lockGame, а строку карты — на изменение (findOwnedMap с forUpdate): правка карты не
// вклинится между палитрой и чанками. Монстры, НПС и предметы со сцены копируются в
// библиотеку глазами мастера. Возвращает сцену и сколько записей скопировано.
export async function createScene(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  map: MapRow,
  active: boolean,
  // Настройки тумана перезапущенной сцены переходят в новую копию. У новой сцены туман
  // включён (замечания после первой партии, 2026-10-26): выключенный забывали включить,
  // и игроки видели всю карту.
  fog: Pick<SceneRow, 'fog'> & Partial<Pick<SceneRow, 'sightRange'>> = {
    fog: true,
  },
): Promise<{ scene: SceneRow; libraryCopied: number }> {
  const [scene] = await tx
    .insert(gameScenes)
    .values({
      gameId,
      mapId: map.id,
      name: map.name,
      palette: map.palette,
      width: map.width,
      depth: map.depth,
      nextObjectId: map.nextObjectId,
      active,
      ...fog,
    })
    .returning();
  // Чанки бывают большими — копируются внутри базы, не проходя через сервер.
  await tx.insert(gameSceneChunks).select(
    tx
      .select({
        sceneId: sql<string>`${scene.id}::uuid`.as('scene_id'),
        cx: mapChunks.cx,
        cy: mapChunks.cy,
        cz: mapChunks.cz,
        data: mapChunks.data,
      })
      .from(mapChunks)
      .where(eq(mapChunks.mapId, map.id)),
  );
  const objects = await tx
    .insert(gameSceneObjects)
    .select(
      tx
        .select({
          sceneId: sql<string>`${scene.id}::uuid`.as('scene_id'),
          id: mapObjects.id,
          kind: mapObjects.kind,
          x: mapObjects.x,
          y: mapObjects.y,
          z: mapObjects.z,
          hidden: mapObjects.hidden,
          fields: mapObjects.fields,
        })
        .from(mapObjects)
        .where(eq(mapObjects.mapId, map.id)),
    )
    .returning();
  const libraryCopied = await copyToLibrary(
    tx,
    gameId,
    masterId,
    libraryRoots(objects.map(toMapObject)),
  );
  return { scene, libraryCopied };
}

// Что со сцены идёт в библиотеку: монстры, НПС, предметы на полу и в контейнерах.
function libraryRoots(
  objects: Parameters<typeof objectRefIds>[0],
): GameLibraryRef[] {
  const ids = objectRefIds(objects);
  return [
    ...[...ids.monsters].map((sourceId) => ({
      kind: 'monster' as const,
      sourceId,
    })),
    ...[...ids.npcs].map((sourceId) => ({ kind: 'npc' as const, sourceId })),
    ...[...ids.items].map((sourceId) => ({ kind: 'item' as const, sourceId })),
  ];
}
