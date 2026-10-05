import { Anchor, Container, Group, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CharacterForm,
  CharactersApiError,
  createCharacter,
  createInitialFormValues,
  toCreatePayload,
  type CharacterFormValues,
} from '../features/characters';
import { usePageTitle } from '../lib/usePageTitle';

function CharacterCreatePage() {
  usePageTitle('Новый персонаж');
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Ленивая инициализация: иначе на каждом рендере генерировались бы новые id строк классов.
  const [initialValues] = useState(createInitialFormValues);

  const handleSubmit = (values: CharacterFormValues) => {
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
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Новый персонаж</Title>
        <Anchor component={Link} to="/characters" size="sm">
          Назад к списку
        </Anchor>
      </Group>

      <CharacterForm
        initialValues={initialValues}
        submitLabel="Создать персонажа"
        submitting={submitting}
        submitError={submitError}
        errorTitle="Ошибка создания"
        onSubmit={handleSubmit}
      />
    </Container>
  );
}

export default CharacterCreatePage;
