import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import {
  INVENTORY_MAX_QUANTITY,
  type MonsterItemAddInput,
  type MonsterItemEntry,
} from 'shared';
import { useItemCandidates } from '../../characters';

interface AddGearDialogProps {
  added: readonly MonsterItemEntry[];
  busy: boolean;
  error: string | null;
  onAdd: (input: MonsterItemAddInput) => Promise<boolean>;
  onClose: () => void;
}

// Добавить предмет в снаряжение из своих и каталога. Окно остаётся открытым после
// добавления: снаряжение обычно собирают из нескольких предметов подряд. Уже добавленные
// видны, но выбрать их нельзя — количество меняют в строке. Набор кладётся одним
// предметом, без распаковки.
function AddGearDialog({
  added,
  busy,
  error,
  onAdd,
  onClose,
}: AddGearDialogProps) {
  const { loaded, options, byId, error: loadError } = useItemCandidates();
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const data = useMemo(() => {
    const taken = new Set(added.flatMap((e) => (e.item ? [e.item.id] : [])));
    return options.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        taken.has(item.value)
          ? { ...item, label: `${item.label} · уже есть`, disabled: true }
          : item,
      ),
    }));
  }, [options, added]);

  const count = Number(quantity);
  const valid =
    itemId !== null &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= INVENTORY_MAX_QUANTITY;

  const handleSubmit = async () => {
    if (!valid) return;
    if (await onAdd({ itemId, quantity: count })) {
      setLastAdded(`${byId.get(itemId)?.name ?? 'Предмет'} ×${count}`);
      setItemId(null);
      setQuantity(1);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Добавить в снаряжение">
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
            data={data}
            value={itemId}
            onChange={(value) => {
              setItemId(value);
              setLastAdded(null);
            }}
            searchable
            selectFirstOptionOnChange
            disabled={!loaded}
            nothingFoundMessage="Ничего не нашлось"
            limit={50}
            data-autofocus
          />
          <NumberInput
            label="Количество"
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={INVENTORY_MAX_QUANTITY}
            allowDecimal={false}
            allowNegative={false}
            clampBehavior="strict"
            w={140}
          />
          {lastAdded && !error && (
            <Text size="sm" c="teal" role="status">
              Добавлено: {lastAdded}
            </Text>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              Готово
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

export default AddGearDialog;
