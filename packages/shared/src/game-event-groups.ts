import type { GameEvent, GameEventKind } from './game-events.js';

// Группы записей журнала игры (журнал после первой партии, 2026-10-26, вид А): значок,
// цвет и фильтр журнала. Одна таблица на сервер и клиент; в базе группы нет — она
// следует из вида записи.
export const GAME_EVENT_GROUPS = [
  'combat',
  'movement',
  'effects',
  'spells',
  'scene',
  'game',
] as const;
export type GameEventGroup = (typeof GAME_EVENT_GROUPS)[number];

export const GAME_EVENT_GROUP_LABELS: Record<GameEventGroup, string> = {
  combat: 'Бой',
  movement: 'Перемещение',
  effects: 'Эффекты',
  spells: 'Заклинания',
  scene: 'Сцена',
  game: 'Игра',
};

const KIND_GROUPS: Record<GameEventKind, GameEventGroup> = {
  'game.created': 'game',
  'member.entered': 'game',
  'seat.taken': 'game',
  'seat.updated': 'game',
  'seat.controller': 'game',
  'seat.freed': 'game',
  'member.left': 'game',
  'member.removed': 'game',
  'session.started': 'game',
  'session.ended': 'game',
  'library.refreshed': 'game',
  'blocks.changed': 'scene',
  'scene.created': 'scene',
  'scene.activated': 'scene',
  'scene.restarted': 'scene',
  'scene.opened': 'scene',
  'scene.closed': 'scene',
  'scene.fog': 'scene',
  'scene.fogReset': 'scene',
  'scene.edited': 'scene',
  'scene.undone': 'scene',
  'scene.redone': 'scene',
  'figures.placed': 'movement',
  'figure.moved': 'movement',
  'figure.placed': 'movement',
  'figures.round': 'movement',
  'game.mode': 'movement',
  'figure.refreshed': 'movement',
  'figure.dashed': 'movement',
  'figures.locked': 'movement',
  'creature.moved': 'movement',
  'creature.refreshed': 'movement',
  'creature.dashed': 'movement',
  'combat.started': 'combat',
  'combat.joined': 'combat',
  'combat.left': 'combat',
  'combat.initiative': 'combat',
  'combat.initiative_set': 'combat',
  'combat.order': 'combat',
  'combat.turn': 'combat',
  'combat.action': 'combat',
  'combat.ability': 'combat',
  'combat.resources': 'combat',
  'combat.attack': 'combat',
  'combat.damage': 'combat',
  'combat.weapon_set': 'combat',
  'character.changed': 'combat',
  'creature.changed': 'combat',
  'character.effect_added': 'effects',
  'character.effect_removed': 'effects',
  'character.equipment': 'combat',
  'creature.effect_added': 'effects',
  'creature.effect_removed': 'effects',
  'creature.slots_changed': 'spells',
  'creature.prepared': 'spells',
};

// Правка персонажа — бой, кроме ячеек заклинаний: та же запись character.changed.
export function gameEventGroup(event: GameEvent): GameEventGroup {
  if (
    event.kind === 'character.changed' &&
    event.intent.change.kind === 'spell_slots'
  ) {
    return 'spells';
  }
  return KIND_GROUPS[event.kind];
}
