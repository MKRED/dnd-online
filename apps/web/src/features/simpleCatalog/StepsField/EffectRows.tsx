import { Badge, CloseButton, Group, Select, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useMemo, useState } from 'react';
import { STEP_EFFECTS_MAX, type StepEffect } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import {
  effectOptions,
  toStepEffect,
  type EffectCandidates,
} from './effectOptions';

interface EffectRowsProps {
  form: UseFormReturnType<SimpleFormValues>;
  // «steps.0.hitEffects» или «steps.0.missEffects».
  path: string;
  rows: StepEffect[];
  // Эффекты для выбора — грузит StepsField один раз на форму; null — ещё грузятся.
  candidates: EffectCandidates | null;
  error: string | undefined;
}

// Эффекты исхода шага (этап 8): строки с крестиком и поиск эффекта под ними — как
// состав набора. Свой скрытый эффект помечен: опубликовать способность можно только
// вместе с ним.
function EffectRows({ form, path, rows, candidates, error }: EffectRowsProps) {
  // Текст поиска держим сами: после выбора поле должно опустеть для следующего эффекта.
  const [search, setSearch] = useState('');
  const options = useMemo(
    () => (candidates ? effectOptions(candidates, rows) : []),
    [candidates, rows],
  );
  const full = rows.length >= STEP_EFFECTS_MAX;

  const handlePick = (id: string | null) => {
    const effect =
      candidates &&
      [...candidates.mine, ...candidates.others].find((e) => e.id === id);
    if (effect) form.insertListItem(path, toStepEffect(effect));
    setSearch('');
  };

  return (
    <Stack gap={6}>
      {rows.map((row, index) => (
        <Group key={row.effectId} gap="xs" wrap="nowrap">
          {row.effect ? (
            <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" truncate>
                {row.effect.name}
              </Text>
              {!row.effect.isPublic && (
                <Badge
                  size="xs"
                  variant="light"
                  color="gray"
                  // Сжимается название, а не пометка.
                  style={{ flexShrink: 0 }}
                >
                  Скрыт
                </Badge>
              )}
            </Group>
          ) : (
            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
              Эффект скрыт автором
            </Text>
          )}
          <CloseButton
            size="sm"
            aria-label={`Убрать эффект: ${row.effect?.name ?? 'скрытый'}`}
            title="Убрать эффект"
            onClick={() => form.removeListItem(path, index)}
          />
        </Group>
      ))}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
      {!full && (
        <Select
          aria-label="Добавить эффект"
          placeholder={candidates ? '+ Эффект: найти' : 'Загружаем эффекты…'}
          data={options}
          // Поле — только для выбора: после выбора оно снова пустое.
          value={null}
          onChange={handlePick}
          searchValue={search}
          onSearchChange={setSearch}
          searchable
          selectFirstOptionOnChange
          disabled={!candidates}
          nothingFoundMessage="Ничего не нашлось — создайте эффект в разделе «Эффекты»"
          size="xs"
          maw={320}
          limit={50}
        />
      )}
    </Stack>
  );
}

export default EffectRows;
