import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { GAME_EVENTS_PAGE_MAX } from 'shared';

// Страница журнала: записи с номером меньше before (без него — с самой новой).
// Параметры запроса приходят строками — @Type превращает их в числа до проверки.
export class ListGameEventsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'before — номер записи журнала' })
  @Min(1, { message: 'before — номер записи журнала' })
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: `limit — от 1 до ${GAME_EVENTS_PAGE_MAX}` })
  @Min(1, { message: `limit — от 1 до ${GAME_EVENTS_PAGE_MAX}` })
  @Max(GAME_EVENTS_PAGE_MAX, {
    message: `limit — от 1 до ${GAME_EVENTS_PAGE_MAX}`,
  })
  limit?: number;
}
