import { describe, expect, it } from 'vitest';
import { defaultItemThumbCrop, itemThumbCropError } from './itemThumbCrop.js';

describe('defaultItemThumbCrop', () => {
  it('вписывает длинную картинку целиком, по центру', () => {
    expect(defaultItemThumbCrop(800, 200)).toEqual({
      x: 0,
      y: -300,
      size: 800,
    });
    expect(defaultItemThumbCrop(300, 300)).toEqual({ x: 0, y: 0, size: 300 });
  });
});

describe('itemThumbCropError', () => {
  it('принимает вырез, выходящий за края', () => {
    expect(itemThumbCropError({ x: -50, y: -300, size: 900 }, 800, 200)).toBe(
      null,
    );
  });

  it('отклоняет вырез мимо картинки и слишком большой', () => {
    expect(itemThumbCropError({ x: 800, y: 0, size: 100 }, 800, 200)).toBe(
      'Миниатюра не задевает картинку',
    );
    expect(itemThumbCropError({ x: -100, y: -100, size: 100 }, 800, 200)).toBe(
      'Миниатюра не задевает картинку',
    );
    expect(itemThumbCropError({ x: 0, y: 0, size: 1601 }, 800, 200)).toBe(
      'Миниатюра слишком большая для этой картинки',
    );
    expect(itemThumbCropError({ x: 0, y: 0, size: 0 }, 800, 200)).toBe(
      'Миниатюра не может быть пустой',
    );
  });
});
