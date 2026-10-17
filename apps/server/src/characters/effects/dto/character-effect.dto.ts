import { IsUUID } from 'class-validator';
import type { CharacterEffectAddInput } from 'shared';
import { CHARACTER_EFFECT_NOT_FOUND } from '../character-effects.messages.js';

export class AddCharacterEffectDto implements CharacterEffectAddInput {
  @IsUUID('all', { message: CHARACTER_EFFECT_NOT_FOUND })
  effectId: string;
}
