import {
  Alert,
  Button,
  Chip,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CHARACTER_KINDS, type Character } from 'shared';
import {
  CHARACTER_KIND_CHIPS,
  characterKindQuery,
  deleteCharacter,
  listCharacters,
  readCharacterKind,
} from '../../features/characters';
import { ApiError } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import CharacterCard from './CharacterCard';

const EMPTY_TEXT = {
  pc: 'У вас пока нет ни одного персонажа. Создайте первого чарника DnD 5e.',
  npc: 'НПС пока нет. Создайте торговца, сюжетного героя или компаньона.',
};

// Свои персонажи, разделённые чипами «Игровые» и «НПС» (docs/plan/done/monsters-npcs.md).
// Выбранный чип — в адресе (?kind=npc), фильтр — в браузере: сервер отдаёт всех сразу.
function CharactersPage() {
  usePageTitle('Персонажи');
  const [params, setParams] = useSearchParams();
  const kind = readCharacterKind(params);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listCharacters()
      .then(setCharacters)
      .catch((err: unknown) => {
        console.error('Failed to load characters', err);
        const message =
          err instanceof ApiError
            ? err.message
            : 'Не удалось загрузить персонажей';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm('Удалить персонажа безвозвратно?')) return;
    setDeletingId(id);
    deleteCharacter(id)
      .then(() => {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
      })
      .catch((err: unknown) => {
        console.error('Failed to delete character', err);
        const message =
          err instanceof ApiError
            ? err.message
            : 'Не удалось удалить персонажа';
        setError(message);
      })
      .finally(() => setDeletingId(null));
  };

  const ofKind = (value: string) =>
    characters.filter((character) => character.kind === value);
  const shown = ofKind(kind);

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Мои персонажи</Title>
        {/* Создаёт тип выбранного чипа, чтобы новый лист сразу оказался в этом списке. */}
        <Button
          component={Link}
          to={`/characters/new${characterKindQuery(kind)}`}
        >
          {kind === 'npc' ? 'Создать НПС' : 'Создать персонажа'}
        </Button>
      </Group>

      {/* Переключение — без новой записи в истории, как фильтры каталога. */}
      <Chip.Group
        value={kind}
        onChange={(value) =>
          setParams(characterKindQuery(value === 'npc' ? 'npc' : 'pc'), {
            replace: true,
          })
        }
      >
        <Group gap={6} role="group" aria-label="Тип персонажей" mb="md">
          {CHARACTER_KINDS.map((value) => (
            <Chip key={value} value={value} size="sm">
              {CHARACTER_KIND_CHIPS[value]}
              {!loading && (
                // Цвет надписи, а не dimmed: на закрашенном выбранном чипе серый не виден.
                <Text span size="xs" c="inherit" opacity={0.7} ml={4}>
                  {ofKind(value).length}
                </Text>
              )}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : shown.length === 0 ? (
        <Text c="dimmed">{EMPTY_TEXT[kind]}</Text>
      ) : (
        <Stack>
          {shown.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              deleting={deletingId === character.id}
              onDelete={() => handleDelete(character.id)}
            />
          ))}
        </Stack>
      )}
    </Container>
  );
}

export default CharactersPage;
