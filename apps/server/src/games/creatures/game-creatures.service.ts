import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type {
  CharacterEffectEntry,
  GameCreatureChange,
  GameCreatures,
  SpellSlotsExpended,
  Vec3,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import { MapLimitsConfig } from '../../maps/map-limits.js';
import {
  MASTER_ONLY_CREATURES,
  NO_ACTIVE_SCENE,
  SCENE_CLOSED,
  SCENE_MEMBERS_ONLY,
} from '../game-errors.js';
import { lockGame } from '../game-journal.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import { findActiveScene } from '../scenes/index.js';
import {
  addCreatureEffect,
  changeCreature,
  removeCreatureEffect,
} from './creature-edits.js';
import {
  changeCreatureAllowance,
  moveCreature,
  type CreatureMoveActor,
} from './creature-moves.js';
import { playerFog } from '../fog/fog-view.js';
import { prepareCreatureSpell, spendCreatureSlots } from './creature-spells.js';
import { loadCreatureEffects, readSceneCreatures } from './creature-read.js';

// Монстры и НПС активной сцены (docs/plan/done/game.md, этап 8). Видят их те же, кто видит
// сцену: мастер — с хитами и эффектами, игроки, пока сцена открыта, — только метки
// здоровья видимых им существ. Правит только мастер: транзакция под блокировкой игры,
// запись журнала и рассылка.
@Injectable()
export class GameCreaturesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    private readonly limits: MapLimitsConfig,
    @InjectPinoLogger(GameCreaturesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async list(userId: string, gameId: string): Promise<GameCreatures> {
    const t0 = Date.now();
    try {
      const { game, member } = await findGameAccess(
        this.databaseService.db,
        gameId,
        userId,
      );
      const master = game.masterId === userId;
      if (!master && !member) throw new ForbiddenException(SCENE_MEMBERS_ONLY);
      // Номер журнала и существа — одним снимком, как у фигурок.
      const result = await this.databaseService.db.transaction(
        async (tx) => {
          const [row] = await tx
            .select({ sceneOpen: games.sceneOpen, eventSeq: games.eventSeq })
            .from(games)
            .where(eq(games.id, gameId));
          const scene = await findActiveScene(tx, gameId);
          if (!scene) throw new NotFoundException(NO_ACTIVE_SCENE);
          if (!master && !row.sceneOpen) {
            throw new ForbiddenException(SCENE_CLOSED);
          }
          return {
            sceneId: scene.id,
            eventSeq: row.eventSeq,
            creatures: await readSceneCreatures(
              tx,
              gameId,
              scene.id,
              master,
              master ? null : await playerFog(tx, scene),
            ),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          count: result.creatures.length,
        },
        'Scene creatures read',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Reading creatures failed');
      throw err;
    }
  }

  async change(
    userId: string,
    gameId: string,
    objectId: number,
    change: GameCreatureChange,
  ): Promise<GameCreatures> {
    await this.edit(userId, gameId, objectId, change.kind, (actor) =>
      changeCreature(actor, objectId, change),
    );
    return this.list(userId, gameId);
  }

  // Ячейки и подготовка экземпляра НПС; отвечают существами, как правка хитов.
  async spellSlots(
    userId: string,
    gameId: string,
    objectId: number,
    expended: SpellSlotsExpended,
  ): Promise<GameCreatures> {
    await this.edit(userId, gameId, objectId, 'slots_changed', (actor) =>
      spendCreatureSlots(actor, objectId, expended),
    );
    return this.list(userId, gameId);
  }

  async prepared(
    userId: string,
    gameId: string,
    objectId: number,
    abilityId: string,
    prepared: boolean,
  ): Promise<GameCreatures> {
    await this.edit(userId, gameId, objectId, 'prepared', (actor) =>
      prepareCreatureSpell(actor, objectId, abilityId, prepared),
    );
    return this.list(userId, gameId);
  }

  // Ход по пути (docs/plan/done/creature-movement.md); отвечает существами, как правка хитов.
  async move(
    userId: string,
    gameId: string,
    objectId: number,
    to: Vec3,
  ): Promise<GameCreatures> {
    await this.edit(userId, gameId, objectId, 'move', (actor) =>
      moveCreature(actor, objectId, to),
    );
    return this.list(userId, gameId);
  }

  async allowance(
    userId: string,
    gameId: string,
    objectId: number,
    change: 'refresh' | 'dash',
  ): Promise<GameCreatures> {
    await this.edit(userId, gameId, objectId, change, (actor) =>
      changeCreatureAllowance(actor, objectId, change),
    );
    return this.list(userId, gameId);
  }

  async addEffect(
    userId: string,
    gameId: string,
    objectId: number,
    effectId: string,
  ): Promise<CharacterEffectEntry[]> {
    const sceneId = await this.edit(
      userId,
      gameId,
      objectId,
      'effect_added',
      (actor) => addCreatureEffect(actor, objectId, effectId),
    );
    return this.effectsOf(gameId, sceneId, objectId);
  }

  async removeEffect(
    userId: string,
    gameId: string,
    objectId: number,
    entryId: string,
  ): Promise<CharacterEffectEntry[]> {
    const sceneId = await this.edit(
      userId,
      gameId,
      objectId,
      'effect_removed',
      (actor) => removeCreatureEffect(actor, objectId, entryId),
    );
    return this.effectsOf(gameId, sceneId, objectId);
  }

  private async effectsOf(gameId: string, sceneId: string, objectId: number) {
    const lists = await loadCreatureEffects(
      this.databaseService.db,
      gameId,
      sceneId,
    );
    return lists.get(objectId) ?? [];
  }

  // Возвращает активную сцену, в которой была правка.
  private async edit(
    userId: string,
    gameId: string,
    objectId: number,
    kind: string,
    run: (actor: CreatureMoveActor) => Promise<void>,
  ): Promise<string> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    const log = { userId, gameId, objectId, kind };
    try {
      const { game } = await findGameAccess(db, gameId, userId);
      if (game.masterId !== userId) {
        throw new ForbiddenException(MASTER_ONLY_CREATURES);
      }
      const sceneId = await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        const scene = await findActiveScene(tx, gameId);
        if (!scene) throw new ConflictException(NO_ACTIVE_SCENE);
        await run({
          tx,
          gameId,
          sceneId: scene.id,
          userId,
          scene,
          limits: this.limits,
        });
        return scene.id;
      });
      this.realtime.publish(gameId);
      this.logger.info(
        { ...log, durationMs: Date.now() - t0 },
        'Scene creature changed',
      );
      return sceneId;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Changing a scene creature failed',
      );
      throw err;
    }
  }
}
