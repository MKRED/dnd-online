import {
  applyOp,
  createPalette,
  furnitureCellKey,
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

// Обстановка «можно встать сверху» в клетке [0, 0, 0] с опорой во всю высоту — как стол
// алхимика, у которого бутылки доходят до верхнего вокселя.
export function withTallTable(map: MapState): MapState {
  const body = [0, 0, 0, 1, 1, 1] as const;
  map.furniture = {
    cells: new Map([
      [
        furnitureCellKey(0, 0, 0),
        { boxes: [[...body]], body: [...body], surface: 1, difficult: false },
      ],
    ]),
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
  };
  return map;
}
