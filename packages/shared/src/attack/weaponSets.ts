import type { EquipSlot } from '../equipment.js';
import type { WornGear } from '../gear.js';

// Наборы оружия в бою (docs/plan/combat.md, «Решения к этапу 5», вопрос 1, вариант Б): в
// блоке хода переключатель «Ближний | Дальний», видны атаки только активного набора и
// безоружный удар. Переключить — бесплатно, раз за свой ход (домашнее правило,
// docs/dnd/weapons-armor.md).
export const WEAPON_SETS = ['melee', 'ranged'] as const;
export type WeaponSet = (typeof WEAPON_SETS)[number];

export const WEAPON_SET_LABELS: Record<WeaponSet, string> = {
  melee: 'Ближний',
  ranged: 'Дальний',
};

export function weaponSetOf(slot: EquipSlot): WeaponSet | null {
  if (slot === 'meleeMain' || slot === 'meleeOff') return 'melee';
  if (slot === 'rangedMain' || slot === 'rangedOff') return 'ranged';
  return null;
}

// Набор не выбран — ближний, а если в нём нет оружия, но есть дальнее, — дальний.
export function activeWeaponSet(
  chosen: WeaponSet | null,
  gear: Pick<WornGear, 'weapons'>,
): WeaponSet {
  if (chosen) return chosen;
  const has = (set: WeaponSet) =>
    gear.weapons.some((w) => weaponSetOf(w.slot) === set);
  return !has('melee') && has('ranged') ? 'ranged' : 'melee';
}
