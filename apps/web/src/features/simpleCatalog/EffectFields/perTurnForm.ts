import {
  PER_TURN_BONUS_MAX,
  PER_TURN_DICE_MAX,
  type DamageDie,
  type DamageType,
  type PerTurnDetails,
  type PerTurnOutcome,
  type SaveEndsEdge,
} from 'shared';

// Поля составляющей «Урон или лечение за ход» в форме (shared/effectPerTurn.ts). Числа —
// '' пока поле пустое (так отдаёт NumberInput), кость — строка (так отдаёт Select).
export interface PerTurnValues {
  outcome: PerTurnOutcome;
  damageType: DamageType | null;
  count: number | string;
  die: string;
  bonus: number | string;
  addModifier: boolean;
  edge: SaveEndsEdge;
}

// Чаще всего это урон костью в начале хода, как у «Палящей кары».
export const NEW_PER_TURN: PerTurnValues = {
  outcome: 'damage',
  damageType: null,
  count: 1,
  die: '6',
  bonus: 0,
  addModifier: false,
  edge: 'start',
};

export function toPerTurnValues(details: PerTurnDetails): PerTurnValues {
  return { ...details, die: String(details.die) };
}

// Тип урона, выбранный до переключения на лечение, не уходит.
export function fromPerTurnValues(values: PerTurnValues): PerTurnDetails {
  return {
    outcome: values.outcome,
    damageType: values.outcome === 'damage' ? values.damageType : null,
    count: Number(values.count),
    die: Number(values.die) as DamageDie,
    bonus: Number(values.bonus),
    addModifier: values.addModifier,
    edge: values.edge,
  };
}

const intUpTo = (value: number | string, max: number) => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= 0 && n <= max;
};

// Те же правила, что у сервера (isPerTurnDetails); пустую сумму отмечаем у костей.
export const perTurnValidate = {
  damageType: (value: DamageType | null, values: PerTurnValues) =>
    values.outcome === 'damage' && !value ? 'Выберите тип урона' : null,
  count: (value: number | string, values: PerTurnValues) => {
    if (!intUpTo(value, PER_TURN_DICE_MAX))
      return `От 0 до ${PER_TURN_DICE_MAX}`;
    const empty =
      Number(value) === 0 && Number(values.bonus) === 0 && !values.addModifier;
    return empty ? 'Укажите кости, число или модификатор' : null;
  },
  bonus: (value: number | string) =>
    intUpTo(value, PER_TURN_BONUS_MAX) ? null : `От 0 до ${PER_TURN_BONUS_MAX}`,
};
