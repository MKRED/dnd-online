import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { GameMoveMode } from 'shared';
import { characters } from './characters.js';
import { users } from './users.js';

// Игра — кампания мастера (docs/plan/done/game.md). Видна всем в общем списке; закрытая
// пускает в лобби только с паролем.
export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  masterId: uuid('master_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  // Сколько мест всего; занятые — участники с персонажем (game_members).
  seatCount: integer('seat_count').notNull(),
  // bcrypt; null — игра открытая.
  passwordHash: varchar('password_hash', { length: 100 }),
  // Номер последней записи журнала игры (game_events). Растёт в той же транзакции, что и
  // запись: UPDATE строки игры и блокирует её, и даёт номер без пропусков.
  eventSeq: integer('event_seq').notNull().default(0),
  // Когда мастер начал текущую встречу; null — встреча не идёт. Пока идёт, листы
  // персонажей на местах закрыты для правки владельцем (games/sheet-lock.ts).
  sessionStartedAt: timestamp('session_started_at', { withTimezone: true }),
  // «Сцена открыта игрокам» (docs/plan/done/game.md, этап 5): закрытую активную сцену игрокам
  // не отдают. У новой игры закрыта — мастер открывает сцену, когда готов.
  sceneOpen: boolean('scene_open').notNull().default(false),
  // Режим хода (docs/dnd/movement.md): «free» — запас снова полный после каждого хода,
  // «tactical» — тратится до «Нового раунда». Новые и старые игры — в свободном.
  moveMode: varchar('move_mode', { length: 16 })
    .$type<GameMoveMode>()
    .notNull()
    .default('free'),
  // Номер раунда боя; только в тактическом режиме, в свободном null.
  combatRound: integer('combat_round'),
  // Чей ход в бою с очерёдностью — участник game_combatants (docs/plan/combat.md, этап 2);
  // null — очереди нет или инициатива ещё бросается. Без внешнего ключа: участники
  // ссылаются на игру, и ключ замкнул бы таблицы в круг; уходящий участник сначала
  // передаёт ход.
  combatTurn: uuid('combat_turn'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Участник игры — кто вошёл в лобби (в закрытое — с паролем, один раз). Место — участник
// с персонажем; свободных мест строками нет, их число — seat_count минус занятые.
export const gameMembers = pgTable(
  'game_members',
  {
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null — в лобби без места. Удалили персонажа — место освобождается, вход остаётся.
    characterId: uuid('character_id').references(() => characters.id, {
      onDelete: 'set null',
    }),
    allowHandover: boolean('allow_handover').notNull().default(true),
    // Управляющий персонажем, которого назначил мастер (docs/plan/done/game.md, этап 7): водит
    // его фигурку вместе с владельцем. Только при allowHandover; запрет передачи, уход
    // управляющего и освобождение места его снимают.
    controllerId: uuid('controller_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Когда занято место: порядок мест в лобби.
    seatedAt: timestamp('seated_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      name: 'game_members_pk',
      columns: [table.gameId, table.userId],
    }),
    // Персонаж — только в одной игре: игра пишет в его лист (docs/plan/done/game.md).
    // null в unique различны, поэтому участники без места не мешают друг другу.
    unique('game_members_character').on(table.characterId),
  ],
);
