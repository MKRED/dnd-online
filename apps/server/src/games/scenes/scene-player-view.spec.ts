import { describe, expect, it } from 'vitest';
import type { MapObject } from 'shared';
import { forPlayer, playerChanges } from './scene-player-view.js';

const GEM = '00000000-0000-4000-8000-000000000001';
const GOBLIN = '00000000-0000-4000-8000-000000000002';

const chest: MapObject = {
  id: 1,
  at: [1, 1, 1],
  hidden: false,
  kind: 'container',
  name: 'Сундук',
  look: 'chest',
  items: [{ itemId: GEM, quantity: 3 }],
};
const goblin: MapObject = {
  id: 2,
  at: [2, 1, 2],
  hidden: true,
  kind: 'monster',
  monsterId: GOBLIN,
  facing: 0,
};

describe('сцена глазами игрока', () => {
  it('скрытого нет, у контейнера нет содержимого', () => {
    expect(forPlayer(goblin)).toBeNull();
    expect(forPlayer(chest)).toEqual({ ...chest, items: [] });
    expect(forPlayer(null)).toBeNull();
  });

  it('правка: клетки как есть, невидимое выпадает, выведенное ставится', () => {
    const moved = { ...goblin, at: [3, 1, 3] } as MapObject;
    const revealed = { ...goblin, hidden: false };
    const changes = playerChanges({
      cells: [5, 1, 5, 0, 1],
      paletteAdded: [],
      objects: [
        // Скрытого гоблина сдвинули — игрок этого не видит.
        { id: 2, before: goblin, after: moved },
        // В сундук положили — тоже.
        {
          id: 1,
          before: chest,
          after: { ...chest, items: [{ itemId: GEM, quantity: 4 }] },
        },
      ],
    });
    expect(changes).toEqual({ cells: [5, 1, 5, 0, 1], paletteAdded: [] });

    expect(
      playerChanges({
        cells: [],
        paletteAdded: [],
        objects: [
          { id: 2, before: moved, after: revealed },
          { id: 1, before: chest, after: { ...chest, name: 'Ларь' } },
        ],
      }).objects,
    ).toEqual([
      { id: 2, before: null, after: revealed },
      {
        id: 1,
        before: { ...chest, items: [] },
        after: { ...chest, name: 'Ларь', items: [] },
      },
    ]);
  });
});
