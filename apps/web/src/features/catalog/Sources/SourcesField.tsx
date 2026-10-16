import {
  ActionIcon,
  Button,
  Group,
  Input,
  Stack,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { CATALOG_SOURCE_MAX_LENGTH, CATALOG_SOURCES_MAX } from 'shared';

interface SourcesFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// Источники записи в форме предмета, способности или эффекта: по полю на источник,
// крестик и «+ Источник» (shared/catalogSources.ts). Длину держит maxLength, число —
// выключенная кнопка, поэтому своих ошибок у поля нет.
function SourcesField({ value, onChange }: SourcesFieldProps) {
  // Новое поле получает фокус: добавил — сразу печатаешь.
  const [focusLast, setFocusLast] = useState(false);
  const full = value.length >= CATALOG_SOURCES_MAX;
  const set = (index: number, source: string) =>
    onChange(value.map((old, i) => (i === index ? source : old)));

  return (
    <Input.Wrapper
      label="Источники"
      description="Книга и страница или ссылка на сайт — ссылка в карточке станет кликабельной"
    >
      <Stack gap="xs" mt={6}>
        {value.map((source, index) => (
          // Ключ — номер: поля управляемые, своего состояния у них нет.
          <Group key={index} gap="xs" wrap="nowrap">
            <TextInput
              aria-label={`Источник ${index + 1}`}
              placeholder="Книга игрока 2024, стр. 42 или https://…"
              value={source}
              maxLength={CATALOG_SOURCE_MAX_LENGTH}
              autoFocus={focusLast && index === value.length - 1}
              onChange={(event) => set(index, event.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Убрать источник"
              title="Убрать источник"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              ✕
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="light"
          size="xs"
          w="fit-content"
          disabled={full}
          title={
            full ? `Не больше ${CATALOG_SOURCES_MAX} источников` : undefined
          }
          onClick={() => {
            setFocusLast(true);
            onChange([...value, '']);
          }}
        >
          + Источник
        </Button>
      </Stack>
    </Input.Wrapper>
  );
}

export default SourcesField;
