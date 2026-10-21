import { eq } from 'drizzle-orm';
import {
  creatureBody,
  creatureHealth,
  FIGURE_SIZE,
  FEET_PER_CELL,
  maskUnion,
  partySight,
  type Box3,
  type MapState,
  type Viewer,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  characters,
  gameFigures,
  gameMembers,
} from '../../database/schema/index.js';
import { loadSceneWorld, type SceneWorld } from '../figures/scene-world.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { loadFog, saveFog, type SceneFog } from './fog-storage.js';

// Пересчёт тумана войны активной сцены (docs/plan/fog-of-war.md, «Когда пересчитываем»).
// Вызывает запись журнала (game-journal.ts) для событий из FOG_EVENT_KINDS — в той же
// транзакции, что и само изменение, после него.

export interface FogRecount {
  scene: SceneRow;
  // Сцена после изменения: блоки и объекты — для разницы игрокам (fog-delta.ts).
  world: SceneWorld;
  before: SceneFog;
  after: SceneFog;
  // Сколько чанков переписано.
  written: number;
}

// Смотрят фигурки персонажей на местах (ушедший с места уже не смотрит, даже пока его
// строка фигурки не снята). Без сознания и погибший не смотрят: Бессознательный не
// осознаёт окружение (docs/dnd/vision.md).
async function fogViewers(
  tx: DbTransaction,
  scene: SceneRow,
  map: MapState,
): Promise<Viewer[]> {
  const rows = await tx
    .select({
      x: gameFigures.x,
      y: gameFigures.y,
      z: gameFigures.z,
      current: characters.hitPointsCurrent,
      max: characters.hitPointsMax,
      deathFailures: characters.deathSaveFailures,
    })
    .from(gameFigures)
    .innerJoin(
      gameMembers,
      eq(gameMembers.characterId, gameFigures.characterId),
    )
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .where(eq(gameFigures.sceneId, scene.id));
  return rows.flatMap(({ x, y, z, ...hp }) => {
    const health = creatureHealth(hp);
    if (health === 'down' || health === 'dead') return [];
    return [
      {
        body: creatureBody(map, [x, y, z], FIGURE_SIZE),
        rangeCells: scene.sightRange / FEET_PER_CELL,
      },
    ];
  });
}

// Клетки сцены: по высоте карта не ограничена сверху здесь — дальность и так режет.
function sceneBounds(scene: SceneRow): Box3 {
  return {
    min: [0, 0, 0],
    max: [scene.width - 1, Infinity, scene.depth - 1],
  };
}

// null — у игры нет активной сцены или туман на ней выключен.
export async function recountFog(
  tx: DbTransaction,
  gameId: string,
): Promise<FogRecount | null> {
  const scene = await findActiveScene(tx, gameId);
  if (!scene?.fog) return null;
  const world = await loadSceneWorld(tx, scene);
  const viewers = await fogViewers(tx, scene, world.map);
  const creatures = world.creatures
    .filter((creature) => !creature.hidden)
    .map(({ at, size }) => creatureBody(world.map, at, size));
  const visible = partySight(world.map, viewers, creatures, sceneBounds(scene));
  const before = await loadFog(tx, scene.id);
  const explored = maskUnion(new Map(), before.explored);
  maskUnion(explored, visible);
  const after = { explored, visible };
  const written = await saveFog(tx, scene.id, before, after);
  return { scene, world, before, after, written };
}
