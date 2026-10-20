import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

// Занять место своим игровым персонажем.
export class TakeSeatDto {
  @IsUUID('all', { message: 'Выберите персонажа' })
  characterId: string;

  @IsOptional()
  @IsBoolean({ message: 'Разрешение передавать управление — да или нет' })
  allowHandover?: boolean;
}
