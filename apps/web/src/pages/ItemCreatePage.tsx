import { Container, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ItemForm } from '../features/items';
import { usePageTitle } from '../lib/usePageTitle';

function ItemCreatePage() {
  usePageTitle('Новый предмет');
  const navigate = useNavigate();
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="lg">
        Новый предмет
      </Title>
      <ItemForm
        item={null}
        submitLabel="Создать"
        cancelTo="/items"
        // replace: «Назад» с карточки не должен возвращать в пустую форму создания.
        onSaved={(item) => {
          void navigate(`/items/${item.id}`, { replace: true });
        }}
      />
    </Container>
  );
}

export default ItemCreatePage;
