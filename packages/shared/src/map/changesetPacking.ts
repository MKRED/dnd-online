import type { Changeset } from './changeset.js';
import type { Vec3 } from './coords.js';

// Changeset в компактном виде: клетки — плоский массив по 5 чисел [x, y, z, до, после],
// иначе пачка на десятки тысяч клеток раздувалась бы объектами с именами полей.
// В таком виде он лежит в журнале (jsonb) и приходит клиенту в ответе на правку.
export interface PackedChangeset {
  cells: number[];
  paletteAdded: { id: number; name: string }[];
}

const CELL_FIELDS = 5;

export function packChangeset({
  cells,
  paletteAdded,
}: Changeset): PackedChangeset {
  return {
    cells: cells.flatMap(({ at, before, after }) => [...at, before, after]),
    paletteAdded,
  };
}

export function unpackChangeset({
  cells,
  paletteAdded,
}: PackedChangeset): Changeset {
  const unpacked: Changeset['cells'] = [];
  for (let i = 0; i < cells.length; i += CELL_FIELDS) {
    const at: Vec3 = [cells[i], cells[i + 1], cells[i + 2]];
    unpacked.push({ at, before: cells[i + 3], after: cells[i + 4] });
  }
  return { cells: unpacked, paletteAdded };
}
