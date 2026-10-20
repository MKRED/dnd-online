import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, isNotNull } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameDetail } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../database/database.service.js';
import { characters, gameMembers, games } from '../database/schema/index.js';
import { isUniqueViolation } from '../users/user-identities.service.js';
import type { TakeSeatDto } from './dto/take-seat.dto.js';
import type { UpdateSeatDto } from './dto/update-seat.dto.js';
import {
  ALREADY_SEATED,
  CHARACTER_NOT_FOUND,
  characterInGame,
  GAME_LOCKED,
  GAME_NOT_FOUND,
  MASTER_NO_SEAT,
  NO_FREE_SEATS,
  NPC_NO_SEAT,
  SEAT_NOT_FOUND,
} from './game-errors.js';
import { findGameAccess, readGameDetail } from './game-read.js';

// Места в лобби: занять своим персонажем, поменять разрешение, освободить.
@Injectable()
export class GameSeatsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GameSeatsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async take(
    userId: string,
    gameId: string,
    dto: TakeSeatDto,
  ): Promise<GameDetail> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game, canView } = await findGameAccess(db, gameId, userId);
      if (game.masterId === userId) throw new ConflictException(MASTER_NO_SEAT);
      // В закрытую игру сначала входят с паролем (POST /games/:id/enter).
      if (!canView) throw new ForbiddenException(GAME_LOCKED);
      const [character] = await db
        .select({ kind: characters.kind })
        .from(characters)
        .where(
          and(
            eq(characters.id, dto.characterId),
            eq(characters.userId, userId),
          ),
        )
        .limit(1);
      if (!character) throw new NotFoundException(CHARACTER_NOT_FOUND);
      if (character.kind !== 'pc') throw new BadRequestException(NPC_NO_SEAT);

      // Строка игры заблокирована до конца транзакции: двое на последнее место встают
      // по очереди, и второй увидит, что мест нет.
      await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        const [own] = await tx
          .select({ characterId: gameMembers.characterId })
          .from(gameMembers)
          .where(
            and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)),
          )
          .limit(1);
        if (own?.characterId) throw new ConflictException(ALREADY_SEATED);
        const [elsewhere] = await tx
          .select({ name: games.name })
          .from(gameMembers)
          .innerJoin(games, eq(games.id, gameMembers.gameId))
          .where(eq(gameMembers.characterId, dto.characterId))
          .limit(1);
        if (elsewhere) {
          throw new ConflictException(characterInGame(elsewhere.name));
        }
        const [{ taken }] = await tx
          .select({ taken: count() })
          .from(gameMembers)
          .where(
            and(
              eq(gameMembers.gameId, gameId),
              isNotNull(gameMembers.characterId),
            ),
          );
        if (taken >= game.seatCount) throw new ConflictException(NO_FREE_SEATS);
        const seat = {
          characterId: dto.characterId,
          allowHandover: dto.allowHandover ?? true,
          seatedAt: new Date(),
        };
        // В открытую игру можно сесть, не входя в лобби отдельно: участником станет сразу.
        await tx
          .insert(gameMembers)
          .values({ gameId, userId, ...seat })
          .onConflictDoUpdate({
            target: [gameMembers.gameId, gameMembers.userId],
            set: seat,
          });
      });
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          characterId: dto.characterId,
        },
        'Game seat taken',
      );
      return readGameDetail(db, gameId, userId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      // Тот же персонаж в другую игру в ту же секунду: блокировка у каждой игры своя,
      // поэтому гонку ловит уникальность персонажа в game_members.
      if (isUniqueViolation(err)) {
        throw new ConflictException('Персонаж уже в другой игре');
      }
      this.logger.error({ err, userId, gameId }, 'Taking a game seat failed');
      throw err;
    }
  }

  async update(
    userId: string,
    gameId: string,
    dto: UpdateSeatDto,
  ): Promise<GameDetail> {
    return this.changeOwnSeat(userId, gameId, 'update', {
      allowHandover: dto.allowHandover,
    });
  }

  // Освободить место и остаться в лобби: можно сесть другим персонажем.
  async free(userId: string, gameId: string): Promise<GameDetail> {
    return this.changeOwnSeat(userId, gameId, 'free', {
      characterId: null,
      seatedAt: null,
    });
  }

  private async changeOwnSeat(
    userId: string,
    gameId: string,
    kind: 'update' | 'free',
    set: Partial<typeof gameMembers.$inferInsert>,
  ): Promise<GameDetail> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const [row] = await db
        .update(gameMembers)
        .set(set)
        .where(
          and(
            eq(gameMembers.gameId, gameId),
            eq(gameMembers.userId, userId),
            isNotNull(gameMembers.characterId),
          ),
        )
        .returning({ userId: gameMembers.userId });
      if (!row) throw new NotFoundException(SEAT_NOT_FOUND);
      this.logger.info(
        { durationMs: Date.now() - t0, userId, gameId, kind },
        'Game seat changed',
      );
      return readGameDetail(db, gameId, userId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, kind },
        'Changing a game seat failed',
      );
      throw err;
    }
  }
}

async function lockGame(tx: DbTransaction, gameId: string) {
  const [row] = await tx
    .select({ id: games.id })
    .from(games)
    .where(eq(games.id, gameId))
    .for('update');
  // Игру удалили между проверкой доступа и транзакцией.
  if (!row) throw new NotFoundException(GAME_NOT_FOUND);
}
