import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { InventoryEntry } from 'shared';
import { assertOwnedCharacter } from '../../character-images/character-image-access.js';
import { DatabaseService } from '../../database/database.service.js';
import { characterItems, items } from '../../database/schema/index.js';
import { visibleItem } from '../../items/item-access.js';
import {
  AddInventoryItemDto,
  UpdateInventoryEntryDto,
} from './dto/inventory.dto.js';
import { findEditableEntry, findEntryAt } from './inventory-entries.js';
import { loadInventory } from './inventory-loader.js';
import {
  INVENTORY_ENTRY_NOT_FOUND,
  INVENTORY_ITEM_NOT_FOUND,
  INVENTORY_QUANTITY_LIMIT,
  isCheckViolation,
  planEntryChange,
} from './inventory.rules.js';

// Инвентарь персонажа (docs/plan/character-inventory.md). Меняет только автор персонажа,
// отдельно от листа: каждая правка отдаёт инвентарь целиком.
@Injectable()
export class InventoryService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(InventoryService.name)
    private readonly logger: PinoLogger,
  ) {}

  async add(
    userId: string,
    characterId: string,
    dto: AddInventoryItemDto,
  ): Promise<InventoryEntry[]> {
    const t0 = Date.now();
    const log = { userId, characterId, itemId: dto.itemId };
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: false,
        });
        // Положить можно только то, что видишь сам: чужой скрытый неотличим от несуществующего.
        const [item] = await tx
          .select({ id: items.id })
          .from(items)
          .where(visibleItem(userId, dto.itemId))
          .limit(1);
        if (!item) throw new BadRequestException(INVENTORY_ITEM_NOT_FOUND);
        // Повтор в том же месте прибавляется к строке атомарно: два быстрых клика не
        // упрутся в уникальность. Перебор лимита ловит check-ограничение.
        await tx
          .insert(characterItems)
          .values({ characterId, ...dto })
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
      this.logger.info(
        { ...log, durationMs: Date.now() - t0, quantity: dto.quantity },
        'Inventory item added',
      );
      return await this.inventoryOf(userId, characterId);
    } catch (err: unknown) {
      if (isCheckViolation(err, 'character_items_quantity')) {
        throw new BadRequestException(INVENTORY_QUANTITY_LIMIT);
      }
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Inventory item add failed',
      );
      throw err;
    }
  }

  async update(
    userId: string,
    characterId: string,
    entryId: string,
    dto: UpdateInventoryEntryDto,
  ): Promise<InventoryEntry[]> {
    const t0 = Date.now();
    const log = { userId, characterId, entryId };
    try {
      const kind = await this.databaseService.db.transaction(async (tx) => {
        // Блокировка персонажа: перенос со сложением читает соседнюю строку и не должен
        // гоняться с другой правкой того же инвентаря.
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: true,
        });
        const entry = await findEditableEntry(tx, userId, characterId, entryId);
        const target =
          dto.location && dto.location !== entry.location
            ? await findEntryAt(tx, characterId, entry.itemId, dto.location)
            : null;
        const change = planEntryChange(entry, dto, target);
        if ('error' in change) throw new BadRequestException(change.error);
        if (change.kind === 'merge') {
          await tx
            .update(characterItems)
            .set({ quantity: change.quantity })
            .where(eq(characterItems.id, change.targetId));
          await tx.delete(characterItems).where(eq(characterItems.id, entryId));
        } else {
          await tx
            .update(characterItems)
            .set({ quantity: change.quantity, location: change.location })
            .where(eq(characterItems.id, entryId));
        }
        return change.kind;
      });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0, kind },
        'Inventory entry changed',
      );
      return await this.inventoryOf(userId, characterId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Inventory entry change failed',
      );
      throw err;
    }
  }

  // Убрать можно любую строку, и скрытую, и удалённую автором.
  async remove(
    userId: string,
    characterId: string,
    entryId: string,
  ): Promise<InventoryEntry[]> {
    const t0 = Date.now();
    const log = { userId, characterId, entryId };
    try {
      await this.databaseService.db.transaction(async (tx) => {
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: false,
        });
        const [row] = await tx
          .delete(characterItems)
          .where(
            and(
              eq(characterItems.id, entryId),
              eq(characterItems.characterId, characterId),
            ),
          )
          .returning({ id: characterItems.id });
        if (!row) throw new NotFoundException(INVENTORY_ENTRY_NOT_FOUND);
      });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0 },
        'Inventory entry removed',
      );
      return await this.inventoryOf(userId, characterId);
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        'Inventory entry removal failed',
      );
      throw err;
    }
  }

  private async inventoryOf(userId: string, characterId: string) {
    const t0 = Date.now();
    const inventory = await loadInventory(
      this.databaseService.db,
      userId,
      characterId,
    );
    this.logger.debug(
      {
        durationMs: Date.now() - t0,
        userId,
        characterId,
        count: inventory.length,
      },
      'Inventory loaded',
    );
    return inventory;
  }
}
