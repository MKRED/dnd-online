import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameWalkMessage, MapObject, MapObjects } from 'shared';
import { useSceneWalks } from './useSceneWalks';

const goblin = {
  id: 2,
  kind: 'monster',
  monsterId: 'm1',
  at: [1, 1, 0],
  facing: 180,
} as unknown as MapObject;
const objects: MapObjects = { byId: new Map([[2, goblin]]), nextId: 3 };

const walk = (
  seq: number,
  extra: Partial<GameWalkMessage> = {},
): GameWalkMessage => ({
  gameId: 'g1',
  sceneId: 's1',
  seq,
  walker: { kind: 'figure', characterId: 'c1' },
  path: [
    [0, 1, 0],
    [0, 1, 1],
  ],
  ...extra,
});

function setup(enabled = true) {
  return renderHook(() => useSceneWalks({ sceneId: 's1', enabled, objects }));
}

describe('useSceneWalks', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('путь фигурки — ход по её ключу; тот же номер дважды не играется', () => {
    const { result } = setup();
    act(() => result.current.receive(walk(5)));
    const first = result.current.walks.get('figure:c1');
    expect(first).toMatchObject({ kind: 'walk', seq: 5 });
    act(() => result.current.receive(walk(5)));
    expect(result.current.walks.get('figure:c1')).toBe(first);
  });

  it('путь другой сцены и выключенные анимации не запоминаются', () => {
    const other = setup();
    act(() => other.result.current.receive(walk(1, { sceneId: 's2' })));
    expect(other.result.current.walks.size).toBe(0);
    const off = setup(false);
    act(() => off.result.current.receive(walk(1)));
    act(() => off.result.current.hold('figure:c1', [0, 1, 0]));
    expect(off.result.current.walks.size).toBe(0);
  });

  it('существо запоминается, пока идёт: правка может убрать его из поля зрения', () => {
    const { result } = setup();
    act(() =>
      result.current.receive(
        walk(7, { walker: { kind: 'creature', objectId: 2 } }),
      ),
    );
    expect(result.current.walks.has('object:2')).toBe(true);
    expect(result.current.departed.get(2)).toBe(goblin);
    // Ход короткий: после него и запаса на запоздавшие данные всё убирается.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.walks.size).toBe(0);
    expect(result.current.departed.size).toBe(0);
  });

  it('ожидание пути заменяется пришедшим путём, а без пути — пропадает само', () => {
    const { result } = setup();
    act(() => result.current.hold('figure:c1', [0, 1, 0]));
    expect(result.current.walks.get('figure:c1')).toMatchObject({
      kind: 'hold',
      at: [0, 1, 0],
    });
    act(() => result.current.receive(walk(9)));
    expect(result.current.walks.get('figure:c1')?.kind).toBe('walk');
    act(() => result.current.hold('figure:c2', [3, 1, 3]));
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.walks.has('figure:c2')).toBe(false);
  });
});
