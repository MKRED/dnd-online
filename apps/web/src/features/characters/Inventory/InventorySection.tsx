import {
  Alert,
  Button,
  Collapse,
  Fieldset,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useState } from 'react';
import type { Character, InventoryEntry } from 'shared';
import AddItemDialog from './AddItemDialog';
import EntryQuestion, { type Question } from './EntryQuestion';
import {
  addInventoryItem,
  moveInventoryEntry,
  removeInventoryEntry,
  updateInventoryEntry,
} from './inventoryApi';
import InventoryList from './InventoryList';
import { byLocation, entryName, OTHER_LOCATION } from './inventoryView';
import LoadSummary from './LoadSummary';
import { hasMoney } from './money';
import MoneyLine from './MoneyLine';
import { useInventoryEditor } from './useInventoryEditor';

interface InventorySectionProps {
  character: Character;
  // Есть — автор может менять инвентарь; нет — лист только для чтения (зритель по ссылке).
  onChange?: (inventory: InventoryEntry[]) => void;
}

// Инвентарь на листе (вариант А из docs/plan/character-inventory.md): «При себе» с грузом,
// под ним свёрнутое «Хранилище»; внизу — деньги.
function InventorySection({ character, onChange }: InventorySectionProps) {
  const { id, inventory, currency } = character;
  const editable = Boolean(onChange);
  const [stashOpen, setStashOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const { busyId, error, setError, run } = useInventoryEditor((next) =>
    onChange?.(next),
  );

  if (!editable && inventory.length === 0 && !hasMoney(currency)) return null;

  const carried = byLocation(inventory, 'carried');
  const stash = byLocation(inventory, 'stash');

  const move = (entry: InventoryEntry, quantity: number) => {
    // Свёрнутое хранилище раскрываем: иначе перенесённый предмет просто пропал бы с глаз.
    if (entry.location === 'carried') setStashOpen(true);
    return run(
      entry.id,
      () =>
        moveInventoryEntry(id, entry.id, {
          location: OTHER_LOCATION[entry.location],
          quantity,
        }),
      'Не удалось переложить предмет',
    );
  };

  const rowHandlers = {
    editable,
    busyId,
    // Одну штуку перекладываем сразу, стопку — спросив, сколько.
    onMove: (entry: InventoryEntry) =>
      entry.quantity > 1
        ? setQuestion({ kind: 'move', entry })
        : void move(entry, 1),
    onEditQuantity: (entry: InventoryEntry) =>
      setQuestion({ kind: 'quantity', entry }),
    onRemove: (entry: InventoryEntry) => {
      if (!window.confirm(`Убрать «${entryName(entry)}» из инвентаря?`)) return;
      void run(
        entry.id,
        () => removeInventoryEntry(id, entry.id),
        'Не удалось убрать предмет',
      );
    },
  };

  return (
    <Fieldset legend="Инвентарь">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="sm">
          <LoadSummary
            entries={inventory}
            strength={character.abilityScores.strength}
          />
          {editable && (
            <Button size="xs" onClick={() => setAdding(true)}>
              + Добавить предмет
            </Button>
          )}
        </Group>
        {/* Ошибку добавления показывает само окно добавления. */}
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
        <Text size="sm" fw={600}>
          При себе
        </Text>
        <InventoryList
          entries={carried}
          empty={editable ? 'Пусто — добавьте предмет из каталога' : 'Пусто'}
          {...rowHandlers}
        />
        {stash.length === 0 ? (
          <Text size="sm" c="dimmed">
            Хранилище · пусто
          </Text>
        ) : (
          <>
            <UnstyledButton
              onClick={() => setStashOpen((open) => !open)}
              aria-expanded={stashOpen}
            >
              <Text size="sm" fw={600}>
                {stashOpen ? '▾' : '▸'} Хранилище · {stash.length}
              </Text>
            </UnstyledButton>
            <Collapse expanded={stashOpen}>
              <InventoryList entries={stash} empty="" {...rowHandlers} />
            </Collapse>
          </>
        )}
        <MoneyLine currency={currency} />
      </Stack>
      {adding && (
        <AddItemDialog
          busy={busyId === 'add'}
          error={error}
          onAdd={(input) =>
            run(
              'add',
              () => addInventoryItem(id, input),
              'Не удалось добавить предмет',
            )
          }
          onClose={() => {
            setAdding(false);
            setError(null);
          }}
        />
      )}
      {question && (
        <EntryQuestion
          question={question}
          onClose={() => setQuestion(null)}
          onMove={(entry, quantity) => {
            setQuestion(null);
            void move(entry, quantity);
          }}
          onSetQuantity={(entry, quantity) => {
            setQuestion(null);
            void run(
              entry.id,
              () => updateInventoryEntry(id, entry.id, { quantity }),
              'Не удалось изменить количество',
            );
          }}
        />
      )}
    </Fieldset>
  );
}

export default InventorySection;
