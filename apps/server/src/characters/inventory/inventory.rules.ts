import {
  INVENTORY_MAX_QUANTITY,
  type InventoryEntryPatch,
  type InventoryLocation,
} from 'shared';

export const INVENTORY_ENTRY_NOT_FOUND = 'Строка инвентаря не найдена';
export const INVENTORY_ITEM_NOT_FOUND = 'Предмет не найден';
export const INVENTORY_ENTRY_LOCKED =
  'Предмет скрыт или удалён автором — его можно только убрать';
export const INVENTORY_NOTHING_TO_CHANGE = 'Нечего менять';
export const INVENTORY_QUANTITY_LIMIT = `В одной строке — не больше ${INVENTORY_MAX_QUANTITY} шт.`;

interface Place {
  quantity: number;
  location: InventoryLocation;
}

// Что сделать со строкой: поменять её саму или влить в строку того же предмета в новом
// месте (одна строка на предмет в месте) — тогда исходная строка удаляется.
export type EntryChange =
  | { kind: 'update'; quantity: number; location: InventoryLocation }
  | { kind: 'merge'; targetId: string; quantity: number };

// target — строка того же предмета в новом месте, если она есть.
export function planEntryChange(
  entry: Place,
  patch: InventoryEntryPatch,
  target: { id: string; quantity: number } | null,
): EntryChange | { error: string } {
  if (patch.quantity === undefined && patch.location === undefined) {
    return { error: INVENTORY_NOTHING_TO_CHANGE };
  }
  const quantity = patch.quantity ?? entry.quantity;
  const location = patch.location ?? entry.location;
  if (location === entry.location || !target) {
    return { kind: 'update', quantity, location };
  }
  const merged = target.quantity + quantity;
  if (merged > INVENTORY_MAX_QUANTITY) {
    return { error: INVENTORY_QUANTITY_LIMIT };
  }
  return { kind: 'merge', targetId: target.id, quantity: merged };
}

// Postgres: нарушено check-ограничение (сложение при повторном добавлении перевалило за
// лимит). Drizzle кладёт ошибку драйвера в `cause`.
export function isCheckViolation(err: unknown, constraint: string): boolean {
  const matches = (e: unknown) => {
    const pg = e as { code?: unknown; constraint?: unknown } | null | undefined;
    return pg?.code === '23514' && pg.constraint === constraint;
  };
  return (
    matches(err) ||
    matches((err as { cause?: unknown } | null | undefined)?.cause)
  );
}
