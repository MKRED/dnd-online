import { Alert, Anchor, Button, Container, Group, Loader } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth';
import {
  deleteConfirmText,
  deleteItem,
  ItemDetails,
  useItem,
} from '../features/items';
import { errorMessage } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

function ItemViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { item, error: loadError } = useItem(id);
  usePageTitle(item?.name ?? 'Предмет');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isAuthor = Boolean(item && user && item.authorId === user.id);

  const handleDelete = () => {
    if (!item) return;
    if (!window.confirm(deleteConfirmText(item))) return;
    setDeleteError(null);
    setDeleting(true);
    deleteItem(item.id)
      .then(() => navigate('/items'))
      .catch((err: unknown) => {
        console.error('Failed to delete item', err);
        setDeleteError(errorMessage(err, 'Не удалось удалить предмет'));
        setDeleting(false);
      });
  };

  return (
    <Container size="lg" py="xl">
      {/* Чужой предмет пришёл из каталога — туда и возвращаемся. */}
      <Anchor
        component={Link}
        to={item && !isAuthor ? '/items?tab=catalog' : '/items'}
        size="sm"
        mb="md"
        display="inline-block"
      >
        ← К предметам
      </Anchor>
      {loadError ? (
        <Alert color="red" title="Ошибка">
          {loadError}
        </Alert>
      ) : !item ? (
        <Loader />
      ) : (
        <ItemDetails
          item={item}
          actions={
            isAuthor && (
              <>
                {deleteError && (
                  <Alert color="red" title="Ошибка">
                    {deleteError}
                  </Alert>
                )}
                <Group gap="sm" mt="sm">
                  <Button component={Link} to={`/items/${item.id}/edit`}>
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
            )
          }
        />
      )}
    </Container>
  );
}

export default ItemViewPage;
