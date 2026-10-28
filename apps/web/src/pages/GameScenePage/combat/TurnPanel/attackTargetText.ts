import type { AttackTarget, TurnSpend } from 'shared';

// Подписи списка целей (макет «Атака и начало боя», вариант Б).

const COVER_SHORT = { half: 'укрытие ½', threeQuarters: 'укрытие ¾' } as const;

// «5 фт. · укрытие ½ · КД 12»: КД с укрытием — только мастеру, он приходит null игроку.
export function targetMeta(target: AttackTarget): string {
  const parts = [`${target.distance} фт.`];
  if (target.band === 'long') parts.push('дальняя дистанция');
  if (target.band === 'out') parts.push('вне досягаемости');
  if (target.cover !== 'none') parts.push(COVER_SHORT[target.cover]);
  if (target.armorClass !== null) parts.push(`КД ${target.armorClass}`);
  return parts.join(' · ');
}

export const targetKey = (target: AttackTarget) =>
  target.ref.kind === 'figure'
    ? `figure:${target.ref.characterId}`
    : `creature:${target.ref.objectId}`;

export function spendText(cost: TurnSpend | null): string {
  return cost === 'bonus_action' ? 'Бонусное действие' : 'Действие';
}
