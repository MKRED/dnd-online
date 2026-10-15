import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Menu,
  Text,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Character } from 'shared';
import { useAuth } from '../features/auth';
import {
  CharacterSheet,
  deleteCharacter,
  getCharacter,
  ShareDialog,
} from '../features/characters';
import { ApiError, errorMessage } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

function toLoadErrorMessage(err: unknown): string {
  // 400 — id не UUID, 404 — нет такого, чужой закрытый или автор закрыл доступ по ссылке.
  // Зрителю по ссылке важно понять, что дело может быть в доступе.
  if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
    return 'Персонаж не найден. Возможно, автор закрыл к нему доступ.';
  }
  return errorMessage(err, 'Не удалось загрузить персонажа');
}

function CharacterViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  usePageTitle(character?.name ?? 'Персонаж');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const isAuthor = Boolean(character && user && character.userId === user.id);

  useEffect(() => {
    getCharacter(id)
      .then(setCharacter)
      .catch((err: unknown) => {
        console.error('Failed to load character', err);
        setLoadError(toLoadErrorMessage(err));
      });
  }, [id]);

  const handleDelete = () => {
    if (!character) return;
    if (!window.confirm('Удалить персонажа безвозвратно?')) return;
    setDeleteError(null);
    setDeleting(true);
    deleteCharacter(character.id)
      .then(() => navigate('/characters'))
      .catch((err: unknown) => {
        console.error('Failed to delete character', err);
        setDeleteError(errorMessage(err, 'Не удалось удалить персонажа'));
        setDeleting(false);
      });
  };

  // У автора — действия; «Удалить» спрятано в меню, чтобы не стоять рядом с частым
  // «Редактировать». Зритель по ссылке видит, чей это персонаж и что менять его нельзя.
  const aside = !character ? null : isAuthor ? (
    <>
      <Group gap="sm">
        <Button component={Link} to={`/characters/${character.id}/edit`}>
          Редактировать
        </Button>
        <Button variant="default" onClick={() => setSharing(true)}>
          Поделиться
        </Button>
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Ещё действия"
              loading={deleting}
            >
              ⋯
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item color="red" onClick={handleDelete}>
              Удалить персонажа
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      {/* Напоминание автору, что лист видят другие. */}
      {character.linkAccess === 'link' && (
        <Text size="sm" c="dimmed">
          Открыт по ссылке: лист видят все, у кого она есть.
        </Text>
      )}
      <ShareDialog
        character={character}
        opened={sharing}
        onClose={() => setSharing(false)}
        onChanged={setCharacter}
      />
      {deleteError && (
        <Alert color="red" title="Ошибка">
          {deleteError}
        </Alert>
      )}
    </>
  ) : (
    <Text size="sm" c="dimmed">
      Автор: {character.authorNickname} · только просмотр
    </Text>
  );

  return (
    <Container size="md" py="xl">
      {/* Списка чужих персонажей нет, поэтому ссылка «назад» — только у автора. */}
      {(!character || isAuthor) && (
        <Anchor
          component={Link}
          to="/characters"
          size="sm"
          mb="md"
          display="inline-block"
        >
          ← К персонажам
        </Anchor>
      )}
      {loadError ? (
        <Alert color="red" title="Ошибка">
          {loadError}
        </Alert>
      ) : !character ? (
        <Loader />
      ) : (
        <CharacterSheet
          character={character}
          aside={aside}
          onInventoryChange={
            isAuthor
              ? (inventory) =>
                  setCharacter((current) =>
                    current ? { ...current, inventory } : current,
                  )
              : undefined
          }
        />
      )}
    </Container>
  );
}

export default CharacterViewPage;
