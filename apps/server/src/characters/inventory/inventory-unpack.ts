import { BadRequestException } from '@nestjs/common';
import { and, asc, eq, or } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import { itemPackEntries, items } from '../../database/schema/index.js';
import {
  INVENTORY_NOT_A_PACK,
  INVENTORY_PACK_EMPTY,
} from './inventory.rules.js';

export interface RowToAdd {
  itemId: string;
  quantity: number;
}

// Что положить при добавлении: сам предмет или, при распаковке, состав набора с
// количеством × число наборов (docs/plan/character-inventory.md). Скрытые от игрока
// предметы состава не кладём: он их не видит — значит, и положить не может.
export async function rowsToAdd(
  tx: DbTransaction,
  userId: string,
  item: { id: string; category: string },
  { quantity, unpack }: { quantity: number; unpack?: boolean },
): Promise<RowToAdd[]> {
  if (!unpack) return [{ itemId: item.id, quantity }];
  if (item.category !== 'pack') {
    throw new BadRequestException(INVENTORY_NOT_A_PACK);
  }
  const contents = await tx
    .select({
      itemId: itemPackEntries.itemId,
      quantity: itemPackEntries.quantity,
    })
    .from(itemPackEntries)
    .innerJoin(items, eq(items.id, itemPackEntries.itemId))
    .where(
      and(
        eq(itemPackEntries.packId, item.id),
        or(eq(items.authorId, userId), eq(items.isPublic, true)),
      ),
    )
    .orderBy(asc(itemPackEntries.position));
  if (contents.length === 0) {
    throw new BadRequestException(INVENTORY_PACK_EMPTY);
  }
  return contents.map((entry) => ({
    itemId: entry.itemId,
    quantity: entry.quantity * quantity,
  }));
}
