import type { GameEventKind } from './game-events.js';

// Кому видна запись журнала (журнал после первой партии, 2026-10-26). Журнал для игроков
// появится позже, поле — заранее: решают его в момент записи, по тому, что игроки знали
// тогда, — потом этого уже не восстановить. master — только мастеру, players — и игрокам
// тоже, в их версии: без хитов монстров и НПС и запаса их движения.
export const GAME_EVENT_VISIBILITIES = ['master', 'players'] as const;
export type GameEventVisibility = (typeof GAME_EVENT_VISIBILITIES)[number];

// Видимость по виду записи. Хиты и ход существа — players, только если игроки его видели:
// это решает сервер при записи (games/creatures/creature-visibility.ts), здесь — master на
// случай, если не решил. Миграция 0059 разметила старые записи этой же таблицей; меняя
// её, старые записи не трогаем.
export const GAME_EVENT_DEFAULT_VISIBILITY: Record<
  GameEventKind,
  GameEventVisibility
> = {
  // Лобби и встреча: что видно в самом лобби.
  'game.created': 'players',
  'member.entered': 'players',
  'seat.taken': 'players',
  'seat.updated': 'players',
  'seat.controller': 'players',
  'seat.freed': 'players',
  'member.left': 'players',
  'member.removed': 'players',
  'session.started': 'players',
  'session.ended': 'players',
  // Подготовка мастера: библиотека, свои блоки, сцены и их правки.
  'library.refreshed': 'master',
  'blocks.changed': 'master',
  'scene.created': 'master',
  'scene.activated': 'master',
  'scene.restarted': 'master',
  'scene.fog': 'master',
  'scene.fogReset': 'master',
  'scene.edited': 'master',
  'scene.undone': 'master',
  'scene.redone': 'master',
  // Сцену игроки видят с того, как её открыли.
  'scene.opened': 'players',
  'scene.closed': 'players',
  // Фигурки персонажей и раунды видит вся партия.
  'figures.placed': 'players',
  'figure.moved': 'players',
  'figure.placed': 'players',
  'figures.round': 'players',
  'game.mode': 'players',
  'figure.refreshed': 'players',
  'figure.dashed': 'players',
  // Очерёдность боя видит вся партия; про скрытое от игроков существо — только мастер:
  // это решает сервер при записи (games/combat/combat-visibility.ts).
  'combat.started': 'players',
  'combat.order': 'players',
  'combat.joined': 'master',
  'combat.left': 'master',
  'combat.initiative': 'master',
  'combat.initiative_set': 'master',
  'combat.turn': 'master',
  'combat.action': 'master',
  'combat.ability': 'master',
  'combat.resources': 'master',
  // Персонажи партии видны партии целиком, как на их листе.
  'character.changed': 'players',
  'character.effect_added': 'players',
  'character.effect_removed': 'players',
  'character.equipment': 'players',
  // Монстры и НПС: игроки видят только урон по ним и как они ходят.
  'creature.changed': 'master',
  'creature.moved': 'master',
  'creature.refreshed': 'master',
  'creature.dashed': 'master',
  'creature.slots_changed': 'master',
  'creature.prepared': 'master',
  'creature.effect_added': 'master',
  'creature.effect_removed': 'master',
};
