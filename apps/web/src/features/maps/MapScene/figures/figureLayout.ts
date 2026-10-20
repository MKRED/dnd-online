import {
  CREATURE_SIZES,
  feetHeight,
  standHeight,
  type CreatureSize,
  type Facing,
  type MapState,
  type Point3,
  type Vec3,
} from 'shared';

// Фигурка персонажа для сцены (docs/plan/game.md, этап 7): что знает о ней карта — без
// игры, запаса движения и прав.
export interface FigureInput {
  id: string;
  name: string;
  at: Vec3;
  facing: Facing;
  size: CreatureSize;
  // Путь миниатюры в API; null — картинки нет.
  image: string | null;
  // Смотрящий может выбрать фигурку и водить её.
  selectable: boolean;
}

export interface SceneFigure extends FigureInput {
  // Уровень клетки ног: выше среза по высоте фигурка не рисуется.
  level: number;
  // Середина места на высоте ног.
  base: Point3;
  footprint: number;
  // Верх фигурки — над ним подпись с именем.
  top: number;
  // Стоять здесь уже нельзя (мастер поставил блок): подставка красная.
  blocked: boolean;
  letter: string;
}

// Где и как рисовать фигурки — как существа карты (objectLayout.ts), только без сводки.
export function layoutFigures(
  map: MapState,
  figures: readonly FigureInput[],
): SceneFigure[] {
  return figures.map((figure) => {
    const { footprint, height } = CREATURE_SIZES[figure.size];
    const standing = standHeight(map, figure.at, figure.size);
    const feet = standing ?? feetHeight(map, figure.at, figure.size);
    const middle = Math.max(footprint, 1) / 2;
    const [x, y, z] = figure.at;
    return {
      ...figure,
      level: y,
      base: [x + middle, feet, z + middle],
      footprint,
      top: feet + height,
      blocked: standing === null,
      letter: figure.name.trim().charAt(0).toUpperCase() || '?',
    };
  });
}
