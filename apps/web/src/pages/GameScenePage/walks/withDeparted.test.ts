import { describe, expect, it } from 'vitest';
import { MemoryChunkStore, type MapObject } from 'shared';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { withDeparted } from './withDeparted';

const object = (id: number) =>
  ({
    id,
    kind: 'monster',
    monsterId: 'm',
    at: [id, 1, 0],
  }) as unknown as MapObject;

const state = {
  store: new MemoryChunkStore(),
  palette: [],
  size: { width: 8, depth: 8 },
  objects: { byId: new Map([[1, object(1)]]), nextId: 3 },
} as unknown as MapViewState;

describe('withDeparted', () => {
  it('без ушедших — та же сцена', () => {
    expect(withDeparted(state, new Map([[1, object(1)]]))).toBe(state);
  });

  it('ушедшее из поля зрения существо добавляется, сцена не меняется', () => {
    const shown = withDeparted(state, new Map([[2, object(2)]]));
    expect([...shown.objects.byId.keys()]).toEqual([1, 2]);
    expect(state.objects.byId.has(2)).toBe(false);
  });
});
