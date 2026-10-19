import { BadRequestException } from '@nestjs/common';
import type { MapSize } from 'shared';
import { describe, expect, it } from 'vitest';
import type { SectionQueryDto } from './dto/section-query.dto.js';
import {
  sectionBox,
  sectionRanges,
  sectionRegion,
  sliceRanges,
  sliceRegion,
} from './slice-region.js';

const SIZE: MapSize = { width: 11, depth: 21 };
// Верхний занятый уровень карты.
const TOP = 12;

function region(query: SectionQueryDto) {
  return sectionRegion(query, sectionRanges(query), SIZE, TOP);
}

describe('sectionRegion', () => {
  it('без диапазонов берёт размер карты по нужной оси и высоту до верхнего блока', () => {
    expect(region({ axis: 'x', at: 3 })).toEqual({
      min: 0,
      max: 20,
      minY: 0,
      maxY: 12,
    });
    expect(region({ axis: 'z', at: 7 })).toEqual({
      min: 0,
      max: 10,
      minY: 0,
      maxY: 12,
    });
  });

  it('заданная высота важнее верхнего блока, горизонталь — из размера', () => {
    expect(region({ axis: 'z', at: 7, minY: 1, maxY: 4 })).toEqual({
      min: 0,
      max: 10,
      minY: 1,
      maxY: 4,
    });
  });

  it('одна граница без пары — ошибка запроса', () => {
    expect(() => region({ axis: 'x', at: 0, min: 1 })).toThrow(
      BadRequestException,
    );
  });

  it('слишком большой разрез отклоняется до загрузки чанков', () => {
    expect(() =>
      region({ axis: 'x', at: 0, min: 0, max: 1_000_000, minY: 0, maxY: 1 }),
    ).toThrow(BadRequestException);
  });

  it('ящик разреза лежит в плоскости at', () => {
    const query: SectionQueryDto = { axis: 'x', at: 3 };
    expect(sectionBox(query, region(query))).toEqual({
      min: [3, 0, 0],
      max: [3, 12, 20],
    });
  });
});

describe('sliceRegion', () => {
  it('без прямоугольника берёт всю карту', () => {
    expect(sliceRegion(sliceRanges({ y: 0 }), SIZE)).toEqual({
      minX: 0,
      maxX: 10,
      minZ: 0,
      maxZ: 20,
    });
  });
});

describe('sliceRanges', () => {
  it('прямоугольник среза задаётся целиком', () => {
    expect(() => sliceRanges({ y: 0, minX: 0, maxX: 1 })).toThrow(
      BadRequestException,
    );
  });
});
