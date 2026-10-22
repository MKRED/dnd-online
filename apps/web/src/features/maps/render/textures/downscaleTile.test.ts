import { describe, expect, it } from 'vitest';
import { downscaleTile, meanTextureColor } from './downscaleTile';
import { paintTile } from './pixels';

function image(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number],
) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) rgba.set(pixel(x, y), (y * width + x) * 4);
  return rgba;
}

const at = (tile: Uint8ClampedArray, x: number, y: number) => [
  ...tile.subarray((y * 16 + x) * 4, (y * 16 + x) * 4 + 4),
];

describe('downscaleTile', () => {
  it('сжимает пиксель-арт 64×64 точно, по квадратам 4×4', () => {
    const rgba = image(64, 64, (x, y) =>
      (Math.floor(x / 4) + Math.floor(y / 4)) % 2
        ? [255, 0, 0, 255]
        : [0, 0, 255, 255],
    );
    const tile = downscaleTile(rgba, 64, 64);
    expect(at(tile, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(at(tile, 1, 0)).toEqual([255, 0, 0, 255]);
  });

  it('обрезает широкую картинку по центру до квадрата', () => {
    // 48×16: слева и справа по 16 красных столбцов, в середине синий квадрат.
    const rgba = image(48, 16, (x) =>
      x >= 16 && x < 32 ? [0, 0, 255, 255] : [255, 0, 0, 255],
    );
    const tile = downscaleTile(rgba, 48, 16);
    expect(at(tile, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(at(tile, 15, 15)).toEqual([0, 0, 255, 255]);
  });

  it('альфа — только 0 или 255, цвет не темнеет от прозрачных соседей', () => {
    // 32×32: в каждом квадрате 2×2 один непрозрачный белый пиксель из четырёх.
    const sparse = image(32, 32, (x, y) =>
      x % 2 === 0 && y % 2 === 0 ? [255, 255, 255, 255] : [0, 0, 0, 0],
    );
    expect(at(downscaleTile(sparse, 32, 32), 0, 0)[3]).toBe(0);
    // Три из четырёх непрозрачны — пиксель целый и белый, а не серый.
    const dense = image(32, 32, (x, y) =>
      x % 2 === 1 && y % 2 === 1 ? [0, 0, 0, 0] : [255, 255, 255, 255],
    );
    expect(at(downscaleTile(dense, 32, 32), 0, 0)).toEqual([
      255, 255, 255, 255,
    ]);
  });

  it('растягивает картинку меньше плитки', () => {
    const rgba = image(8, 8, () => [10, 20, 30, 255]);
    expect(at(downscaleTile(rgba, 8, 8), 15, 15)).toEqual([10, 20, 30, 255]);
  });
});

describe('meanTextureColor', () => {
  it('средний цвет непрозрачных пикселей всех граней', () => {
    const red = paintTile(() => [200, 0, 0]);
    const holes = paintTile((x) => (x < 8 ? [0, 0, 100] : [255, 255, 255, 0]));
    expect(meanTextureColor({ top: red, side: red, bottom: holes })).toBe(
      // 512 красных и 128 синих непрозрачных пикселей.
      `#${Math.round((200 * 512) / 640)
        .toString(16)
        .padStart(2, '0')}00${Math.round((100 * 128) / 640)
        .toString(16)
        .padStart(2, '0')}`,
    );
  });
});
