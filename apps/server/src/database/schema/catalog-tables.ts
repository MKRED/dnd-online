import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import type { CatalogImageVariant, ThumbCrop } from 'shared';
import { bytea } from './bytea.js';
import { users } from './users.js';

// Заготовки таблиц для каталогов, устроенных как предметы (docs/plan/abilities-effects.md).
// Имя таблицы передаётся строкой, поэтому все таблицы одной заготовки — одного типа, и
// общий код каталогов (доступ, картинки, CRUD) работает с любой из них.

// Запись простого каталога (способности, эффекты): общие поля — колонки, поля категории —
// jsonb details, как у предметов. У предметов своя таблица (items.ts): у них есть вес,
// стоимость и редкость.
export function catalogEntryTable(name: string) {
  return pgTable(
    name,
    {
      id: uuid('id').defaultRandom().primaryKey(),
      authorId: uuid('author_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
      // Скрытую запись видит только автор; опубликованную — все в каталоге.
      isPublic: boolean('is_public').notNull().default(false),
      name: varchar('name', { length: 100 }).notNull(),
      // Ключ категории из shared; список проверяет DTO каталога.
      category: varchar('category', { length: 30 }).notNull(),
      details: jsonb('details')
        .notNull()
        .$type<Record<string, unknown>>()
        .default({}),
      // Поля всех записей каталога, которых нет у других каталогов (у эффекта —
      // длительность). jsonb, а не свои колонки: таблицы каталогов — одной заготовки, и
      // общий код работает с любой. Состав читает и проверяет код каталога.
      extra: jsonb('extra')
        .notNull()
        .$type<Record<string, unknown>>()
        .default({}),
      description: text('description').notNull().default(''),
      createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    },
    (table) => [
      index(`${name}_author_idx`).on(table.authorId),
      // Каталог читает только опубликованные — частичный индекс по ним.
      index(`${name}_public_idx`)
        .on(table.updatedAt)
        .where(sql`${table.isPublic}`),
    ],
  );
}

export type CatalogEntryTable = ReturnType<typeof catalogEntryTable>;

// Картинка записи — одна, поэтому ключ таблицы метаданных — сама запись. Байты лежат
// отдельно (<prefix>_image_files), чтобы список, которому нужны только метаданные, не
// тащил мегабайты. В базе, а не на диске — как у персонажей
// (docs/plan/character-images.md). ownerColumn — имя колонки в базе: у предметов
// таблицы уже есть с item_id.
export function catalogImageTables(
  prefix: string,
  ownerColumn: string,
  ownerId: () => AnyPgColumn,
) {
  const images = pgTable(`${prefix}_images`, {
    ownerId: uuid(ownerColumn)
      .primaryKey()
      .references(ownerId, { onDelete: 'cascade' }),
    // Размеры варианта full: в его пикселях задан вырез миниатюры.
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    // Может выходить за края картинки — поля миниатюры прозрачные.
    thumbCrop: jsonb('thumb_crop').notNull().$type<ThumbCrop>(),
    // Растёт при замене картинки и смене выреза; клиент кладёт её в адрес файла.
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  });
  // Байты по строке на вариант (full, thumb), всегда WebP.
  const files = pgTable(
    `${prefix}_image_files`,
    {
      ownerId: uuid(ownerColumn)
        .notNull()
        .references(() => images.ownerId, { onDelete: 'cascade' }),
      variant: varchar('variant', { length: 10 })
        .$type<CatalogImageVariant>()
        .notNull(),
      data: bytea('data').notNull(),
    },
    (table) => [primaryKey({ columns: [table.ownerId, table.variant] })],
  );
  return { images, files };
}

export type CatalogImageTables = ReturnType<typeof catalogImageTables>;
