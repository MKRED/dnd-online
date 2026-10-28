import type { D20Roll } from '../d20Roll.js';
import type { Cover } from '../map/rules/cover.js';

// Попал ли бросок атаки (docs/dnd/combat.md, «Making an attack»): итог не меньше КД цели с
// укрытием. 20 на кости — Критическое попадание при любом КД, 1 — промах при любом.

// Укрытие (Rules Glossary 2024, Cover): ½ — +2 к КД, ¾ — +5, полное — цель не выбрать.
export const COVER_ARMOR_CLASS: Record<Exclude<Cover, 'total'>, number> = {
  none: 0,
  half: 2,
  threeQuarters: 5,
};

export type AttackOutcome = 'miss' | 'hit' | 'critical';

export const ATTACK_OUTCOME_LABELS: Record<AttackOutcome, string> = {
  miss: 'Промах',
  hit: 'Попадание',
  critical: 'Критическое попадание',
};

// autoCritical — цель Парализована или Без сознания, а атакующий в 5 фт.: любое
// попадание по ней критическое (Rules Glossary 2024, Paralyzed и Unconscious).
export function attackOutcome(
  roll: Pick<D20Roll, 'dice' | 'kept' | 'total'>,
  armorClass: number,
  autoCritical = false,
): AttackOutcome {
  const natural = roll.dice[roll.kept];
  if (natural === 1) return 'miss';
  if (natural === 20) return 'critical';
  if (roll.total < armorClass) return 'miss';
  return autoCritical ? 'critical' : 'hit';
}
