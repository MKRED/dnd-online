import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  FURNITURE_MOUNTS,
  type FurnitureFields,
  type FurnitureMount,
  type FurniturePosition,
} from 'shared';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Положение — имя и своя модель; число, имена и первое положение проверяет
// checkFurniturePositions в сервисе.
export class FurniturePositionDto implements FurniturePosition {
  @IsString({ message: 'Название положения — строка' })
  name: string;

  @IsUUID('4', { message: 'Модель положения — id своей модели из справочника' })
  modelId: string;
}

// Создание и полное редактирование обстановки — одно тело, все поля обязательны. Что
// модель своя, проверяет сервис (writeLinks): это запрос к базе.
export class FurnitureDto extends CatalogEntryDto implements FurnitureFields {
  @IsUUID('4', { message: 'Модель — id своей модели из справочника' })
  modelId: string;

  @IsIn(FURNITURE_MOUNTS, {
    message: 'Крепление — floor, wall, ceiling или doorway',
  })
  mount: FurnitureMount;

  // Без поля — без положений: так создают обычную обстановку, не зная о них.
  @IsOptional()
  @IsArray({ message: 'Положения — список' })
  @ValidateNested({ each: true })
  @Type(() => FurniturePositionDto)
  positions: FurniturePositionDto[] = [];
}
