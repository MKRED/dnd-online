import { Path, Shape, ShapeGeometry } from 'three';

// Фигуры подставки в долях стороны места: подставка занимает 0,92 стороны, взгляд —
// к северу (+y фигуры, после поворота на пол это −z) при повороте 0.
const HALF = 0.46;
// Вершина «носа» круглой подставки от центра и ширина светлой окантовки по краю.
const NOSE_TIP = HALF * 1.5;
const RIM = 0.035;
// Шеврон взгляда: вершина, плечо, толщина и тёмная обводка вокруг него.
const CHEVRON = { tip: 0.62, arm: 0.1, thick: 0.06, outline: 0.025 };

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

// Светлая окантовка по краю круглой подставки: та же фигура с вырезом на ширину RIM
// (у выреза нос короче, чтобы окантовка у острия была не тоньше, чем по кругу).
export function roundRimGeometry(withNose: boolean) {
  const shape = new Shape();
  if (withNose) {
    dropPath(shape, HALF, NOSE_TIP);
    shape.holes.push(dropPath(new Path(), HALF - RIM, NOSE_TIP - RIM * 1.9));
  } else {
    circlePath(shape, HALF, false);
    shape.holes.push(circlePath(new Path(), HALF - RIM, true));
  }
  return new ShapeGeometry(shape, 48);
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

function chevron(tip: number, arm: number, thick: number) {
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

// Шеврон взгляда остриём к северу.
export function chevronGeometry() {
  return chevron(CHEVRON.tip, CHEVRON.arm, CHEVRON.thick);
}

// Тёмная обводка шеврона: тот же шеврон, раздутый на outline во все стороны
// (у острия под 45° раздутие по вертикали — outline·√2).
export function chevronOutlineGeometry() {
  const { tip, arm, thick, outline } = CHEVRON;
  return chevron(
    tip + outline * Math.SQRT2,
    arm + outline,
    thick + outline * 2 * Math.SQRT2,
  );
}
