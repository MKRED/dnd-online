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
  CombatAbilityInput,
  CombatAction,
  CombatantInput,
  CombatResourcesInput,
  D20Roll,
  GameCombat,
  GameCombatRoll,
  RollMode,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import { games } from '../../database/schema/index.js';
import {
  NO_ACTIVE_SCENE,
  SCENE_CLOSED,
  SCENE_MEMBERS_ONLY,
} from '../game-errors.js';
import { lockGame } from '../game-journal.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import { findActiveScene } from '../scenes/index.js';
import { assertPlayerInSession } from '../session-gate.js';
import { useAbility } from './combat-ability-use.js';
import { setResources, takeAction } from './combat-actions.js';
import type { CombatActor } from './combat-actor.js';
import {
  rollCreatures,
  rollFor,
  reorder,
  setInitiative,
} from './combat-rolls.js';
import { joinCombat, leaveCombat, startCombat } from './combat-roster.js';
import { endTurn, passTurn } from './combat-turn-actions.js';
import { readCombatView } from './combat-view.js';

// Бой с очерёдностью на активной сцене (docs/plan/combat.md, этап 2). Видят его те же, кто
// видит сцену; правка — одна транзакция под блокировкой игры, записи журнала и рассылка,
// ответ — очередь глазами того, кто правил.
@Injectable()
export class GameCombatService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameCombatService.name)
    private readonly logger: PinoLogger,
  ) {}

  async read(userId: string, gameId: string): Promise<GameCombat> {
    const t0 = Date.now();
    try {
      const result = await this.readWith(
        userId,
        gameId,
        ({ tx, scene, masterId }) =>
          readCombatView(tx, gameId, scene, { userId, masterId }),
      );
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          gameId,
          combatants: result.combatants.length,
        },
        'Game combat read',
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error({ err, userId, gameId }, 'Game combat read failed');
      throw err;
    }
  }

  start(userId: string, gameId: string, participants: CombatantInput[]) {
    return this.change(userId, gameId, 'start', (actor) =>
      startCombat(actor, participants),
    );
  }

  join(userId: string, gameId: string, participants: CombatantInput[]) {
    return this.change(userId, gameId, 'join', (actor) =>
      joinCombat(actor, participants),
    );
  }

  leave(userId: string, gameId: string, combatantId: string) {
    return this.change(userId, gameId, 'leave', (actor) =>
      leaveCombat(actor, combatantId),
    );
  }

  async roll(
    userId: string,
    gameId: string,
    combatantId: string,
    mode: RollMode | null,
  ): Promise<GameCombatRoll> {
    let roll: D20Roll | null = null;
    const combat = await this.change(userId, gameId, 'roll', async (actor) => {
      roll = await rollFor(actor, combatantId, mode);
    });
    return { roll: roll!, combat };
  }

  rollCreatures(userId: string, gameId: string) {
    return this.change(userId, gameId, 'roll_creatures', async (actor) => {
      await rollCreatures(actor);
    });
  }

  setInitiative(
    userId: string,
    gameId: string,
    combatantId: string,
    initiative: number,
  ) {
    return this.change(userId, gameId, 'set_initiative', (actor) =>
      setInitiative(actor, combatantId, initiative),
    );
  }

  reorder(userId: string, gameId: string, ids: string[]) {
    return this.change(userId, gameId, 'reorder', (actor) =>
      reorder(actor, ids),
    );
  }

  endTurn(userId: string, gameId: string, combatantId: string) {
    return this.change(userId, gameId, 'end_turn', (actor) =>
      endTurn(actor, combatantId),
    );
  }

  passTurn(userId: string, gameId: string, combatantId: string) {
    return this.change(userId, gameId, 'pass_turn', (actor) =>
      passTurn(actor, combatantId),
    );
  }

  takeAction(
    userId: string,
    gameId: string,
    combatantId: string,
    action: CombatAction,
  ) {
    return this.change(userId, gameId, 'action', (actor) =>
      takeAction(actor, combatantId, action),
    );
  }

  useAbility(
    userId: string,
    gameId: string,
    combatantId: string,
    input: CombatAbilityInput,
  ) {
    return this.change(userId, gameId, 'ability', (actor) =>
      useAbility(actor, combatantId, input.abilityId, input.slotLevel ?? null),
    );
  }

  setResources(
    userId: string,
    gameId: string,
    combatantId: string,
    input: CombatResourcesInput,
  ) {
    return this.change(userId, gameId, 'resources', (actor) =>
      setResources(actor, combatantId, input),
    );
  }

  // Чтение боя глазами смотрящего: те же проверки, что у read, без блокировки игры.
  async readWith<T>(
    userId: string,
    gameId: string,
    run: (actor: CombatActor) => Promise<T>,
  ): Promise<T> {
    const masterId = await this.assertParticipant(userId, gameId);
    return this.databaseService.db.transaction(
      async (tx) => {
        const [game] = await tx
          .select({ sceneOpen: games.sceneOpen })
          .from(games)
          .where(eq(games.id, gameId));
        const scene = await findActiveScene(tx, gameId);
        if (!scene) throw new NotFoundException(NO_ACTIVE_SCENE);
        if (userId !== masterId && !game.sceneOpen) {
          throw new ForbiddenException(SCENE_CLOSED);
        }
        return run({ tx, gameId, userId, masterId, scene });
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  private async assertParticipant(userId: string, gameId: string) {
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

  // Правка боя: одна транзакция под блокировкой игры, рассылка и очередь в ответ. Её же
  // берут атаки (attack/game-combat-attack.service.ts).
  async change(
    userId: string,
    gameId: string,
    kind: string,
    run: (actor: CombatActor) => Promise<void>,
  ): Promise<GameCombat> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const masterId = await this.assertParticipant(userId, gameId);
      await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        const [game] = await tx
          .select({ sceneOpen: games.sceneOpen })
          .from(games)
          .where(eq(games.id, gameId));
        // Закрытая сцена игрокам не видна — и бросать на ней нельзя.
        if (userId !== masterId && !game.sceneOpen) {
          throw new ForbiddenException(SCENE_CLOSED);
        }
        await assertPlayerInSession(tx, gameId, userId, masterId);
        const scene = await findActiveScene(tx, gameId);
        if (!scene) throw new ConflictException(NO_ACTIVE_SCENE);
        await run({ tx, gameId, userId, masterId, scene });
      });
      this.realtime.publish(gameId);
      this.logger.info(
        { durationMs: Date.now() - t0, userId, gameId, kind },
        'Game combat changed',
      );
      return this.read(userId, gameId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, kind },
        'Changing game combat failed',
      );
      throw err;
    }
  }
}
