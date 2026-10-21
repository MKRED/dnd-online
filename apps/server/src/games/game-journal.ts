import { NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type {
  GameEventAs,
  GameEventKind,
  GameEventPayloads,
  PackedChangeset,
} from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { gameEvents, games } from '../database/schema/index.js';
import { GAME_NOT_FOUND } from './game-errors.js';

// Запись журнала игры (docs/plan/done/game.md, «Журнал игры»). Простые функции от транзакции,
// а не провайдер: запись идёт в той же транзакции, что и изменение, и её пишет не только
// модуль игр — удаление персонажа освобождает место (characters.service.ts).

// Блокирует строку игры до конца транзакции. Каждая правка игры берёт эту блокировку
// первой: порядок «игра → участники → персонаж» один у всех, и правки не встают в
// взаимную блокировку, а последнее место не займут двое.
export async function lockGame(tx: DbTransaction, gameId: string) {
  const [row] = await tx
    .select({ id: games.id })
    .from(games)
    .where(eq(games.id, gameId))
    .for('update');
  // Игру удалили между проверкой доступа и транзакцией.
  if (!row) throw new NotFoundException(GAME_NOT_FOUND);
}

export type NewGameEvent<K extends GameEventKind> = {
  kind: K;
  actorId: string;
  as?: GameEventAs;
  // Сцена, к которой относится событие; у событий лобби её нет.
  sceneId?: string;
  // Правка сцены: что изменилось (в запись для мастера не входит, game-event-read.ts).
  changes?: PackedChangeset;
} & GameEventPayloads[K];

// Добавляет запись со следующим номером игры и возвращает этот номер.
export async function appendGameEvent<K extends GameEventKind>(
  tx: DbTransaction,
  gameId: string,
  event: NewGameEvent<K>,
): Promise<number> {
  const [row] = await tx
    .update(games)
    .set({ eventSeq: sql`${games.eventSeq} + 1` })
    .where(eq(games.id, gameId))
    .returning({ seq: games.eventSeq });
  if (!row) throw new NotFoundException(GAME_NOT_FOUND);
  await tx.insert(gameEvents).values({
    gameId,
    seq: row.seq,
    kind: event.kind,
    actorId: event.actorId,
    asKind: event.as?.kind ?? null,
    asId: event.as && 'id' in event.as ? event.as.id : null,
    sceneId: event.sceneId ?? null,
    intent: event.intent,
    result: event.result,
    changes: event.changes ?? null,
  });
  return row.seq;
}
