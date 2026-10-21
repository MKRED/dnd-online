import {
  gameSceneChunks,
  gameSceneObjects,
} from '../../database/schema/index.js';
import type { EditTarget } from '../../maps/edit-run.js';
import {
  tableStorage,
  type ChunkTable,
  type EditStorage,
  type ObjectTable,
} from '../../maps/storage/index.js';
import type { SceneRow } from './scene-copy.js';

// Чанки и объекты сцены игры — в таблицах той же формы, что у карты: правка сцены идёт
// тем же кодом, что и правка карты (docs/plan/done/game.md, этап 6).
const SCENE_CHUNKS: ChunkTable = {
  table: gameSceneChunks,
  owner: gameSceneChunks.sceneId,
  ownerKey: 'sceneId',
  cx: gameSceneChunks.cx,
  cy: gameSceneChunks.cy,
  cz: gameSceneChunks.cz,
  data: gameSceneChunks.data,
};

const SCENE_OBJECTS: ObjectTable = {
  table: gameSceneObjects,
  owner: gameSceneObjects.sceneId,
  ownerKey: 'sceneId',
  id: gameSceneObjects.id,
  kind: gameSceneObjects.kind,
  x: gameSceneObjects.x,
  y: gameSceneObjects.y,
  z: gameSceneObjects.z,
  hidden: gameSceneObjects.hidden,
  fields: gameSceneObjects.fields,
};

export function sceneStorage(sceneId: string): EditStorage {
  return tableStorage(SCENE_CHUNKS, SCENE_OBJECTS, sceneId);
}

export function sceneTarget(scene: SceneRow): EditTarget {
  return {
    storage: sceneStorage(scene.id),
    palette: scene.palette,
    size: { width: scene.width, depth: scene.depth },
    nextObjectId: scene.nextObjectId,
  };
}
