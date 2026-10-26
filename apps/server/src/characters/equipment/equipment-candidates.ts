import type { AttuneCandidate, InventoryEntry, WornItem } from 'shared';

// Строки инвентаря глазами владельца — в виде, который ждут правила куклы.

export function asCandidate(entry: InventoryEntry): AttuneCandidate {
  return {
    id: entry.id,
    location: entry.location,
    quantity: entry.quantity,
    // Скрытый от владельца предмет на существо не действует — и не надевается.
    equip: entry.item && !entry.inactive ? entry.item.equip : null,
    itemId: entry.item?.id ?? null,
    attuned: entry.attuned,
  };
}

export function wornOf(inventory: readonly InventoryEntry[]): WornItem[] {
  return inventory.flatMap((entry) =>
    entry.equipped.map((slot) => ({
      slot,
      entryId: entry.id,
      twoHanded: entry.item?.equip?.twoHanded ?? false,
    })),
  );
}
