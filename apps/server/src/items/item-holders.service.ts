import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { ItemHolders } from 'shared';
import { DatabaseService } from '../database/database.service.js';
import { characterItems, characters } from '../database/schema/index.js';

// У каких персонажей лежит предмет — автору для подтверждения удаления и скрытия
// (docs/plan/done/character-inventory.md, этап 3).
@Injectable()
export class ItemHoldersService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(ItemHoldersService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Только для автора предмета. Свои персонажи — по имени, чужие — числом: их имена
  // автору предмета знать незачем, персонаж может быть закрыт.
  async holdersOf(userId: string, itemId: string): Promise<ItemHolders> {
    const t0 = Date.now();
    try {
      // Предмет может лежать у персонажа в двух местах — персонажей считаем по одному разу.
      const rows = await this.databaseService.db
        .selectDistinct({
          id: characters.id,
          name: characters.name,
          ownerId: characters.userId,
        })
        .from(characterItems)
        .innerJoin(characters, eq(characters.id, characterItems.characterId))
        .where(eq(characterItems.itemId, itemId))
        .orderBy(asc(characters.name), asc(characters.id));
      const mine = rows
        .filter((row) => row.ownerId === userId)
        .map(({ id, name }) => ({ id, name }));
      this.logger.debug(
        {
          durationMs: Date.now() - t0,
          userId,
          itemId,
          characters: rows.length,
        },
        'Item holders looked up',
      );
      return { mine, othersCount: rows.length - mine.length };
    } catch (err: unknown) {
      this.logger.error(
        { err, durationMs: Date.now() - t0, userId, itemId },
        'Item holders lookup failed',
      );
      throw err;
    }
  }
}
