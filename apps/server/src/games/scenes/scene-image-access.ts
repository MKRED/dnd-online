import { and, eq, sql } from 'drizzle-orm';
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

// Есть ли на сцене видимый игрокам объект с этой ссылкой (docs/plan/game.md, этап 5):
// по нему игрок получает картинку копии, остальная библиотека ему закрыта.
export async function sceneShowsEntry(
  db: Db,
  sceneId: string,
  kind: SceneImageKind,
  sourceId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: gameSceneObjects.id })
    .from(gameSceneObjects)
    .where(
      and(
        eq(gameSceneObjects.sceneId, sceneId),
        eq(gameSceneObjects.kind, kind),
        eq(gameSceneObjects.hidden, false),
        sql`${gameSceneObjects.fields} ->> ${REF_FIELD[kind]} = ${sourceId}`,
      ),
    )
    .limit(1);
  return row !== undefined;
}
