import type { AbilityStep } from './abilitySteps.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';
import type { EffectComponent } from './effectComponents.js';

// Как способность применяют и что она тратит — общие поля всех способностей
// (docs/plan/done/abilities.md), по книге 2024 (docs/dnd/ability-usage.md). Активация — ровно
// одна, затраты складываются и могут отсутствовать.

export const ACTIVATION_TIME_UNITS = ['minute', 'hour'] as const;
export type ActivationTimeUnit = (typeof ACTIVATION_TIME_UNITS)[number];

export const ABILITY_TRIGGER_MAX_LENGTH = 200;
export const ACTIVATION_AMOUNT_MAX = 99;
// Цена легендарного действия в использованиях. В книге 2024 всегда 1, у монстров из книг
// 2014 года бывает «стоит 2 действия» — цену храним, чтобы их переносить без правок.
export const LEGENDARY_COST_MAX = 3;

export type AbilityActivation =
  | { kind: 'action' }
  | { kind: 'bonus_action' }
  // trigger — «когда…»: у реакции и у способности без действия он почти всегда есть,
  // но может быть пустым.
  | { kind: 'reaction'; trigger: string }
  | { kind: 'free'; trigger: string }
  // Вместо одной из атак действия «Атака» — как оружие дыхания драконорождённого.
  | { kind: 'attack' }
  // Долгое применение: 1 минута, 10 минут, 1 час…
  | { kind: 'time'; amount: number; unit: ActivationTimeUnit }
  // Черта действует всегда или в своих условиях — у «Базовой» и «Монстра»; легендарное
  // действие стоит cost использований из запаса на раунд — только у «Монстра»
  // (abilityMonster.ts).
  | { kind: 'trait' }
  | { kind: 'legendary'; cost: number };

export type AbilityActivationKind = AbilityActivation['kind'];
export const ABILITY_ACTIVATION_KINDS = [
  'action',
  'bonus_action',
  'reaction',
  'free',
  'attack',
  'time',
  'trait',
  'legendary',
] as const satisfies readonly AbilityActivationKind[];

// Сколько зарядов. Число зарядов, растущее с уровнем, — свойство персонажа, а не
// способности в каталоге; появится со связью с персонажем.
export type UsesCount =
  | { kind: 'fixed'; amount: number }
  | { kind: 'proficiency' }
  // Модификатор характеристики, но не меньше 1.
  | { kind: 'ability'; ability: AbilityScore };

export const USES_RECOVERIES = ['long', 'short', 'short_one'] as const;
// long — все после долгого отдыха; short — все после короткого или долгого; short_one —
// один после короткого, все после долгого.
export type UsesRecovery = (typeof USES_RECOVERIES)[number];

export const USES_AMOUNT_MAX = 99;
export const SPELL_SLOT_LEVEL_MAX = 9;

// Половина скорости, вся скорость или столько-то футов. Футы кратны 5 (клетка карты),
// предел — с запасом выше обычной скорости, чтобы опечатка не дала 5000 фт.
export type MovementCost =
  { kind: 'half' } | { kind: 'all' } | { kind: 'feet'; feet: number };
export const MOVEMENT_COST_KINDS = [
  'half',
  'all',
  'feet',
] as const satisfies readonly MovementCost['kind'][];
export const MOVEMENT_FEET_STEP = 5;
export const MOVEMENT_FEET_MAX = 120;

export const isMovementFeet = (value: unknown) =>
  Number.isInteger(value) &&
  (value as number) >= MOVEMENT_FEET_STEP &&
  (value as number) <= MOVEMENT_FEET_MAX &&
  (value as number) % MOVEMENT_FEET_STEP === 0;

// null — затраты такого вида нет.
export interface AbilityCosts {
  uses: { count: UsesCount; recovery: UsesRecovery } | null;
  // Ячейка не ниже этого круга; 1 — любая.
  spellSlot: { minLevel: number } | null;
  movement: MovementCost | null;
  hitDie: boolean;
}

export const NO_ABILITY_COSTS: AbilityCosts = {
  uses: null,
  spellSlot: null,
  movement: null,
  hitDie: false,
};

// Поля всех способностей, кроме общих для каталогов. steps — «Применение»
// (abilitySteps.ts); пустой список — всё в описании. passive — что черта даёт владельцу
// всегда (abilityPassive.ts); у других активаций — пустой список.
export interface AbilityFields {
  activation: AbilityActivation;
  costs: AbilityCosts;
  steps: AbilityStep[];
  passive: EffectComponent[];
}

export const DEFAULT_ABILITY_FIELDS: AbilityFields = {
  activation: { kind: 'action' },
  costs: NO_ABILITY_COSTS,
  steps: [],
  passive: [],
};

const keysAre = (value: object, keys: string) =>
  Object.keys(value).sort().join(',') === keys;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isIntIn = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;
const isTrigger = (value: unknown) =>
  typeof value === 'string' && value.length <= ABILITY_TRIGGER_MAX_LENGTH;

export function isAbilityActivation(
  value: unknown,
): value is AbilityActivation {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'action':
    case 'bonus_action':
    case 'attack':
    case 'trait':
      return keysAre(value, 'kind');
    case 'legendary':
      return (
        keysAre(value, 'cost,kind') &&
        isIntIn(value.cost, 1, LEGENDARY_COST_MAX)
      );
    case 'reaction':
    case 'free':
      return keysAre(value, 'kind,trigger') && isTrigger(value.trigger);
    case 'time':
      return (
        keysAre(value, 'amount,kind,unit') &&
        isIntIn(value.amount, 1, ACTIVATION_AMOUNT_MAX) &&
        ACTIVATION_TIME_UNITS.includes(value.unit as ActivationTimeUnit)
      );
    default:
      return false;
  }
}

function isUsesCount(value: unknown): value is UsesCount {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'fixed':
      return (
        keysAre(value, 'amount,kind') &&
        isIntIn(value.amount, 1, USES_AMOUNT_MAX)
      );
    case 'proficiency':
      return keysAre(value, 'kind');
    case 'ability':
      return (
        keysAre(value, 'ability,kind') &&
        ABILITY_SCORES.includes(value.ability as AbilityScore)
      );
    default:
      return false;
  }
}

export function isAbilityCosts(value: unknown): value is AbilityCosts {
  if (!isObject(value)) return false;
  if (!keysAre(value, 'hitDie,movement,spellSlot,uses')) return false;
  const { uses, spellSlot, movement, hitDie } = value;
  const usesOk =
    uses === null ||
    (isObject(uses) &&
      keysAre(uses, 'count,recovery') &&
      isUsesCount(uses.count) &&
      USES_RECOVERIES.includes(uses.recovery as UsesRecovery));
  const slotOk =
    spellSlot === null ||
    (isObject(spellSlot) &&
      keysAre(spellSlot, 'minLevel') &&
      isIntIn(spellSlot.minLevel, 1, SPELL_SLOT_LEVEL_MAX));
  const movementOk = movement === null || isMovementCost(movement);
  return usesOk && slotOk && movementOk && typeof hitDie === 'boolean';
}

function isMovementCost(value: unknown): value is MovementCost {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'half':
    case 'all':
      return keysAre(value, 'kind');
    case 'feet':
      return keysAre(value, 'feet,kind') && isMovementFeet(value.feet);
    default:
      return false;
  }
}
