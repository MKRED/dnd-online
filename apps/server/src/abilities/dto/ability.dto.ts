import { IsIn } from 'class-validator';
import { ABILITY_CATEGORIES, type AbilityCategory } from 'shared';
import {
  CategoryDetails,
  isEmptyDetails,
} from '../../catalog/category-details.validator.js';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование способности — одно и то же тело.
export class AbilityDto extends CatalogEntryDto {
  @IsIn(ABILITY_CATEGORIES, { message: 'Неизвестная категория способности' })
  category: AbilityCategory;

  @CategoryDetails<AbilityCategory>(
    { basic: isEmptyDetails },
    {},
    'Поля способности не подходят к её категории',
  )
  details: object;
}
