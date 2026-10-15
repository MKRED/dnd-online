import { Alert, Container, Loader, Title } from '@mantine/core';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { useCatalogEntry } from '../catalog';
import { usePageTitle } from '../../lib/usePageTitle';
import type { SimpleCatalogDef } from './simpleCatalogs';
import SimpleEntryForm from './SimpleEntryForm';

interface SimpleFormPageProps {
  def: SimpleCatalogDef;
}

// Создание записи раздела.
export function SimpleCreatePage({ def }: SimpleFormPageProps) {
  usePageTitle(def.texts.newTitle);
  const navigate = useNavigate();
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="lg">
        {def.texts.newTitle}
      </Title>
      <SimpleEntryForm
        def={def}
        entry={null}
        submitLabel="Создать"
        cancelTo={def.path}
        // replace: «Назад» с карточки не должен возвращать в пустую форму создания.
        onSaved={(entry) => {
          void navigate(`${def.path}/${entry.id}`, { replace: true });
        }}
      />
    </Container>
  );
}

// Правка записи раздела. Чужую менять нельзя (сервер ответил бы 403) — показываем её
// карточку.
export function SimpleEditPage({ def }: SimpleFormPageProps) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entry, error } = useCatalogEntry(def.api.get, id, def.loadTexts);
  usePageTitle(entry ? `Редактирование: ${entry.name}` : 'Редактирование');

  if (entry && user && entry.authorId !== user.id) {
    return <Navigate to={`${def.path}/${entry.id}`} replace />;
  }

  return (
    <Container size="lg" py="xl">
      <Title
        order={1}
        mb="lg"
        style={{
          fontSize: 'min(var(--mantine-h1-font-size), 8vw)',
          overflowWrap: 'anywhere',
        }}
      >
        {entry ? `Редактирование: ${entry.name}` : 'Редактирование'}
      </Title>
      {error ? (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      ) : !entry ? (
        <Loader />
      ) : (
        // Форма читает начальные значения один раз — монтируем после загрузки.
        <SimpleEntryForm
          key={entry.id}
          def={def}
          entry={entry}
          submitLabel="Сохранить"
          cancelTo={`${def.path}/${entry.id}`}
          onSaved={(saved) => {
            void navigate(`${def.path}/${saved.id}`);
          }}
        />
      )}
    </Container>
  );
}
