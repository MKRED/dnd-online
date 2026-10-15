import {
  SENSE_RANGE_MAX,
  SENSE_RANGE_STEP,
  senseHasRange,
  type AbilityVariant,
  type EffectVariant,
  type SenseKind,
} from 'shared';
import type { SimpleEntry } from '../simpleCatalogs';

// Свои поля категорий в форме — плоско, как у предметов (itemFormValues.ts). В форме
// есть поля всех категорий сразу: при смене категории туда и обратно введённое не
// пропадает, а в запрос уходят только поля выбранной.
export interface CategoryValues {
  // «Чувство»: null — вид ещё не выбран; senseRange — '' пока поле пустое.
  sense: SenseKind | null;
  senseRange: number | string;
}

export type SimpleVariant = AbilityVariant | EffectVariant;

export function toCategoryValues(entry: SimpleEntry | null): CategoryValues {
  const sense = entry?.category === 'sense' ? entry.details : null;
  return { sense: sense?.sense ?? null, senseRange: sense?.range ?? '' };
}

export function toCategoryVariant(
  category: string,
  values: CategoryValues,
): SimpleVariant {
  if (category === 'sense' && values.sense) {
    return {
      category: 'sense',
      details: {
        sense: values.sense,
        range: senseHasRange(values.sense) ? Number(values.senseRange) : null,
      },
    };
  }
  return { category: 'basic', details: {} };
}

type WithCategory = { category: string } & CategoryValues;

// Те же правила, что у сервера (isSenseDetails).
export const categoryValidate = {
  sense: (value: SenseKind | null, values: WithCategory) =>
    values.category === 'sense' && !value ? 'Выберите вид чувства' : null,
  senseRange: (value: number | string, values: WithCategory) => {
    if (values.category !== 'sense' || !values.sense) return null;
    if (!senseHasRange(values.sense)) return null;
    const range = Number(value);
    return value !== '' &&
      Number.isInteger(range) &&
      range >= SENSE_RANGE_STEP &&
      range <= SENSE_RANGE_MAX &&
      range % SENSE_RANGE_STEP === 0
      ? null
      : `Кратно ${SENSE_RANGE_STEP}, до ${SENSE_RANGE_MAX}`;
  },
};
