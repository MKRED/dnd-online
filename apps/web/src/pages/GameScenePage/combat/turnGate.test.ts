import { describe, expect, it, vi } from 'vitest';
import type { GameCombat } from 'shared';
import { figureTurnNow, turnFigureDrag } from './turnGate';

const combat = (turn: string | null): GameCombat => ({
  sceneId: 's1',
  round: 1,
  combatants: [
    {
      id: 'k1',
      ref: { kind: 'figure', characterId: 'c1' },
      name: 'Лира',
      initiative: 12,
      surprised: false,
      canRoll: true,
      roll: null,
      pending: null,
      resources: null,
      dodging: false,
      disengaged: false,
      attack: null,
    },
    {
      id: 'k2',
      ref: { kind: 'creature', objectId: 2 },
      name: 'Гоблин',
      initiative: 8,
      surprised: false,
      canRoll: false,
      roll: null,
      pending: null,
      resources: null,
      dodging: false,
      disengaged: false,
      attack: null,
    },
  ],
  turn,
  hiddenTurn: null,
  candidates: [],
  eventSeq: 1,
});

describe('figureTurnNow', () => {
  it('без очерёдности ходят все', () => {
    expect(figureTurnNow(null, 'c1')).toBe(true);
    expect(figureTurnNow({ ...combat(null), combatants: [] }, 'c1')).toBe(true);
  });

  it('с очерёдностью — только в свой ход', () => {
    expect(figureTurnNow(combat('k1'), 'c1')).toBe(true);
    expect(figureTurnNow(combat('k2'), 'c1')).toBe(false);
    // Пока бросают инициативу, и не позванный в бой.
    expect(figureTurnNow(combat(null), 'c1')).toBe(false);
    expect(figureTurnNow(combat('k1'), 'c9')).toBe(false);
  });
});

describe('turnFigureDrag', () => {
  it('не в свой ход нажатие только выбирает', () => {
    const drag = { onGrab: vi.fn(), onSelect: vi.fn(), onRelease: vi.fn() };
    const gated = turnFigureDrag(drag, (id) => id === 'c1');
    gated?.onGrab?.('c2');
    expect(drag.onGrab).not.toHaveBeenCalled();
    expect(drag.onSelect).toHaveBeenCalledWith('c2');
    gated?.onGrab?.('c1');
    expect(drag.onGrab).toHaveBeenCalledWith('c1');
  });
});
