import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
} from 'shared';
import {
  toDurationValues,
  validateDurationAmount,
  type DurationValues,
} from '../DurationField/durationForm';
import { toUsageValues, usageValidate, type UsageValues } from '../UsageField';
import type {
  SimpleCatalogDef,
  SimpleEntry,
  SimpleInput,
} from '../simpleCatalogs';
import {
  categoryValidate,
  toCategoryValues,
  toCategoryVariant,
  type CategoryValues,
} from './categoryValues';

export interface SimpleFormValues extends CategoryValues {
  name: string;
  category: string;
  description: string;
  isPublic: boolean;
  // Общие поля разделов (catalogExtras.tsx). В форме есть поля обоих разделов, а в
  // запрос уходят только поля своего.
  duration: DurationValues;
  usage: UsageValues;
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
  usage: usageValidate,
  ...categoryValidate,
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
    ...toCategoryValues(entry),
    duration: toDurationValues(
      entry && 'duration' in entry ? entry.duration : undefined,
    ),
    usage: toUsageValues(entry && 'activation' in entry ? entry : undefined),
  };
}

export function toSimpleInput(
  def: SimpleCatalogDef,
  values: SimpleFormValues,
): SimpleInput {
  const input = {
    name: values.name.trim(),
    ...toCategoryVariant(values.category, values),
    description: values.description,
    isPublic: values.isPublic,
  };
  // Категории и поля приходят из списка категорий раздела (def.categories), поэтому
  // способность получит только свои категории; TypeScript этой связи не видит.
  return { ...input, ...def.extras.toInput(values) } as SimpleInput;
}
