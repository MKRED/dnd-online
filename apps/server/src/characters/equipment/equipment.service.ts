import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  attuneProblem,
  planEquip,
  type EquipSlot,
  type InventoryEntry,
} from 'shared';
import { assertOwnedCharacter } from '../../character-images/character-image-access.js';
import {
  DatabaseService,
  type DbTransaction,
} from '../../database/database.service.js';
import {
  characterEquipment,
  characterItems,
} from '../../database/schema/index.js';
import { assertSheetUnlocked } from '../../games/sheet-lock.js';
import { loadInventory } from '../inventory/inventory-loader.js';
import { INVENTORY_ENTRY_NOT_FOUND } from '../inventory/inventory.rules.js';
import { asCandidate, wornOf } from './equipment-candidates.js';

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
      async (tx, inventory) => {
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
      },
    );
  }

  // Снять с места; пустое место — не ошибка: вторая вкладка могла снять раньше.
  unequip(userId: string, characterId: string, slot: EquipSlot) {
    return this.change(
      'Item unequipped',
      { userId, characterId, slot },
      async (tx) => {
        await tx
          .delete(characterEquipment)
          .where(
            and(
              eq(characterEquipment.characterId, characterId),
              eq(characterEquipment.slot, slot),
            ),
          );
        return {};
      },
    );
  }

  // Настроиться на предмет строки или снять настройку. Снять можно всегда, даже со
  // скрытого автором предмета: это не добавляет ему силы.
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

function findEntry(inventory: readonly InventoryEntry[], entryId: string) {
  const entry = inventory.find((e) => e.id === entryId);
  if (!entry) throw new NotFoundException(INVENTORY_ENTRY_NOT_FOUND);
  return entry;
}
