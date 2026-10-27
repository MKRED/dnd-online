import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ROLL_MODES, type CombatantInput, type RollMode } from 'shared';

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
