import {
  ATTACK_OUTCOME_LABELS,
  COVER_ARMOR_CLASS,
  DAMAGE_TYPE_LABELS,
  DEFENSE_LEVEL_LABELS,
  type AttackOutcome,
  type AttackTarget,
  type DamageByType,
} from 'shared';

// Подписи окна атаки (docs/plan/combat.md, «Решения к этапу 5»).

const COVER_SHORT = { half: '½', threeQuarters: '¾' } as const;

// «Укрытие ½: +2 к КД цели»; без укрытия — null. За полным укрытием атаки нет — окно
// не открывается.
export function coverText(cover: AttackTarget['cover']): string | null {
  if (cover === 'none' || cover === 'total') return null;
  return `Укрытие ${COVER_SHORT[cover]}: +${COVER_ARMOR_CLASS[cover]} к КД цели`;
}

// Итог броска; КД видит только мастер.
export function outcomeText(
  outcome: AttackOutcome,
  armorClass: number | null,
): string {
  const label = ATTACK_OUTCOME_LABELS[outcome];
  return armorClass === null ? label : `${label} · против КД ${armorClass}`;
}

export const damageTypeText = (type: DamageByType['type']) =>
  DAMAGE_TYPE_LABELS[type].toLowerCase();

// Строка по типу урона, как в листе: «9 рубящий (выпало 18, сопротивление)», «3 дробящий».
export function byTypeText(part: DamageByType): string {
  const type = damageTypeText(part.type);
  if (part.defenses.length === 0) return `${part.dealt} ${type}`;
  const defenses = part.defenses
    .map((d) => DEFENSE_LEVEL_LABELS[d].toLowerCase())
    .join(', ');
  return `${part.dealt} ${type} (выпало ${part.rolled}, ${defenses})`;
}

export function hitPointsText(hp: {
  before: number;
  after: number;
  max: number;
}): string {
  return `Хиты цели: ${hp.before} → ${hp.after} из ${hp.max}`;
}
