import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { SECTION_AXES, type SectionAxis } from 'shared';

// Вертикальный разрез: плоскость x = at или z = at. Диапазоны задаются парами
// (min+max — вдоль второй горизонтальной оси, minY+maxY — по высоте) или не задаются
// (тогда — границы карты).
export class SectionQueryDto {
  @IsIn(SECTION_AXES, { message: 'axis — x или z' })
  axis: SectionAxis;

  @Type(() => Number)
  @IsInt({ message: 'at — целое число (координата плоскости разреза)' })
  at: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'min — целое число' })
  min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'max — целое число' })
  max?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minY — целое число' })
  minY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxY — целое число' })
  maxY?: number;
}
