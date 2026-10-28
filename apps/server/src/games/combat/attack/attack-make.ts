import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  attackOutcome,
  attackReachText,
  effectDamageTerms,
  rollD20,
  spendBlock,
  type AttackOutcome,
  type CombatAttackInput,
  type D20Roll,
  type PendingDamage,
} from 'shared';
import { gameCombatants } from '../../../database/schema/index.js';
import { appendGameEvent } from '../../game-journal.js';
import { asOf, isMaster, type CombatActor } from '../combat-actor.js';
import {
  ATTACK_NEEDS_LIGHT,
  ATTACK_NOT_IN_SET,
  DAMAGE_PENDING,
  MASTER_ONLY_ROLL_MODE,
  TARGET_DOWN,
  TARGET_NOT_FOUND,
  TARGET_SELF,
  TARGET_TOTAL_COVER,
  targetOutOfReach,
} from '../combat-errors.js';
import { fairRandom } from '../combat-initiative.js';
import { resourcesOf, turnLimitsOf } from '../combat-resources.js';
import { eventCombatant } from '../combatant-read.js';
import { attackContext, attacksInSet, findAttack } from './attack-context.js';
import { sameRef } from './attack-fighters.js';
import { dodgingOf, loadAttackScene, targetVisible } from './attack-scene.js';
import { fighterVisibility } from './attack-visibility.js';

// Бросок атаки героя (docs/plan/combat.md, этап 5): тратит действие (вторая рука —
// бонусное), бросает к20 на сервере, сравнивает с КД цели с укрытием. Попадание
// запоминает урон, который бросят вторым нажатием.

export interface AttackResult {
  roll: D20Roll;
  outcome: AttackOutcome;
  armorClass: number;
}

export async function makeAttack(
  actor: CombatActor,
  combatantId: string,
  input: CombatAttackInput,
): Promise<AttackResult> {
  if (input.mode !== undefined && !isMaster(actor)) {
    throw new ForbiddenException(MASTER_ONLY_ROLL_MODE);
  }
  const { state, c, world, fighters, attacker, fog } = await loadAttackScene(
    actor,
    combatantId,
  );
  const { row } = c;
  if (row.pendingDamage) throw new ConflictException(DAMAGE_PENDING);
  const option = findAttack(attacksInSet(attacker, row), input.attack);
  if (!option) throw new BadRequestException(ATTACK_NOT_IN_SET);
  if (option.unavailable) throw new ConflictException(option.unavailable);
  if (option.spend === 'bonus_action' && !row.lightAttacked) {
    throw new ConflictException(ATTACK_NEEDS_LIGHT);
  }
  const limits = (await turnLimitsOf(actor.tx, [c])).get(row.id)!;
  const block = spendBlock(
    option.spend,
    resourcesOf(row, limits),
    state.turn === row.id,
  );
  if (block) throw new ConflictException(block);

  const target = fighters.find((f) => sameRef(f.ref, input.target));
  if (!target || !targetVisible(actor, target, fog)) {
    throw new NotFoundException(TARGET_NOT_FOUND);
  }
  if (target === attacker) throw new BadRequestException(TARGET_SELF);
  if (target.down) throw new ConflictException(TARGET_DOWN);
  const context = attackContext(
    world.map,
    attacker,
    option,
    target,
    fighters,
    dodgingOf(state, target),
  );
  if (context.cover === 'total') {
    throw new ConflictException(TARGET_TOTAL_COVER);
  }
  if (context.band === 'out') {
    throw new ConflictException(targetOutOfReach(attackReachText(option)));
  }

  const roll = rollD20(
    { ...context.roll, master: input.mode ?? null },
    fairRandom,
  );
  const outcome = attackOutcome(roll, context.armorClass, context.autoCritical);
  const weaponType = option.damage[0].type;
  const pending: PendingDamage | null =
    outcome === 'miss'
      ? null
      : {
          attack: option.key,
          name: option.name,
          target: { ref: target.ref, name: target.name },
          critical: outcome === 'critical',
          damage: [
            ...option.damage,
            ...effectDamageTerms(attacker.effects, weaponType),
          ],
        };
  await actor.tx
    .update(gameCombatants)
    .set({
      ...(option.spend === 'action'
        ? { actionsUsed: row.actionsUsed + 1 }
        : { bonusActionsUsed: row.bonusActionsUsed + 1 }),
      ...(option.light && { lightAttacked: true }),
      pendingDamage: pending,
    })
    .where(eq(gameCombatants.id, row.id));
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.attack',
    actorId: actor.userId,
    as: asOf(actor, c),
    sceneId: actor.scene.id,
    intent: {
      combatantId,
      attack: input.attack,
      target: input.target,
      mode: input.mode ?? null,
    },
    result: {
      combatant: eventCombatant(c),
      attack: { key: option.key, name: option.name },
      target: { ref: target.ref, name: target.name },
      roll,
      cover: context.cover,
      armorClass: context.armorClass,
      outcome,
      spent: option.spend,
    },
    visibility: await fighterVisibility(actor, target),
  });
  return { roll, outcome, armorClass: context.armorClass };
}
