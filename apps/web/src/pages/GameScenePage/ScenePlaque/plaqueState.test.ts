import type { GameFigure } from 'shared';
import { describe, expect, it } from 'vitest';
import { plaqueState } from './plaqueState';

const lira = {
  character: { id: 'c1', name: 'Лира' },
  speed: 30,
  climb: null,
  moved: 10,
  dashes: 0,
} as GameFigure;

const none = { placing: null, figure: null, free: false, creature: null };

describe('plaqueState', () => {
  it('ничего не выбрано — плашки нет', () => {
    expect(plaqueState({ ...none, creatureMoving: false })).toBeNull();
  });

  it('фигурка в «Игре» — запас и ход, в «Правке» — без пути', () => {
    expect(
      plaqueState({ ...none, figure: lira, creatureMoving: false }),
    ).toEqual({
      name: 'Лира',
      left: 'осталось 20 из 30 фт',
      short: '20 / 30 фт',
      hint: 'щелчок по подсвеченной клетке — ход',
    });
    expect(
      plaqueState({ ...none, figure: lira, free: true, creatureMoving: false })
        ?.left,
    ).toBeNull();
  });

  it('вне боя запас не тратится — Скорость на каждый ход', () => {
    expect(
      plaqueState({
        ...none,
        figure: lira,
        creatureMoving: false,
        freeMove: true,
      }),
    ).toMatchObject({ left: 'до 30 фт за ход', short: '30 фт/ход' });
  });

  it('поверженное существо не ходит', () => {
    expect(
      plaqueState({
        ...none,
        creature: {
          objectId: 1,
          health: 'down',
          state: {
            name: 'Орк',
            hitPoints: { current: 0, max: 15, temp: 0 },
            effects: [],
            movement: { speed: 30, climb: null, moved: 0, dashes: 0 },
          },
        },
        creatureMoving: true,
      })?.hint,
    ).toBe('повержен и не ходит');
  });
});
