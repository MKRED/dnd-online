ALTER TABLE "game_events" ADD COLUMN "visibility" varchar(10) DEFAULT 'master' NOT NULL;--> statement-breakpoint
-- Старые записи — по виду, как GAME_EVENT_DEFAULT_VISIBILITY (shared/game-event-visibility.ts).
-- Хиты и ходы существ остаются мастеру: видели ли их игроки тогда, уже не узнать.
UPDATE "game_events" SET "visibility" = 'players' WHERE "kind" IN (
  'game.created', 'member.entered', 'seat.taken', 'seat.updated', 'seat.controller',
  'seat.freed', 'member.left', 'member.removed', 'session.started', 'session.ended',
  'scene.opened', 'scene.closed', 'figures.placed', 'figure.moved', 'figure.placed',
  'figures.round', 'game.mode', 'figure.refreshed', 'figure.dashed',
  'character.changed', 'character.effect_added', 'character.effect_removed'
);
