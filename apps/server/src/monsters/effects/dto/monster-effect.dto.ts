import { IsUUID } from 'class-validator';
import type { MonsterEffectAddInput } from 'shared';
import { MONSTER_EFFECT_NOT_FOUND } from '../monster-effects.messages.js';

export class AddMonsterEffectDto implements MonsterEffectAddInput {
  @IsUUID('all', { message: MONSTER_EFFECT_NOT_FOUND })
  effectId: string;
}
