import type { ItemVariant } from './items.js';

// Кукла персонажа (docs/plan/equipment.md, этап 2; правила — docs/dnd/weapons-armor.md,
// «Кукла»): места, как в Baldur's Gate 3. Два кольца — два места; оружие — два набора,
// ближний и дальний бой, по две руки в каждом.
export const EQUIP_SLOTS = [
  'head',
  'cloak',
  'body',
  'hands',
  'feet',
  'amulet',
  'ring1',
  'ring2',
  'meleeMain',
  'meleeOff',
  'rangedMain',
  'rangedOff',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

// Настроиться можно не больше чем на три магических предмета (Rules Glossary 2024,
// Attunement). Настройка — у строки инвентаря, а не у места куклы: docs/dnd/weapons-armor.md.
export const ATTUNEMENT_MAX = 3;

// Поля предмета, из которых лист считает числа (этап 3): КД доспеха и щита, атаки оружия.
// У одежды и украшений чисел нет — до способностей и эффектов предметов (этап 5).
export type EquipStats = Extract<
  ItemVariant,
  { category: 'weapon' | 'armor' | 'shield' }
>;

// Что кукле нужно знать о предмете — сжато из details, чтобы карточка строки инвентаря
// оставалась лёгкой. slots — места, куда предмет подходит; twoHanded — занимает обе руки
// своего набора; stats — поля для чисел листа.
export interface ItemEquip {
  slots: EquipSlot[];
  twoHanded: boolean;
  attunement: boolean;
  stats: EquipStats | null;
}

// Места предмета по его категории; не экипировка — null.
export function itemEquip(item: ItemVariant): ItemEquip | null {
  switch (item.category) {
    case 'weapon': {
      const { attackType, properties, attunement } = item.details;
      const twoHanded = properties.includes('twoHanded');
      const [main, off] =
        attackType === 'melee'
          ? (['meleeMain', 'meleeOff'] as const)
          : (['rangedMain', 'rangedOff'] as const);
      // Двуручное во второй руке не держат: оно занимает обе.
      return {
        slots: twoHanded ? [main] : [main, off],
        twoHanded,
        attunement,
        stats: item,
      };
    }
    case 'armor':
      return {
        slots: ['body'],
        twoHanded: false,
        attunement: item.details.attunement,
        stats: item,
      };
    // Щит — вторая рука ближнего боя, как в BG3.
    case 'shield':
      return {
        slots: ['meleeOff'],
        twoHanded: false,
        attunement: item.details.attunement,
        stats: item,
      };
    case 'clothing':
      return {
        slots: [item.details.slot],
        twoHanded: false,
        attunement: item.details.attunement,
        stats: null,
      };
    case 'jewelry':
      return {
        slots: item.details.slot === 'ring' ? ['ring1', 'ring2'] : ['amulet'],
        twoHanded: false,
        attunement: item.details.attunement,
        stats: null,
      };
    default:
      return null;
  }
}

// Вторая рука того же набора: туда не ляжет ничего, пока в основной двуручное.
export const OFF_HAND_OF: Partial<Record<EquipSlot, EquipSlot>> = {
  meleeMain: 'meleeOff',
  rangedMain: 'rangedOff',
};
export const MAIN_HAND_OF: Partial<Record<EquipSlot, EquipSlot>> = {
  meleeOff: 'meleeMain',
  rangedOff: 'rangedMain',
};
