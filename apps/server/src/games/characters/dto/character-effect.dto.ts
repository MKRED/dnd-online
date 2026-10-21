import { IsUUID } from 'class-validator';
import type { GameCharacterEffectInput } from 'shared';
import { CHARACTER_EFFECT_NOT_FOUND } from '../../../characters/effects/character-effects.messages.js';

export class GameCharacterEffectDto implements GameCharacterEffectInput {
  @IsUUID('all', { message: CHARACTER_EFFECT_NOT_FOUND })
  effectId: string;
}
