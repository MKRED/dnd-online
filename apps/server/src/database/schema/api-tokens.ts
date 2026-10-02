import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// Долгоживущие токены для внешних клиентов (MCP-сервер карты для нейросети).
// Как и refresh-токены, хранится только sha256-хэш: утечка БД не даёт готовый токен.
export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  // Начало токена — чтобы в списке было понятно, какой из них какой.
  prefix: varchar('prefix', { length: 16 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});
