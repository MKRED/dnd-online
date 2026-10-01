import type { Changeset, Vec3 } from 'shared';
import type { StoredChangeset } from '../database/schema/index.js';

const CELL_FIELDS = 5;

// Changeset ↔ компактный вид для jsonb (см. StoredChangeset).
export function packChangeset({
  cells,
  paletteAdded,
}: Changeset): StoredChangeset {
  return {
    cells: cells.flatMap(({ at, before, after }) => [...at, before, after]),
    paletteAdded,
  };
}

export function unpackChangeset({
  cells,
  paletteAdded,
}: StoredChangeset): Changeset {
  const unpacked: Changeset['cells'] = [];
  for (let i = 0; i < cells.length; i += CELL_FIELDS) {
    const at: Vec3 = [cells[i], cells[i + 1], cells[i + 2]];
    unpacked.push({ at, before: cells[i + 3], after: cells[i + 4] });
  }
  return { cells: unpacked, paletteAdded };
}
