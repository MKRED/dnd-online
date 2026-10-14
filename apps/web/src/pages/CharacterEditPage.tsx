import {
  Alert,
  Anchor,
  Container,
  Group,
  Loader,
  Stack,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Character } from 'shared';
import {
  CharacterForm,
  CharacterGallery,
  fromCharacter,
  getCharacter,
  toCreatePayload,
  updateCharacter,
  type CharacterFormValues,
} from '../features/characters';
import { ApiError } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

function toLoadErrorMessage(err: unknown): string {
  // 400 — id не UUID (ParseUUIDPipe), 404 — нет такого или чужой: для пользователя одно и то же.
  if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
    return 'Персонаж не найден';
  }
  return err instanceof ApiError
    ? err.message
    : 'Не удалось загрузить персонажа';
}

function CharacterEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  // Сюда приводит и создание персонажа: говорим, что он сохранён и что теперь можно
  // добавить картинки. Признак запоминаем, а из истории сразу стираем (эффект ниже):
  // браузер хранит history state между перезагрузками, и сообщение иначе не пропадало бы.
  const location = useLocation();
  const [justCreated] = useState(() =>
    Boolean((location.state as { justCreated?: boolean } | null)?.justCreated),
  );
  useEffect(() => {
    if (location.state) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const [character, setCharacter] = useState<Character | null>(null);
  usePageTitle(character?.name ?? 'Персонаж');
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
          err instanceof ApiError
            ? err.message
            : 'Не удалось сохранить персонажа';
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        {/* Одно слово «Редактирование:» шрифтом h1 шире экрана телефона, а длинное имя
            может не влезть само: страница становилась шире экрана, и браузер отдалял её.
            На узком экране шрифт меньше, слишком длинное слово переносится. */}
        <Title
          order={1}
          miw={0}
          style={{
            fontSize: 'min(var(--mantine-h1-font-size), 8vw)',
            overflowWrap: 'anywhere',
          }}
        >
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
        <Stack>
          {justCreated && (
            <Alert color="green" title="Персонаж создан">
              Теперь ему можно добавить картинки.
            </Alert>
          )}
          <CharacterGallery
            key={`gallery-${character.id}`}
            characterId={character.id}
            characterName={character.name}
          />
          <CharacterForm
            key={character.id}
            initialValues={initialValues}
            submitLabel="Сохранить изменения"
            submitting={submitting}
            submitError={submitError}
            errorTitle="Ошибка сохранения"
            onSubmit={handleSubmit}
          />
        </Stack>
      ) : (
        <Loader />
      )}
    </Container>
  );
}

export default CharacterEditPage;
