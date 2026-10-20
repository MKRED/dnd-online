import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import {
  FIGURE_SIZE,
  findPath,
  insideMap,
  movementLeft,
  occupantsAt,
  standHeight,
  stepFacing,
  type GameEventAs,
  type Occupant,
  type Vec3,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  characters,
  gameFigures,
  gameMembers,
} from '../../database/schema/index.js';
import {
  FIGURE_CANT_REACH,
  FIGURE_CANT_STAND,
  FIGURE_NOT_FOUND,
  FIGURE_NOT_YOURS,
  MASTER_ONLY_FIGURES,
  NO_ACTIVE_SCENE,
} from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { canMoveFigure, figureSpeeds } from './figure-read.js';
import { loadSceneWorld, type SceneWorld } from './scene-world.js';

// Ход фигурки и правки мастера (docs/plan/game.md, этап 7; правила — docs/dnd/movement.md).
// Вызывать внутри транзакции, которая уже взяла lockGame.

export interface FigureActor {
  tx: DbTransaction;
  gameId: string;
  userId: string;
  masterId: string;
}

const isMaster = (actor: FigureActor) => actor.userId === actor.masterId;

function assertMaster(actor: FigureActor) {
  if (!isMaster(actor)) throw new ForbiddenException(MASTER_ONLY_FIGURES);
}

async function activeScene(actor: FigureActor): Promise<SceneRow> {
  const scene = await findActiveScene(actor.tx, actor.gameId);
  if (!scene) throw new ConflictException(NO_ACTIVE_SCENE);
  return scene;
}

// Фигурка на сцене с именем, владельцем, управляющим и Скоростью персонажа.
async function findFigure(actor: FigureActor, characterId: string) {
  const [row] = await actor.tx
    .select({
      figure: gameFigures,
      name: characters.name,
      ownerId: characters.userId,
      speed: characters.speed,
      controllerId: gameMembers.controllerId,
    })
    .from(gameFigures)
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .leftJoin(gameMembers, eq(gameMembers.characterId, gameFigures.characterId))
    .where(
      and(
        eq(gameFigures.gameId, actor.gameId),
        eq(gameFigures.characterId, characterId),
      ),
    );
  if (!row) throw new NotFoundException(FIGURE_NOT_FOUND);
  return row;
}

// Кто мешает фигурке: существа карты и другие фигурки (союзники). Скрытых существ
// игрок не видит — его ход их не учитывает, иначе отказ выдал бы засаду.
async function othersOf(
  actor: FigureActor,
  world: SceneWorld,
  characterId: string,
  withHidden: boolean,
): Promise<Occupant[]> {
  const figures = await actor.tx
    .select({ x: gameFigures.x, y: gameFigures.y, z: gameFigures.z })
    .from(gameFigures)
    .where(
      and(
        eq(gameFigures.gameId, actor.gameId),
        ne(gameFigures.characterId, characterId),
      ),
    );
  return [
    ...world.creatures.filter((creature) => withHidden || !creature.hidden),
    ...figures.map(({ x, y, z }): Occupant => ({
      at: [x, y, z],
      size: FIGURE_SIZE,
      ally: true,
    })),
  ];
}

const asOf = (actor: FigureActor, characterId: string): GameEventAs =>
  isMaster(actor) ? { kind: 'master' } : { kind: 'character', id: characterId };

// Ход по пути: запас движения тратится на цену пути, взгляд — по последнему шагу.
export async function moveFigure(
  actor: FigureActor,
  characterId: string,
  to: Vec3,
): Promise<void> {
  const { figure, name, ownerId, speed, controllerId } = await findFigure(
    actor,
    characterId,
  );
  if (!canMoveFigure(actor.userId, actor.masterId, ownerId, controllerId)) {
    throw new ForbiddenException(FIGURE_NOT_YOURS);
  }
  const scene = await activeScene(actor);
  const world = await loadSceneWorld(actor.tx, scene);
  const speeds = await figureSpeeds(actor.tx, [
    { id: characterId, ownerId, speed },
  ]);
  const left = movementLeft({
    speed: speeds.get(characterId) ?? speed,
    moved: figure.moved,
    dashes: figure.dashes,
  });
  const from: Vec3 = [figure.x, figure.y, figure.z];
  const others = await othersOf(actor, world, characterId, isMaster(actor));
  const path = findPath(world.map, from, to, FIGURE_SIZE, left, others);
  if (!path || path.path.length < 2) {
    throw new ConflictException(FIGURE_CANT_REACH);
  }
  const before = path.path[path.path.length - 2];
  await actor.tx
    .update(gameFigures)
    .set({
      x: to[0],
      y: to[1],
      z: to[2],
      moved: figure.moved + path.cost,
      facing: stepFacing(before, to),
    })
    .where(eq(gameFigures.characterId, characterId));
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'figure.moved',
    actorId: actor.userId,
    as: asOf(actor, characterId),
    sceneId: scene.id,
    intent: { characterId, to },
    result: {
      character: { id: characterId, name },
      from,
      to,
      cost: path.cost,
      left: left - path.cost,
    },
  });
}

