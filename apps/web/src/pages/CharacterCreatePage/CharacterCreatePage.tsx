import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ABILITY_SCORES } from 'shared';
import {
  CharactersApiError,
  createCharacter,
  createInitialFormValues,
  toCreatePayload,
  type CharacterFormValues,
} from '../../features/characters';
import AbilityScoresSection from './AbilityScoresSection';
import CombatSection from './CombatSection';
import CurrencyPersonalitySection from './CurrencyPersonalitySection';
import IdentitySection from './IdentitySection';
import ProficienciesSection from './ProficienciesSection';

const required = (value: string) =>
  value.trim().length > 0 ? null : 'Обязательное поле';

function CharacterCreatePage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CharacterFormValues>({
    // Форма большая (характеристики, 18 навыков, снаряжение...) — в controlled-режиме
    // (по умолчанию) любое нажатие клавиши перерисовывало весь дерево формы целиком,
    // что ощущалось как задержка ввода. Uncontrolled режим убирает эту перерисовку.
    mode: 'uncontrolled',
    initialValues: createInitialFormValues(),
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
      hitPointsMax: (value: number) => (value >= 1 ? null : 'Минимум 1'),
      hitPointsCurrent: (value: number, values: CharacterFormValues) => {
        if (value < 0) return 'Не может быть отрицательным';
        if (value > values.hitPointsMax) return 'Не может превышать максимум';
        return null;
      },
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    setSubmitError(null);
    setSubmitting(true);
    createCharacter(toCreatePayload(values))
      .then((character) => {
        void navigate('/characters', { state: { createdId: character.id } });
      })
      .catch((err: unknown) => {
        console.error('Character creation failed', err);
        const message =
          err instanceof CharactersApiError
            ? err.message
            : 'Не удалось создать персонажа';
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
  });

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Новый персонаж</Title>
        <Anchor component={Link} to="/characters" size="sm">
          Назад к списку
        </Anchor>
      </Group>

      <form onSubmit={handleSubmit}>
        <Stack>
          {submitError && (
            <Alert color="red" title="Ошибка создания">
              {submitError}
            </Alert>
          )}
          <IdentitySection form={form} />
          <AbilityScoresSection form={form} />
          <CombatSection form={form} />
          <ProficienciesSection form={form} />
          <CurrencyPersonalitySection form={form} />

          <Group justify="flex-end">
            <Button type="submit" loading={submitting}>
              Создать персонажа
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}

export default CharacterCreatePage;
