import type { InventoryEntry, InventoryLocation, Item } from 'shared';

export const LOCATION_LABELS: Record<InventoryLocation, string> = {
  carried: 'При себе',
  stash: 'Хранилище',
};

// Куда перекладывает кнопка ⇄ и как она подписана.
export const OTHER_LOCATION: Record<InventoryLocation, InventoryLocation> = {
  carried: 'stash',
  stash: 'carried',
};
export const MOVE_LABELS: Record<InventoryLocation, string> = {
  carried: 'В хранилище',
  stash: 'Взять с собой',
};

export function byLocation(
  entries: readonly InventoryEntry[],
  location: InventoryLocation,
): InventoryEntry[] {
  return entries.filter((entry) => entry.location === location);
}

// Вес строки — вес предмета × количество, в сотых, как груз (carriedLoad).
export function entryWeight(entry: InventoryEntry): number {
  if (!entry.item) return 0;
  return (Math.round(entry.item.weight * 100) * entry.quantity) / 100;
}

export function entryName(entry: InventoryEntry): string {
  if (entry.item) return entry.item.name;
  return entry.missing === 'hidden'
    ? 'Предмет скрыт автором'
    : 'Предмет удалён автором';
}

// Что можно положить: свои (и скрытые) и опубликованные чужие. Наборы тоже — пока целиком
// (распаковка — этап 3 docs/plan/character-inventory.md). Свои опубликованные есть в обоих
// списках, поэтому чужие берём из каталога по автору.
export function inventoryCandidates(
  mine: Item[],
  catalog: Item[],
  userId: string,
): { mine: Item[]; others: Item[] } {
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, 'ru');
  return {
    mine: [...mine].sort(byName),
    others: catalog.filter((item) => item.authorId !== userId).sort(byName),
  };
}

// «1 предмет», «3 предмета», «8 предметов».
export function itemsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} предмет`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} предмета`;
  }
  return `${count} предметов`;
}

export interface PackOptions {
  // Целиком: одна строка, вес из карточки набора.
  wholeWeight: number;
  // Распаковать: строки состава, которые видит игрок, и их вес; свой вес набора не нужен.
  unpackedRows: number;
  unpackedWeight: number;
  // Скрытые автором предметы состава — их не положить.
  hiddenCount: number;
}

// Что даст набор при добавлении count штук (docs/plan/character-inventory.md). Вес — в
// сотых, как груз.
export function packOptions(
  pack: Extract<Item, { category: 'pack' }>,
  count: number,
): PackOptions {
  let hundredths = 0;
  let unpackedRows = 0;
  let hiddenCount = 0;
  for (const entry of pack.details.contents) {
    if (!entry.item) {
      hiddenCount += 1;
      continue;
    }
    unpackedRows += 1;
    hundredths += Math.round(entry.item.weight * 100) * entry.quantity * count;
  }
  return {
    wholeWeight: (Math.round(pack.weight * 100) * count) / 100,
    unpackedRows,
    unpackedWeight: hundredths / 100,
    hiddenCount,
  };
}
