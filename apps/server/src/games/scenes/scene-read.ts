import { and, asc, eq, isNull } from 'drizzle-orm';
import type { GameScene, GameSceneStatus, GameSceneView } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  gameSceneChunks,
  gameSceneObjects,
  gameScenes,
} from '../../database/schema/index.js';
import { toMapObject } from '../../maps/storage/index.js';
import type { SceneRow } from './scene-copy.js';
import { forPlayer } from './scene-player-view.js';
import { sceneRefsView } from './scene-refs.js';

// Чтение сцен игры: список мастера, активная сцена и сама сцена для страницы сцены.

export async function listScenes(db: Db, gameId: string): Promise<GameScene[]> {
  const rows = await db
    .select()
    .from(gameScenes)
    .where(and(eq(gameScenes.gameId, gameId), isNull(gameScenes.archivedAt)))
    .orderBy(asc(gameScenes.createdAt), asc(gameScenes.id));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mapId: row.mapId,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    fog: row.fog,
    sightRange: row.sightRange,
  }));
}

// Сцена игры из списка мастера; перезапущенная — уже не в списке.
export async function findScene(
  db: Db,
  gameId: string,
  sceneId: string,
): Promise<SceneRow | undefined> {
  const [row] = await db
    .select()
    .from(gameScenes)
    .where(
      and(
        eq(gameScenes.id, sceneId),
        eq(gameScenes.gameId, gameId),
        isNull(gameScenes.archivedAt),
      ),
    )
    .limit(1);
  return row;
}

export async function findActiveScene(
  db: Db,
  gameId: string,
): Promise<SceneRow | undefined> {
  const [row] = await db
    .select()
    .from(gameScenes)
    .where(and(eq(gameScenes.gameId, gameId), eq(gameScenes.active, true)))
    .limit(1);
  return row;
}

// Активная сцена в лобби: мастеру — всегда, остальным — только открытая.
export function sceneStatus(
  scene: SceneRow | undefined,
  open: boolean,
  master: boolean,
): GameSceneStatus | null {
  if (!scene || (!master && !open)) return null;
  return { id: scene.id, name: scene.name, open };
}

// Сцена для страницы сцены. Игроку не уходят скрытые объекты и содержимое контейнеров
// (решено с пользователем 2026-10-20): ни того, ни другого он не должен видеть даже в
// ответе сервера.
export async function readSceneView(
  db: Db,
  scene: SceneRow,
  status: GameSceneStatus,
  master: boolean,
): Promise<GameSceneView> {
  const chunkRows = await db
    .select()
    .from(gameSceneChunks)
    .where(eq(gameSceneChunks.sceneId, scene.id));
  const objectRows = await db
    .select()
    .from(gameSceneObjects)
    .where(eq(gameSceneObjects.sceneId, scene.id))
    .orderBy(asc(gameSceneObjects.id));
  const objects = objectRows
    .map(toMapObject)
    .flatMap((object) => (master ? [object] : (forPlayer(object) ?? [])));
  return {
    seq: scene.seq,
    size: { width: scene.width, depth: scene.depth },
    palette: scene.palette,
    // Байты чанка — уже в формате encodeChunk, перекодировать нечего.
    chunks: chunkRows.map(({ cx, cy, cz, data }) => ({
      cx,
      cy,
      cz,
      data: data.toString('base64'),
    })),
    objects,
    nextObjectId: scene.nextObjectId,
    refs: await sceneRefsView(db, scene.gameId, objects),
    scene: status,
    contentsHidden: !master,
  };
}
