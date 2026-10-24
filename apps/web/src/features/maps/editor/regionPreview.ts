import {
  AIR_NAME,
  cellTypeId,
  readCell,
  type Box3,
  type SizedMapState,
  type Vec3,
} from 'shared';
import type { EditorTool } from './editorTools';
import type { EraseMode } from './eraseModes';

// Что сделает второй щелчок, пока курсор над клеткой (docs/plan/scene-page.md, этап 3):
// размер области и сколько блоков изменится — до щелчка, а не после.
export interface RegionPreview {
  // Ширина (x) × глубина (z) × высота (y), как размер карты.
  size: Vec3;
  // Сколько блоков поставится, сотрётся или заменится; null — область слишком большая,
  // чтобы считать на каждое движение мыши.
  blocks: number | null;
  // Пустота внутри коробки, тем же порядком; null — у других инструментов или стен нет.
  inner: Vec3 | null;
}

// Больше клеток не перебираем на движение мыши: 64³ — карта целиком у большинства.
export const PREVIEW_CELL_LIMIT = 262_144;

const sizeOf = ({ min, max }: Box3): Vec3 =>
  [0, 2, 1].map((axis) => max[axis] - min[axis] + 1) as unknown as Vec3;

const volume = ([w, d, h]: Vec3) => w * d * h;

// Сколько клеток области подходит под условие; null — область больше предела.
function countCells(
  state: SizedMapState,
  { min, max }: Box3,
  test: (name: string) => boolean,
): number | null {
  if (volume(sizeOf({ min, max })) > PREVIEW_CELL_LIMIT) return null;
  let count = 0;
  for (let y = min[1]; y <= max[1]; y++)
    for (let z = min[2]; z <= max[2]; z++)
      for (let x = min[0]; x <= max[0]; x++) {
        const name =
          state.palette[cellTypeId(readCell(state.store, [x, y, z]))] ??
          AIR_NAME;
        if (test(name)) count++;
      }
  return count;
}

// Больше клеток подсветки «Замены» не рисуем: дальше хватит рамки и числа на плашке.
export const MATCH_CELL_LIMIT = 4096;

// Клетки области, которые заменит «Замена»: с тем же блоком, что в первом углу (макет
// «П6», docs/plan/scene-page.md, этап 3). null — область или совпадений слишком много.
export function matchingCells(
  state: SizedMapState,
  { min, max }: Box3,
  match: string | null,
): Vec3[] | null {
  if (volume(sizeOf({ min, max })) > PREVIEW_CELL_LIMIT) return null;
  const want = match ?? AIR_NAME;
  const cells: Vec3[] = [];
  for (let y = min[1]; y <= max[1]; y++)
    for (let z = min[2]; z <= max[2]; z++)
      for (let x = min[0]; x <= max[0]; x++) {
        const name =
          state.palette[cellTypeId(readCell(state.store, [x, y, z]))] ??
          AIR_NAME;
        if (name !== want) continue;
        if (cells.length === MATCH_CELL_LIMIT) return null;
        cells.push([x, y, z]);
      }
  return cells;
}

interface PreviewInput {
  tool: EditorTool;
  eraseMode: EraseMode;
  // Область от первого угла до курсора — той же функцией, что и операция.
  box: Box3;
  // У замены: какой блок в первом углу — заменяются только такие.
  match: string | null;
}

export function regionPreview(
  state: SizedMapState,
  { tool, eraseMode, box, match }: PreviewInput,
): RegionPreview | null {
  const size = sizeOf(box);
  switch (tool) {
    case 'fill':
      return { size, blocks: volume(size), inner: null };
    case 'hollow': {
      // Стены, пол и потолок: внутри коробки на клетку с каждой стороны меньше.
      const inner = size.map((n) => n - 2) as unknown as Vec3;
      const hollow = inner.every((n) => n > 0);
      return {
        size,
        blocks: volume(size) - (hollow ? volume(inner) : 0),
        inner: hollow ? inner : null,
      };
    }
    case 'replace':
      return {
        size,
        blocks: countCells(state, box, (name) => name === (match ?? AIR_NAME)),
        inner: null,
      };
    case 'erase':
      return eraseMode === 'plane' || eraseMode === 'region'
        ? {
            size,
            blocks: countCells(state, box, (name) => name !== AIR_NAME),
            inner: null,
          }
        : null;
    default:
      return null;
  }
}

// «5 × 3 × 2»
export const sizeText = (size: Vec3) => size.join(' × ');

// «1 блок», «3 блока», «30 блоков»
export function blocksText(n: number): string {
  const tens = n % 100;
  const ones = n % 10;
  const word =
    tens >= 11 && tens <= 14
      ? 'блоков'
      : ones === 1
        ? 'блок'
        : ones >= 2 && ones <= 4
          ? 'блока'
          : 'блоков';
  return `${n} ${word}`;
}
