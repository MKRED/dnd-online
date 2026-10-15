import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
} from 'shared';
import {
  fromDurationValues,
  toDurationValues,
  validateDurationAmount,
  type DurationValues,
} from '../DurationField/durationForm';
import type {
  SimpleCatalogDef,
  SimpleEntry,
  SimpleInput,
} from '../simpleCatalogs';

export interface SimpleFormValues {
  name: string;
  category: string;
  description: string;
  isPublic: boolean;
  // Есть в форме всегда, но в запрос уходит, только если у каталога есть длительность.
  duration: DurationValues;
}

// Те же правила и тексты, что у сервера (CatalogEntryDto, EffectDto).
export const simpleFormValidate = {
  name: (value: string) => {
    const length = value.trim().length;
    return length >= 1 && length <= CATALOG_NAME_MAX_LENGTH
      ? null
      : `Название — от 1 до ${CATALOG_NAME_MAX_LENGTH} символов`;
  },
  description: (value: string) =>
    value.length <= CATALOG_DESCRIPTION_MAX_LENGTH
      ? null
      : `Описание — не длиннее ${CATALOG_DESCRIPTION_MAX_LENGTH} символов`,
  duration: { amount: validateDurationAmount },
};

export function toSimpleFormValues(
  def: SimpleCatalogDef,
  entry: SimpleEntry | null,
): SimpleFormValues {
  return {
    name: entry?.name ?? '',
    category: entry?.category ?? def.categories[0],
    description: entry?.description ?? '',
    isPublic: entry?.isPublic ?? false,
    duration: toDurationValues(
      entry && 'duration' in entry ? entry.duration : undefined,
    ),
  };
}

// Пока у категорий нет своих полей, details всегда пустой.
export function toSimpleInput(
  def: SimpleCatalogDef,
  values: SimpleFormValues,
): SimpleInput {
  const input = {
    name: values.name.trim(),
    category: 'basic' as const,
    details: {},
    description: values.description,
    isPublic: values.isPublic,
  };
  return def.hasDuration
    ? { ...input, duration: fromDurationValues(values.duration) }
    : input;
}
