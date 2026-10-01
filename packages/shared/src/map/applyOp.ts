import { AIR, cellTypeId, encodeCell } from './cell.js';
import type { Changeset, CellChange, PaletteAddition } from './changeset.js';
import { cellsInBox, chunkKeysInBox, type Box3, type Vec3 } from './coords.js';
import { pruneEmptyChunks, readCell, writeCell } from './chunkStore.js';
import type { MapState } from './mapState.js';
import { opRegion, type MapOp } from './ops.js';
import { resolveBlockId } from './palette.js';

function isOnBoxShell([x, y, z]: Vec3, { min, max }: Box3): boolean {
  return (
    x === min[0] ||
    x === max[0] ||
    y === min[1] ||
    y === max[1] ||
    z === min[2] ||
    z === max[2]
  );
}

// Значение клетки после операции; null — операция клетку не трогает.
function targetValue(
  op: MapOp,
  cell: Vec3,
  region: Box3,
  current: number,
  blockValue: () => number,
  matchId: number | null,
): number | null {
  switch (op.op) {
    case 'setBlock':
    case 'fillBox':
      return blockValue();
    case 'hollowBox':
      return isOnBoxShell(cell, region) ? blockValue() : AIR;
    case 'replace':
      return cellTypeId(current) === matchId ? blockValue() : null;
  }
}

// Применяет уже проверенную (parseMapOp) операцию. Без I/O: всё через MapState.
export function applyOp(state: MapState, op: MapOp): Changeset {
  const paletteAdded: PaletteAddition[] = [];
  // Блок дописывается в палитру при первой реальной записи: replace, ничего не
  // нашедший, не должен раздувать палитру, которая никогда не сжимается.
  let resolvedValue: number | null = null;
  const blockValue = () => {
    if (resolvedValue === null) {
      const { id, added } = resolveBlockId(state.palette, op.block);
      if (added) paletteAdded.push({ id, name: op.block });
      resolvedValue = encodeCell(id, op.rotation);
    }
    return resolvedValue;
  };
  // Блок «match», которого нет в палитре, на карте не встречается (indexOf = -1).
  const matchId = op.op === 'replace' ? state.palette.indexOf(op.match) : null;

  const region = opRegion(op);
  const cells: CellChange[] = [];
  for (const cell of cellsInBox(region)) {
    const before = readCell(state.store, cell);
    const after = targetValue(op, cell, region, before, blockValue, matchId);
    if (after === null || after === before) continue;
    writeCell(state.store, cell, after);
    cells.push({ at: cell, before, after });
  }
  pruneEmptyChunks(state.store, chunkKeysInBox(region));
  return { cells, paletteAdded };
}
