import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// Внешние способы входа (пока только лолька). Основа — users: все данные приложения
// висят на users.id, а здесь лишь «этот внешний аккаунт — вот этот пользователь».
export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Кто подтверждает личность: 'lolka'.
    provider: varchar('provider', { length: 32 }).notNull(),
    // Постоянный id пользователя у провайдера (`sub` лольки, свой для каждого сайта).
    subject: varchar('subject', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Один внешний аккаунт ведёт ровно в одного пользователя…
    unique('user_identities_provider_subject_unique').on(t.provider, t.subject),
    // …и у пользователя не больше одного аккаунта каждого провайдера.
    unique('user_identities_user_provider_unique').on(t.userId, t.provider),
  ],
);
