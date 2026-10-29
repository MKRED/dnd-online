import { HttpException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type {
  AttackKey,
  AttackTarget,
  CombatAttackInput,
  GameCombat,
  GameCombatAttack,
  GameCombatDamage,
  WeaponSet,
} from 'shared';
import { isMaster } from '../combat-actor.js';
import { GameCombatService } from '../game-combat.service.js';
import { rollPendingDamage, type DamageResult } from './attack-damage.js';
import { makeAttack, type AttackResult } from './attack-make.js';
import { listTargets } from './attack-targets.js';
import { switchWeaponSet } from './weapon-set.js';

// Атаки героев в бою (docs/plan/combat.md, этап 5): цели, бросок атаки, урон и набор
// оружия. Правки идут через правку боя (lockGame, журнал, рассылка) и отвечают очередью.
@Injectable()
export class GameCombatAttackService {
  constructor(
    private readonly combat: GameCombatService,
    @InjectPinoLogger(GameCombatAttackService.name)
    private readonly logger: PinoLogger,
  ) {}

  async targets(
    userId: string,
    gameId: string,
    combatantId: string,
    attack: AttackKey,
  ): Promise<AttackTarget[]> {
    const t0 = Date.now();
    try {
      const targets = await this.combat.readWith(userId, gameId, (actor) =>
        listTargets(actor, combatantId, attack),
      );
      this.logger.debug(
        { durationMs: Date.now() - t0, userId, gameId, combatantId, attack },
        'Attack targets read',
      );
      return targets;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, userId, gameId, combatantId },
        'Reading attack targets failed',
      );
      throw err;
    }
  }

  async attack(
    userId: string,
    gameId: string,
    combatantId: string,
    input: CombatAttackInput,
  ): Promise<GameCombatAttack> {
    let result: AttackResult | null = null;
    let master = false;
    const combat = await this.combat.change(
      userId,
      gameId,
      'attack',
      async (actor) => {
        master = isMaster(actor);
        result = await makeAttack(actor, combatantId, input);
      },
    );
    const { roll, outcome, armorClass } = result!;
    this.logger.info(
      { userId, gameId, combatantId, attack: input.attack, outcome },
      'Attack rolled',
    );
    return { roll, outcome, armorClass: master ? armorClass : null, combat };
  }

  async damage(
    userId: string,
    gameId: string,
    combatantId: string,
  ): Promise<GameCombatDamage> {
    let result: DamageResult | null = null;
    const combat = await this.combat.change(
      userId,
      gameId,
      'damage',
      async (actor) => {
        result = await rollPendingDamage(actor, combatantId);
      },
    );
    const { damage, hitPoints } = result!;
    this.logger.info(
      { userId, gameId, combatantId, total: damage.total },
      'Attack damage rolled',
    );
    return { damage, hitPoints, combat };
  }

  weaponSet(
    userId: string,
    gameId: string,
    combatantId: string,
    set: WeaponSet,
  ): Promise<GameCombat> {
    return this.combat.change(userId, gameId, 'weapon_set', (actor) =>
      switchWeaponSet(actor, combatantId, set),
    );
  }
}
