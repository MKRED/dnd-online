import { IsOptional, Matches, ValidateBy } from 'class-validator';
import {
  isModelFit,
  MODEL_SCALE_MAX,
  MODEL_SCALE_MIN,
  type CharacterModelFit,
  type CharacterModelPatch,
} from 'shared';

// Цвет фигурки из STL и ручная поправка к вписыванию; без нового файла.
export class PatchCharacterModelDto implements CharacterModelPatch {
  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/i, { message: 'Цвет — в виде #rrggbb' })
  color?: string;

  @IsOptional()
  @ValidateBy({
    name: 'modelFit',
    validator: {
      validate: isModelFit,
      defaultMessage: () =>
        `Поправка — {scale, turn, up}: масштаб от ${MODEL_SCALE_MIN} до ${MODEL_SCALE_MAX}, поворот 0–3 четверти, верх y или z`,
    },
  })
  fit?: CharacterModelFit;
}
