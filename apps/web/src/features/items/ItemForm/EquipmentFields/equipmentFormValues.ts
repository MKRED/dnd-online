import {
  BOOK_ARMOR_STATS,
  BOOK_SHIELD,
  type ArmorItemDetails,
  type ArmorKind,
  type BookArmor,
  type EquipmentCategory,
  type Item,
  type ItemInputVariant,
  type WearSlot,
} from 'shared';
import {
  EMPTY_WEAPON,
  weaponToDetails,
  weaponToForm,
  type WeaponFormValues,
} from './weaponFormValues';

export interface ArmorFormValues {
  base: BookArmor | null;
  kind: ArmorKind;
  armorClass: number | string;
  // Пусто — требования Силы нет.
  strength: number | string;
  stealthDisadvantage: boolean;
}

// Поля экипировки в форме предмета. Бонус магии и настройка общие: при смене категории
// внутри экипировки они не теряются.
export interface EquipmentFormValues {
  weapon: WeaponFormValues;
  armor: ArmorFormValues;
  shieldArmorClass: number | string;
  wearableSlot: WearSlot | null;
  // Строкой для Select: '0'…'3'.
  magicBonus: string;
  attunement: boolean;
}

const EMPTY_ARMOR: ArmorFormValues = {
  base: null,
  kind: 'light',
  armorClass: '',
  strength: '',
  stealthDisadvantage: false,
};

export function armorFromBook(base: BookArmor): ArmorFormValues {
  const { kind, armorClass, strength, stealthDisadvantage } =
    BOOK_ARMOR_STATS[base];
  return {
    base,
    kind,
    armorClass,
    strength: strength ?? '',
    stealthDisadvantage,
  };
}

// Чем доспех отличается от своего образца — подсказка под «Образцом».
export function armorBookDifferences(values: ArmorFormValues): string[] {
  if (!values.base) return [];
  const book = armorFromBook(values.base);
  const out: string[] = [];
  if (values.kind !== book.kind) out.push('вид');
  if (Number(values.armorClass) !== book.armorClass) out.push('КД');
  if (String(values.strength) !== String(book.strength)) out.push('Сила');
  if (values.stealthDisadvantage !== book.stealthDisadvantage)
    out.push('Скрытность');
  return out;
}

export function equipmentToForm(item: Item | null): EquipmentFormValues {
  const details = item?.details as Partial<ArmorItemDetails> | undefined;
  return {
    weapon:
      item?.category === 'weapon' ? weaponToForm(item.details) : EMPTY_WEAPON,
    armor:
      item?.category === 'armor'
        ? {
            base: item.details.base,
            kind: item.details.kind,
            armorClass: item.details.armorClass,
            strength: item.details.strength ?? '',
            stealthDisadvantage: item.details.stealthDisadvantage,
          }
        : EMPTY_ARMOR,
    shieldArmorClass:
      item?.category === 'shield'
        ? item.details.armorClass
        : BOOK_SHIELD.armorClass,
    wearableSlot: item?.category === 'wearable' ? item.details.slot : null,
    magicBonus: String(details?.magicBonus ?? 0),
    attunement: details?.attunement ?? false,
  };
}

// Магия — только у предмета с редкостью: у немагического поля скрыты и уходят пустыми.
export function equipmentVariant(
  category: EquipmentCategory,
  values: EquipmentFormValues & { rarity: Item['rarity'] },
): ItemInputVariant {
  const magic = values.rarity !== 'none';
  const magicBonus = magic ? Number(values.magicBonus) : 0;
  const attunement = magic && values.attunement;
  switch (category) {
    case 'weapon':
      return {
        category,
        details: { ...weaponToDetails(values.weapon), magicBonus, attunement },
      };
    case 'armor': {
      const { armor } = values;
      return {
        category,
        details: {
          base: armor.base,
          kind: armor.kind,
          armorClass: Number(armor.armorClass),
          strength: armor.strength === '' ? null : Number(armor.strength),
          stealthDisadvantage: armor.stealthDisadvantage,
          magicBonus,
          attunement,
        },
      };
    }
    case 'shield':
      return {
        category,
        details: {
          armorClass: Number(values.shieldArmorClass),
          magicBonus,
          attunement,
        },
      };
    case 'wearable':
      return {
        category,
        details: { slot: values.wearableSlot ?? 'ring', attunement },
      };
  }
}
