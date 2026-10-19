import { IsOptional, IsUUID, ValidateBy, ValidateIf } from 'class-validator';
import {
  isMonsterSpellPerDay,
  type MonsterAbilityAddInput,
  type MonsterAbilityUpdateInput,
} from 'shared';
import {
  MONSTER_ABILITY_NOT_FOUND,
  MONSTER_ABILITY_PER_DAY_RANGE,
} from '../monster-abilities.messages.js';

const PerDay = () =>
  ValidateBy({
    name: 'monsterSpellPerDay',
    validator: {
      validate: isMonsterSpellPerDay,
      defaultMessage: () => MONSTER_ABILITY_PER_DAY_RANGE,
    },
  });

export class AddMonsterAbilityDto implements MonsterAbilityAddInput {
  @IsUUID('all', { message: MONSTER_ABILITY_NOT_FOUND })
  abilityId: string;

  // Нет или null — неограниченно.
  @IsOptional()
  @PerDay()
  perDay?: number | null;
}

export class UpdateMonsterAbilityDto implements MonsterAbilityUpdateInput {
  // Обязательное поле: null снимает ограничение, а пропуск — ошибка.
  @ValidateIf((_, value) => value !== null)
  @PerDay()
  perDay: number | null;
}
