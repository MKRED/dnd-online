import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  COINS,
  ITEM_CATEGORIES,
  ITEM_COST_MAX_AMOUNT,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_MAX_WEIGHT,
  ITEM_NAME_MAX_LENGTH,
  type Coin,
  type ItemCategory,
  type ItemDetails,
} from 'shared';
import { DetailsForCategory } from './item-details.validator.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ItemCostDto {
  @IsInt({ message: 'Стоимость — целое число' })
  @Min(0, { message: 'Стоимость не может быть отрицательной' })
  @Max(ITEM_COST_MAX_AMOUNT, {
    message: `Стоимость — не больше ${ITEM_COST_MAX_AMOUNT}`,
  })
  amount: number;

  @IsIn(COINS, { message: 'Неизвестная монета' })
  coin: Coin;
}

// Создание и полное редактирование предмета — одно и то же тело.
export class ItemDto {
  @Transform(trim)
  @IsString({ message: 'Название предмета — строка' })
  @Length(1, ITEM_NAME_MAX_LENGTH, {
    message: `Название предмета — от 1 до ${ITEM_NAME_MAX_LENGTH} символов`,
  })
  name: string;

  @IsIn(ITEM_CATEGORIES, { message: 'Неизвестная категория предмета' })
  category: ItemCategory;

  @DetailsForCategory()
  details: ItemDetails;

  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Вес — число, не больше двух знаков после запятой' },
  )
  @Min(0, { message: 'Вес не может быть отрицательным' })
  @Max(ITEM_MAX_WEIGHT, { message: `Вес — не больше ${ITEM_MAX_WEIGHT} фнт.` })
  weight: number;

  // Нет поля или null — у предмета нет цены.
  @IsOptional()
  @ValidateNested()
  @Type(() => ItemCostDto)
  cost?: ItemCostDto | null;

  @IsOptional()
  @IsString({ message: 'Описание — строка' })
  @MaxLength(ITEM_DESCRIPTION_MAX_LENGTH, {
    message: `Описание — не длиннее ${ITEM_DESCRIPTION_MAX_LENGTH} символов`,
  })
  description?: string;

  @IsBoolean({ message: 'Признак публикации — да или нет' })
  isPublic: boolean;
}
