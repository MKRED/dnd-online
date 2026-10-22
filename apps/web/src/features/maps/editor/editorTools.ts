import {
  AIR_NAME,
  boxFromCorners,
  type Box3,
  type BlockOp,
  type Point3,
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
  'objects',
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
  objects: 'Объекты',
};

// Инструменты, которым нужны два угла области.
export type RegionTool = 'fill' | 'hollow' | 'replace';

export function isRegionTool(tool: EditorTool): tool is RegionTool {
  return tool === 'fill' || tool === 'hollow' || tool === 'replace';
}

// Клетки под курсором: hit — блок, в который попал луч (null для земли),
// place — соседняя клетка со стороны грани, куда встанет новый блок. point и
// normal — сама точка попадания и целая нормаль грани: по ним проверка хода
// решает, куда сместить тело крупного существа.
export interface PickedCells {
  hit: Vec3 | null;
  place: Vec3;
  point: Point3;
  normal: Vec3;
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
  return { hit: ground ? null : hit, place, point: [...point], normal: n };
}

// С какой клеткой работает инструмент: новые блоки и области строятся в соседней
// клетке, а ластик и замена берут уже стоящий блок. Объект ставится в клетку ног —
// над блоком, по которому кликнули.
export function toolCell(tool: EditorTool, cells: PickedCells): Vec3 | null {
  return tool === 'place' ||
    tool === 'fill' ||
    tool === 'hollow' ||
    tool === 'objects'
    ? cells.place
    : cells.hit;
}

// Клетка, с которой работает инструмент сцены под курсором.
export function sceneEditorCell(
  editor: SceneEditor,
  cells: PickedCells,
): Vec3 | null {
  return editor.pickCell
    ? editor.pickCell(cells)
    : toolCell(editor.tool, cells);
}

// Область от первого угла сцены до cell; null — первый угол ещё не выбран.
export function anchorBox(editor: SceneEditor, cell: Vec3): Box3 | null {
  if (!editor.anchor) return null;
  return editor.region
    ? editor.region(editor.anchor, cell)
    : regionBox(editor.anchor, cell, editor.height);
}

// Северо-западная клетка места объекта со стороной span, когда курсор над клеткой
// cell: курсор — в середине места, как у фигурки крупного существа.
export function spanAnchor(cell: Vec3, span: number): Vec3 {
  const back = Math.floor((span - 1) / 2);
  return [cell[0] - back, cell[1], cell[2] - back];
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
): BlockOp {
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
): BlockOp {
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
  // Клетка инструмента под курсором, если она не та, что даёт toolCell: ластик стены и
  // области берёт угол и на земле.
  pickCell?: (cells: PickedCells) => Vec3 | null;
  // Область от первого угла до курсора; без него — regionBox с высотой. Подсветка и
  // размер в строке координат считаются той же функцией, что и операция.
  region?: (anchor: Vec3, cell: Vec3) => Box3;
  // Подсветка проверки хода вместо клеток: тело там, где встанет фигурка, путь
  // до него и цена.
  preview?: (cells: PickedCells) => WalkHover | null;
  // Сторона места в клетках у ставящегося или переносимого объекта: подсветка — во всё
  // место, курсор в его середине (spanAnchor). Без него — одна клетка.
  span?: number;
  // Клетки под курсором сменились (null — курсор ушёл со сцены): фигурку тянут, и при
  // отпускании ей нужна последняя клетка (docs/plan/done/game.md, этап 7).
  onHover?: (cells: PickedCells | null) => void;
}
