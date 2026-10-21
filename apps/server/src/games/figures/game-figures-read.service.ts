import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameFigures } from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import {
  characterImageFiles,
  characterImages,
  gameFigures,
  games,
} from '../../database/schema/index.js';
import {
  FIGURE_NO_IMAGE,
  NO_ACTIVE_SCENE,
  SCENE_CLOSED,
  SCENE_MEMBERS_ONLY,
} from '../game-errors.js';
import { findGameAccess } from '../game-read.js';
import { findActiveScene } from '../scenes/index.js';
import { readSceneFigures, readUnplaced } from './figure-read.js';

// Фигурки активной сцены (docs/plan/game.md, этап 7): видят их те же, кто видит сцену, —
// мастер всегда, участники игры, пока сцена открыта.
@Injectable()
export class GameFiguresReadService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(GameFiguresReadService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(userId: string, gameId: string): Promise<GameFigures> {
    const t0 = Date.now();
    try {
      const masterId = await this.assertParticipant(userId, gameId);
      const master = masterId === userId;
      // Номер журнала, сцена и фигурки — одним снимком: по номеру страница отбрасывает
      // ответ, который старше уже применённого.
      const result = await this.databaseService.db.transaction(
        async (tx) => {
          const [game] = await tx
            .select({ sceneOpen: games.sceneOpen, eventSeq: games.eventSeq })
            .from(games)
            .where(eq(games.id, gameId));
          const scene = await findActiveScene(tx, gameId);
          if (!scene) throw new NotFoundException(NO_ACTIVE_SCENE);
          if (!master && !game.sceneOpen) {
            throw new ForbiddenException(SCENE_CLOSED);
          }
          const figures = await readSceneFigures(
            tx,
            gameId,
            scene.id,
            userId,
            masterId,
          );
          return {
            sceneId: scene.id,
            eventSeq: game.eventSeq,
            figures,
            unplaced: master ? await readUnplaced(tx, gameId, figures) : [],
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          figures: result.figures.length,
        },
        'Game figures read',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Game figures read failed');
      throw err;
    }
  }

  // Миниатюра основной картинки персонажа — тем, кто видит его фигурку. Сама галерея
  // персонажа может быть закрыта: за столом фигурку видят все.
  async image(
    userId: string,
    gameId: string,
    characterId: string,
  ): Promise<Buffer> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const masterId = await this.assertParticipant(userId, gameId);
      const [figure] = await db
        .select({ sceneOpen: games.sceneOpen })
        .from(gameFigures)
        .innerJoin(games, eq(games.id, gameFigures.gameId))
        .where(
          and(
            eq(gameFigures.gameId, gameId),
            eq(gameFigures.characterId, characterId),
          ),
        );
      if (!figure || (masterId !== userId && !figure.sceneOpen)) {
        throw new NotFoundException(FIGURE_NO_IMAGE);
      }
      const [row] = await db
        .select({ data: characterImageFiles.data })
        .from(characterImageFiles)
        .innerJoin(
          characterImages,
          eq(characterImages.id, characterImageFiles.imageId),
        )
        .where(
          and(
            eq(characterImages.characterId, characterId),
            eq(characterImages.isMain, true),
            eq(characterImageFiles.variant, 'thumb'),
          ),
        );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          characterId,
          found: !!row,
        },
        'Game figure image lookup',
      );
      if (!row) throw new NotFoundException(FIGURE_NO_IMAGE);
      return row.data;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, characterId },
        'Game figure image lookup failed',
      );
      throw err;
    }
  }

  // Мастер или участник игры; возвращает id мастера.
  private async assertParticipant(
    userId: string,
    gameId: string,
  ): Promise<string> {
    const { game, member } = await findGameAccess(
      this.databaseService.db,
      gameId,
      userId,
    );
    if (game.masterId !== userId && !member) {
      throw new ForbiddenException(SCENE_MEMBERS_ONLY);
    }
    return game.masterId;
  }
}
