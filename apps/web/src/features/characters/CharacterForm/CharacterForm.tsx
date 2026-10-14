import { Alert, Button, Group, Stack } from '@mantine/core';
import { useForm, type FormErrors } from '@mantine/form';
import type { FormEvent } from 'react';
import { ABILITY_SCORES } from 'shared';
import type { CharacterFormValues } from '../characterFormValues';
import AbilityScoresSection from './AbilityScoresSection';
import CombatSection from './CombatSection';
import CurrencyPersonalitySection from './CurrencyPersonalitySection';
import { focusField } from './focusField';
import { errorFields } from './formErrorFields';
import FormErrorSummary from './FormErrorSummary';
import IdentitySection from './IdentitySection';
import ProficienciesSection from './ProficienciesSection';

interface CharacterFormProps {
  // Читается один раз при монтировании (uncontrolled-режим) — при редактировании
  // форму монтируют только после загрузки персонажа.
  initialValues: CharacterFormValues;
  submitLabel: string;
  submitting: boolean;
  submitError: string | null;
  errorTitle: string;
  onSubmit: (values: CharacterFormValues) => void;
}

const required = (value: string) =>
  value.trim().length > 0 ? null : 'Обязательное поле';

function CharacterForm({
  initialValues,
  submitLabel,
  submitting,
  submitError,
  errorTitle,
  onSubmit,
}: CharacterFormProps) {
  const form = useForm<CharacterFormValues>({
    // Форма большая (характеристики, 18 навыков, снаряжение...) — в controlled-режиме
    // (по умолчанию) любое нажатие клавиши перерисовывало весь дерево формы целиком,
    // что ощущалось как задержка ввода. Uncontrolled режим убирает эту перерисовку.
    mode: 'uncontrolled',
    initialValues,
    validate: {
      name: required,
      species: required,
      background: required,
      classes: {
        class: required,
        level: (value: number) =>
          value >= 1 && value <= 20 ? null : 'От 1 до 20',
      },
      abilityScores: Object.fromEntries(
        ABILITY_SCORES.map((ability) => [
          ability,
          (value: number) => (value >= 1 && value <= 30 ? null : 'От 1 до 30'),
        ]),
      ),
      proficiencyBonus: (value: number) =>
        value >= 2 && value <= 6 ? null : 'От 2 до 6',
      armorClass: (value: number) =>
        value >= 0 ? null : 'Не может быть отрицательным',
      speed: (value: number) =>
        value >= 0 ? null : 'Не может быть отрицательным',
      hitDie: required,
      hitPointsMax: (value: number) => (value >= 1 ? null : 'Минимум 1'),
      hitPointsCurrent: (value: number, values: CharacterFormValues) => {
        if (value < 0) return 'Не может быть отрицательным';
        if (value > values.hitPointsMax) return 'Не может превышать максимум';
        return null;
      },
    },
  });

  const invalid = errorFields(form.errors);

  // Кнопка внизу длинной формы, а ошибки могут быть в самом начале: ведём к первой.
  const handleInvalid = (
    errors: FormErrors,
    _values: CharacterFormValues,
    event?: FormEvent<HTMLFormElement>,
  ) => {
    const [first] = errorFields(errors);
    if (first && event) focusField(event.currentTarget, first.path);
  };

  return (
    // noValidate: обязательные поля проверяет форма, а не браузер. Его подсказка
    // показывается иначе, прячет поле под шапку и не попадает в сводку у кнопки.
    <form noValidate onSubmit={form.onSubmit(onSubmit, handleInvalid)}>
      <Stack>
        <IdentitySection form={form} />
        <AbilityScoresSection form={form} />
        <CombatSection form={form} />
        <ProficienciesSection form={form} />
        <CurrencyPersonalitySection form={form} />

        {invalid.length > 0 && (
          <FormErrorSummary
            fields={invalid}
            onPick={(path, from) => focusField(from, path)}
          />
        )}
        {/* Ошибка сервера — тоже у кнопки: её нажимают внизу страницы. */}
        {submitError && (
          <Alert color="red" title={errorTitle}>
            {submitError}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default CharacterForm;
