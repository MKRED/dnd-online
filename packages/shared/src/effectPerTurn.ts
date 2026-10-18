import {
  DAMAGE_DICE,
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  type DamageDie,
  type DamageType,
} from './damageTypes.js';
import type { SaveEndsEdge } from './effectSaveEnds.js';

// Составляющая эффекта «Урон или лечение за ход» (docs/plan/done/effects.md,
// docs/dnd/per-turn-damage.md): в начале или в конце каждого своего хода носитель
// получает урон, лечится или получает временные хиты. Так в книге у «Палящей кары»
// (1d6 огнём в начале хода), «Регенерации» (1 хит) и «Героизма» (временные хиты, равные
// модификатору заклинателя).
export const PER_TURN_OUTCOMES = ['damage', 'healing', 'temp_hp'] as const;
export type PerTurnOutcome = (typeof PER_TURN_OUTCOMES)[number];

export const PER_TURN_OUTCOME_LABELS: Record<PerTurnOutcome, string> = {
  damage: 'Урон',
  healing: 'Лечение',
  temp_hp: 'Временные хиты',
};

// Больше 20 костей за ход в книге нет; пределы защищают форму и базу.
export const PER_TURN_DICE_MAX = 40;
export const PER_TURN_BONUS_MAX = 100;

// Сколько: count костей die, плюс bonus, плюс модификатор наложившего (addModifier —
// число подставит способность при наложении, как Сл спасброска). damageType — только у
// урона, у лечения и временных хитов null. Рост с ячейкой заклинания тоже даёт
// способность, а не образец.
export type PerTurnDetails = {
  outcome: PerTurnOutcome;
  damageType: DamageType | null;
  count: number;
  die: DamageDie;
  bonus: number;
  addModifier: boolean;
  edge: SaveEndsEdge;
};

const isIntIn = (value: unknown, max: number) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

export function isPerTurnDetails(value: unknown): value is PerTurnDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = 'addModifier,bonus,count,damageType,die,edge,outcome';
  if (Object.keys(v).sort().join(',') !== keys) return false;
  if (!PER_TURN_OUTCOMES.includes(v.outcome as PerTurnOutcome)) return false;
  const typeOk =
    v.outcome === 'damage'
      ? DAMAGE_TYPES.includes(v.damageType as DamageType)
      : v.damageType === null;
  return (
    typeOk &&
    isIntIn(v.count, PER_TURN_DICE_MAX) &&
    DAMAGE_DICE.includes(v.die as DamageDie) &&
    isIntIn(v.bonus, PER_TURN_BONUS_MAX) &&
    typeof v.addModifier === 'boolean' &&
    (v.edge === 'start' || v.edge === 'end') &&
    // Пустая сумма ничего не делает — так не заводят.
    ((v.count as number) > 0 || (v.bonus as number) > 0 || v.addModifier)
  );
}

// «1d6 + 2 + модификатор наложившего».
export function formatPerTurnAmount(
  details: Pick<PerTurnDetails, 'count' | 'die' | 'bonus' | 'addModifier'>,
): string {
  const parts = [
    ...(details.count > 0 ? [`${details.count}d${details.die}`] : []),
    ...(details.bonus > 0 ? [String(details.bonus)] : []),
    ...(details.addModifier ? ['модификатор наложившего'] : []),
  ];
  return parts.join(' + ');
}

// «Урон: 1d6 (Огонь), в начале каждого своего хода», «Лечение: 1, в начале…».
export function formatPerTurn(details: PerTurnDetails): string {
  const what = PER_TURN_OUTCOME_LABELS[details.outcome];
  const type = details.damageType
    ? ` (${DAMAGE_TYPE_LABELS[details.damageType]})`
    : '';
  const edge = details.edge === 'start' ? 'начале' : 'конце';
  return `${what}: ${formatPerTurnAmount(details)}${type}, в ${edge} каждого своего хода`;
}
