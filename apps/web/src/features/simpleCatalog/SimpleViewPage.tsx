import {
  Alert,
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Stack,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { TitleWithBookmark } from '../bookmarks';
import { EntryImage, useCatalogEntry } from '../catalog';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import type { SimpleCatalogDef } from './simpleCatalogs';
import SimpleEntryDetails from './SimpleEntryDetails';

interface SimpleViewPageProps {
  def: SimpleCatalogDef;
}

// Карточка способности, эффекта или группы блоков так, как её видят все. У автора — «Редактировать»
// и «Удалить».
function SimpleViewPage({ def }: SimpleViewPageProps) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    entry,
    error: loadError,
    update,
  } = useCatalogEntry(def.api.get, id, def.loadTexts);
  usePageTitle(entry?.name ?? def.texts.title);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isAuthor = Boolean(entry && user && entry.authorId === user.id);

  // Вопрос бывает готов не сразу: у группы блоков он называет карты, где она стоит, и
  // их спрашиваем у сервера. Пока ждём ответа, кнопка крутится.
  const handleDelete = () => {
    if (!entry) return;
    setDeleteError(null);
    setDeleting(true);
    Promise.resolve(def.texts.deleteConfirm(entry))
      .then(async (question) => {
        if (!window.confirm(question)) {
          setDeleting(false);
          return;
        }
        await def.api.remove(entry.id);
        await navigate(def.path);
      })
      .catch((err: unknown) => {
        console.error('Failed to delete catalog entry', err);
        setDeleteError(errorMessage(err, def.texts.deleteFailed));
        setDeleting(false);
      });
  };

  return (
    <Container size="lg" py="xl">
      {/* Чужая запись пришла из каталога — туда и возвращаемся. */}
      <Anchor
        component={Link}
        to={entry && !isAuthor ? `${def.path}?tab=catalog` : def.path}
        size="sm"
        mb="md"
        display="inline-block"
      >
        {def.texts.back}
      </Anchor>
      {loadError ? (
        <Alert color="red" title="Ошибка">
          {loadError}
        </Alert>
      ) : !entry ? (
        <Loader />
      ) : (
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            {def.extras.picture ? (
              def.extras.picture.entry(entry, 'card')
            ) : (
              <EntryImage entry={entry} imagePath={def.api.imagePath} />
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 7 }}>
            <Stack gap="sm">
              {def.bookmarkKind ? (
                <TitleWithBookmark kind={def.bookmarkKind} id={entry.id}>
                  <Title order={1} style={{ overflowWrap: 'anywhere' }}>
                    {entry.name}
                  </Title>
                </TitleWithBookmark>
              ) : (
                <Title order={1} style={{ overflowWrap: 'anywhere' }}>
                  {entry.name}
                </Title>
              )}
              <SimpleEntryDetails def={def} entry={entry} />
              {def.CardActions && (
                <def.CardActions
                  entry={entry}
                  isAuthor={isAuthor}
                  onChange={(next) => update(() => next)}
                />
              )}
              {isAuthor && (
                <>
                  {deleteError && (
                    <Alert color="red" title="Ошибка">
                      {deleteError}
                    </Alert>
                  )}
                  <Group gap="sm" mt="sm">
                    <Button
                      component={Link}
                      to={`${def.path}/${entry.id}/edit`}
                    >
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
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      )}
    </Container>
  );
}

export default SimpleViewPage;
