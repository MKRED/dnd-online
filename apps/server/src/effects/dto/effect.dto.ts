import { IsIn } from 'class-validator';
import { EFFECT_CATEGORIES, type EffectCategory } from 'shared';
import {
  CategoryDetails,
  isEmptyDetails,
} from '../../catalog/category-details.validator.js';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование эффекта — одно и то же тело.
export class EffectDto extends CatalogEntryDto {
  @IsIn(EFFECT_CATEGORIES, { message: 'Неизвестная категория эффекта' })
  category: EffectCategory;

  @CategoryDetails<EffectCategory>(
    { basic: isEmptyDetails },
    {},
    'Поля эффекта не подходят к его категории',
  )
  details: object;
}
