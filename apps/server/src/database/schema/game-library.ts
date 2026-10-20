import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  CatalogImage,
  CatalogImageVariant,
  GameLibraryKind,
} from 'shared';
import { bytea } from './bytea.js';
import { games } from './games.js';

// Библиотека игры (docs/plan/game.md, этап 4): копии записей справочников, которые игра
// использует. Копия одна на игру по виду и исходному id. Исходный id — без внешнего
// ключа: удалённая в справочнике запись остаётся в игре.
export const gameLibrary = pgTable(
  'game_library',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 10 }).notNull().$type<GameLibraryKind>(),
    sourceId: uuid('source_id').notNull(),
    // Колонкой, а не только в record: по нему сортирует и ищет список.
    name: varchar('name', { length: 100 }).notNull(),
    // Ник автора на момент копии: аккаунт могут переименовать или удалить.
    authorNickname: varchar('author_nickname', { length: 64 }).notNull(),
    // Колонки записи справочника как есть (без id, автора, видимости и времени): читает
    // их тот же маппер, что и справочник, поэтому старые копии переживают новые поля.
    record: jsonb('record').notNull().$type<Record<string, unknown>>(),
    // Связи записи исходными id (games/library/library-links.ts): ищутся в библиотеке
    // той же игры.
    links: jsonb('links').notNull().$type<Record<string, unknown>>(),
    // Метаданные копии картинки; байты — в game_library_image_files. Версия своя, растёт
    // с каждым обновлением: по ней клиент не берёт старую картинку из кеша.
    image: jsonb('image').$type<CatalogImage>(),
    // updated_at записи справочника на момент копии: по нему видно, что автор её правил.
    sourceUpdatedAt: timestamp('source_updated_at', {
      withTimezone: true,
    }).notNull(),
    copiedAt: timestamp('copied_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.kind, table.sourceId] }),
    check(
      'game_library_kind',
      sql`${table.kind} in ('monster', 'item', 'ability', 'effect')`,
    ),
  ],
);

// Байты копии картинки по строке на вариант (full, thumb), как у справочников.
export const gameLibraryImageFiles = pgTable(
  'game_library_image_files',
  {
    gameId: uuid('game_id').notNull(),
    kind: varchar('kind', { length: 10 }).notNull().$type<GameLibraryKind>(),
    sourceId: uuid('source_id').notNull(),
    variant: varchar('variant', { length: 10 })
      .notNull()
      .$type<CatalogImageVariant>(),
    data: bytea('data').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.gameId, table.kind, table.sourceId, table.variant],
    }),
    foreignKey({
      name: 'game_library_image_files_entry_fk',
      columns: [table.gameId, table.kind, table.sourceId],
      foreignColumns: [
        gameLibrary.gameId,
        gameLibrary.kind,
        gameLibrary.sourceId,
      ],
    }).onDelete('cascade'),
  ],
);
