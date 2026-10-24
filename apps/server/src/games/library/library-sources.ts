import { and, eq, inArray, or } from 'drizzle-orm';
import {
  readMonsterModelLink,
  type CatalogImage,
  type FigureModel,
  type GameLibraryKind,
  type MonsterRefModel,
} from 'shared';
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
import {
  loadMonsterModels,
  monsterRefModel,
} from '../../monsters/monster-model-view.js';
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
  // 3D-модель НПС или снимок модели монстра; версию копии, как и у картинки, задаёт
  // библиотека.
  model?: Omit<FigureModel, 'version'> | MonsterRefModel | null;
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
  if (kind === 'item') return loadItems(db, ids, viewerId);
  const sources = await loadEntries(
    db,
    ENTRY_TABLES[kind],
    SOURCE_IMAGES[kind],
    ids,
    viewerId,
  );
  return kind === 'monster' ? withMonsterModels(db, sources) : sources;
}

// Снимок 3D-модели монстра (docs/plan/done/monster-models.md, этап 2): вид модели любого автора
// и поправка из ссылки — копия не зависит от того, что с моделью станет в справочнике.
// Время записи — позднее из монстра и модели, как в monsterStamps.
async function withMonsterModels(
  db: Db,
  sources: LibrarySource[],
): Promise<LibrarySource[]> {
  const links = sources.map((source) => monsterLink(source.record));
  const models = await loadMonsterModels(db, links);
  return sources.map((source, i) => {
    const model = links[i] && models.get(links[i].id);
    return {
      ...source,
      model: monsterRefModel(models, links[i]),
      updatedAt: latest(source.updatedAt, model?.updatedAt),
    };
  });
}

function latest(entry: Date, model: Date | undefined): Date {
  return model && model > entry ? model : entry;
}

function monsterLink(record: Record<string, unknown>) {
  const extra = record.extra as Record<string, unknown> | null | undefined;
  return readMonsterModelLink(extra?.model);
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
  if (kind === 'monster') return monsterStamps(db, ids, viewerId);
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

// У монстра с моделью — позднее из записи и модели: правка модели в справочнике тоже
// повод «Обновить из справочника», как у модели НПС.
async function monsterStamps(
  db: Db,
  ids: readonly string[],
  viewerId: string,
): Promise<Map<string, Date>> {
  const rows = await db
    .select({
      id: monsters.id,
      updatedAt: monsters.updatedAt,
      extra: monsters.extra,
    })
    .from(monsters)
    .where(
      and(
        inArray(monsters.id, [...ids]),
        or(eq(monsters.authorId, viewerId), eq(monsters.isPublic, true)),
      ),
    );
  const links = rows.map((row) => readMonsterModelLink(row.extra.model));
  const models = await loadMonsterModels(db, links);
  return new Map(
    rows.map((row, i) => {
      const model = links[i] && models.get(links[i].id);
      return [row.id, latest(row.updatedAt, model?.updatedAt)];
    }),
  );
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
