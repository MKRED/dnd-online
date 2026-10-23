import { IsIn, IsUUID } from 'class-validator';
import {
  FURNITURE_MOUNTS,
  type FurnitureFields,
  type FurnitureMount,
} from 'shared';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование обстановки — одно тело, все поля обязательны. Что
// модель своя, проверяет сервис (writeLinks): это запрос к базе.
export class FurnitureDto extends CatalogEntryDto implements FurnitureFields {
  @IsUUID('4', { message: 'Модель — id своей модели из справочника' })
  modelId: string;

  @IsIn(FURNITURE_MOUNTS, { message: 'Крепление — floor, wall или ceiling' })
  mount: FurnitureMount;
}
