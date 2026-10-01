import { Alert, Anchor, Container, Group, Loader, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Character } from 'shared';
import {
  CharacterForm,
  CharactersApiError,
  fromCharacter,
  getCharacter,
  toCreatePayload,
  updateCharacter,
  type CharacterFormValues,
} from '../features/characters';

function toLoadErrorMessage(err: unknown): string {
  // 400 — id не UUID (ParseUUIDPipe), 404 — нет такого или чужой: для пользователя одно и то же.
  if (
    err instanceof CharactersApiError &&
    (err.status === 400 || err.status === 404)
  ) {
    return 'Персонаж не найден';
  }
  return err instanceof CharactersApiError
    ? err.message
    : 'Не удалось загрузить персонажа';
}

function CharacterEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [initialValues, setInitialValues] =
    useState<CharacterFormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCharacter(id)
      .then((loaded) => {
        setCharacter(loaded);
        setInitialValues(fromCharacter(loaded));
      })
      .catch((err: unknown) => {
        console.error('Failed to load character for editing', err);
        setLoadError(toLoadErrorMessage(err));
      });
  }, [id]);

  const handleSubmit = (values: CharacterFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    updateCharacter(id, toCreatePayload(values))
      .then((saved) => {
        void navigate('/characters', { state: { updatedId: saved.id } });
      })
      .catch((err: unknown) => {
        console.error('Character update failed', err);
        const message =
          err instanceof CharactersApiError
            ? err.message
            : 'Не удалось сохранить персонажа';
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>
          {character ? `Редактирование: ${character.name}` : 'Редактирование'}
        </Title>
        <Anchor component={Link} to="/characters" size="sm">
          Назад к списку
        </Anchor>
      </Group>

      {loadError ? (
        <Alert color="red" title="Ошибка">
          {loadError}
        </Alert>
      ) : character && initialValues ? (
        // Форма uncontrolled и читает initialValues один раз — монтируем её только
        // после загрузки, а key пересоздаёт её при переходе к другому персонажу.
        <CharacterForm
          key={character.id}
          initialValues={initialValues}
          submitLabel="Сохранить изменения"
          submitting={submitting}
          submitError={submitError}
          errorTitle="Ошибка сохранения"
          onSubmit={handleSubmit}
        />
      ) : (
        <Loader />
      )}
    </Container>
  );
}

export default CharacterEditPage;
