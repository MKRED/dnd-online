import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  CHARACTER_CLASSES,
  SKILL_ABILITIES,
  type CharacterClass,
} from 'shared';
import { SubclassFromLevel } from './subclass-from-level.validator.js';

const SKILLS = Object.keys(SKILL_ABILITIES);

export class AbilityScoresDto {
  @IsInt()
  @Min(1)
  @Max(30)
  strength: number;

  @IsInt()
  @Min(1)
  @Max(30)
  dexterity: number;

  @IsInt()
  @Min(1)
  @Max(30)
  constitution: number;

  @IsInt()
  @Min(1)
  @Max(30)
  intelligence: number;

  @IsInt()
  @Min(1)
  @Max(30)
  wisdom: number;

  @IsInt()
  @Min(1)
  @Max(30)
  charisma: number;
}

export class ClassLevelDto {
  @IsIn(CHARACTER_CLASSES, { message: 'Неизвестный класс персонажа' })
  class: CharacterClass;

  @IsInt()
  @Min(1)
  @Max(20)
  level: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @SubclassFromLevel()
  subclass?: string;
}

export class SkillProficiencyDto {
  @IsIn(SKILLS)
  skill: string;

  @IsBoolean()
  expertise: boolean;
}
