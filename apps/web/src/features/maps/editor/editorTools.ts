import {
  AIR_NAME,
  boxFromCorners,
  type Box3,
  type MapOp,
  type Rotation,
  type Vec3,
} from 'shared';
import type { WalkHover } from '../walkTest';

// walk — проверка хода: карту не меняет, водит фигурку по правилам пути.
export const EDITOR_TOOLS = [
  'view',
  'place',
  'erase',
  'fill',
  'hollow',
  'replace',
  'walk',
] as const;
export type EditorTool = (typeof EDITOR_TOOLS)[number];

export const TOOL_LABELS: Record<EditorTool, string> = {
  view: 'Просмотр',
  place: 'Блок',
  erase: 'Ластик',
  fill: 'Заливка',
  hollow: 'Коробка',
  replace: 'Замена',
  walk: 'Ход',
};

// Инструменты, которым нужны два угла области.
export type RegionTool = 'fill' | 'hollow' | 'replace';

export function isRegionTool(tool: EditorTool): tool is RegionTool {
  return tool === 'fill' || tool === 'hollow' || tool === 'replace';
}

// Клетки под курсором: hit — блок, в который попал луч (null для земли),
// place — соседняя клетка со стороны грани, куда встанет новый блок.
export interface PickedCells {
  hit: Vec3 | null;
  place: Vec3;
}

// Луч попал в точку point на грани с нормалью normal (мировые координаты).
// Клетку попадания ищем, чуть отступив внутрь против нормали, а соседнюю — шагом
// по целой нормали от неё. Отступ наружу (point + n·ε) не годится: верх плиты
// лежит на y + 0.5 и попал бы в ту же клетку, что и сама плита.
export function cellsFromHit(
  point: readonly [number, number, number],
  normal: readonly [number, number, number],
  ground: boolean,
): PickedCells {
  const n = normal.map(Math.round) as unknown as Vec3;
  const hit = point.map((value, axis) =>
    Math.floor(value - n[axis] * 1e-3),
  ) as unknown as Vec3;
  const place: Vec3 = [hit[0] + n[0], hit[1] + n[1], hit[2] + n[2]];
  return { hit: ground ? null : hit, place };
}

// С какой клеткой работает инструмент: новые блоки и области строятся в соседней
// клетке, а ластик и замена берут уже стоящий блок.
export function toolCell(tool: EditorTool, cells: PickedCells): Vec3 | null {
  return tool === 'place' || tool === 'fill' || tool === 'hollow'
    ? cells.place
    : cells.hit;
}

// Область между двумя углами; высота наращивает её вверх от верхнего угла,
// чтобы стены и комнаты строились двумя кликами по земле.
export function regionBox(a: Vec3, b: Vec3, height: number): Box3 {
  const box = boxFromCorners(a, b);
  return {
    min: box.min,
    max: [box.max[0], box.max[1] + Math.max(height, 1) - 1, box.max[2]],
  };
}

export interface ToolSettings {
  block: string;
  rotation: Rotation;
  height: number;
}

export function cellOp(
  tool: 'place' | 'erase',
  at: Vec3,
  { block, rotation }: ToolSettings,
): MapOp {
  return tool === 'place'
    ? { op: 'setBlock', at, block, rotation }
    : { op: 'setBlock', at, block: AIR_NAME };
}

// match — имя блока в первом углу замены: заменяются блоки этого типа.
export function regionOp(
  tool: RegionTool,
  a: Vec3,
  b: Vec3,
  { block, rotation, height }: ToolSettings,
  match: string | null,
): MapOp {
  const { min: from, max: to } = regionBox(a, b, height);
  switch (tool) {
    case 'fill':
      return { op: 'fillBox', from, to, block, rotation };
    case 'hollow':
      return { op: 'hollowBox', from, to, block, rotation };
    case 'replace':
      return {
        op: 'replace',
        from,
        to,
        match: match ?? AIR_NAME,
        block,
        rotation,
      };
  }
}

// Что сцене нужно от редактора. null вместо него — режим просмотра.
export interface SceneEditor {
  tool: EditorTool;
  // Первый угол области, если он уже выбран: сцена показывает область до курсора.
  anchor: Vec3 | null;
  height: number;
  onPick: (cells: PickedCells) => void;
  // Подсветка проверки хода вместо клеток: тело там, где встанет фигурка, путь
  // до него и цена.
  preview?: (cells: PickedCells) => WalkHover | null;
}
