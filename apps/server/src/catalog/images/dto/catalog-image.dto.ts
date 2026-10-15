import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
import {
  CATALOG_IMAGE_VARIANTS,
  type CatalogImageVariant,
  type ThumbCrop,
} from 'shared';

const CROP_MESSAGE = 'Вырез миниатюры задаётся целыми числами';

// В отличие от выреза персонажа, x и y бывают отрицательными: вырез может выходить за
// края картинки. Границы проверяет catalogThumbCropError — для них нужны размеры картинки.
export class CatalogThumbCropDto implements ThumbCrop {
  @IsInt({ message: CROP_MESSAGE })
  x: number;

  @IsInt({ message: CROP_MESSAGE })
  y: number;

  @IsInt({ message: CROP_MESSAGE })
  size: number;
}

export class UpdateCatalogImageDto {
  @ValidateNested()
  @Type(() => CatalogThumbCropDto)
  thumbCrop: CatalogThumbCropDto;
}

// Версию (?v=) клиент кладёт в адрес только ради кеша; ValidationPipe её отбрасывает.
export class CatalogImageFileQueryDto {
  @IsOptional()
  @IsIn(CATALOG_IMAGE_VARIANTS, { message: 'Неизвестный вариант картинки' })
  variant?: CatalogImageVariant;
}
