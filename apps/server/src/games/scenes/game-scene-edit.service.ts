import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  MapOpError,
  parseMapOpBatch,
  type MapEditResult,
  type MapOp,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import { MapLimitsConfig } from '../../maps/map-limits.js';
import { MASTER_ONLY_SCENES, SCENE_NOT_FOUND } from '../game-errors.js';
import { lockGame } from '../game-journal.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import {
  editScene,
  redoScene,
  undoScene,
  type SceneEditContext,
  type SceneEditOutcome,
} from './scene-map-edits.js';
import { findScene } from './scene-read.js';

type EditKind = 'op' | 'undo' | 'redo';

// Правки сцены мастером в игре (docs/plan/done/game.md, этап 6): те же операции, что в
// редакторе карты, отмена и возврат. Каждая — одна транзакция под блокировкой игры;
// после неё — рассылка по сокету (мастеру целиком, игрокам — то, что им видно).
@Injectable()
export class GameSceneEditService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly limits: MapLimitsConfig,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameSceneEditService.name)
    private readonly logger: PinoLogger,
  ) {}

  applyOps(
    userId: string,
    gameId: string,
    sceneId: string,
    rawOps: unknown[],
  ): Promise<MapEditResult> {
    const ops = this.parse(rawOps);
    return this.edit(userId, gameId, sceneId, 'op', (ctx) =>
      editScene(ctx, ops),
    );
  }

  undo(userId: string, gameId: string, sceneId: string) {
    return this.edit(userId, gameId, sceneId, 'undo', undoScene);
  }

  redo(userId: string, gameId: string, sceneId: string) {
    return this.edit(userId, gameId, sceneId, 'redo', redoScene);
  }

  private parse(rawOps: unknown[]): MapOp[] {
    try {
      return parseMapOpBatch(rawOps, this.limits);
    } catch (err) {
      if (err instanceof MapOpError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  private async edit(
    userId: string,
    gameId: string,
    sceneId: string,
    kind: EditKind,
    run: (ctx: SceneEditContext) => Promise<SceneEditOutcome>,
  ): Promise<MapEditResult> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game } = await findGameAccess(db, gameId, userId);
      if (game.masterId !== userId) {
        throw new ForbiddenException(MASTER_ONLY_SCENES);
      }
      const { result, changed } = await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        // Перезапущенная сцена из списка ушла: правка устаревшей страницы — 404.
        const scene = await findScene(tx, gameId, sceneId);
        if (!scene) throw new NotFoundException(SCENE_NOT_FOUND);
        return run({
          tx,
          gameId,
          masterId: userId,
          scene,
          limits: this.limits,
        });
      });
      if (changed) this.realtime.publish(gameId);
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          sceneId,
          kind,
          seq: result.seq,
          changedCells: result.changedCells,
          conflicts: result.conflicts,
          changed,
        },
        'Game scene edited',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof MapOpError) throw new BadRequestException(err.message);
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, sceneId, kind },
        'Game scene edit failed',
      );
      throw err;
    }
  }
}
