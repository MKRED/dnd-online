import { ActionIcon, Group, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../lib/apiRequest';

interface MapNameFormProps {
  initial: string;
  // Сохранить имя (уже без пробелов по краям); ошибка запроса остаётся под полем.
  onSave: (name: string) => Promise<void>;
  // Закрыть поле: после сохранения, по ✕ или Esc.
  onClose: () => void;
}

// Поле переименования карты — одно и то же в правой панели редактора и в списке
// «Мои карты» (решено с пользователем 2026-10-31, вариант В). Клавиши редактора поле
// не перехватывает: useKeyCodes пропускает нажатия в полях ввода.
export function MapNameForm({ initial, onSave, onClose }: MapNameFormProps) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = value.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name || saving) return;
    if (name === initial) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    // После успеха поле закрывается и размонтируется — saving уже не сбрасываем.
    onSave(name).then(onClose, (err: unknown) => {
      console.error('Failed to rename map', err);
      setError(errorMessage(err, 'Не удалось переименовать карту'));
      setSaving(false);
    });
  };

  return (
    <form onSubmit={submit} style={{ width: '100%', minWidth: 0 }}>
      <Group gap={4} wrap="nowrap" align="flex-start">
        <TextInput
          aria-label="Название карты"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          maxLength={100}
          error={error}
          disabled={saving}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Tooltip label="Сохранить (Enter)" withArrow>
          <ActionIcon
            type="submit"
            size="input-sm"
            aria-label="Сохранить название"
            disabled={!name}
            loading={saving}
          >
            <IconCheck size={18} stroke={2} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Отменить (Esc)" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="input-sm"
            aria-label="Отменить переименование"
            onClick={onClose}
          >
            <IconX size={18} stroke={2} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </form>
  );
}
