import { Alert, Container, Group, Loader, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import EditPageTitle from '../../components/EditPageTitle';
import { useAuth } from '../auth';
import { useCatalogEntry } from '../catalog';
import { usePageTitle } from '../../lib/usePageTitle';
import type { SimpleCatalogDef } from './simpleCatalogs';
import SimpleEntryForm from './SimpleEntryForm';

interface SimpleFormPageProps {
  def: SimpleCatalogDef;
}

// Заголовок формы и справа кнопка гайда, если он у раздела есть.
function FormHeader({
  def,
  children,
}: SimpleFormPageProps & { children: ReactNode }) {
  const { Guide } = def.extras;
  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
      gap="xs"
      mb="lg"
    >
      {children}
      {Guide && <Guide />}
    </Group>
  );
}

// Создание записи раздела.
export function SimpleCreatePage({ def }: SimpleFormPageProps) {
  usePageTitle(def.texts.newTitle);
  const navigate = useNavigate();
  return (
    <Container size="lg" py="xl">
      <FormHeader def={def}>
        <Title
          order={1}
          miw={0}
          // Слово «способность» шрифтом h1 и кнопка гайда не помещаются в строку на
          // экране 360 px — на узком шрифт меньше, как у EditPageTitle.
          style={{
            fontSize: 'min(var(--mantine-h1-font-size), 8vw)',
            overflowWrap: 'anywhere',
          }}
        >
          {def.texts.newTitle}
        </Title>
      </FormHeader>
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
      <FormHeader def={def}>
        <EditPageTitle name={entry?.name} />
      </FormHeader>
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
