import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { InventoryLocation } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { characterItems, items } from '../../database/schema/index.js';
import {
  INVENTORY_ENTRY_LOCKED,
  INVENTORY_ENTRY_NOT_FOUND,
} from './inventory.rules.js';

// Чтение строк инвентаря внутри транзакции правки. Владельца персонажа проверяет сервис.

// Строку можно менять, только пока её предмет виден автору персонажа.
export async function findEditableEntry(
  tx: DbTransaction,
  userId: string,
  characterId: string,
  entryId: string,
) {
  const [row] = await tx
    .select({ entry: characterItems, item: items })
    .from(characterItems)
    .leftJoin(items, eq(items.id, characterItems.itemId))
    .where(
      and(
        eq(characterItems.id, entryId),
        eq(characterItems.characterId, characterId),
      ),
    )
    .limit(1);
  if (!row) throw new NotFoundException(INVENTORY_ENTRY_NOT_FOUND);
  const { entry, item } = row;
  if (!item || (item.authorId !== userId && !item.isPublic)) {
    throw new BadRequestException(INVENTORY_ENTRY_LOCKED);
  }
  return { ...entry, itemId: item.id };
}

export async function findEntryAt(
  tx: DbTransaction,
  characterId: string,
  itemId: string,
  location: InventoryLocation,
) {
  const [row] = await tx
    .select({ id: characterItems.id, quantity: characterItems.quantity })
    .from(characterItems)
    .where(
      and(
        eq(characterItems.characterId, characterId),
        eq(characterItems.itemId, itemId),
        eq(characterItems.location, location),
      ),
    )
    .limit(1);
  return row ?? null;
}
