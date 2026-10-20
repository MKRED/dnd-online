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
import type { GameDetail, GameEventCharacter } from 'shared';
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
  MASTER_NO_SEAT,
  NO_FREE_SEATS,
  NPC_NO_SEAT,
  SEAT_NOT_FOUND,
} from './game-errors.js';
import { appendGameEvent, lockGame } from './game-journal.js';
import { findGameAccess, findMemberSeat, readGameDetail } from './game-read.js';

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
        .select({ kind: characters.kind, name: characters.name })
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
        await appendGameEvent(tx, gameId, {
          kind: 'seat.taken',
          actorId: userId,
          intent: {
            characterId: dto.characterId,
            allowHandover: seat.allowHandover,
          },
          result: { character: { id: dto.characterId, name: character.name } },
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
    return this.changeOwnSeat(
      userId,
      gameId,
      'update',
      async (tx, character) => {
        await setOwnSeat(tx, gameId, userId, {
          allowHandover: dto.allowHandover,
        });
        await appendGameEvent(tx, gameId, {
          kind: 'seat.updated',
          actorId: userId,
          intent: { allowHandover: dto.allowHandover },
          result: { character },
        });
      },
    );
  }

  // Освободить место и остаться в лобби: можно сесть другим персонажем.
  async free(userId: string, gameId: string): Promise<GameDetail> {
    return this.changeOwnSeat(userId, gameId, 'free', async (tx, character) => {
      await setOwnSeat(tx, gameId, userId, {
        characterId: null,
        seatedAt: null,
      });
      await appendGameEvent(tx, gameId, {
        kind: 'seat.freed',
        actorId: userId,
        intent: null,
        result: { character, reason: 'freed' },
      });
    });
  }

  // Правка своего места под блокировкой игры: место ищется уже под ней, чтобы журнал
  // назвал персонажа, который сидел на месте в момент правки.
  private async changeOwnSeat(
    userId: string,
    gameId: string,
    kind: 'update' | 'free',
    change: (tx: DbTransaction, character: GameEventCharacter) => Promise<void>,
  ): Promise<GameDetail> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        const seat = await findMemberSeat(tx, gameId, userId);
        if (!seat?.character) throw new NotFoundException(SEAT_NOT_FOUND);
        await change(tx, seat.character);
      });
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

function setOwnSeat(
  tx: DbTransaction,
  gameId: string,
  userId: string,
  set: Partial<typeof gameMembers.$inferInsert>,
) {
  return tx
    .update(gameMembers)
    .set(set)
    .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)));
}
