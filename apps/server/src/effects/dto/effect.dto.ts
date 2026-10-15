import { IsIn, ValidateBy } from 'class-validator';
import {
  EFFECT_CATEGORIES,
  isEffectDuration,
  isSenseDetails,
  SENSE_RANGE_MAX,
  type EffectCategory,
  type EffectDuration,
} from 'shared';
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
    { basic: isEmptyDetails, sense: isSenseDetails },
    {
      sense: `Укажите вид чувства и дистанцию в футах: кратную 5, до ${SENSE_RANGE_MAX}`,
    },
    'Поля эффекта не подходят к его категории',
  )
  details: object;

  // Общее поле всех эффектов, обязательно. Виды и пределы — в shared (effectDuration.ts).
  @ValidateBy({
    name: 'effectDuration',
    validator: {
      validate: isEffectDuration,
      defaultMessage: () => 'Длительность эффекта задана неверно',
    },
  })
  duration: EffectDuration;
}
