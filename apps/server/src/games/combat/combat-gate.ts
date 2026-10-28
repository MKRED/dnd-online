import { ConflictException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import { gameCombatants, games } from '../../database/schema/index.js';
import { NOT_YOUR_TURN, ROUND_BY_ORDER } from './combat-errors.js';

// Бой с очерёдностью кончается вместе с боем (свободный режим) и со сменой сцены: на
// новой сцене мастер зовёт участников заново (docs/plan/combat.md, этап 2).
export async function clearCombat(tx: DbTransaction, gameId: string) {
  await tx.delete(gameCombatants).where(eq(gameCombatants.gameId, gameId));
  await tx.update(games).set({ combatTurn: null }).where(eq(games.id, gameId));
}

async function sceneHasOrder(tx: DbTransaction, sceneId: string) {
  const rows = await tx
    .select({ id: gameCombatants.id })
    .from(gameCombatants)
    .where(eq(gameCombatants.sceneId, sceneId))
    .limit(1);
  return rows.length > 0;
}

// В бою с очерёдностью участник ходит только в свой ход, а не позванный в бой стоит. Без
// очерёдности — как раньше. Игроку — «не ваш ход»; мастер в «Игре» держится тех же правил,
// вне хода он переставляет в «Правке» (замечание Михаила 2026-10-28).
export async function assertTurnOf(
  tx: DbTransaction,
  gameId: string,
  sceneId: string,
  who: { characterId: string } | { objectId: number },
  message = NOT_YOUR_TURN,
) {
  if (!(await sceneHasOrder(tx, sceneId))) return;
  const [game] = await tx
    .select({ turn: games.combatTurn })
    .from(games)
    .where(eq(games.id, gameId));
  const [own] = await tx
    .select({ id: gameCombatants.id })
    .from(gameCombatants)
    .where(
      and(
        eq(gameCombatants.sceneId, sceneId),
        'characterId' in who
          ? eq(gameCombatants.characterId, who.characterId)
          : eq(gameCombatants.objectId, who.objectId),
      ),
    );
  if (!own || own.id !== game.turn) {
    throw new ConflictException(message);
  }
}

// «Новый раунд» мастера — только в бою без очерёдности: с ней раунд меняется сам.
export async function assertNoOrder(tx: DbTransaction, sceneId: string) {
  if (await sceneHasOrder(tx, sceneId)) {
    throw new ConflictException(ROUND_BY_ORDER);
  }
}
