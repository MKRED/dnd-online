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
import { gameMembers } from '../database/schema/index.js';
import {
  MASTER_NO_LEAVE,
  MASTER_ONLY_REMOVE,
  MEMBER_NOT_FOUND,
  WRONG_PASSWORD,
} from './game-errors.js';
import { findGameAccess, readGameDetail } from './game-read.js';

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
        await db
          .insert(gameMembers)
          .values({ gameId, userId })
          .onConflictDoNothing();
        this.logger.info(
          { durationMs: Date.now() - t0, userId, gameId },
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
      const [row] = await db
        .delete(gameMembers)
        .where(
          and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, memberId)),
        )
        .returning({ characterId: gameMembers.characterId });
      if (!row) throw new NotFoundException(MEMBER_NOT_FOUND);
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          actorId,
          gameId,
          memberId,
          characterId: row.characterId,
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
