import {
  CREATURE_SIZES,
  feetHeight,
  standHeight,
  type CreatureHealth,
  type CreatureSize,
  type Facing,
  type MapState,
  type Point3,
  type Vec3,
} from 'shared';

import type { CreatureModelInput } from '../objects/objectLayout';

export type FigureModelInput = CreatureModelInput;

// Фигурка персонажа для сцены (docs/plan/done/game.md, этап 7): что знает о ней карта — без
// игры, запаса движения и прав.
export interface FigureInput {
  id: string;
  name: string;
  at: Vec3;
  facing: Facing;
  size: CreatureSize;
  // Путь миниатюры в API; null — картинки нет.
  image: string | null;
  // 3D-модель: путь байтов в API (с версией) и как её ставить; нет — карточка.
  model?: FigureModelInput | null;
  // Смотрящий может выбрать фигурку и водить её.
  selectable: boolean;
  // Метка здоровья в игре (этап 8); у тени её нет.
  health?: CreatureHealth | null;
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

// Середина места существа на высоте ног: на опоре — над ней, без опоры — по блокам.
// Так стоят и фигурки, и монстры с НПС (objectLayout.ts), и клетки их пути (walks/).
export function standBase(map: MapState, at: Vec3, size: CreatureSize) {
  const { footprint } = CREATURE_SIZES[size];
  const standing = standHeight(map, at, size);
  const feet = standing ?? feetHeight(map, at, size);
  const middle = Math.max(footprint, 1) / 2;
  const base: Point3 = [at[0] + middle, feet, at[2] + middle];
  return { base, standing };
}

// Где и как рисовать фигурки — как существа карты (objectLayout.ts), только без сводки.
export function layoutFigures(
  map: MapState,
  figures: readonly FigureInput[],
): SceneFigure[] {
  return figures.map((figure) => {
    const { footprint, height } = CREATURE_SIZES[figure.size];
    const { base, standing } = standBase(map, figure.at, figure.size);
    return {
      ...figure,
      level: figure.at[1],
      base,
      footprint,
      top: base[1] + height,
      blocked: standing === null,
      letter: figure.name.trim().charAt(0).toUpperCase() || '?',
    };
  });
}
