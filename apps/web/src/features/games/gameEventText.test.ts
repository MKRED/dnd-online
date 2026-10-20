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
