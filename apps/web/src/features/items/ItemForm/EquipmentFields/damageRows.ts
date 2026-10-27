import type {
  DamageDie,
  DamageType,
  WeaponDamage,
  WeaponExtraDamage,
} from 'shared';

// Кубик урона — строкой для Select; 'flat' — урон числом без кубика.
export type DieChoice = `${DamageDie}` | 'flat';

// Строка дополнительного урона в форме (вариант Б макета).
// withoutAttunement — отметка «Действует без настройки» (вариант А макета 2026-10-27).
export interface DamageRow {
  count: number | string;
  die: DieChoice;
  type: DamageType | null;
  withoutAttunement: boolean;
}

export const EMPTY_DAMAGE_ROW: DamageRow = {
  count: 1,
  die: '6',
  type: null,
  withoutAttunement: false,
};

export const rowFromDamage = ({
  count,
  die,
  type,
  withoutAttunement,
}: WeaponExtraDamage): DamageRow => ({
  count,
  die: die === null ? 'flat' : `${die}`,
  type,
  withoutAttunement: withoutAttunement ?? false,
});

// Отметка уходит, только когда она стоит: без неё запись та же, что до отметок.
export const extraFromRow = (row: DamageRow): WeaponExtraDamage => ({
  ...damageFromRow(row),
  ...(row.withoutAttunement ? { withoutAttunement: true } : {}),
});

export const damageFromRow = ({
  count,
  die,
  type,
}: Pick<DamageRow, 'count' | 'die' | 'type'>): WeaponDamage => ({
  count: Number(count),
  die: die === 'flat' ? null : (Number(die) as DamageDie),
  type: type ?? 'bludgeoning',
});
