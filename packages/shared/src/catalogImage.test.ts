import { describe, expect, it } from 'vitest';
import {
  defaultCatalogThumbCrop,
  catalogThumbCropError,
} from './catalogImage.js';

describe('defaultCatalogThumbCrop', () => {
  it('вписывает длинную картинку целиком, по центру', () => {
    expect(defaultCatalogThumbCrop(800, 200)).toEqual({
      x: 0,
      y: -300,
      size: 800,
    });
    expect(defaultCatalogThumbCrop(300, 300)).toEqual({
      x: 0,
      y: 0,
      size: 300,
    });
  });
});

describe('catalogThumbCropError', () => {
  it('принимает вырез, выходящий за края', () => {
    expect(
      catalogThumbCropError({ x: -50, y: -300, size: 900 }, 800, 200),
    ).toBe(null);
  });

  it('отклоняет вырез мимо картинки и слишком большой', () => {
    expect(catalogThumbCropError({ x: 800, y: 0, size: 100 }, 800, 200)).toBe(
      'Миниатюра не задевает картинку',
    );
    expect(
      catalogThumbCropError({ x: -100, y: -100, size: 100 }, 800, 200),
    ).toBe('Миниатюра не задевает картинку');
    expect(catalogThumbCropError({ x: 0, y: 0, size: 1601 }, 800, 200)).toBe(
      'Миниатюра слишком большая для этой картинки',
    );
    expect(catalogThumbCropError({ x: 0, y: 0, size: 0 }, 800, 200)).toBe(
      'Миниатюра не может быть пустой',
    );
  });
});
