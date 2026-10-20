import { and, eq, inArray, or } from 'drizzle-orm';
import type { CatalogImage, GameLibraryKind } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { toCatalogImage } from '../../catalog/catalog-image.mapper.js';
import {
  abilities,
  abilityImageTables,
  effectImageTables,
  effects,
  itemImageTables,
  items,
  monsterImageTables,
  monsters,
  users,
  type CatalogEntryTable,
  type CatalogImageTables,
} from '../../database/schema/index.js';
import { loadNpcSources, npcStamps } from './library-npc-sources.js';

// Записи справочников, из которых библиотека игры берёт копии. Видит запись тот же, кто
// видит её в справочнике: автор или любой — у опубликованной.

// Виды из справочников; НПС — персонаж, у него свои таблицы (library-npc-sources.ts).
export type CatalogLibraryKind = Exclude<GameLibraryKind, 'npc'>;

const ENTRY_TABLES: Record<
  Exclude<CatalogLibraryKind, 'item'>,
  CatalogEntryTable
> = { monster: monsters, ability: abilities, effect: effects };

export const SOURCE_IMAGES: Record<CatalogLibraryKind, CatalogImageTables> = {
  monster: monsterImageTables,
  ability: abilityImageTables,
  effect: effectImageTables,
  item: itemImageTables,
};

// Запись справочника, готовая к копии. record — её колонки без id, автора, видимости и
// времени (game_library.record).
export interface LibrarySource {
  sourceId: string;
  name: string;
  authorNickname: string;
  record: Record<string, unknown>;
  image: CatalogImage | null;
  updatedAt: Date;
}

export async function loadSources(
  db: Db,
  kind: GameLibraryKind,
  ids: readonly string[],
  viewerId: string,
): Promise<LibrarySource[]> {
  if (ids.length === 0) return [];
  if (kind === 'npc') return loadNpcSources(db, ids, viewerId);
  return kind === 'item'
    ? loadItems(db, ids, viewerId)
    : loadEntries(db, ENTRY_TABLES[kind], SOURCE_IMAGES[kind], ids, viewerId);
}

// Когда записи справочника правили последний раз — для сверки копий в списке. Скрытых от
// смотрящего и удалённых в ответе нет.
export async function sourceStamps(
  db: Db,
  kind: GameLibraryKind,
  ids: readonly string[],
  viewerId: string,
): Promise<Map<string, Date>> {
  if (ids.length === 0) return new Map();
  if (kind === 'npc') return npcStamps(db, ids, viewerId);
  const table = kind === 'item' ? items : ENTRY_TABLES[kind];
  const rows = await db
    .select({ id: table.id, updatedAt: table.updatedAt })
    .from(table)
    .where(
      and(
        inArray(table.id, [...ids]),
        or(eq(table.authorId, viewerId), eq(table.isPublic, true)),
      ),
    );
  return new Map(rows.map((row) => [row.id, row.updatedAt]));
}

async function loadEntries(
  db: Db,
  table: CatalogEntryTable,
  images: CatalogImageTables,
  ids: readonly string[],
  viewerId: string,
): Promise<LibrarySource[]> {
  const rows = await db
    .select({ entry: table, nickname: users.nickname, image: images.images })
    .from(table)
    .innerJoin(users, eq(users.id, table.authorId))
    .leftJoin(images.images, eq(images.images.ownerId, table.id))
    .where(
      and(
        inArray(table.id, [...ids]),
        or(eq(table.authorId, viewerId), eq(table.isPublic, true)),
      ),
    );
  return rows.map(({ entry, nickname, image }) => ({
    sourceId: entry.id,
    name: entry.name,
    authorNickname: nickname,
    record: {
      category: entry.category,
      details: entry.details,
      extra: entry.extra,
      description: entry.description,
      sources: entry.sources,
    },
    image: toCatalogImage(image),
    updatedAt: entry.updatedAt,
  }));
}

async function loadItems(
  db: Db,
  ids: readonly string[],
  viewerId: string,
): Promise<LibrarySource[]> {
  const images = itemImageTables.images;
  const rows = await db
    .select({ item: items, nickname: users.nickname, image: images })
    .from(items)
    .innerJoin(users, eq(users.id, items.authorId))
    .leftJoin(images, eq(images.ownerId, items.id))
    .where(
      and(
        inArray(items.id, [...ids]),
        or(eq(items.authorId, viewerId), eq(items.isPublic, true)),
      ),
    );
  return rows.map(({ item, nickname, image }) => ({
    sourceId: item.id,
    name: item.name,
    authorNickname: nickname,
    record: {
      category: item.category,
      rarity: item.rarity,
      details: item.details,
      weight: item.weight,
      costAmount: item.costAmount,
      costCoin: item.costCoin,
      description: item.description,
      sources: item.sources,
    },
    image: toCatalogImage(image),
    updatedAt: item.updatedAt,
  }));
}
