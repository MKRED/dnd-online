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
import { SKILL_ABILITIES } from 'shared';

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
  @IsString()
  @Length(1, 50)
  class: string;

  @IsInt()
  @Min(1)
  @Max(20)
  level: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  subclass?: string;
}

export class SkillProficiencyDto {
  @IsIn(SKILLS)
  skill: string;

  @IsBoolean()
  expertise: boolean;
}
