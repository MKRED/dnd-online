import { NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type {
  GameEventAs,
  GameEventKind,
  GameEventPayloads,
  PackedChangeset,
  SceneEditResult,
  ScenePlayerFog,
} from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { gameEvents, games } from '../database/schema/index.js';
import { emptyDelta, playerFogDelta } from './fog/fog-delta.js';
import { FOG_EVENT_KINDS } from './fog/fog-events.js';
import { recountFog, type FogRecount } from './fog/fog-recount.js';
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

// Разница тумана для игроков (fog/fog-delta.ts). Правка сцены получает её всегда, когда
// туман включён, даже пустую: игроку нужен номер каждой правки. Остальным записям она
// нужна, только если что-то изменилось. Правка другой, не активной сцены игрокам не
// уходит вовсе.
function fogForPlayers(
  event: NewGameEvent<GameEventKind>,
  recount: FogRecount | null,
): ScenePlayerFog | null {
  if (!recount) return null;
  if (event.changes) {
    if (event.sceneId !== recount.scene.id) return null;
    const { sceneSeq } = event.result as SceneEditResult;
    return playerFogDelta(recount, sceneSeq, event.changes);
  }
  const delta = playerFogDelta(recount, recount.scene.seq, undefined);
  return emptyDelta(delta) ? null : delta;
}

// Добавляет запись со следующим номером игры и возвращает этот номер. Событие, которое
// меняет то, что видят персонажи, пересчитывает туман войны активной сцены
// (fog/fog-events.ts): запись пишут после самого изменения, в той же транзакции.
export async function appendGameEvent<K extends GameEventKind>(
  tx: DbTransaction,
  gameId: string,
  event: NewGameEvent<K>,
): Promise<number> {
  const playerFog = FOG_EVENT_KINDS.has(event.kind)
    ? fogForPlayers(event, await recountFog(tx, gameId))
    : null;
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
    playerFog,
  });
  return row.seq;
}
