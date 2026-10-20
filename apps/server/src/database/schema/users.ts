import { jsonb, pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  login: varchar('login', { length: 32 }).notNull().unique(),
  nickname: varchar('nickname', { length: 64 }).notNull(),
  // null — аккаунт создан входом через лольку и пароль ещё не задан: по логину в него не войти.
  passwordHash: varchar('password_hash', { length: 255 }),
  // Настройки пользователя (shared/userSettings): читать через readUserSettings —
  // тут может лежать неполный объект, недостающее берётся по умолчанию.
  settings: jsonb('settings')
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
