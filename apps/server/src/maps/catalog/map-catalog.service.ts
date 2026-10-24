import { Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, type SQL } from 'drizzle-orm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  readFurnitureContainer,
  type MapCatalogEntry,
  type MapCatalogKind,
} from 'shared';
import { entryVisibleTo } from '../../catalog/catalog-access.js';
import { toCatalogImage } from '../../catalog/catalog-image.mapper.js';
import { DatabaseService } from '../../database/database.service.js';
import {
  characterImages,
  characters,
  furniture,
  itemImages,
  items,
  monsterImages,
  monsters,
} from '../../database/schema/index.js';
import { loadFurnitureRefs } from '../objects/furniture-refs.js';
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
// НПС и обстановка — свои (чужую обстановку сначала копируют, docs/plan/blocks.md, этап 8в). Только чтение. Открыт и API-токену, чтобы нейросеть через MCP находила id
// для операций объектов (docs/plan/done/map-objects.md, «Нейросеть»); остальной каталог токену
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
        .select({ entry: monsters, image: monsterImages })
        .from(monsters)
        .leftJoin(monsterImages, eq(monsterImages.ownerId, monsters.id))
        .where(
          where(
            entryVisibleTo(MONSTER_ACCESS, userId),
            contains(monsters.name, q),
          ),
        )
        .orderBy(asc(monsters.name))
        .limit(LIMIT);
      return rows.map(({ entry, image }) => {
        const { statBlock, role } = toMonsterFields(
          entry.category,
          entry.details,
          entry.extra,
        );
        return {
          id: entry.id,
          name: entry.name,
          size: statBlock.size,
          role,
          image: toCatalogImage(image),
        };
      });
    }
    if (kind === 'item') {
      const rows = await db
        .select({
          id: items.id,
          name: items.name,
          category: items.category,
          weight: items.weight,
          image: itemImages,
        })
        .from(items)
        .leftJoin(itemImages, eq(itemImages.ownerId, items.id))
        .where(
          where(entryVisibleTo(ITEM_ACCESS, userId), contains(items.name, q)),
        )
        .orderBy(asc(items.name))
        .limit(LIMIT);
      return rows.map(({ image, ...row }) => ({
        ...row,
        image: toCatalogImage(image),
      }));
    }
    if (kind === 'furniture') {
      const rows = await db
        .select({
          id: furniture.id,
          name: furniture.name,
          extra: furniture.extra,
        })
        .from(furniture)
        .where(
          where(eq(furniture.authorId, userId), contains(furniture.name, q)),
        )
        .orderBy(asc(furniture.name))
        .limit(LIMIT);
      const { view, refs } = await loadFurnitureRefs(
        db,
        userId,
        new Set(rows.map((row) => row.id)),
      );
      return rows.map(({ id, name, extra }) => {
        const found = view[id];
        return {
          id,
          name,
          modelSize: [...(refs.get(id)?.size ?? [1, 1, 1])],
          mount: refs.get(id)?.mount ?? 'floor',
          container: readFurnitureContainer(extra.container),
          model: found?.missing === null ? found.model : null,
        };
      });
    }
    return db
      .select({
        id: characters.id,
        name: characters.name,
        mainImage: {
          id: characterImages.id,
          thumbVersion: characterImages.thumbVersion,
        },
      })
      .from(characters)
      .leftJoin(
        characterImages,
        and(
          eq(characterImages.characterId, characters.id),
          eq(characterImages.isMain, true),
        ),
      )
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
