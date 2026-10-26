import type { DamageDie, DamageType } from './damageTypes.js';
import type { Weapon, WeaponCategory } from './weapons.js';

// Предметы экипировки (docs/plan/equipment.md, docs/dnd/weapons-armor.md): оружие, доспех,
// щит, одежда и украшения. Поля — по таблицам снаряжения книги 2024; образцы из книги —
// bookWeapons.ts и bookArmor.ts.

// Бонус магии: +1, +2 или +3 к атаке и урону оружия, к КД доспеха и щита. 0 — без бонуса.
export const ITEM_MAGIC_BONUS_MAX = 3;

// Магия общая для всех категорий экипировки. Бонус и настройка бывают только у
// магического предмета, то есть с редкостью (проверяет equipmentDetailsProblem).
export interface EquipmentMagic {
  attunement: boolean;
}

// Свойства оружия без параметров. Метательное, Боеприпас и Универсальное несут параметры
// и лежат своими полями.
export const WEAPON_FLAGS = [
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'twoHanded',
] as const;
export type WeaponFlag = (typeof WEAPON_FLAGS)[number];

export const WEAPON_MASTERIES = [
  'cleave',
  'graze',
  'nick',
  'push',
  'sap',
  'slow',
  'topple',
  'vex',
] as const;
export type WeaponMastery = (typeof WEAPON_MASTERIES)[number];

// Боеприпасы из таблицы книги; пули для огнестрела и для пращи — разные.
export const AMMUNITION_KINDS = [
  'arrow',
  'bolt',
  'firearmBullet',
  'slingBullet',
  'needle',
] as const;
export type AmmunitionKind = (typeof AMMUNITION_KINDS)[number];

export const WEAPON_ATTACK_TYPES = ['melee', 'ranged'] as const;
export type WeaponAttackType = (typeof WEAPON_ATTACK_TYPES)[number];

// Дистанция в футах: обычная и наибольшая («дист. 80/320»). Кратна 5: клетка карты — 5 фт.
export const WEAPON_RANGE_MAX = 1000;
export interface WeaponRange {
  normal: number;
  long: number;
}

// Урон оружия. die: null — урон числом без кубика: у духовой трубки «1 колющий».
export const WEAPON_DICE_MAX = 10;
export interface WeaponDamage {
  count: number;
  die: DamageDie | null;
  type: DamageType;
}

// Урон Универсального оружия двумя руками — тем же типом, что основной.
export interface WeaponDice {
  count: number;
  die: DamageDie;
}

export interface WeaponItemDetails extends EquipmentMagic {
  // Образец из книги: из него форма заполнила поля, по нему же считается владение.
  // null — своё оружие без образца.
  base: Weapon | null;
  weaponCategory: WeaponCategory;
  attackType: WeaponAttackType;
  damage: WeaponDamage;
  // Без повторов, в порядке WEAPON_FLAGS.
  properties: WeaponFlag[];
  thrown: WeaponRange | null;
  ammunition: (WeaponRange & { kind: AmmunitionKind }) | null;
  versatile: WeaponDice | null;
  mastery: WeaponMastery | null;
  magicBonus: number;
}

export const ARMOR_KINDS = ['light', 'medium', 'heavy'] as const;
export type ArmorKind = (typeof ARMOR_KINDS)[number];

// Доспехи из таблицы книги 2024.
export const BOOK_ARMOR = [
  'padded',
  'leather',
  'studdedLeather',
  'hide',
  'chainShirt',
  'scaleMail',
  'breastplate',
  'halfPlate',
  'ringMail',
  'chainMail',
  'splint',
  'plate',
] as const;
export type BookArmor = (typeof BOOK_ARMOR)[number];

// Сколько Ловкости добавляет доспех — следует из вида, своего поля нет: лёгкий —
// полностью, средний — не больше 2, тяжёлый — нисколько.
export const ARMOR_DEX_CAP: Record<ArmorKind, number | null> = {
  light: null,
  medium: 2,
  heavy: 0,
};

export const ARMOR_CLASS_MAX = 30;
export const ARMOR_STRENGTH_MAX = 30;

export interface ArmorItemDetails extends EquipmentMagic {
  base: BookArmor | null;
  kind: ArmorKind;
  // Базовый КД доспеха без Ловкости: 11 у кожаного, 16 у кольчужного.
  armorClass: number;
  // Нужная Сила, иначе скорость −10 фт. null — требования нет.
  strength: number | null;
  stealthDisadvantage: boolean;
  magicBonus: number;
}

export const SHIELD_BONUS_MAX = 10;

export interface ShieldItemDetails extends EquipmentMagic {
  // Прибавка к КД: у щита книги +2.
  armorClass: number;
  magicBonus: number;
}

// Места одежды и украшений на кукле — как слоты Baldur's Gate 3 (решено с пользователем
// 2026-10-26). «Тело» — одежда вместо доспеха, в тот же слот.
export const WEAR_SLOTS = [
  'head',
  'cloak',
  'body',
  'hands',
  'feet',
  'amulet',
  'ring',
] as const;
export type WearSlot = (typeof WEAR_SLOTS)[number];

export interface WearableItemDetails extends EquipmentMagic {
  slot: WearSlot;
}
