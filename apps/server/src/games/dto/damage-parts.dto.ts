import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DAMAGE_DEALT_PARTS_MAX,
  DAMAGE_TYPES,
  damageTotal,
  HIT_POINTS_CHANGE_MAX,
  type DamageType,
  type HitPointsChange,
} from 'shared';

export const AMOUNT = 'Число от 0 до 9999';
export const DAMAGE_PARTS = `Урон — от 1 до ${DAMAGE_DEALT_PARTS_MAX} частей`;
const DAMAGE_TOTAL = `Урон за раз — не больше ${HIT_POINTS_CHANGE_MAX}`;

// Часть урона: сколько и какого типа; без типа — null или не указан (shared/damageDealt.ts).
export class DamagePartDto {
  @IsInt({ message: AMOUNT })
  @Min(0, { message: AMOUNT })
  @Max(HIT_POINTS_CHANGE_MAX, { message: AMOUNT })
  amount: number;

  @ValidateIf((part: DamagePartDto) => part.type != null)
  @IsIn(DAMAGE_TYPES, { message: 'Неизвестный тип урона' })
  type?: DamageType | null;
}

// Поле parts у правки хитов: только у урона, вместо amount. Декораторы — одни на правку
// персонажа и существа.
export function DamageParts(): PropertyDecorator {
  return (target, key) => {
    const decorators = [
      ValidateIf(
        (dto: { kind: string; parts?: unknown }) =>
          dto.kind === 'damage' && dto.parts !== undefined,
      ),
      IsArray({ message: DAMAGE_PARTS }),
      ArrayMinSize(1, { message: DAMAGE_PARTS }),
      ArrayMaxSize(DAMAGE_DEALT_PARTS_MAX, { message: DAMAGE_PARTS }),
      ValidateNested({ each: true }),
      Type(() => DamagePartDto),
    ];
    for (const decorate of decorators) decorate(target, key);
  };
}

// amount нужен лечению, временным хитам и урону без частей.
export const needsAmount = (dto: { kind: string; parts?: unknown }) =>
  ['heal', 'temp'].includes(dto.kind) ||
  (dto.kind === 'damage' && dto.parts === undefined);

// Урон из тела: части как есть или amount одной частью без типа; amount правки — их
// сумма, её и считают хиты.
export function toDamageChange(dto: {
  amount?: number;
  parts?: DamagePartDto[];
}): Extract<HitPointsChange, { kind: 'damage' }> {
  const parts = dto.parts?.map((part) => ({
    amount: part.amount,
    type: part.type ?? null,
  })) ?? [{ amount: dto.amount ?? 0, type: null }];
  const amount = damageTotal(parts);
  if (amount > HIT_POINTS_CHANGE_MAX) {
    throw new BadRequestException(DAMAGE_TOTAL);
  }
  return { kind: 'damage', amount, parts };
}
