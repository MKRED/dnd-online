import { renderHook } from '@testing-library/react';
import type { Box3 } from 'shared';
import { afterEach, describe, expect, it } from 'vitest';
import { cameraMemory } from './cameraMemory';
import { useRememberedCamera } from './useRememberedCamera';

const frame: Box3 = { min: [0, 0, 0], max: [9, 2, 9] };
const memory = cameraMemory('test.camera');
const saved = {
  position: [1, 2, 3] as [number, number, number],
  target: [4, 5, 6] as [number, number, number],
};
const noQuery = { view: null, cam: null, target: null };

describe('useRememberedCamera', () => {
  afterEach(() => localStorage.clear());

  it('без ракурса в адресе берёт запомненную камеру места', () => {
    memory.save('m1', saved);
    const { result } = renderHook(() =>
      useRememberedCamera({ frame, query: noQuery, memory, placeId: 'm1' }),
    );
    expect(result.current.camera).toEqual(saved);
  });

  it('ракурс из адреса важнее запомненного', () => {
    memory.save('m1', saved);
    const { result } = renderHook(() =>
      useRememberedCamera({
        frame,
        query: { ...noQuery, view: 'top' },
        memory,
        placeId: 'm1',
      }),
    );
    expect(result.current.camera).not.toEqual(saved);
  });

  it('remember пишет камеру своего места; без места — ничего', () => {
    const { result, rerender } = renderHook(
      ({ placeId }: { placeId: string | null }) =>
        useRememberedCamera({ frame, query: noQuery, memory, placeId }),
      { initialProps: { placeId: null as string | null } },
    );
    expect(result.current.camera).not.toBeNull();
    result.current.remember(saved);
    expect(localStorage.getItem('test.camera')).toBeNull();
    rerender({ placeId: 'm2' });
    result.current.remember(saved);
    expect(memory.read('m2')).toEqual(saved);
  });

  it('без кадра камеры нет', () => {
    const { result } = renderHook(() =>
      useRememberedCamera({
        frame: null,
        query: noQuery,
        memory,
        placeId: 'm1',
      }),
    );
    expect(result.current.camera).toBeNull();
  });
});
