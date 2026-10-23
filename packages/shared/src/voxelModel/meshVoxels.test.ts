import { describe, expect, it } from 'vitest';
import { fitMeshTriangles, voxelizeTriangles } from './meshVoxels.js';
import { isModelMesh } from './modelMesh.js';
import { voxelIndex } from './voxelModel.js';
import { readVoxelModelFields } from './voxelModelCheck.js';

// Загруженная модель в воксели (docs/plan/blocks.md, этап 9).

// Коробка из 12 треугольников; без крышки — 10 (файл для печати с дырой).
function box(
  [x0, y0, z0]: number[],
  [x1, y1, z1]: number[],
  open = false,
): Float32Array {
  const v = (x: number, y: number, z: number) => [x, y, z];
  const quads = [
    [v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)], // низ
    [v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0), v(x1, y0, z0)], // север
    [v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], // юг
    [v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0)], // запад
    [v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), v(x1, y0, z1)], // восток
    ...(open
      ? []
      : [[v(x0, y1, z0), v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0)]]),
  ];
  return new Float32Array(
    quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]),
  );
}

const count = (voxels: Uint8Array) => voxels.reduce((sum, v) => sum + v, 0);
const at = (voxels: Uint8Array, x: number, y: number, z: number) =>
  voxels[voxelIndex([16, 16, 16], x, y, z)];

describe('fitMeshTriangles', () => {
  it('вписывает с сохранением пропорций: стоит на дне, по середине по x и z', () => {
    // Столб 1×2×1 в клетку 1×1×1: высота упирается в 16 вокселей, ширина — 8.
    const fitted = fitMeshTriangles(
      box([0, 0, 0], [1, 2, 1]),
      { up: 'y', turn: 0 },
      [1, 1, 1],
    );
    const xs = [...fitted].filter((_, i) => i % 3 === 0);
    const ys = [...fitted].filter((_, i) => i % 3 === 1);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([0, 16]);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([4, 12]);
  });

  it('ось Z файла — вверх, поворот на четверть — север на восток', () => {
    // Лежит вдоль Z файла: после up z встаёт столбом.
    const standing = fitMeshTriangles(
      box([0, 0, 0], [1, 1, 4]),
      { up: 'z', turn: 0 },
      [1, 1, 1],
    );
    const ys = [...standing].filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(16);
    // Длинная по z (север—юг) после поворота на 90° — длинная по x.
    const turned = fitMeshTriangles(
      box([0, 0, 0], [1, 1, 4]),
      { up: 'y', turn: 1 },
      [1, 1, 1],
    );
    const xs = [...turned].filter((_, i) => i % 3 === 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(16);
  });
});

describe('voxelizeTriangles', () => {
  it('замкнутый куб во всю клетку — все воксели', () => {
    const voxels = voxelizeTriangles(box([0, 0, 0], [16, 16, 16]), [1, 1, 1]);
    expect(count(voxels)).toBe(16 ** 3);
  });

  it('куб поменьше — ровно его воксели', () => {
    const voxels = voxelizeTriangles(box([4, 0, 4], [12, 8, 12]), [1, 1, 1]);
    expect(count(voxels)).toBe(8 * 8 * 8);
    expect(at(voxels, 8, 4, 8)).toBe(1);
    expect(at(voxels, 2, 4, 8)).toBe(0);
    expect(at(voxels, 8, 10, 8)).toBe(0);
  });

  it('ящик без крышки — хотя бы стенки и дно, без мусора снаружи', () => {
    const voxels = voxelizeTriangles(
      box([4, 0, 4], [12, 8, 12], true),
      [1, 1, 1],
    );
    expect(at(voxels, 4, 4, 8)).toBe(1);
    expect(at(voxels, 8, 0, 8)).toBe(1);
    expect(at(voxels, 2, 4, 8)).toBe(0);
    expect(count(voxels)).toBeLessThanOrEqual(8 * 8 * 8);
  });

  it('за пределами клеток не пишет', () => {
    const voxels = voxelizeTriangles(box([-8, 0, -8], [24, 40, 24]), [1, 1, 1]);
    expect(voxels.length).toBe(16 ** 3);
    expect(count(voxels)).toBe(16 ** 3);
  });
});

describe('файл модели в записи', () => {
  const mesh = {
    format: 'stl',
    version: 2,
    color: '#9a948a',
    fit: { up: 'z', turn: 1 },
  };

  it('проверка полей файла', () => {
    expect(isModelMesh(mesh)).toBe(true);
    expect(isModelMesh({ ...mesh, format: 'obj' })).toBe(false);
    expect(isModelMesh({ ...mesh, fit: { up: 'x', turn: 0 } })).toBe(false);
    expect(isModelMesh({ ...mesh, version: 0 })).toBe(false);
  });

  it('читается из записи вместе с вокселями; испорченный — без файла', () => {
    const extra = { size: [1, 1, 1], palette: [], voxels: 'AIAg', cells: {} };
    expect(readVoxelModelFields({ ...extra, mesh }).mesh).toEqual(mesh);
    expect(
      readVoxelModelFields({ ...extra, mesh: { format: 'x' } }),
    ).not.toHaveProperty('mesh');
  });
});
