import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CurrencyDto, InventoryItemDto } from './nested/equipment.dto.js';

// Узкий DTO точечных апдейтов "в процессе игры" — ради этого схема и сделана
// гибридной (см. characters.ts): ХП, спасброски от смерти, вдохновение, опыт,
// деньги, инвентарь. Полное редактирование чарника (класс, характеристики и т.д.)
// сюда не входит — это отдельная будущая форма, а не PATCH одним полем.
export class UpdateCharacterDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  experiencePoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hitPointsCurrent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hitPointsTemp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  deathSaveSuccesses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  deathSaveFailures?: number;

  @IsOptional()
  @IsBoolean()
  heroicInspiration?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyDto)
  currency?: CurrencyDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventory?: InventoryItemDto[];
}
