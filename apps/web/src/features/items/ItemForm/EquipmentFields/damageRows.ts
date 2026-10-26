import type { DamageDie, DamageType, WeaponDamage } from 'shared';

// Кубик урона — строкой для Select; 'flat' — урон числом без кубика.
export type DieChoice = `${DamageDie}` | 'flat';

// Строка дополнительного урона в форме (вариант Б макета).
export interface DamageRow {
  count: number | string;
  die: DieChoice;
  type: DamageType | null;
}

export const EMPTY_DAMAGE_ROW: DamageRow = { count: 1, die: '6', type: null };

export const rowFromDamage = ({
  count,
  die,
  type,
}: WeaponDamage): DamageRow => ({
  count,
  die: die === null ? 'flat' : `${die}`,
  type,
});

export const damageFromRow = ({
  count,
  die,
  type,
}: DamageRow): WeaponDamage => ({
  count: Number(count),
  die: die === 'flat' ? null : (Number(die) as DamageDie),
  type: type ?? 'bludgeoning',
});
