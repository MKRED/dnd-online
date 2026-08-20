import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { FEATURE_SOURCES } from 'shared';

export class FeatureDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsIn(FEATURE_SOURCES)
  source: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PersonalityDto {
  @IsOptional()
  @IsString()
  traits?: string;

  @IsOptional()
  @IsString()
  ideals?: string;

  @IsOptional()
  @IsString()
  bonds?: string;

  @IsOptional()
  @IsString()
  flaws?: string;

  @IsOptional()
  @IsString()
  backstory?: string;

  @IsOptional()
  @IsString()
  appearance?: string;
}
