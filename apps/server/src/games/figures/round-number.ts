import { and, count, eq, gt, max } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import { gameEvents } from '../../database/schema/index.js';

// Номер нового раунда для журнала (docs/plan/done/scene-page.md, этап 7): сколько раз мастер
// уже начинал раунд на этой сцене с начала встречи, плюс один. Перезапуск сцены создаёт
// новую сцену — счёт с ней начинается заново; новая встреча — тоже.
export async function nextRoundNumber(
  tx: DbTransaction,
  gameId: string,
  sceneId: string,
): Promise<number> {
  const [session] = await tx
    .select({ seq: max(gameEvents.seq) })
    .from(gameEvents)
    .where(
      and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.kind, 'session.started'),
      ),
    );
  const [rounds] = await tx
    .select({ total: count() })
    .from(gameEvents)
    .where(
      and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.sceneId, sceneId),
        eq(gameEvents.kind, 'figures.round'),
        gt(gameEvents.seq, session?.seq ?? 0),
      ),
    );
  return (rounds?.total ?? 0) + 1;
}
