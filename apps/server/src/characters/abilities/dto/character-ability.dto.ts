import { IsBoolean, IsUUID } from 'class-validator';
import type {
  CharacterAbilityAddInput,
  CharacterAbilityUpdateInput,
} from 'shared';
import { CHARACTER_ABILITY_NOT_FOUND } from '../character-abilities.messages.js';

export class AddCharacterAbilityDto implements CharacterAbilityAddInput {
  @IsUUID('all', { message: CHARACTER_ABILITY_NOT_FOUND })
  abilityId: string;
}

export class UpdateCharacterAbilityDto implements CharacterAbilityUpdateInput {
  @IsBoolean({ message: 'Отметка «подготовлено» — да или нет' })
  prepared: boolean;
}
