import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { ABILITY_SCORES } from 'shared';
import {
  AbilityScoresDto,
  ClassLevelDto,
  SkillProficiencyDto,
} from './nested/basics.dto.js';
import {
  AttackDto,
  CurrencyDto,
  InventoryItemDto,
  ProficienciesDto,
} from './nested/equipment.dto.js';
import { FeatureDto, PersonalityDto } from './nested/narrative.dto.js';
import { IsSpellSlots, KnownSpellDto } from './nested/spells.dto.js';

// Кросс-полевая проверка: текущее ХП не может превышать максимальное при создании.
function MaxOf(property: string, validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'maxOf',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: number, args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedProperty
          ];
          return typeof relatedValue !== 'number' || value <= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          return `${args.property} must not exceed ${relatedProperty}`;
        },
      },
    });
  };
}

// ValidationPipe глобально настроен с whitelist:true (main.ts) — поле без хотя бы
// одного декоратора будет молча вырезано из payload ещё до контроллера, поэтому
// у каждого принимаемого поля, включая вложенные jsonb-блоки, обязателен декоратор.
export class CreateCharacterDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 50)
  species: string;

  @IsString()
  @Length(1, 50)
  background: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  alignment?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experiencePoints?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ClassLevelDto)
  classes: ClassLevelDto[];

  // 2..6 — весь диапазон бонуса мастерства по правилам 5e (уровни 1..20).
  @IsInt()
  @Min(2)
  @Max(6)
  proficiencyBonus: number;

  @ValidateNested()
  @Type(() => AbilityScoresDto)
  abilityScores: AbilityScoresDto;

  @IsArray()
  @IsIn(ABILITY_SCORES, { each: true })
  savingThrowProficiencies: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillProficiencyDto)
  skillProficiencies: SkillProficiencyDto[];

  @IsInt()
  @Min(0)
  armorClass: number;

  @IsInt()
  @Min(0)
  speed: number;

  @IsInt()
  @Min(1)
  hitPointsMax: number;

  @IsInt()
  @Min(0)
  @MaxOf('hitPointsMax')
  hitPointsCurrent: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hitPointsTemp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  deathSaveSuccesses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  deathSaveFailures?: number;

  @IsOptional()
  @IsBoolean()
  heroicInspiration?: boolean;

  @ValidateNested()
  @Type(() => ProficienciesDto)
  proficiencies: ProficienciesDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weaponMasteries?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackDto)
  attacks?: AttackDto[];

  // Ключи 1..9 сериализуются в JSON как строки — ValidateNested тут не подходит
  // (это Record, а не массив/класс), форму проверяем вручную через IsSpellSlots.
  @IsOptional()
  @IsSpellSlots()
  spellSlots?: Record<string, { total: number; expended: number }>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnownSpellDto)
  spellsKnown?: KnownSpellDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventory?: InventoryItemDto[];

  @ValidateNested()
  @Type(() => CurrencyDto)
  currency: CurrencyDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureDto)
  features?: FeatureDto[];

  @ValidateNested()
  @Type(() => PersonalityDto)
  personality: PersonalityDto;
}
