import { ConflictException, ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { GameMoveMode } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { gameFigures, games } from '../../database/schema/index.js';
import { refreshSceneCreatures } from '../creatures/creature-moves.js';
import { MASTER_ONLY_MOVE_MODE, NO_ACTIVE_SCENE } from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { readMoveMode } from './move-mode-read.js';

// Смена режима мастером. Запас всех фигурок, монстров и НПС активной сцены снова полный в
// обе стороны: в тактический — будто бой только начался (раунд 1), в свободный — запас и
// так больше не тратится. Тот же режим — ничего не меняется, записи нет.
export async function setMoveMode(
  actor: {
    tx: DbTransaction;
    gameId: string;
    userId: string;
    masterId: string;
  },
  mode: GameMoveMode,
): Promise<void> {
  const { tx, gameId } = actor;
  if (actor.userId !== actor.masterId) {
    throw new ForbiddenException(MASTER_ONLY_MOVE_MODE);
  }
  const scene = await findActiveScene(tx, gameId);
  if (!scene) throw new ConflictException(NO_ACTIVE_SCENE);
  if ((await readMoveMode(tx, gameId)).mode === mode) return;
  const round = mode === 'tactical' ? 1 : null;
  await tx
    .update(games)
    .set({ moveMode: mode, combatRound: round })
    .where(eq(games.id, gameId));
  const figures = await tx
    .update(gameFigures)
    .set({ moved: 0, dashes: 0 })
    .where(eq(gameFigures.gameId, gameId))
    .returning({ id: gameFigures.characterId });
  const creatures = await refreshSceneCreatures(actor, scene.id);
  await appendGameEvent(tx, gameId, {
    kind: 'game.mode',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: scene.id,
    intent: { mode },
    result: {
      mode,
      scene: { id: scene.id, name: scene.name },
      count: figures.length,
      creatures,
      round,
    },
  });
}
