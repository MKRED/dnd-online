import { describe, expect, it } from 'vitest';
import { mergeSceneFog } from './sceneFog';

const chunk = (cx: number, bits: string) => ({ cx, cy: 0, cz: 0, bits });

describe('mergeSceneFog', () => {
  it('replaces the changed chunks and keeps the rest', () => {
    const fog = {
      explored: [chunk(0, 'a'), chunk(1, 'b')],
      visible: [chunk(0, 'a')],
    };
    expect(
      mergeSceneFog(fog, {
        explored: [chunk(1, 'c'), chunk(2, 'd')],
        visible: [],
      }),
    ).toEqual({
      explored: [chunk(0, 'a'), chunk(1, 'c'), chunk(2, 'd')],
      visible: [chunk(0, 'a')],
    });
  });

  it('leaves a page without fog as it is', () => {
    expect(
      mergeSceneFog(null, { explored: [chunk(0, 'a')], visible: [] }),
    ).toBeNull();
    const fog = { explored: [], visible: [] };
    expect(mergeSceneFog(fog, undefined)).toBe(fog);
  });
});
