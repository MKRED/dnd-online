import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameDetail } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { gameMembers, users } from '../database/schema/index.js';
import {
  MASTER_NO_LEAVE,
  MASTER_ONLY_REMOVE,
  MEMBER_NOT_FOUND,
  WRONG_PASSWORD,
} from './game-errors.js';
import { appendGameEvent, lockGame } from './game-journal.js';
import { findGameAccess, findMemberSeat, readGameDetail } from './game-read.js';

// Вход в лобби и выход из игры. Пароль закрытой игры спрашивается один раз — при входе;
// дальше участник открывает лобби и занимает место без него.
@Injectable()
export class GameMembersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GameMembersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async enter(
    userId: string,
    gameId: string,
    password: string | undefined,
  ): Promise<GameDetail> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game, member } = await findGameAccess(db, gameId, userId);
      // Мастер и уже вошедший — сразу в лобби, пароль не сверяем.
      if (game.masterId !== userId && !member) {
        if (
          game.passwordHash !== null &&
          !(await bcrypt.compare(password ?? '', game.passwordHash))
        ) {
          throw new ForbiddenException(WRONG_PASSWORD);
        }
        // Двойной клик или две вкладки: второй вход ничего не вставит и не попадёт в журнал.
        // Неверный пароль журнал не пишет — он ничего не меняет.
        const entered = await db.transaction(async (tx) => {
          await lockGame(tx, gameId);
          const inserted = await tx
            .insert(gameMembers)
            .values({ gameId, userId })
            .onConflictDoNothing()
            .returning({ userId: gameMembers.userId });
          if (inserted.length === 0) return false;
          await appendGameEvent(tx, gameId, {
            kind: 'member.entered',
            actorId: userId,
            intent: null,
            result: null,
          });
          return true;
        });
        this.logger.info(
          { durationMs: Date.now() - t0, userId, gameId, entered },
          'Game lobby entered',
        );
      }
      return readGameDetail(db, gameId, userId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Entering a game failed');
      throw err;
    }
  }

  // Выйти из игры может сам участник, убрать другого — только мастер. С участником уходят
  // и место, и вход: в закрытую игру снова пустит только пароль.
  async remove(
    actorId: string,
    gameId: string,
    memberId: string,
  ): Promise<void> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game } = await findGameAccess(db, gameId, actorId);
      if (memberId === game.masterId) {
        throw new ConflictException(MASTER_NO_LEAVE);
      }
      if (actorId !== memberId && actorId !== game.masterId) {
        throw new ForbiddenException(MASTER_ONLY_REMOVE);
      }
      const character = await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        const seat = await findMemberSeat(tx, gameId, memberId);
        if (!seat) throw new NotFoundException(MEMBER_NOT_FOUND);
        await tx
          .delete(gameMembers)
          .where(
            and(
              eq(gameMembers.gameId, gameId),
              eq(gameMembers.userId, memberId),
            ),
          );
        if (actorId === memberId) {
          await appendGameEvent(tx, gameId, {
            kind: 'member.left',
            actorId,
            intent: null,
            result: { character: seat.character },
          });
        } else {
          const [member] = await tx
            .select({ id: users.id, nickname: users.nickname })
            .from(users)
            .where(eq(users.id, memberId));
          await appendGameEvent(tx, gameId, {
            kind: 'member.removed',
            actorId,
            as: { kind: 'master' },
            intent: { userId: memberId },
            result: { member, character: seat.character },
          });
        }
        return seat.character;
      });
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          actorId,
          gameId,
          memberId,
          characterId: character?.id ?? null,
        },
        'Game member removed',
      );
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, actorId, gameId, memberId },
        'Removing a game member failed',
      );
      throw err;
    }
  }
}
