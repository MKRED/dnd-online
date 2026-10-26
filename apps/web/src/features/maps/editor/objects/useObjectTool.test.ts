import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapObject, MapObjectRefsView, MapOp } from 'shared';
import { floorWith } from '../../walkTest/testMap';
import type { MapViewState } from '../../mapStateFromChunks';
import type { PickedCells } from '../editorTools';
import { useObjectTool } from './useObjectTool';

const RAT = {
  kind: 'monster' as const,
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Крыса',
  label: 'Крыса · Крошечный',
  size: 'tiny' as const,
};

const objects: MapObject[] = [
  { id: 1, kind: 'monster', monsterId: RAT.id, at: [1, 0, 1], facing: 0 },
  {
    id: 2,
    kind: 'container',
    name: 'Сундук',
    look: 'chest',
    items: [],
    at: [3, 0, 3],
    facing: 0,
  },
] as unknown as MapObject[];

const state = {
  ...floorWith(),
  size: { width: 6, depth: 6 },
  objects: { byId: new Map(objects.map((o) => [o.id, o])), nextId: 3 },
} as unknown as MapViewState;

const refs = {
  monsters: {},
  characters: {},
  items: {},
  furniture: {},
} as unknown as MapObjectRefsView;

const cells = (x: number, z: number): PickedCells => ({
  hit: [x, -1, z],
  place: [x, 0, z],
  point: [x + 0.5, 0, z + 0.5],
  normal: [0, 1, 0],
});

function setup() {
  const applyOps = vi.fn<(ops: MapOp[]) => void>();
  const hook = renderHook(() =>
    useObjectTool({ state, refs, applyOps, scope: 'creatures' }),
  );
  return { applyOps, hook };
}

describe('useObjectTool, «Существа»', () => {
  it('берёт только монстров и НПС', () => {
    const { hook } = setup();
    expect(hook.result.current.scene.accepts(1)).toBe(true);
    expect(hook.result.current.scene.accepts(2)).toBe(false);
    act(() => hook.result.current.select(2));
    expect(hook.result.current.selected).toBeNull();
  });

  it('щелчок по клетке переставляет выбранное существо и оставляет его выбранным', () => {
    const { applyOps, hook } = setup();
    act(() => hook.result.current.select(1));
    act(() => hook.result.current.pick(cells(4, 2)));
    expect(applyOps).toHaveBeenCalledWith([
      { op: 'moveObject', id: 1, at: [4, 0, 2] },
    ]);
    expect(hook.result.current.selected?.id).toBe(1);
  });

  it('существо ставится по одному: после постановки выбор снимается', () => {
    const { applyOps, hook } = setup();
    act(() => hook.result.current.choose({ kind: 'creature', entry: RAT }));
    act(() => hook.result.current.pick(cells(2, 4)));
    expect(applyOps).toHaveBeenCalledWith([
      expect.objectContaining({ op: 'placeObject', at: [2, 0, 4] }),
    ]);
    expect(hook.result.current.settings.choice).toBeNull();
  });

  it('выбор существа снимает ставящееся, а ставящееся — выбранное', () => {
    const { hook } = setup();
    act(() => hook.result.current.choose({ kind: 'creature', entry: RAT }));
    act(() => hook.result.current.select(1));
    expect(hook.result.current.settings.choice).toBeNull();
    act(() => hook.result.current.choose({ kind: 'creature', entry: RAT }));
    expect(hook.result.current.selected).toBeNull();
  });
});
