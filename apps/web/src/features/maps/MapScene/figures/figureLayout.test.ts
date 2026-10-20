import { describe, expect, it } from 'vitest';
import {
  applyOp,
  createPalette,
  MemoryChunkStore,
  type MapState,
} from 'shared';
import { layoutFigures, type FigureInput } from './figureLayout';

// Каменный пол на y = 0: стоят на y = 1.
function floor(): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [3, 0, 3],
    block: 'stone',
  });
  return map;
}

const lira: FigureInput = {
  id: 'c1',
  name: 'лира',
  at: [1, 1, 2],
  facing: 90,
  size: 'medium',
  image: null,
  selectable: true,
};

describe('layoutFigures', () => {
  it('фигурка стоит посередине клетки на полу, буква — заглавная', () => {
    const [figure] = layoutFigures(floor(), [lira]);
    expect(figure).toMatchObject({
      level: 1,
      base: [1.5, 1, 2.5],
      footprint: 1,
      top: 3,
      blocked: false,
      letter: 'Л',
    });
  });

  it('там, где стоять нельзя, подставка красная', () => {
    const [figure] = layoutFigures(floor(), [{ ...lira, at: [1, 3, 2] }]);
    expect(figure.blocked).toBe(true);
  });
});
