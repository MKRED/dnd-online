import type { UseFormReturnType } from '@mantine/form';
import type { ReactNode } from 'react';
import {
  ACTIVATION_LABELS,
  EFFECT_COMPONENT_LABELS,
  effectComponentKinds,
  formatActivation,
  formatEffectDuration,
  formatEffectDurationShort,
  formatEffectComponent,
  formatSaveEnds,
  type Effect,
} from 'shared';
import { AbilityGuideButton } from './AbilityGuide';
import { abilityRows } from './abilityRows';
import CardLines from './CardLines';
import {
  abilitySaveConfirmation,
  effectSaveConfirmation,
  type SaveConfirmation,
} from './SaveConfirm';
import { fromDurationValues } from './DurationField';
import EffectFields, { fromEffectValues } from './EffectFields';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import type { SimpleEntry } from './simpleCatalogs';
import AbilityFields from './AbilityFields';
import { abilityCategoryInput } from './abilityInput';
import { chainSteps, fromStepValues } from './StepsField';

// Свои поля всех записей одного раздела, которых нет у другого: у эффекта — составляющие,
// длительность и снятие спасброском, у способности — категория, активация и затраты.
// Раздел описывает их здесь, а форма, карточка и список берут отсюда, не зная, что это
// за поля.
export interface CatalogExtras {
  Field: (props: { form: UseFormReturnType<SimpleFormValues> }) => ReactNode;
  // Поля для тела запроса.
  toInput: (values: SimpleFormValues) => object;
  // Строки карточки: подпись и значение.
  rows: (entry: SimpleEntry) => { label: string; value: ReactNode }[];
  // Коротко — для колонки списка.
  listValue: (entry: SimpleEntry) => string | null;
  // Вопрос перед сохранением: публикация со скрытыми эффектами, скрытие эффекта, который
  // стоит в способностях. Нет — форма сохраняет сразу.
  saveConfirmation?: (
    values: SimpleFormValues,
    saved: SimpleEntry | null,
  ) => SaveConfirmation | null;
  // Кнопка гайда по форме — в заголовке страницы создания и правки. Нет — нет и кнопки.
  Guide?: () => ReactNode;
  // Своя картинка вместо картинки записи: у группы блоков это сами блоки. Есть — у
  // формы нет поля картинки, а карточка и список рисуют её.
  picture?: {
    entry: (entry: SimpleEntry, size: 'card' | 'grid' | 'row') => ReactNode;
    values: (values: SimpleFormValues) => ReactNode;
  };
}

// Строки по одной на вид составляющей: несколько чувств — в одной строке «Чувство».
function componentRows(effect: Effect) {
  return effectComponentKinds(effect.components).map((kind) => ({
    label: EFFECT_COMPONENT_LABELS[kind],
    value: (
      <CardLines
        lines={effect.components
          .filter((component) => component.kind === kind)
          .map(formatEffectComponent)}
      />
    ),
  }));
}

export const EFFECT_EXTRAS: CatalogExtras = {
  Field: EffectFields,
  toInput: (values) => ({
    ...fromEffectValues(values.effect),
    duration: fromDurationValues(values.duration),
  }),
  rows: (entry) => {
    if (!('components' in entry)) return [];
    return [
      ...componentRows(entry),
      { label: 'Длительность', value: formatEffectDuration(entry.duration) },
      ...(entry.saveEnds
        ? [{ label: 'Снимается', value: formatSaveEnds(entry.saveEnds) }]
        : []),
    ];
  },
  listValue: (entry) =>
    'duration' in entry ? formatEffectDurationShort(entry.duration) : null,
  saveConfirmation: effectSaveConfirmation,
};

export const ABILITY_EXTRAS: CatalogExtras = {
  Field: AbilityFields,
  toInput: (values) => ({
    ...abilityCategoryInput(values),
    // Цепочка ещё раз сверяется перед отправкой: правка могла не успеть отрисоваться.
    steps: chainSteps(values.steps).map(fromStepValues),
  }),
  rows: (entry) => ('activation' in entry ? abilityRows(entry) : []),
  // Условие реакции в колонке не поместится — только вид или время.
  listValue: (entry) => {
    if (!('activation' in entry)) return null;
    const { activation } = entry;
    return activation.kind === 'time'
      ? formatActivation(activation)
      : ACTIVATION_LABELS[activation.kind];
  },
  saveConfirmation: abilitySaveConfirmation,
  Guide: AbilityGuideButton,
};
