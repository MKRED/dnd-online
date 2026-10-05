import { describe, expect, it } from 'vitest';
import type { Changeset } from './changeset.js';
import { packChangeset, unpackChangeset } from './changesetPacking.js';

describe('changeset codec', () => {
  it('восстанавливает changeset после упаковки', () => {
    const changeset: Changeset = {
      cells: [
        { at: [-1, 0, 5], before: 0, after: 4 },
        { at: [17, -3, 0], before: 9, after: 0 },
      ],
      paletteAdded: [{ id: 1, name: 'stone' }],
    };

    const packed = packChangeset(changeset);

    expect(packed.cells).toEqual([-1, 0, 5, 0, 4, 17, -3, 0, 9, 0]);
    expect(unpackChangeset(packed)).toEqual(changeset);
  });
});
