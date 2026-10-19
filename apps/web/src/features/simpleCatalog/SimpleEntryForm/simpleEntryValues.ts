import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
} from 'shared';
import { toSourcesInput } from '../../catalog';
import {
  toDurationValues,
  validateDurationAmount,
  type DurationValues,
} from '../DurationField/durationForm';
import {
  effectValidate,
  toEffectValues,
  type EffectValues,
} from '../EffectFields';
import {
  toMonsterAbilityValues,
  type MonsterAbilityValues,
} from '../monsterAbilityForm';
import { spellValidate, toSpellValues, type SpellValues } from '../SpellFields';
import { stepsValidate, toStepValues, type StepValues } from '../StepsField';
import { toUsageValues, usageValidate, type UsageValues } from '../UsageField';
import type {
  SimpleCatalogDef,
  SimpleEntry,
  SimpleInput,
} from '../simpleCatalogs';
export interface SimpleFormValues {
  name: string;
  // Категория способности; у эффекта категории нет — поле не уходит в запрос.
  category: string;
  description: string;
  sources: string[];
  isPublic: boolean;
  // Общие поля разделов (catalogExtras.tsx). В форме есть поля обоих разделов, а в
  // запрос уходят только поля своего.
  duration: DurationValues;
  effect: EffectValues;
  usage: UsageValues;
  // «Применение» способности.
  steps: StepValues[];
  // Поля категории «Заклинание»; у других категорий не уходят в запрос.
  spell: SpellValues;
  // Поля категории «Монстра» — так же.
  monster: MonsterAbilityValues;
}

// Те же правила и тексты, что у сервера (CatalogEntryDto, EffectDto, AbilityDto).
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
  effect: effectValidate,
  usage: usageValidate,
  steps: stepsValidate,
  spell: spellValidate,
};

export function toSimpleFormValues(
  def: SimpleCatalogDef,
  entry: SimpleEntry | null,
): SimpleFormValues {
  return {
    name: entry?.name ?? '',
    category:
      entry && 'category' in entry
        ? entry.category
        : (def.categories?.[0] ?? ''),
    description: entry?.description ?? '',
    sources: entry?.sources ?? [],
    isPublic: entry?.isPublic ?? false,
    duration: toDurationValues(
      entry && 'duration' in entry ? entry.duration : undefined,
    ),
    effect: toEffectValues(entry && 'components' in entry ? entry : undefined),
    usage: toUsageValues(entry && 'activation' in entry ? entry : undefined),
    steps: entry && 'steps' in entry ? entry.steps.map(toStepValues) : [],
    spell: toSpellValues(
      entry && 'category' in entry && entry.category === 'spell'
        ? entry.details
        : undefined,
    ),
    monster: toMonsterAbilityValues(
      entry && 'category' in entry && entry.category === 'monster'
        ? entry.details
        : undefined,
    ),
  };
}

export function toSimpleInput(
  def: SimpleCatalogDef,
  values: SimpleFormValues,
): SimpleInput {
  const input = {
    name: values.name.trim(),
    description: values.description,
    sources: toSourcesInput(values.sources),
    isPublic: values.isPublic,
  };
  // Свои поля раздела (категорию способности, составляющие эффекта) кладёт def.extras;
  // TypeScript этой связи раздела и его полей не видит.
  return { ...input, ...def.extras.toInput(values) } as SimpleInput;
}
