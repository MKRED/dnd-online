import { and, eq, sql } from 'drizzle-orm';
import { objectSeen, type FogMasks } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { gameSceneObjects } from '../../database/schema/index.js';

// Чьи картинки сцена показывает игрокам: существа и предметы на полу. Содержимое
// контейнеров игроку не уходит — и картинки его тоже.
export const SCENE_IMAGE_KINDS = ['monster', 'npc', 'item'] as const;
export type SceneImageKind = (typeof SCENE_IMAGE_KINDS)[number];

const REF_FIELD: Record<SceneImageKind, string> = {
  monster: 'monsterId',
  npc: 'characterId',
  item: 'itemId',
};

// Есть ли на сцене видимый игрокам объект с этой ссылкой (docs/plan/done/game.md, этап 5):
// по нему игрок получает картинку копии, остальная библиотека ему закрыта.
// Под туманом — только объект, который игрок видит (objectSeen): иначе картинка выдала
// бы, кто стоит в тумане.
export async function sceneShowsEntry(
  db: Db,
  sceneId: string,
  kind: SceneImageKind,
  sourceId: string,
  fog: FogMasks | null = null,
): Promise<boolean> {
  const rows = await db
    .select({
      x: gameSceneObjects.x,
      y: gameSceneObjects.y,
      z: gameSceneObjects.z,
    })
    .from(gameSceneObjects)
    .where(
      and(
        eq(gameSceneObjects.sceneId, sceneId),
        eq(gameSceneObjects.kind, kind),
        eq(gameSceneObjects.hidden, false),
        sql`${gameSceneObjects.fields} ->> ${REF_FIELD[kind]} = ${sourceId}`,
      ),
    );
  return rows.some(({ x, y, z }) => objectSeen({ kind, at: [x, y, z] }, fog));
}
