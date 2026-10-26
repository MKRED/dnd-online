import { describe, expect, it } from 'vitest';
import { MemoryChunkStore, type MapObject } from 'shared';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import { withoutStarts } from './withoutStarts';

const object = (id: number, kind: string) =>
  ({ id, kind, at: [id, 1, 0] }) as unknown as MapObject;

const stateOf = (...objects: MapObject[]) =>
  ({
    store: new MemoryChunkStore(),
    palette: [],
    size: { width: 8, depth: 8 },
    objects: { byId: new Map(objects.map((o) => [o.id, o])), nextId: 9 },
  }) as unknown as MapViewState;

describe('withoutStarts', () => {
  it('убирает точки старта, остальное оставляет', () => {
    const state = stateOf(object(1, 'start'), object(2, 'monster'));
    const shown = withoutStarts(state);
    expect([...shown.objects.byId.keys()]).toEqual([2]);
    expect(shown.objects.nextId).toBe(9);
    expect(state.objects.byId.has(1)).toBe(true);
  });

  it('без стартов — та же сцена', () => {
    const state = stateOf(object(2, 'monster'));
    expect(withoutStarts(state)).toBe(state);
  });
});
