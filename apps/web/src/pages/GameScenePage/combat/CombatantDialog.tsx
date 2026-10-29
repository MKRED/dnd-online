import { Button, Group, Modal, NumberInput, Text } from '@mantine/core';
import { useState } from 'react';
import type { CombatEntry } from './TurnStrip';

export type CombatantEdit = {
  entry: CombatEntry;
  what: 'initiative' | 'remove';
};

interface CombatantDialogProps {
  edit: CombatantEdit | null;
  busy: boolean;
  onInitiative: (id: string, value: number) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onClose: () => void;
}

// Правки мастера из меню портрета, которым нужно окно: число инициативы и подтверждение
// «Убрать из боя» (действие не отменить — бросок участника пропадёт).
function CombatantDialog({
  edit,
  busy,
  onInitiative,
  onRemove,
  onClose,
}: CombatantDialogProps) {
  const [value, setValue] = useState<string | number>(
    edit?.entry.combatant.initiative ?? '',
  );
  if (!edit) return null;
  const { entry, what } = edit;
  const done = (ok: boolean) => ok && onClose();
  if (what === 'remove') {
    return (
      <Modal opened onClose={onClose} title="Убрать из боя?" size="sm">
        <Text size="sm">
          {entry.name} уйдёт из очереди, его бросок инициативы пропадёт. Если он
          сейчас ходит, ход перейдёт к следующему.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button
            color="red"
            loading={busy}
            onClick={() => void onRemove(entry.id).then(done)}
          >
            Убрать
          </Button>
        </Group>
      </Modal>
    );
  }
  const number = typeof value === 'number' ? value : null;
  const save = () => {
    if (number !== null) void onInitiative(entry.id, number).then(done);
  };
  return (
    <Modal opened onClose={onClose} title="Поправить инициативу" size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <NumberInput
          label={entry.name}
          description="Участник встанет в очередь по новому числу"
          value={value}
          onChange={setValue}
          allowDecimal={false}
          min={-20}
          max={60}
          data-autofocus
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={busy} disabled={number === null}>
            Сохранить
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

export default CombatantDialog;
