import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type {
  Character,
  CharacterEffectEntry,
  GameCharacterChange,
  GameEquipmentChange,
} from 'shared';
import { DatabaseService } from '../../database/database.service.js';
import { GAME_CHARACTER_NOT_YOURS } from '../game-errors.js';
import { lockGame } from '../game-journal.js';
import { assertPlayerInSession } from '../session-gate.js';
import { findGameAccess } from '../game-read.js';
import { GameRealtimeService } from '../realtime/game-realtime.service.js';
import {
  findSeatedCharacter,
  type SeatedCharacter,
} from './game-character-access.js';
import {
  addCharacterEffect,
  removeCharacterEffect,
} from './game-character-effect-links.js';
import { loadGameEffectLists } from './game-character-effects.js';
import { changeEquipment } from './game-character-equipment.js';
import { readGameCharacter } from './game-character-read.js';
import {
  changeCharacter,
  type CharacterActor,
} from './game-character-state.js';

// Персонажи игроков в игре (docs/plan/done/game.md, этап 8): лист, хиты, ячейки и эффекты;
// кукла — с этапа 4 плана экипировки.
// Правит тот же круг, что водит фигурку: мастер, владелец и управляющий; читает ещё и
// отряд — участники со своими персонажами на местах (docs/plan/done/scene-page.md, этап 5). Каждая
// правка — транзакция под блокировкой игры, запись журнала и рассылка.
@Injectable()
export class GameCharactersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly realtime: GameRealtimeService,
    @InjectPinoLogger(GameCharactersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async read(
    userId: string,
    gameId: string,
    characterId: string,
  ): Promise<Character> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    try {
      const { game, member } = await findGameAccess(db, gameId, userId);
      // Член отряда (участник со своим персонажем на месте) читает листы героев.
      const party = member?.characterId != null;
      const seated = await findSeatedCharacter(
        db,
        gameId,
        characterId,
        userId,
        game.masterId,
        party,
      );
      const character = await readGameCharacter(db, gameId, seated);
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, gameId, characterId },
        'Game character read',
      );
      return character;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, characterId },
        'Reading a game character failed',
      );
      throw err;
    }
  }

  async change(
    userId: string,
    gameId: string,
    characterId: string,
    change: GameCharacterChange,
  ): Promise<Character> {
    const seated = await this.edit(
      userId,
      gameId,
      characterId,
      change.kind,
      (actor, row) => changeCharacter(actor, row, change),
    );
    return readGameCharacter(this.databaseService.db, gameId, seated);
  }

  async addEffect(
    userId: string,
    gameId: string,
    characterId: string,
    effectId: string,
  ): Promise<CharacterEffectEntry[]> {
    const seated = await this.edit(
      userId,
      gameId,
      characterId,
      'effect_added',
      (actor, row) => addCharacterEffect(actor, row, effectId),
    );
    return this.effectsOf(gameId, seated);
  }

  async removeEffect(
    userId: string,
    gameId: string,
    characterId: string,
    entryId: string,
  ): Promise<CharacterEffectEntry[]> {
    const seated = await this.edit(
      userId,
      gameId,
      characterId,
      'effect_removed',
      (actor, row) => removeCharacterEffect(actor, row, entryId),
    );
    return this.effectsOf(gameId, seated);
  }

  // Кукла в игре отвечает листом целиком: КД, атаки и Скорость меняются вместе с ней.
  async changeEquipment(
    userId: string,
    gameId: string,
    characterId: string,
    change: GameEquipmentChange,
  ): Promise<Character> {
    const seated = await this.edit(
      userId,
      gameId,
      characterId,
      `equipment_${change.kind}`,
      (actor, row) => changeEquipment(actor, row, change),
    );
    return readGameCharacter(this.databaseService.db, gameId, seated);
  }

  private async effectsOf(gameId: string, seated: SeatedCharacter) {
    const lists = await loadGameEffectLists(
      this.databaseService.db,
      gameId,
      new Map([[seated.id, seated.ownerId]]),
    );
    return lists.get(seated.id) ?? [];
  }

  private async edit(
    userId: string,
    gameId: string,
    characterId: string,
    kind: string,
    run: (actor: CharacterActor, seated: SeatedCharacter) => Promise<void>,
  ): Promise<SeatedCharacter> {
    const t0 = Date.now();
    const { db } = this.databaseService;
    const log = { userId, gameId, characterId, kind };
    try {
      const { game, member } = await findGameAccess(db, gameId, userId);
      if (game.masterId !== userId && !member) {
        throw new ForbiddenException(GAME_CHARACTER_NOT_YOURS);
      }
      const seated = await db.transaction(async (tx) => {
        await lockGame(tx, gameId);
        // Право проверяется под блокировкой: управляющего могли снять секунду назад.
        const row = await findSeatedCharacter(
          tx,
          gameId,
          characterId,
          userId,
          game.masterId,
        );
        await assertPlayerInSession(tx, gameId, userId, game.masterId);
        await run({ tx, gameId, userId, masterId: game.masterId }, row);
        return row;
      });
      this.realtime.publish(gameId);
      this.logger.info(
        { ...log, durationMs: Date.now() - t0 },
        'Game character changed',
      );
      return seated;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Changing a game character failed',
      );
      throw err;
    }
  }
}
