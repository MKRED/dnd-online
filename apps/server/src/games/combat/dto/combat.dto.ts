import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  COMBAT_ACTIONS,
  ROLL_MODES,
  SPELL_SLOT_LEVEL_MAX,
  TURN_ACTIONS_MAX,
  type CombatAction,
  type CombatantInput,
  type RollMode,
} from 'shared';

// Тела запросов боя (docs/plan/combat.md, этап 2).

const PARTICIPANTS = 'Участники — от 1 до 100';
const KIND = 'Участник — фигурка («figure») или существо сцены («creature»)';
const CHARACTER = 'У фигурки — id персонажа';
const OBJECT = 'У существа — номер объекта сцены';
const INITIATIVE = 'Инициатива — целое число от −20 до 60';
const COMBATANT = 'Участник боя — его id';

export class CombatantDto {
  @IsIn(['figure', 'creature'], { message: KIND })
  kind: 'figure' | 'creature';

  @ValidateIf((dto: CombatantDto) => dto.kind === 'figure')
  @IsUUID('all', { message: CHARACTER })
  characterId?: string;

  @ValidateIf((dto: CombatantDto) => dto.kind === 'creature')
  @IsInt({ message: OBJECT })
  @Min(1, { message: OBJECT })
  objectId?: number;

  @IsOptional()
  @IsBoolean({ message: '«Врасплох» — да или нет' })
  surprised?: boolean;
}

export class CombatantsDto {
  @IsArray({ message: PARTICIPANTS })
  @ArrayMinSize(1, { message: PARTICIPANTS })
  @ArrayMaxSize(100, { message: PARTICIPANTS })
  @ValidateNested({ each: true })
  @Type(() => CombatantDto)
  participants: CombatantDto[];
}

export const toCombatants = (dto: CombatantsDto): CombatantInput[] =>
  dto.participants.map((p) =>
    p.kind === 'figure'
      ? {
          kind: 'figure',
          characterId: p.characterId!,
          surprised: p.surprised ?? false,
        }
      : {
          kind: 'creature',
          objectId: p.objectId!,
          surprised: p.surprised ?? false,
        },
  );

// Бросок инициативы; mode — переключатель мастера.
export class CombatRollDto {
  @IsOptional()
  @IsIn(ROLL_MODES, {
    message: 'Бросок — «normal», «advantage» или «disadvantage»',
  })
  mode?: RollMode;
}

export class CombatInitiativeDto {
  @IsInt({ message: INITIATIVE })
  @Min(-20, { message: INITIATIVE })
  @Max(60, { message: INITIATIVE })
  initiative: number;
}

export class CombatOrderDto {
  @IsArray({ message: 'Очередь — список id участников' })
  @ArrayMaxSize(100, { message: 'Очередь — список id участников' })
  @IsUUID('all', { each: true, message: COMBATANT })
  ids: string[];
}

export class CombatTurnDto {
  @IsUUID('all', { message: COMBATANT })
  combatantId: string;
}

export class CombatActionDto {
  @IsIn(COMBAT_ACTIONS, {
    message: 'Действие — «dash», «disengage» или «dodge»',
  })
  action: CombatAction;
}

const USED = `Потрачено — целое число от 0 до ${TURN_ACTIONS_MAX}`;

export class CombatResourcesDto {
  @IsOptional()
  @IsInt({ message: USED })
  @Min(0, { message: USED })
  @Max(TURN_ACTIONS_MAX, { message: USED })
  actionsUsed?: number;

  @IsOptional()
  @IsInt({ message: USED })
  @Min(0, { message: USED })
  @Max(TURN_ACTIONS_MAX, { message: USED })
  bonusActionsUsed?: number;

  @IsOptional()
  @IsInt({ message: USED })
  @Min(0, { message: USED })
  @Max(TURN_ACTIONS_MAX, { message: USED })
  reactionsUsed?: number;
}

const SLOT = `Круг ячейки — целое число от 1 до ${SPELL_SLOT_LEVEL_MAX}`;

export class CombatAbilityDto {
  @IsString({ message: 'Способность — id её строки у участника' })
  @MaxLength(100, { message: 'Способность — id её строки у участника' })
  abilityId: string;

  @IsOptional()
  @IsInt({ message: SLOT })
  @Min(1, { message: SLOT })
  @Max(SPELL_SLOT_LEVEL_MAX, { message: SLOT })
  slotLevel?: number;
}
