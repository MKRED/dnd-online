import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { GameEventAs, GameEventKind, PackedChangeset } from 'shared';
import { gameScenes } from './game-scenes.js';
import { games } from './games.js';
import { users } from './users.js';

// Журнал игры (docs/plan/game.md, «Журнал игры»): все действия в игре по порядку, записи
// только добавляются. Состояние живёт в обычных таблицах, журнал — история для отладки и
// восстановления; запись и изменение пишутся в одной транзакции (games/game-journal.ts).
export const gameEvents = pgTable(
  'game_events',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    // Номер по порядку внутри игры, без пропусков: по нему клиент сокета догоняет
    // пропущенное. Берётся из games.event_seq.
    seq: integer('seq').notNull(),
    kind: varchar('kind', { length: 40 }).notNull().$type<GameEventKind>(),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    // От имени кого: мастер, персонаж или монстр. Без внешнего ключа — запись должна
    // пережить удаление персонажа или экземпляра монстра.
    asKind: varchar('as_kind', { length: 20 }).$type<GameEventAs['kind']>(),
    asId: uuid('as_id'),
    // Сцена события; у событий лобби — null. Сцены не удаляются (перезапуск их
    // архивирует), set null — на всякий случай.
    sceneId: uuid('scene_id').references(() => gameScenes.id, {
      onDelete: 'set null',
    }),
    // Что просили и что получилось; форма — GameEventPayloads из shared.
    intent: jsonb('intent'),
    result: jsonb('result'),
    // Правка сцены (этап 6): что изменилось, в прямом виде, как map_ops.changeset. Не
    // часть записи для мастера: бывает большим, а нужен только отмене и рассылке правок.
    changes: jsonb('changes').$type<PackedChangeset>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'game_events_pk', columns: [table.gameId, table.seq] }),
  ],
);
