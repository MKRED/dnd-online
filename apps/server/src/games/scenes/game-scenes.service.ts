import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { GameSceneFogInput, GameScenes } from 'shared';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import { MASTER_ONLY_SCENES } from '../game-errors.js';
import { lockGame } from '../game-journal.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import {
  activateScene,
  addScene,
  restartScene,
  setSceneFog,
  setSceneOpen,
} from './scene-edits.js';
import { listScenes } from './scene-read.js';

type SceneEdit = (tx: DbTransaction, masterId: string) => Promise<boolean>;

// Сцены игры в лобби мастера (docs/plan/done/game.md, этап 5): список, добавление из своей
// карты, активная сцена, перезапуск и «сцена открыта игрокам». Каждая правка отвечает
// блоком сцен целиком.
@Injectable()
export class GameScenesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameScenesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(userId: string, gameId: string): Promise<GameScenes> {
    const t0 = Date.now();
    try {
      const scenes = await this.read(userId, gameId);
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          count: scenes.scenes.length,
        },
        'Game scenes listed',
      );
      return scenes;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Game scenes listing failed');
      throw err;
    }
  }

  add(userId: string, gameId: string, mapId: string): Promise<GameScenes> {
    return this.change(userId, gameId, 'add', { mapId }, (tx, masterId) =>
      addScene(tx, gameId, masterId, mapId),
    );
  }

  activate(
    userId: string,
    gameId: string,
    sceneId: string,
  ): Promise<GameScenes> {
    return this.change(
      userId,
      gameId,
      'activate',
      { sceneId },
      (tx, masterId) => activateScene(tx, gameId, masterId, sceneId),
    );
  }

  restart(
    userId: string,
    gameId: string,
    sceneId: string,
  ): Promise<GameScenes> {
    return this.change(userId, gameId, 'restart', { sceneId }, (tx, masterId) =>
      restartScene(tx, gameId, masterId, sceneId),
    );
  }

  setFog(
    userId: string,
    gameId: string,
    sceneId: string,
    input: GameSceneFogInput,
  ): Promise<GameScenes> {
    return this.change(
      userId,
      gameId,
      'fog',
      { sceneId, ...input },
      (tx, masterId) => setSceneFog(tx, gameId, masterId, sceneId, input),
    );
  }

  setOpen(userId: string, gameId: string, open: boolean): Promise<GameScenes> {
    return this.change(userId, gameId, 'open', { open }, (tx, masterId) =>
      setSceneOpen(tx, gameId, masterId, open),
    );
  }

  private async change(
    userId: string,
    gameId: string,
    what: string,
    params: Record<string, unknown>,
    edit: SceneEdit,
  ): Promise<GameScenes> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      await this.assertMaster(userId, gameId);
      const changed = await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        return edit(tx, userId);
      });
      if (changed) this.realtime.publish(gameId);
      this.logger.info(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          what,
          ...params,
          changed,
        },
        'Game scenes changed',
      );
      return this.read(userId, gameId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, what, ...params },
        'Changing game scenes failed',
      );
      throw err;
    }
  }

  private async read(userId: string, gameId: string): Promise<GameScenes> {
    const { db } = this.databaseService;
    const game = await this.assertMaster(userId, gameId);
    return { open: game.sceneOpen, scenes: await listScenes(db, gameId) };
  }

  private async assertMaster(userId: string, gameId: string) {
    const { game } = await findGameAccess(
      this.databaseService.db,
      gameId,
      userId,
    );
    if (game.masterId !== userId)
      throw new ForbiddenException(MASTER_ONLY_SCENES);
    return game;
  }
}
