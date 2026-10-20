import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import type { GameEvent } from 'shared';
import type { DatabaseService } from '../database/database.service.js';
import { gameEvents, users } from '../database/schema/index.js';

type Db = DatabaseService['db'];
type EventRow = typeof gameEvents.$inferSelect;

// Записи журнала игры — для страницы мастера (новые сверху, до before) и для сокета
// (по порядку, после after). limit — сколько вернуть, без запаса.
export async function readGameEvents(
  db: Db,
  gameId: string,
  range: { before?: number; after?: number },
  limit: number,
): Promise<GameEvent[]> {
  const forward = range.after !== undefined;
  const rows = await db
    .select({ event: gameEvents, nickname: users.nickname })
    .from(gameEvents)
    .leftJoin(users, eq(users.id, gameEvents.actorId))
    .where(
      and(
        eq(gameEvents.gameId, gameId),
        range.before === undefined
          ? undefined
          : lt(gameEvents.seq, range.before),
        range.after === undefined ? undefined : gt(gameEvents.seq, range.after),
      ),
    )
    .orderBy(forward ? asc(gameEvents.seq) : desc(gameEvents.seq))
    .limit(limit);
  return rows.map(({ event, nickname }) => toGameEvent(event, nickname));
}

function toGameEvent(row: EventRow, nickname: string | null): GameEvent {
  // intent и result — jsonb, их форму по kind задаёт запись (appendGameEvent).
  return {
    seq: row.seq,
    kind: row.kind,
    actor: row.actorId && nickname ? { id: row.actorId, nickname } : null,
    as: row.asKind
      ? row.asKind === 'master'
        ? { kind: 'master' }
        : { kind: row.asKind, id: row.asId ?? '' }
      : null,
    sceneId: row.sceneId,
    intent: row.intent,
    result: row.result,
    createdAt: row.createdAt.toISOString(),
  } as GameEvent;
}
