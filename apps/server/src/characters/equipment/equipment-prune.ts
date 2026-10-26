import { and, eq, inArray } from 'drizzle-orm';
import { slotsToPrune } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  characterEquipment,
  characterItems,
} from '../../database/schema/index.js';

// Снять с куклы то, что правка инвентаря у неё отняла: вещь ушла в хранилище или её
// стало меньше, чем мест. Удалённая строка снимается сама (каскад). Возвращает, сколько
// мест освободилось.
export async function pruneEquipment(
  tx: DbTransaction,
  characterId: string,
): Promise<number> {
  const rows = await tx
    .select({
      slot: characterEquipment.slot,
      entryId: characterEquipment.entryId,
      location: characterItems.location,
      quantity: characterItems.quantity,
    })
    .from(characterEquipment)
    .innerJoin(
      characterItems,
      eq(characterItems.id, characterEquipment.entryId),
    )
    .where(eq(characterEquipment.characterId, characterId));
  const slots = slotsToPrune(
    rows,
    rows.map((r) => ({
      id: r.entryId,
      location: r.location,
      quantity: r.quantity,
    })),
  );
  if (slots.length === 0) return 0;
  await tx
    .delete(characterEquipment)
    .where(
      and(
        eq(characterEquipment.characterId, characterId),
        inArray(characterEquipment.slot, slots),
      ),
    );
  return slots.length;
}
