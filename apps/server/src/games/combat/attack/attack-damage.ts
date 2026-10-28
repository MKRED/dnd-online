import { ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  applyHitPoints,
  rollDamage,
  type DamageDealtPart,
  type DamageRoll,
  type GameCombatDamage,
} from 'shared';
import { gameCombatants } from '../../../database/schema/index.js';
import { changeCharacter } from '../../characters/game-character-state.js';
import { changeCreature } from '../../creatures/creature-edits.js';
import { appendGameEvent } from '../../game-journal.js';
import { asOf, isMaster, type CombatActor } from '../combat-actor.js';
import { NO_PENDING_DAMAGE } from '../combat-errors.js';
import { fairRandom } from '../combat-initiative.js';
import { eventCombatant } from '../combatant-read.js';
import { sameRef, type Fighter } from './attack-fighters.js';
import { loadAttackScene } from './attack-scene.js';
import { fighterVisibility } from './attack-visibility.js';

// Урон попавшей атаки — второе нажатие (docs/plan/combat.md, этап 5): кости на сервере, на
// крите вдвое, защиты цели по типам, хиты снимаются сразу той же правкой, что у мастера.

export interface DamageResult {
  damage: DamageRoll;
  hitPoints: GameCombatDamage['hitPoints'];
}

// Части — что прошло после защит (damageDealt.ts); тип, ушедший в ноль, не пишется.
function damageChange(damage: DamageRoll) {
  const parts: DamageDealtPart[] = damage.byType
    .filter((p) => p.dealt > 0)
    .map((p) => ({ amount: p.dealt, type: p.type }));
  return {
    kind: 'damage' as const,
    amount: damage.total,
    parts,
    critical: damage.critical,
  };
}

async function applyDamage(
  actor: CombatActor,
  target: Fighter,
  damage: DamageRoll,
) {
  const change = damageChange(damage);
  if (target.seated) {
    await changeCharacter(actor, target.seated, change);
    return;
  }
  await changeCreature(
    {
      tx: actor.tx,
      gameId: actor.gameId,
      sceneId: actor.scene.id,
      userId: actor.userId,
    },
    target.creature!.objectId,
    change,
  );
}

export async function rollPendingDamage(
  actor: CombatActor,
  combatantId: string,
): Promise<DamageResult> {
  const { c, fighters } = await loadAttackScene(actor, combatantId);
  const pending = c.row.pendingDamage;
  if (!pending) throw new ConflictException(NO_PENDING_DAMAGE);
  // Цель могли убрать со сцены между нажатиями: урон бросается, но снять его не с кого.
  const target = fighters.find((f) => sameRef(f.ref, pending.target.ref));
  const damage = rollDamage(
    pending.damage,
    pending.critical,
    target?.defenses ?? {},
    fairRandom,
  );
  await actor.tx
    .update(gameCombatants)
    .set({ pendingDamage: null })
    .where(eq(gameCombatants.id, c.row.id));
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.damage',
    actorId: actor.userId,
    as: asOf(actor, c),
    sceneId: actor.scene.id,
    intent: { combatantId },
    result: {
      combatant: eventCombatant(c),
      attack: { key: pending.attack, name: pending.name },
      target: pending.target,
      damage,
      applied: target !== undefined,
    },
    visibility: target ? await fighterVisibility(actor, target) : 'master',
  });
  if (!target) return { damage, hitPoints: null };
  if (damage.total > 0) await applyDamage(actor, target, damage);
  // Хиты героя партия видит на его листе; хиты монстра и НПС — только мастер.
  if (!isMaster(actor) && !target.party) return { damage, hitPoints: null };
  // Те же числа, что записала правка: сначала уходят временные хиты.
  const { current, max, temp } = target.hitPoints;
  const outcome = applyHitPoints(
    { current, max, temp, deathSuccesses: 0, deathFailures: 0 },
    damageChange(damage),
    false,
  );
  const after = outcome.ok ? outcome.state.current : current;
  return { damage, hitPoints: { before: current, after, max } };
}
