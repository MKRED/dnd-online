import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ARMOR_TRAINING,
  WEAPON_PROFICIENCIES,
  type ArmorTraining,
  type WeaponProficiency,
} from 'shared';

export class ProficienciesDto {
  @IsArray()
  @ArrayUnique({ message: 'Категории доспехов не должны повторяться' })
  @IsIn(ARMOR_TRAINING, {
    each: true,
    message: 'Владение доспехами бывает только четырёх категорий',
  })
  armor: ArmorTraining[];

  @IsArray()
  @ArrayUnique({ message: 'Владения оружием не должны повторяться' })
  @IsIn(WEAPON_PROFICIENCIES, {
    each: true,
    message: 'Владение оружием выбирается только из справочника',
  })
  weapons: WeaponProficiency[];

  @IsArray()
  @IsString({ each: true })
  tools: string[];

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Прочие владения — не длиннее 500 символов' })
  other?: string;
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
