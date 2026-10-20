import { ConflictException } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { CharacterSheetLock } from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../database/database.service.js';
import { gameMembers, games } from '../database/schema/index.js';

type Db = DatabaseService['db'] | DbTransaction;

// Лист закрыт для правки владельцем, пока персонаж на месте в игре с идущей встречей
// (docs/plan/game.md, «Персонаж в игре пишет в свой лист»). Флага у персонажа нет —
// закрытость выводится из места и встречи, поэтому конец встречи, освобождённое место,
// убранный игрок и удалённая игра открывают лист сами.
//
// Строку игры здесь не блокируем: правка листа сначала блокирует персонажа, а правки
// игры берут игру первой — блокировка игры здесь перевернула бы порядок и дала бы
// взаимную блокировку. Цена — правка, начатая за миг до начала встречи, ещё пройдёт.
export async function findSheetLock(
  db: Db,
  characterId: string,
): Promise<CharacterSheetLock | null> {
  const [row] = await db
    .select({ gameId: games.id, gameName: games.name })
    .from(gameMembers)
    .innerJoin(games, eq(games.id, gameMembers.gameId))
    .where(
      and(
        eq(gameMembers.characterId, characterId),
        isNotNull(games.sessionStartedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Вызывать после проверки владельца: чужому — 404, а не рассказ о чужой игре.
export async function assertSheetUnlocked(
  db: Db,
  characterId: string,
): Promise<void> {
  const lock = await findSheetLock(db, characterId);
  if (lock) {
    throw new ConflictException(
      `Персонаж в игре «${lock.gameName}»: идёт встреча, лист закрыт до её конца`,
    );
  }
}
