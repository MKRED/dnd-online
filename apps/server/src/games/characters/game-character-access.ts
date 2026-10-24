import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { GameEventAs } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { characters, gameMembers } from '../../database/schema/index.js';
import {
  GAME_CHARACTER_NOT_FOUND,
  GAME_CHARACTER_NOT_YOURS,
} from '../game-errors.js';
import { canMoveFigure } from '../figures/figure-read.js';

export interface SeatedCharacter {
  id: string;
  name: string;
  ownerId: string;
  controllerId: string | null;
}

// Персонаж на месте в этой игре. Кто его ведёт — тот же круг, что водит фигурку: мастер,
// владелец и управляющий (docs/plan/done/game.md, «Состояние существ»). party — смотрящий
// сам сидит в игре с персонажем: член отряда читает лист любого героя, но не правит его
// (решено с пользователем 2026-10-24, docs/plan/scene-page.md, этап 5).
export async function findSeatedCharacter(
  db: Db,
  gameId: string,
  characterId: string,
  viewerId: string,
  masterId: string,
  party = false,
): Promise<SeatedCharacter> {
  const [row] = await db
    .select({
      id: characters.id,
      name: characters.name,
      ownerId: characters.userId,
      controllerId: gameMembers.controllerId,
    })
    .from(gameMembers)
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(
      and(
        eq(gameMembers.gameId, gameId),
        eq(gameMembers.characterId, characterId),
      ),
    )
    .limit(1);
  if (!row) throw new NotFoundException(GAME_CHARACTER_NOT_FOUND);
  if (
    !party &&
    !canMoveFigure(viewerId, masterId, row.ownerId, row.controllerId)
  ) {
    throw new ForbiddenException(GAME_CHARACTER_NOT_YOURS);
  }
  return row;
}

// От чьего имени запись журнала: мастер — от себя, игрок — от персонажа.
export function actingAs(
  viewerId: string,
  masterId: string,
  characterId: string,
): GameEventAs {
  return viewerId === masterId
    ? { kind: 'master' }
    : { kind: 'character', id: characterId };
}
