import {
  IsBoolean,
  IsDivisibleBy,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SIGHT_RANGE_MAX, SIGHT_RANGE_STEP } from 'shared';
import {
  SCENE_IMAGE_KINDS,
  type SceneImageKind,
} from '../scene-image-access.js';

// Добавить сцену из своей карты.
export class AddSceneDto {
  @IsUUID('all', { message: 'Выберите карту' })
  mapId: string;
}

// Сделать сцену активной.
export class ActivateSceneDto {
  @IsUUID('all', { message: 'Сцена не найдена' })
  sceneId: string;
}

// «Сцена открыта игрокам».
export class SceneOpenDto {
  @IsBoolean({ message: 'Сцена открыта — да или нет' })
  open: boolean;
}

// Туман войны сцены: дальность обзора — по 5 футов (клетка), до предела замера.
const SIGHT_MESSAGE = `Дальность обзора — от ${SIGHT_RANGE_STEP} до ${SIGHT_RANGE_MAX} футов, кратно ${SIGHT_RANGE_STEP}`;

export class SceneFogDto {
  @IsBoolean({ message: 'Туман войны — да или нет' })
  enabled: boolean;

  @IsInt({ message: SIGHT_MESSAGE })
  @Min(SIGHT_RANGE_STEP, { message: SIGHT_MESSAGE })
  @Max(SIGHT_RANGE_MAX, { message: SIGHT_MESSAGE })
  @IsDivisibleBy(SIGHT_RANGE_STEP, { message: SIGHT_MESSAGE })
  sightRange: number;
}

// Сцена в адресе: /games/:id/scenes/:sceneId/…
export class SceneParamsDto {
  @IsUUID('all', { message: 'Игра не найдена' })
  id: string;

  @IsUUID('all', { message: 'Сцена не найдена' })
  sceneId: string;
}

// Картинка объекта сцены: /games/:id/scene/images/:kind/:sourceId.
export class SceneImageParamsDto {
  @IsUUID('all', { message: 'Игра не найдена' })
  id: string;

  @IsIn(SCENE_IMAGE_KINDS, { message: 'Неизвестный вид объекта сцены' })
  kind: SceneImageKind;

  @IsUUID('all', { message: 'Такой картинки на сцене нет' })
  sourceId: string;
}
