import { Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, type SQL } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { MapCatalogEntry, MapCatalogKind } from 'shared';
import { entryVisibleTo } from '../../catalog/catalog-access.js';
import { DatabaseService } from '../../database/database.service.js';
import { characters, items, monsters } from '../../database/schema/index.js';
import { ITEM_ACCESS } from '../../items/item-access.js';
import {
  MONSTER_ACCESS,
  toMonsterFields,
} from '../../monsters/monsters.config.js';

const LIMIT = 20;

// % и _ в запросе — обычные символы, а не шаблон LIKE.
function contains(column: Parameters<typeof ilike>[0], q: string | undefined) {
  if (!q) return undefined;
  return ilike(column, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
}

// Поиск того, что можно поставить на карту: монстры и предметы — свои и опубликованные,
// НПС — свои. Только чтение. Открыт и API-токену, чтобы нейросеть через MCP находила id
// для операций объектов (docs/plan/map-objects.md, «Нейросеть»); остальной каталог токену
// по-прежнему закрыт.
@Injectable()
export class MapCatalogService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectPinoLogger(MapCatalogService.name)
    private readonly logger: PinoLogger,
  ) {}

  async search(
    userId: string,
    kind: MapCatalogKind,
    q: string | undefined,
  ): Promise<MapCatalogEntry[]> {
    const t0 = Date.now();
    try {
      const result = await this.query(userId, kind, q);
      this.logger.debug(
        { durationMs: Date.now() - t0, kind, found: result.length },
        'Map catalog searched',
      );
      return result;
    } catch (err) {
      this.logger.error({ err, kind }, 'Map catalog search failed');
      throw err;
    }
  }

  private async query(
    userId: string,
    kind: MapCatalogKind,
    q: string | undefined,
  ): Promise<MapCatalogEntry[]> {
    const { db } = this.databaseService;
    const where = (...conditions: (SQL | undefined)[]) => and(...conditions);
    if (kind === 'monster') {
      const rows = await db
        .select()
        .from(monsters)
        .where(
          where(
            entryVisibleTo(MONSTER_ACCESS, userId),
            contains(monsters.name, q),
          ),
        )
        .orderBy(asc(monsters.name))
        .limit(LIMIT);
      return rows.map((row) => {
        const { statBlock, role } = toMonsterFields(
          row.category,
          row.details,
          row.extra,
        );
        return { id: row.id, name: row.name, size: statBlock.size, role };
      });
    }
    if (kind === 'item') {
      const rows = await db
        .select({ id: items.id, name: items.name, category: items.category })
        .from(items)
        .where(
          where(entryVisibleTo(ITEM_ACCESS, userId), contains(items.name, q)),
        )
        .orderBy(asc(items.name))
        .limit(LIMIT);
      return rows;
    }
    return db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(
        where(
          eq(characters.userId, userId),
          eq(characters.kind, 'npc'),
          contains(characters.name, q),
        ),
      )
      .orderBy(asc(characters.name))
      .limit(LIMIT);
  }
}
