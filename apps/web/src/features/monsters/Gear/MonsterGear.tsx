import { Alert, Button, Fieldset, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { INVENTORY_MAX_QUANTITY, type MonsterItemEntry } from 'shared';
import { useLinkEditor } from '../../abilityLinks';
import { QuantityDialog } from '../../characters';
import AddGearDialog from './AddGearDialog';
import GearRow from './GearRow';
import { gearEntryName } from './gearView';
import { monsterItemsApi } from './monsterItemsApi';

interface MonsterGearProps {
  monsterId: string;
  items: MonsterItemEntry[];
  // Есть — автор добавляет, меняет и убирает предметы; нет — только чтение.
  onChange?: (items: MonsterItemEntry[]) => void;
}

// Блок «Снаряжение» (docs/plan/monsters-npcs.md, «Снаряжение и эффекты»): строка Gear
// книги — то, что можно отнять или забрать с тела. Один список с количеством, без мест
// хранения, денег и груза. Правки идут по одной, как у способностей.
function MonsterGear({ monsterId, items, onChange }: MonsterGearProps) {
  const api = monsterItemsApi(monsterId);
  const { busyId, error, setError, run } = useLinkEditor(onChange);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MonsterItemEntry | null>(null);
  if (!onChange && items.length === 0) return null;

  return (
    <Fieldset legend="Снаряжение">
      <Stack gap="xs">
        {onChange && (
          <Group justify="space-between" gap="sm">
            {items.length === 0 ? (
              <Text size="sm" c="dimmed">
                Снаряжения нет — добавьте предметы из каталога.
              </Text>
            ) : (
              <span />
            )}
            <Button size="xs" onClick={() => setAdding(true)}>
              + Предмет
            </Button>
          </Group>
        )}
        {items.map((entry) => (
          <GearRow
            key={entry.id}
            entry={entry}
            busy={busyId === entry.id}
            onEditQuantity={onChange && (() => setEditing(entry))}
            // Убираем без подтверждения: вернуть — пара кликов в окне добавления.
            onRemove={
              onChange &&
              (() =>
                void run(
                  entry.id,
                  () => api.remove(entry.id),
                  'Не удалось убрать предмет',
                ))
            }
          />
        ))}
        {error && !adding && (
          <Alert
            color="red"
            variant="light"
            p="xs"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
      </Stack>
      {adding && (
        <AddGearDialog
          added={items}
          busy={busyId === 'add'}
          error={error}
          onAdd={(input) =>
            run('add', () => api.add(input), 'Не удалось добавить предмет')
          }
          onClose={() => {
            setAdding(false);
            setError(null);
          }}
        />
      )}
      {editing && (
        <QuantityDialog
          title={gearEntryName(editing)}
          label="Количество"
          initial={editing.quantity}
          max={INVENTORY_MAX_QUANTITY}
          confirmLabel="Сохранить"
          onConfirm={(quantity) => {
            const entry = editing;
            setEditing(null);
            void run(
              entry.id,
              () => api.update(entry.id, { quantity }),
              'Не удалось сменить количество',
            );
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </Fieldset>
  );
}

export default MonsterGear;
