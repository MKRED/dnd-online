// Области шага «Применения» (docs/dnd/attacks-and-saves.md): шесть фигур книги 2024 с
// их размерами в футах и точка начала. Геометрия на карте — map/rules/areas. Ключи
// хранятся в базе: добавлять можно, переименовывать — только с миграцией данных.

export type AreaSpec =
  // Длина: ширина конуса на расстоянии от точки начала равна этому расстоянию.
  | { shape: 'cone'; length: number }
  // Сторона; точка начала — на грани.
  | { shape: 'cube'; size: number }
  // Радиус основания и высота; точка начала — центр верхнего или нижнего круга.
  | { shape: 'cylinder'; radius: number; height: number }
  // Расстояние от существа во все стороны; движется вместе с ним.
  | { shape: 'emanation'; distance: number }
  | { shape: 'line'; length: number; width: number }
  | { shape: 'sphere'; radius: number };

export type StepAreaShape = AreaSpec['shape'];
export const AREA_SHAPES = [
  'cone',
  'cube',
  'cylinder',
  'emanation',
  'line',
  'sphere',
] as const satisfies readonly StepAreaShape[];

// Русские названия — по глоссарию next.dnd.su.
export const AREA_SHAPE_LABELS: Record<StepAreaShape, string> = {
  cone: 'Конус',
  cube: 'Куб',
  cylinder: 'Цилиндр',
  emanation: 'Эманация',
  line: 'Линия',
  sphere: 'Сфера',
};

// Главный размер фигуры — то, что пишут в книге первым: «15-футовый конус», «сфера
// радиусом 20 футов». Цилиндру нужна ещё высота, линии — ширина.
export const AREA_MAIN_SIZE_LABELS: Record<StepAreaShape, string> = {
  cone: 'Длина',
  cube: 'Сторона',
  cylinder: 'Радиус',
  emanation: 'Расстояние',
  line: 'Длина',
  sphere: 'Радиус',
};

// С запасом выше самых больших областей книги; опечатка не даст 50 000 фт.
export const AREA_FEET_MAX = 1000;

// Откуда область: от создателя («Волна грома», «Конус холода») или из точки, которую он
// выбирает в пределах дистанции («Огненный шар» — 150 фт.). Эманация — всегда от себя.
// Задевает ли область самого создателя, не хранится: сфера и цилиндр — по геометрии,
// остальные — по его выбору при применении (решено с пользователем 2026-10-17).
export type AreaOrigin = { kind: 'self' } | { kind: 'point'; feet: number };

export const areaMainSize = (area: AreaSpec): number => {
  switch (area.shape) {
    case 'cone':
    case 'line':
      return area.length;
    case 'cube':
      return area.size;
    case 'cylinder':
    case 'sphere':
      return area.radius;
    case 'emanation':
      return area.distance;
  }
};

// «сфера радиусом 20 фт.», «линия 100 фт. длиной и 5 фт. шириной».
export function formatArea(area: AreaSpec): string {
  switch (area.shape) {
    case 'cone':
      return `конус ${area.length} фт.`;
    case 'cube':
      return `куб ${area.size} фт.`;
    case 'cylinder':
      return `цилиндр радиусом ${area.radius} фт. и высотой ${area.height} фт.`;
    case 'emanation':
      return `эманация ${area.distance} фт.`;
    case 'line':
      return `линия ${area.length} фт. длиной и ${area.width} фт. шириной`;
    case 'sphere':
      return `сфера радиусом ${area.radius} фт.`;
  }
}

export const formatAreaOrigin = (origin: AreaOrigin): string =>
  origin.kind === 'self' ? 'от себя' : `в точке в пределах ${origin.feet} фт.`;
