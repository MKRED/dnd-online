import { BadRequestException } from '@nestjs/common';
import {
  MAX_SLICE_CELLS,
  type Box3,
  type SectionRegion,
  type SliceRegion,
} from 'shared';
import type { SectionQueryDto } from './dto/section-query.dto.js';
import type { SliceQueryDto } from './dto/slice-query.dto.js';

// Прямоугольники среза и разреза из параметров запроса. Что не задано в запросе,
// берётся из границ карты. Размер проверяется до загрузки чанков: огромный
// прямоугольник не должен тянуть пол-карты из БД.

type Range = [number, number];

// Диапазон задаётся парой целиком или не задаётся: одна граница без второй — скорее
// всего ошибка, а не «до края карты».
function range(
  lo: number | undefined,
  hi: number | undefined,
  names: string,
): Range | null {
  if (lo === undefined && hi === undefined) return null;
  if (lo === undefined || hi === undefined) {
    throw new BadRequestException(`${names} задаются вместе`);
  }
  return [lo, hi];
}

function assertArea([lo1, hi1]: Range, [lo2, hi2]: Range, hint: string) {
  const width = hi1 - lo1 + 1;
  const height = hi2 - lo2 + 1;
  if (width < 1 || height < 1 || width * height > MAX_SLICE_CELLS) {
    throw new BadRequestException(
      `Срез ${width}×${height} — нужна область от 1 до ${MAX_SLICE_CELLS} клеток. Уточните ${hint}.`,
    );
  }
}

// Диапазоны из запроса; null — «не задано, нужны границы карты».
export function sliceRanges(query: SliceQueryDto) {
  const x = range(query.minX, query.maxX, 'minX и maxX');
  const z = range(query.minZ, query.maxZ, 'minZ и maxZ');
  if (!x !== !z) {
    throw new BadRequestException(
      'Прямоугольник среза задаётся целиком: minX, maxX, minZ, maxZ',
    );
  }
  return { x, z };
}

// bounds обязателен, если в запросе прямоугольника нет (вызывающий проверяет пустую карту).
export function sliceRegion(
  { x, z }: ReturnType<typeof sliceRanges>,
  bounds: Box3 | null,
): SliceRegion {
  const xs = x ?? [bounds!.min[0], bounds!.max[0]];
  const zs = z ?? [bounds!.min[2], bounds!.max[2]];
  assertArea(xs, zs, 'minX, maxX, minZ, maxZ');
  return { minX: xs[0], maxX: xs[1], minZ: zs[0], maxZ: zs[1] };
}

// У разреза горизонтальный диапазон и высота задаются независимо друг от друга.
export function sectionRanges(query: SectionQueryDto) {
  return {
    across: range(query.min, query.max, 'min и max'),
    height: range(query.minY, query.maxY, 'minY и maxY'),
  };
}

export function sectionRegion(
  query: SectionQueryDto,
  { across, height }: ReturnType<typeof sectionRanges>,
  bounds: Box3 | null,
): SectionRegion {
  // Столбцы разреза по x идут вдоль z, разреза по z — вдоль x.
  const acrossAxis = query.axis === 'x' ? 2 : 0;
  const a = across ?? [bounds!.min[acrossAxis], bounds!.max[acrossAxis]];
  const h = height ?? [bounds!.min[1], bounds!.max[1]];
  assertArea(a, h, 'min, max, minY, maxY');
  return { min: a[0], max: a[1], minY: h[0], maxY: h[1] };
}

// Клетки, которые читает разрез, — чтобы загрузить только нужные чанки.
export function sectionBox(
  { axis, at }: SectionQueryDto,
  r: SectionRegion,
): Box3 {
  return axis === 'x'
    ? { min: [at, r.minY, r.min], max: [at, r.maxY, r.max] }
    : { min: [r.min, r.minY, at], max: [r.max, r.maxY, at] };
}
