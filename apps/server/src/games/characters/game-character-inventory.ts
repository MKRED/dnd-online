import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  GAME_INVENTORY_MASTER_ONLY,
  GAME_INVENTORY_NOT_PUBLIC,
  type GameInventoryChange,
} from 'shared';
import { pruneEquipment } from '../../characters/equipment/equipment-prune.js';
import {
  applyEntryChange,
  findEditableEntry,
  findEntryAt,
} from '../../characters/inventory/inventory-entries.js';
import { rowsToAdd } from '../../characters/inventory/inventory-unpack.js';
import {
  INVENTORY_ENTRY_NOT_FOUND,
  INVENTORY_ITEM_NOT_FOUND,
  INVENTORY_QUANTITY_LIMIT,
  isCheckViolation,
  planEntryChange,
  planMove,
} from '../../characters/inventory/inventory.rules.js';
import type { DbTransaction } from '../../database/database.service.js';
import {
  characterItems,
  characters,
  items,
} from '../../database/schema/index.js';
import { visibleItem } from '../../items/item-access.js';
import { appendGameEvent } from '../game-journal.js';
import { actingAs, type SeatedCharacter } from './game-character-access.js';
import type { CharacterActor } from './game-character-state.js';

type EventItem = { id: string; name: string } | null;

// Инвентарь героя глазами мастера в игре (docs/plan/gm-items.md, этап 1): те же правила
// строк, что на листе (inventory.rules.ts), но правит мастер, и закрытость листа на время
// встречи его не держит — ради этого правка и живёт под игрой. Класть можно только
// опубликованное: игрок видит предмет на своём листе по общим правилам (toItemLink).
export async function changeInventory(
  actor: CharacterActor,
  seated: SeatedCharacter,
  change: GameInventoryChange,
): Promise<void> {
  if (actor.userId !== actor.masterId) {
    throw new ForbiddenException(GAME_INVENTORY_MASTER_ONLY);
  }
  const { tx } = actor;
  // Блокировка персонажа после игры, как у куклы: правка со сложением читает соседнюю
  // строку и не должна гоняться с правкой владельца вне встречи.
  await tx
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.id, seated.id))
    .for('update');
  const item =
    change.kind === 'add'
      ? await addItem(tx, actor.userId, seated, change)
      : await changeEntry(tx, seated, change);
  await appendGameEvent(tx, actor.gameId, {
    kind: 'character.inventory',
    actorId: actor.userId,
    as: actingAs(actor.userId, actor.masterId, seated.id),
    intent: { characterId: seated.id, change },
    result: { character: { id: seated.id, name: seated.name }, item },
  });
}

async function addItem(
  tx: DbTransaction,
  masterId: string,
  seated: SeatedCharacter,
  change: Extract<GameInventoryChange, { kind: 'add' }>,
): Promise<EventItem> {
  const [item] = await tx
    .select({
      id: items.id,
      name: items.name,
      category: items.category,
      isPublic: items.isPublic,
    })
    .from(items)
    .where(visibleItem(masterId, change.itemId))
    .limit(1);
  if (!item) throw new BadRequestException(INVENTORY_ITEM_NOT_FOUND);
  if (!item.isPublic) throw new BadRequestException(GAME_INVENTORY_NOT_PUBLIC);
  // Состав набора — глазами владельца героя: скрытое от него он бы не увидел.
  const rows = await rowsToAdd(tx, seated.ownerId, item, change);
  const addedAt = Date.now();
  try {
    // Савепоинт: перебор лимита ловится как 400, а транзакция игры остаётся живой.
    await tx.transaction(async (inner) => {
      await inner
        .insert(characterItems)
        .values(
          rows.map((row, index) => ({
            characterId: seated.id,
            location: change.location,
            addedAt: new Date(addedAt + index),
            ...row,
          })),
        )
        .onConflictDoUpdate({
          target: [
            characterItems.characterId,
            characterItems.itemId,
            characterItems.location,
          ],
          set: {
            quantity: sql`${characterItems.quantity} + excluded.quantity`,
          },
        });
    });
  } catch (err: unknown) {
    if (isCheckViolation(err, 'character_items_quantity')) {
      throw new BadRequestException(INVENTORY_QUANTITY_LIMIT);
    }
    throw err;
  }
  return { id: item.id, name: item.name };
}

async function changeEntry(
  tx: DbTransaction,
  seated: SeatedCharacter,
  change: Exclude<GameInventoryChange, { kind: 'add' }>,
): Promise<EventItem> {
  if (change.kind === 'remove') return removeEntry(tx, seated, change.entryId);
  // Менять строку можно, пока её предмет виден владельцу — как на его листе.
  const entry = await findEditableEntry(
    tx,
    seated.ownerId,
    seated.id,
    change.entryId,
  );
  const target =
    change.kind === 'move' && change.location !== entry.location
      ? await findEntryAt(tx, seated.id, entry.itemId, change.location)
      : null;
  const plan =
    change.kind === 'move'
      ? planMove(entry, change, target)
      : planEntryChange(entry, { quantity: change.quantity }, target);
  if ('error' in plan) throw new BadRequestException(plan.error);
  await applyEntryChange(tx, entry, plan);
  // Вещь ушла в хранилище или её стало меньше — кукла её отпускает.
  await pruneEquipment(tx, seated.id);
  return itemOf(tx, entry.itemId);
}

// Убрать можно любую строку, и скрытую, и удалённую автором — как на листе.
async function removeEntry(
  tx: DbTransaction,
  seated: SeatedCharacter,
  entryId: string,
): Promise<EventItem> {
  const [row] = await tx
    .delete(characterItems)
    .where(
      and(
        eq(characterItems.id, entryId),
        eq(characterItems.characterId, seated.id),
      ),
    )
    .returning({ itemId: characterItems.itemId });
  if (!row) throw new NotFoundException(INVENTORY_ENTRY_NOT_FOUND);
  return row.itemId ? itemOf(tx, row.itemId) : null;
}

// Название для журнала — только у опубликованного: запись видят все игроки, а скрытый
// предмет на чужом листе они видят как «Скрытый предмет».
async function itemOf(tx: DbTransaction, itemId: string): Promise<EventItem> {
  const [item] = await tx
    .select({ id: items.id, name: items.name, isPublic: items.isPublic })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  return item?.isPublic ? { id: item.id, name: item.name } : null;
}
