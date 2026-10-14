import {
  Alert,
  CloseButton,
  Input,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useMemo, useState } from 'react';
import { ITEM_PACK_MAX_ENTRIES, ITEM_PACK_MAX_QUANTITY } from 'shared';
import { PackEntryLine } from '../../PackContents';
import type { ItemFormValues } from '../itemFormValues';
import { addPackEntry } from './packContents';
import { usePackCandidates } from './usePackCandidates';

interface PackContentsFieldProps {
  form: UseFormReturnType<ItemFormValues>;
  // Сам предмет в набор не кладём; null — предмет ещё не создан.
  selfId: string | null;
}

// Состав набора: поиск предмета сверху, строки с количеством ниже.
function PackContentsField({ form, selfId }: PackContentsFieldProps) {
  const { candidates, error } = usePackCandidates(selfId);
  // Текст поиска держим сами: после выбора Select оставил бы в поле введённое, а поле
  // нужно пустым — для следующего предмета.
  const [search, setSearch] = useState('');
  const contents = form.values.packContents;
  const full = contents.length >= ITEM_PACK_MAX_ENTRIES;

  const options = useMemo(
    () =>
      candidates
        ? [
            {
              group: 'Мои предметы',
              items: candidates.mine.map(({ id, name }) => ({
                value: id,
                label: name,
              })),
            },
            {
              group: 'Каталог',
              items: candidates.others.map(({ id, name, authorNickname }) => ({
                value: id,
                label: `${name} · ${authorNickname}`,
              })),
            },
          ].filter((group) => group.items.length > 0)
        : [],
    [candidates],
  );

  const setContents = (next: typeof contents) =>
    form.setFieldValue('packContents', next);

  const handlePick = (id: string | null) => {
    const item =
      candidates &&
      [...candidates.mine, ...candidates.others].find((i) => i.id === id);
    if (item) setContents(addPackEntry(contents, item));
    setSearch('');
  };

  return (
    <Input.Wrapper
      label="Состав"
      required
      description="Повторный выбор предмета добавляет ещё одну штуку"
      error={form.errors.packContents}
    >
      <Stack gap="xs" mt={4}>
        {error && (
          <Alert color="red" variant="light" p="xs">
            {error}
          </Alert>
        )}
        <Select
          aria-label="Добавить предмет в набор"
          placeholder={
            full
              ? `В наборе уже ${ITEM_PACK_MAX_ENTRIES} предметов`
              : candidates
                ? 'Найти и добавить предмет'
                : 'Загружаем предметы…'
          }
          data={options}
          // Поле — только для выбора: после выбора оно снова пустое.
          value={null}
          onChange={handlePick}
          searchValue={search}
          onSearchChange={setSearch}
          searchable
          // Набрал название — Enter добавляет первый найденный предмет.
          selectFirstOptionOnChange
          disabled={full || !candidates}
          nothingFoundMessage="Ничего не нашлось"
          limit={50}
        />
        {contents.length === 0 ? (
          <Text size="sm" c="dimmed">
            Добавьте предметы — например, рюкзак и верёвку
          </Text>
        ) : (
          <Paper withBorder p="xs">
            <Stack gap="xs">
              {contents.map((entry, index) => (
                <PackEntryLine key={entry.itemId} entry={entry} showHidden>
                  <NumberInput
                    aria-label={`Количество: ${entry.item?.name ?? 'скрытый предмет'}`}
                    value={entry.quantity}
                    min={1}
                    max={ITEM_PACK_MAX_QUANTITY}
                    allowDecimal={false}
                    allowNegative={false}
                    clampBehavior="strict"
                    w={72}
                    size="xs"
                    style={{ flexShrink: 0 }}
                    onChange={(value) =>
                      setContents(
                        contents.map((e, i) =>
                          i === index ? { ...e, quantity: value } : e,
                        ),
                      )
                    }
                  />
                  <CloseButton
                    aria-label={`Убрать из набора: ${entry.item?.name ?? 'скрытый предмет'}`}
                    title="Убрать из набора"
                    onClick={() =>
                      setContents(contents.filter((_, i) => i !== index))
                    }
                  />
                </PackEntryLine>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Input.Wrapper>
  );
}

export default PackContentsField;
