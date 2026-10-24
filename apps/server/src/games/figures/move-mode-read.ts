import { ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { GameMoveMode } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import { ROUND_ONLY_IN_COMBAT } from '../game-errors.js';

// Режим хода игры (docs/dnd/movement.md, «Свободный и тактический режимы»): в свободном
// запас снова полный после каждого хода, в тактическом — тратится до «Нового раунда».
// Отдельно от смены режима: его читают и ходы существ, а смена сама зовёт их модуль.

export interface MoveModeState {
  mode: GameMoveMode;
  round: number | null;
}

export async function readMoveMode(
  tx: DbTransaction,
  gameId: string,
): Promise<MoveModeState> {
  const [game] = await tx
    .select({ mode: games.moveMode, round: games.combatRound })
    .from(games)
    .where(eq(games.id, gameId));
  return {
    mode: game.mode,
    round: game.mode === 'tactical' ? game.round : null,
  };
}

export const isFree = async (tx: DbTransaction, gameId: string) =>
  (await readMoveMode(tx, gameId)).mode === 'free';

// Следующий раунд боя для «Нового раунда»: вне боя его нет.
export async function nextCombatRound(
  tx: DbTransaction,
  gameId: string,
): Promise<number> {
  const { mode, round } = await readMoveMode(tx, gameId);
  if (mode !== 'tactical') throw new ConflictException(ROUND_ONLY_IN_COMBAT);
  const next = (round ?? 0) + 1;
  await tx.update(games).set({ combatRound: next }).where(eq(games.id, gameId));
  return next;
}

// Новая активная сцена в бою — бой на ней начинается с первого раунда: фигурки встают на
// стартовые точки с полным запасом, существа — новые экземпляры.
export async function restartCombatRound(tx: DbTransaction, gameId: string) {
  if (await isFree(tx, gameId)) return;
  await tx.update(games).set({ combatRound: 1 }).where(eq(games.id, gameId));
}
