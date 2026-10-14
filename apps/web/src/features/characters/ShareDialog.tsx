import {
  Alert,
  Button,
  CopyButton,
  Group,
  Loader,
  Modal,
  Radio,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import type { Character, CharacterLinkAccess } from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import { setCharacterAccess } from './charactersApi';

interface ShareDialogProps {
  character: Character;
  opened: boolean;
  onClose: () => void;
  onChanged: (character: Character) => void;
}

const OPTIONS: {
  value: CharacterLinkAccess;
  label: string;
  description: string;
}[] = [
  {
    value: 'private',
    label: 'Только я',
    description: 'Персонажа видите только вы.',
  },
  {
    value: 'link',
    label: 'Все, у кого есть ссылка',
    description:
      'Могут смотреть после входа на сайт, но не изменять. Ссылка не меняется.',
  },
];

// Доступ к персонажу, как в Google Таблицах: выбор сохраняется сразу, без кнопки
// «Сохранить». Ссылка — адрес листа персонажа, при закрытом доступе он откроется только автору.
function ShareDialog({
  character,
  opened,
  onClose,
  onChanged,
}: ShareDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = `${window.location.origin}/characters/${character.id}`;

  const handleChange = (value: string) => {
    const linkAccess = value as CharacterLinkAccess;
    if (linkAccess === character.linkAccess) return;
    setError(null);
    setSaving(true);
    setCharacterAccess(character.id, linkAccess)
      .then(onChanged)
      .catch((err: unknown) => {
        console.error('Failed to change character access', err);
        setError(errorMessage(err, 'Не удалось изменить доступ'));
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Доступ к персонажу">
      <Stack>
        <Radio.Group value={character.linkAccess} onChange={handleChange}>
          <Stack gap="sm">
            {OPTIONS.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={saving}
              />
            ))}
          </Stack>
        </Radio.Group>
        {error && (
          <Alert color="red" title="Ошибка">
            {error}
          </Alert>
        )}
        {/* На телефоне кнопка уходит под поле, чтобы ссылку было видно. */}
        <Group gap="xs" align="flex-end">
          <TextInput
            label="Ссылка на персонажа"
            value={link}
            readOnly
            // Если копирование не сработает, ссылку легко выделить целиком вручную.
            onFocus={(event) => event.currentTarget.select()}
            style={{ flex: '1 1 220px' }}
          />
          <CopyButton value={link}>
            {({ copied, copy }) => (
              <Button
                variant={copied ? 'light' : 'default'}
                color={copied ? 'green' : undefined}
                onClick={copy}
                w={130}
              >
                {copied ? 'Скопировано' : 'Копировать'}
              </Button>
            )}
          </CopyButton>
        </Group>
        {/* Кнопка остаётся справа при любой длине пояснения. */}
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            {saving ? (
              <Loader size="xs" />
            ) : character.linkAccess === 'private' ? (
              'Сейчас по ссылке персонаж откроется только у вас.'
            ) : (
              'Лист видят все, у кого есть ссылка.'
            )}
          </Text>
          <Button onClick={onClose}>Готово</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ShareDialog;
