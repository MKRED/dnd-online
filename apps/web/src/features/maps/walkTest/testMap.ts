import {
  applyOp,
  createPalette,
  MemoryChunkStore,
  type BlockOp,
  type MapState,
} from 'shared';

// Для тестов: пол из земли под y = 0 (x и z от −6 до 6) и операции поверх него.
export function floorWith(...ops: BlockOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [-6, -1, -6],
    to: [6, -1, 6],
    block: 'dirt',
  });
  for (const op of ops) applyOp(map, op);
  return map;
}
