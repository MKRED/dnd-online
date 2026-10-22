import { hash } from './noise';
import {
  mix,
  paintTile,
  scale,
  TILE_SIZE,
  type Rgb,
  type Tile,
} from './pixels';

// Кость: прямая от начала в одну из четырёх сторон (две диагонали), с утолщениями
// на концах. Координаты замыкаются по краю плитки, как шум у других текстур.
interface Bone {
  x: number;
  y: number;
  dx: number;
  dy: number;
  length: number;
}

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

const BONE_COUNT = 14;

const bones: Bone[] = Array.from({ length: BONE_COUNT }, (_, i) => {
  const [dx, dy] = DIRECTIONS[Math.floor(hash(i, 0, 211) * 4)];
  return {
    x: Math.floor(hash(i, 1, 211) * TILE_SIZE),
    y: Math.floor(hash(i, 2, 211) * TILE_SIZE),
    dx,
    dy,
    length: 3 + Math.floor(hash(i, 3, 211) * 5),
  };
});

const wrap = (value: number) => ((value % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;

// Яркость пикселей кучи: 0 — тень между костями; кости, нарисованные позже, лежат сверху.
function boneHeap(): Float32Array {
  const heap = new Float32Array(TILE_SIZE * TILE_SIZE);
  const put = (x: number, y: number, k: number) => {
    heap[wrap(y) * TILE_SIZE + wrap(x)] = k;
  };
  bones.forEach((bone, i) => {
    const tone = 0.72 + hash(i, 4, 212) * 0.4;
    for (let step = 0; step < bone.length; step++) {
      put(bone.x + bone.dx * step, bone.y + bone.dy * step, tone);
    }
    // Суставы на концах: пиксель по бокам от оси, чуть светлее стержня.
    for (const end of [0, bone.length - 1]) {
      const ex = bone.x + bone.dx * end;
      const ey = bone.y + bone.dy * end;
      put(ex - bone.dy, ey + bone.dx, tone * 1.08);
      put(ex + bone.dy, ey - bone.dx, tone * 1.08);
    }
  });
  return heap;
}

const IVORY: Rgb = [236, 226, 200];

// Кости: груда светлых костей, между ними тёмные провалы. Основной цвет — среднее
// груды вместе с тенями, поэтому сами кости светлее его, к слоновой кости.
export function bonesTile(base: Rgb): Tile {
  const heap = boneHeap();
  const bone = mix(base, IVORY, 0.5);
  return paintTile((x, y) => {
    const k = heap[y * TILE_SIZE + x];
    if (k === 0) return scale(base, 0.5 + hash(x, y, 213) * 0.2);
    return scale(bone, k * (0.95 + hash(x, y, 214) * 0.1));
  });
}
