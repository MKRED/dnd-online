import { ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DbTransaction } from '../database/database.service.js';
import { games } from '../database/schema/index.js';
import { PLAYER_OUTSIDE_SESSION } from './game-errors.js';

// Вне встречи игрок на сцене только смотрит (решено с пользователем 2026-10-25): ходить,
// тянуть фигурку, менять хиты, ячейки и эффекты персонажа можно, пока встреча идёт.
// Мастеру можно всегда — он готовит сцену между встречами.
export async function assertPlayerInSession(
  tx: DbTransaction,
  gameId: string,
  userId: string,
  masterId: string,
): Promise<void> {
  if (userId === masterId) return;
  const [game] = await tx
    .select({ startedAt: games.sessionStartedAt })
    .from(games)
    .where(eq(games.id, gameId));
  if (!game?.startedAt) throw new ForbiddenException(PLAYER_OUTSIDE_SESSION);
}
