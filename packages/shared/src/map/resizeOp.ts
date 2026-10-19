import type { Vec3 } from './coords.js';
import type { MapBoundsLimits, MapSize } from './mapSize.js';
import { MapOpError } from './mapOpError.js';

// Стороны, с которых карту расширяют (число > 0) или сужают (< 0). Верха нет:
// высота у карты динамическая. Север — -z, запад — -x, как в рендере.
export const RESIZE_SIDES = ['north', 'south', 'west', 'east', 'down'] as const;
export type ResizeSide = (typeof RESIZE_SIDES)[number];

// Что делать с блоками, оказавшимися за новой границей на востоке или юге: удалить
// или оставить скрытыми (вернутся, если карту снова расширить). С запада, севера и
// снизу срезанное удаляется всегда — оставить его можно было бы только в
// отрицательных координатах (docs/plan/done/map-editor.md, «Размер карты»).
export const RESIZE_CUTS = ['delete', 'keep'] as const;
export type ResizeCut = (typeof RESIZE_CUTS)[number];

export interface ResizeOp {
  op: 'resize';
  grow: Partial<Record<ResizeSide, number>>;
  cut?: ResizeCut;
}

// Размер после resize; годится ли он, проверяет applyResize.
export function resizedSize(size: MapSize, grow: ResizeOp['grow']): MapSize {
  return {
    width: size.width + (grow.west ?? 0) + (grow.east ?? 0),
    depth: size.depth + (grow.north ?? 0) + (grow.south ?? 0),
  };
}

// Сдвиг всех блоков: место на западе, севере и снизу появляется только так.
export function resizeShift(grow: ResizeOp['grow']): Vec3 {
  return [grow.west ?? 0, grow.down ?? 0, grow.north ?? 0];
}

// Судьба блока, уже сдвинутого в клетку at: ушёл в отрицательные координаты — срезан
// (удаляется всегда), за восточной или южной границей — скрыт или удалён по cut.
export type ResizeFate = 'cut' | 'outside' | 'inside';

export function resizeFate(at: Vec3, size: MapSize): ResizeFate {
  if (at.some((v) => v < 0)) return 'cut';
  return at[0] >= size.width || at[2] >= size.depth ? 'outside' : 'inside';
}

// Разбор из недоверенного JSON. Насколько можно сузить, зависит от размера карты —
// это проверяет применение (applyResize), а здесь только форма и общие пределы.
export function parseResizeOp(
  fields: Record<string, unknown>,
  limits: MapBoundsLimits,
): ResizeOp {
  const grow = fields.grow;
  if (typeof grow !== 'object' || grow === null || Array.isArray(grow)) {
    throw new MapOpError(
      '«grow» должен быть объектом: north, south, west, east, down — сколько клеток добавить (или убрать, если меньше нуля)',
    );
  }
  const parsed: ResizeOp['grow'] = {};
  for (const [side, value] of Object.entries(grow)) {
    if (!RESIZE_SIDES.includes(side as ResizeSide)) {
      throw new MapOpError(
        `Неизвестная сторона «${side}» — бывают north, south, west, east, down`,
      );
    }
    const limit = side === 'down' ? limits.maxHeight : limits.maxSize;
    if (!Number.isSafeInteger(value) || Math.abs(value as number) > limit) {
      throw new MapOpError(
        `«grow.${side}» должно быть целым числом от −${limit} до ${limit}`,
      );
    }
    if (value !== 0) parsed[side as ResizeSide] = value as number;
  }
  const cut = fields.cut;
  if (cut !== undefined && !RESIZE_CUTS.includes(cut as ResizeCut)) {
    throw new MapOpError('«cut» должен быть «delete» или «keep»');
  }
  return { op: 'resize', grow: parsed, cut: cut as ResizeCut | undefined };
}
