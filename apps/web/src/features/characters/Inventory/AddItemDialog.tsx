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
import { useState } from 'react';
import {
  INVENTORY_MAX_QUANTITY,
  type InventoryAddInput,
  type InventoryLocation,
} from 'shared';
import { LOCATION_LABELS } from './inventoryView';
import PackChoice from './PackChoice';
import { useAddCandidates } from './useAddCandidates';

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
  const { loaded, options, byId, error: loadError } = useAddCandidates();
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [location, setLocation] = useState<InventoryLocation>('carried');
  // У набора по умолчанию — распаковать: так его содержимое сразу видно в инвентаре.
  const [unpack, setUnpack] = useState(true);
  const [added, setAdded] = useState<string | null>(null);

  const picked = itemId ? byId.get(itemId) : undefined;
  const pack = picked?.category === 'pack' ? picked : null;
  // Распаковать нечего — тогда набор кладётся целиком, что бы ни было выбрано.
  const unpacking =
    pack !== null && unpack && pack.details.contents.some((e) => e.item);
  const count = Number(quantity);
  const valid =
    itemId !== null &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= INVENTORY_MAX_QUANTITY;

  const handleSubmit = async () => {
    if (!valid) return;
    const input: InventoryAddInput = { itemId, quantity: count, location };
    if (unpacking) input.unpack = true;
    if (await onAdd(input)) {
      const what = unpacking
        ? `состав «${picked?.name}»`
        : (picked?.name ?? 'предмет');
      setAdded(
        `Добавлено: ${what} ×${count} — ${LOCATION_LABELS[location].toLowerCase()}`,
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
            placeholder={loaded ? 'Найти по названию' : 'Загружаем предметы…'}
            data={options}
            value={itemId}
            onChange={(value) => {
              setItemId(value);
              setUnpack(true);
              setAdded(null);
            }}
            searchable
            selectFirstOptionOnChange
            disabled={!loaded}
            nothingFoundMessage="Ничего не нашлось"
            limit={50}
            data-autofocus
          />
          <Group gap="md" align="flex-end" wrap="wrap">
            <NumberInput
              label={pack ? 'Сколько наборов' : 'Количество'}
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={INVENTORY_MAX_QUANTITY}
              allowDecimal={false}
              allowNegative={false}
              clampBehavior="strict"
              w={140}
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
          {pack && (
            <PackChoice
              pack={pack}
              count={Number.isInteger(count) && count > 0 ? count : 1}
              unpack={unpacking}
              onChange={setUnpack}
            />
          )}
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
