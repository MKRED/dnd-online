import {
  Alert,
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import {
  DetailsField,
  EntryImage,
  SourcesList,
  useCatalogEntry,
} from '../catalog';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import type { SimpleCatalogDef } from './simpleCatalogs';
import SimpleBadges from './SimpleBadges';

interface SimpleViewPageProps {
  def: SimpleCatalogDef;
}

// Карточка способности или эффекта так, как её видят все. У автора — «Редактировать»
// и «Удалить».
function SimpleViewPage({ def }: SimpleViewPageProps) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entry, error: loadError } = useCatalogEntry(
    def.api.get,
    id,
    def.loadTexts,
  );
  usePageTitle(entry?.name ?? def.texts.title);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isAuthor = Boolean(entry && user && entry.authorId === user.id);

  const handleDelete = () => {
    if (!entry) return;
    if (!window.confirm(def.texts.deleteConfirm(entry.name))) return;
    setDeleteError(null);
    setDeleting(true);
    def.api
      .remove(entry.id)
      .then(() => navigate(def.path))
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
            <EntryImage entry={entry} imagePath={def.api.imagePath} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 7 }}>
            <Stack gap="sm">
              <Title order={1} style={{ overflowWrap: 'anywhere' }}>
                {entry.name}
              </Title>
              <SimpleBadges def={def} entry={entry} showHidden />
              <DetailsField label="Автор">{entry.authorNickname}</DetailsField>
              {def.extras.rows(entry).map(({ label, value }) => (
                <DetailsField key={label} label={label}>
                  {value}
                </DetailsField>
              ))}
              {entry.description && (
                <Text
                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {entry.description}
                </Text>
              )}
              <SourcesList sources={entry.sources} />
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
