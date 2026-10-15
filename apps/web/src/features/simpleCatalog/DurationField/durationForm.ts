import {
  DEFAULT_EFFECT_DURATION,
  DURATION_AMOUNT_MAX,
  type DurationRest,
  type DurationTurnEdge,
  type DurationTurnOwner,
  type DurationUnit,
  type EffectDuration,
  type EffectDurationKind,
} from 'shared';

// Поля длительности в форме: все сразу, а не только выбранного вида. Так при смене вида
// туда и обратно введённое не пропадает. amount — '' пока поле пустое (так отдаёт
// NumberInput).
export interface DurationValues {
  kind: EffectDurationKind;
  amount: number | string;
  unit: DurationUnit;
  concentration: boolean;
  edge: DurationTurnEdge;
  owner: DurationTurnOwner;
  rest: DurationRest;
}

// Значения невыбранных видов. Чей ход — наложившего: в книге «до вашего следующего хода»
// у заклинания значит ход заклинателя (docs/dnd/durations.md).
const BLANK: DurationValues = {
  kind: 'permanent',
  amount: 1,
  unit: 'minute',
  concentration: false,
  edge: 'start',
  owner: 'creator',
  rest: 'long',
};

export function toDurationValues(
  duration: EffectDuration = DEFAULT_EFFECT_DURATION,
): DurationValues {
  return { ...BLANK, ...duration };
}

export function fromDurationValues(values: DurationValues): EffectDuration {
  switch (values.kind) {
    case 'permanent':
      return { kind: 'permanent' };
    case 'time':
      return {
        kind: 'time',
        amount: Number(values.amount),
        unit: values.unit,
        concentration: values.concentration,
      };
    case 'turn':
      return { kind: 'turn', edge: values.edge, owner: values.owner };
    case 'rest':
      return { kind: 'rest', rest: values.rest };
  }
}

// Тот же предел, что у сервера (isEffectDuration). Число проверяем, только если выбрано
// время.
export function validateDurationAmount(
  amount: number | string,
  values: { duration?: DurationValues },
): string | null {
  if (values.duration?.kind !== 'time') return null;
  const value = Number(amount);
  return amount !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= DURATION_AMOUNT_MAX
    ? null
    : `От 1 до ${DURATION_AMOUNT_MAX}`;
}
