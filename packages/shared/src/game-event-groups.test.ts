import { describe, expect, it } from 'vitest';
import { gameEventGroup } from './game-event-groups.js';
import type { GameEvent } from './game-events.js';

const base = {
  seq: 1,
  actor: null,
  as: { kind: 'master' as const },
  sceneId: null,
  visibility: 'players' as const,
  createdAt: '2026-10-26T07:00:00.000Z',
};
const character = { id: 'c1', name: 'Хасе Гансалес' };
const state = {
  hitPointsCurrent: 10,
  hitPointsMax: 10,
  hitPointsTemp: 0,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  spellSlots: {},
};

describe('gameEventGroup', () => {
  it('правка хитов персонажа — бой, его ячейки — заклинания', () => {
    const changed = (change: GameEvent['intent']) =>
      ({
        ...base,
        kind: 'character.changed',
        intent: change,
        result: {
          character,
          before: state,
          after: state,
          instantDeath: false,
        },
      }) as GameEvent;
    expect(
      gameEventGroup(
        changed({
          characterId: 'c1',
          change: { kind: 'damage', amount: 3 },
        } as GameEvent['intent']),
      ),
    ).toBe('combat');
    expect(
      gameEventGroup(
        changed({
          characterId: 'c1',
          change: { kind: 'spell_slots', expended: {} },
        } as GameEvent['intent']),
      ),
    ).toBe('spells');
  });

  it('остальное — по виду записи', () => {
    const event = {
      ...base,
      kind: 'figure.dashed',
      intent: { characterId: 'c1' },
      result: { character, dashes: 1 },
    } as GameEvent;
    expect(gameEventGroup(event)).toBe('movement');
  });
});
