import { describe, expect, it } from 'vitest';
import type { GameEvent } from 'shared';
import { gameEventText } from './gameEventText';

const base = {
  seq: 1,
  actor: { id: 'u1', nickname: 'Аня' },
  as: null,
  sceneId: null,
  createdAt: '2026-10-20T10:00:00.000Z',
};
const lira = { id: 'c1', name: 'Лира' };

const lair = { id: 's1', name: 'Логово' };

describe('gameEventText', () => {
  it.each<[GameEvent, string]>([
    [
      {
        ...base,
        kind: 'game.created',
        intent: { name: 'Логово', seatCount: 4, hasPassword: false },
        result: null,
      },
      'Игра «Логово» создана: мест 4, открытая',
    ],
    [
      { ...base, kind: 'member.entered', intent: null, result: null },
      'Вход в лобби',
    ],
    [
      {
        ...base,
        kind: 'seat.taken',
        intent: { characterId: 'c1', allowHandover: true },
        result: { character: lira },
      },
      'Место занято: Лира',
    ],
    [
      {
        ...base,
        kind: 'seat.updated',
        intent: { allowHandover: false },
        result: { character: lira },
      },
      'Передача управления запрещена: Лира',
    ],
    [
      {
        ...base,
        kind: 'seat.freed',
        intent: null,
        result: { character: lira, reason: 'character_deleted' },
      },
      'Персонаж удалён, место освобождено: Лира',
    ],
    [
      {
        ...base,
        kind: 'session.ended',
        as: { kind: 'master' },
        intent: null,
        result: { startedAt: '2026-10-20T09:00:00.000Z' },
      },
      'Встреча закончилась',
    ],
    [
      { ...base, kind: 'session.started', intent: null, result: null },
      'Встреча началась',
    ],
    [
      {
        ...base,
        kind: 'session.started',
        intent: null,
        result: { libraryCopied: 3 },
      },
      'Встреча началась, в библиотеку скопировано записей: 3',
    ],
    [
      {
        ...base,
        kind: 'library.refreshed',
        as: { kind: 'master' },
        intent: { kind: 'item', sourceId: 'i1' },
        result: { name: 'Набор', copied: 2 },
      },
      'Обновлено из справочника: Набор, докопировано связей: 2',
    ],
    [
      {
        ...base,
        kind: 'scene.created',
        as: { kind: 'master' },
        intent: { mapId: 'm1' },
        result: { scene: lair, libraryCopied: 3, active: true },
      },
      'Сцена добавлена: Логово, она активная, в библиотеку скопировано записей: 3',
    ],
    [
      {
        ...base,
        kind: 'scene.created',
        as: { kind: 'master' },
        intent: { mapId: 'm1' },
        result: { scene: lair, libraryCopied: 0, active: false },
      },
      'Сцена добавлена: Логово',
    ],
    [
      {
        ...base,
        kind: 'scene.activated',
        as: { kind: 'master' },
        intent: { sceneId: 's1' },
        result: { scene: lair },
      },
      'Активная сцена: Логово',
    ],
    [
      {
        ...base,
        kind: 'scene.restarted',
        as: { kind: 'master' },
        intent: { sceneId: 's0' },
        result: { from: lair, scene: lair, libraryCopied: 1 },
      },
      'Сцена перезапущена: Логово, в библиотеку скопировано записей: 1',
    ],
    [
      {
        ...base,
        kind: 'scene.opened',
        as: { kind: 'master' },
        intent: null,
        result: { scene: lair },
      },
      'Сцена открыта игрокам: Логово',
    ],
    [
      {
        ...base,
        kind: 'scene.closed',
        as: { kind: 'master' },
        intent: null,
        result: { scene: null },
      },
      'Сцена закрыта от игроков',
    ],
    [
      {
        ...base,
        kind: 'scene.edited',
        as: { kind: 'master' },
        intent: { ops: [] },
        result: {
          scene: lair,
          sceneSeq: 3,
          cells: 12,
          objects: 1,
          libraryCopied: 1,
        },
      },
      'Сцена изменена: Логово (клеток: 12, объектов: 1), в библиотеку скопировано записей: 1',
    ],
    [
      {
        ...base,
        kind: 'figures.placed',
        as: { kind: 'master' },
        intent: { reason: 'scene' },
        result: {
          scene: lair,
          placed: [{ character: lira, at: [0, 1, 0] }],
          unplaced: [{ id: 'c2', name: 'Борн' }],
        },
      },
      'Фигурки сцены Логово — на стартовых точках: Лира; не хватило точки: Борн',
    ],
    [
      {
        ...base,
        kind: 'figures.placed',
        intent: { reason: 'seat' },
        result: {
          scene: lair,
          placed: [{ character: lira, at: [0, 1, 0] }],
          unplaced: [],
        },
      },
      'Фигурка на стартовой точке: Лира',
    ],
    [
      {
        ...base,
        kind: 'figures.placed',
        intent: { reason: 'seat' },
        result: { scene: lair, placed: [], unplaced: [lira] },
      },
      'Фигурке не хватило стартовой точки: Лира',
    ],
    [
      {
        ...base,
        kind: 'scene.undone',
        as: { kind: 'master' },
        intent: { seq: 7 },
        result: {
          scene: lair,
          sceneSeq: 4,
          cells: 0,
          objects: 1,
          conflicts: 0,
        },
      },
      'Правка №7 отменена: Логово (объектов: 1)',
    ],
    [
      {
        ...base,
        kind: 'scene.redone',
        as: { kind: 'master' },
        intent: { seq: 7, undoSeq: 8 },
        result: {
          scene: lair,
          sceneSeq: 5,
          cells: 2,
          objects: 0,
          conflicts: 1,
        },
      },
      'Правка №7 возвращена: Логово (клеток: 2), не тронуто изменённого позже: 1',
    ],
    [
      {
        ...base,
        kind: 'member.left',
        intent: null,
        result: { character: null },
      },
      'Выход из игры',
    ],
    [
      {
        ...base,
        kind: 'member.removed',
        as: { kind: 'master' },
        intent: { userId: 'u2' },
        result: { member: { id: 'u2', nickname: 'Боб' }, character: lira },
      },
      'Убран из игры: Боб (место Лира освобождено)',
    ],
  ])('вид события %#', (event, text) => {
    expect(gameEventText(event)).toBe(text);
  });
});
