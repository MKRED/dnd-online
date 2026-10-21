import { ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  FIGURE_SIZE,
  findPath,
  movementLeft,
  stepFacing,
  type MapOp,
  type Occupant,
  type Vec3,
} from 'shared';
import { gameCreatures, gameFigures } from '../../database/schema/index.js';
import { runOps, type EditLimits } from '../../maps/edit-run.js';
import { loadSceneWorld } from '../figures/scene-world.js';
import { CREATURE_CANT_REACH, CREATURE_DOWN } from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { loadSceneEditRefs } from '../scenes/scene-edit-refs.js';
import { commitSceneEdit } from '../scenes/scene-journal.js';
import { sceneTarget } from '../scenes/scene-storage.js';
import { findCreature, type CreatureActor } from './creature-edits.js';
import { creatureMovement } from './creature-movement.js';
import {
  loadCreatureEffects,
  loadCreatureHitPoints,
  loadCreatureRows,
} from './creature-read.js';

// Ход монстра или НПС мастером (docs/plan/done/creature-movement.md; правила —
// docs/dnd/movement.md). Вызывать в транзакции, которая взяла lockGame.

export interface CreatureMoveActor extends CreatureActor {
  scene: SceneRow;
  limits: EditLimits;
}

// Запас существа: Скорость с эффектами экземпляра, пройдено, «Рывки».
async function allowanceOf(actor: CreatureActor, objectId: number) {
  const creature = await findCreature(actor, objectId);
  const rows = await loadCreatureRows(actor.tx, actor.sceneId);
  const row = rows.find((r) => r.objectId === objectId);
  const effects = await loadCreatureEffects(
    actor.tx,
    actor.gameId,
    actor.sceneId,
  );
  const movement = creatureMovement(creature, row, effects.get(objectId) ?? []);
  const hitPoints = await loadCreatureHitPoints(
    actor.tx,
    actor.sceneId,
    [creature],
    rows,
  );
  return { creature, movement, hitPoints: hitPoints.get(objectId)! };
}

// Ход по пути в пределах запаса. Мешают персонажи игроков; другие монстры и НПС —
// союзники: сквозь них можно пройти, остановиться нельзя (правило дома, сторон у
// монстров нет). Скрытых мастер видит — они учитываются. Перемещение — правка сцены
// (moveObject и взгляд по последнему шагу) с записью creature.moved.
export async function moveCreature(
  actor: CreatureMoveActor,
  objectId: number,
  to: Vec3,
): Promise<void> {
  const { tx, scene } = actor;
  const { creature, movement, hitPoints } = await allowanceOf(actor, objectId);
  if (hitPoints.current === 0) throw new ConflictException(CREATURE_DOWN);
  const world = await loadSceneWorld(tx, scene);
  const self = world.creatures.find((c) => c.objectId === objectId);
  if (!self) throw new ConflictException(CREATURE_CANT_REACH);
  const figures = await tx
    .select({ x: gameFigures.x, y: gameFigures.y, z: gameFigures.z })
    .from(gameFigures)
    .where(eq(gameFigures.sceneId, scene.id));
  const others: Occupant[] = [
    ...world.creatures
      .filter((c) => c.objectId !== objectId)
      .map(({ at, size }) => ({ at, size, ally: true })),
    ...figures.map(({ x, y, z }): Occupant => ({
      at: [x, y, z],
      size: FIGURE_SIZE,
      ally: false,
    })),
  ];
  const left = movementLeft(movement);
  const from = self.at;
  const path = findPath(world.map, from, to, self.size, left, others);
  if (!path || path.path.length < 2) {
    throw new ConflictException(CREATURE_CANT_REACH);
  }
  const facing = stepFacing(path.path[path.path.length - 2], to);
  const ops: MapOp[] = [
    { op: 'moveObject', id: objectId, at: to },
    { op: 'updateObject', id: objectId, object: { facing } },
  ];
  const run = await runOps(
    tx,
    sceneTarget(scene),
    ops,
    actor.limits,
    (objects) =>
      loadSceneEditRefs(tx, actor.gameId, actor.userId, objects, ops),
  );
  await commitSceneEdit(
    tx,
    actor.gameId,
    actor.userId,
    scene,
    run,
    {
      kind: 'creature.moved',
      intent: { objectId, to },
      move: {
        creature: { objectId, name: creature.name },
        from,
        to,
        cost: path.cost,
        left: left - path.cost,
      },
    },
    actor.limits.maxChunks,
  );
  await saveAllowance(actor, objectId, hitPoints, {
    moved: movement.moved + path.cost,
  });
}

// Запас одного существа: обновить (его новый ход) или добавить «Рывок».
export async function changeCreatureAllowance(
  actor: CreatureActor,
  objectId: number,
  change: 'refresh' | 'dash',
): Promise<void> {
  const { creature, movement, hitPoints } = await allowanceOf(actor, objectId);
  const event = { objectId, name: creature.name };
  const common = {
    actorId: actor.userId,
    as: { kind: 'master' } as const,
    sceneId: actor.sceneId,
    intent: { objectId },
  };
  if (change === 'refresh') {
    await saveAllowance(actor, objectId, hitPoints, { moved: 0, dashes: 0 });
    await appendGameEvent(actor.tx, actor.gameId, {
      ...common,
      kind: 'creature.refreshed',
      result: { creature: event },
    });
    return;
  }
  const dashes = movement.dashes + 1;
  await saveAllowance(actor, objectId, hitPoints, { dashes });
  await appendGameEvent(actor.tx, actor.gameId, {
    ...common,
    kind: 'creature.dashed',
    result: { creature: event, dashes },
  });
}

// Строки состояния у существа может ещё не быть — она появляется с полными хитами.
async function saveAllowance(
  actor: CreatureActor,
  objectId: number,
  hitPoints: { current: number; temp: number },
  set: { moved?: number; dashes?: number },
) {
  await actor.tx
    .insert(gameCreatures)
    .values({
      sceneId: actor.sceneId,
      objectId,
      hitPointsCurrent: hitPoints.current,
      hitPointsTemp: hitPoints.temp,
      ...set,
    })
    .onConflictDoUpdate({
      target: [gameCreatures.sceneId, gameCreatures.objectId],
      set,
    });
}

// «Новый раунд»: запас снова полный у всех существ сцены. Возвращает число обновлённых
// строк состояния: у существа без строки запас и так полный.
export async function refreshSceneCreatures(
  actor: Pick<CreatureActor, 'tx'>,
  sceneId: string,
): Promise<number> {
  const rows = await actor.tx
    .update(gameCreatures)
    .set({ moved: 0, dashes: 0 })
    .where(eq(gameCreatures.sceneId, sceneId))
    .returning({ objectId: gameCreatures.objectId });
  return rows.length;
}
