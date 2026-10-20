import { Path, Shape, ShapeGeometry } from 'three';

// Фигуры подставки в долях стороны места: подставка занимает 0,92 стороны, взгляд —
// к северу (+y фигуры, после поворота на пол это −z) при повороте 0.
export const HALF = 0.46;
// Вершина «носа» круглой подставки от центра и ширина светлой окантовки по краю.
const NOSE_TIP = HALF * 1.5;
const RIM = 0.035;

// Капля: круг радиуса r и острый нос к северу с вершиной на расстоянии tip от центра.
// Стороны носа — касательные к кругу, так обод переходит в нос без излома.
function dropPath<T extends Path>(path: T, r: number, tip: number): T {
  const a = Math.acos(r / tip);
  // Отрезок до точки касания обязателен: дуга сразу после moveTo теряет эту точку.
  path.moveTo(0, tip);
  path.lineTo(r * Math.sin(a), r * Math.cos(a));
  path.absarc(0, 0, r, Math.PI / 2 - a, Math.PI / 2 + a, true);
  path.closePath();
  return path;
}

function circlePath<T extends Path>(path: T, r: number, clockwise: boolean) {
  path.absarc(0, 0, r, 0, Math.PI * 2, clockwise);
  return path;
}

// Круглая подставка существа: с носом взгляда или простой круг.
export function roundBaseGeometry(withNose: boolean) {
  const shape = withNose
    ? dropPath(new Shape(), HALF, NOSE_TIP)
    : circlePath(new Shape(), HALF, false);
  return new ShapeGeometry(shape, 48);
}

// Светлая окантовка капли: та же фигура с вырезом на ширину RIM (у выреза нос
// короче, чтобы окантовка у острия была не тоньше, чем по кругу).
export function dropRimGeometry() {
  const shape = dropPath(new Shape(), HALF, NOSE_TIP);
  shape.holes.push(dropPath(new Path(), HALF - RIM, NOSE_TIP - RIM * 1.9));
  return new ShapeGeometry(shape, 48);
}

// Кольцо между радиусами inner и outer.
export function ringGeometry(inner: number, outer: number) {
  const shape = circlePath(new Shape(), outer, false);
  shape.holes.push(circlePath(new Path(), inner, true));
  return new ShapeGeometry(shape, 64);
}

// Нос квадратной плитки старта. Плитка не поворачивается, поэтому нос строится уже
// повёрнутым: треугольник опирается на границу квадрата по направлению взгляда (на
// диагоналях — на угол) и с плиткой не перекрывается, иначе прозрачность удвоилась бы.
export function tileNoseGeometry(angle: number) {
  const dirX = -Math.sin(angle);
  const dirY = Math.cos(angle);
  const edge = HALF / Math.max(Math.abs(dirX), Math.abs(dirY));
  const baseX = dirX * edge;
  const baseY = dirY * edge;
  const width = 0.2;
  const length = 0.17;
  const shape = new Shape();
  shape.moveTo(baseX + dirX * length, baseY + dirY * length);
  shape.lineTo(baseX - dirY * width, baseY + dirX * width);
  shape.lineTo(baseX + dirY * width, baseY - dirX * width);
  shape.closePath();
  return new ShapeGeometry(shape);
}

export interface ChevronSize {
  // Вершина от центра, плечо и толщина.
  tip: number;
  arm: number;
  thick: number;
}

// Шеврон остриём к северу.
export function chevronGeometry({ tip, arm, thick }: ChevronSize) {
  const shape = new Shape();
  shape.moveTo(0, tip);
  shape.lineTo(arm, tip - arm);
  shape.lineTo(arm, tip - arm - thick);
  shape.lineTo(0, tip - thick);
  shape.lineTo(-arm, tip - arm - thick);
  shape.lineTo(-arm, tip - arm);
  shape.closePath();
  return new ShapeGeometry(shape);
}

// Тёмная обводка шеврона: тот же шеврон, раздутый на outline во все стороны
// (у острия под 45° раздутие по вертикали — outline·√2).
export function chevronOutlineGeometry(size: ChevronSize, outline: number) {
  return chevronGeometry({
    tip: size.tip + outline * Math.SQRT2,
    arm: size.arm + outline,
    thick: size.thick + outline * 2 * Math.SQRT2,
  });
}

// Треугольник остриём к северу: основание на y = from, вершина на y = to.
export function triangleGeometry(from: number, to: number, halfWidth: number) {
  const shape = new Shape();
  shape.moveTo(0, to);
  shape.lineTo(halfWidth, from);
  shape.lineTo(-halfWidth, from);
  shape.closePath();
  return new ShapeGeometry(shape);
}

// Засечка компаса: узкий прямоугольник поперёк обода к северу.
export function tickGeometry(from: number, to: number, width: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, from);
  shape.lineTo(width / 2, from);
  shape.lineTo(width / 2, to);
  shape.lineTo(-width / 2, to);
  shape.closePath();
  return new ShapeGeometry(shape);
}
