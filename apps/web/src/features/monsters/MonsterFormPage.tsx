import { Alert, Container, Loader, Title } from '@mantine/core';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import EditPageTitle from '../../components/EditPageTitle';
import { usePageTitle } from '../../lib/usePageTitle';
import { useAuth } from '../auth';
import { useCatalogEntry } from '../catalog';
import MonsterForm from './MonsterForm';
import { MONSTER_LOAD_TEXTS, monstersApi } from './monstersApi';

// Создание монстра.
export function MonsterCreatePage() {
  usePageTitle('Новый монстр');
  const navigate = useNavigate();
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="lg">
        Новый монстр
      </Title>
      <MonsterForm
        monster={null}
        submitLabel="Создать"
        cancelTo="/monsters"
        // replace: «Назад» с карточки не должен возвращать в пустую форму создания.
        onSaved={(monster) => {
          void navigate(`/monsters/${monster.id}`, { replace: true });
        }}
      />
    </Container>
  );
}

// Правка монстра. Чужого менять нельзя (сервер ответил бы 403) — показываем его карточку.
export function MonsterEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entry: monster, error } = useCatalogEntry(
    monstersApi.get,
    id,
    MONSTER_LOAD_TEXTS,
  );
  usePageTitle(monster ? `Редактирование: ${monster.name}` : 'Редактирование');

  if (monster && user && monster.authorId !== user.id) {
    return <Navigate to={`/monsters/${monster.id}`} replace />;
  }

  return (
    <Container size="lg" py="xl">
      <EditPageTitle name={monster?.name} mb="lg" />
      {error ? (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      ) : !monster ? (
        <Loader />
      ) : (
        // Форма читает начальные значения один раз — монтируем после загрузки.
        <MonsterForm
          key={monster.id}
          monster={monster}
          submitLabel="Сохранить"
          cancelTo={`/monsters/${monster.id}`}
          onSaved={(saved) => {
            void navigate(`/monsters/${saved.id}`);
          }}
        />
      )}
    </Container>
  );
}
