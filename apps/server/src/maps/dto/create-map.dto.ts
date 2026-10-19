import { IsInt, IsOptional, Min } from 'class-validator';
import { MapNameDto } from './map-name.dto.js';

// Создание карты: название и размер. Без размера — 32 × 32 (DEFAULT_MAP_SIZE);
// верхний предел — MAP_MAX_SIZE из конфига, его проверяет MapsService.
export class CreateMapDto extends MapNameDto {
  @IsOptional()
  @IsInt({ message: 'Ширина карты — целое число клеток' })
  @Min(1, { message: 'Ширина карты — хотя бы одна клетка' })
  width?: number;

  @IsOptional()
  @IsInt({ message: 'Глубина карты — целое число клеток' })
  @Min(1, { message: 'Глубина карты — хотя бы одна клетка' })
  depth?: number;
}
