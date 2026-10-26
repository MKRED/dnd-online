import {
  BOOK_WEAPONS,
  WEAPON_FLAGS,
  type AmmunitionKind,
  type DamageDie,
  type DamageType,
  type Weapon,
  type WeaponAttackType,
  type WeaponCategory,
  type WeaponItemDetails,
  type WeaponMastery,
} from 'shared';
import {
  damageFromRow,
  rowFromDamage,
  type DamageRow,
  type DieChoice,
} from './damageRows';
import {
  WEAPON_PROPERTY_CHIPS,
  chipFits,
  type WeaponPropertyChip,
} from './weaponPropertyChips';

// Поля оружия в форме: урон частями, свойства одним рядом чипов (weaponPropertyChips.ts).
export interface WeaponFormValues {
  base: Weapon | null;
  weaponCategory: WeaponCategory;
  attackType: WeaponAttackType;
  damageCount: number | string;
  damageDie: DieChoice;
  damageType: DamageType | null;
  extraDamage: DamageRow[];
  properties: WeaponPropertyChip[];
  thrownNormal: number | string;
  thrownLong: number | string;
  ammoNormal: number | string;
  ammoLong: number | string;
  ammoKind: AmmunitionKind | null;
  versatileCount: number | string;
  versatileDie: `${DamageDie}`;
  mastery: WeaponMastery | null;
}

export const EMPTY_WEAPON: WeaponFormValues = {
  base: null,
  weaponCategory: 'simple',
  attackType: 'melee',
  damageCount: 1,
  damageDie: '6',
  damageType: null,
  extraDamage: [],
  properties: [],
  thrownNormal: '',
  thrownLong: '',
  ammoNormal: '',
  ammoLong: '',
  ammoKind: null,
  versatileCount: 1,
  versatileDie: '8',
  mastery: null,
};

type WeaponStats = Omit<WeaponItemDetails, 'magicBonus' | 'attunement'>;

export function weaponToForm(details: WeaponStats): WeaponFormValues {
  const { thrown, ammunition, versatile } = details;
  const damage = rowFromDamage(details.damage);
  const chips: WeaponPropertyChip[] = [...details.properties];
  if (thrown) chips.push('thrown');
  if (ammunition) chips.push('ammunition');
  if (versatile) chips.push('versatile');
  return {
    base: details.base,
    weaponCategory: details.weaponCategory,
    attackType: details.attackType,
    damageCount: damage.count,
    damageDie: damage.die,
    damageType: damage.type,
    extraDamage: details.extraDamage.map(rowFromDamage),
    properties: WEAPON_PROPERTY_CHIPS.filter((chip) => chips.includes(chip)),
    thrownNormal: thrown?.normal ?? '',
    thrownLong: thrown?.long ?? '',
    ammoNormal: ammunition?.normal ?? '',
    ammoLong: ammunition?.long ?? '',
    ammoKind: ammunition?.kind ?? null,
    versatileCount: versatile?.count ?? 1,
    versatileDie: versatile ? `${versatile.die}` : '8',
    mastery: details.mastery,
  };
}

// Поля образца из книги — их форма подставляет при выборе образца.
export function weaponFromBook(base: Weapon): WeaponFormValues {
  return weaponToForm({ base, ...BOOK_WEAPONS[base] });
}

// Форма проверена до отправки: обязательные поля заполнены.
export function weaponToDetails(values: WeaponFormValues): WeaponStats {
  const has = (chip: WeaponPropertyChip) =>
    values.properties.includes(chip) && chipFits(chip, values.attackType);
  return {
    base: values.base,
    weaponCategory: values.weaponCategory,
    attackType: values.attackType,
    damage: damageFromRow({
      count: values.damageCount,
      die: values.damageDie,
      type: values.damageType,
    }),
    extraDamage: values.extraDamage.map(damageFromRow),
    properties: WEAPON_FLAGS.filter(has),
    thrown: has('thrown')
      ? { normal: Number(values.thrownNormal), long: Number(values.thrownLong) }
      : null,
    ammunition: has('ammunition')
      ? {
          normal: Number(values.ammoNormal),
          long: Number(values.ammoLong),
          kind: values.ammoKind ?? 'arrow',
        }
      : null,
    versatile: has('versatile')
      ? {
          count: Number(values.versatileCount),
          die: Number(values.versatileDie) as DamageDie,
        }
      : null,
    mastery: values.mastery,
  };
}

const SAME = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

// Чем оружие отличается от своего образца — подсказка под полем «Образец».
export function weaponBookDifferences(values: WeaponFormValues): string[] {
  if (!values.base) return [];
  const book = weaponFromBook(values.base);
  const mine = weaponToDetails(values);
  const theirs = weaponToDetails(book);
  const out: string[] = [];
  if (
    mine.weaponCategory !== theirs.weaponCategory ||
    mine.attackType !== theirs.attackType
  )
    out.push('вид');
  if (
    !SAME([mine.damage, mine.extraDamage], [theirs.damage, theirs.extraDamage])
  )
    out.push('урон');
  const props = ['properties', 'thrown', 'ammunition', 'versatile'] as const;
  if (props.some((key) => !SAME(mine[key], theirs[key]))) out.push('свойства');
  if (mine.mastery !== theirs.mastery) out.push('мастерство');
  return out;
}
