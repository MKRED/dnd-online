import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { InventoryLocation } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { characterItems, items } from '../../database/schema/index.js';
import {
  INVENTORY_ENTRY_LOCKED,
  INVENTORY_ENTRY_NOT_FOUND,
  type EntryChange,
} from './inventory.rules.js';

// Чтение и запись строк инвентаря внутри транзакции правки. Владельца персонажа
// проверяет сервис.

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

// Применить спланированное изменение строки (planEntryChange, planMove).
export async function applyEntryChange(
  tx: DbTransaction,
  entry: { id: string; characterId: string; itemId: string; attuned: boolean },
  change: EntryChange,
): Promise<void> {
  if (change.kind === 'update') {
    await tx
      .update(characterItems)
      .set({ quantity: change.quantity, location: change.location })
      .where(eq(characterItems.id, entry.id));
    return;
  }
  if (change.kind === 'merge') {
    // Настройка едет вместе с вещью: на две копии одного предмета её не бывает
    // (attuneProblem), так что сложение её не удваивает.
    await tx
      .update(characterItems)
      .set({
        quantity: change.quantity,
        ...(entry.attuned ? { attuned: true } : {}),
      })
      .where(eq(characterItems.id, change.targetId));
    await tx.delete(characterItems).where(eq(characterItems.id, entry.id));
    return;
  }
  await tx
    .update(characterItems)
    .set({ quantity: change.remaining })
    .where(eq(characterItems.id, entry.id));
  if (change.targetId) {
    await tx
      .update(characterItems)
      .set({ quantity: change.quantity })
      .where(eq(characterItems.id, change.targetId));
  } else {
    await tx.insert(characterItems).values({
      characterId: entry.characterId,
      itemId: entry.itemId,
      location: change.location,
      quantity: change.quantity,
    });
  }
}
