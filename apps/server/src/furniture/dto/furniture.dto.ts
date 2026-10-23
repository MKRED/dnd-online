import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  FURNITURE_MOUNTS,
  type FurnitureContainer,
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

  // Вид «Контейнер» (этап 11); без поля или null — обычная обстановка. Поля контейнера
  // проверяет сервис (checkFurnitureContainer) — там же видимость и вес предметов.
  @IsOptional()
  @IsObject({
    message: 'Контейнер — объект {capacity, lockDc, contents} или null',
  })
  container: FurnitureContainer | null = null;
}
