import {
  ACTIVATION_AMOUNT_MAX,
  ABILITY_TRIGGER_MAX_LENGTH,
  DEFAULT_ABILITY_FIELDS,
  MOVEMENT_FEET_MAX,
  MOVEMENT_FEET_STEP,
  SPELL_SLOT_LEVEL_MAX,
  USES_AMOUNT_MAX,
  isMovementFeet,
  type AbilityActivation,
  type AbilityActivationKind,
  type AbilityCosts,
  type AbilityFields,
  type AbilityScore,
  type ActivationTimeUnit,
  type MovementCost,
  type UsesCount,
  type UsesRecovery,
} from 'shared';

// Активация и затраты способности в форме — плоско, с полями всех видов сразу: при смене
// вида или снятой галочке введённое не пропадает. Числа — '' пока поле пустое (так отдаёт
// NumberInput).
export interface UsageValues {
  kind: AbilityActivationKind;
  trigger: string;
  amount: number | string;
  unit: ActivationTimeUnit;
  // Цена легендарного действия, строкой — как отдаёт SegmentedControl.
  legendaryCost: string;
  usesOn: boolean;
  usesCount: UsesCount['kind'];
  usesAmount: number | string;
  usesAbility: AbilityScore;
  usesRecovery: UsesRecovery;
  slotOn: boolean;
  slotLevel: number | string;
  movementOn: boolean;
  movement: MovementCost['kind'];
  movementFeet: number | string;
  hitDie: boolean;
}

const BLANK: UsageValues = {
  kind: 'action',
  trigger: '',
  amount: 1,
  unit: 'minute',
  legendaryCost: '1',
  usesOn: false,
  usesCount: 'fixed',
  usesAmount: 1,
  usesAbility: 'charisma',
  usesRecovery: 'long',
  slotOn: false,
  slotLevel: 1,
  movementOn: false,
  movement: 'half',
  movementFeet: 10,
  hitDie: false,
};

export function toUsageValues(
  fields: Pick<AbilityFields, 'activation' | 'costs'> = DEFAULT_ABILITY_FIELDS,
): UsageValues {
  const { activation, costs } = fields;
  const values: UsageValues = { ...BLANK, kind: activation.kind };
  if ('trigger' in activation) values.trigger = activation.trigger;
  if (activation.kind === 'time') {
    values.amount = activation.amount;
    values.unit = activation.unit;
  }
  if (activation.kind === 'legendary')
    values.legendaryCost = String(activation.cost);
  if (costs.uses) {
    const { count, recovery } = costs.uses;
    values.usesOn = true;
    values.usesCount = count.kind;
    values.usesRecovery = recovery;
    if (count.kind === 'fixed') values.usesAmount = count.amount;
    if (count.kind === 'ability') values.usesAbility = count.ability;
  }
  if (costs.spellSlot) {
    values.slotOn = true;
    values.slotLevel = costs.spellSlot.minLevel;
  }
  if (costs.movement) {
    values.movementOn = true;
    values.movement = costs.movement.kind;
    if (costs.movement.kind === 'feet')
      values.movementFeet = costs.movement.feet;
  }
  values.hitDie = costs.hitDie;
  return values;
}

function toActivation(values: UsageValues): AbilityActivation {
  switch (values.kind) {
    case 'reaction':
    case 'free':
      return { kind: values.kind, trigger: values.trigger.trim() };
    case 'time':
      return { kind: 'time', amount: Number(values.amount), unit: values.unit };
    case 'legendary':
      return { kind: 'legendary', cost: Number(values.legendaryCost) };
    default:
      return { kind: values.kind };
  }
}

function toUsesCount(values: UsageValues): UsesCount {
  switch (values.usesCount) {
    case 'fixed':
      return { kind: 'fixed', amount: Number(values.usesAmount) };
    case 'proficiency':
      return { kind: 'proficiency' };
    case 'ability':
      return { kind: 'ability', ability: values.usesAbility };
  }
}

function toMovement(values: UsageValues): MovementCost {
  return values.movement === 'feet'
    ? { kind: 'feet', feet: Number(values.movementFeet) }
    : { kind: values.movement };
}

function toCosts(values: UsageValues): AbilityCosts {
  return {
    uses: values.usesOn
      ? { count: toUsesCount(values), recovery: values.usesRecovery }
      : null,
    spellSlot: values.slotOn ? { minLevel: Number(values.slotLevel) } : null,
    movement: values.movementOn ? toMovement(values) : null,
    hitDie: values.hitDie,
  };
}

// Шаги «Применения» — свои поля формы (StepsField).
type UsageFields = Pick<AbilityFields, 'activation' | 'costs'>;

export function fromUsageValues(values: UsageValues): UsageFields {
  return { activation: toActivation(values), costs: toCosts(values) };
}

const intIn = (value: number | string, max: number) => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= 1 && n <= max;
};

type WithUsage = { usage?: UsageValues; category?: string };

// Те же пределы, что у сервера (isAbilityActivation, isAbilityCosts). Поле проверяем,
// только когда оно в деле: выбран его вид или отмечена его галочка.
export const usageValidate = {
  trigger: (value: string) =>
    value.trim().length <= ABILITY_TRIGGER_MAX_LENGTH
      ? null
      : `Не длиннее ${ABILITY_TRIGGER_MAX_LENGTH} символов`,
  amount: (value: number | string, values: WithUsage) =>
    values.usage?.kind !== 'time' || intIn(value, ACTIVATION_AMOUNT_MAX)
      ? null
      : `От 1 до ${ACTIVATION_AMOUNT_MAX}`,
  usesAmount: (value: number | string, values: WithUsage) =>
    !values.usage?.usesOn ||
    values.usage.usesCount !== 'fixed' ||
    intIn(value, USES_AMOUNT_MAX)
      ? null
      : `От 1 до ${USES_AMOUNT_MAX}`,
  slotLevel: (value: number | string, values: WithUsage) =>
    // У заклинания круг ячейки — его круг, поля нет (SpellFields/spellSlot.ts).
    !values.usage?.slotOn ||
    values.category === 'spell' ||
    intIn(value, SPELL_SLOT_LEVEL_MAX)
      ? null
      : `От 1 до ${SPELL_SLOT_LEVEL_MAX}`,
  movementFeet: (value: number | string, values: WithUsage) =>
    !values.usage?.movementOn ||
    values.usage.movement !== 'feet' ||
    (value !== '' && isMovementFeet(Number(value)))
      ? null
      : `От ${MOVEMENT_FEET_STEP} до ${MOVEMENT_FEET_MAX}, кратно ${MOVEMENT_FEET_STEP}`,
};
