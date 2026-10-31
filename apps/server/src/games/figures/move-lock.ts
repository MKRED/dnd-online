import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { characters, gameMembers } from '../../database/schema/index.js';
import { MASTER_ONLY_MOVE_LOCK, MOVE_LOCK_NO_SEAT } from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import type { FigureActor } from './figure-moves.js';

// Мастер запрещает или разрешает игрокам ходить (вкладка «Сцена», решено с пользователем
// 2026-10-31): одному герою на месте (characterId) или всем сразу (null). Запрет лежит у
// места (game_members.move_locked), поэтому держится при смене сцены и между встречами.
// Ничего не сменилось — записи нет.
export async function setMoveLock(
  actor: FigureActor,
  characterId: string | null,
  locked: boolean,
): Promise<void> {
  const { tx, gameId } = actor;
  if (actor.userId !== actor.masterId) {
    throw new ForbiddenException(MASTER_ONLY_MOVE_LOCK);
  }
  const seats = await tx
    .select({
      userId: gameMembers.userId,
      id: characters.id,
      name: characters.name,
      moveLocked: gameMembers.moveLocked,
    })
    .from(gameMembers)
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(
      and(
        eq(gameMembers.gameId, gameId),
        characterId === null
          ? isNotNull(gameMembers.characterId)
          : eq(gameMembers.characterId, characterId),
      ),
    );
  if (characterId !== null && seats.length === 0) {
    throw new NotFoundException(MOVE_LOCK_NO_SEAT);
  }
  const changed = seats.filter((seat) => seat.moveLocked !== locked);
  if (changed.length === 0) return;
  await tx
    .update(gameMembers)
    .set({ moveLocked: locked })
    .where(
      and(
        eq(gameMembers.gameId, gameId),
        inArray(
          gameMembers.userId,
          changed.map((seat) => seat.userId),
        ),
        ne(gameMembers.moveLocked, locked),
      ),
    );
  await appendGameEvent(tx, gameId, {
    kind: 'figures.locked',
    actorId: actor.userId,
    as: { kind: 'master' },
    intent: { characterId, locked },
    result: {
      characters: changed.map(({ id, name }) => ({ id, name })),
      locked,
    },
  });
}
