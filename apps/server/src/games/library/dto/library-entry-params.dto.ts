import { IsIn, IsUUID } from 'class-validator';
import { GAME_LIBRARY_KINDS, type GameLibraryKind } from 'shared';

// Адрес копии в библиотеке: /games/:id/library/:kind/:sourceId.
export class LibraryEntryParamsDto {
  @IsUUID('all', { message: 'Игра не найдена' })
  id: string;

  @IsIn(GAME_LIBRARY_KINDS, { message: 'Неизвестный вид записи библиотеки' })
  kind: GameLibraryKind;

  @IsUUID('all', { message: 'Записи нет в библиотеке игры' })
  sourceId: string;
}
