import { describe, expect, it } from 'vitest';
import { TILE_SIZE, type Tile } from '../../../maps';
import { PIXEL_PALETTE } from './pixelPalette';
import {
  commit,
  commitStroke,
  preview,
  redo,
  startHistory,
  undo,
} from './tileHistory';
import {
  floodFill,
  linePoints,
  paintPixels,
  pixelAt,
  tileColors,
} from './tilePixels';

const blank = (): Tile => new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);

describe('пиксели плитки', () => {
  it('карандаш красит пиксель, ластик делает дыру, исходная плитка не меняется', () => {
    const tile = blank();
    const red = paintPixels(tile, [[2, 3]], '#ff0000');
    expect(pixelAt(red, 2, 3)).toBe('#ff0000');
    expect(pixelAt(tile, 2, 3)).toBeNull();
    expect(pixelAt(paintPixels(red, [[2, 3]], null), 2, 3)).toBeNull();
  });

  it('точки за краем плитки пропускаются', () => {
    const tile = paintPixels(
      blank(),
      [
        [-1, 0],
        [16, 5],
        [0, 0],
      ],
      '#00ff00',
    );
    expect(tileColors(tile, 10)).toEqual(['#00ff00']);
  });

  it('отрезок без разрывов, с обоими концами', () => {
    const points = linePoints([0, 0], [5, 2]);
    expect(points[0]).toEqual([0, 0]);
    expect(points.at(-1)).toEqual([5, 2]);
    for (let i = 1; i < points.length; i++) {
      expect(Math.abs(points[i][0] - points[i - 1][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(points[i][1] - points[i - 1][1])).toBeLessThanOrEqual(1);
    }
    expect(linePoints([3, 3], [3, 3])).toEqual([[3, 3]]);
  });

  it('заливка не перетекает через стену и через диагональ', () => {
    // Вертикальная стена по x = 4 и диагональ в правой части.
    let tile = paintPixels(
      blank(),
      Array.from({ length: TILE_SIZE }, (_, y) => [4, y] as [number, number]),
      '#000000',
    );
    tile = paintPixels(
      tile,
      Array.from({ length: 11 }, (_, i) => [5 + i, i] as [number, number]),
      '#000000',
    );
    const filled = floodFill(tile, 0, 0, '#ff0000');
    expect(pixelAt(filled, 3, 15)).toBe('#ff0000');
    expect(pixelAt(filled, 4, 0)).toBe('#000000');
    expect(pixelAt(filled, 10, 0)).toBeNull();
    // Под диагональю — своя область: заливка из неё не уходит за линию.
    const below = floodFill(tile, 6, 15, '#00ff00');
    expect(pixelAt(below, 6, 15)).toBe('#00ff00');
    expect(pixelAt(below, 15, 0)).toBeNull();
  });

  it('заливка тем же цветом отдаёт ту же плитку', () => {
    const tile = paintPixels(blank(), [[0, 0]], '#123456');
    expect(floodFill(tile, 0, 0, '#123456')).toBe(tile);
  });

  it('цвета плитки — по частоте, без прозрачных', () => {
    let tile = paintPixels(blank(), [[0, 0]], '#111111');
    tile = paintPixels(
      tile,
      [
        [1, 0],
        [2, 0],
      ],
      '#222222',
    );
    expect(tileColors(tile, 10)).toEqual(['#222222', '#111111']);
    expect(tileColors(tile, 1)).toEqual(['#222222']);
  });

  it('полупрозрачный пиксель из API считается дырой', () => {
    const tile = blank();
    tile.set([10, 20, 30, 100], 0);
    expect(pixelAt(tile, 0, 0)).toBeNull();
  });
});

describe('история правок', () => {
  it('отмена и возврат по шагам; новая правка стирает возвраты', () => {
    const a = blank();
    const b = paintPixels(a, [[0, 0]], '#ffffff');
    const c = paintPixels(b, [[1, 0]], '#ffffff');
    let history = commit(commit(startHistory(a), b), c);
    history = undo(history);
    expect(history.present).toBe(b);
    history = undo(history);
    expect(history.present).toBe(a);
    expect(undo(history)).toBe(history);
    history = redo(history);
    expect(history.present).toBe(b);
    history = commit(history, c);
    expect(history.future).toEqual([]);
    expect(redo(history)).toBe(history);
  });

  it('мазок — один шаг отмены', () => {
    const a = blank();
    let history = startHistory(a);
    const one = paintPixels(a, [[0, 0]], '#ffffff');
    history = preview(history, one);
    history = preview(history, paintPixels(one, [[1, 0]], '#ffffff'));
    history = commitStroke(history, a);
    expect(history.past).toEqual([a]);
    expect(undo(history).present).toBe(a);
  });
});

describe('готовая палитра', () => {
  it('32 разных цвета #rrggbb', () => {
    const colors = PIXEL_PALETTE.flatMap((row) => row.colors);
    expect(colors).toHaveLength(32);
    expect(new Set(colors).size).toBe(32);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
