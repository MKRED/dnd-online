import { useRef, useState } from 'react';
import {
  modelCellKey,
  type ModelCellKind,
  type Vec3,
  type VoxelModelFields,
} from 'shared';
import type { MeshChange } from '../voxelGeometry';
import { brushIndices, type BrushSize, type Mirror } from '../voxelBrush';
import {
  gridFromFields,
  gridToFields,
  lostByResize,
  paletteValue,
  resizeGrid,
  rotateGrid,
  voxelAt,
  writeVoxels,
  type VoxelGrid,
} from '../voxelGrid';
import {
  applyStep,
  emptyHistory,
  pushStep,
  type VoxelHistory,
  type VoxelStep,
} from '../voxelHistory';
import { touchedCells } from '../voxelMesh';
import { cellOfVoxel, placeTarget, type VoxelHit } from '../voxelRaycast';

export type VoxelTool = 'place' | 'erase' | 'paint' | 'picker' | 'cells';
// Свойство клетки, которое ставит режим «Клетки»; auto — убрать своё, «как есть».
export type CellTool = ModelCellKind | 'auto';

// Состояние редактора модели. Мазок меняет воксели сетки на месте (копия 2 МБ на каждый
// шаг указателя была бы слишком дорогой) — React узнаёт о правке по номеру версии, а
// сцена пересобирает только тронутые клетки. Новый объект сетки — только у размера,
// поворота и свойств клеток.
export function useVoxelEditor(
  initial: VoxelModelFields,
  initialColor: string,
) {
  const [grid, setGrid] = useState(() => gridFromFields(initial));
  const [history, setHistory] = useState<VoxelHistory>(emptyHistory);
  const [change, setChange] = useState<MeshChange>({
    version: 0,
    cells: 'all',
  });
  const [tool, setTool] = useState<VoxelTool>('place');
  const [color, setColor] = useState(initialColor);
  const [brush, setBrush] = useState<BrushSize>(1);
  const [mirror, setMirror] = useState<Mirror>({ x: false, z: false });
  const [cellTool, setCellTool] = useState<CellTool>('stand');
  const [sliceTop, setSliceTop] = useState(() => grid.dims[1]);
  const [notice, setNotice] = useState<string | null>(null);
  // Мазок: что было в тронутых вокселях до него — для отмены одним шагом.
  const stroke = useRef<Map<number, number> | null>(null);

  const changed = (cells: Vec3[] | 'all') =>
    setChange((c) => ({ version: c.version + 1, cells }));

  const record = (step: VoxelStep) => setHistory((h) => pushStep(h, step));

  // Новая сетка целиком (размер, поворот, клетки): шаг отмены — сетки до и после.
  const replaceGrid = (next: VoxelGrid) => {
    record({ kind: 'grid', before: grid, after: next });
    setGrid(next);
    setSliceTop((top) => Math.min(Math.max(top, 1), next.dims[1]));
    changed('all');
  };

  const strokeValue = (): number | null => {
    if (tool === 'erase') return 0;
    const value = paletteValue(grid, color);
    if (value === null)
      setNotice('В палитре модели уже 255 цветов — красьте теми, что есть.');
    return value;
  };

  const touch = (at: Vec3, value: number, onlyFilled: boolean) => {
    const g = grid;
    const indices = brushIndices(g, at, brush, mirror).filter((index) => {
      const current = g.voxels[index];
      // «Ставить» не перекрашивает соседей под большой кистью, «Красить» — не ставит.
      if (tool === 'place' && current) return false;
      if (onlyFilled && !current) return false;
      return current !== value;
    });
    if (!indices.length) return;
    const before = stroke.current!;
    for (const index of indices)
      if (!before.has(index)) before.set(index, g.voxels[index]);
    writeVoxels(g, indices, () => value);
    changed(touchedCells(g, indices));
  };

  const setCell = (hit: VoxelHit) => {
    const cell = cellOfVoxel(hit.at);
    const key = modelCellKey(...cell);
    const cells = { ...grid.cells };
    if (cellTool === 'auto') delete cells[key];
    else cells[key] = cellTool;
    if (cells[key] === grid.cells[key]) return;
    replaceGrid({ ...grid, cells });
  };

  const strokeStart = (hit: VoxelHit) => {
    setNotice(null);
    if (tool === 'cells') return setCell(hit);
    if (tool === 'picker') {
      const value = hit.kind === 'voxel' ? voxelAt(grid, hit.at) : 0;
      if (value) setColor(grid.palette[value - 1]);
      setTool('place');
      return;
    }
    const value = strokeValue();
    if (value === null) return;
    stroke.current = new Map();
    if (tool === 'place') touch(placeTarget(hit), value, false);
    else if (hit.kind === 'voxel') touch(hit.at, value, tool === 'paint');
  };

  // Стирание и покраска идут мазком; «Ставить» — по клику, иначе кубики под
  // указателем росли бы к камере.
  const strokeMove = (hit: VoxelHit) => {
    if (!stroke.current || tool === 'place' || hit.kind !== 'voxel') return;
    const value = strokeValue();
    if (value !== null) touch(hit.at, value, tool === 'paint');
  };

  const strokeEnd = () => {
    const before = stroke.current;
    stroke.current = null;
    if (!before?.size) return;
    const indices = [...before.keys()];
    record({
      kind: 'voxels',
      indices,
      before: Uint8Array.from(before.values()),
      after: Uint8Array.from(indices.map((i) => grid.voxels[i])),
    });
  };

  // Второй палец посреди мазка — это поворот камеры: мазок откатывается.
  const strokeCancel = () => {
    const before = stroke.current;
    stroke.current = null;
    if (!before?.size) return;
    const indices = [...before.keys()];
    writeVoxels(grid, indices, (index) => before.get(index)!);
    changed(touchedCells(grid, indices));
  };

  const move = (direction: 'undo' | 'redo') => {
    const { past, future } = history;
    const from = direction === 'undo' ? past : future;
    const step = from[from.length - 1];
    if (!step) return;
    const next = applyStep(grid, step, direction);
    setGrid(next);
    setHistory(
      direction === 'undo'
        ? { past: past.slice(0, -1), future: [...future, step] }
        : { past: [...past, step], future: future.slice(0, -1) },
    );
    if (step.kind === 'grid') {
      setSliceTop((top) => Math.min(top, next.dims[1]));
      changed('all');
    } else changed(touchedCells(next, step.indices));
  };

  // Новый размер; урезание с вокселями спрашивает (confirm — снаружи).
  const resize = (size: Vec3, confirm: (lost: number) => boolean) => {
    const lost = lostByResize(grid, size);
    if (lost && !confirm(lost)) return false;
    const grew = size[1] > grid.size[1];
    replaceGrid(resizeGrid(grid, size));
    // Выросла в высоту — срез открывает и новые слои.
    if (grew) setSliceTop(size[1] * 16);
    return true;
  };

  return {
    grid,
    change,
    tool,
    setTool,
    color,
    chooseColor: (next: string) => {
      setColor(next);
      if (tool === 'erase' || tool === 'picker' || tool === 'cells')
        setTool('place');
    },
    brush,
    setBrush,
    mirror,
    setMirror,
    cellTool,
    setCellTool,
    sliceTop,
    setSliceTop: (top: number) => {
      setSliceTop(top);
      changed('all');
    },
    notice,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => move('undo'),
    redo: () => move('redo'),
    dirty: history.past.length > 0,
    strokeStart,
    strokeMove,
    strokeEnd,
    strokeCancel,
    resize,
    rotate: () => replaceGrid(rotateGrid(grid)),
    result: () => gridToFields(grid),
  };
}

export type VoxelEditorState = ReturnType<typeof useVoxelEditor>;
