import {
  activeWeaponSet,
  attackRollInput,
  COVER_ARMOR_CLASS,
  heroAttacks,
  rangeBand,
  wornGear,
  type AttackKey,
  type AttackOption,
  type Cover,
  type D20RollInput,
  type MapState,
  type RangeBand,
} from 'shared';
import type { CombatantRow } from '../combatant-read.js';
import type { Fighter } from './attack-fighters.js';
import { coverBetween, distanceFt, enemyClose } from './attack-geometry.js';

// Атака героя по одной цели: где она, что войдёт в бросок и какой у неё КД с укрытием.
// Одно и то же для списка целей и для самого броска (docs/plan/combat.md, этап 5).

export interface AttackContext {
  distance: number;
  band: RangeBand;
  cover: Cover;
  roll: Omit<D20RollInput, 'master'>;
  armorClass: number;
  // Цель Парализована или Без сознания, а атакующий в 5 фт.: попадание — крит.
  autoCritical: boolean;
}

const AUTO_CRITICAL_FT = 5;

// Атаки активного набора и безоружный удар: значки другого набора в блоке не видны.
export function attacksInSet(
  hero: Fighter,
  row: Pick<CombatantRow, 'weaponSet'>,
): AttackOption[] {
  const character = hero.character!;
  const set = activeWeaponSet(row.weaponSet, wornGear(character.inventory));
  return heroAttacks(character).filter((a) => a.set === null || a.set === set);
}

export const findAttack = (options: readonly AttackOption[], key: AttackKey) =>
  options.find((a) => a.key === key) ?? null;

export function attackContext(
  map: MapState,
  attacker: Fighter,
  option: AttackOption,
  target: Fighter,
  fighters: readonly Fighter[],
  targetDodging: boolean,
): AttackContext {
  const distance = distanceFt(attacker, target);
  const band = rangeBand(option, distance);
  const cover = coverBetween(map, attacker, target);
  const roll = attackRollInput({
    option,
    distance,
    band,
    attacker: attacker.effects,
    target: target.effects,
    enemyClose: option.kind === 'ranged' && enemyClose(attacker, fighters),
    targetDodging,
  });
  const coverBonus = cover === 'total' ? 0 : COVER_ARMOR_CLASS[cover];
  return {
    distance,
    band,
    cover,
    roll,
    armorClass: target.armorClass + coverBonus,
    autoCritical:
      distance <= AUTO_CRITICAL_FT &&
      (target.conditions.has('paralyzed') ||
        target.conditions.has('unconscious')),
  };
}
