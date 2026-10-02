import { BadRequestException } from '@nestjs/common';
import type { Box3 } from 'shared';
import { describe, expect, it } from 'vitest';
import type { SectionQueryDto } from './dto/section-query.dto.js';
import {
  sectionBox,
  sectionRanges,
  sectionRegion,
  sliceRanges,
} from './slice-region.js';

const BOUNDS: Box3 = { min: [-2, 0, 5], max: [10, 12, 20] };

function region(query: SectionQueryDto) {
  return sectionRegion(query, sectionRanges(query), BOUNDS);
}

describe('sectionRegion', () => {
  it('без диапазонов берёт границы карты по нужной оси', () => {
    expect(region({ axis: 'x', at: 3 })).toEqual({
      min: 5,
      max: 20,
      minY: 0,
      maxY: 12,
    });
    expect(region({ axis: 'z', at: 7 })).toEqual({
      min: -2,
      max: 10,
      minY: 0,
      maxY: 12,
    });
  });

  it('заданная высота важнее границ, горизонталь — из границ', () => {
    expect(region({ axis: 'z', at: 7, minY: 1, maxY: 4 })).toEqual({
      min: -2,
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
      min: [3, 0, 5],
      max: [3, 12, 20],
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
