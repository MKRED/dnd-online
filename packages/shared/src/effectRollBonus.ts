import { ABILITY_GENITIVE } from './abilityUsageLabels.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';
import {
  DAMAGE_DICE,
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  type DamageDie,
  type DamageType,
} from './damageTypes.js';

// Составляющая эффекта «Бонус к броску» (docs/plan/done/effects.md, этап 7.5;
// docs/dnd/modifiers.md): кость или число к броскам носителя или вычет из них. По книге
// 2024: Bless (+1d4 к атакам и спасброскам — две составляющие), Bane (−1d4), Guidance
// (+1d4 к проверкам), Warding Bond (+1 к спасброскам), Slow (−2 к спасброскам Ловкости),
// Enlarge/Reduce (±1d4 к урону оружием), Divine Favor (+1d4 урона Излучением),
// Ray of Enfeeblement (−1d8 к урону). Ключи хранятся в базе: добавлять можно,
// переименовывать — только с миграцией данных.
export const ROLL_BONUS_MODES = ['bonus', 'penalty'] as const;
export type RollBonusMode = (typeof ROLL_BONUS_MODES)[number];

export const ROLL_BONUS_ROLLS = [
  'attack',
  'save',
  'check',
  'd20',
  'damage',
] as const;
export type RollBonusRoll = (typeof ROLL_BONUS_ROLLS)[number];

export const ROLL_BONUS_MODE_LABELS: Record<RollBonusMode, string> = {
  bonus: 'Прибавить',
  penalty: 'Вычесть',
};

export const ROLL_BONUS_ROLL_LABELS: Record<RollBonusRoll, string> = {
  attack: 'Свои броски атаки',
  save: 'Спасброски',
  check: 'Проверки характеристик',
  d20: 'Все Тесты к20',
  damage: 'Свой урон',
};

// Больше 1d8 и ±10 в книге нет; пределы с запасом защищают форму и базу.
export const ROLL_BONUS_DICE_MAX = 10;
export const ROLL_BONUS_NUMBER_MAX = 20;

// Сколько: count костей die плюс number, не пусто. ability — только у спасбросков
// и проверок, null — все характеристики. damageType — только у прибавки к урону: урон
// своего типа, как Излучение у Divine Favor; null — урон того же типа, что у атаки
// (Enlarge).
export type RollBonusDetails = {
  mode: RollBonusMode;
  roll: RollBonusRoll;
  ability: AbilityScore | null;
  count: number;
  die: DamageDie;
  number: number;
  damageType: DamageType | null;
};

export const rollBonusHasAbility = (roll: RollBonusRoll) =>
  roll === 'save' || roll === 'check';
export const rollBonusHasDamageType = (
  details: Pick<RollBonusDetails, 'mode' | 'roll'>,
) => details.roll === 'damage' && details.mode === 'bonus';

const isIntIn = (value: unknown, max: number) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

export function isRollBonusDetails(value: unknown): value is RollBonusDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = 'ability,count,damageType,die,mode,number,roll';
  if (Object.keys(v).sort().join(',') !== keys) return false;
  if (!ROLL_BONUS_MODES.includes(v.mode as RollBonusMode)) return false;
  if (!ROLL_BONUS_ROLLS.includes(v.roll as RollBonusRoll)) return false;
  const details = v as RollBonusDetails;
  const abilityOk =
    v.ability === null ||
    (rollBonusHasAbility(details.roll) &&
      ABILITY_SCORES.includes(v.ability as AbilityScore));
  const typeOk =
    v.damageType === null ||
    (rollBonusHasDamageType(details) &&
      DAMAGE_TYPES.includes(v.damageType as DamageType));
  return (
    abilityOk &&
    typeOk &&
    isIntIn(v.count, ROLL_BONUS_DICE_MAX) &&
    DAMAGE_DICE.includes(v.die as DamageDie) &&
    isIntIn(v.number, ROLL_BONUS_NUMBER_MAX) &&
    // Пустая прибавка ничего не делает — так не заводят.
    ((v.count as number) > 0 || (v.number as number) > 0)
  );
}

// В эффекте одни и те же броски — один раз, будь то прибавка или вычет: два бонуса
// к одному броску из одного заклинания книга не даёт. «Все спасброски» и «спасброски
// Ловкости» — разные броски, как у «Преимущества или помехи».
export const rollBonusKey = (details: RollBonusDetails) =>
  `${details.roll}:${details.ability ?? 'all'}`;

const ROLL_PHRASES: Record<RollBonusRoll, string> = {
  attack: 'к своим броскам атаки',
  save: 'к спасброскам',
  check: 'к проверкам',
  d20: 'ко всем Тестам к20',
  damage: 'к своему урону',
};

// «+1d4 к своим броскам атаки», «−2 к спасброскам Ловкости»,
// «+1d4 к своему урону (Излучение)».
export function formatRollBonus(details: RollBonusDetails): string {
  const parts = [
    ...(details.count > 0 ? [`${details.count}d${details.die}`] : []),
    ...(details.number > 0 ? [String(details.number)] : []),
  ];
  const sign = details.mode === 'bonus' ? '+' : '−';
  const amount =
    parts.length > 1 ? `${sign}(${parts.join(' + ')})` : `${sign}${parts[0]}`;
  const ability = details.ability
    ? ` ${ABILITY_GENITIVE[details.ability]}`
    : details.roll === 'check'
      ? ' характеристик'
      : '';
  const type = details.damageType
    ? ` (${DAMAGE_TYPE_LABELS[details.damageType]})`
    : '';
  return `${amount} ${ROLL_PHRASES[details.roll]}${ability}${type}`;
}
