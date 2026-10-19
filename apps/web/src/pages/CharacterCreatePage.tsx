import { Anchor, Container, Group, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CharacterForm,
  characterKindQuery,
  createCharacter,
  createInitialFormValues,
  readCharacterKind,
  toCreatePayload,
  type CharacterFormValues,
} from '../features/characters';
import { ApiError } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

function CharacterCreatePage() {
  const navigate = useNavigate();
  // Тип — от чипа списка, с которого пришли; в форме его можно сменить.
  const kind = readCharacterKind(useSearchParams()[0]);
  const title = kind === 'npc' ? 'Новый НПС' : 'Новый персонаж';
  usePageTitle(title);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Ленивая инициализация: иначе на каждом рендере генерировались бы новые id строк классов.
  const [initialValues] = useState(() => createInitialFormValues(kind));

  const handleSubmit = (values: CharacterFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    createCharacter(toCreatePayload(values))
      .then((character) => {
        // Сразу на страницу редактирования: галерея картинок доступна только там,
        // у ещё не созданного персонажа прикреплять картинки не к чему.
        void navigate(`/characters/${character.id}/edit`, {
          state: { justCreated: true },
        });
      })
      .catch((err: unknown) => {
        console.error('Character creation failed', err);
        const message =
          err instanceof ApiError
            ? err.message
            : 'Не удалось создать персонажа';
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>{title}</Title>
        <Anchor
          component={Link}
          to={`/characters${characterKindQuery(kind)}`}
          size="sm"
        >
          Назад к списку
        </Anchor>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Картинки персонажа можно будет добавить сразу после создания.
      </Text>

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
