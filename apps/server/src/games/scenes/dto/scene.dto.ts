import { IsBoolean, IsIn, IsUUID } from 'class-validator';
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
