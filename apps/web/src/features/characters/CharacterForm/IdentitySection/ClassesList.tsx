import {
  ActionIcon,
  Button,
  Grid,
  Group,
  NumberInput,
  Stack,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useCallback, useState } from 'react';
import type {
  CharacterFormClassEntry,
  CharacterFormValues,
} from '../../characterFormValues';

interface ClassesListProps {
  form: UseFormReturnType<CharacterFormValues>;
}

// form.getValues().classes читать напрямую в рендере нельзя — форма uncontrolled,
// родитель не перерисовывает секцию на каждое изменение. Добавление/удаление строки
// класса — единственное, на что этот компонент должен реагировать перерисовкой; сами
// значения полей (class/level/subclass) уже обновляются DOM-узлами напрямую и
// перерисовки не требуют. form.watch на родительский путь 'classes' срабатывает и на
// изменение дочерних полей (см. isParent в getFieldSubscribers) — если сохранять в
// состояние весь массив, любая буква в поле класса вызывает setState и перерисовку
// всех строк (тормоза при удержании кнопки/клавиши). Поэтому храним только id — они
// меняются исключительно при добавлении/удалении — и в апдейтере явно возвращаем
// прежнюю ссылку, если id не изменились, чтобы React пропустил перерисовку.
function ClassesList({ form }: ClassesListProps) {
  const [classIds, setClassIds] = useState(() =>
    form.getValues().classes.map((entry) => entry.id),
  );
  form.watch(
    'classes',
    useCallback(({ value }: { value: CharacterFormClassEntry[] }) => {
      const nextIds = value.map((entry) => entry.id);
      setClassIds((prevIds) =>
        prevIds.length === nextIds.length &&
        prevIds.every((id, i) => id === nextIds[i])
          ? prevIds
          : nextIds,
      );
    }, []),
  );

  return (
    <Stack gap="xs">
      {classIds.map((id, index) => (
        <Grid key={id} align="flex-end">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <TextInput
              label="Класс"
              placeholder="Например, воин"
              required
              {...form.getInputProps(`classes.${index}.class`)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <NumberInput
              label="Уровень"
              min={1}
              max={20}
              {...form.getInputProps(`classes.${index}.level`)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3 }}>
            <TextInput
              label="Подкласс"
              placeholder="Необязательно"
              {...form.getInputProps(`classes.${index}.subclass`)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 1 }}>
            <ActionIcon
              color="red"
              variant="subtle"
              disabled={classIds.length <= 1}
              onClick={() => form.removeListItem('classes', index)}
              aria-label="Удалить класс"
            >
              ✕
            </ActionIcon>
          </Grid.Col>
        </Grid>
      ))}
      <Group justify="flex-start">
        <Button
          variant="light"
          size="xs"
          onClick={() =>
            form.insertListItem('classes', {
              id: crypto.randomUUID(),
              class: '',
              level: 1,
              subclass: '',
            })
          }
        >
          Добавить класс
        </Button>
      </Group>
    </Stack>
  );
}

export default ClassesList;
