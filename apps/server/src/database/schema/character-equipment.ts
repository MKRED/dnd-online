import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { EquipSlot } from 'shared';
import { characterItems } from './character-items.js';
import { characters } from './characters.js';

// Кукла персонажа (docs/plan/equipment.md, этап 2): место → строка инвентаря. Отдельная
// таблица, а не поле строки: стопка из двух кинжалов лежит в двух руках, а место занято
// не больше чем одной вещью — это держит первичный ключ.
export const characterEquipment = pgTable(
  'character_equipment',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    // EQUIP_SLOTS из shared; список проверяют DTO и check.
    slot: varchar('slot', { length: 20 }).$type<EquipSlot>().notNull(),
    // Убрали строку из инвентаря — вещь снимается сама.
    entryId: uuid('entry_id')
      .notNull()
      .references(() => characterItems.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.characterId, table.slot] }),
    index('character_equipment_entry_idx').on(table.entryId),
    check(
      'character_equipment_slot',
      sql`${table.slot} in ('head', 'cloak', 'body', 'hands', 'feet', 'amulet', 'ring1', 'ring2', 'meleeMain', 'meleeOff', 'rangedMain', 'rangedOff')`,
    ),
  ],
);
