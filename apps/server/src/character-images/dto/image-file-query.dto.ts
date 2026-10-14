import { IsIn, IsOptional } from 'class-validator';
import { CHARACTER_IMAGE_VARIANTS, type CharacterImageVariant } from 'shared';

export class ImageFileQueryDto {
  @IsOptional()
  @IsIn(CHARACTER_IMAGE_VARIANTS, { message: 'Неизвестный вариант картинки' })
  variant?: CharacterImageVariant;
}
