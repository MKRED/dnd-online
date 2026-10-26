import { Alert, Loader, Stack } from '@mantine/core';
import type { RecordKind } from '../../../features/catalog';
import ItemDetails from '../../../features/items/ItemDetails';
import {
  ABILITIES,
  EFFECTS,
  SimpleEntryDetails,
} from '../../../features/simpleCatalog';
import { useRecordEntry } from './useRecordEntry';

interface RecordCardBodyProps {
  gameId: string;
  master: boolean;
  kind: RecordKind;
  id: string;
}

// Окно способности, эффекта или предмета из листа или карточки (вариант А, замечания после
// первой партии, 2026-10-26): то же, что на странице записи, только чтение. Ссылки внутри
// открывают следующие окна; на страницу ведёт имя в шапке.
function RecordCardBody({ gameId, master, kind, id }: RecordCardBodyProps) {
  const { loaded, error } = useRecordEntry(gameId, master, kind, id);
  if (error) return <Alert color="red">{error}</Alert>;
  if (!loaded) return <Loader size="sm" />;
  if (loaded.kind === 'item')
    return <ItemDetails item={loaded.record} compact />;
  return (
    <Stack gap="sm">
      <SimpleEntryDetails
        def={loaded.kind === 'ability' ? ABILITIES : EFFECTS}
        entry={loaded.record}
      />
    </Stack>
  );
}

export default RecordCardBody;
