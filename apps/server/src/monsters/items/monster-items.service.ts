import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { MonsterItemEntry } from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { items, monsterItems } from '../../database/schema/index.js';
import { visibleItem } from '../../items/item-access.js';
import { changeMonsterLinks } from '../monster-link-change.js';
import { loadMonsterItems } from './monster-items-loader.js';
import {
  MONSTER_ITEM_ALREADY,
  MONSTER_ITEM_ENTRY_NOT_FOUND,
  MONSTER_ITEM_NOT_FOUND,
} from './monster-items.messages.js';
import {
  AddMonsterItemDto,
  UpdateMonsterItemDto,
} from './dto/monster-item.dto.js';

// Снаряжение монстра (docs/plan/done/monsters-npcs.md, этап 6): один список предметов с
// количеством. Права и ответ — общие для связей монстра (changeMonsterLinks).
@Injectable()
export class MonsterItemsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MonsterItemsService.name)
    private readonly logger: PinoLogger,
  ) {}

  add(userId: string, monsterId: string, dto: AddMonsterItemDto) {
    const log = { userId, monsterId, ...dto };
    return this.change('add', log, async (tx) => {
      // Положить можно только то, что видишь сам: чужой скрытый неотличим от
      // несуществующего. Набор кладётся одним предметом, без распаковки.
      const [item] = await tx
        .select({ id: items.id })
        .from(items)
        .where(visibleItem(userId, dto.itemId))
        .limit(1);
      if (!item) throw new BadRequestException(MONSTER_ITEM_NOT_FOUND);
      // Повтор не складывается, как в инвентаре, а отвечает 409: количество меняют
      // правкой строки, и случайный второй клик не удвоит снаряжение.
      const inserted = await tx
        .insert(monsterItems)
        .values({ monsterId, itemId: item.id, quantity: dto.quantity })
        .onConflictDoNothing()
        .returning({ id: monsterItems.id });
      if (inserted.length === 0) {
        throw new ConflictException(MONSTER_ITEM_ALREADY);
      }
    });
  }

  // Количество меняется у любой строки, и у скрытой, и у удалённой автором: это строка
  // монстра, а не карточка предмета.
  update(
    userId: string,
    monsterId: string,
    entryId: string,
    dto: UpdateMonsterItemDto,
  ) {
    const log = { userId, monsterId, entryId, ...dto };
    return this.change('update', log, async (tx) => {
      const [row] = await tx
        .update(monsterItems)
        .set({ quantity: dto.quantity })
        .where(this.entryOf(monsterId, entryId))
        .returning({ id: monsterItems.id });
      if (!row) throw new NotFoundException(MONSTER_ITEM_ENTRY_NOT_FOUND);
    });
  }

  remove(userId: string, monsterId: string, entryId: string) {
    const log = { userId, monsterId, entryId };
    return this.change('remove', log, async (tx) => {
      const [row] = await tx
        .delete(monsterItems)
        .where(this.entryOf(monsterId, entryId))
        .returning({ id: monsterItems.id });
      if (!row) throw new NotFoundException(MONSTER_ITEM_ENTRY_NOT_FOUND);
    });
  }

  private entryOf(monsterId: string, entryId: string) {
    return and(
      eq(monsterItems.id, entryId),
      eq(monsterItems.monsterId, monsterId),
    );
  }

  private change(
    kind: 'add' | 'update' | 'remove',
    log: { userId: string; monsterId: string } & Record<string, unknown>,
    apply: (tx: DbTransaction) => Promise<void>,
  ): Promise<MonsterItemEntry[]> {
    return changeMonsterLinks({
      databaseService: this.databaseService,
      logger: this.logger,
      links: 'items',
      kind,
      log,
      apply,
      load: loadMonsterItems,
    });
  }
}
