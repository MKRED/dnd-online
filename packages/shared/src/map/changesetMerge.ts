import type { CellChange, Changeset } from './changeset.js';
import type { Vec3 } from './coords.js';
import { sameSize } from './mapSize.js';
import { mergeObjectChanges } from './objects/objectChanges.js';

// Сливает изменения операций одной пачки в одну единицу undo: по каждой клетке
// остаётся первое «до» и последнее «после», клетки, вернувшиеся к исходному
// значению, выпадают. Размер и объекты — так же: первый «до», последний «после».
export function mergeChangesets(parts: Changeset[]): Changeset {
  const merged = new Map<string, CellChange>();
  const paletteAdded: Changeset['paletteAdded'] = [];
  let size: Changeset['size'];
  for (const part of parts) {
    paletteAdded.push(...part.paletteAdded);
    for (const change of part.cells) {
      const id = cellId(change.at);
      const previous = merged.get(id);
      merged.set(id, previous ? { ...previous, after: change.after } : change);
    }
    if (part.size) {
      size = {
        before: size?.before ?? part.size.before,
        after: part.size.after,
      };
    }
  }
  const cells = [...merged.values()].filter((c) => c.before !== c.after);
  const objects = mergeObjectChanges(parts.map((part) => part.objects ?? []));
  return {
    cells,
    paletteAdded,
    ...(size && !sameSize(size.before, size.after) && { size }),
    ...(objects.length > 0 && { objects }),
  };
}

export function cellId([x, y, z]: Vec3): string {
  return `${x},${y},${z}`;
}
