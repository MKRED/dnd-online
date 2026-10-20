import {
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { MapListItem } from 'shared';
import { listMaps, mapSizeLabel } from '../../../features/maps';
import { errorMessage } from '../../../lib/apiRequest';

interface AddSceneModalProps {
  opened: boolean;
  busy: boolean;
  // Добавление не прошло (например, карту удалили) — видно в самом окне.
  addError: string | null;
  onClose: () => void;
  // Промис говорит, добавилась ли сцена: окно закрывается только после успеха.
  onAdd: (mapId: string) => Promise<boolean>;
}

// Добавить сцену из своей карты. Сцена — копия: правки карты в редакторе после этого
// её не тронут (docs/plan/game.md, «Сцены и смена карты на ходу»).
function AddSceneModal({
  opened,
  busy,
  addError,
  onClose,
  onAdd,
}: AddSceneModalProps) {
  const [maps, setMaps] = useState<MapListItem[] | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || maps) return;
    listMaps()
      .then((list) => {
        setMaps(list);
        if (list.length === 1) setMapId(list[0].id);
      })
      .catch((err: unknown) => {
        console.error('Failed to load maps', err);
        setError(errorMessage(err, 'Не удалось загрузить карты'));
      });
  }, [opened, maps]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!mapId) return;
    void onAdd(mapId).then((added) => {
      if (added) {
        setMapId(null);
        onClose();
      }
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Добавить сцену" centered>
      {maps === null && !error ? (
        <Loader />
      ) : maps?.length === 0 ? (
        <Text>
          У вас нет карт.{' '}
          <Anchor component={Link} to="/maps">
            Создать карту
          </Anchor>
        </Text>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack>
            <Select
              label="Карта"
              placeholder="Выберите карту"
              data={(maps ?? []).map((map) => ({
                value: map.id,
                label: `${map.name} · ${mapSizeLabel(map)}`,
              }))}
              value={mapId}
              onChange={setMapId}
              allowDeselect={false}
              searchable
              comboboxProps={{ withinPortal: true }}
            />
            <Text size="sm" c="dimmed">
              Сцена — копия карты на этот момент: правки карты в редакторе её не
              изменят. Монстры, НПС и предметы с карты попадут в библиотеку
              игры.
            </Text>
            {(error ?? addError) && (
              <Alert color="red">{error ?? addError}</Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" loading={busy} disabled={!mapId}>
                Добавить
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}

export default AddSceneModal;
