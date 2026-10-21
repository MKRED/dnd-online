import { ConflictException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { GameSceneFogInput } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { gameScenes, games, maps } from '../../database/schema/index.js';
import { findOwnedMap } from '../../maps/map-access.js';
import {
  NO_ACTIVE_SCENE,
  SCENE_MAP_GONE,
  SCENE_NOT_FOUND,
} from '../game-errors.js';
import { placeFiguresOnScene } from '../figures/figure-placement.js';
import { appendGameEvent } from '../game-journal.js';
import { createScene } from './scene-copy.js';
import { findActiveScene, findScene } from './scene-read.js';

// Правки сцен мастером (docs/plan/done/game.md, этап 5). Каждая — внутри транзакции, которая
// уже взяла lockGame, и пишет событие журнала. false — ничего не изменилось (повторный
// клик), события нет.

const asMaster = { kind: 'master' } as const;

// Сцена из своей карты. Первая сцена игры сразу становится активной: сцена у игры
// закрыта, пока мастер её не откроет, так что игроки её ещё не видят.
export async function addScene(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  mapId: string,
): Promise<boolean> {
  const map = await findOwnedMap(tx, masterId, mapId, { forUpdate: true });
  const active = !(await findActiveScene(tx, gameId));
  const { scene, libraryCopied } = await createScene(
    tx,
    gameId,
    masterId,
    map,
    active,
  );
  await appendGameEvent(tx, gameId, {
    kind: 'scene.created',
    actorId: masterId,
    as: asMaster,
    sceneId: scene.id,
    intent: { mapId },
    result: {
      scene: { id: scene.id, name: scene.name },
      libraryCopied,
      active,
    },
  });
  if (active) await placeFiguresOnScene(tx, scene, masterId);
  return true;
}

// Смена активной сцены «сцену открыта игрокам» не трогает (решено с пользователем
// 2026-10-20): чтобы подготовить новую тайно, мастер сначала закрывает текущую.
export async function activateScene(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  sceneId: string,
): Promise<boolean> {
  const scene = await findScene(tx, gameId, sceneId);
  if (!scene) throw new NotFoundException(SCENE_NOT_FOUND);
  if (scene.active) return false;
  // Сначала снять старую: активная у игры одна (game_scenes_active_idx).
  await tx
    .update(gameScenes)
    .set({ active: false })
    .where(and(eq(gameScenes.gameId, gameId), eq(gameScenes.active, true)));
  await tx
    .update(gameScenes)
    .set({ active: true })
    .where(eq(gameScenes.id, sceneId));
  await appendGameEvent(tx, gameId, {
    kind: 'scene.activated',
    actorId: masterId,
    as: asMaster,
    sceneId,
    intent: { sceneId },
    result: { scene: { id: scene.id, name: scene.name } },
  });
  await placeFiguresOnScene(tx, scene, masterId);
  return true;
}

// Перезапуск — новая копия той же карты на месте старой (активная остаётся активной).
// Старая уходит из списка, но остаётся в базе: на неё ссылается журнал.
export async function restartScene(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  sceneId: string,
): Promise<boolean> {
  const old = await findScene(tx, gameId, sceneId);
  if (!old) throw new NotFoundException(SCENE_NOT_FOUND);
  const [owned] = old.mapId
    ? await tx
        .select({ id: maps.id })
        .from(maps)
        .where(and(eq(maps.id, old.mapId), eq(maps.ownerId, masterId)))
    : [];
  if (!owned) throw new ConflictException(SCENE_MAP_GONE);
  const map = await findOwnedMap(tx, masterId, owned.id, { forUpdate: true });
  await tx
    .update(gameScenes)
    .set({ active: false, archivedAt: new Date() })
    .where(eq(gameScenes.id, old.id));
  const { scene, libraryCopied } = await createScene(
    tx,
    gameId,
    masterId,
    map,
    old.active,
    { fog: old.fog, sightRange: old.sightRange },
  );
  await appendGameEvent(tx, gameId, {
    kind: 'scene.restarted',
    actorId: masterId,
    as: asMaster,
    sceneId: scene.id,
    intent: { sceneId },
    result: {
      from: { id: old.id, name: old.name },
      scene: { id: scene.id, name: scene.name },
      libraryCopied,
    },
  });
  // Перезапуск активной сцены — фигурки снова на стартовых точках новой копии.
  if (old.active) await placeFiguresOnScene(tx, scene, masterId);
  return true;
}

// Туман войны сцены и дальность обзора (docs/plan/fog-of-war.md). Пересчёт тумана
// делает запись журнала (fog/fog-events.ts), если сцена активна.
export async function setSceneFog(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  sceneId: string,
  input: GameSceneFogInput,
): Promise<boolean> {
  const scene = await findScene(tx, gameId, sceneId);
  if (!scene) throw new NotFoundException(SCENE_NOT_FOUND);
  if (scene.fog === input.enabled && scene.sightRange === input.sightRange) {
    return false;
  }
  await tx
    .update(gameScenes)
    .set({ fog: input.enabled, sightRange: input.sightRange })
    .where(eq(gameScenes.id, sceneId));
  await appendGameEvent(tx, gameId, {
    kind: 'scene.fog',
    actorId: masterId,
    as: asMaster,
    sceneId,
    intent: input,
    result: { scene: { id: scene.id, name: scene.name } },
  });
  return true;
}

// «Сцена открыта игрокам». Открыть можно только при активной сцене; закрыть — всегда.
export async function setSceneOpen(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  open: boolean,
): Promise<boolean> {
  const [{ sceneOpen }] = await tx
    .select({ sceneOpen: games.sceneOpen })
    .from(games)
    .where(eq(games.id, gameId));
  if (sceneOpen === open) return false;
  const active = await findActiveScene(tx, gameId);
  if (open && !active) throw new ConflictException(NO_ACTIVE_SCENE);
  await tx.update(games).set({ sceneOpen: open }).where(eq(games.id, gameId));
  const scene = active ? { id: active.id, name: active.name } : null;
  if (open && scene) {
    await appendGameEvent(tx, gameId, {
      kind: 'scene.opened',
      actorId: masterId,
      as: asMaster,
      sceneId: scene.id,
      intent: null,
      result: { scene },
    });
  } else {
    await appendGameEvent(tx, gameId, {
      kind: 'scene.closed',
      actorId: masterId,
      as: asMaster,
      sceneId: scene?.id,
      intent: null,
      result: { scene },
    });
  }
  return true;
}
