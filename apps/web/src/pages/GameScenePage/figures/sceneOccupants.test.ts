import { describe, expect, it } from 'vitest';
import type { MapObject, MapObjectRefsView } from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { sceneOccupants } from './sceneOccupants';

const base = { hidden: false, facing: 0 } as const;
const objects: MapObject[] = [
  { ...base, id: 1, kind: 'monster', at: [1, 1, 0], monsterId: 'm1' },
  {
    ...base,
    id: 2,
    kind: 'npc',
    at: [2, 1, 0],
    characterId: 'c1',
    size: 'medium',
  },
];
const state = {
  objects: { byId: new Map(objects.map((o) => [o.id, o])) },
} as unknown as MapViewState;
const refs = {
  monsters: { m1: { size: 'large' } },
} as unknown as MapObjectRefsView;

describe('sceneOccupants', () => {
  it('поверженный монстр недееспособен — сквозь него проходят', () => {
    const occupants = sceneOccupants(state, refs, new Map([[1, 'down']]));
    expect(occupants).toEqual([
      { at: [1, 1, 0], size: 'large', ally: false, incapacitated: true },
      { at: [2, 1, 0], size: 'medium', ally: false, incapacitated: false },
    ]);
  });

  it('раненый мешает, как и прежде; само существо, которое ходит, пропускается', () => {
    const occupants = sceneOccupants(
      state,
      refs,
      new Map([[1, 'bloodied']]),
      2,
    );
    expect(occupants).toEqual([
      { at: [1, 1, 0], size: 'large', ally: false, incapacitated: false },
    ]);
  });
});
