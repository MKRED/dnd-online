import { Alert, Anchor, Button, Container, Group, Loader } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import { useAuth } from '../auth';
import { useCatalogEntry } from '../catalog';
import MonsterCard from './MonsterCard';
import { MONSTER_LOAD_TEXTS, monstersApi } from './monstersApi';

// Карточка монстра так, как её видят все. У автора — «Редактировать» и «Удалить».
function MonsterViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    entry: monster,
    error: loadError,
    update,
  } = useCatalogEntry(monstersApi.get, id, MONSTER_LOAD_TEXTS);
  usePageTitle(monster?.name ?? 'Монстры');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isAuthor = Boolean(monster && user && monster.authorId === user.id);

  const handleDelete = () => {
    if (!monster) return;
    if (!window.confirm(`Удалить монстра «${monster.name}» безвозвратно?`)) {
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    monstersApi
      .remove(monster.id)
      .then(() => navigate('/monsters'))
      .catch((err: unknown) => {
        console.error('Failed to delete monster', err);
        setDeleteError(errorMessage(err, 'Не удалось удалить монстра'));
        setDeleting(false);
      });
  };

  const authorActions = isAuthor && monster && (
    <>
      {deleteError && (
        <Alert color="red" title="Ошибка">
          {deleteError}
        </Alert>
      )}
      <Group gap="sm">
        <Button component={Link} to={`/monsters/${monster.id}/edit`}>
          Редактировать
        </Button>
        <Button
          color="red"
          variant="subtle"
          loading={deleting}
          onClick={handleDelete}
        >
          Удалить
        </Button>
      </Group>
    </>
  );

  return (
    <Container size="lg" py="xl">
      {/* Чужой монстр пришёл из каталога — туда и возвращаемся. */}
      <Anchor
        component={Link}
        to={monster && !isAuthor ? '/monsters?tab=catalog' : '/monsters'}
        size="sm"
        mb="md"
        display="inline-block"
      >
        ← К монстрам
      </Anchor>
      {loadError ? (
        <Alert color="red" title="Ошибка">
          {loadError}
        </Alert>
      ) : !monster ? (
        <Loader />
      ) : (
        <MonsterCard
          monster={monster}
          showHidden={isAuthor}
          aside={authorActions}
          onLinksChange={
            isAuthor
              ? (patch) => update((prev) => ({ ...prev, ...patch }))
              : undefined
          }
        />
      )}
    </Container>
  );
}

export default MonsterViewPage;
