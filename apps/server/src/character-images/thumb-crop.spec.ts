import { describe, expect, it } from 'vitest';
import { defaultThumbCrop, thumbCropError } from './thumb-crop.js';

describe('defaultThumbCrop', () => {
  it('берёт наибольший квадрат по центру горизонтальной картинки', () => {
    expect(defaultThumbCrop(1000, 400)).toEqual({ x: 300, y: 0, size: 400 });
  });

  it('у вертикальной картинки сдвигает квадрат к верху', () => {
    expect(defaultThumbCrop(400, 1000)).toEqual({ x: 0, y: 90, size: 400 });
  });

  it('всегда помещается в картинку', () => {
    for (const [width, height] of [
      [1, 1],
      [3, 2],
      [2, 3],
      [2048, 1365],
    ]) {
      const crop = defaultThumbCrop(width, height);
      expect(thumbCropError(crop, width, height)).toBeNull();
    }
  });
});

describe('thumbCropError', () => {
  it('отклоняет вырез, выходящий за края', () => {
    expect(thumbCropError({ x: 0, y: 0, size: 100 }, 100, 100)).toBeNull();
    expect(thumbCropError({ x: 1, y: 0, size: 100 }, 100, 100)).not.toBeNull();
    expect(thumbCropError({ x: 0, y: 50, size: 60 }, 100, 100)).not.toBeNull();
  });
});
