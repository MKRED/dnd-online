import {
  ActionIcon,
  Autocomplete,
  Grid,
  NumberInput,
  Select,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import { SUBCLASS_MIN_LEVEL, type CharacterClass } from 'shared';
import { CLASS_OPTIONS, SUBCLASS_SUGGESTIONS } from '../../characterClasses';
import type { CharacterFormValues } from '../../characterFormValues';

interface ClassRowProps {
  form: UseFormReturnType<CharacterFormValues>;
  index: number;
  removable: boolean;
}

function ClassRow({ form, index, removable }: ClassRowProps) {
  // Форма uncontrolled и сама строку не перерисовывает, а список подсказок подкласса
  // зависит от класса — поэтому выбранный класс дублируется в локальном состоянии.
  const [selectedClass, setSelectedClass] = useState<CharacterClass | ''>(
    () => form.getValues().classes[index].class,
  );
  const [level, setLevel] = useState(
    () => form.getValues().classes[index].level,
  );
  // Uncontrolled-поле перечитывает значение формы только при монтировании. form.key здесь
  // не годится: секции мемоизированы (formSectionMemo) и держат прежний объект form со
  // старыми ключами полей — поэтому поле подкласса перемонтируется своим счётчиком.
  const [subclassRevision, setSubclassRevision] = useState(0);
  const clearSubclass = () => {
    form.setFieldValue(subclassPath, '');
    setSubclassRevision((revision) => revision + 1);
  };
  const classPath = `classes.${index}.class`;
  const levelPath = `classes.${index}.level`;
  const subclassPath = `classes.${index}.subclass`;

  const subclassAvailable = selectedClass !== '' && level >= SUBCLASS_MIN_LEVEL;
  let subclassPlaceholder = 'Выберите или впишите свой';
  if (!selectedClass) subclassPlaceholder = 'Сначала выберите класс';
  else if (level < SUBCLASS_MIN_LEVEL)
    subclassPlaceholder = `С ${SUBCLASS_MIN_LEVEL}-го уровня`;

  return (
    <Grid align="flex-end">
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <Select
          label="Класс"
          placeholder="Выберите класс"
          data={CLASS_OPTIONS}
          searchable
          allowDeselect={false}
          nothingFoundMessage="Такого класса нет"
          required
          {...form.getInputProps(classPath)}
          defaultValue={selectedClass || null}
          onChange={(value) => {
            const next = (value ?? '') as CharacterClass | '';
            form.setFieldValue(classPath, next);
            setSelectedClass(next);
            // Подкласс прежнего класса новому не подходит.
            clearSubclass();
          }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 4, sm: 2 }}>
        <NumberInput
          label="Уровень"
          min={1}
          max={20}
          {...form.getInputProps(levelPath)}
          onChange={(value) => {
            // В форму уходит сырое значение: пустое поле должно дойти до валидации уровня.
            form.setFieldValue(levelPath, value as number);
            // Подкласс здесь не очищаем: уровень набирают по цифре («12» начинается с «1»),
            // и очистка стирала бы его на полпути. Ниже 3-го уровня поле заблокировано,
            // а toCreatePayload подкласс не отправляет.
            setLevel(typeof value === 'number' ? value : 0);
          }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 8, sm: 5 }}>
        <Autocomplete
          key={subclassRevision}
          label="Подкласс"
          placeholder={subclassPlaceholder}
          data={selectedClass ? SUBCLASS_SUGGESTIONS[selectedClass] : []}
          disabled={!subclassAvailable}
          maxLength={50}
          {...form.getInputProps(subclassPath)}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 1 }}>
        <ActionIcon
          color="red"
          variant="subtle"
          disabled={!removable}
          onClick={() => form.removeListItem('classes', index)}
          aria-label="Удалить класс"
        >
          ✕
        </ActionIcon>
      </Grid.Col>
    </Grid>
  );
}

export default ClassRow;
