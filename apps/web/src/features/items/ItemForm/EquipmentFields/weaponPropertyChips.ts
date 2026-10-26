import {
  MELEE_ONLY_PROPERTIES,
  RANGED_ONLY_PROPERTIES,
  type WeaponAttackType,
  type WeaponFlag,
} from 'shared';

// Поля оружия в форме. Свойства — одним рядом чипов: шесть без параметров и три с
// параметрами (дистанция, вид боеприпаса, урон двумя руками), которые раскрывают свои поля.
export type WeaponPropertyChip =
  WeaponFlag | 'thrown' | 'ammunition' | 'versatile';

// Порядок как в таблице книги, по алфавиту английских названий.
export const WEAPON_PROPERTY_CHIPS: WeaponPropertyChip[] = [
  'ammunition',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'twoHanded',
  'versatile',
];

// Чипы, которых у этого вида атаки не бывает (itemEquipment.ts): форма их прячет и не
// отправляет, чтобы смена вида не оставляла Боеприпас у меча.
export function chipFits(
  chip: WeaponPropertyChip,
  attackType: WeaponAttackType,
): boolean {
  const other: readonly string[] =
    attackType === 'melee' ? RANGED_ONLY_PROPERTIES : MELEE_ONLY_PROPERTIES;
  return !other.includes(chip);
}
