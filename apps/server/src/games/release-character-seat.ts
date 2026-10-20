import { and, eq } from 'drizzle-orm';
import type { DbTransaction } from '../database/database.service.js';
import { characters, gameMembers } from '../database/schema/index.js';
import { appendGameEvent, lockGame } from './game-journal.js';

// Удаляемый персонаж освобождает место в игре (characters.service.ts, remove). Внешний
// ключ сделал бы это и сам (ON DELETE SET NULL), но мимо журнала; здесь место
// освобождается явно и с записью. Вызывать в транзакции удаления до самого удаления:
// блокировка игры берётся первой, как у всех правок игры (game-journal.ts).
export async function releaseCharacterSeat(
  tx: DbTransaction,
  characterId: string,
  actorId: string,
): Promise<void> {
  const [found] = await tx
    .select({ gameId: gameMembers.gameId })
    .from(gameMembers)
    .where(eq(gameMembers.characterId, characterId))
    .limit(1);
  if (!found) return;
  await lockGame(tx, found.gameId);
  // Под блокировкой ещё раз: место могли освободить, пока ждали её.
  const [seat] = await tx
    .select({ userId: gameMembers.userId, name: characters.name })
    .from(gameMembers)
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(
      and(
        eq(gameMembers.gameId, found.gameId),
        eq(gameMembers.characterId, characterId),
      ),
    )
    .limit(1);
  if (!seat) return;
  await tx
    .update(gameMembers)
    .set({ characterId: null, seatedAt: null })
    .where(
      and(
        eq(gameMembers.gameId, found.gameId),
        eq(gameMembers.userId, seat.userId),
      ),
    );
  await appendGameEvent(tx, found.gameId, {
    kind: 'seat.freed',
    actorId,
    intent: null,
    result: {
      character: { id: characterId, name: seat.name },
      reason: 'character_deleted',
    },
  });
}
