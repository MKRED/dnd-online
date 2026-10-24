import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SEARCH_KINDS,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX_LENGTH,
  type SearchKind,
} from 'shared';

export class SearchQueryDto {
  // Часть названия; пробелы по краям не считаются.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'q — строка' })
  @IsNotEmpty({ message: 'Введите, что искать' })
  @MaxLength(SEARCH_QUERY_MAX_LENGTH, {
    message: `Запрос — не длиннее ${SEARCH_QUERY_MAX_LENGTH} символов`,
  })
  q: string;

  // Один раздел вместо всех — для страницы со всеми результатами.
  @IsOptional()
  @IsIn(SEARCH_KINDS, {
    message: `kind — один из: ${SEARCH_KINDS.join(', ')}`,
  })
  kind?: SearchKind;

  // Сколько записей отдать в каждой группе.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit — целое число' })
  @Min(1, { message: 'limit — от 1' })
  @Max(SEARCH_LIMIT_MAX, { message: `limit — не больше ${SEARCH_LIMIT_MAX}` })
  limit?: number;
}
