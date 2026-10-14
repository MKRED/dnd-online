import { Type } from 'class-transformer';
import {
  Equals,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import type { ThumbCrop } from 'shared';

const CROP_MESSAGE = 'Вырез миниатюры задаётся целыми неотрицательными числами';

export class ThumbCropDto implements ThumbCrop {
  @IsInt({ message: CROP_MESSAGE })
  @Min(0, { message: CROP_MESSAGE })
  x: number;

  @IsInt({ message: CROP_MESSAGE })
  @Min(0, { message: CROP_MESSAGE })
  y: number;

  @IsInt({ message: CROP_MESSAGE })
  @Min(1, { message: 'Миниатюра не может быть пустой' })
  size: number;
}

export class UpdateCharacterImageDto {
  // Только true: основную не «снимают», а назначают другую.
  @IsOptional()
  @Equals(true, { message: 'Основную картинку можно только назначить' })
  isMain?: true;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThumbCropDto)
  thumbCrop?: ThumbCropDto;
}
