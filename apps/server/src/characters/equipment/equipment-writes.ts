import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  attuneProblem,
  planEquip,
  type EquipSlot,
  type InventoryEntry,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  characterEquipment,
  characterItems,
} from '../../database/schema/index.js';
import { INVENTORY_ENTRY_NOT_FOUND } from '../inventory/inventory.rules.js';
import { asCandidate, wornOf } from './equipment-candidates.js';

// Правки куклы по правилам shared — общие для листа (EquipmentService) и игры
// (games/characters/game-character-equipment.ts). Права, замки и журнал — у вызывающего;
// inventory — инвентарь до правки глазами владельца.

export async function applyEquip(
  tx: DbTransaction,
  characterId: string,
  inventory: readonly InventoryEntry[],
  slot: EquipSlot,
  entryId: string,
): Promise<{ freed: EquipSlot[] }> {
  const entry = findEntry(inventory, entryId);
  const plan = planEquip(wornOf(inventory), asCandidate(entry), slot);
  if ('error' in plan) throw new BadRequestException(plan.error);
  if (plan.freed.length > 0) {
    await tx
      .delete(characterEquipment)
      .where(
        and(
          eq(characterEquipment.characterId, characterId),
          inArray(characterEquipment.slot, plan.freed),
        ),
      );
  }
  await tx
    .insert(characterEquipment)
    .values({ characterId, slot, entryId })
    .onConflictDoUpdate({
      target: [characterEquipment.characterId, characterEquipment.slot],
      set: { entryId },
    });
  return { freed: plan.freed };
}

// Пустое место — не ошибка: вторая вкладка могла снять раньше.
export async function applyUnequip(
  tx: DbTransaction,
  characterId: string,
  slot: EquipSlot,
): Promise<void> {
  await tx
    .delete(characterEquipment)
    .where(
      and(
        eq(characterEquipment.characterId, characterId),
        eq(characterEquipment.slot, slot),
      ),
    );
}

// Снять настройку можно всегда, даже со скрытого автором предмета: это не добавляет ему
// силы.
export async function applyAttune(
  tx: DbTransaction,
  inventory: readonly InventoryEntry[],
  entryId: string,
  attuned: boolean,
): Promise<void> {
  const entry = findEntry(inventory, entryId);
  if (attuned) {
    const problem = attuneProblem(
      inventory.map(asCandidate),
      asCandidate(entry),
    );
    if (problem) throw new BadRequestException(problem);
  }
  await tx
    .update(characterItems)
    .set({ attuned })
    .where(eq(characterItems.id, entryId));
}

export function findEntry(
  inventory: readonly InventoryEntry[],
  entryId: string,
): InventoryEntry {
  const entry = inventory.find((e) => e.id === entryId);
  if (!entry) throw new NotFoundException(INVENTORY_ENTRY_NOT_FOUND);
  return entry;
}
