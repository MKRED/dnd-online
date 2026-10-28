import type { AttackTarget, CombatantRef, TurnSpend } from 'shared';
import type { SceneTargetMark } from '../../../../features/maps/MapScene';

// Подписи целей: строка над целью на сцене и карточка выбранной в панели (макет «Выбор
// цели атаки», ответы 1А 2Б).

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

// Ключи — те же, что у сцены (MapScene/targets): по ним она находит фигурку или существо.
export const refKey = (ref: CombatantRef) =>
  ref.kind === 'figure'
    ? `figure:${ref.characterId}`
    : `creature:${ref.objectId}`;

export const targetKey = (target: AttackTarget) => refKey(target.ref);

// Строка над целью на сцене (вариант 2Б): можно ли, расстояние и одно слово о броске.
// Укрытие и причины — в карточке панели. КД игроку не пишется и здесь не нужен.
export function targetMark(target: AttackTarget): SceneTargetMark {
  if (target.band === 'out') {
    return {
      tone: 'out',
      label: `✕ ${target.name} · ${target.distance} фт. · не достать`,
    };
  }
  const { advantage, disadvantage } = target.roll.reasons;
  // Преимущество и помеха вместе гасят друг друга (2024).
  const roll =
    disadvantage.length > 0 && advantage.length === 0
      ? 'помеха'
      : advantage.length > 0 && disadvantage.length === 0
        ? 'преимущество'
        : null;
  const parts = [`✓ ${target.name}`, `${target.distance} фт.`];
  if (roll) parts.push(roll);
  if (target.ally) parts.push('свой');
  return {
    tone: roll === 'помеха' ? 'disadvantage' : 'normal',
    label: parts.join(' · '),
  };
}

export function spendText(cost: TurnSpend | null): string {
  return cost === 'bonus_action' ? 'Бонусное действие' : 'Действие';
}