// Мастер ставит фигурку куда угодно, где она может стоять, — без пути и без запаса.
// Так же на сцену встаёт персонаж, которому не хватило стартовой точки.
export async function placeFigure(
  actor: FigureActor,
  characterId: string,
  at: Vec3,
): Promise<void> {
  assertMaster(actor);
  const [seat] = await actor.tx
    .select({ name: characters.name })
    .from(gameMembers)
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(
      and(
        eq(gameMembers.gameId, actor.gameId),
        eq(gameMembers.characterId, characterId),
      ),
    );
  if (!seat) throw new NotFoundException(FIGURE_NOT_FOUND);
  const scene = await activeScene(actor);
  const world = await loadSceneWorld(actor.tx, scene);
  const others = await othersOf(actor, world, characterId, true);
  const fits =
    insideMap(at, { width: scene.width, depth: scene.depth }) &&
    standHeight(world.map, at, FIGURE_SIZE) !== null &&
    occupantsAt(world.map, at, FIGURE_SIZE, others).length === 0;
  if (!fits) throw new ConflictException(FIGURE_CANT_STAND);
  const [old] = await actor.tx
    .select({ x: gameFigures.x, y: gameFigures.y, z: gameFigures.z })
    .from(gameFigures)
    .where(eq(gameFigures.characterId, characterId));
  const cell = { x: at[0], y: at[1], z: at[2] };
  // Новая фигурка смотрит на юг — к камере по умолчанию.
  await actor.tx
    .insert(gameFigures)
    .values({
      characterId,
      gameId: actor.gameId,
      sceneId: scene.id,
      ...cell,
      facing: 180,
    })
    .onConflictDoUpdate({ target: gameFigures.characterId, set: cell });
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'figure.placed',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: scene.id,
    intent: { characterId, at },
    result: {
      character: { id: characterId, name: seat.name },
      from: old ? [old.x, old.y, old.z] : null,
      to: at,
    },
  });
}

// «Новый раунд»: запас движения всех фигурок снова полный.
export async function newRound(actor: FigureActor): Promise<void> {
  assertMaster(actor);
  const scene = await activeScene(actor);
  const rows = await actor.tx
    .update(gameFigures)
    .set({ moved: 0, dashes: 0 })
    .where(eq(gameFigures.gameId, actor.gameId))
    .returning({ id: gameFigures.characterId });
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'figures.round',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: scene.id,
    intent: null,
    result: { scene: { id: scene.id, name: scene.name }, count: rows.length },
  });
}

// Запас одной фигурки: обновить (её новый ход) или добавить «Рывок».
export async function changeAllowance(
  actor: FigureActor,
  characterId: string,
  change: 'refresh' | 'dash',
): Promise<void> {
  assertMaster(actor);
  const { figure, name } = await findFigure(actor, characterId);
  const character = { id: characterId, name };
  if (change === 'refresh') {
    await actor.tx
      .update(gameFigures)
      .set({ moved: 0, dashes: 0 })
      .where(eq(gameFigures.characterId, characterId));
    await appendGameEvent(actor.tx, actor.gameId, {
      kind: 'figure.refreshed',
      actorId: actor.userId,
      as: { kind: 'master' },
      sceneId: figure.sceneId,
      intent: { characterId },
      result: { character },
    });
    return;
  }
  const dashes = figure.dashes + 1;
  await actor.tx
    .update(gameFigures)
    .set({ dashes })
    .where(eq(gameFigures.characterId, characterId));
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'figure.dashed',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: figure.sceneId,
    intent: { characterId },
    result: { character, dashes },
  });
}
