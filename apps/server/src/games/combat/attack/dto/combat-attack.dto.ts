import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  ATTACK_KEYS,
  ROLL_MODES,
  WEAPON_SETS,
  type AttackKey,
  type CombatantRef,
  type RollMode,
  type WeaponSet,
} from 'shared';

// Тела запросов атаки (docs/plan/combat.md, этап 5).

const ATTACK =
  'Атака — «meleeMain», «meleeOff», «rangedMain», «rangedOff» или «unarmed»';
const KIND = 'Цель — фигурка («figure») или существо сцены («creature»)';

export class AttackKeyDto {
  @IsIn(ATTACK_KEYS, { message: ATTACK })
  attack: AttackKey;
}

export class AttackTargetDto {
  @IsIn(['figure', 'creature'], { message: KIND })
  kind: 'figure' | 'creature';

  @ValidateIf((dto: AttackTargetDto) => dto.kind === 'figure')
  @IsUUID('all', { message: 'У фигурки — id персонажа' })
  characterId?: string;

  @ValidateIf((dto: AttackTargetDto) => dto.kind === 'creature')
  @IsInt({ message: 'У существа — номер объекта сцены' })
  @Min(1, { message: 'У существа — номер объекта сцены' })
  objectId?: number;
}

export class CombatAttackDto extends AttackKeyDto {
  @ValidateNested()
  @Type(() => AttackTargetDto)
  target: AttackTargetDto;

  @IsOptional()
  @IsIn(ROLL_MODES, {
    message: 'Бросок — «normal», «advantage» или «disadvantage»',
  })
  mode?: RollMode;
}

export const toTargetRef = (dto: AttackTargetDto): CombatantRef =>
  dto.kind === 'figure'
    ? { kind: 'figure', characterId: dto.characterId! }
    : { kind: 'creature', objectId: dto.objectId! };

export class CombatWeaponSetDto {
  @IsIn(WEAPON_SETS, { message: 'Набор — «melee» или «ranged»' })
  set: WeaponSet;
}
