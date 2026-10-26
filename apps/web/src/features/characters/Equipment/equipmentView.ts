import {
  ATTUNEMENT_MAX,
  MAIN_HAND_OF,
  OFF_HAND_OF,
  type EquipSlot,
  type InventoryEntry,
  type InventoryItemCard,
} from 'shared';

// Подписи и выборки для куклы на листе (docs/plan/equipment.md, этап 2, вариант А).

// Подпись места на кукле: группа («Ближний бой») видна рядом.
export const SLOT_LABELS: Record<EquipSlot, string> = {
  head: 'Голова',
  cloak: 'Плащ',
  body: 'Тело',
  hands: 'Руки',
  feet: 'Ноги',
  amulet: 'Амулет',
  ring1: 'Кольцо',
  ring2: 'Кольцо',
  meleeMain: 'Основная рука',
  meleeOff: 'Вторая рука',
  rangedMain: 'Основная рука',
  rangedOff: 'Вторая рука',
};

// Место вне куклы, где группы не видно: в инвентаре и его меню.
export const SLOT_FULL_NAMES: Record<EquipSlot, string> = {
  head: 'голова',
  cloak: 'плащ',
  body: 'тело',
  hands: 'руки',
  feet: 'ноги',
  amulet: 'амулет',
  ring1: 'кольцо 1',
  ring2: 'кольцо 2',
  meleeMain: 'основная рука, ближний бой',
  meleeOff: 'вторая рука, ближний бой',
  rangedMain: 'основная рука, дальний бой',
  rangedOff: 'вторая рука, дальний бой',
};

// Раскладка куклы: слева одежда, справа украшения, под центром — оружие по наборам.
export const LEFT_SLOTS = ['head', 'cloak', 'body', 'hands', 'feet'] as const;
export const RIGHT_SLOTS = ['amulet', 'ring1', 'ring2'] as const;
export const WEAPON_SETS = [
  { label: 'Ближний бой', main: 'meleeMain', off: 'meleeOff' },
  { label: 'Дальний бой', main: 'rangedMain', off: 'rangedOff' },
] as const;

type WithItem = InventoryEntry & { item: InventoryItemCard };

// Что надето на каждом месте.
export function wornBySlot(
  inventory: readonly InventoryEntry[],
): Map<EquipSlot, WithItem> {
  const result = new Map<EquipSlot, WithItem>();
  for (const entry of inventory) {
    if (!entry.item) continue;
    for (const slot of entry.equipped) result.set(slot, entry);
  }
  return result;
}

// Что можно надеть на место: вещи «При себе», которые на него подходят. Скрытые от
// владельца на персонажа не действуют и не надеваются.
export function candidatesFor(
  inventory: readonly InventoryEntry[],
  slot: EquipSlot,
): WithItem[] {
  return inventory.filter(
    (entry): entry is WithItem =>
      entry.location === 'carried' &&
      entry.item !== null &&
      !entry.inactive &&
      (entry.item.equip?.slots.includes(slot) ?? false) &&
      !entry.equipped.includes(slot) &&
      // Вся стопка уже надета: переезжает только единственная вещь.
      (entry.quantity === 1 || entry.equipped.length < entry.quantity),
  );
}

// Основная рука держит двуручное — вторая рука того же набора занята им.
export function holdsTwoHanded(
  worn: ReadonlyMap<EquipSlot, WithItem>,
  slot: EquipSlot,
): boolean {
  return worn.get(slot)?.item.equip?.twoHanded ?? false;
}

// Почему место нельзя занять сейчас: вторая рука при двуручном в основной.
export function blockedBy(
  worn: ReadonlyMap<EquipSlot, WithItem>,
  slot: EquipSlot,
): WithItem | null {
  const main = MAIN_HAND_OF[slot];
  return main && holdsTwoHanded(worn, main) ? (worn.get(main) ?? null) : null;
}

// Двуручное в основной снимет вторую руку — это стоит сказать до того, как нажали.
export function displaces(
  worn: ReadonlyMap<EquipSlot, WithItem>,
  entry: WithItem,
  slot: EquipSlot,
): WithItem | null {
  const off = OFF_HAND_OF[slot];
  if (!off || !entry.item.equip?.twoHanded) return null;
  return worn.get(off) ?? null;
}

export const attunedCount = (inventory: readonly InventoryEntry[]) =>
  inventory.filter((entry) => entry.attuned).length;

export const attunementLine = (inventory: readonly InventoryEntry[]) =>
  `Настроено ${attunedCount(inventory)} из ${ATTUNEMENT_MAX}`;

// Есть ли что показать зрителю без права правки: кукла без вещей ему не нужна.
export const anythingWorn = (inventory: readonly InventoryEntry[]) =>
  inventory.some((entry) => entry.equipped.length > 0 || entry.attuned);
