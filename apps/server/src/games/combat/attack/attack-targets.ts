import { BadRequestException } from '@nestjs/common';
import type { AttackKey, AttackTarget } from 'shared';
import { isMaster, type CombatActor } from '../combat-actor.js';
import { ATTACK_NOT_IN_SET } from '../combat-errors.js';
import { attackContext, attacksInSet, findAttack } from './attack-context.js';
import { dodgingOf, loadAttackScene, targetVisible } from './attack-scene.js';

// Цели атаки (docs/plan/combat.md, этап 5, «Выбор цели после этапа 5»): все, кого видит
// атакующий, кроме него самого и поверженных монстров и НПС. Вне досягаемости и за
// полным укрытием — тоже: строка над целью скажет, почему её не достать. КД — мастеру.
export async function listTargets(
  actor: CombatActor,
  combatantId: string,
  key: AttackKey,
): Promise<AttackTarget[]> {
  const scene = await loadAttackScene(actor, combatantId);
  const { attacker, fighters, state, world, fog, c } = scene;
  const option = findAttack(attacksInSet(attacker, c.row), key);
  if (!option) throw new BadRequestException(ATTACK_NOT_IN_SET);
  const master = isMaster(actor);
  return fighters
    .filter((f) => f !== attacker && !f.down && targetVisible(actor, f, fog))
    .flatMap((target): AttackTarget[] => {
      const context = attackContext(
        world.map,
        attacker,
        option,
        target,
        fighters,
        dodgingOf(state, target),
      );
      return [
        {
          ref: target.ref,
          name: target.name,
          ally: target.party === attacker.party,
          distance: context.distance,
          band: context.band,
          cover: context.cover,
          roll: context.roll,
          armorClass:
            master && context.cover !== 'total' ? context.armorClass : null,
        },
      ];
    })
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}
