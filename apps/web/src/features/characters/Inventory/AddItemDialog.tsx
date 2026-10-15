import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import {
  INVENTORY_MAX_QUANTITY,
  type InventoryAddInput,
  type InventoryLocation,
} from 'shared';
import { useAuth } from '../../auth';
import { useItemList } from '../../items';
import { inventoryCandidates, LOCATION_LABELS } from './inventoryView';

interface AddItemDialogProps {
  busy: boolean;
  error: string | null;
  onAdd: (input: InventoryAddInput) => Promise<boolean>;
  onClose: () => void;
}

// Добавить предмет из своих и каталога. После добавления окно остаётся открытым, а
// выбор очищается: инвентарь обычно собирают из нескольких предметов подряд. Монтируется
// только на время показа — списки предметов грузятся при открытии.
function AddItemDialog({ busy, error, onAdd, onClose }: AddItemDialogProps) {
  const { user } = useAuth();
  const mine = useItemList('mine');
  const catalog = useItemList('catalog');
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [location, setLocation] = useState<InventoryLocation>('carried');
  const [added, setAdded] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      mine.items && catalog.items && user
        ? inventoryCandidates(mine.items, catalog.items, user.id)
        : null,
    [mine.items, catalog.items, user],
  );
  const options = useMemo(
    () =>
      candidates
        ? [
            {
              group: 'Мои предметы',
              items: candidates.mine.map(({ id, name }) => ({
                value: id,
                label: name,
              })),
            },
            {
              group: 'Каталог',
              items: candidates.others.map(({ id, name, authorNickname }) => ({
                value: id,
                label: `${name} · ${authorNickname}`,
              })),
            },
          ].filter((group) => group.items.length > 0)
        : [],
    [candidates],
  );

  const count = Number(quantity);
  const valid =
    itemId !== null &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= INVENTORY_MAX_QUANTITY;
  const loadError = mine.error ?? catalog.error;

  const handleSubmit = async () => {
    if (!valid) return;
    const picked = [
      ...(candidates?.mine ?? []),
      ...(candidates?.others ?? []),
    ].find((item) => item.id === itemId);
    if (await onAdd({ itemId, quantity: count, location })) {
      setAdded(
        `Добавлено: ${picked?.name ?? 'предмет'} ×${count} — ${LOCATION_LABELS[location].toLowerCase()}`,
      );
      setItemId(null);
      setQuantity(1);
    }
  };

  const handleClose = () => {
    setAdded(null);
    onClose();
  };

  return (
    <Modal opened onClose={handleClose} title="Добавить предмет">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Stack gap="md">
          {(loadError ?? error) && (
            <Alert color="red" variant="light" p="xs">
              {loadError ?? error}
            </Alert>
          )}
          <Select
            label="Предмет"
            placeholder={
              candidates ? 'Найти по названию' : 'Загружаем предметы…'
            }
            data={options}
            value={itemId}
            onChange={(value) => {
              setItemId(value);
              setAdded(null);
            }}
            searchable
            selectFirstOptionOnChange
            disabled={!candidates}
            nothingFoundMessage="Ничего не нашлось"
            limit={50}
            data-autofocus
          />
          <Group gap="md" align="flex-end" wrap="wrap">
            <NumberInput
              label="Количество"
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={INVENTORY_MAX_QUANTITY}
              allowDecimal={false}
              allowNegative={false}
              clampBehavior="strict"
              w={120}
            />
            <SegmentedControl
              aria-label="Куда положить"
              value={location}
              onChange={setLocation}
              data={[
                { value: 'carried', label: LOCATION_LABELS.carried },
                { value: 'stash', label: LOCATION_LABELS.stash },
              ]}
            />
          </Group>
          {added && (
            <Text size="sm" c="green">
              {added}
            </Text>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleClose}>
              Закрыть
            </Button>
            <Button type="submit" disabled={!valid} loading={busy}>
              Добавить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default AddItemDialog;
