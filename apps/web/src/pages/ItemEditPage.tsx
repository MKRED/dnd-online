import { Alert, Container, Loader } from '@mantine/core';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import EditPageTitle from '../components/EditPageTitle';
import { useAuth } from '../features/auth';
import { ItemForm, useItem } from '../features/items';
import { usePageTitle } from '../lib/usePageTitle';

function ItemEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { item, error } = useItem(id);
  usePageTitle(item ? `Редактирование: ${item.name}` : 'Редактирование');

  // Чужой предмет менять нельзя (сервер ответил бы 403) — показываем его карточку.
  if (item && user && item.authorId !== user.id) {
    return <Navigate to={`/items/${item.id}`} replace />;
  }

  return (
    <Container size="lg" py="xl">
      <EditPageTitle name={item?.name} mb="lg" />
      {error ? (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      ) : !item ? (
        <Loader />
      ) : (
        // Форма читает начальные значения один раз — монтируем после загрузки.
        <ItemForm
          key={item.id}
          item={item}
          submitLabel="Сохранить"
          cancelTo={`/items/${item.id}`}
          onSaved={(saved) => {
            void navigate(`/items/${saved.id}`);
          }}
        />
      )}
    </Container>
  );
}

export default ItemEditPage;
