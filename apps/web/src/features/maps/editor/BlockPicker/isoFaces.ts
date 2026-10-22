import type { ShapeBox } from 'shared';

export type IsoFaceKind = 'top' | 'south' | 'east';

export interface IsoFace {
  points: string;
  fill: string;
  kind: IsoFaceKind;
  // Плоскость грани: y верха, z южной грани, x восточной (для текстуры на значке).
  plane: number;
}

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

// Изометрия с юго-востока: видны верх, южная (+z) и восточная (+x) грани. Клетка
// 1 × 1 × 1 с центром в нуле ложится в квадрат примерно от −1 до 1.
function project(x: number, y: number, z: number): string {
  const u = (x - z) * COS30;
  const v = (x + z - 1) * SIN30 - (y - 0.5);
  return `${u.toFixed(3)},${v.toFixed(3)}`;
}

// Осветлить или затемнить цвет #rrggbb: k > 0 — к белому, k < 0 — к чёрному.
export function shade(hex: string, k: number): string {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const target = k > 0 ? 255 : 0;
  const mixed = channels.map((c) => Math.round(c + (target - c) * Math.abs(k)));
  return `rgb(${mixed.join(' ')})`;
}

// Грани коробок в порядке рисования: от дальних к ближним (по сумме нижних углов),
// поэтому ближние перекрывают дальние без буфера глубины. Для форм из нескольких
// коробок, что не пересекаются, этого хватает.
export function isoFaces(boxes: readonly ShapeBox[], color: string): IsoFace[] {
  const top = shade(color, 0.25);
  const south = color;
  const east = shade(color, -0.25);
  return [...boxes]
    .sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
    .flatMap(([x0, y0, z0, x1, y1, z1]) => [
      {
        points: [
          project(x0, y1, z0),
          project(x1, y1, z0),
          project(x1, y1, z1),
          project(x0, y1, z1),
        ].join(' '),
        fill: top,
        kind: 'top' as const,
        plane: y1,
      },
      {
        points: [
          project(x0, y0, z1),
          project(x1, y0, z1),
          project(x1, y1, z1),
          project(x0, y1, z1),
        ].join(' '),
        fill: south,
        kind: 'south' as const,
        plane: z1,
      },
      {
        points: [
          project(x1, y0, z0),
          project(x1, y0, z1),
          project(x1, y1, z1),
          project(x1, y1, z0),
        ].join(' '),
        fill: east,
        kind: 'east' as const,
        plane: x1,
      },
    ]);
}

// Аффинное преобразование картинки 1 × 1 на грань клетки в изометрии (для <image>):
// s и t картинки — её x и y, верх картинки — верх блока на боковых гранях и север на
// верхней. Картинка ложится на всю грань клетки, а неполную форму обрезает контур
// грани — так плита показывает нижнюю половину плитки, как на сцене.
export function faceImageTransform({ kind, plane }: IsoFace): string {
  const c = COS30.toFixed(4);
  if (kind === 'top') return `matrix(${c} 0.5 -${c} 0.5 0 ${-plane})`;
  if (kind === 'south') {
    return `matrix(${c} 0.5 0 1 ${(-plane * COS30).toFixed(4)} ${plane / 2 - 1})`;
  }
  return `matrix(${c} -0.5 0 1 ${((plane - 1) * COS30).toFixed(4)} ${plane / 2 - 0.5})`;
}
