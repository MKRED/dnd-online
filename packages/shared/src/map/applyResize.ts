import { AIR } from './cell.js';
import type { CellChange, Changeset } from './changeset.js';
import { cellId } from './changesetMerge.js';
import { cellLocation, type Vec3 } from './coords.js';
import { pruneEmptyChunks, writeCell } from './chunkStore.js';
import { MapOpError } from './mapOpError.js';
import {
  sizeLabel,
  type MapBoundsLimits,
  type SizedMapState,
} from './mapSize.js';
import { resizedSize, type ResizeOp } from './resizeOp.js';
import { solidCells } from './summary.js';

// Меняет размер карты. Координаты карты начинаются с нуля, поэтому место на западе,
// севере и снизу появляется только сдвигом всех блоков: добавить три уровня снизу —
// поднять всё на три блока (docs/plan/map-editor.md, «Размер карты»).
export function applyResize(
  map: SizedMapState,
  op: ResizeOp,
  limits: MapBoundsLimits,
): Changeset {
  const before = map.size;
  const after = resizedSize(before, op.grow);
  if (after.width < 1 || after.depth < 1) {
    throw new MapOpError(
      `Карта станет ${sizeLabel(after)} — нужна хотя бы одна клетка в ширину и глубину`,
    );
  }
  if (after.width > limits.maxSize || after.depth > limits.maxSize) {
    throw new MapOpError(
      `Карта станет ${sizeLabel(after)} — больше предела ${limits.maxSize} × ${limits.maxSize}`,
    );
  }

  const shift: Vec3 = [
    op.grow.west ?? 0,
    op.grow.down ?? 0,
    op.grow.north ?? 0,
  ];
  // «delete» удаляет всё, что окажется за восточной и южной границей, в том числе
  // блоки, скрытые прошлыми сужениями.
  const keepHidden = op.cut !== 'delete';
  // Снимок до записи: каждая непустая клетка уходит со своего места и встаёт туда,
  // где окажется после сдвига. Чего нет в снимке, то воздух.
  const solid = [...solidCells(map.store)];
  const changes = new Map<string, CellChange>();
  for (const { cell, value } of solid) {
    changes.set(cellId(cell), { at: cell, before: value, after: AIR });
  }
  for (const { cell, value } of solid) {
    const at: Vec3 = [
      cell[0] + shift[0],
      cell[1] + shift[1],
      cell[2] + shift[2],
    ];
    // Срезано с запада, севера или снизу — удаляется всегда.
    if (at.some((v) => v < 0)) continue;
    const outside = at[0] >= after.width || at[2] >= after.depth;
    if (outside && !keepHidden) continue;
    if (at[1] >= limits.maxHeight) {
      throw new MapOpError(
        `Блоки поднимутся выше предела высоты: ${limits.maxHeight} уровней`,
      );
    }
    const existing = changes.get(cellId(at));
    if (existing) existing.after = value;
    else changes.set(cellId(at), { at, before: AIR, after: value });
  }

  const cells = [...changes.values()].filter((c) => c.before !== c.after);
  const touched = new Set<string>();
  for (const { at, after: value } of cells) {
    writeCell(map.store, at, value);
    touched.add(cellLocation(at).key);
  }
  pruneEmptyChunks(map.store, touched);
  map.size = after;
  return { cells, paletteAdded: [], size: { before, after } };
}
