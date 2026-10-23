import {
  base64ToBytes,
  bytesToBase64,
  decodeVoxels,
  encodeVoxels,
  modelCellKey,
  MODEL_CELL_VOXELS,
  modelVoxelCount,
  modelVoxelSize,
  voxelIndex,
  type ModelCellKind,
  type Vec3,
  type VoxelModelFields,
} from 'shared';

// Модель в редакторе (docs/plan/blocks.md, этап 8а): воксели распакованы в массив байт,
// размер — в клетках и вокселях. Мазки меняют voxels на месте (отмена хранит разницу, а
// не копии: 128³ — это 2 МБ на шаг); размер, поворот и свойства клеток дают новую сетку.
export interface VoxelGrid {
  size: Vec3;
  dims: Vec3;
  palette: string[];
  voxels: Uint8Array;
  cells: Record<string, ModelCellKind>;
}

export function gridFromFields(fields: VoxelModelFields): VoxelGrid {
  const count = modelVoxelCount(fields.size);
  const bytes = base64ToBytes(fields.voxels);
  return {
    size: fields.size,
    dims: modelVoxelSize(fields.size),
    palette: [...fields.palette],
    // Сервер проверил воксели при сохранении; испорченные читаются пустыми.
    voxels: (bytes && decodeVoxels(bytes, count)) ?? new Uint8Array(count),
    cells: { ...fields.cells },
  };
}

// Поля записи: неиспользуемые цвета уходят из палитры, номера вокселей сдвигаются.
export function gridToFields(grid: VoxelGrid): VoxelModelFields {
  const used = new Set<number>();
  for (const value of grid.voxels) if (value) used.add(value);
  const kept = [...used].sort((a, b) => a - b);
  const remap = new Uint8Array(256);
  kept.forEach((value, i) => (remap[value] = i + 1));
  const voxels = grid.voxels.map((value) => remap[value]);
  return {
    size: grid.size,
    palette: kept.map((value) => grid.palette[value - 1]),
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells: grid.cells,
  };
}

export function inGrid(grid: VoxelGrid, [x, y, z]: Vec3): boolean {
  const [dx, dy, dz] = grid.dims;
  return x >= 0 && y >= 0 && z >= 0 && x < dx && y < dy && z < dz;
}

export function voxelAt(grid: VoxelGrid, at: Vec3): number {
  return inGrid(grid, at) ? grid.voxels[voxelIndex(grid.dims, ...at)] : 0;
}

export function cellHasVoxels(grid: VoxelGrid, [cx, cy, cz]: Vec3): boolean {
  const n = MODEL_CELL_VOXELS;
  for (let y = cy * n; y < (cy + 1) * n; y++)
    for (let z = cz * n; z < (cz + 1) * n; z++) {
      const row = voxelIndex(grid.dims, cx * n, y, z);
      for (let x = 0; x < n; x++) if (grid.voxels[row + x]) return true;
    }
  return false;
}

// Свойство клетки для пути: своё, а без него — «как есть» (с вокселями — препятствие).
export function cellKind(grid: VoxelGrid, cell: Vec3): ModelCellKind {
  return (
    grid.cells[modelCellKey(...cell)] ??
    (cellHasVoxels(grid, cell) ? 'obstacle' : 'free')
  );
}

// Запись вокселей на месте — мазок и его откат (сетка в редакторе не копируется).
export function writeVoxels(
  grid: VoxelGrid,
  indices: number[],
  value: (index: number) => number,
): void {
  for (const index of indices) grid.voxels[index] = value(index);
}

// Номер цвета в палитре (плюс один) — с добавлением нового; null — палитра полна.
export function paletteValue(grid: VoxelGrid, color: string): number | null {
  const found = grid.palette.indexOf(color);
  if (found >= 0) return found + 1;
  if (grid.palette.length >= 255) return null;
  grid.palette.push(color);
  return grid.palette.length;
}

// Цвета, которыми модель уже покрашена, — от частых к редким: дорисовывать теми же.
export function modelColors(grid: VoxelGrid, limit: number): string[] {
  const counts = new Uint32Array(256);
  for (const value of grid.voxels) counts[value]++;
  return grid.palette
    .map((color, i) => ({ color, count: counts[i + 1] }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ color }) => color);
}

// Сколько закрашенных вокселей пропадёт при новом размере — для вопроса перед урезанием.
export function lostByResize(grid: VoxelGrid, size: Vec3): number {
  const dims = modelVoxelSize(size);
  let lost = 0;
  const [dx, dy, dz] = grid.dims;
  for (let y = 0; y < dy; y++)
    for (let z = 0; z < dz; z++)
      for (let x = 0; x < dx; x++)
        if (
          (x >= dims[0] || y >= dims[1] || z >= dims[2]) &&
          grid.voxels[voxelIndex(grid.dims, x, y, z)]
        )
          lost++;
  return lost;
}

const cellsInside = (cells: VoxelGrid['cells'], size: Vec3) =>
  Object.fromEntries(
    Object.entries(cells).filter(([key]) => {
      const [x, y, z] = key.split(',').map(Number);
      return x < size[0] && y < size[1] && z < size[2];
    }),
  );

// Новый размер: модель остаётся у западного, нижнего и северного края, лишнее отрезается.
export function resizeGrid(grid: VoxelGrid, size: Vec3): VoxelGrid {
  const dims = modelVoxelSize(size);
  const voxels = new Uint8Array(modelVoxelCount(size));
  const [mx, my, mz] = grid.dims.map((d, i) => Math.min(d, dims[i]));
  for (let y = 0; y < my; y++)
    for (let z = 0; z < mz; z++) {
      const from = voxelIndex(grid.dims, 0, y, z);
      voxels.set(
        grid.voxels.subarray(from, from + mx),
        voxelIndex(dims, 0, y, z),
      );
    }
  return {
    size,
    dims,
    palette: grid.palette,
    voxels,
    cells: cellsInside(grid.cells, size),
  };
}

// Поворот на 90° по часовой, если смотреть сверху: север (−z, «вперёд») уходит на восток.
// Так автор разворачивает модель лицом вперёд, не перерисовывая её.
export function rotateGrid(grid: VoxelGrid): VoxelGrid {
  const [sx, sy, sz] = grid.size;
  const size: Vec3 = [sz, sy, sx];
  const dims = modelVoxelSize(size);
  const [dx, dy, dz] = grid.dims;
  const voxels = new Uint8Array(grid.voxels.length);
  for (let y = 0; y < dy; y++)
    for (let z = 0; z < dz; z++)
      for (let x = 0; x < dx; x++)
        voxels[voxelIndex(dims, dz - 1 - z, y, x)] =
          grid.voxels[voxelIndex(grid.dims, x, y, z)];
  const cells = Object.fromEntries(
    Object.entries(grid.cells).map(([key, kind]) => {
      const [x, y, z] = key.split(',').map(Number);
      return [modelCellKey(sz - 1 - z, y, x), kind];
    }),
  );
  return { size, dims, palette: grid.palette, voxels, cells };
}
