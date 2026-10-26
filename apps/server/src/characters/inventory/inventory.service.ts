import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { InventoryEntry, InventoryLocation } from 'shared';
import { assertOwnedCharacter } from '../../character-images/character-image-access.js';
import { assertSheetUnlocked } from '../../games/sheet-lock.js';
import { DatabaseService } from '../../database/database.service.js';
import { characterItems, items } from '../../database/schema/index.js';
import { visibleItem } from '../../items/item-access.js';
import {
  AddInventoryItemDto,
  MoveInventoryEntryDto,
  UpdateInventoryEntryDto,
} from './dto/inventory.dto.js';
import {
  applyEntryChange,
  findEditableEntry,
  findEntryAt,
} from './inventory-entries.js';
import { pruneEquipment } from '../equipment/equipment-prune.js';
import { loadInventory } from './inventory-loader.js';
import { rowsToAdd } from './inventory-unpack.js';
import {
  INVENTORY_ENTRY_NOT_FOUND,
  INVENTORY_ITEM_NOT_FOUND,
  INVENTORY_QUANTITY_LIMIT,
  isCheckViolation,
  planEntryChange,
  planMove,
  type EntryChange,
} from './inventory.rules.js';

// Инвентарь персонажа (docs/plan/done/character-inventory.md). Меняет только автор персонажа,
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
        // Блокировка — как у переноса: иначе перенос и добавление того же предмета в то
        // же место разойдутся и упрутся в уникальность строки.
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: true,
        });
        await assertSheetUnlocked(tx, characterId);
        // Положить можно только то, что видишь сам: чужой скрытый неотличим от несуществующего.
        const [item] = await tx
          .select({ id: items.id, category: items.category })
          .from(items)
          .where(visibleItem(userId, dto.itemId))
          .limit(1);
        if (!item) throw new BadRequestException(INVENTORY_ITEM_NOT_FOUND);
        const rows = await rowsToAdd(tx, userId, item, dto);
        const addedAt = Date.now();
        // Повтор в том же месте прибавляется к строке атомарно: два быстрых клика не
        // упрутся в уникальность. Перебор лимита ловит check-ограничение. В составе
        // набора предмет встречается один раз, поэтому строки одной вставки не спорят.
        await tx
          .insert(characterItems)
          .values(
            // Время с шагом в миллисекунду держит порядок состава набора: defaultNow()
            // дал бы всем строкам одной транзакции одно время.
            rows.map((row, index) => ({
              characterId,
              location: dto.location,
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
      this.logger.info(
        {
          ...log,
          durationMs: Date.now() - t0,
          quantity: dto.quantity,
          unpack: dto.unpack ?? false,
        },
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

  update(
    userId: string,
    characterId: string,
    entryId: string,
    dto: UpdateInventoryEntryDto,
  ): Promise<InventoryEntry[]> {
    return this.changeEntry(
      userId,
      characterId,
      entryId,
      dto.location,
      (entry, target) => planEntryChange(entry, dto, target),
    );
  }

  // Переложить часть стопки (или всю) в другое место одной операцией.
  move(
    userId: string,
    characterId: string,
    entryId: string,
    dto: MoveInventoryEntryDto,
  ): Promise<InventoryEntry[]> {
    return this.changeEntry(
      userId,
      characterId,
      entryId,
      dto.location,
      (entry, target) => planMove(entry, dto, target),
    );
  }

  // Общая часть правки и переноса. targetLocation — куда может лечь строка: там ищем
  // строку того же предмета для сложения.
  private async changeEntry(
    userId: string,
    characterId: string,
    entryId: string,
    targetLocation: InventoryLocation | undefined,
    plan: (
      entry: { quantity: number; location: InventoryLocation },
      target: { id: string; quantity: number } | null,
    ) => EntryChange | { error: string },
  ): Promise<InventoryEntry[]> {
    const t0 = Date.now();
    const log = { userId, characterId, entryId };
    try {
      const result = await this.databaseService.db.transaction(async (tx) => {
        // Блокировка персонажа: перенос со сложением читает соседнюю строку и не должен
        // гоняться с другой правкой того же инвентаря.
        await assertOwnedCharacter(tx, userId, characterId, {
          forUpdate: true,
        });
        await assertSheetUnlocked(tx, characterId);
        const entry = await findEditableEntry(tx, userId, characterId, entryId);
        const target =
          targetLocation && targetLocation !== entry.location
            ? await findEntryAt(tx, characterId, entry.itemId, targetLocation)
            : null;
        const change = plan(entry, target);
        if ('error' in change) throw new BadRequestException(change.error);
        await applyEntryChange(tx, entry, change);
        // Вещь ушла в хранилище или её стало меньше — кукла её отпускает.
        const unequipped = await pruneEquipment(tx, characterId);
        return { kind: change.kind, unequipped };
      });
      this.logger.info(
        { ...log, durationMs: Date.now() - t0, ...result },
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
        await assertSheetUnlocked(tx, characterId);
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
