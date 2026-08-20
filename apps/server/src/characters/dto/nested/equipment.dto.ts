import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class ProficienciesDto {
  @IsArray()
  @IsString({ each: true })
  armor: string[];

  @IsArray()
  @IsString({ each: true })
  weapons: string[];

  @IsArray()
  @IsString({ each: true })
  tools: string[];

  @IsArray()
  @IsString({ each: true })
  languages: string[];
}

export class AttackDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 20)
  bonus: string;

  @IsString()
  @Length(1, 20)
  damage: string;

  @IsString()
  @Length(1, 30)
  damageType: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InventoryItemDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsBoolean()
  equipped?: boolean;

  @IsOptional()
  @IsBoolean()
  attuned?: boolean;
}

export class CurrencyDto {
  @IsInt()
  @Min(0)
  cp: number;

  @IsInt()
  @Min(0)
  sp: number;

  @IsInt()
  @Min(0)
  ep: number;

  @IsInt()
  @Min(0)
  gp: number;

  @IsInt()
  @Min(0)
  pp: number;
}
