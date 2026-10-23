import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { Db } from '../../catalog/catalog-access.js';
import { furniture, gameSceneObjects } from '../../database/schema/index.js';

// Стоит ли на сцене обстановка с этой моделью, видимая игрокам (docs/plan/blocks.md, этап
// 9): по ней игрок получает загруженный файл модели — свою или одного из положений двери.
// Модель — запись мастера и может быть скрыта; обстановку игрок видит целиком, как блоки
// мастера. Туман здесь не проверяется: файл показывает вид вещи, а не кто стоит в тумане.
export async function sceneShowsMesh(
  db: Db,
  sceneId: string,
  modelId: string,
  // Мастер видит и скрытую от игроков обстановку.
  withHidden = false,
): Promise<boolean> {
  const rows = await db
    .select({
      furnitureId: sql<string>`${gameSceneObjects.fields} ->> 'furnitureId'`,
    })
    .from(gameSceneObjects)
    .where(
      and(
        eq(gameSceneObjects.sceneId, sceneId),
        eq(gameSceneObjects.kind, 'furniture'),
        withHidden ? undefined : eq(gameSceneObjects.hidden, false),
      ),
    );
  const ids = [...new Set(rows.map((row) => row.furnitureId))].filter(Boolean);
  if (!ids.length) return false;
  const [found] = await db
    .select({ id: furniture.id })
    .from(furniture)
    .where(
      and(
        inArray(furniture.id, ids),
        or(
          sql`${furniture.extra} ->> 'modelId' = ${modelId}`,
          sql`${furniture.extra} -> 'positions' @> ${JSON.stringify([{ modelId }])}::jsonb`,
        ),
      ),
    )
    .limit(1);
  return Boolean(found);
}
