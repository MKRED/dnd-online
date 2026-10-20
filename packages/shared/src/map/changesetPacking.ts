import type { Changeset } from './changeset.js';
import type { Vec3 } from './coords.js';
import type { MapSize } from './mapSize.js';
import type { ObjectChange } from './objects/objectChanges.js';

// Changeset в компактном виде: клетки — плоский массив по 5 чисел [x, y, z, до, после],
// иначе пачка на десятки тысяч клеток раздувалась бы объектами с именами полей.
// В таком виде он лежит в журнале (jsonb) и приходит клиенту в ответе на правку.
// Объектов на карте немного, они лежат как есть.
export interface PackedChangeset {
  cells: number[];
  paletteAdded: { id: number; name: string }[];
  size?: { before: MapSize; after: MapSize };
  objects?: ObjectChange[];
}

const CELL_FIELDS = 5;

export function packChangeset({
  cells,
  paletteAdded,
  size,
  objects,
}: Changeset): PackedChangeset {
  return {
    cells: cells.flatMap(({ at, before, after }) => [...at, before, after]),
    paletteAdded,
    ...(size && { size }),
    ...(objects && { objects }),
  };
}

export function unpackChangeset({
  cells,
  paletteAdded,
  size,
  objects,
}: PackedChangeset): Changeset {
  const unpacked: Changeset['cells'] = [];
  for (let i = 0; i < cells.length; i += CELL_FIELDS) {
    const at: Vec3 = [cells[i], cells[i + 1], cells[i + 2]];
    unpacked.push({ at, before: cells[i + 3], after: cells[i + 4] });
  }
  return {
    cells: unpacked,
    paletteAdded,
    ...(size && { size }),
    ...(objects && { objects }),
  };
}
