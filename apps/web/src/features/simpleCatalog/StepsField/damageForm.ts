import { randomId } from '@mantine/hooks';
import {
  NO_STEP_GROWTH,
  hasGrowth,
  type DamageDie,
  type DamagePart,
  type DamageType,
  type StepGrowth,
} from 'shared';

// Строки урона шага и его рост в форме. Числа — '' пока поле пустое (так отдаёт
// NumberInput), кость — строка (так отдаёт Select). key — только для React.
export interface DamageValues {
  key: string;
  count: number | string;
  die: string;
  number: number | string;
  type: DamageType;
}

// Рост (этап 7) — за кнопкой «+ Рост»: growthOn держит блок открытым, даже когда в нём
// ещё ничего нет (у «Волшебной стрелы» только повторы).
export interface GrowthValues {
  growthOn: boolean;
  growthDamage: DamageValues[];
  growthTimes: number | string;
}

export const newDamage = (type: DamageType = 'fire'): DamageValues => ({
  key: randomId(),
  count: 1,
  die: '6',
  number: 0,
  type,
});

export const toDamageValues = (part: DamagePart): DamageValues => ({
  ...part,
  key: randomId(),
  die: String(part.die),
});

export const fromDamageValues = (values: DamageValues): DamagePart => ({
  count: Number(values.count),
  die: Number(values.die) as DamageDie,
  number: Number(values.number),
  type: values.type,
});

export const GROWTH_BLANK: GrowthValues = {
  growthOn: false,
  growthDamage: [],
  growthTimes: 0,
};

export const toGrowthValues = (growth: StepGrowth): GrowthValues => ({
  growthOn: hasGrowth(growth),
  growthDamage: growth.damage.map(toDamageValues),
  growthTimes: growth.times,
});

// Убранный рост не уходит, даже если поля под ним заполнены.
export const fromGrowthValues = (values: GrowthValues): StepGrowth =>
  values.growthOn
    ? {
        damage: values.growthDamage.map(fromDamageValues),
        times: Number(values.growthTimes),
      }
    : NO_STEP_GROWTH;
