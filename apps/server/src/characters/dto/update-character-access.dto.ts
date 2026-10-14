import { IsIn } from 'class-validator';
import { CHARACTER_LINK_ACCESS, type CharacterLinkAccess } from 'shared';

export class UpdateCharacterAccessDto {
  @IsIn(CHARACTER_LINK_ACCESS, { message: 'Неизвестный режим доступа' })
  linkAccess: CharacterLinkAccess;
}
