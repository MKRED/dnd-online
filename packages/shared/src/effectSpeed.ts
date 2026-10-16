// Составляющая эффекта «Скорость» (docs/plan/effects.md, этап 7.3; docs/dnd/modifiers.md):
// изменение обычной Скорости или особая скорость. По книге 2024: Longstrider (+10 фт.),
// Ray of Frost (−10 фт.), Haste (вдвое), Slow (вдвое меньше), Power Word Stun (0),
// Fly (полёт 60 фт. и парение), Spider Climb (лазание, равное Скорости).
// Ключи хранятся в базе: добавлять можно, переименовывать — только с миграцией данных.
export const SPEED_CHANGES = [
  'faster',
  'slower',
  'double',
  'half',
  'zero',
  'fly',
  'climb',
  'swim',
  'burrow',
] as const;
export type SpeedChange = (typeof SPEED_CHANGES)[number];

// Изменения на N фт. и особые скорости с числом; остальные числа не имеют.
const WITH_FEET: readonly SpeedChange[] = ['faster', 'slower'];
export const SPECIAL_SPEEDS: readonly SpeedChange[] = [
  'fly',
  'climb',
  'swim',
  'burrow',
];

export const SPEED_CHANGE_LABELS: Record<SpeedChange, string> = {
  faster: 'Больше на N фт.',
  slower: 'Меньше на N фт.',
  double: 'Вдвое больше',
  half: 'Вдвое меньше',
  zero: 'Становится 0',
  fly: 'Скорость полёта',
  climb: 'Скорость лазания',
  swim: 'Скорость плавания',
  burrow: 'Скорость копания',
};

// Футы кратны 5, как клетки карты. 300 фт. с запасом больше, чем в книге даёт заклинание.
export const SPEED_FEET_STEP = 5;
export const SPEED_FEET_MAX = 300;

// feet у особой скорости null — «равна Скорости», как у Spider Climb. hover — только
// у полёта (Fly: «может парить»).
export type SpeedDetails = {
  change: SpeedChange;
  feet: number | null;
  hover: boolean;
};

export const speedNeedsFeet = (change: SpeedChange) =>
  WITH_FEET.includes(change);
export const isSpecialSpeed = (change: SpeedChange) =>
  SPECIAL_SPEEDS.includes(change);

export const isSpeedFeet = (value: unknown) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= SPEED_FEET_STEP &&
  value <= SPEED_FEET_MAX &&
  value % SPEED_FEET_STEP === 0;

export function isSpeedDetails(value: unknown): value is SpeedDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'change,feet,hover') return false;
  if (!SPEED_CHANGES.includes(v.change as SpeedChange)) return false;
  const change = v.change as SpeedChange;
  if (typeof v.hover !== 'boolean') return false;
  if (v.hover && change !== 'fly') return false;
  if (speedNeedsFeet(change)) return isSpeedFeet(v.feet);
  if (isSpecialSpeed(change)) return v.feet === null || isSpeedFeet(v.feet);
  return v.feet === null;
}

// В эффекте одно изменение обычной Скорости и каждая особая скорость — один раз (решено
// с пользователем 2026-10-16): как складываются несколько изменений, книга не говорит.
export const speedKey = (details: SpeedDetails) =>
  isSpecialSpeed(details.change) ? details.change : 'change';

// «Скорость +10 фт.», «Скорость полёта 60 фт., может парить».
export function formatSpeed(details: SpeedDetails): string {
  switch (details.change) {
    case 'faster':
      return `Скорость +${details.feet} фт.`;
    case 'slower':
      return `Скорость −${details.feet} фт.`;
    case 'double':
      return 'Скорость вдвое больше';
    case 'half':
      return 'Скорость вдвое меньше';
    case 'zero':
      return 'Скорость 0';
    default: {
      const label = SPEED_CHANGE_LABELS[details.change];
      const amount =
        details.feet === null ? ', равная Скорости' : ` ${details.feet} фт.`;
      return `${label}${amount}${details.hover ? ', может парить' : ''}`;
    }
  }
}
