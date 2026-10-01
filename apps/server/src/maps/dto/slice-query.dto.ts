import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

// Параметры запроса приходят строками — @Type превращает их в числа до проверки.
// Прямоугольник среза задаётся целиком или не задаётся (тогда — границы карты).
export class SliceQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'y — целое число (уровень высоты)' })
  y: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minX — целое число' })
  minX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxX — целое число' })
  maxX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minZ — целое число' })
  minZ?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxZ — целое число' })
  maxZ?: number;
}
