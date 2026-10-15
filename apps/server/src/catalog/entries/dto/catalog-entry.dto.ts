import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
} from 'shared';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Общие поля тела создания и полного редактирования записи простого каталога
// (способности, эффекты). Свои поля (категорию способности, составляющие эффекта)
// добавляет класс каталога, а в колонки их раскладывает toStored его конфига.
export abstract class CatalogEntryDto {
  @Transform(trim)
  @IsString({ message: 'Название — строка' })
  @Length(1, CATALOG_NAME_MAX_LENGTH, {
    message: `Название — от 1 до ${CATALOG_NAME_MAX_LENGTH} символов`,
  })
  name: string;

  @IsOptional()
  @IsString({ message: 'Описание — строка' })
  @MaxLength(CATALOG_DESCRIPTION_MAX_LENGTH, {
    message: `Описание — не длиннее ${CATALOG_DESCRIPTION_MAX_LENGTH} символов`,
  })
  description?: string;

  @IsBoolean({ message: 'Признак публикации — да или нет' })
  isPublic: boolean;
}
