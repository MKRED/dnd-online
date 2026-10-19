import { describe, expect, it } from 'vitest';
import { cellLabel, readoutCell, regionSizeLabel } from './cellReadout';
import { cellsFromHit } from './editorTools';

// Курсор на верхней грани блока [3, 2, 5] и на земле в клетке [4, 0, 6].
const onBlockTop = cellsFromHit([3.5, 3, 5.5], [0, 1, 0], false);
const onGround = cellsFromHit([4.5, 0, 6.5], [0, 1, 0], true);

describe('readoutCell', () => {
  it('в «Просмотре» — блок под курсором, над землёй — клетка земли', () => {
    expect(readoutCell('view', onBlockTop)).toEqual([3, 2, 5]);
    expect(readoutCell('view', onGround)).toEqual([4, 0, 6]);
  });

  it('у инструмента — его клетка, у «Хода» — где встанет фигурка', () => {
    expect(readoutCell('place', onBlockTop)).toEqual([3, 3, 5]);
    expect(readoutCell('erase', onBlockTop)).toEqual([3, 2, 5]);
    expect(readoutCell('erase', onGround)).toBeNull();
    expect(readoutCell('walk', onBlockTop)).toEqual([3, 3, 5]);
  });
});

describe('подписи', () => {
  it('клетка и размер области: ширина × глубина × высота, в клетках и футах', () => {
    expect(cellLabel([12, 3, 7])).toBe('x 12 · y 3 · z 7');
    expect(regionSizeLabel({ min: [2, 0, 1], max: [7, 2, 4] })).toBe(
      '6 × 4 × 3 клеток — 30 × 20 × 15 фт',
    );
  });
});
