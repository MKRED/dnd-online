import { describe, expect, it } from 'vitest';
import {
  HIDE_CELL_PX,
  MARK_MAX_PX,
  MARK_MIN_PX,
  markHeightCells,
} from './markSize';

const px = (cellPx: number) => (markHeightCells(cellPx) ?? 0) * cellPx;

describe('markHeightCells', () => {
  it('на средней дистанции — доля клетки', () => {
    expect(markHeightCells(40)).toBeCloseTo(0.45);
  });

  it('на экране — не мельче и не крупнее пределов', () => {
    expect(px(HIDE_CELL_PX)).toBeCloseTo(MARK_MIN_PX);
    expect(px(200)).toBeCloseTo(MARK_MAX_PX);
  });

  it('издалека не показывается', () => {
    expect(markHeightCells(HIDE_CELL_PX - 1)).toBeNull();
    expect(markHeightCells(0)).toBeNull();
  });
});
