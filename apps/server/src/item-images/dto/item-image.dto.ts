import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
import {
  ITEM_IMAGE_VARIANTS,
  type ItemImageVariant,
  type ThumbCrop,
} from 'shared';

const CROP_MESSAGE = 'Вырез миниатюры задаётся целыми числами';

// В отличие от выреза персонажа, x и y бывают отрицательными: вырез может выходить за
// края картинки. Границы проверяет itemThumbCropError — для них нужны размеры картинки.
export class ItemThumbCropDto implements ThumbCrop {
  @IsInt({ message: CROP_MESSAGE })
  x: number;

  @IsInt({ message: CROP_MESSAGE })
  y: number;

  @IsInt({ message: CROP_MESSAGE })
  size: number;
}

export class UpdateItemImageDto {
  @ValidateNested()
  @Type(() => ItemThumbCropDto)
  thumbCrop: ItemThumbCropDto;
}

// Версию (?v=) клиент кладёт в адрес только ради кеша; ValidationPipe её отбрасывает.
export class ItemImageFileQueryDto {
  @IsOptional()
  @IsIn(ITEM_IMAGE_VARIANTS, { message: 'Неизвестный вариант картинки' })
  variant?: ItemImageVariant;
}
