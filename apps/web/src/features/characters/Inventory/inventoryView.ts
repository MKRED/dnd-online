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
