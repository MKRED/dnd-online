import { HttpException, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { EquipSlot, InventoryEntry } from 'shared';
import { assertOwnedCharacter } from '../../character-images/character-image-access.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import { assertSheetUnlocked } from '../../games/sheet-lock.js';
import { loadInventory } from '../inventory/inventory-loader.js';
import { applyAttune, applyEquip, applyUnequip } from './equipment-writes.js';

// Кукла и настройка персонажа (docs/plan/equipment.md, этап 2). Меняет только автор
// персонажа и не во время сессии — как инвентарь; каждая правка отдаёт инвентарь целиком,
// надетое и настройка в нём.
@Injectable()
export class EquipmentService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(EquipmentService.name)
    private readonly logger: PinoLogger,
  ) {}

  equip(userId: string, characterId: string, slot: EquipSlot, entryId: string) {
    return this.change(
      'Item equipped',
      { userId, characterId, slot, entryId },
      (tx, inventory) => applyEquip(tx, characterId, inventory, slot, entryId),
    );
  }

  unequip(userId: string, characterId: string, slot: EquipSlot) {
    return this.change(
      'Item unequipped',
      { userId, characterId, slot },
      async (tx) => {
        await applyUnequip(tx, characterId, slot);
        return {};
      },
    );
  }

  // Настроиться на предмет строки или снять настройку.
  attune(
    userId: string,
    characterId: string,
    entryId: string,
    attuned: boolean,
  ) {
    return this.change(
      attuned ? 'Item attuned' : 'Item attunement ended',
      { userId, characterId, entryId },
      async (tx, inventory) => {
        await applyAttune(tx, inventory, entryId, attuned);
        return {};
      },
    );
  }

  // Общая часть правок: владелец, замок сессии, правила по тому, что владелец видит на
  // листе, и инвентарь после правки.
  private async change(
    message: string,
    log: Record<string, unknown> & { userId: string; characterId: string },
    work: (
      tx: DbTransaction,
      inventory: InventoryEntry[],
    ) => Promise<Record<string, unknown>>,
  ): Promise<InventoryEntry[]> {
    const t0 = Date.now();
    const { userId, characterId } = log;
    try {
      const [inventory, details] = await this.databaseService.db.transaction(
        async (tx) => {
          // Блокировка персонажа: две правки куклы читают надетое и не должны разойтись.
          await assertOwnedCharacter(tx, userId, characterId, {
            forUpdate: true,
          });
          await assertSheetUnlocked(tx, characterId);
          const before = await loadInventory(tx, userId, characterId);
          const result = await work(tx, before);
          return [
            await loadInventory(tx, userId, characterId),
            result,
          ] as const;
        },
      );
      this.logger.info(
        { ...log, ...details, durationMs: Date.now() - t0 },
        message,
      );
      return inventory;
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        { err, ...log, durationMs: Date.now() - t0 },
        `${message}: failed`,
      );
      throw err;
    }
  }
}
